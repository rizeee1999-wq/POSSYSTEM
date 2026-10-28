import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { t } from '../lib/i18n.js';

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

export default function AdminNav() {
  const { user, signOut } = useAuth();

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
      <div className="admin-nav-user">
        <span className="user-email">{user?.email}</span>
        <button onClick={signOut} className="btn-logout">{t.signOut}</button>
        <NavLink to="/" className="view-site-link">
          {t.viewClientSite}
        </NavLink>
      </div>
    </header>
  );
}
