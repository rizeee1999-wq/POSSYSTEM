import { useEffect, useState } from 'react';
import { adminDeleteSale, adminGetSales, adminUpdateSale } from '../../lib/api.js';
import { t } from '../../lib/i18n.js';

export default function SalesHistory() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingSale, setEditingSale] = useState(null);
  const [deletingSale, setDeletingSale] = useState(null);
  const [newSaleDate, setNewSaleDate] = useState('');
  const [editingItems, setEditingItems] = useState([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  async function refreshSales() {
    setLoading(true);
    setError('');
    try {
      const data = await adminGetSales();
      setSales(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshSales();
  }, []);

  const filteredSales = sales.filter((sale) => {
    const saleDate = sale.created_at.slice(0, 10);
    if (fromDate && saleDate < fromDate) return false;
    if (toDate && saleDate > toDate) return false;
    return true;
  });

  const grandTotal = filteredSales.reduce((sum, sale) => sum + Number(sale.total), 0);

  async function handleDeleteSale() {
    if (!deletingSale) return;

    setDeleting(true);
    setError('');

    try {
      await adminDeleteSale(deletingSale.id);
      setSales((prev) => prev.filter((sale) => sale.id !== deletingSale.id));
      setDeletingSale(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setDeleting(false);
    }
  }

  function addEditingItem() {
    setEditingItems((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}-${Math.random()}`,
        product_id: null,
        product_name: '',
        quantity: 1,
        unit_price: 0,
      },
    ]);
  }

  function updateEditingItem(index, field, value) {
    setEditingItems((prev) =>
      prev.map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        if (field === 'quantity') return { ...item, quantity: Math.max(1, Number(value) || 1) };
        return { ...item, [field]: value };
      }),
    );
  }

  function removeEditingItem(index) {
    setEditingItems((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  }

  async function handleSaveSaleUpdate(e) {
    e.preventDefault();
    if (!editingSale || !newSaleDate) return;

    const cleanedItems = editingItems
      .filter((item) => item.product_name && item.product_name.trim())
      .map((item) => ({
        product_id: item.product_id,
        product_name: item.product_name.trim(),
        quantity: Number(item.quantity) || 1,
        unit_price: Number(item.unit_price) || 0,
      }));

    if (cleanedItems.length === 0) {
      setError('A sale must have at least one item');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const updatedSale = await adminUpdateSale(editingSale.id, {
        created_at: `${newSaleDate}T12:00:00`,
        items: cleanedItems,
      });

      setSales((prev) =>
        prev.map((sale) => (sale.id === editingSale.id ? updatedSale : sale)),
      );
      setEditingSale(null);
      setEditingItems([]);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="page-loading">{t.loading}</div>;
  if (error) return <div className="empty-state">{error}</div>;

  return (
    <div>
      <h1>{t.salesHistoryTitle}</h1>

      {sales.length > 0 && (
        <div className="catalog-controls">
          <div className="form-field" style={{ margin: 0 }}>
            <label>{t.filterFrom}</label>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div className="form-field" style={{ margin: 0 }}>
            <label>{t.filterTo}</label>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ alignSelf: 'flex-end' }}
            onClick={() => {
              const today = new Date().toISOString().slice(0, 10);
              setFromDate(today);
              setToDate(today);
            }}
          >
            {t.todayFilter}
          </button>
          {(fromDate || toDate) && (
            <button
              type="button"
              className="btn btn-secondary"
              style={{ alignSelf: 'flex-end', marginLeft: 'auto' }}
              onClick={() => {
                setFromDate('');
                setToDate('');
              }}
            >
              {t.clearFilter}
            </button>
          )}
        </div>
      )}

      {sales.length === 0 ? (
        <div className="empty-state">{t.noSales}</div>
      ) : filteredSales.length === 0 ? (
        <div className="empty-state">{t.noSalesFilterResults}</div>
      ) : (
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t.date}</th>
                <th>{t.items}</th>
                <th>{t.total}</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSales.map((sale) => (
                <tr key={sale.id}>
                  <td>{new Date(sale.created_at).toLocaleString()}</td>
                  <td>
                    {sale.sale_items
                      .map((item) => `${item.product_name} × ${item.quantity}`)
                      .join(', ')}
                  </td>
                  <td>${Number(sale.total).toFixed(2)}</td>
                  <td>
                    <div className="row-actions">
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          setEditingSale(sale);
                          setNewSaleDate(sale.created_at.slice(0, 10));
                          setEditingItems(
                            sale.sale_items.map((item) => ({
                              id: item.id,
                              product_id: item.product_id,
                              product_name: item.product_name,
                              quantity: Number(item.quantity),
                              unit_price: Number(item.unit_price) || 0,
                            })),
                          );
                        }}
                      >
                        Update
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={() => setDeletingSale(sale)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filteredSales.length > 0 && (
        <div className="panel" style={{ marginTop: '1rem' }}>
          <div className="cart-total" style={{ margin: 0 }}>
            <span>{t.total}</span>
            <span>${grandTotal.toFixed(2)}</span>
          </div>
        </div>
      )}

      {editingSale && (
        <div className="modal-overlay" onClick={() => setEditingSale(null)}>
          <form className="modal-card" onClick={(e) => e.stopPropagation()} onSubmit={handleSaveSaleUpdate}>
            <h2>Update Sale</h2>

            <div className="form-field">
              <label>{t.date}</label>
              <input
                type="date"
                value={newSaleDate}
                onChange={(e) => setNewSaleDate(e.target.value)}
              />
            </div>

            <div className="form-field">
              <label>Items</label>
              {editingItems.map((item, index) => (
                <div key={item.id ?? `item-${index}`} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                  <input
                    type="text"
                    value={item.product_name}
                    placeholder="Item name"
                    onChange={(e) => updateEditingItem(index, 'product_name', e.target.value)}
                    style={{ flex: 2 }}
                  />
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateEditingItem(index, 'quantity', e.target.value)}
                    style={{ width: '80px' }}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => removeEditingItem(index)}
                    disabled={editingItems.length === 1}
                  >
                    ×
                  </button>
                </div>
              ))}

              <button type="button" className="btn btn-secondary btn-sm" onClick={addEditingItem}>
                + Add item
              </button>
            </div>

            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setEditingSale(null)}>
                {t.cancel}
              </button>
              <button type="submit" className="btn" disabled={saving || !newSaleDate}>
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}

      {deletingSale && (
        <div className="modal-overlay" onClick={() => !deleting && setDeletingSale(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>Delete Sale</h2>
            <p>Delete this sale?</p>
            <p className="delete-target-name">{new Date(deletingSale.created_at).toLocaleString()}</p>

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setDeletingSale(null)}
                disabled={deleting}
              >
                {t.cancel}
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleDeleteSale}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
