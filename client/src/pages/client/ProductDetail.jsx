import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getProduct, getProducts } from '../../lib/api.js';
import { formatDualPrice, formatKHR, formatUSD, t } from '../../lib/i18n.js';

export default function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setError('');

    Promise.all([getProduct(id), getProducts()])
      .then(([productData, allProducts]) => {
        setProduct(productData);
        setRelatedProducts(allProducts.filter((p) => String(p.id) !== String(id)).slice(0, 4));
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="page-loading">{t.loading}</div>;

  if (error || !product) {
    return (
      <div className="product-detail-page">
        <div className="product-detail-header">
          <Link to="/" className="btn btn-secondary product-detail-back">
            {t.backToCatalog}
          </Link>
        </div>
        <div className="empty-state">{t.productNotFound}</div>
      </div>
    );
  }

  const isService = product.item_type === 'service';
  const telegramMessage = [
    isService ? '💈 ខ្ញុំចង់កក់សេវាកាត់សក់នេះ៖' : '🧴 ខ្ញុំចង់ទិញផលិតផលនេះ៖',
    product.name,
    `តម្លៃ៖ ${formatDualPrice(product.price)}`,
    isService ? `រយៈពេល៖ ${product.duration_min} នាទី` : '',
    new URL(`/product/${product.id}`, window.location.origin).toString(),
  ].filter(Boolean).join('\n');

  const telegramUrl = `https://t.me/ftsomrazh?text=${encodeURIComponent(telegramMessage)}`;

  return (
    <div className="product-detail-page salon-detail-page">
      <div className="product-detail-header">
        <Link to="/" className="btn btn-outline product-detail-back">
          {t.backToCatalog}
        </Link>
        <a
          href={telegramUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-telegram-book"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M21.9 3.6c.3-1.1-.7-2-1.7-1.6L2.4 9.3c-1.2.5-1.2 2.2.1 2.6l4.5 1.4 1.7 5.5c.3.9 1.5 1.1 2.1.3l2.5-3.1 4.6 3.4c.9.7 2.2.2 2.4-.9l3.6-14.9Zm-4.6 3.6L9.9 13.5c-.2.2-.3.5-.3.8l-.2 2.6-1.2-4 9.6-6.3c.2-.1.4.1.3.3Z" />
          </svg>
          {isService ? 'កក់ម៉ោងកាត់សក់តាមតេឡេក្រាម' : t.telegramContact}
        </a>
      </div>

      <div className="detail-hero-card">
        <div className="product-detail-media">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} />
          ) : (
            <div className="product-image-placeholder">
              {isService ? '💈' : '🧴'}
            </div>
          )}
        </div>

        <div className="detail-content-side">
          <div className="detail-tags">
            {product.categories?.name && (
              <span className="badge badge-category">{product.categories.name}</span>
            )}
            <span className={`badge ${isService ? 'badge-service' : 'badge-product'}`}>
              {isService ? '✂️ សេវាកម្មកាត់សក់' : '🧴 ផលិតផលថែរក្សាសក់'}
            </span>
          </div>

          <h1>{product.name}</h1>

          <div className="detail-price-box">
            <span className="price-usd">{formatUSD(product.price)}</span>
            <span className="price-khr">({formatKHR(product.price)})</span>
          </div>

          <div className="detail-meta-pills">
            {isService ? (
              <span className="badge badge-duration">⏱️ រយៈពេលសេវាកម្ម៖ {product.duration_min} នាទី</span>
            ) : (
              <span className={`badge ${product.stock > 0 ? 'badge-instock' : 'badge-outstock'}`}>
                {product.stock > 0 ? `📦 មានក្នុងស្តុក (${product.stock} ដប/កំប៉ុង)` : t.outOfStock}
              </span>
            )}
          </div>

          {product.description && (
            <div className="detail-description">
              <h3>{t.description}</h3>
              <p>{product.description}</p>
            </div>
          )}

          <div className="detail-action-box">
            <a
              href={telegramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary btn-large"
            >
              💬 {isService ? 'កក់សេវាកម្មនេះភ្លាមៗ' : 'ទាក់ទងទិញតាមតេឡេក្រាម'}
            </a>
          </div>
        </div>
      </div>

      {/* Related items */}
      {relatedProducts.length > 0 && (
        <div className="related-section">
          <h3>{t.relatedProducts}</h3>
          <div className="salon-card-grid">
            {relatedProducts.map((p) => (
              <Link to={`/product/${p.id}`} key={p.id} className="salon-card">
                <div className="salon-card-media">
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} />
                  ) : (
                    <div className="salon-card-placeholder">
                      {p.item_type === 'service' ? '💈' : '🧴'}
                    </div>
                  )}
                  {p.item_type === 'service' && (
                    <span className="duration-tag">⏱️ {p.duration_min} នាទី</span>
                  )}
                </div>
                <div className="salon-card-body">
                  <h4>{p.name}</h4>
                  <div className="card-price-row">
                    <span className="price-usd">{formatUSD(p.price)}</span>
                    <span className="price-khr">{formatKHR(p.price)}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
