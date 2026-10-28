import { useEffect, useState } from 'react';
import { adminGetDashboard } from '../../lib/api.js';
import { formatKHR, formatUSD, t } from '../../lib/i18n.js';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    adminGetDashboard().then(setStats).catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="banner banner-error">{error}</div>;
  if (!stats) return <div className="page-loading">{t.loading}</div>;

  return (
    <div className="admin-page dashboard-page">
      <div className="admin-header">
        <div>
          <h1>{t.dashboardTitle}</h1>
          <p className="admin-subtitle">ទិន្នន័យចំណូល ចំនួនភ្ញៀវ និងប្រសិទ្ធភាពការងាររបស់ជាងកាត់សក់</p>
        </div>
      </div>

      {/* Primary KPI Stats */}
      <div className="stat-grid">
        <div className="stat-card stat-highlight">
          <div className="stat-label">💰 {t.todaySalesTotal}</div>
          <div className="stat-value">{formatUSD(stats.today_sales_total)}</div>
          <div className="stat-sub">{formatKHR(stats.today_sales_total)}</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">💈 {t.todaySalesCount}</div>
          <div className="stat-value">{stats.today_sales_count} <small>នាក់/វិក្កយបត្រ</small></div>
          <div className="stat-sub">ភ្ញៀវកាត់សក់ និងទិញផលិតផល</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">🎁 {t.todayTips}</div>
          <div className="stat-value">{formatUSD(stats.today_tips_total)}</div>
          <div className="stat-sub">{formatKHR(stats.today_tips_total)}</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">👤 ជាងកាត់សក់កំពុងបម្រើការ</div>
          <div className="stat-value">{stats.active_barbers_count} <small>នាក់</small></div>
          <div className="stat-sub">ពីសរុប {stats.total_menu_items} សេវា/ផលិតផល</div>
        </div>
      </div>

      {/* Payment Method Breakdown */}
      {stats.payment_breakdown && (
        <div className="panel payment-summary-panel">
          <h3>💳 {t.paymentBreakdown}</h3>
          <div className="payment-summary-chips">
            <div className="pay-chip">
              <span>💵 ប្រាក់ដុល្លារ ($)៖</span>
              <strong>{formatUSD(stats.payment_breakdown.cash_usd || 0)}</strong>
            </div>
            <div className="pay-chip">
              <span>💵 ប្រាក់រៀល (៛)៖</span>
              <strong>{formatUSD(stats.payment_breakdown.cash_khr || 0)}</strong>
              <small>({formatKHR(stats.payment_breakdown.cash_khr || 0)})</small>
            </div>
            <div className="pay-chip">
              <span>📱 ស្កេនទូទាត់ (KHQR)៖</span>
              <strong>{formatUSD(stats.payment_breakdown.aba_khqr || 0)}</strong>
            </div>
            <div className="pay-chip">
              <span>💳 កាតធនាគារ៖</span>
              <strong>{formatUSD(stats.payment_breakdown.card || 0)}</strong>
            </div>
          </div>
        </div>
      )}

      {/* Dashboard Columns */}
      <div className="dashboard-columns">
        {/* Top Services */}
        <div className="panel">
          <h2>✂️ {t.topServices}</h2>
          {stats.top_services_30d.length === 0 ? (
            <p className="empty-hint">{t.topServicesEmpty}</p>
          ) : (
            <ul className="stats-list">
              {stats.top_services_30d.map((s, i) => (
                <li key={i} className="stats-list-item">
                  <div className="item-name-box">
                    <span className="rank-badge">#{i + 1}</span>
                    <span>{s.name}</span>
                  </div>
                  <div className="item-metric-box">
                    <strong>{s.count} ដង</strong>
                    <small>{formatUSD(s.revenue)}</small>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Top Barbers */}
        <div className="panel">
          <h2>💈 {t.topBarbers}</h2>
          {stats.top_barbers_30d.length === 0 ? (
            <p className="empty-hint">{t.topBarbersEmpty}</p>
          ) : (
            <ul className="stats-list">
              {stats.top_barbers_30d.map((b, i) => (
                <li key={i} className="stats-list-item">
                  <div className="item-name-box">
                    <span className="rank-badge rank-gold">#{i + 1}</span>
                    <span>{b.name}</span>
                  </div>
                  <div className="item-metric-box">
                    <strong>{formatUSD(b.revenue)}</strong>
                    <small>{b.servicesCount} សេវា</small>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="dashboard-columns">
        {/* Low Stock Grooming Products */}
        <div className="panel">
          <h2>🧴 {t.lowStock}</h2>
          {stats.low_stock_products.length === 0 ? (
            <p className="empty-hint">{t.lowStockEmpty}</p>
          ) : (
            <ul className="stats-list">
              {stats.low_stock_products.map((p) => (
                <li key={p.id} className="stats-list-item">
                  <span>{p.name}</span>
                  <span className="badge badge-lowstock">សល់តែ {p.stock}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Top Products */}
        <div className="panel">
          <h2>📦 ផលិតផលលក់ដាច់បំផុត (៣០ ថ្ងៃ)</h2>
          {stats.top_products_30d.length === 0 ? (
            <p className="empty-hint">មិនទាន់មានការលក់ផលិតផលទេ</p>
          ) : (
            <ul className="stats-list">
              {stats.top_products_30d.map((p, i) => (
                <li key={i} className="stats-list-item">
                  <span>{p.name}</span>
                  <div className="item-metric-box">
                    <strong>{p.count} កំប៉ុង</strong>
                    <small>{formatUSD(p.revenue)}</small>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
