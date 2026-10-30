import { useState, useRef, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { t, useExchangeRate } from '../lib/i18n.js';

function BarberScissorsIcon() {
  return (
    <svg
      className="admin-nav-logo"
      viewBox="0 0 24 24"
      width="28"
      height="28"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="6" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <line x1="20" y1="4" x2="8.5" y2="14.5" />
      <line x1="8.5" y1="9.5" x2="20" y2="20" />
    </svg>
  );
}

function NavIcon({ children }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="17"
      height="17"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

function DashboardIcon() {
  return (
    <NavIcon>
      <rect x="3" y="3" width="8" height="8" rx="1.5" />
      <rect x="13" y="3" width="8" height="8" rx="1.5" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" />
      <rect x="13" y="13" width="8" height="8" rx="1.5" />
    </NavIcon>
  );
}

function SellIcon() {
  return (
    <NavIcon>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <line x1="2" y1="10" x2="22" y2="10" />
      <line x1="7" y1="15" x2="7.01" y2="15" strokeWidth="3" />
      <line x1="12" y1="15" x2="17" y2="15" />
    </NavIcon>
  );
}

function QueueIcon() {
  return (
    <NavIcon>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </NavIcon>
  );
}

function ProductsIcon() {
  return (
    <NavIcon>
      <path d="m14 12-8.5 8.5a2.12 2.12 0 1 1-3-3L11 9" />
      <path d="M15 13 9 7l4-4 6 6-4 4Z" />
      <path d="m18 10 3 3" />
    </NavIcon>
  );
}

function BarbersIcon() {
  return (
    <NavIcon>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </NavIcon>
  );
}

function HistoryIcon() {
  return (
    <NavIcon>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </NavIcon>
  );
}

function ChevronDownIcon({ open }) {
  return (
    <svg
      className={`admin-user-chevron ${open ? 'open' : ''}`}
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

export default function AdminNav() {
  const { user, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Exchange rate management
  const [exchangeRate, updateExchangeRate] = useExchangeRate();
  const [isEditingRate, setIsEditingRate] = useState(false);
  const [rateInput, setRateInput] = useState(String(exchangeRate));
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    setRateInput(String(exchangeRate));
  }, [exchangeRate]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const userInitial = user?.email ? user.email.charAt(0).toUpperCase() : 'A';
  const displayName = user?.email ? user.email.split('@')[0] : 'Admin';

  return (
    <header className="admin-nav">
      <div className="admin-nav-brand">
        <BarberScissorsIcon />
        <div>
          <span className="admin-nav-title">{t.appName}</span>
          <span className="admin-nav-badge">ប្រព័ន្ធគ្រប់គ្រងហាង</span>
        </div>
      </div>
      <nav>
        <NavLink to="/admin" end>
          <DashboardIcon />
          {t.navDashboard}
        </NavLink>
        <NavLink to="/admin/sell">
          <SellIcon />
          {t.navSell}
        </NavLink>
        <NavLink to="/admin/queue">
          <QueueIcon />
          {t.navQueue}
        </NavLink>
        <NavLink to="/admin/products">
          <ProductsIcon />
          {t.navProducts}
        </NavLink>
        <NavLink to="/admin/barbers">
          <BarbersIcon />
          {t.navBarbers}
        </NavLink>
        <NavLink to="/admin/sales">
          <HistoryIcon />
          {t.navSales}
        </NavLink>
      </nav>

      <div className="admin-nav-user" ref={dropdownRef}>
        <button
          type="button"
          className={`admin-user-btn ${isOpen ? 'active' : ''}`}
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
          aria-haspopup="true"
          title="គណនីគ្រប់គ្រង"
        >
          <span className="admin-user-avatar">{userInitial}</span>
          <span className="admin-user-name">{displayName}</span>
          <ChevronDownIcon open={isOpen} />
        </button>

        {isOpen && (
          <div className="admin-user-dropdown-menu" role="menu">
            {/* User profile summary */}
            <div className="dropdown-user-header">
              <div className="dropdown-user-avatar-lg">{userInitial}</div>
              <div className="dropdown-user-details">
                <div className="dropdown-user-email" title={user?.email}>
                  {user?.email || 'admin@pos.local'}
                </div>
                <span className="dropdown-user-role-badge">⭐ អ្នកគ្រប់គ្រង (Admin)</span>
              </div>
            </div>

            <div className="dropdown-divider" />

            {/* Menu items */}
            <div className="dropdown-section-title">សកម្មភាពរហ័ស</div>

            <NavLink
              to="/"
              className="dropdown-item"
              onClick={() => setIsOpen(false)}
            >
              <ExternalLinkIcon />
              <div className="dropdown-item-text">
                <span className="dropdown-item-label">{t.viewClientSite}</span>
                <span className="dropdown-item-hint">មើលទំព័រអតិថិជនសាធារណៈ</span>
              </div>
            </NavLink>

            {/* Exchange Rate Setting Card */}
            <div className="dropdown-divider" />
            <div className="dropdown-section-title">អត្រាប្តូរប្រាក់ (Exchange Rate)</div>
            <div className="dropdown-rate-card">
              <div className="dropdown-rate-header">
                <div className="dropdown-rate-info">
                  <span className="dropdown-rate-icon">💱</span>
                  <div className="dropdown-rate-text">
                    <span className="dropdown-rate-label">1$ =</span>
                    <strong className="dropdown-rate-value">{Number(exchangeRate).toLocaleString()} ៛</strong>
                  </div>
                </div>
                <button
                  type="button"
                  className={`dropdown-rate-edit-btn ${isEditingRate ? 'active' : ''}`}
                  onClick={() => {
                    setIsEditingRate(!isEditingRate);
                    setSaveSuccess(false);
                  }}
                  title="កែសម្រួលអត្រាប្តូរប្រាក់"
                >
                  {isEditingRate ? 'បិទ' : 'កែប្រែ ✏️'}
                </button>
              </div>

              {isEditingRate && (
                <div className="dropdown-rate-editor">
                  <div className="dropdown-rate-input-row">
                    <span className="rate-currency-prefix">$1.00 =</span>
                    <input
                      type="number"
                      className="dropdown-rate-input"
                      value={rateInput}
                      step="10"
                      min="1000"
                      max="10000"
                      onChange={(e) => setRateInput(e.target.value)}
                      placeholder="4100"
                      autoFocus
                    />
                    <span className="rate-currency-suffix">៛</span>
                  </div>

                  <div className="dropdown-rate-presets">
                    {[4000, 4100, 4120, 4150].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        className={`rate-preset-chip ${Number(rateInput) === preset ? 'active' : ''}`}
                        onClick={() => setRateInput(String(preset))}
                      >
                        {preset.toLocaleString()}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    className={`btn-rate-save ${saveSuccess ? 'success' : ''}`}
                    onClick={() => {
                      const val = parseInt(rateInput, 10);
                      if (val && val > 0) {
                        updateExchangeRate(val);
                        setSaveSuccess(true);
                        setTimeout(() => {
                          setSaveSuccess(false);
                          setIsEditingRate(false);
                        }, 1000);
                      }
                    }}
                  >
                    {saveSuccess ? '✓ រក្សាទុករួចរាល់!' : '✓ រក្សាទុកអត្រាថ្មី'}
                  </button>
                </div>
              )}
            </div>

            {/* Ready for future feature slot: Store Profile & Settings */}
            <div
              className="dropdown-item future-feature"
              title="មុខងារនេះនឹងដាក់ឱ្យប្រើប្រាស់ឆាប់ៗនេះ"
            >
              <SettingsIcon />
              <div className="dropdown-item-text">
                <span className="dropdown-item-label">ការកំណត់ & ព័ត៌មានហាង</span>
                <span className="badge-coming-soon">ឆាប់ៗនេះ</span>
              </div>
            </div>

            <div className="dropdown-divider" />

            {/* Sign out */}
            <button
              type="button"
              className="dropdown-item logout-item"
              onClick={() => {
                setIsOpen(false);
                signOut();
              }}
            >
              <LogoutIcon />
              <span className="dropdown-item-label">{t.signOut}</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
