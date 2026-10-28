import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  adminCreateSale,
  adminGetBarbers,
  adminGetProducts,
  adminUpdateQueueTicket,
  getCategories,
} from '../../lib/api.js';
import {
  EXCHANGE_RATE_KHR,
  formatDualPrice,
  formatKHR,
  formatUSD,
  t,
} from '../../lib/i18n.js';
import ReceiptModal from '../../components/ReceiptModal.jsx';

export default function Sell() {
  const location = useLocation();
  const queueState = location.state || {};

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [barbers, setBarbers] = useState([]);

  // Active tab: 'service' | 'product'
  const [activeTab, setActiveTab] = useState('service');
  const [search, setSearch] = useState('');
  const [filterCategoryId, setFilterCategoryId] = useState('');

  // Cart & ticket details
  const [cart, setCart] = useState([]); // [{ product_id, name, item_type, duration_min, price, quantity, maxStock, barber_id, barber_name }]
  const [customerName, setCustomerName] = useState(queueState.customerName || '');
  const [customerPhone, setCustomerPhone] = useState(queueState.customerPhone || '');
  const [selectedBarberId, setSelectedBarberId] = useState(queueState.barberId ? String(queueState.barberId) : '');
  const [paymentMethod, setPaymentMethod] = useState('cash_usd');
  const [tip, setTip] = useState(0);
  const [notes, setNotes] = useState(queueState.notes || '');

  // Cash payment helper
  const [receivedCash, setReceivedCash] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Completed sale receipt modal
  const [receiptModal, setReceiptModal] = useState(null);

  async function loadData() {
    setLoading(true);
    try {
      const [productsData, categoriesData, barbersData] = await Promise.all([
        adminGetProducts(),
        getCategories(),
        adminGetBarbers(),
      ]);
      setProducts(productsData || []);
      setCategories(categoriesData || []);
      setBarbers(barbersData.filter((b) => b.active) || []);

      // If arrived with a service from Queue, add it to cart automatically
      if (queueState.serviceId) {
        const target = productsData.find((p) => p.id === Number(queueState.serviceId));
        if (target) {
          const barberObj = barbersData.find((b) => b.id === Number(queueState.barberId));
          setCart([
            {
              product_id: target.id,
              name: target.name,
              item_type: target.item_type,
              duration_min: target.duration_min,
              price: Number(target.price),
              quantity: 1,
              maxStock: target.item_type === 'product' ? target.stock : 999,
              barber_id: barberObj ? barberObj.id : null,
              barber_name: barberObj ? barberObj.name : '',
            },
          ]);
        }
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (p.item_type !== activeTab) return false;
      if (search.trim() && !p.name.toLowerCase().includes(search.trim().toLowerCase())) return false;
      if (filterCategoryId && String(p.category_id) !== filterCategoryId) return false;
      return true;
    });
  }, [products, activeTab, search, filterCategoryId]);

  function addToCart(item) {
    const defaultBarber = barbers.find((b) => String(b.id) === selectedBarberId);
    setCart((prev) => {
      const existing = prev.find((line) => line.product_id === item.id);
      if (existing) {
        if (item.item_type === 'product' && existing.quantity >= item.stock) return prev;
        return prev.map((line) =>
          line.product_id === item.id ? { ...line, quantity: line.quantity + 1 } : line
        );
      }
      return [
        ...prev,
        {
          product_id: item.id,
          name: item.name,
          item_type: item.item_type,
          duration_min: item.duration_min,
          price: Number(item.price),
          quantity: 1,
          maxStock: item.item_type === 'product' ? item.stock : 999,
          barber_id: defaultBarber ? defaultBarber.id : null,
          barber_name: defaultBarber ? defaultBarber.name : '',
        },
      ];
    });
  }

  function setQuantity(productId, quantity) {
    setCart((prev) =>
      prev.map((line) =>
        line.product_id === productId
          ? { ...line, quantity: Math.max(1, Math.min(quantity, line.maxStock)) }
          : line
      )
    );
  }

  function removeLine(productId) {
    setCart((prev) => prev.filter((line) => line.product_id !== productId));
  }

  function updateLineBarber(productId, barberId) {
    const barber = barbers.find((b) => String(b.id) === String(barberId));
    setCart((prev) =>
      prev.map((line) =>
        line.product_id === productId
          ? { ...line, barber_id: barber ? barber.id : null, barber_name: barber ? barber.name : '' }
          : line
      )
    );
  }

  // Calculations
  const subtotalUSD = useMemo(
    () => cart.reduce((sum, line) => sum + line.price * line.quantity, 0),
    [cart]
  );
  const totalUSD = subtotalUSD + Number(tip || 0);
  const totalKHR = Math.round(totalUSD * EXCHANGE_RATE_KHR);

  const changeDueUSD = receivedCash ? Math.max(0, Number(receivedCash) - totalUSD) : 0;
  const changeDueKHR = Math.round(changeDueUSD * EXCHANGE_RATE_KHR);

  async function handleCheckout() {
    if (cart.length === 0) return;
    setSubmitting(true);
    try {
      const itemsPayload = cart.map((line) => ({
        product_id: line.product_id,
        quantity: line.quantity,
        barber_id: line.barber_id || (selectedBarberId ? Number(selectedBarberId) : null),
        barber_name: line.barber_name,
      }));

      const detailsPayload = {
        customer_name: customerName.trim() || t.walkinDefault,
        customer_phone: customerPhone.trim() || null,
        barber_id: selectedBarberId ? Number(selectedBarberId) : null,
        payment_method: paymentMethod,
        tip: Number(tip || 0),
        notes: notes.trim() || null,
      };

      const sale = await adminCreateSale(itemsPayload, detailsPayload);

      // If came from queue ticket, update ticket status to completed
      if (queueState.ticketId) {
        await adminUpdateQueueTicket(queueState.ticketId, { status: 'completed' }).catch(() => {});
      }

      // Open receipt modal
      setReceiptModal(sale);

      // Reset form
      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setTip(0);
      setNotes('');
      setReceivedCash('');
      await loadData();
    } catch (e) {
      alert(`Checkout failed: ${e.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  function handlePrintReceipt() {
    window.print();
  }

  return (
    <div className="admin-page sell-page">
      <div className="sell-header">
        <div>
          <h1>{t.sellTitle}</h1>
          <p className="admin-subtitle">គិតប្រាក់សេវាកាត់សក់ និងផលិតផលថែរក្សាសក់</p>
        </div>

        {/* Currency Rate pill */}
        <div className="currency-rate-badge">
          💵 អត្រាប្តូរប្រាក់៖ <strong>$1.00 = {EXCHANGE_RATE_KHR.toLocaleString()} ៛</strong>
        </div>
      </div>

      <div className="sell-layout">
        {/* Left Column: Menu Items */}
        <div className="sell-products-col">
          {/* Tabs: Services vs Products */}
          <div className="sell-tabs">
            <button
              className={`sell-tab-btn ${activeTab === 'service' ? 'active' : ''}`}
              onClick={() => setActiveTab('service')}
            >
              ✂️ {t.servicesTab}
            </button>
            <button
              className={`sell-tab-btn ${activeTab === 'product' ? 'active' : ''}`}
              onClick={() => setActiveTab('product')}
            >
              🧴 {t.productsTab}
            </button>
          </div>

          <div className="catalog-controls">
            <input
              type="text"
              placeholder={t.searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
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
          </div>

          {loading ? (
            <div className="page-loading">{t.loading}</div>
          ) : filteredProducts.length === 0 ? (
            <div className="empty-state">{t.noSellResults}</div>
          ) : (
            <div className="sell-product-grid">
              {filteredProducts.map((p) => {
                const isOutOfStock = p.item_type === 'product' && p.stock <= 0;
                return (
                  <button
                    key={p.id}
                    type="button"
                    className={`sell-product-card ${p.item_type === 'service' ? 'card-service' : 'card-product'}`}
                    onClick={() => addToCart(p)}
                    disabled={isOutOfStock}
                  >
                    <div className="sell-card-header">
                      <span className="badge badge-type">
                        {p.item_type === 'service' ? `⏱️ ${p.duration_min} នាទី` : `📦 ស្តុក: ${p.stock}`}
                      </span>
                    </div>

                    <div className="sell-product-info">
                      <span className="sell-item-name">{p.name}</span>
                      <div className="sell-price-row">
                        <span className="price-usd">{formatUSD(p.price)}</span>
                        <span className="price-khr">{formatKHR(p.price)}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Checkout Ticket / Cart */}
        <div className="cart-panel">
          <div className="cart-panel-header">
            <h2>🧾 {t.cart}</h2>
            <span className="badge badge-ticket">{cart.length} មុខ</span>
          </div>

          {/* Customer & Barber details */}
          <div className="ticket-meta-box">
            <div className="form-group-sm">
              <label>👤 {t.customerName}</label>
              <input
                type="text"
                placeholder={t.walkinDefault}
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </div>

            <div className="form-group-sm">
              <label>💈 {t.barber}</label>
              <select
                value={selectedBarberId}
                onChange={(e) => {
                  setSelectedBarberId(e.target.value);
                  // Optionally assign to existing items without a barber
                  const bObj = barbers.find((b) => String(b.id) === e.target.value);
                  if (bObj) {
                    setCart((prev) =>
                      prev.map((line) => ({
                        ...line,
                        barber_id: bObj.id,
                        barber_name: bObj.name,
                      }))
                    );
                  }
                }}
              >
                <option value="">{t.selectBarber}</option>
                {barbers.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.nickname || b.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Cart items list */}
          {cart.length === 0 ? (
            <div className="cart-empty-message">
              <span>✂️</span>
              <p>{t.cartEmpty}</p>
            </div>
          ) : (
            <div className="cart-lines-container">
              <div className="cart-lines">
                {cart.map((line) => (
                  <div className="cart-line-card" key={line.product_id}>
                    <div className="cart-line-main">
                      <span className="cart-line-name">
                        {line.item_type === 'service' ? '✂️' : '🧴'} {line.name}
                      </span>
                      <button
                        type="button"
                        className="cart-remove-btn"
                        onClick={() => removeLine(line.product_id)}
                        title={t.remove}
                      >
                        ×
                      </button>
                    </div>

                    <div className="cart-line-controls">
                      <div className="qty-picker">
                        <button
                          type="button"
                          onClick={() => setQuantity(line.product_id, line.quantity - 1)}
                        >
                          -
                        </button>
                        <span>{line.quantity}</span>
                        <button
                          type="button"
                          onClick={() => setQuantity(line.product_id, line.quantity + 1)}
                          disabled={line.quantity >= line.maxStock}
                        >
                          +
                        </button>
                      </div>

                      <div className="cart-line-subtotal">
                        <strong>{formatUSD(line.price * line.quantity)}</strong>
                        <small>{formatKHR(line.price * line.quantity)}</small>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Tip selector */}
              <div className="tip-section">
                <label>🎁 {t.tip}</label>
                <div className="tip-chips">
                  {[0, 1, 2, 5].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      className={`tip-chip ${tip === amt ? 'active' : ''}`}
                      onClick={() => setTip(amt)}
                    >
                      {amt === 0 ? 'គ្មាន ($0)' : `$${amt}`}
                    </button>
                  ))}
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    className="tip-custom-input"
                    placeholder="ផ្សេងទៀត $"
                    value={tip > 5 ? tip : ''}
                    onChange={(e) => setTip(Math.max(0, Number(e.target.value)))}
                  />
                </div>
              </div>

              {/* Payment Method selector */}
              <div className="payment-method-section">
                <label>💳 {t.paymentMethod}</label>
                <div className="payment-grid">
                  <button
                    type="button"
                    className={`payment-btn ${paymentMethod === 'cash_usd' ? 'active' : ''}`}
                    onClick={() => setPaymentMethod('cash_usd')}
                  >
                    💵 ប្រាក់ដុល្លារ ($)
                  </button>
                  <button
                    type="button"
                    className={`payment-btn ${paymentMethod === 'cash_khr' ? 'active' : ''}`}
                    onClick={() => setPaymentMethod('cash_khr')}
                  >
                    💵 ប្រាក់រៀល (៛)
                  </button>
                  <button
                    type="button"
                    className={`payment-btn ${paymentMethod === 'aba_khqr' ? 'active' : ''}`}
                    onClick={() => setPaymentMethod('aba_khqr')}
                  >
                    📱 ស្កេនទូទាត់ (KHQR)
                  </button>
                  <button
                    type="button"
                    className={`payment-btn ${paymentMethod === 'card' ? 'active' : ''}`}
                    onClick={() => setPaymentMethod('card')}
                  >
                    💳 កាតធនាគារ
                  </button>
                </div>
              </div>

              {/* Cash received & Change calculator */}
              {(paymentMethod === 'cash_usd' || paymentMethod === 'cash_khr') && (
                <div className="cash-calculator">
                  <div className="calc-row">
                    <span>{t.receivedAmount}៖</span>
                    <input
                      type="number"
                      step="0.5"
                      placeholder={`$${totalUSD.toFixed(2)}`}
                      value={receivedCash}
                      onChange={(e) => setReceivedCash(e.target.value)}
                    />
                  </div>
                  {receivedCash && Number(receivedCash) >= totalUSD && (
                    <div className="calc-change">
                      <span>{t.changeDue}៖</span>
                      <strong className="change-value">
                        {formatUSD(changeDueUSD)} ({formatKHR(changeDueUSD)})
                      </strong>
                    </div>
                  )}
                </div>
              )}

              {/* Totals Summary */}
              <div className="cart-totals-box">
                <div className="total-row">
                  <span>{t.subtotal}</span>
                  <span>{formatUSD(subtotalUSD)}</span>
                </div>
                {tip > 0 && (
                  <div className="total-row">
                    <span>{t.tip}</span>
                    <span>+{formatUSD(tip)}</span>
                  </div>
                )}
                <div className="grand-total-row">
                  <div>
                    <span className="total-title">{t.grandTotal}</span>
                    <span className="total-khr-subtitle">{formatKHR(totalUSD)}</span>
                  </div>
                  <span className="total-usd-amount">{formatUSD(totalUSD)}</span>
                </div>
              </div>

              <button
                className="btn btn-primary btn-checkout"
                onClick={handleCheckout}
                disabled={submitting || cart.length === 0}
              >
                {submitting ? t.processing : t.completeSale}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Printable Receipt Modal with Image & PDF Export */}
      <ReceiptModal
        receipt={receiptModal}
        onClose={() => setReceiptModal(null)}
      />
    </div>
  );
}
