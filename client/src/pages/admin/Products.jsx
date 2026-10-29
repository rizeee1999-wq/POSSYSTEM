import { useState, useEffect } from 'react';
import {
  adminAddProductStock,
  adminGetProductStockLogs,
  adminCreateCategory,
  adminUpdateCategory,
  adminDeleteCategory,
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

  // Category Management Modal State
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCatId, setEditingCatId] = useState(null);
  const [editingCatName, setEditingCatName] = useState('');
  const [newCatName, setNewCatName] = useState('');
  const [catError, setCatError] = useState('');
  const [catSaving, setCatSaving] = useState(false);

  // Stock Management & History Modal State
  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [stockTarget, setStockTarget] = useState(null);
  const [stockLogs, setStockLogs] = useState([]);
  const [stockLogsLoading, setStockLogsLoading] = useState(false);
  const [stockAddQty, setStockAddQty] = useState('');
  const [stockAddDate, setStockAddDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [stockAddNote, setStockAddNote] = useState('');
  const [stockSaving, setStockSaving] = useState(false);
  const [stockError, setStockError] = useState('');
  const [stockSuccess, setStockSuccess] = useState('');

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
    setCategoryModalOpen(true);
  }

  async function handleAddCategoryFromModal(e) {
    e.preventDefault();
    if (!newCatName.trim()) return;
    setCatSaving(true);
    setCatError('');
    try {
      const category = await adminCreateCategory(newCatName.trim());
      setCategories((prev) => [...prev, category]);
      setForm((f) => ({ ...f, category_id: category.id }));
      setNewCatName('');
    } catch (e) {
      setCatError(e.message);
    } finally {
      setCatSaving(false);
    }
  }

  async function handleSaveEditCategory(catId) {
    if (!editingCatName.trim()) return;
    setCatSaving(true);
    setCatError('');
    try {
      const updated = await adminUpdateCategory(catId, editingCatName.trim());
      setCategories((prev) => prev.map((c) => (c.id === catId ? updated : c)));
      setEditingCatId(null);
      setEditingCatName('');
      await refresh();
    } catch (e) {
      setCatError(e.message);
    } finally {
      setCatSaving(false);
    }
  }

  async function handleDeleteCategory(catId, catName) {
    if (!window.confirm(`តើអ្នកពិតជាចង់លុបប្រភេទ "${catName}" មែនទេ?`)) return;
    setCatSaving(true);
    setCatError('');
    try {
      await adminDeleteCategory(catId);
      setCategories((prev) => prev.filter((c) => c.id !== catId));
      if (String(form.category_id) === String(catId)) {
        setForm((f) => ({ ...f, category_id: '' }));
      }
      await refresh();
    } catch (e) {
      setCatError(`មិនអាចលុបប្រភេទនេះបានទេ៖ ${e.message}`);
    } finally {
      setCatSaving(false);
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

  async function openStockModal(p) {
    setStockTarget(p);
    setStockAddQty('');
    setStockAddDate(new Date().toISOString().slice(0, 10));
    setStockAddNote('');
    setStockError('');
    setStockSuccess('');
    setStockModalOpen(true);
    setStockLogsLoading(true);
    try {
      const logs = await adminGetProductStockLogs(p.id);
      setStockLogs(logs || []);
    } catch {
      setStockLogs([]);
    } finally {
      setStockLogsLoading(false);
    }
  }

  async function handleStockSubmit(e) {
    e.preventDefault();
    const qty = Number(stockAddQty);
    if (!qty || qty <= 0) {
      setStockError('សូមបញ្ចូលចំនួនបន្ថែមដែលធំជាង ០');
      return;
    }
    setStockSaving(true);
    setStockError('');
    setStockSuccess('');
    try {
      const res = await adminAddProductStock(stockTarget.id, {
        quantity: qty,
        added_at: stockAddDate ? new Date(stockAddDate).toISOString() : new Date().toISOString(),
        note: stockAddNote,
      });

      const updatedStock = res.product.stock;
      setProducts((prev) =>
        prev.map((item) => (item.id === stockTarget.id ? { ...item, stock: updatedStock } : item))
      );
      setStockTarget((prev) => ({ ...prev, stock: updatedStock }));

      if (res.log) {
        setStockLogs((prev) => [res.log, ...prev]);
      }
      setStockAddQty('');
      setStockAddNote('');
      setStockSuccess(`បានបន្ថែម +${qty} ចូលស្តុកដោយជោគជ័យ!`);
    } catch (err) {
      setStockError(err.message || 'បន្ថែមស្តុកមិនជោគជ័យ');
    } finally {
      setStockSaving(false);
    }
  }

  function formatStockDate(dateStr) {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('km-KH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h1>{t.productsTitle}</h1>
          <p className="admin-subtitle">គ្រប់គ្រងសេវាកម្មកាត់សក់ និងផលិតផលថែរក្សាសក់</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setCategoryModalOpen(true)}
            title="កែសម្រួល បន្ថែម ឬលុបប្រភេទសេវាកម្ម/ផលិតផល"
          >
            🏷️ គ្រប់គ្រងប្រភេទ
          </button>
          <button className="btn btn-primary" onClick={openAddModal}>
            {t.addProduct}
          </button>
        </div>
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
                  <th style={{ minWidth: '220px' }}>{t.name}</th>
                  <th style={{ minWidth: '160px' }}>{t.category}</th>
                  <th style={{ minWidth: '130px', textAlign: 'center' }}>{t.itemType}</th>
                  <th style={{ minWidth: '110px' }}>{t.price}</th>
                  <th style={{ minWidth: '130px' }}>{t.duration} / {t.stock}</th>
                  <th style={{ minWidth: '110px', textAlign: 'center' }}>ស្ថានភាព</th>
                  <th style={{ minWidth: '130px', textAlign: 'center' }}>សកម្មភាព</th>
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
                    <td style={{ textAlign: 'center' }}>
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
                        <div className="table-stock-control">
                          <button
                            type="button"
                            className={`stock-pill-btn ${p.stock <= 5 ? 'stock-low' : 'stock-ok'}`}
                            onClick={() => openStockModal(p)}
                            title="ចុចដើម្បីមើលប្រវត្តិស្តុក ឬបញ្ចូលស្តុកបន្ថែម"
                          >
                            <span className="stock-qty-text">📦 {p.stock} កំប៉ុង/ដប</span>
                            <span className="stock-btn-plus">+ ថែមស្តុក</span>
                          </button>
                        </div>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        className={`status-toggle ${p.published ? 'status-active' : 'status-inactive'}`}
                        onClick={() => handleTogglePublish(p)}
                      >
                        {p.published ? '✓ ផ្សាយរួច' : 'លាក់'}
                      </button>
                    </td>
                    <td>
                      <div className="table-actions" style={{ justifyContent: 'center' }}>
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
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                ← {t.previousPage}
              </button>
              <span className="pagination-info">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                {t.nextPage} →
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label>{t.category} *</label>
                  <button
                    type="button"
                    onClick={() => setCategoryModalOpen(true)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--salon-gold)',
                      fontSize: '0.82rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      padding: 0,
                      textDecoration: 'underline',
                    }}
                  >
                    ⚙️ កែសម្រួល / បន្ថែមប្រភេទ
                  </button>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'stretch' }}>
                  <select
                    style={{ flex: 1 }}
                    required
                    value={form.category_id}
                    onChange={(e) => {
                      if (e.target.value === '__manage__') {
                        setCategoryModalOpen(true);
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
                    <option value="__manage__">⚙️ គ្រប់គ្រងប្រភេទ (កែសម្រួល / បន្ថែមថ្មី)...</option>
                  </select>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setCategoryModalOpen(true)}
                    title="កែសម្រួល ឬបន្ថែមប្រភេទ"
                    style={{ whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    ⚙️ កែសម្រួល
                  </button>
                </div>
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

      {/* Category Management Modal */}
      {categoryModalOpen && (
        <div className="modal-backdrop" onClick={() => setCategoryModalOpen(false)}>
          <div className="modal-card category-manager-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🏷️ គ្រប់គ្រងប្រភេទសេវាកម្ម & ផលិតផល</h2>
              <button className="modal-close" onClick={() => setCategoryModalOpen(false)}>×</button>
            </div>

            {catError && <div className="banner banner-error">{catError}</div>}

            {/* Quick Add Form */}
            <form onSubmit={handleAddCategoryFromModal} className="category-add-row">
              <input
                type="text"
                placeholder="បញ្ចូលឈ្មោះប្រភេទថ្មី..."
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                required
              />
              <button type="submit" className="btn btn-primary" disabled={catSaving}>
                + បន្ថែមប្រភេទ
              </button>
            </form>

            <div className="category-manager-list">
              <h4>បញ្ជីប្រភេទបច្ចុប្បន្ន ({categories.length})</h4>
              {categories.map((c) => (
                <div key={c.id} className="category-manager-item">
                  {editingCatId === c.id ? (
                    <div className="cat-edit-form">
                      <input
                        type="text"
                        value={editingCatName}
                        onChange={(e) => setEditingCatName(e.target.value)}
                        autoFocus
                      />
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => handleSaveEditCategory(c.id)}
                        disabled={catSaving}
                      >
                        រក្សាទុក
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => {
                          setEditingCatId(null);
                          setEditingCatName('');
                        }}
                      >
                        បោះបង់
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="cat-name-display">{c.name}</span>
                      <div className="cat-actions">
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => {
                            setEditingCatId(c.id);
                            setEditingCatName(c.name);
                          }}
                          title="កែសម្រួលឈ្មោះប្រភេទនេះ"
                        >
                          ✏️ កែសម្រួល
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger-outline btn-sm"
                          onClick={() => handleDeleteCategory(c.id, c.name)}
                          disabled={catSaving}
                          title="លុបប្រភេទនេះចេញ"
                        >
                          🗑️ លុប
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            <div className="modal-actions" style={{ marginTop: '1.5rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setCategoryModalOpen(false)}
              >
                រួចរាល់
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Management & History Modal */}
      {stockModalOpen && stockTarget && (
        <div className="modal-backdrop" onClick={() => setStockModalOpen(false)}>
          <div className="modal-card stock-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>📦 {t.stockHistoryTitle}</h2>
                <p className="modal-subtitle" style={{ margin: '0.25rem 0 0', color: 'var(--muted)', fontSize: '0.88rem' }}>
                  <strong>{stockTarget.name}</strong> • {stockTarget.categories?.name || 'គ្មានប្រភេទ'}
                </p>
              </div>
              <button className="modal-close" onClick={() => setStockModalOpen(false)}>×</button>
            </div>

            {/* Current Stock Banner */}
            <div className="stock-current-banner">
              <div className="stock-current-info">
                <span className="stock-current-label">{t.currentStock}</span>
                <span className="stock-current-value">
                  {stockTarget.stock} <small>កំប៉ុង/ដប</small>
                </span>
              </div>
              <span className={`badge ${stockTarget.stock <= 5 ? 'badge-lowstock' : 'badge-instock'}`}>
                {stockTarget.stock <= 5 ? 'ជិតអស់ស្តុក' : 'មានក្នុងស្តុក'}
              </span>
            </div>

            {/* Add Stock Form */}
            <form onSubmit={handleStockSubmit} className="stock-add-form">
              <h3 className="stock-form-title">+ បញ្ចូលស្តុកបន្ថែម (Stock-In)</h3>

              {stockError && <div className="banner banner-error">{stockError}</div>}
              {stockSuccess && <div className="banner banner-success">{stockSuccess}</div>}

              <div className="stock-form-grid">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>{t.quantityToAdd} *</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="ឧ. 3, 5, 10..."
                    value={stockAddQty}
                    onChange={(e) => setStockAddQty(e.target.value)}
                    required
                  />
                  <div className="quick-qty-pills">
                    {[1, 3, 5, 10, 20].map((q) => (
                      <button
                        key={q}
                        type="button"
                        className="btn-quick-qty"
                        onClick={() => setStockAddQty(String(Number(stockAddQty || 0) + q))}
                      >
                        +{q}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>{t.restockDate} *</label>
                  <input
                    type="date"
                    value={stockAddDate}
                    onChange={(e) => setStockAddDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginTop: '0.85rem' }}>
                <label>{t.stockNote}</label>
                <input
                  type="text"
                  placeholder="ឧ. ទិញថែមពីផ្សារធំថ្មី, ក្រុមហ៊ុនដឹកមកដល់..."
                  value={stockAddNote}
                  onChange={(e) => setStockAddNote(e.target.value)}
                />
              </div>

              <div className="stock-form-actions">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={stockSaving}
                >
                  {stockSaving ? t.savingStock : t.saveStock}
                </button>
              </div>
            </form>

            <div className="stock-section-divider" />

            {/* Stock History Timeline */}
            <div className="stock-history-section">
              <div className="stock-history-header">
                <h3>{t.stockHistory}</h3>
                <span className="stock-history-count">{stockLogs.length} កំណត់ត្រា</span>
              </div>

              {stockLogsLoading ? (
                <div className="page-loading" style={{ padding: '1rem 0' }}>{t.loading}</div>
              ) : stockLogs.length === 0 ? (
                <div className="stock-empty-history">
                  <span style={{ fontSize: '2rem' }}>📦</span>
                  <p style={{ margin: '0.5rem 0 0', color: 'var(--muted)', fontSize: '0.88rem' }}>{t.noStockLogs}</p>
                </div>
              ) : (
                <div className="stock-timeline">
                  {stockLogs.map((log) => (
                    <div key={log.id || log.added_at} className="stock-timeline-item">
                      <div className="stock-timeline-bullet" />
                      <div className="stock-timeline-content">
                        <div className="stock-timeline-top">
                          <span className="stock-timeline-date">
                            📅 {formatStockDate(log.added_at || log.created_at)}
                          </span>
                          <span className="stock-badge-added">
                            +{log.quantity_added} កំប៉ុង
                          </span>
                        </div>
                        <div className="stock-timeline-details">
                          <span className="stock-after-text">
                            ស្តុកឡើងដល់៖ <strong>{log.stock_after}</strong>
                          </span>
                          {log.note && (
                            <span className="stock-timeline-note">
                              📝 {log.note}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="modal-actions" style={{ marginTop: '1.5rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setStockModalOpen(false)}
              >
                {t.close}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
