import { useEffect, useState, useRef } from 'react';
import {
  adminCreateSale,
  adminDeleteSale,
  adminGetBarbers,
  adminGetProducts,
  adminGetSales,
  adminUpdateSale,
} from '../../lib/api.js';
import {
  formatDualPrice,
  formatKHR,
  formatUSD,
  t,
} from '../../lib/i18n.js';
import ReceiptModal from '../../components/ReceiptModal.jsx';

export default function SalesHistory() {
  const [sales, setSales] = useState([]);
  const [barbers, setBarbers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedBarber, setSelectedBarber] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [receiptModal, setReceiptModal] = useState(null);
  const [deletingSale, setDeletingSale] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Action Dropdown State
  const [activeMenuId, setActiveMenuId] = useState(null);
  const menuRef = useRef(null);

  // Edit Sale Modal State
  const [editingSale, setEditingSale] = useState(null);
  const [editForm, setEditForm] = useState({
    customer_name: '',
    customer_phone: '',
    barber_id: '',
    payment_method: 'cash_usd',
    tip: 0,
    created_at: '',
    notes: '',
  });
  const [editItems, setEditItems] = useState([]);
  const [selectedProductToAdd, setSelectedProductToAdd] = useState('');
  const [editingSaving, setEditingSaving] = useState(false);
  const [editError, setEditError] = useState('');

  // Create Sale Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    customer_name: 'អតិថិជនទូទៅ (Walk-in)',
    customer_phone: '',
    barber_id: '',
    payment_method: 'cash_usd',
    tip: 0,
    created_at: '',
    notes: '',
  });
  const [createItems, setCreateItems] = useState([]);
  const [createSelectedProduct, setCreateSelectedProduct] = useState('');
  const [createSaving, setCreateSaving] = useState(false);
  const [createError, setCreateError] = useState('');

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setActiveMenuId(null);
      }
    }
    if (activeMenuId !== null) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeMenuId]);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const [salesData, barbersData, productsData] = await Promise.all([
        adminGetSales(),
        adminGetBarbers(),
        adminGetProducts(),
      ]);
      setSales(salesData || []);
      setBarbers(barbersData || []);
      setProducts(productsData || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredSales = sales.filter((sale) => {
    const saleDate = sale.created_at.slice(0, 10);
    if (fromDate && saleDate < fromDate) return false;
    if (toDate && saleDate > toDate) return false;
    if (selectedBarber && String(sale.barber_id) !== selectedBarber) return false;
    return true;
  });

  const grandTotalUSD = filteredSales.reduce((sum, sale) => sum + Number(sale.total), 0);
  const grandTipsUSD = filteredSales.reduce((sum, sale) => sum + Number(sale.tip || 0), 0);

  async function handleDeleteSale() {
    if (!deletingSale) return;
    setDeleting(true);
    try {
      await adminDeleteSale(deletingSale.id);
      setSales((prev) => prev.filter((s) => s.id !== deletingSale.id));
      setDeletingSale(null);
    } catch (e) {
      alert(e.message);
    } finally {
      setDeleting(false);
    }
  }

  function openEditModal(sale) {
    setActiveMenuId(null);
    setEditingSale(sale);
    setEditForm({
      customer_name: sale.customer_name || '',
      customer_phone: sale.customer_phone || '',
      barber_id: sale.barber_id ? String(sale.barber_id) : '',
      payment_method: sale.payment_method || 'cash_usd',
      tip: sale.tip || 0,
      created_at: sale.created_at ? sale.created_at.slice(0, 16) : '',
      notes: sale.notes || '',
    });
    setEditItems(
      (sale.sale_items || []).map((item) => ({
        product_id: item.product_id,
        product_name: item.product_name,
        item_type: item.item_type || 'service',
        quantity: Number(item.quantity) || 1,
        unit_price: Number(item.unit_price) || 0,
        barber_id: item.barber_id || null,
        barber_name: item.barber_name || null,
      }))
    );
    setSelectedProductToAdd('');
    setEditError('');
  }

  function handleItemQtyChange(index, newQty) {
    const qty = Math.max(1, Number(newQty) || 1);
    setEditItems((prev) =>
      prev.map((it, idx) => (idx === index ? { ...it, quantity: qty } : it))
    );
  }

  function handleItemPriceChange(index, newPrice) {
    const price = Math.max(0, Number(newPrice) || 0);
    setEditItems((prev) =>
      prev.map((it, idx) => (idx === index ? { ...it, unit_price: price } : it))
    );
  }

  function handleRemoveItem(index) {
    if (editItems.length <= 1) {
      setEditError('វិក្កយបត្រត្រូវតែមានមុខទំនិញយ៉ាងតិច ១');
      return;
    }
    setEditItems((prev) => prev.filter((_, idx) => idx !== index));
    setEditError('');
  }

  function handleAddProductToSale() {
    if (!selectedProductToAdd) return;
    const p = products.find((prod) => String(prod.id) === String(selectedProductToAdd));
    if (!p) return;

    const existingIndex = editItems.findIndex((it) => it.product_id === p.id);
    if (existingIndex >= 0) {
      setEditItems((prev) =>
        prev.map((it, idx) =>
          idx === existingIndex ? { ...it, quantity: it.quantity + 1 } : it
        )
      );
    } else {
      setEditItems((prev) => [
        ...prev,
        {
          product_id: p.id,
          product_name: p.name,
          item_type: p.item_type || 'service',
          quantity: 1,
          unit_price: Number(p.price) || 0,
          barber_id: editForm.barber_id ? Number(editForm.barber_id) : null,
          barber_name: null,
        },
      ]);
    }
    setSelectedProductToAdd('');
    setEditError('');
  }

  const editSubtotal = editItems.reduce(
    (sum, it) => sum + (Number(it.unit_price) || 0) * (Number(it.quantity) || 1),
    0
  );
  const editTip = Number(editForm.tip || 0);
  const editGrandTotal = editSubtotal + editTip;

  async function handleSaveEditSale(e) {
    e.preventDefault();
    if (!editingSale) return;
    if (editItems.length === 0) {
      setEditError('វិក្កយបត្រត្រូវតែមានមុខទំនិញយ៉ាងតិច ១');
      return;
    }
    setEditingSaving(true);
    setEditError('');

    try {
      const selectedBarberObj = barbers.find((b) => String(b.id) === String(editForm.barber_id));
      const updated = await adminUpdateSale(editingSale.id, {
        created_at: editForm.created_at ? new Date(editForm.created_at).toISOString() : editingSale.created_at,
        items: editItems.map((item) => ({
          product_id: item.product_id,
          product_name: item.product_name,
          item_type: item.item_type,
          quantity: Number(item.quantity),
          unit_price: Number(item.unit_price),
          barber_id: editForm.barber_id ? Number(editForm.barber_id) : null,
          barber_name: selectedBarberObj ? selectedBarberObj.name : item.barber_name,
        })),
        details: {
          customer_name: editForm.customer_name,
          customer_phone: editForm.customer_phone,
          barber_id: editForm.barber_id ? Number(editForm.barber_id) : null,
          payment_method: editForm.payment_method,
          tip: Number(editForm.tip || 0),
          notes: editForm.notes,
        },
      });

      setSales((prev) => prev.map((s) => (s.id === editingSale.id ? updated : s)));
      setEditingSale(null);
    } catch (err) {
      setEditError(err.message || 'កែសម្រួលវិក្កយបត្រមិនជោគជ័យ');
    } finally {
      setEditingSaving(false);
    }
  }

  function handlePrintReceipt() {
    window.print();
  }

  function getLocalDateTimeString() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  }

  function openCreateModal() {
    setActiveMenuId(null);
    setCreateForm({
      customer_name: 'អតិថិជនទូទៅ (Walk-in)',
      customer_phone: '',
      barber_id: barbers.length > 0 ? String(barbers[0].id) : '',
      payment_method: 'cash_usd',
      tip: 0,
      created_at: getLocalDateTimeString(),
      notes: '',
    });
    setCreateItems([]);
    setCreateSelectedProduct('');
    setCreateError('');
    setCreateModalOpen(true);
  }

  function handleCreateItemQtyChange(index, newQty) {
    const qty = Math.max(1, Number(newQty) || 1);
    setCreateItems((prev) =>
      prev.map((it, idx) => (idx === index ? { ...it, quantity: qty } : it))
    );
  }

  function handleCreateItemPriceChange(index, newPrice) {
    const price = Math.max(0, Number(newPrice) || 0);
    setCreateItems((prev) =>
      prev.map((it, idx) => (idx === index ? { ...it, unit_price: price } : it))
    );
  }

  function handleRemoveCreateItem(index) {
    setCreateItems((prev) => prev.filter((_, idx) => idx !== index));
    setCreateError('');
  }

  function handleAddProductToCreateSale() {
    if (!createSelectedProduct) return;
    const p = products.find((prod) => String(prod.id) === String(createSelectedProduct));
    if (!p) return;

    const existingIndex = createItems.findIndex((it) => it.product_id === p.id);
    if (existingIndex >= 0) {
      setCreateItems((prev) =>
        prev.map((it, idx) =>
          idx === existingIndex ? { ...it, quantity: it.quantity + 1 } : it
        )
      );
    } else {
      setCreateItems((prev) => [
        ...prev,
        {
          product_id: p.id,
          product_name: p.name,
          item_type: p.item_type || 'service',
          quantity: 1,
          unit_price: Number(p.price) || 0,
        },
      ]);
    }
    setCreateSelectedProduct('');
    setCreateError('');
  }

  const createSubtotal = createItems.reduce(
    (sum, it) => sum + (Number(it.unit_price) || 0) * (Number(it.quantity) || 1),
    0
  );
  const createTip = Number(createForm.tip || 0);
  const createGrandTotal = createSubtotal + createTip;

  async function handleSaveCreateSale(e) {
    e.preventDefault();
    if (createItems.length === 0) {
      setCreateError('សូមជ្រើសរើសសេវាកម្ម ឬផលិតផលយ៉ាងហោចណាស់ ១ មុខ');
      return;
    }

    setCreateSaving(true);
    setCreateError('');

    try {
      const selectedBarberObj = barbers.find((b) => String(b.id) === String(createForm.barber_id));
      const payloadItems = createItems.map((item) => ({
        product_id: item.product_id,
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price),
        barber_id: createForm.barber_id ? Number(createForm.barber_id) : null,
        barber_name: selectedBarberObj ? selectedBarberObj.name : null,
      }));

      const newSale = await adminCreateSale(payloadItems, {
        customer_name: createForm.customer_name || 'អតិថិជនទូទៅ (Walk-in)',
        customer_phone: createForm.customer_phone || null,
        barber_id: createForm.barber_id ? Number(createForm.barber_id) : null,
        payment_method: createForm.payment_method,
        tip: Number(createForm.tip || 0),
        created_at: createForm.created_at || undefined,
        notes: createForm.notes || null,
      });

      setSales((prev) => [newSale, ...prev]);
      setCreateModalOpen(false);
      setReceiptModal(newSale);
    } catch (err) {
      setCreateError(err.message || 'បង្កើតវិក្កយបត្រមិនជោគជ័យ');
    } finally {
      setCreateSaving(false);
    }
  }

  const paymentLabels = {
    cash_usd: '💵 សាច់ប្រាក់ដុល្លារ ($)',
    cash_khr: '💵 សាច់ប្រាក់រៀល (៛)',
    aba_khqr: '📱 ស្កេនទូទាត់ (KHQR)',
    card: '💳 កាតធនាគារ',
  };

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h1>{t.salesHistoryTitle}</h1>
          <p className="admin-subtitle">បញ្ជីវិក្កយបត្រកាត់សក់ និងចំណូលលម្អិត</p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={openCreateModal}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            fontWeight: 600,
            padding: '0.65rem 1.25rem',
            fontSize: '0.95rem',
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 12px rgba(212, 160, 23, 0.25)',
          }}
        >
          <span>+</span>
          <span>បញ្ចូលវិក្កយបត្រថ្មី</span>
        </button>
      </div>

      {error && <div className="banner banner-error">{error}</div>}

      {/* Filters bar */}
      <div className="admin-filters-bar">
        <div className="filter-group">
          <label>{t.filterBarber}</label>
          <select
            value={selectedBarber}
            onChange={(e) => setSelectedBarber(e.target.value)}
          >
            <option value="">{t.allBarbers}</option>
            {barbers.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>{t.filterFrom}</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <label>{t.filterTo}</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>

        {(fromDate || toDate || selectedBarber) && (
          <button
            className="btn btn-outline btn-sm align-self-end"
            onClick={() => {
              setFromDate('');
              setToDate('');
              setSelectedBarber('');
            }}
          >
            {t.clearFilter}
          </button>
        )}
      </div>

      {loading ? (
        <div className="page-loading">{t.loading}</div>
      ) : filteredSales.length === 0 ? (
        <div className="empty-state">{t.noSalesFilterResults}</div>
      ) : (
        <>
          <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t.receiptNumber}</th>
                <th>{t.date}</th>
                <th>{t.customerName}</th>
                <th>{t.barber}</th>
                <th>{t.items}</th>
                <th>{t.paymentMethod}</th>
                <th>{t.tip}</th>
                <th>{t.total}</th>
                <th style={{ textAlign: 'center', width: '80px' }}>សកម្មភាព</th>
              </tr>
            </thead>
            <tbody>
              {filteredSales.map((sale) => (
                <tr key={sale.id}>
                  <td>
                    <strong>#{sale.id}</strong>
                  </td>
                  <td>
                    {new Date(sale.created_at).toLocaleDateString()}
                    <div className="table-time">
                      {new Date(sale.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>
                  <td>
                    <strong>{sale.customer_name}</strong>
                    {sale.customer_phone && <small className="d-block">{sale.customer_phone}</small>}
                  </td>
                  <td>
                    {sale.barbers?.name ? (
                      <span className="badge badge-barber">💈 {sale.barbers.name}</span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td>
                    <div className="sale-items-compact">
                      {sale.sale_items?.map((item, idx) => (
                        <div key={idx} className="compact-item">
                          <span>{item.item_type === 'service' ? '✂️' : '🧴'} {item.product_name}</span>
                          <span className="compact-qty">x{item.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-payment">
                      {paymentLabels[sale.payment_method] || sale.payment_method}
                    </span>
                  </td>
                  <td>
                    {Number(sale.tip) > 0 ? (
                      <span className="badge badge-tip">+{formatUSD(sale.tip)}</span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td>
                    <strong>{formatUSD(sale.total)}</strong>
                    <div className="table-khr">{formatKHR(sale.total)}</div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div className="table-action-menu-wrap" ref={activeMenuId === sale.id ? menuRef : null}>
                      <button
                        type="button"
                        className={`btn-action-more ${activeMenuId === sale.id ? 'active' : ''}`}
                        onClick={() => setActiveMenuId(activeMenuId === sale.id ? null : sale.id)}
                        title="ជម្រើសសកម្មភាព"
                        aria-label="សកម្មភាព"
                      >
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                          <circle cx="12" cy="5" r="2" />
                          <circle cx="12" cy="12" r="2" />
                          <circle cx="12" cy="19" r="2" />
                        </svg>
                      </button>

                      {activeMenuId === sale.id && (
                        <div className="table-dropdown-menu" role="menu">
                          <button
                            type="button"
                            className="table-dropdown-item"
                            onClick={() => {
                              setActiveMenuId(null);
                              setReceiptModal(sale);
                            }}
                          >
                            <span>🧾 {t.viewReceipt}</span>
                          </button>
                          <button
                            type="button"
                            className="table-dropdown-item"
                            onClick={() => openEditModal(sale)}
                          >
                            <span>✏️ កែសម្រួលវិក្កយបត្រ</span>
                          </button>
                          <div className="dropdown-divider" style={{ margin: '0.25rem 0' }} />
                          <button
                            type="button"
                            className="table-dropdown-item item-danger"
                            onClick={() => {
                              setActiveMenuId(null);
                              setDeletingSale(sale);
                            }}
                          >
                            <span>🗑️ {t.delete}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Total revenue summary at the bottom */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: '1.25rem', gap: '1rem', flexWrap: 'wrap' }}>
          <div className="history-summary-box">
            <div className="summary-item">
              <span>{t.total}៖</span>
              <strong style={{ fontSize: '1.15rem', color: 'var(--primary)' }}>{formatUSD(grandTotalUSD)}</strong>
              <small>({formatKHR(grandTotalUSD)})</small>
            </div>
            <div className="summary-item">
              <span>{t.tip}៖</span>
              <strong className="text-success" style={{ fontSize: '1.05rem' }}>{formatUSD(grandTipsUSD)}</strong>
            </div>
          </div>
        </div>
        </>
      )}

      {/* Printable Receipt Modal with Image & PDF Export */}
      <ReceiptModal
        receipt={receiptModal}
        onClose={() => setReceiptModal(null)}
      />

      {/* Create / Add Record Modal */}
      {createModalOpen && (
        <div className="modal-backdrop" onClick={() => !createSaving && setCreateModalOpen(false)}>
          <div className="modal-card edit-sale-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>+ បញ្ចូលវិក្កយបត្រថ្មី</h2>
                <p className="modal-subtitle" style={{ margin: '0.2rem 0 0', color: 'var(--muted)', fontSize: '0.85rem' }}>
                  កត់ត្រាការទូទាត់ករណីភ្លេចគិតលុយ ឬបន្ថែមវិក្កយបត្រឡើងវិញ
                </p>
              </div>
              <button
                className="modal-close"
                onClick={() => !createSaving && setCreateModalOpen(false)}
                title={t.close}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveCreateSale} className="admin-form">
              {createError && <div className="banner banner-error">{createError}</div>}

              {/* Customer & Barber info row */}
              <div className="form-row-2">
                <div className="form-group">
                  <label>ឈ្មោះភ្ញៀវ/អតិថិជន *</label>
                  <input
                    type="text"
                    required
                    value={createForm.customer_name}
                    onChange={(e) => setCreateForm({ ...createForm, customer_name: e.target.value })}
                    placeholder="អតិថិជនទូទៅ"
                  />
                </div>
                <div className="form-group">
                  <label>លេខទូរស័ព្ទភ្ញៀវ</label>
                  <input
                    type="text"
                    value={createForm.customer_phone}
                    onChange={(e) => setCreateForm({ ...createForm, customer_phone: e.target.value })}
                    placeholder="012 345 678"
                  />
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label>ជាងកាត់សក់ទទួលបន្ទុក</label>
                  <select
                    value={createForm.barber_id}
                    onChange={(e) => setCreateForm({ ...createForm, barber_id: e.target.value })}
                  >
                    <option value="">— ជ្រើសរើសជាងកាត់សក់ —</option>
                    {barbers.map((b) => (
                      <option key={b.id} value={b.id}>
                        💈 {b.name} {b.nickname ? `(${b.nickname})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>វិធីសាស្ត្រទូទាត់ប្រាក់ *</label>
                  <select
                    value={createForm.payment_method}
                    onChange={(e) => setCreateForm({ ...createForm, payment_method: e.target.value })}
                  >
                    <option value="cash_usd">💵 សាច់ប្រាក់ដុល្លារ ($)</option>
                    <option value="cash_khr">💵 សាច់ប្រាក់រៀល (៛)</option>
                    <option value="aba_khqr">📱 ស្កេនទូទាត់ (KHQR)</option>
                    <option value="card">💳 កាតធនាគារ</option>
                  </select>
                </div>
              </div>

              {/* Retroactive / Custom Date & Time */}
              <div className="form-group">
                <label>កាលបរិច្ឆេទ & ម៉ោងទូទាត់ (អាចជ្រើសរើសពេលមុនបាន)</label>
                <input
                  type="datetime-local"
                  value={createForm.created_at}
                  onChange={(e) => setCreateForm({ ...createForm, created_at: e.target.value })}
                />
              </div>

              {/* Product & Service Items in this Sale */}
              <div className="edit-sale-items-section">
                <div className="edit-sale-items-header">
                  <label>🛒 មុខទំនិញ & សេវាកម្ម ({createItems.length})</label>
                  <span className="edit-items-badge">អាចកែចំនួន តម្លៃ ឬដក/ថែម</span>
                </div>

                {createItems.length === 0 ? (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '1.25rem',
                      color: 'var(--muted)',
                      border: '1px dashed var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      marginBottom: '1rem',
                      background: 'var(--card-bg)',
                      fontSize: '0.9rem',
                    }}
                  >
                    សូមជ្រើសរើសសេវាកម្ម ឬផលិតផលខាងក្រោមដើម្បីបញ្ចូល
                  </div>
                ) : (
                  <div className="edit-sale-items-list">
                    {createItems.map((item, index) => (
                      <div key={index} className="edit-sale-item-row">
                        <div className="edit-item-info">
                          <span className="edit-item-icon">
                            {item.item_type === 'service' ? '✂️' : '🧴'}
                          </span>
                          <div className="edit-item-name-col">
                            <strong>{item.product_name}</strong>
                            <small>{item.item_type === 'service' ? 'សេវាកម្ម' : 'ផលិតផល'}</small>
                          </div>
                        </div>

                        <div className="edit-item-controls">
                          {/* Price Input */}
                          <div className="edit-item-price-wrap" title="តម្លៃរាយ ($)">
                            <span>$</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unit_price}
                              onChange={(e) => handleCreateItemPriceChange(index, e.target.value)}
                            />
                          </div>

                          {/* Quantity Stepper */}
                          <div className="edit-item-qty-stepper">
                            <button
                              type="button"
                              onClick={() => handleCreateItemQtyChange(index, item.quantity - 1)}
                              disabled={item.quantity <= 1}
                              title="បន្ថយ"
                            >
                              −
                            </button>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleCreateItemQtyChange(index, e.target.value)}
                              title="ចំនួន"
                            />
                            <button
                              type="button"
                              onClick={() => handleCreateItemQtyChange(index, item.quantity + 1)}
                              title="បន្ថែម"
                            >
                              +
                            </button>
                          </div>

                          {/* Line Total */}
                          <div className="edit-item-line-total">
                            {formatUSD(item.unit_price * item.quantity)}
                          </div>

                          {/* Remove item */}
                          <button
                            type="button"
                            className="btn-remove-sale-item"
                            onClick={() => handleRemoveCreateItem(index)}
                            title="ដកមុខទំនិញនេះចេញ"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add more products/services row */}
                <div className="edit-add-product-row">
                  <select
                    value={createSelectedProduct}
                    onChange={(e) => setCreateSelectedProduct(e.target.value)}
                  >
                    <option value="">— ជ្រើសរើសសេវា ឬផលិតផលដើម្បីបន្ថែម —</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.item_type === 'service' ? '✂️' : '🧴'} {p.name} ({formatUSD(p.price)})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleAddProductToCreateSale}
                    disabled={!createSelectedProduct}
                  >
                    + បញ្ចូល
                  </button>
                </div>

                {/* Live total summary bar */}
                <div className="edit-sale-totals-bar">
                  <div className="total-cell">
                    <span>សរុបបណ្តោះអាសន្ន៖ </span>
                    <strong>{formatUSD(createSubtotal)}</strong>
                  </div>
                  <div className="total-cell">
                    <span>ធីប៖ </span>
                    <strong className="text-success">+{formatUSD(createTip)}</strong>
                  </div>
                  <div className="total-cell edit-grand-total">
                    <span>សរុបចុងក្រោយ៖ </span>
                    <strong>{formatUSD(createGrandTotal)}</strong>
                    <small>({formatKHR(createGrandTotal)})</small>
                  </div>
                </div>
              </div>

              {/* Tip & Notes */}
              <div className="form-row-2">
                <div className="form-group">
                  <label>ប្រាក់ធីប/លើកទឹកចិត្ត ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={createForm.tip}
                    onChange={(e) => setCreateForm({ ...createForm, tip: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>ចំណាំផ្សេងៗ</label>
                  <input
                    type="text"
                    value={createForm.notes}
                    onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                    placeholder="ឧទាហរណ៍៖ អតិថិជនបានកាត់សក់រួចកាលពីព្រឹក..."
                  />
                </div>
              </div>

              <div className="modal-actions" style={{ marginTop: '1.5rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setCreateModalOpen(false)}
                  disabled={createSaving}
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={createSaving}
                >
                  {createSaving ? 'កំពុងបង្កើត...' : '✓ បញ្ចូលវិក្កយបត្រ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Sale Modal */}
      {editingSale && (
        <div className="modal-backdrop" onClick={() => setEditingSale(null)}>
          <div className="modal-card edit-sale-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>✏️ កែសម្រួលវិក្កយបត្រ #{editingSale.id}</h2>
                <p className="modal-subtitle" style={{ margin: '0.2rem 0 0', color: 'var(--muted)', fontSize: '0.85rem' }}>
                  កែប្រែព័ត៌មានអតិថិជន មុខទំនិញ/សេវាកម្ម ជាងកាត់សក់ ឬការទូទាត់
                </p>
              </div>
              <button className="modal-close" onClick={() => setEditingSale(null)}>×</button>
            </div>

            <form onSubmit={handleSaveEditSale} className="admin-form">
              {editError && <div className="banner banner-error">{editError}</div>}

              {/* Customer & Barber info row */}
              <div className="form-row-2">
                <div className="form-group">
                  <label>ឈ្មោះភ្ញៀវ/អតិថិជន</label>
                  <input
                    type="text"
                    value={editForm.customer_name}
                    onChange={(e) => setEditForm({ ...editForm, customer_name: e.target.value })}
                    placeholder="អតិថិជនទូទៅ"
                  />
                </div>
                <div className="form-group">
                  <label>លេខទូរស័ព្ទភ្ញៀវ</label>
                  <input
                    type="text"
                    value={editForm.customer_phone}
                    onChange={(e) => setEditForm({ ...editForm, customer_phone: e.target.value })}
                    placeholder="012 345 678"
                  />
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label>ជាងកាត់សក់ទទួលបន្ទុក</label>
                  <select
                    value={editForm.barber_id}
                    onChange={(e) => setEditForm({ ...editForm, barber_id: e.target.value })}
                  >
                    <option value="">— ជ្រើសរើសជាងកាត់សក់ —</option>
                    {barbers.map((b) => (
                      <option key={b.id} value={b.id}>
                        💈 {b.name} {b.nickname ? `(${b.nickname})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>វិធីសាស្ត្រទូទាត់ប្រាក់</label>
                  <select
                    value={editForm.payment_method}
                    onChange={(e) => setEditForm({ ...editForm, payment_method: e.target.value })}
                  >
                    <option value="cash_usd">💵 សាច់ប្រាក់ដុល្លារ ($)</option>
                    <option value="cash_khr">💵 សាច់ប្រាក់រៀល (៛)</option>
                    <option value="aba_khqr">📱 ស្កេនទូទាត់ (KHQR)</option>
                    <option value="card">💳 កាតធនាគារ</option>
                  </select>
                </div>
              </div>

              {/* Product & Service Items in this Sale */}
              <div className="edit-sale-items-section">
                <div className="edit-sale-items-header">
                  <label>🛒 មុខទំនិញ & សេវាកម្ម ({editItems.length})</label>
                  <span className="edit-items-badge">អាចកែចំនួន តម្លៃ ឬដក/ថែម</span>
                </div>

                <div className="edit-sale-items-list">
                  {editItems.map((item, index) => (
                    <div key={index} className="edit-sale-item-row">
                      <div className="edit-item-info">
                        <span className="edit-item-icon">
                          {item.item_type === 'service' ? '✂️' : '🧴'}
                        </span>
                        <div className="edit-item-name-col">
                          <strong>{item.product_name}</strong>
                          <small>{item.item_type === 'service' ? 'សេវាកម្ម' : 'ផលិតផល'}</small>
                        </div>
                      </div>

                      <div className="edit-item-controls">
                        {/* Price Input */}
                        <div className="edit-item-price-wrap" title="តម្លៃរាយ ($)">
                          <span>$</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unit_price}
                            onChange={(e) => handleItemPriceChange(index, e.target.value)}
                          />
                        </div>

                        {/* Quantity Stepper */}
                        <div className="edit-item-qty-stepper">
                          <button
                            type="button"
                            onClick={() => handleItemQtyChange(index, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                            title="បន្ថយ"
                          >
                            −
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleItemQtyChange(index, e.target.value)}
                            title="ចំនួន"
                          />
                          <button
                            type="button"
                            onClick={() => handleItemQtyChange(index, item.quantity + 1)}
                            title="បន្ថែម"
                          >
                            +
                          </button>
                        </div>

                        {/* Line Total */}
                        <div className="edit-item-line-total">
                          {formatUSD(item.unit_price * item.quantity)}
                        </div>

                        {/* Remove item */}
                        <button
                          type="button"
                          className="btn-remove-sale-item"
                          onClick={() => handleRemoveItem(index)}
                          title="ដកមុខទំនិញនេះចេញ"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add more products/services row */}
                <div className="edit-add-product-row">
                  <select
                    value={selectedProductToAdd}
                    onChange={(e) => setSelectedProductToAdd(e.target.value)}
                  >
                    <option value="">— ជ្រើសរើសសេវា ឬផលិតផលដើម្បីបន្ថែម —</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.item_type === 'service' ? '✂️' : '🧴'} {p.name} ({formatUSD(p.price)})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleAddProductToSale}
                    disabled={!selectedProductToAdd}
                  >
                    + បញ្ចូល
                  </button>
                </div>

                {/* Live total summary bar */}
                <div className="edit-sale-totals-bar">
                  <div className="total-cell">
                    <span>សរុបបណ្តោះអាសន្ន៖ </span>
                    <strong>{formatUSD(editSubtotal)}</strong>
                  </div>
                  <div className="total-cell">
                    <span>ធីប៖ </span>
                    <strong className="text-success">+{formatUSD(editTip)}</strong>
                  </div>
                  <div className="total-cell edit-grand-total">
                    <span>សរុបចុងក្រោយ៖ </span>
                    <strong>{formatUSD(editGrandTotal)}</strong>
                    <small>({formatKHR(editGrandTotal)})</small>
                  </div>
                </div>
              </div>

              {/* Tip, Date & Notes */}
              <div className="form-row-2" style={{ marginTop: '1rem' }}>
                <div className="form-group">
                  <label>ប្រាក់ធីប/លើកទឹកចិត្ត ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editForm.tip}
                    onChange={(e) => setEditForm({ ...editForm, tip: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>កាលបរិច្ឆេទ</label>
                  <input
                    type="datetime-local"
                    value={editForm.created_at}
                    onChange={(e) => setEditForm({ ...editForm, created_at: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>ចំណាំផ្សេងៗ</label>
                <input
                  type="text"
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  placeholder="ចំណាំ..."
                />
              </div>

              <div className="modal-actions" style={{ marginTop: '1.5rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setEditingSale(null)}
                  disabled={editingSaving}
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={editingSaving}
                >
                  {editingSaving ? 'កំពុងរក្សាទុក...' : '✓ រក្សាទុកការកែប្រែ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deletingSale && (
        <div className="modal-backdrop" onClick={() => setDeletingSale(null)}>
          <div className="modal-card modal-confirm" onClick={(e) => e.stopPropagation()}>
            <h2>{t.deleteConfirmTitle}</h2>
            <p>តើអ្នកពិតជាចង់លុបវិក្កយបត្រ #{deletingSale.id} នេះមែនទេ?</p>
            <div className="modal-actions">
              <button
                className="btn btn-outline"
                onClick={() => setDeletingSale(null)}
                disabled={deleting}
              >
                {t.cancel}
              </button>
              <button
                className="btn btn-danger"
                onClick={handleDeleteSale}
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
