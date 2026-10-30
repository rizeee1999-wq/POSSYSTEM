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
  formatDualPrice,
  formatKHR,
  formatUSD,
  t,
  useExchangeRate,
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

  // Dynamic Exchange Rate
  const [exchangeRate, updateExchangeRate] = useExchangeRate();
  const [showRateModal, setShowRateModal] = useState(false);
  const [tempRate, setTempRate] = useState(String(exchangeRate));

  useEffect(() => {
    setTempRate(String(exchangeRate));
  }, [exchangeRate]);

  // Cash payment details
  const [cashInputMode, setCashInputMode] = useState('usd'); // 'usd' | 'khr' | 'mixed'
  const [receivedUSD, setReceivedUSD] = useState('');
  const [receivedKHR, setReceivedKHR] = useState('');

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
  const totalKHR = Math.round(totalUSD * exchangeRate);

  // Total received in USD equivalent
  const totalReceivedUSD = useMemo(() => {
    if (cashInputMode === 'usd') {
      return Number(receivedUSD || 0);
    }
    if (cashInputMode === 'khr') {
      return Number(receivedKHR || 0) / exchangeRate;
    }
    // Mixed mode ($ + ៛)
    return Number(receivedUSD || 0) + (Number(receivedKHR || 0) / exchangeRate);
  }, [cashInputMode, receivedUSD, receivedKHR, exchangeRate]);

  const totalReceivedKHR = Math.round(totalReceivedUSD * exchangeRate);

  // Has cashier entered any cash?
  const hasEnteredCash = Boolean(
    (cashInputMode === 'usd' && receivedUSD !== '') ||
    (cashInputMode === 'khr' && receivedKHR !== '') ||
    (cashInputMode === 'mixed' && (receivedUSD !== '' || receivedKHR !== ''))
  );

  const diffUSD = totalReceivedUSD - totalUSD;
  const isInsufficient = hasEnteredCash && diffUSD < -0.005;
  const isExact = hasEnteredCash && Math.abs(diffUSD) <= 0.005;
  const isChangeDue = hasEnteredCash && diffUSD > 0.005;

  const deficitUSD = Math.max(0, totalUSD - totalReceivedUSD);
  const deficitKHR = Math.round(deficitUSD * exchangeRate);

  const surplusUSD = Math.max(0, diffUSD);
  const totalChangeKHR = Math.round((surplusUSD * exchangeRate) / 100) * 100;

  // Breakdown for USD or Mixed payment: Dollars + Riel remainder
  const rawDollars = Math.floor(surplusUSD + 0.0001);
  const centsRemainder = surplusUSD - rawDollars;
  let rielRemainder = Math.round((centsRemainder * exchangeRate) / 100) * 100;
  let dollarsBack = rawDollars;
  if (rielRemainder >= exchangeRate) {
    dollarsBack += 1;
    rielRemainder -= exchangeRate;
  }

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
      setReceivedUSD('');
      setReceivedKHR('');
      setCashInputMode('usd');
      setPaymentMethod('cash_usd');
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

        {/* Currency Rate pill (clickable) */}
        <button
          type="button"
          className="currency-rate-badge clickable"
          onClick={() => setShowRateModal(true)}
          title="ចុចដើម្បីកែសម្រួលអត្រាប្តូរប្រាក់"
        >
          💵 អត្រាប្តូរប្រាក់៖ <strong>$1.00 = {exchangeRate.toLocaleString()} ៛</strong>
          <span className="rate-badge-edit-hint"> ✏️ កែប្រែ</span>
        </button>
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
                    <div className="sell-card-media">
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} className="sell-card-img" />
                      ) : (
                        <div className="sell-card-placeholder">
                          <span>{p.item_type === 'service' ? '💈' : '🧴'}</span>
                        </div>
                      )}
                      <span className="badge badge-type sell-media-badge">
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
                    onClick={() => {
                      setPaymentMethod('cash_usd');
                      setCashInputMode('usd');
                    }}
                  >
                    💵 {t.cashUsd}
                  </button>
                  <button
                    type="button"
                    className={`payment-btn ${paymentMethod === 'cash_khr' ? 'active' : ''}`}
                    onClick={() => {
                      setPaymentMethod('cash_khr');
                      setCashInputMode('khr');
                    }}
                  >
                    🇰🇭 {t.cashKhr}
                  </button>
                  <button
                    type="button"
                    className={`payment-btn ${paymentMethod === 'cash_mixed' ? 'active' : ''}`}
                    onClick={() => {
                      setPaymentMethod('cash_mixed');
                      setCashInputMode('mixed');
                    }}
                  >
                    {t.cashMixed}
                  </button>
                  <button
                    type="button"
                    className={`payment-btn ${paymentMethod === 'aba_khqr' ? 'active' : ''}`}
                    onClick={() => setPaymentMethod('aba_khqr')}
                  >
                    {t.abaKhqr}
                  </button>
                  <button
                    type="button"
                    className={`payment-btn ${paymentMethod === 'card' ? 'active' : ''}`}
                    onClick={() => setPaymentMethod('card')}
                  >
                    {t.card}
                  </button>
                </div>
              </div>

              {/* Smart Dual-Currency Cash Calculator */}
              {(paymentMethod === 'cash_usd' || paymentMethod === 'cash_khr' || paymentMethod === 'cash_mixed') && (
                <div className="cash-calculator-box">
                  {/* Mode Selector Tabs */}
                  <div className="cash-calc-header">
                    <div className="cash-calc-title">
                      <span>💵 គណនាប្រាក់ទទួល & ប្រាក់អាប់</span>
                    </div>

                    <div className="cash-type-tabs">
                      <button
                        type="button"
                        className={`cash-type-tab ${cashInputMode === 'usd' ? 'active' : ''}`}
                        onClick={() => {
                          setCashInputMode('usd');
                          setPaymentMethod('cash_usd');
                        }}
                      >
                        💵 ដុល្លារ ($)
                      </button>
                      <button
                        type="button"
                        className={`cash-type-tab ${cashInputMode === 'khr' ? 'active' : ''}`}
                        onClick={() => {
                          setCashInputMode('khr');
                          setPaymentMethod('cash_khr');
                        }}
                      >
                        🇰🇭 រៀល (៛)
                      </button>
                      <button
                        type="button"
                        className={`cash-type-tab ${cashInputMode === 'mixed' ? 'active' : ''}`}
                        onClick={() => {
                          setCashInputMode('mixed');
                          setPaymentMethod('cash_mixed');
                        }}
                      >
                        🔀 ចម្រុះ ($ + ៛)
                      </button>
                    </div>
                  </div>

                  {/* Body & Inputs */}
                  <div className="cash-calc-body">
                    {/* Mode: USD Only */}
                    {cashInputMode === 'usd' && (
                      <div className="calc-input-section">
                        <div className="calc-field">
                          <label>ប្រាក់ដុល្លារទទួលបាន ($)៖</label>
                          <div className="calc-input-wrapper">
                            <span className="calc-symbol">$</span>
                            <input
                              type="number"
                              step="any"
                              min="0"
                              placeholder={totalUSD.toFixed(2)}
                              value={receivedUSD}
                              onChange={(e) => setReceivedUSD(e.target.value)}
                              className="calc-main-input"
                              autoFocus
                            />
                            {receivedUSD && (
                              <button
                                type="button"
                                className="calc-clear-btn"
                                onClick={() => setReceivedUSD('')}
                                title="សម្អាត"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Quick USD Bill Buttons */}
                        <div className="quick-bills-grid">
                          <button
                            type="button"
                            className="quick-bill-btn exact-bill"
                            onClick={() => setReceivedUSD(totalUSD.toFixed(2))}
                          >
                            ✓ គ្រប់ចំនួន (${totalUSD.toFixed(2)})
                          </button>
                          {[1, 5, 10, 20, 50, 100].map((bill) => (
                            <button
                              key={bill}
                              type="button"
                              className={`quick-bill-btn ${Number(receivedUSD) === bill ? 'active' : ''}`}
                              onClick={() => setReceivedUSD(String(bill))}
                            >
                              ${bill}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Mode: KHR Only */}
                    {cashInputMode === 'khr' && (
                      <div className="calc-input-section">
                        <div className="calc-field">
                          <label>ប្រាក់រៀលទទួលបាន (៛)៖</label>
                          <div className="calc-input-wrapper">
                            <input
                              type="number"
                              step="100"
                              min="0"
                              placeholder={totalKHR.toLocaleString()}
                              value={receivedKHR}
                              onChange={(e) => setReceivedKHR(e.target.value)}
                              className="calc-main-input text-right"
                              autoFocus
                            />
                            <span className="calc-symbol-suffix">៛</span>
                            {receivedKHR && (
                              <button
                                type="button"
                                className="calc-clear-btn"
                                onClick={() => setReceivedKHR('')}
                                title="សម្អាត"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Quick KHR Bill Buttons */}
                        <div className="quick-bills-grid">
                          <button
                            type="button"
                            className="quick-bill-btn exact-bill"
                            onClick={() => setReceivedKHR(String(Math.round(totalKHR / 100) * 100))}
                          >
                            ✓ គ្រប់ចំនួន ({(Math.round(totalKHR / 100) * 100).toLocaleString()} ៛)
                          </button>
                          {[10000, 20000, 50000, 100000, 200000].map((bill) => (
                            <button
                              key={bill}
                              type="button"
                              className={`quick-bill-btn ${Number(receivedKHR) === bill ? 'active' : ''}`}
                              onClick={() => setReceivedKHR(String(bill))}
                            >
                              {bill.toLocaleString()} ៛
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Mode: Mixed USD + KHR */}
                    {cashInputMode === 'mixed' && (
                      <div className="calc-input-section mixed-section">
                        <div className="mixed-inputs-row">
                          <div className="calc-field">
                            <label>💵 ទទួលជាដុល្លារ ($)៖</label>
                            <div className="calc-input-wrapper">
                              <span className="calc-symbol">$</span>
                              <input
                                type="number"
                                step="any"
                                min="0"
                                placeholder="0.00"
                                value={receivedUSD}
                                onChange={(e) => setReceivedUSD(e.target.value)}
                                className="calc-main-input"
                              />
                            </div>
                          </div>

                          <div className="calc-field">
                            <label>🇰🇭 ទទួលជារៀល (៛)៖</label>
                            <div className="calc-input-wrapper">
                              <input
                                type="number"
                                step="100"
                                min="0"
                                placeholder="0"
                                value={receivedKHR}
                                onChange={(e) => setReceivedKHR(e.target.value)}
                                className="calc-main-input text-right"
                              />
                              <span className="calc-symbol-suffix">៛</span>
                            </div>
                          </div>
                        </div>

                        <div className="mixed-summary-row">
                          <span>
                            សរុបប្រាក់ទទួលបាន៖{' '}
                            <strong>${totalReceivedUSD.toFixed(2)} ({totalReceivedKHR.toLocaleString()} ៛)</strong>
                          </span>
                          {(receivedUSD || receivedKHR) && (
                            <button
                              type="button"
                              className="calc-text-clear"
                              onClick={() => {
                                setReceivedUSD('');
                                setReceivedKHR('');
                              }}
                            >
                              សម្អាត
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Change Breakdown & Status Card */}
                    {hasEnteredCash && (
                      <div className={`change-display-card ${isInsufficient ? 'insufficient' : isExact ? 'exact' : 'surplus'}`}>
                        {isInsufficient && (
                          <div className="change-insufficient-box">
                            <div className="change-status-title">⚠️ ប្រាក់ទទួលមិនទាន់គ្រប់ចំនួននៅឡើយ</div>
                            <div className="change-deficit-details">
                              <span>នៅខ្វះចំនួន៖ </span>
                              <strong className="deficit-usd">${deficitUSD.toFixed(2)}</strong>
                              <span className="deficit-khr">({deficitKHR.toLocaleString()} ៛)</span>
                            </div>
                          </div>
                        )}

                        {isExact && (
                          <div className="change-exact-box">
                            <span className="change-exact-icon">✓</span>
                            <div>
                              <div className="change-exact-title">ទូទាត់គ្រប់ចំនួន</div>
                              <small>គ្មានប្រាក់អាប់ដែលត្រូវប្រគល់ជូនទេ</small>
                            </div>
                          </div>
                        )}

                        {isChangeDue && (
                          <div className="change-surplus-box">
                            {/* If Client Paid in KHR Only -> Give back 100% in Khmer Riel */}
                            {cashInputMode === 'khr' ? (
                              <div className="khr-change-result">
                                <span className="change-label">🇰🇭 ប្រាក់អាប់ជូនភ្ញៀវ (ជាប្រាក់រៀល)៖</span>
                                <div className="khr-change-amount">
                                  <strong>{totalChangeKHR.toLocaleString()} ៛</strong>
                                  <small>≈ ${surplusUSD.toFixed(2)}</small>
                                </div>
                              </div>
                            ) : (
                              /* If Client Paid in USD or Mixed -> Give back in USD bills + KHR bills */
                              <div className="dual-change-result">
                                <span className="change-label">💵 ប្រាក់អាប់ជូនភ្ញៀវ (ដុល្លារ & រៀល)៖</span>
                                <div className="dual-breakdown-row">
                                  {dollarsBack > 0 && (
                                    <div className="bill-chip dollar-chip">
                                      <span className="bill-sub">ក្រដាសដុល្លារ</span>
                                      <strong className="bill-main">${dollarsBack}.00</strong>
                                    </div>
                                  )}
                                  {dollarsBack > 0 && rielRemainder > 0 && (
                                    <span className="plus-sign">+</span>
                                  )}
                                  {rielRemainder > 0 && (
                                    <div className="bill-chip riel-chip">
                                      <span className="bill-sub">ក្រដាសប្រាក់រៀល</span>
                                      <strong className="bill-main">{rielRemainder.toLocaleString()} ៛</strong>
                                    </div>
                                  )}
                                  {dollarsBack === 0 && rielRemainder === 0 && (
                                    <strong className="bill-main">គ្រប់ចំនួន</strong>
                                  )}
                                </div>

                                {/* Alternative all in Riel note */}
                                {dollarsBack > 0 && (
                                  <div className="riel-alternative-hint">
                                    ឬអាប់ជាប្រាក់រៀលទាំងអស់៖ <strong>{totalChangeKHR.toLocaleString()} ៛</strong>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
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

      {/* Quick Exchange Rate Edit Modal */}
      {showRateModal && (
        <div className="modal-backdrop" onClick={() => setShowRateModal(false)}>
          <div className="modal-card rate-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>💱 កំណត់អត្រាប្តូរប្រាក់ (Exchange Rate)</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowRateModal(false)}
              >
                ×
              </button>
            </div>

            <div className="rate-modal-body">
              <p className="rate-modal-desc">
                អត្រាបច្ចុប្បន្ន៖ <strong>1$ = {exchangeRate.toLocaleString()} ៛</strong>
                <br />
                សូមបញ្ចូល ឬជ្រើសរើសអត្រាទីផ្សារថ្មីខាងក្រោម (ប្រព័ន្ធនឹងគណនាឡើងវិញដោយស្វ័យប្រវត្តិ)៖
              </p>

              <div className="rate-input-large-wrapper">
                <span className="rate-lg-prefix">$1.00 =</span>
                <input
                  type="number"
                  className="rate-lg-input"
                  value={tempRate}
                  step="10"
                  min="1000"
                  max="10000"
                  onChange={(e) => setTempRate(e.target.value)}
                  autoFocus
                />
                <span className="rate-lg-suffix">៛</span>
              </div>

              <div className="rate-modal-presets">
                {[4000, 4100, 4120, 4150, 4200].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className={`preset-btn ${Number(tempRate) === preset ? 'active' : ''}`}
                    onClick={() => setTempRate(String(preset))}
                  >
                    {preset.toLocaleString()} ៛
                  </button>
                ))}
              </div>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setShowRateModal(false)}
              >
                {t.cancel}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  const val = parseInt(tempRate, 10);
                  if (val && val > 0) {
                    updateExchangeRate(val);
                    setShowRateModal(false);
                  }
                }}
              >
                {t.save}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
