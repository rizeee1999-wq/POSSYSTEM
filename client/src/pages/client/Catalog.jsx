import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCategories, getProducts } from '../../lib/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { t } from '../../lib/i18n.js';

function TelegramIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
      <path d="M21.9 3.6c.3-1.1-.7-2-1.7-1.6L2.4 9.3c-1.2.5-1.2 2.2.1 2.6l4.5 1.4 1.7 5.5c.3.9 1.5 1.1 2.1.3l2.5-3.1 4.6 3.4c.9.7 2.2.2 2.4-.9l3.6-14.9Zm-4.6 3.6L9.9 13.5c-.2.2-.3.5-.3.8l-.2 2.6-1.2-4 9.6-6.3c.2-.1.4.1.3.3Z" />
    </svg>
  );
}

export default function Catalog() {
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [categoryId, setCategoryId] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getCategories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    setError('');
    getProducts(categoryId || undefined)
      .then(setProducts)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [categoryId]);

  const filtered = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.trim().toLowerCase();
    return products.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, search]);

  return (
    <div>
      <div className="catalog-sticky-header">
        <header className="site-header">
          {user ? (
            <Link to="/admin" className="admin-login-link">
              {t.goToManagement}
            </Link>
          ) : (
            <a
              href="https://t.me/ftsomrach"
              target="_blank"
              rel="noopener noreferrer"
              className="admin-login-link"
            >
              <TelegramIcon />
              {t.telegramContact}
            </a>
          )}
          <h1>{t.catalogTitle}</h1>
          <p>{t.catalogSubtitle}</p>
        </header>

        <div className="catalog-controls">
          <input
            type="text"
            placeholder={t.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">{t.allCategories}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && <div className="page-loading">{t.loading}</div>}
      {error && <div className="empty-state">{error}</div>}

      {!loading && !error && filtered.length === 0 && (
        <div className="empty-state">{t.noProducts}</div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="product-grid">
          {filtered.map((p) => (
            <Link to={`/product/${p.id}`} key={p.id} className="product-card">
              {p.image_url ? (
                <img src={p.image_url} alt={p.name} />
              ) : (
                <div className="product-image-placeholder">{t.appName}</div>
              )}
              <div className="product-card-body">
                {p.categories?.name && (
                  <span className="product-category-tag">{p.categories.name}</span>
                )}
                <h3>{p.name}</h3>
                <span className="product-price">${Number(p.price).toFixed(2)}</span>
                <span className={`stock-badge ${p.stock > 0 ? 'in' : 'out'}`}>
                  {p.stock > 0 ? t.inStock : t.outOfStock}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
