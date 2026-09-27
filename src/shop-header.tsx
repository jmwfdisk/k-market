import { useEffect, useRef, useState } from 'react';
import { Search, LogIn, ChevronDown, Filter, MessageSquare, X, RotateCcw, ArrowRight } from 'lucide-react';
import Logo from './logo';
import { categories, priceRange, type SearchFilters, type SortOrder } from './catalog-search';

type Panel = 'login' | 'guide' | 'faq' | 'helper' | null;
export default function ShopHeader({ filters, onChange, onSearch }: {
  filters: SearchFilters;
  onChange: (next: SearchFilters) => void;
  onSearch: () => void;
}) {
  const [advanced, setAdvanced] = useState(false);
  const [min, setMin] = useState('');
  const [max, setMax] = useState('');
  const [sort, setSort] = useState<SortOrder>('featured');
  const [error, setError] = useState('');
  const [panel, setPanel] = useState<Panel>(null);
  useEffect(() => {
    setMin(filters.min === null ? '' : (filters.min / 100).toString());
    setMax(filters.max === null ? '' : (filters.max / 100).toString());
    setSort(filters.sort);
    setError('');
  }, [filters.min, filters.max, filters.sort]);
  const dialog = useRef<HTMLDialogElement>(null);
  const customer = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (panel) dialog.current?.showModal();
    else dialog.current?.close();
  }, [panel]);
  const open = (next: Panel) => {
    if (customer.current) customer.current.open = false;
    setPanel(next);
  };
  const toggleAdvanced = () => {
    if (!advanced) {
      setMin(filters.min === null ? '' : (filters.min / 100).toString());
      setMax(filters.max === null ? '' : (filters.max / 100).toString());
      setSort(filters.sort);
      setError('');
    }
    setAdvanced(!advanced);
  };
  const reset = () => {
    setMin(''); setMax(''); setSort('featured'); setError('');
    onChange({ query: '', category: '전체', min: null, max: null, sort: 'featured' });
  };
  const title = panel === 'login' ? '로그인 안내' : panel === 'faq' ? '자주 묻는 질문' : panel === 'helper' ? '쇼핑몰 도우미' : '이용 안내';
  return <>
    <header className="wrap shop-header">
      <div className="shop-top-actions">
        <button className="pill-login" onClick={() => open('login')}><LogIn size={19} /> 로그인</button>
        <details className="customer-dropdown" ref={customer} onKeyDown={(e) => { if (e.key === 'Escape') { e.currentTarget.open = false; e.currentTarget.querySelector('summary')?.focus(); } }}>
          <summary>고객센터 <ChevronDown size={18} /></summary>
          <div className="customer-menu">
            <button onClick={() => open('guide')}>이용 안내</button>
            <button onClick={() => open('faq')}>자주 묻는 질문</button>
            <button onClick={() => open('helper')}>쇼핑몰 도우미</button>
          </div>
        </details>
      </div>
      <div className="shop-search-row">
        <Logo />
        <form className="catalog-search" role="search" onSubmit={(e) => { e.preventDefault(); onSearch(); }}>
          <label className="search-category">
            <span className="sr-only">검색 카테고리</span>
            <select value={filters.category} onChange={(e) => onChange({ ...filters, category: e.target.value })}>
              {categories.map((category) => <option key={category}>{category}</option>)}
            </select>
          </label>
          <input aria-label="상품 검색" placeholder="찾으시는 상품을 입력해 주세요" value={filters.query} onChange={(e) => onChange({ ...filters, query: e.target.value })} />
          <button type="submit" aria-label="검색"><Search size={28} /></button>
        </form>
        <button className={'advanced-toggle' + (advanced ? ' is-active' : '')} aria-expanded={advanced} aria-controls="advanced-search" onClick={toggleAdvanced}><Filter size={28} strokeWidth={1.6} /><span>상세검색</span></button>
        <button className="shop-helper" onClick={() => open('helper')}><span className="helper-icon"><MessageSquare size={25} /><span aria-hidden="true">⌣</span></span><span>쇼핑몰 도우미</span></button>
      </div>
      {advanced && <form id="advanced-search" className="advanced-panel" onSubmit={(e) => {
        e.preventDefault();
        const range = priceRange(min, max);
        setError(range.error);
        if (!range.error) { onChange({ ...filters, min: range.min, max: range.max, sort }); onSearch(); }
      }}>
        <div className="advanced-heading"><strong>상세검색</strong><span>원하는 가격과 정렬 기준으로 상품을 찾아보세요.</span></div>
        <div className="advanced-fields">
          <label>최저 가격 (USD)<input type="number" min="0" step="0.01" inputMode="decimal" placeholder="제한 없음" value={min} onChange={(e) => setMin(e.target.value)} /></label>
          <label>최고 가격 (USD)<input type="number" min="0" step="0.01" inputMode="decimal" placeholder="제한 없음" value={max} onChange={(e) => setMax(e.target.value)} /></label>
          <label>정렬<select value={sort} onChange={(e) => setSort(e.target.value as SortOrder)}><option value="featured">추천순</option><option value="price-low">낮은 가격순</option><option value="price-high">높은 가격순</option></select></label>
          <div className="advanced-buttons"><button type="button" onClick={reset}><RotateCcw size={16} /> 초기화</button><button className="apply-search" type="submit"><Search size={17} /> 검색 적용</button></div>
        </div>
        {error && <p className="search-error" role="alert">{error}</p>}
      </form>}
    </header>
    <dialog className="support-dialog" ref={dialog} aria-labelledby="support-title" onCancel={() => setPanel(null)} onClose={() => setPanel(null)} onClick={(e) => { if (e.target === e.currentTarget) setPanel(null); }}>
      <div className="support-content">
        <div className="support-heading"><h2 id="support-title">{title}</h2><button onClick={() => setPanel(null)} aria-label="닫기"><X /></button></div>
        {panel === 'login' ? <>
          <p>현재 K- Market은 회원가입 없이 상품을 둘러볼 수 있는 소개 사이트입니다.</p>
          <div className="support-note">회원 로그인과 주문·결제 기능은 아직 제공하지 않습니다.</div>
          <button className="support-primary" onClick={() => { setPanel(null); onSearch(); }}>상품 둘러보기 <ArrowRight size={18} /></button>
        </> : panel === 'helper' ? <>
          <p>어떤 도움이 필요하신가요?</p>
          <div className="helper-choices">
            <button onClick={() => { setPanel(null); document.querySelector<HTMLInputElement>('.catalog-search input')?.focus(); }}>상품 검색하기 <Search size={18} /></button>
            <button onClick={() => { reset(); setPanel(null); onSearch(); }}>전체 상품 보기 <ArrowRight size={18} /></button>
            <button onClick={() => setPanel('faq')}>주문·배송 및 가격 안내 <ArrowRight size={18} /></button>
          </div><small>이용 방법을 안내하는 도우미입니다. 실시간 상담은 제공하지 않습니다.</small>
        </> : <>
          <details open><summary>상품은 어떻게 찾나요?</summary><p>검색창에서 카테고리를 선택하고 상품명을 입력하세요. 돋보기나 Enter를 누르면 결과로 이동합니다. 상세검색에서는 가격 범위와 정렬을 지정할 수 있습니다.</p></details>
          <details><summary>주문이나 배송 신청이 가능한가요?</summary><p>현재는 상품 소개만 제공하며 주문·결제·배송 견적은 받지 않습니다. 실제 구매 기능은 아직 준비 중입니다.</p></details>
          <details><summary>가격과 판매 대상 국가는 무엇인가요?</summary><p>태국을 대상으로 소개하며 가격은 미국 달러(USD)로 표시합니다. 상품과 가격은 시연용이며 확정 판매가가 아닙니다.</p></details>
          <details><summary>계정이나 개인정보가 필요한가요?</summary><p>로그인 없이 검색과 상세 소개를 이용할 수 있습니다. 이 사이트에서 비밀번호나 배송지를 입력받지 않습니다.</p></details>
        </>}
      </div>
    </dialog>
  </>;
}
