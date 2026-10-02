import { useEffect, useState } from 'react';
import { adminGetDashboard } from '../../lib/api.js';
import { t } from '../../lib/i18n.js';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    adminGetDashboard().then(setStats).catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="empty-state">{error}</div>;
  if (!stats) return <div className="page-loading">{t.loading}</div>;

  return (
    <div>
      <h1>{t.dashboardTitle}</h1>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">{t.todaySalesTotal}</div>
          <div className="stat-value">${stats.today_sales_total.toFixed(2)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{t.todaySalesCount}</div>
          <div className="stat-value">{stats.today_sales_count}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{t.totalProducts}</div>
          <div className="stat-value">{stats.total_products ?? '—'}</div>
        </div>
      </div>

      <div className="dashboard-columns">
        <div className="panel">
          <h2>{t.lowStock}</h2>
          {stats.low_stock_products.length === 0 ? (
            <p>{t.lowStockEmpty}</p>
          ) : (
            <ul>
              {stats.low_stock_products.map((p) => (
                <li key={p.id}>
                  <span>{p.name}</span>
                  <span className="low-stock-value">{p.stock}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="panel">
          <h2>{t.topProducts}</h2>
          {stats.top_products_30d.length === 0 ? (
            <p>{t.topProductsEmpty}</p>
          ) : (
            <ul>
              {stats.top_products_30d.map((p, i) => (
                <li key={i}>
                  <span>{p.name}</span>
                  <span>
                    {p.quantity} {t.units}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
