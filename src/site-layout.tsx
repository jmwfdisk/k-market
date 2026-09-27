import type { ReactNode } from 'react';
import { Globe2, Menu } from 'lucide-react';
import Logo from './logo';
import ShopHeader from './shop-header';
import { categories, type SearchFilters } from './catalog-search';

export default function SiteLayout({ children, filters, onChange, onSearch }: {
  children: ReactNode;
  filters: SearchFilters;
  onChange: (filters: SearchFilters) => void;
  onSearch: () => void;
}) {
  return <>
    <div className="utility">
      <div className="wrap">
        <span>한국의 좋은 일상, 더 가까이.</span>
        <div>
          <a href="#about">컬렉션 안내</a>
          <span><Globe2 size={13} /> Thailand · USD</span>
        </div>
      </div>
    </div>
    <ShopHeader filters={filters} onChange={onChange} onSearch={onSearch} />
    <nav className="nav wrap" aria-label="상품 카테고리">
      {categories.map((category, index) => <button
        key={category}
        className={filters.category === category ? 'active' : ''}
        aria-pressed={filters.category === category}
        onClick={() => { onChange({ ...filters, category }); onSearch(); }}
      >{index === 0 && <Menu size={18} />} {category === '전체' ? '전체 카테고리' : category}</button>)}
      <span className="nav-note">CURATED IN KOREA</span>
    </nav>
    {children}
      <footer>
        <div className="wrap">
          <Logo />
          <p>한국의 좋은 상품을 세계의 일상으로.</p>
          <div className="footer-links" id="about">
            <a href="#collection">전체 컬렉션</a>
          </div>
          <div className="footnote">
            오픈 준비 중 · 상품과 가격은 시연용입니다. 현재는 상품 소개만 제공하며 주문·결제는 받지 않습니다.
            <br />
            Illustrative photography : Unsplash · © 2026 K-MARKET
          </div>
        </div>
      </footer>
  </>;
}
