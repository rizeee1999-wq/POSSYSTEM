import { useEffect, useState } from 'react';
import {
  adminCreateCategory,
  adminCreateProduct,
  adminDeleteProduct,
  adminGetProducts,
  adminSetPublished,
  adminUpdateProduct,
  adminUploadProductImage,
  getCategories,
} from '../../lib/api.js';
import { t } from '../../lib/i18n.js';

const emptyForm = {
  name: '',
  description: '',
  price: '',
  category_id: '',
  image_url: '',
  stock: 0,
  published: false,
};

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [localImagePreview, setLocalImagePreview] = useState('');

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [uploading, setUploading] = useState(false);

  const [search, setSearch] = useState('');
  const [filterCategoryId, setFilterCategoryId] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const filteredProducts = products.filter((p) => {
    if (search.trim() && !p.name.toLowerCase().includes(search.trim().toLowerCase())) return false;
    if (filterCategoryId && String(p.category_id) !== filterCategoryId) return false;
    if (filterStatus === 'published' && !p.published) return false;
    if (filterStatus === 'draft' && p.published) return false;
    return true;
  });

  const [page, setPage] = useState(1);
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedProducts = filteredProducts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    setPage(1);
  }, [search, filterCategoryId, filterStatus]);

  async function refresh() {
    setLoading(true);
    setError('');
    try {
      const [productsData, categoriesData] = await Promise.all([
        adminGetProducts(),
        getCategories(),
      ]);
      setProducts(productsData);
      setCategories(categoriesData);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    if (!localImagePreview) return undefined;
    return () => URL.revokeObjectURL(localImagePreview);
  }, [localImagePreview]);

  useEffect(() => {
    if (!modalOpen) setLocalImagePreview('');
  }, [modalOpen]);

  function openAddModal() {
    setEditingId(null);
    setForm(emptyForm);
    setFormError('');
    setLocalImagePreview('');
    setModalOpen(true);
  }

  function openEditModal(p) {
    setEditingId(p.id);
    setForm({
      name: p.name,
      description: p.description || '',
      price: p.price,
      category_id: p.category_id || '',
      image_url: p.image_url || '',
      stock: p.stock,
      published: p.published,
    });
    setFormError('');
    setLocalImagePreview('');
    setModalOpen(true);
  }

  async function handleImageUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLocalImagePreview(URL.createObjectURL(file));
    setUploading(true);
    setFormError('');
    try {
      const { url } = await adminUploadProductImage(file);
      setForm((f) => ({ ...f, image_url: url }));
    } catch (err) {
      setFormError(`${t.imageUploadFailed}: ${err.message}`);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  async function handleNewCategory() {
    const name = window.prompt(t.newCategoryPrompt);
    if (!name || !name.trim()) return;
    try {
      const category = await adminCreateCategory(name.trim());
      setCategories((prev) => [...prev, category]);
      setForm((f) => ({ ...f, category_id: category.id }));
    } catch (e) {
      setFormError(e.message);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    setFormError('');

    const name = form.name.trim();
    const price = Number(form.price);
    const stock = Number(form.stock);

    if (name.length <= 4) {
      setFormError(t.nameTooShort);
      return;
    }
    if (!form.category_id) {
      setFormError(t.categoryRequired);
      return;
    }
    if (!(price > 1)) {
      setFormError(t.priceTooLow);
      return;
    }
    if (!(stock > 1)) {
      setFormError(t.stockTooLow);
      return;
    }

    setSaving(true);

    const payload = {
      name,
      description: form.description.trim() || null,
      price,
      category_id: Number(form.category_id),
      image_url: form.image_url.trim() || null,
      stock,
      published: !!form.published,
    };

    try {
      if (editingId) {
        await adminUpdateProduct(editingId, payload);
      } else {
        await adminCreateProduct(payload);
      }
      setModalOpen(false);
      await refresh();
    } catch (e) {
      setFormError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleTogglePublish(p) {
    try {
      await adminSetPublished(p.id, !p.published);
      await refresh();
    } catch (e) {
      setError(e.message);
    }
  }

  function handleDelete(p) {
    setDeleteTarget(p);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminDeleteProduct(deleteTarget.id);
      setDeleteTarget(null);
      await refresh();
    } catch (e) {
      setError(e.message);
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="products-page">
      <div className="toolbar">
        <h1 style={{ margin: 0 }}>{t.productsTitle}</h1>
        <button className="btn" onClick={openAddModal}>
          {t.addProduct}
        </button>
      </div>

      {error && <div className="banner error">{error}</div>}
      {loading && <div className="page-loading">{t.loading}</div>}

      {!loading && products.length === 0 && (
        <div className="empty-state">{t.noProductsAdmin}</div>
      )}

      {!loading && products.length > 0 && (
        <div className="catalog-controls">
          <input
            type="text"
            placeholder={t.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select value={filterCategoryId} onChange={(e) => setFilterCategoryId(e.target.value)}>
            <option value="">{t.allCategories}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="all">{t.allStatus}</option>
            <option value="published">{t.published}</option>
            <option value="draft">{t.draft}</option>
          </select>
        </div>
      )}

      {!loading && products.length > 0 && filteredProducts.length === 0 && (
        <div className="empty-state">{t.noFilterResults}</div>
      )}

      {!loading && filteredProducts.length > 0 && (
        <>
        <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th>{t.name}</th>
              <th>{t.price}</th>
              <th>{t.stock}</th>
              <th></th>
              <th></th>
            </tr>
          </thead>
          <tbody key={currentPage} className="fade-in">
            {pagedProducts.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>${Number(p.price).toFixed(2)}</td>
                <td>{p.stock}</td>
                <td>
                  <span className={`tag ${p.published ? 'published' : 'draft'}`}>
                    {p.published ? t.published : t.draft}
                  </span>
                </td>
                <td>
                  <div className="row-actions">
                    <button className="btn btn-secondary btn-sm" onClick={() => openEditModal(p)}>
                      {t.edit}
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleTogglePublish(p)}
                    >
                      {p.published ? t.unpublish : t.publishToClient}
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p)}>
                      {t.delete}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>

        {totalPages > 1 && (
          <div className="pagination">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              aria-label={t.previousPage}
            >
              ‹
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                className={`btn btn-sm ${n === currentPage ? '' : 'btn-secondary'}`}
                onClick={() => setPage(n)}
              >
                {n}
              </button>
            ))}
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              aria-label={t.nextPage}
            >
              ›
            </button>
          </div>
        )}
        </>
      )}

      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <form className="modal-card" onClick={(e) => e.stopPropagation()} onSubmit={handleSave}>
            <h2>{editingId ? t.editProduct : t.addProduct}</h2>

            {formError && <div className="form-error">{formError}</div>}

            <div className="form-field">
              <label>{t.name}</label>
              <input
                required
                minLength={5}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div className="form-field">
              <label>{t.description}</label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <div className="form-field">
              <label>{t.price}</label>
              <input
                type="number"
                min="1.01"
                step="0.01"
                required
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
            </div>

            <div className="form-field">
              <label>{t.stock}</label>
              <input
                type="number"
                min="2"
                step="1"
                required
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: e.target.value })}
              />
            </div>

            <div className="form-field">
              <label>{t.category}</label>
              <select
                required
                value={form.category_id}
                onChange={(e) => {
                  if (e.target.value === '__new__') {
                    handleNewCategory();
                    return;
                  }
                  setForm({ ...form, category_id: e.target.value });
                }}
              >
                <option value="" disabled>
                  {t.selectCategoryPlaceholder}
                </option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
                <option value="__new__">{t.newCategory}</option>
              </select>
            </div>

            <div className="form-field">
              <label>{t.imageUrl}</label>
              {(localImagePreview || form.image_url) && (
                <img
                  src={localImagePreview || form.image_url}
                  alt=""
                  style={{
                    width: '96px',
                    height: '96px',
                    objectFit: 'cover',
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--border)',
                  }}
                />
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploading}
              />
              {uploading && <span>{t.uploadingImage}</span>}
              <input
                placeholder={t.imageUrl}
                value={form.image_url}
                onChange={(e) => {
                  setLocalImagePreview('');
                  setForm({ ...form, image_url: e.target.value });
                }}
              />
            </div>

            <div className="form-field" style={{ flexDirection: 'row', alignItems: 'center' }}>
              <input
                type="checkbox"
                id="published"
                checked={form.published}
                onChange={(e) => setForm({ ...form, published: e.target.checked })}
                style={{ marginRight: '0.5rem' }}
              />
              <label htmlFor="published" style={{ margin: 0 }}>
                {t.publishToClient}
              </label>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setModalOpen(false)}
              >
                {t.cancel}
              </button>
              <button type="submit" className="btn" disabled={saving || uploading}>
                {t.save}
              </button>
            </div>
          </form>
        </div>
      )}

      {deleteTarget && (
        <div className="modal-overlay" onClick={() => !deleting && setDeleteTarget(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>{t.deleteConfirmTitle}</h2>
            <p>{t.deleteConfirm}</p>
            <p className="delete-target-name">{deleteTarget.name}</p>

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
              >
                {t.cancel}
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={confirmDelete}
                disabled={deleting}
              >
                {deleting ? t.deleting : t.delete}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
