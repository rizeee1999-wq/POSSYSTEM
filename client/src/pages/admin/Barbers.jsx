import { useEffect, useState } from 'react';
import {
  adminCreateBarber,
  adminDeleteBarber,
  adminGetBarbers,
  adminUpdateBarber,
} from '../../lib/api.js';
import { t } from '../../lib/i18n.js';

const emptyBarberForm = {
  name: '',
  nickname: '',
  role: 'barber',
  phone: '',
  avatar_url: '',
  active: true,
};

export default function Barbers() {
  const [barbers, setBarbers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyBarberForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  async function loadBarbers() {
    setLoading(true);
    setError('');
    try {
      const data = await adminGetBarbers();
      setBarbers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBarbers();
  }, []);

  function openAddModal() {
    setEditingId(null);
    setForm(emptyBarberForm);
    setFormError('');
    setModalOpen(true);
  }

  function openEditModal(barber) {
    setEditingId(barber.id);
    setForm({
      name: barber.name,
      nickname: barber.nickname || '',
      role: barber.role || 'barber',
      phone: barber.phone || '',
      avatar_url: barber.avatar_url || '',
      active: barber.active,
    });
    setFormError('');
    setModalOpen(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.name.trim()) {
      setFormError('សូមបញ្ចូលឈ្មោះជាងកាត់សក់');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      if (editingId) {
        await adminUpdateBarber(editingId, form);
      } else {
        await adminCreateBarber(form);
      }
      setModalOpen(false);
      await loadBarbers();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminDeleteBarber(deleteTarget.id);
      setDeleteTarget(null);
      await loadBarbers();
    } catch (err) {
      alert(err.message);
    } finally {
      setDeleting(false);
    }
  }

  async function toggleActive(barber) {
    try {
      await adminUpdateBarber(barber.id, { active: !barber.active });
      await loadBarbers();
    } catch (err) {
      alert(err.message);
    }
  }

  const roleLabels = {
    master_barber: t.roleMaster,
    stylist: t.roleStylist,
    barber: t.roleBarber,
    apprentice: t.roleApprentice,
  };

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h1>{t.barbersTitle}</h1>
          <p className="admin-subtitle">គ្រប់គ្រងជាងកាត់សក់ ជំនាញ និងស្ថានភាពការងារ</p>
        </div>
        <button className="btn btn-primary" onClick={openAddModal}>
          {t.addBarber}
        </button>
      </div>

      {loading && <div className="page-loading">{t.loading}</div>}
      {error && <div className="banner banner-error">{error}</div>}

      {!loading && !error && barbers.length === 0 && (
        <div className="empty-state">{t.noBarbers}</div>
      )}

      {!loading && !error && barbers.length > 0 && (
        <div className="barber-grid">
          {barbers.map((b) => (
            <div key={b.id} className={`barber-card ${!b.active ? 'barber-inactive' : ''}`}>
              <div className="barber-card-top">
                <div className="barber-avatar">
                  {b.avatar_url ? (
                    <img
                      src={b.avatar_url}
                      alt={b.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <span>💈</span>
                  )}
                </div>
                <div className="barber-info">
                  <h3>{b.name}</h3>
                  {b.nickname && <span className="barber-nickname">{b.nickname}</span>}
                  <span className={`badge badge-role badge-${b.role}`}>
                    {roleLabels[b.role] || b.role}
                  </span>
                </div>
              </div>

              <div className="barber-card-details">
                <div className="detail-row">
                  <span className="detail-label">{t.phone}៖</span>
                  <span className="detail-value">{b.phone || '—'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">{t.activeStatus}៖</span>
                  <button
                    className={`status-toggle ${b.active ? 'status-active' : 'status-inactive'}`}
                    onClick={() => toggleActive(b)}
                  >
                    {b.active ? t.active : t.inactive}
                  </button>
                </div>
              </div>

              <div className="barber-card-actions">
                <button className="btn btn-outline btn-sm" onClick={() => openEditModal(b)}>
                  {t.edit}
                </button>
                <button
                  className="btn btn-danger-outline btn-sm"
                  onClick={() => setDeleteTarget(b)}
                >
                  {t.delete}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingId ? t.editBarber : t.addBarber}</h2>
              <button className="modal-close" onClick={() => setModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleSave} className="admin-form">
              {formError && <div className="banner banner-error">{formError}</div>}

              <div className="form-group">
                <label>{t.barberName} *</label>
                <input
                  type="text"
                  required
                  placeholder="ឧ. សុខ ដារ៉ា"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>{t.nickname}</label>
                <input
                  type="text"
                  placeholder="ឧ. ជាងជំនាញកាត់ហ្វេត & ច្នៃម៉ូត"
                  value={form.nickname}
                  onChange={(e) => setForm({ ...form, nickname: e.target.value })}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>💼 {t.role}</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                  >
                    <option value="master_barber">👑 {t.roleMaster}</option>
                    <option value="stylist">⭐ {t.roleStylist}</option>
                    <option value="barber">💈 {t.roleBarber}</option>
                    <option value="apprentice">✂️ {t.roleApprentice}</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>📞 {t.phone}</label>
                  <input
                    type="text"
                    placeholder="012 345 678"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>🖼️ {t.avatarUrl}</label>
                {form.avatar_url && (
                  <div className="form-image-preview barber-avatar-preview">
                    <img
                      src={form.avatar_url}
                      alt="Barber Avatar"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <button
                      type="button"
                      className="form-image-remove-btn"
                      onClick={() => setForm({ ...form, avatar_url: '' })}
                      title="ដករូបចេញ"
                    >
                      ✕
                    </button>
                  </div>
                )}
                <input
                  type="url"
                  placeholder="https://example.com/avatar.jpg"
                  value={form.avatar_url}
                  onChange={(e) => setForm({ ...form, avatar_url: e.target.value })}
                />
              </div>

              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) => setForm({ ...form, active: e.target.checked })}
                  />
                  <span>{t.active}</span>
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

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="modal-backdrop" onClick={() => setDeleteTarget(null)}>
          <div className="modal-card modal-confirm" onClick={(e) => e.stopPropagation()}>
            <h2>{t.deleteConfirmTitle}</h2>
            <p>{t.deleteBarberConfirm} <strong>{deleteTarget.name}</strong>?</p>
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
                onClick={handleDelete}
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
