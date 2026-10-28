import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getBarbers, getCategories, getProducts } from '../../lib/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { formatKHR, formatUSD, t } from '../../lib/i18n.js';

function TelegramIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
      <path d="M21.9 3.6c.3-1.1-.7-2-1.7-1.6L2.4 9.3c-1.2.5-1.2 2.2.1 2.6l4.5 1.4 1.7 5.5c.3.9 1.5 1.1 2.1.3l2.5-3.1 4.6 3.4c.9.7 2.2.2 2.4-.9l3.6-14.9Zm-4.6 3.6L9.9 13.5c-.2.2-.3.5-.3.8l-.2 2.6-1.2-4 9.6-6.3c.2-.1.4.1.3.3Z" />
    </svg>
  );
}

function ScissorIcon() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="6" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <line x1="20" y1="4" x2="8.5" y2="14.5" />
      <line x1="8.5" y1="9.5" x2="20" y2="20" />
    </svg>
  );
}

export default function Catalog() {
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [barbers, setBarbers] = useState([]);
  const [categoryId, setCategoryId] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'service' | 'product'
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([getCategories(), getBarbers()])
      .then(([cats, bList]) => {
        setCategories(cats || []);
        setBarbers(bList || []);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    setError('');
    getProducts(categoryId || undefined)
      .then((data) => setProducts(data || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [categoryId]);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (typeFilter !== 'all' && p.item_type !== typeFilter) return false;
      if (search.trim() && !p.name.toLowerCase().includes(search.trim().toLowerCase())) return false;
      return true;
    });
  }, [products, typeFilter, search]);

  const servicesList = filtered.filter((p) => p.item_type === 'service');
  const productsList = filtered.filter((p) => p.item_type === 'product');

  return (
    <div className="client-salon-page">
      {/* Top sticky navigation */}
      <div className="catalog-sticky-header">
        <header className="site-header salon-site-header">
          <div className="header-brand-line">
            <div className="salon-logo-group">
              <ScissorIcon />
              <div>
                <h1 className="salon-brand-title">{t.appName}</h1>
                <p className="salon-brand-subtitle">{t.appSubtitle}</p>
              </div>
            </div>

            <div className="header-actions-group">
              {user ? (
                <Link to="/admin" className="admin-login-link">
                  ⚙️ {t.goToManagement}
                </Link>
              ) : (
                <Link to="/admin/login" className="admin-login-link link-subtle">
                  🔒 {t.adminLoginLink}
                </Link>
              )}
              <a
                href="https://t.me/ftsomrach"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-telegram-book"
              >
                <TelegramIcon />
                {t.telegramContact}
              </a>
            </div>
          </div>
        </header>

        {/* Search & Category Filter */}
        <div className="catalog-controls salon-controls">
          <div className="salon-type-pills">
            <button
              className={`type-pill ${typeFilter === 'all' ? 'active' : ''}`}
              onClick={() => setTypeFilter('all')}
            >
              ទាំងអស់ ({filtered.length})
            </button>
            <button
              className={`type-pill ${typeFilter === 'service' ? 'active' : ''}`}
              onClick={() => setTypeFilter('service')}
            >
              ✂️ សេវាកម្មកាត់សក់
            </button>
            <button
              className={`type-pill ${typeFilter === 'product' ? 'active' : ''}`}
              onClick={() => setTypeFilter('product')}
            >
              🧴 ផលិតផលថែរក្សាសក់
            </button>
          </div>

          <div className="salon-search-row">
            <input
              type="text"
              placeholder={t.searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">{t.allCategories}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Content Showcase */}
      <main className="salon-main-content">
        {loading && <div className="page-loading">{t.loading}</div>}
        {error && <div className="banner banner-error">{error}</div>}

        {!loading && !error && filtered.length === 0 && (
          <div className="empty-state">{t.noProducts}</div>
        )}

        {/* 1. Services Section */}
        {!loading && !error && servicesList.length > 0 && (
          <section className="salon-section">
            <div className="section-title-box">
              <h2>✂️ សេវាកម្មកាត់សក់ & ស្ប៉ាបុរស</h2>
              <p>ជ្រើសរើសម៉ូតសក់ដែលស័ក្តិសមនឹងទម្រង់មុខរបស់អ្នក</p>
            </div>

            <div className="salon-card-grid">
              {servicesList.map((s) => (
                <Link to={`/product/${s.id}`} key={s.id} className="salon-card salon-card-service">
                  <div className="salon-card-media">
                    {s.image_url ? (
                      <img src={s.image_url} alt={s.name} />
                    ) : (
                      <div className="salon-card-placeholder">
                        <span>💈</span>
                      </div>
                    )}
                    <span className="duration-tag">⏱️ {s.duration_min} នាទី</span>
                  </div>

                  <div className="salon-card-body">
                    <span className="card-cat-name">{s.categories?.name}</span>
                    <h3>{s.name}</h3>
                    {s.description && (
                      <p className="card-desc">{s.description}</p>
                    )}
                    <div className="card-price-row">
                      <div className="price-box">
                        <span className="price-usd">{formatUSD(s.price)}</span>
                        <span className="price-khr">{formatKHR(s.price)}</span>
                      </div>
                      <span className="btn-card-action">កក់សេវា ➔</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* 2. Retail Products Section */}
        {!loading && !error && productsList.length > 0 && (
          <section className="salon-section">
            <div className="section-title-box">
              <h2>🧴 ផលិតផលសិតសក់ & ថែទាំគុណភាពខ្ពស់</h2>
              <p>ក្រមួនសិតសក់ ប្រេងបន្ទន់ពុកមាត់ និងសាប៊ូកក់សក់ប្រណិត</p>
            </div>

            <div className="salon-card-grid">
              {productsList.map((p) => (
                <Link to={`/product/${p.id}`} key={p.id} className="salon-card salon-card-product">
                  <div className="salon-card-media">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} />
                    ) : (
                      <div className="salon-card-placeholder">
                        <span>🧴</span>
                      </div>
                    )}
                    <span className={`stock-tag ${p.stock > 0 ? 'stock-in' : 'stock-out'}`}>
                      {p.stock > 0 ? `មានស្តុក (${p.stock})` : t.outOfStock}
                    </span>
                  </div>

                  <div className="salon-card-body">
                    <span className="card-cat-name">{p.categories?.name}</span>
                    <h3>{p.name}</h3>
                    {p.description && (
                      <p className="card-desc">{p.description}</p>
                    )}
                    <div className="card-price-row">
                      <div className="price-box">
                        <span className="price-usd">{formatUSD(p.price)}</span>
                        <span className="price-khr">{formatKHR(p.price)}</span>
                      </div>
                      <span className="btn-card-action">មើលលម្អិត ➔</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* 3. Barbers & Stylists Meet the Team Section */}
        {barbers.length > 0 && (
          <section className="salon-section barbers-showcase-section">
            <div className="section-title-box">
              <h2>💈 ជាងកាត់សក់ជំនាញប្រចាំហាង</h2>
              <p>ក្រុមការងារប្រកបដោយវិជ្ជាជីវៈ និងបទពិសោធន៍ជាច្រើនឆ្នាំ</p>
            </div>

            <div className="barbers-public-grid">
              {barbers.map((b) => (
                <div key={b.id} className="barber-showcase-card">
                  <div className="barber-showcase-avatar">
                    {b.avatar_url ? (
                      <img src={b.avatar_url} alt={b.name} />
                    ) : (
                      <span>✂️</span>
                    )}
                  </div>
                  <h3>{b.name}</h3>
                  <span className="barber-role-tag">{b.nickname || b.role}</span>
                  {b.phone && <small className="barber-phone">📞 {b.phone}</small>}
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="salon-footer">
        <p>💈 <strong>{t.appName}</strong> — {t.appSubtitle}</p>
        <p>📍 ភ្នំពេញ, ប្រទេសកម្ពុជា | ម៉ោងបើក៖ ៨:០០ ព្រឹក - ៨:០០ យប់ (ច័ន្ទ - អាទិត្យ)</p>
      </footer>
    </div>
  );
}
