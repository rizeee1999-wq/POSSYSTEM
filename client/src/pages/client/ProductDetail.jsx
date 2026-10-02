import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getProduct, getProducts } from '../../lib/api.js';
import { t } from '../../lib/i18n.js';

export default function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [relatedPage, setRelatedPage] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const pageSize = 4;
  const totalRelatedPages = Math.max(1, Math.ceil(relatedProducts.length / pageSize));
  const visibleRelatedProducts = relatedProducts.slice(
    (relatedPage - 1) * pageSize,
    relatedPage * pageSize,
  );

  useEffect(() => {
    setLoading(true);
    setError('');
    setRelatedPage(1);

    Promise.all([getProduct(id), getProducts()])
      .then(([productData, allProducts]) => {
        setProduct(productData);
        setRelatedProducts(allProducts.filter((p) => String(p.id) !== String(id)));
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="page-loading">{t.loading}</div>;

  if (error || !product) {
    return (
      <div className="product-detail-page">
        <Link to="/">{t.backToCatalog}</Link>
        <div className="empty-state">{t.productNotFound}</div>
      </div>
    );
  }

  return (
    <div className="product-detail-page">
      <Link to="/">{t.backToCatalog}</Link>

      {product.image_url ? (
        <img src={product.image_url} alt={product.name} />
      ) : (
        <div className="product-image-placeholder">{t.appName}</div>
      )}

      {product.categories?.name && (
        <span className="product-category-tag">{product.categories.name}</span>
      )}

      <h1>{product.name}</h1>
      <p className="product-price">${Number(product.price).toFixed(2)}</p>
      <p className={`stock-badge ${product.stock > 0 ? 'in' : 'out'}`}>
        {product.stock > 0 ? t.inStock : t.outOfStock}
      </p>

      {product.description && (
        <>
          <h3>{t.description}</h3>
          <p>{product.description}</p>
        </>
      )}

      {relatedProducts.length > 0 && (
        <div className="related-products">
          <h3>{t.relatedProducts}</h3>
          <div className="product-grid related-products-grid">
            {visibleRelatedProducts.map((p) => (
              <Link to={`/product/${p.id}`} key={p.id} className="product-card related-product-card">
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

          {totalRelatedPages > 1 && (
            <div className="related-pagination" aria-label="Related product pages">
              {Array.from({ length: totalRelatedPages }, (_, index) => index + 1).map((page) => (
                <button
                  key={page}
                  type="button"
                  className={`page-number ${relatedPage === page ? 'active' : ''}`}
                  onClick={() => setRelatedPage(page)}
                >
                  {page}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
