import { useEffect, useState } from 'react';
import {
  adminDeleteSale,
  adminGetBarbers,
  adminGetSales,
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedBarber, setSelectedBarber] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [receiptModal, setReceiptModal] = useState(null);
  const [deletingSale, setDeletingSale] = useState(null);
  const [deleting, setDeleting] = useState(false);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const [salesData, barbersData] = await Promise.all([
        adminGetSales(),
        adminGetBarbers(),
      ]);
      setSales(salesData || []);
      setBarbers(barbersData || []);
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

  function handlePrintReceipt() {
    window.print();
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

        {/* Total revenue badge */}
        <div className="history-summary-box">
          <div className="summary-item">
            <span>{t.total}៖</span>
            <strong>{formatUSD(grandTotalUSD)}</strong>
            <small>({formatKHR(grandTotalUSD)})</small>
          </div>
          <div className="summary-item">
            <span>{t.tip}៖</span>
            <strong className="text-success">{formatUSD(grandTipsUSD)}</strong>
          </div>
        </div>
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
                <th>សកម្មភាព</th>
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
                  <td>
                    <div className="table-actions">
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => setReceiptModal(sale)}
                      >
                        🧾 {t.viewReceipt}
                      </button>
                      <button
                        className="btn btn-danger-outline btn-sm"
                        onClick={() => setDeletingSale(sale)}
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
      )}

      {/* Printable Receipt Modal with Image & PDF Export */}
      <ReceiptModal
        receipt={receiptModal}
        onClose={() => setReceiptModal(null)}
      />

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
