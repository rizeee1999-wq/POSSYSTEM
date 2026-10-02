import { useEffect, useMemo, useState } from 'react';
import { adminCreateSale, adminGetProducts, getCategories } from '../../lib/api.js';
import { t } from '../../lib/i18n.js';

export default function Sell() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [filterCategoryId, setFilterCategoryId] = useState('');
  const [cart, setCart] = useState([]); // [{ product_id, name, price, quantity, maxStock }]
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [banner, setBanner] = useState(null); // { type: 'success' | 'error', message }
  const [submitting, setSubmitting] = useState(false);

  async function loadProducts() {
    setLoading(true);
    try {
      const [productsData, categoriesData] = await Promise.all([
        adminGetProducts(),
        getCategories(),
      ]);
      setProducts(productsData.filter((p) => p.stock > 0));
      setCategories(categoriesData);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const filteredProducts = products.filter((p) => {
    if (search.trim() && !p.name.toLowerCase().includes(search.trim().toLowerCase())) return false;
    if (filterCategoryId && String(p.category_id) !== filterCategoryId) return false;
    return true;
  });

  useEffect(() => {
    loadProducts();
  }, []);

  function addToCart(product) {
    setCart((prev) => {
      const existing = prev.find((line) => line.product_id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return prev;
        return prev.map((line) =>
          line.product_id === product.id ? { ...line, quantity: line.quantity + 1 } : line
        );
      }
      return [
        ...prev,
        {
          product_id: product.id,
          name: product.name,
          price: Number(product.price),
          quantity: 1,
          maxStock: product.stock,
        },
      ];
    });
  }

  function setQuantity(productId, quantity) {
    setCart((prev) =>
      prev.map((line) =>
        line.product_id === productId
          ? { ...line, quantity: Math.max(1, Math.min(quantity, line.maxStock)) }
          : line
      )
    );
  }

  function removeLine(productId) {
    setCart((prev) => prev.filter((line) => line.product_id !== productId));
  }

  const grandTotal = useMemo(
    () => cart.reduce((sum, line) => sum + line.price * line.quantity, 0),
    [cart]
  );

  async function handleCheckout() {
    setSubmitting(true);
    setBanner(null);
    try {
      await adminCreateSale(
        cart.map((line) => ({ product_id: line.product_id, quantity: line.quantity }))
      );
      setBanner({ type: 'success', message: t.saleComplete });
      setCart([]);
      await loadProducts();
    } catch (e) {
      setBanner({ type: 'error', message: `${t.saleFailed}: ${e.message}` });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="sell-page">
      <h1>{t.sellTitle}</h1>

      {banner && <div className={`banner ${banner.type}`}>{banner.message}</div>}
      {error && <div className="banner error">{error}</div>}

      {!loading && products.length > 0 && (
        <div className="catalog-controls">
          <input
            type="text"
            placeholder={t.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select value={filterCategoryId} onChange={(e) => setFilterCategoryId(e.target.value)}>
            <option value="">{t.allCategories}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="sell-layout">
        <div className="sell-products-col">
          {loading ? (
            <div className="page-loading">{t.loading}</div>
          ) : filteredProducts.length === 0 ? (
            <div className="empty-state">{t.noSellResults}</div>
          ) : (
            <div className="sell-product-grid">
              {filteredProducts.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="sell-product-card"
                  onClick={() => addToCart(p)}
                  disabled={p.stock === 0}
                >
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} className="sell-product-image" />
                  ) : (
                    <div className="sell-product-image-placeholder">{t.appName}</div>
                  )}
                  <div className="sell-product-info">
                    <span className="name">{p.name}</span>
                    <span className="meta">${Number(p.price).toFixed(2)}</span>
                    <span className="meta">
                      {t.stock}: {p.stock}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="cart-panel">
          <h2>{t.cart}</h2>

          {cart.length === 0 ? (
            <p>{t.cartEmpty}</p>
          ) : (
            <>
              <div className="cart-lines">
                {cart.map((line) => (
                  <div className="cart-line" key={line.product_id}>
                    <span className="cart-line-name">{line.name}</span>
                    <input
                      type="number"
                      min="1"
                      max={line.maxStock}
                      value={line.quantity}
                      onChange={(e) => setQuantity(line.product_id, Number(e.target.value))}
                    />
                    <span className="cart-line-price">${(line.price * line.quantity).toFixed(2)}</span>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => removeLine(line.product_id)}
                    >
                      {t.remove}
                    </button>
                  </div>
                ))}
              </div>

              <div className="cart-total">
                <span>{t.grandTotal}</span>
                <span>${grandTotal.toFixed(2)}</span>
              </div>

              <button
                className="btn"
                style={{ width: '100%' }}
                onClick={handleCheckout}
                disabled={submitting}
              >
                {submitting ? t.processing : t.completeSale}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
