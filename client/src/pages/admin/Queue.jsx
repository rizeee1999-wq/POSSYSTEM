import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  adminCreateQueueTicket,
  adminDeleteQueueTicket,
  adminGetBarbers,
  adminGetProducts,
  adminGetQueue,
  adminUpdateQueueTicket,
} from '../../lib/api.js';
import { formatUSD, t } from '../../lib/i18n.js';

export default function Queue() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [barbers, setBarbers] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    customer_name: '',
    customer_phone: '',
    barber_id: '',
    service_id: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  async function loadData() {
    setLoading(true);
    try {
      const [queueData, barbersData, productsData] = await Promise.all([
        adminGetQueue(),
        adminGetBarbers(),
        adminGetProducts(),
      ]);
      setTickets(queueData || []);
      setBarbers(barbersData.filter((b) => b.active) || []);
      setServices(productsData.filter((p) => p.item_type === 'service') || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // Auto-refresh queue every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  async function handleAddCustomer(e) {
    e.preventDefault();
    if (!form.customer_name.trim()) {
      setFormError('សូមបញ្ចូលឈ្មោះភ្ញៀវ');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      await adminCreateQueueTicket(form);
      setModalOpen(false);
      setForm({
        customer_name: '',
        customer_phone: '',
        barber_id: '',
        service_id: '',
        notes: '',
      });
      await loadData();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(ticketId, newStatus) {
    try {
      await adminUpdateQueueTicket(ticketId, { status: newStatus });
      await loadData();
    } catch (err) {
      alert(err.message);
    }
  }

  async function removeTicket(ticketId) {
    if (!window.confirm('តើអ្នកពិតជាចង់លុបទិន្នន័យនេះមែនទេ?')) return;
    try {
      await adminDeleteQueueTicket(ticketId);
      await loadData();
    } catch (err) {
      alert(err.message);
    }
  }

  function handleSendToRegister(ticket) {
    // Navigate to sell with state
    navigate('/admin/sell', {
      state: {
        ticketId: ticket.id,
        customerName: ticket.customer_name,
        customerPhone: ticket.customer_phone,
        barberId: ticket.barber_id,
        serviceId: ticket.service_id,
        notes: ticket.notes,
      },
    });
  }

  const waitingList = tickets.filter((t) => t.status === 'waiting');
  const inChairList = tickets.filter((t) => t.status === 'in_chair');
  const readyList = tickets.filter((t) => t.status === 'completed'); // or ready_to_pay

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h1>{t.queueTitle}</h1>
          <p className="admin-subtitle">គ្រប់គ្រងភ្ញៀវរង់ចាំ កៅអីកំពុងកាត់សក់ និងបញ្ជូនទៅតុគិតលុយ</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
          {t.addToQueue}
        </button>
      </div>

      {error && <div className="banner banner-error">{error}</div>}

      <div className="queue-columns">
        {/* Column 1: Waiting */}
        <div className="queue-column">
          <div className="queue-column-header queue-header-waiting">
            <h3>{t.waitingList}</h3>
            <span className="queue-badge">{waitingList.length}</span>
          </div>

          <div className="queue-cards-list">
            {waitingList.length === 0 ? (
              <div className="queue-empty">{t.noWaiting}</div>
            ) : (
              waitingList.map((ticket) => (
                <div key={ticket.id} className="queue-card">
                  <div className="queue-card-top">
                    <span className="queue-customer-name">{ticket.customer_name}</span>
                    <button
                      className="queue-card-delete"
                      title={t.delete}
                      onClick={() => removeTicket(ticket.id)}
                    >
                      ×
                    </button>
                  </div>

                  {ticket.customer_phone && (
                    <div className="queue-card-sub">📞 {ticket.customer_phone}</div>
                  )}

                  <div className="queue-card-tags">
                    {ticket.products && (
                      <span className="badge badge-service">
                        ✂️ {ticket.products.name} ({formatUSD(ticket.products.price)})
                      </span>
                    )}
                    {ticket.barbers ? (
                      <span className="badge badge-barber">
                        👤 ជាង {ticket.barbers.name}
                      </span>
                    ) : (
                      <span className="badge badge-outline">ជាងណាក៏បាន</span>
                    )}
                  </div>

                  {ticket.notes && <p className="queue-card-notes">📝 {ticket.notes}</p>}

                  <div className="queue-card-actions">
                    <button
                      className="btn btn-primary btn-sm btn-full"
                      onClick={() => updateStatus(ticket.id, 'in_chair')}
                    >
                      💈 {t.startService}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Column 2: In Chair */}
        <div className="queue-column">
          <div className="queue-column-header queue-header-chair">
            <h3>{t.inChairList}</h3>
            <span className="queue-badge">{inChairList.length}</span>
          </div>

          <div className="queue-cards-list">
            {inChairList.length === 0 ? (
              <div className="queue-empty">{t.noInChair}</div>
            ) : (
              inChairList.map((ticket) => (
                <div key={ticket.id} className="queue-card queue-card-active">
                  <div className="queue-card-top">
                    <span className="queue-customer-name">💈 {ticket.customer_name}</span>
                    <span className="status-live">កំពុងកាត់...</span>
                  </div>

                  <div className="queue-card-tags">
                    {ticket.products && (
                      <span className="badge badge-service">
                        ✂️ {ticket.products.name} ({ticket.products.duration_min} នាទី)
                      </span>
                    )}
                    {ticket.barbers && (
                      <span className="badge badge-barber">
                        👤 ជាង {ticket.barbers.name}
                      </span>
                    )}
                  </div>

                  {ticket.notes && <p className="queue-card-notes">📝 {ticket.notes}</p>}

                  <div className="queue-card-actions">
                    <button
                      className="btn btn-success btn-sm btn-full"
                      onClick={() => handleSendToRegister(ticket)}
                    >
                      💵 {t.sendToRegister}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Column 3: Quick Add / Help Summary */}
        <div className="queue-column">
          <div className="queue-column-header queue-header-info">
            <h3>💈 ព័ត៌មានជាងកាត់សក់កំពុងប្រចាំការ</h3>
            <span className="queue-badge">{barbers.length}</span>
          </div>

          <div className="active-barbers-panel">
            {barbers.map((b) => (
              <div key={b.id} className="barber-status-chip">
                <span className="barber-dot online" />
                <div className="barber-chip-text">
                  <strong>{b.name}</strong>
                  <small>{b.nickname || b.role}</small>
                </div>
              </div>
            ))}

            <div className="queue-quick-box">
              <h4>💡 របៀបប្រើប្រាស់ប្រព័ន្ធជួរកាត់សក់</h4>
              <ul>
                <li>ចុច <strong>{t.addToQueue}</strong> នៅពេលភ្ញៀវទើបមកដល់ហាង</li>
                <li>នៅពេលកៅអីទំនេរ ចុច <strong>{t.startService}</strong></li>
                <li>នៅពេលកាត់សក់រួច ចុច <strong>{t.sendToRegister}</strong> ដើម្បីគិតលុយភ្លាមៗ!</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Add Customer Modal */}
      {modalOpen && (
        <div className="modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t.addToQueue}</h2>
              <button className="modal-close" onClick={() => setModalOpen(false)}>×</button>
            </div>

            <form onSubmit={handleAddCustomer} className="admin-form">
              {formError && <div className="banner banner-error">{formError}</div>}

              <div className="form-group">
                <label>{t.customerName} *</label>
                <input
                  type="text"
                  required
                  placeholder="ឧ. បងវិបុល / Walk-in Customer"
                  value={form.customer_name}
                  onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>{t.customerPhone}</label>
                <input
                  type="text"
                  placeholder="012 345 678"
                  value={form.customer_phone}
                  onChange={(e) => setForm({ ...form, customer_phone: e.target.value })}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>{t.selectedService}</label>
                  <select
                    value={form.service_id}
                    onChange={(e) => setForm({ ...form, service_id: e.target.value })}
                  >
                    <option value="">{t.selectService}</option>
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({formatUSD(s.price)} - {s.duration_min} នាទី)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>{t.assignedBarber}</label>
                  <select
                    value={form.barber_id}
                    onChange={(e) => setForm({ ...form, barber_id: e.target.value })}
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

              <div className="form-group">
                <label>{t.notesPlaceholder}</label>
                <textarea
                  rows="2"
                  placeholder="ឧ. កាត់ហ្វេតលេខ 1 សិតវែកឆ្វេង និងកោរពុកមាត់"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
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
    </div>
  );
}
