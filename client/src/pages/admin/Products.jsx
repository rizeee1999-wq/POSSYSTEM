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
import { formatKHR, formatUSD, t } from '../../lib/i18n.js';

const emptyForm = {
  name: '',
  description: '',
  price: '',
  category_id: '',
  image_url: '',
  item_type: 'service',
  duration_min: 30,
  stock: 0,
  published: true,
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
  const [filterType, setFilterType] = useState('all');

  const filteredProducts = products.filter((p) => {
    if (search.trim() && !p.name.toLowerCase().includes(search.trim().toLowerCase())) return false;
    if (filterCategoryId && String(p.category_id) !== filterCategoryId) return false;
    if (filterStatus === 'published' && !p.published) return false;
    if (filterStatus === 'draft' && p.published) return false;
    if (filterType === 'service' && p.item_type !== 'service') return false;
    if (filterType === 'product' && p.item_type !== 'product') return false;
    return true;
  });

  const [page, setPage] = useState(1);
  const pageSize = 12;
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedProducts = filteredProducts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    setPage(1);
  }, [search, filterCategoryId, filterStatus, filterType]);

  async function refresh() {
    setLoading(true);
    setError('');
    try {
      const [productsData, categoriesData] = await Promise.all([
        adminGetProducts(),
        getCategories(),
      ]);
      setProducts(productsData || []);
      setCategories(categoriesData || []);
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
      item_type: p.item_type || 'service',
      duration_min: p.duration_min || 30,
      stock: p.stock ?? 0,
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

    if (name.length < 2) {
      setFormError(t.nameTooShort);
      return;
    }
    if (!form.category_id) {
      setFormError(t.categoryRequired);
      return;
    }
    if (price < 0 || isNaN(price)) {
      setFormError(t.priceTooLow);
      return;
    }
    if (form.item_type === 'product' && (stock < 0 || isNaN(stock))) {
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
      item_type: form.item_type,
      duration_min: form.item_type === 'service' ? Number(form.duration_min || 30) : 0,
      stock: form.item_type === 'product' ? stock : 999,
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
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h1>{t.productsTitle}</h1>
          <p className="admin-subtitle">គ្រប់គ្រងសេវាកម្មកាត់សក់ និងផលិតផលថែរក្សាសក់</p>
        </div>
        <button className="btn btn-primary" onClick={openAddModal}>
          {t.addProduct}
        </button>
      </div>

      {error && <div className="banner banner-error">{error}</div>}

      {/* Filters bar */}
      <div className="admin-filters-bar">
        <input
          type="text"
          placeholder={t.searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
        />

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="all">{t.filterAllTypes}</option>
          <option value="service">{t.filterServicesOnly}</option>
          <option value="product">{t.filterProductsOnly}</option>
        </select>

        <select
          value={filterCategoryId}
          onChange={(e) => setFilterCategoryId(e.target.value)}
        >
          <option value="">{t.allCategories}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="all">{t.allStatus}</option>
          <option value="published">{t.published}</option>
          <option value="draft">{t.draft}</option>
        </select>
      </div>

      {loading ? (
        <div className="page-loading">{t.loading}</div>
      ) : filteredProducts.length === 0 ? (
        <div className="empty-state">{t.noProductsAdmin}</div>
      ) : (
        <>
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t.name}</th>
                  <th>{t.category}</th>
                  <th>{t.itemType}</th>
                  <th>{t.price}</th>
                  <th>{t.duration} / {t.stock}</th>
                  <th>ស្ថានភាព</th>
                  <th>សកម្មភាព</th>
                </tr>
              </thead>
              <tbody>
                {pagedProducts.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="table-item-cell">
                        {p.image_url ? (
                          <img
                            src={p.image_url}
                            alt=""
                            className="table-thumb"
                            style={{ width: '48px', height: '48px', minWidth: '48px', minHeight: '48px', objectFit: 'cover', borderRadius: '8px', flexShrink: 0 }}
                          />
                        ) : (
                          <div className="table-thumb-placeholder">
                            {p.item_type === 'service' ? '✂️' : '🧴'}
                          </div>
                        )}
                        <div>
                          <strong>{p.name}</strong>
                          {p.description && (
                            <small className="table-desc">{p.description}</small>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>{p.categories?.name || '—'}</td>
                    <td>
                      <span className={`badge ${p.item_type === 'service' ? 'badge-service' : 'badge-product'}`}>
                        {p.item_type === 'service' ? '✂️ សេវាកម្ម' : '🧴 ផលិតផល'}
                      </span>
                    </td>
                    <td>
                      <strong>{formatUSD(p.price)}</strong>
                      <div className="table-khr">{formatKHR(p.price)}</div>
                    </td>
                    <td>
                      {p.item_type === 'service' ? (
                        <span className="badge badge-duration">⏱️ {p.duration_min} នាទី</span>
                      ) : (
                        <span className={`badge ${p.stock <= 5 ? 'badge-lowstock' : 'badge-outline'}`}>
                          📦 {p.stock} កំប៉ុង/ដប
                        </span>
                      )}
                    </td>
                    <td>
                      <button
                        className={`status-toggle ${p.published ? 'status-active' : 'status-inactive'}`}
                        onClick={() => handleTogglePublish(p)}
                      >
                        {p.published ? '✓ ផ្សាយរួច' : 'លាក់'}
                      </button>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => openEditModal(p)}
                        >
                          {t.edit}
                        </button>
                        <button
                          className="btn btn-danger-outline btn-sm"
                          onClick={() => setDeleteTarget(p)}
                        >
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
                className="btn btn-outline btn-sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                {t.previousPage}
              </button>
              <span>{currentPage} / {totalPages}</span>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                {t.nextPage}
              </button>
            </div>
          )}
        </>
      )}

      {/* Modal Add / Edit */}
      {modalOpen && (
        <div className="modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingId ? t.editProduct : t.addProduct}</h2>
              <button className="modal-close" onClick={() => setModalOpen(false)}>×</button>
            </div>

            <form onSubmit={handleSave} className="admin-form">
              {formError && <div className="banner banner-error">{formError}</div>}

              {/* Item Type Picker */}
              <div className="form-group">
                <label>{t.itemType} *</label>
                <div className="type-toggle-group">
                  <button
                    type="button"
                    className={`type-toggle-btn ${form.item_type === 'service' ? 'active' : ''}`}
                    onClick={() => setForm({ ...form, item_type: 'service' })}
                  >
                    ✂️ {t.typeService}
                  </button>
                  <button
                    type="button"
                    className={`type-toggle-btn ${form.item_type === 'product' ? 'active' : ''}`}
                    onClick={() => setForm({ ...form, item_type: 'product' })}
                  >
                    🧴 {t.typeProduct}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>{t.name} *</label>
                <input
                  type="text"
                  required
                  placeholder="ឧ. កាត់សក់ហ្វេត ឬ សិតម៉ូត"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>{t.category} *</label>
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
                  <option value="" disabled>{t.selectCategoryPlaceholder}</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                  <option value="__new__">{t.newCategory}</option>
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>{t.price} ($ ដុល្លារ) *</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    required
                    placeholder="5.00"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                  />
                  {form.price && (
                    <small className="khr-hint">≈ {formatKHR(form.price)}</small>
                  )}
                </div>

                {form.item_type === 'service' ? (
                  <div className="form-group">
                    <label>{t.duration}</label>
                    <input
                      type="number"
                      step="5"
                      min="5"
                      value={form.duration_min}
                      onChange={(e) => setForm({ ...form, duration_min: e.target.value })}
                    />
                  </div>
                ) : (
                  <div className="form-group">
                    <label>{t.stock} *</label>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      required
                      value={form.stock}
                      onChange={(e) => setForm({ ...form, stock: e.target.value })}
                    />
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>{t.description}</label>
                <textarea
                  rows="3"
                  placeholder="ការពិពណ៌នាអំពីសេវាកម្ម ឬរបៀបប្រើប្រាស់ផលិតផល..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>🖼️ {t.imageUrl}</label>

                {(localImagePreview || form.image_url) && (
                  <div className="form-image-preview">
                    <img
                      src={localImagePreview || form.image_url}
                      alt="រូបភាពតេស្ត"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <button
                      type="button"
                      className="form-image-remove-btn"
                      onClick={() => {
                        setLocalImagePreview('');
                        setForm((f) => ({ ...f, image_url: '' }));
                      }}
                      title="ដករូបភាពចេញ"
                    >
                      ✕
                    </button>
                  </div>
                )}

                <div className="form-file-row">
                  <label className="btn btn-secondary btn-sm file-upload-label">
                    📁 {uploading ? t.uploadingImage : 'ជ្រើសរើសរូបភាពពីម៉ាស៊ីន'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploading}
                      style={{ display: 'none' }}
                    />
                  </label>
                  <input
                    type="url"
                    placeholder="ឬបិទភ្ជាប់តំណរូបភាព (https://...)"
                    value={form.image_url}
                    onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                    style={{ flex: 1 }}
                  />
                </div>
              </div>

              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={form.published}
                    onChange={(e) => setForm({ ...form, published: e.target.checked })}
                  />
                  <span>{t.published}</span>
                </label>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setModalOpen(false)}
                >
                  {t.cancel}
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? t.loading : t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div className="modal-backdrop" onClick={() => setDeleteTarget(null)}>
          <div className="modal-card modal-confirm" onClick={(e) => e.stopPropagation()}>
            <h2>{t.deleteConfirmTitle}</h2>
            <p>{t.deleteConfirm} <strong>{deleteTarget.name}</strong>?</p>
            <div className="modal-actions">
              <button
                className="btn btn-outline"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
              >
                {t.cancel}
              </button>
              <button
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
