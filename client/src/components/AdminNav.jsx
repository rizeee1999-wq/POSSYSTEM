import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { t } from '../lib/i18n.js';

function LogoIcon() {
  return (
    <svg
      className="admin-nav-logo"
      viewBox="0 0 24 24"
      width="26"
      height="26"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
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
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
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
      <circle cx="9" cy="20" r="1.4" />
      <circle cx="18" cy="20" r="1.4" />
      <path d="M2.5 3h2.4l2.6 12.2a2 2 0 0 0 2 1.6h8.2a2 2 0 0 0 2-1.6L21.5 8H6" />
    </NavIcon>
  );
}

function ProductsIcon() {
  return (
    <NavIcon>
      <path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5v-9Z" />
      <path d="M3.5 7.5 12 12l8.5-4.5" />
      <path d="M12 12v9" />
    </NavIcon>
  );
}

function HistoryIcon() {
  return (
    <NavIcon>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l3 2" />
      <path d="M9 3h6" />
    </NavIcon>
  );
}

export default function AdminNav() {
  const { user, signOut } = useAuth();

  return (
    <header className="admin-nav">
      <div className="admin-nav-brand">
        <LogoIcon />
        <span className="admin-nav-title">{t.appName}</span>
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
        <NavLink to="/admin/products">
          <ProductsIcon />
          {t.navProducts}
        </NavLink>
        <NavLink to="/admin/sales">
          <HistoryIcon />
          {t.navSales}
        </NavLink>
      </nav>
      <div className="admin-nav-user">
        <span>{user?.email}</span>
        <button onClick={signOut}>{t.signOut}</button>
        <NavLink to="/" className="view-site-link">
          {t.viewClientSite}
        </NavLink>
      </div>
    </header>
  );
}
