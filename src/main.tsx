import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import Store from './store';
import SiteLayout from './site-layout';
import type { SearchFilters } from './catalog-search';
import { products, photo, money } from './catalog';
import { Checkout, PaymentResult, TestOrders } from './checkout';
import { capturePaymentReturn } from './checkout-api';
import './style.css';

capturePaymentReturn();

function App() {
  const [hash, setHash] = useState(location.hash);
  const [filters, setFilters] = useState<SearchFilters>({ query: '', category: '전체', min: null, max: null, sort: 'featured' });
  useEffect(() => {
    const change = () => setHash(location.hash);
    addEventListener('hashchange', change);
    return () => removeEventListener('hashchange', change);
  }, []);
  const detail = hash.startsWith('#product/');
  const checkout = hash.startsWith('#checkout/');
  const paymentResult = hash === '#payment-result';
  const testOrders = hash === '#test-orders';
  const product = detail ? products.find((p) => hash === '#product/' + p.id) : undefined;
  useEffect(() => {
    document.title = checkout || paymentResult || testOrders ? '테스트 주문·결제 | K-MARKET' : product ? `${product.name} | K-MARKET` : 'K-MARKET | 한국의 좋은 일상';
    if (detail || checkout || paymentResult || testOrders) {
      scrollTo(0, 0);
      document.querySelector<HTMLElement>('h1')?.focus();
    } else if (hash) {
      document.getElementById(hash.slice(1))?.scrollIntoView();
    }
  }, [hash, product, detail, checkout, paymentResult, testOrders]);
  const showResults = () => {
    if (location.hash !== '#collection') location.hash = 'collection';
    else document.getElementById('collection')?.scrollIntoView({ behavior: 'smooth' });
  };
  return <SiteLayout filters={filters} onChange={setFilters} onSearch={showResults}>
    {checkout ? <Checkout key={hash} product={products.find((item) => hash === `#checkout/${item.id}`)} />
      : paymentResult ? <PaymentResult /> : testOrders ? <TestOrders />
      : !detail ? <Store catalog={products} filters={filters} setFilters={setFilters} /> : <main className="wrap static-detail">
    {product ? <div className="detail-grid">
      <img className="detail-photo" src={photo(product)} alt={product.name} />
      <div className="detail-info">
        <span className="eyebrow">{product.category} / K-MARKET SELECT</span>
        <h1 tabIndex={-1}>{product.name}</h1>
        <p>{product.en}</p>
        <strong className="detail-price">{money(product.price)}</strong>
        <p>{product.description}</p>
        <p>구성 · {product.options.join(', ')}</p>
        <p className="preview-note">상품과 가격은 시연용입니다. 실제 구매·배송은 제공하지 않으며 아래에서 테스트 주문서를 확인할 수 있습니다.</p>
        <a className="checkout-primary checkout-entry" href={`#checkout/${product.id}`}>Toss 테스트 주문서 보기</a>
        <a className="hero-link" href="#collection">다른 상품 둘러보기 →</a>
      </div>
    </div> : <div className="empty"><h1 tabIndex={-1}>상품을 찾을 수 없습니다</h1><p>컬렉션에서 다른 상품을 확인해주세요.</p></div>}
  </main>}
  </SiteLayout>;
}
createRoot(document.getElementById('root')!).render(<App />);
