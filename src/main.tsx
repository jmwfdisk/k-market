import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import Store from './store';
import { products, photo, money } from './catalog';
import './style.css';

function App() {
  const [hash, setHash] = useState(location.hash);
  useEffect(() => {
    const change = () => setHash(location.hash);
    addEventListener('hashchange', change);
    return () => removeEventListener('hashchange', change);
  }, []);
  const detail = hash.startsWith('#product/');
  const product = detail ? products.find((p) => hash === '#product/' + p.id) : undefined;
  useEffect(() => {
    document.title = product ? `${product.name} | K-MARKET` : 'K-MARKET | 한국의 좋은 일상';
    if (detail) {
      scrollTo(0, 0);
      document.querySelector<HTMLElement>('h1')?.focus();
    } else if (hash) {
      document.getElementById(hash.slice(1))?.scrollIntoView();
    }
  }, [hash, product, detail]);
  if (!detail) return <Store catalog={products} />;
  return <main className="wrap static-detail">
    <a href="#collection">← 컬렉션으로 돌아가기</a>
    {product ? <div className="detail-grid">
      <img className="detail-photo" src={photo(product)} alt={product.name} />
      <div className="detail-info">
        <span className="eyebrow">{product.category} / K-MARKET SELECT</span>
        <h1 tabIndex={-1}>{product.name}</h1>
        <p>{product.en}</p>
        <strong className="detail-price">{money(product.price)}</strong>
        <p>{product.description}</p>
        <p>구성 · {product.options.join(', ')}</p>
        <p className="preview-note">상품과 가격은 시연용입니다. 현재 주문·배송 견적·결제는 제공하지 않습니다.</p>
        <a className="hero-link" href="#collection">다른 상품 둘러보기 →</a>
      </div>
    </div> : <div className="empty"><h1 tabIndex={-1}>상품을 찾을 수 없습니다</h1><p>컬렉션에서 다른 상품을 확인해주세요.</p></div>}
  </main>;
}
createRoot(document.getElementById('root')!).render(<App />);
