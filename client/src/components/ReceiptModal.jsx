import { useState } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { formatDualPrice, formatUSD, t } from '../lib/i18n.js';

export default function ReceiptModal({ receipt, onClose }) {
  const [logo, setLogo] = useState(() => {
    try {
      return localStorage.getItem('salon_receipt_logo') || '';
    } catch {
      return '';
    }
  });

  const [exportingImage, setExportingImage] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  if (!receipt) return null;

  function handleLogoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('សូមជ្រើសរើសឯកសាររូបភាព (PNG, JPG, SVG)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result;
      if (typeof dataUrl === 'string') {
        setLogo(dataUrl);
        try {
          localStorage.setItem('salon_receipt_logo', dataUrl);
        } catch {
          // ignore localStorage quota errors
        }
      }
    };
    reader.readAsDataURL(file);
  }

  function handleRemoveLogo() {
    setLogo('');
    try {
      localStorage.removeItem('salon_receipt_logo');
    } catch {
      // ignore
    }
  }

  async function handleDownloadImage() {
    const el = document.getElementById('printable-receipt');
    if (!el) return;

    setExportingImage(true);
    try {
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `invoice-${receipt.id || 'receipt'}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      alert('មានបញ្ហាក្នុងការទាញយករូបភាព៖ ' + err.message);
    } finally {
      setExportingImage(false);
    }
  }

  async function handleDownloadPdf() {
    const el = document.getElementById('printable-receipt');
    if (!el) return;

    setExportingPdf(true);
    try {
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      
      // Calculate aspect ratio for 80mm thermal receipt format
      const pdfWidth = 80; // mm
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [pdfWidth, Math.max(pdfHeight, 100)],
      });

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`invoice-${receipt.id || 'receipt'}.pdf`);
    } catch (err) {
      alert('មានបញ្ហាក្នុងការទាញយក PDF៖ ' + err.message);
    } finally {
      setExportingPdf(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card receipt-modal-card" onClick={(e) => e.stopPropagation()}>
        
        {/* Top Control Bar: Import Logo */}
        <div className="receipt-toolbar no-print">
          <label className="receipt-upload-btn">
            📷 បញ្ចូលរូបសញ្ញាហាង
            <input
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleLogoUpload}
            />
          </label>

          {logo && (
            <button
              type="button"
              className="receipt-remove-logo-btn"
              onClick={handleRemoveLogo}
              title="ដករូបសញ្ញាហាងចេញ"
            >
              ✕ ដករូបចេញ
            </button>
          )}
        </div>

        {/* Printable Paper */}
        <div className="receipt-paper" id="printable-receipt">
          {logo && (
            <div className="receipt-logo-container">
              <img src={logo} alt="រូបសញ្ញាហាង" className="receipt-custom-logo" />
            </div>
          )}

          <div className="receipt-header">
            <h2>{t.receiptShopName}</h2>
            <p>{t.receiptShopAddress}</p>
            <div className="receipt-divider" />
          </div>

          <div className="receipt-info-grid">
            <div><strong>{t.receiptNumber}៖</strong> #{receipt.id}</div>
            <div><strong>{t.receiptDate}៖</strong> {new Date(receipt.created_at).toLocaleString()}</div>
            <div><strong>{t.receiptCustomer}៖</strong> {receipt.customer_name || 'អតិថិជនទូទៅ'}</div>
            <div><strong>{t.receiptBarber}៖</strong> {receipt.barbers?.name || '—'}</div>
            <div>
              <strong>{t.receiptPayment}៖</strong>{' '}
              {receipt.payment_method === 'cash_usd'
                ? 'សាច់ប្រាក់ដុល្លារ ($)'
                : receipt.payment_method === 'cash_khr'
                ? 'សាច់ប្រាក់រៀល (៛)'
                : receipt.payment_method === 'aba_khqr'
                ? 'ស្កេនទូទាត់ (KHQR)'
                : receipt.payment_method === 'card'
                ? 'កាតធនាគារ'
                : receipt.payment_method || '—'}
            </div>
          </div>

          <div className="receipt-divider" />

          <table className="receipt-table">
            <thead>
              <tr>
                <th>{t.items}</th>
                <th>{t.quantity}</th>
                <th>{t.price}</th>
                <th>{t.lineTotal}</th>
              </tr>
            </thead>
            <tbody>
              {receipt.sale_items?.map((item, idx) => (
                <tr key={idx}>
                  <td>{item.product_name}</td>
                  <td>{item.quantity}</td>
                  <td>{formatUSD(item.unit_price)}</td>
                  <td>{formatUSD(item.line_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="receipt-divider" />

          <div className="receipt-totals">
            <div className="r-row">
              <span>{t.subtotal}៖</span>
              <span>{formatUSD(receipt.subtotal)}</span>
            </div>
            {Number(receipt.tip) > 0 && (
              <div className="r-row">
                <span>{t.tip}៖</span>
                <span>{formatUSD(receipt.tip)}</span>
              </div>
            )}
            <div className="r-row r-grand-total">
              <span>{t.grandTotal}៖</span>
              <span>{formatDualPrice(receipt.total)}</span>
            </div>
          </div>

          <div className="receipt-footer">
            <p>💈 {t.receiptThankYou}</p>
            <small>រៀបចំដោយ {t.appName}</small>
          </div>
        </div>

        {/* Actions Toolbar: Close, Download Image, Download PDF, Print */}
        <div className="receipt-action-buttons no-print">
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={onClose}
          >
            {t.close}
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleDownloadImage}
            disabled={exportingImage}
            title="ទាញយកវិក្កយបត្រជារូបភាព"
          >
            {exportingImage ? 'កំពុងទាញយក...' : '📸 រូបភាព'}
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleDownloadPdf}
            disabled={exportingPdf}
            title="ទាញយកវិក្កយបត្រជាឯកសារ PDF"
          >
            {exportingPdf ? 'កំពុងទាញយក...' : '📄 ឯកសារ PDF'}
          </button>

          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handlePrint}
          >
            🖨️ {t.print}
          </button>
        </div>

      </div>
    </div>
  );
}
