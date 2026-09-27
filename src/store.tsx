import { searchCatalog, type SearchFilters } from './catalog-search';
import {
  Search,
  ArrowUpRight,
  ArrowRight,
  PackageCheck,
  Truck,
  ShieldCheck,
} from 'lucide-react';
import { products, photo, money, type Product } from './catalog';
export default function Store({ catalog, filters, setFilters }: {
  catalog: Product[];
  filters: SearchFilters;
  setFilters: (filters: SearchFilters) => void;
}) {
  const { query, category } = filters;
  const setCategory = (next: string) => setFilters({ ...filters, category: next });
  const filtered = searchCatalog(catalog, filters);
  return (
    <>
      <main className="wrap">
        <p className="preview-note">K-MARKET 미리보기 · 상품 소개 사이트입니다. 주문 및 결제는 지원하지 않습니다.</p>
        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow">THE EVERYDAY EDIT · 01</span>
            <h1>
              일상에 더하는
              <br />
              한국의 좋은 취향.
            </h1>
            <p>
              가볍게 드는 가방부터 매일 쓰는 작은 물건까지.
              <br />
              지금, 나의 새로운 일상을 발견하세요.
            </p>
            <a href="#collection" className="hero-link">
              컬렉션 둘러보기 <ArrowUpRight size={20} />
            </a>
          </div>
          <div className="hero-image">
            <img src={photo(products[0])} alt="일상 속 코튼 토트백" />
            <span className="image-caption">
              LESS, BUT BETTER.
              <br />
              <b>Everyday essentials</b>
            </span>
          </div>
          <span className="hero-index">
            01 <span>/ 01</span>
          </span>
        </section>
        <div className="benefits">
          <span>
            <PackageCheck />
            한국에서 찾은 셀렉션
          </span>
          <span>
            <Truck />
            일상을 위한 상품 모음
          </span>
          <span>
            <ShieldCheck />
            상품 소개 미리보기
          </span>
        </div>
        <section id="collection" className="collection">
          <div className="section-heading">
            <div>
              <span className="eyebrow">DISCOVER YOUR EVERYDAY</span>
              <h2>
                {query
                  ? `“${query}” 검색 결과`
                  : category === '전체'
                    ? '지금 눈여겨볼 상품'
                    : category + ' 셀렉션'}
              </h2>
            </div>
            <span role="status" aria-live="polite">{filtered.length}개의 상품</span>
          </div>
          <div className="products">
            {filtered.map((p) => (
              <article className="product" key={p.id}>
                <a href={'#product/' + p.id} className="product-photo">
                  <img src={photo(p)} alt={p.name} />
                  <span>{p.tag}</span>
                  <i>
                    <ArrowUpRight size={20} />
                  </i>
                </a>
                <p className="product-category">
                  {p.category} <span> / K-MARKET SELECT</span>
                </p>
                <a href={'#product/' + p.id}>
                  <h3>{p.name}</h3>
                </a>
                <div className="prices">
                  <strong>{money(p.price)}</strong>
                  {p.old > p.price && (
                    <>
                      <del>{money(p.old)}</del>
                      <b>{Math.round((1 - p.price / p.old) * 100)}%</b>
                    </>
                  )}
                </div>
                <p className="shipping">
                  {p.stock === 0
                    ? '품절'
                    : p.seller
                      ? `${p.seller} · 배송비 별도`
                      : '예시 가격 · 판매 준비 중'}
                </p>
              </article>
            ))}
          </div>
          {!filtered.length && (
            <div className="empty">
              <Search />
              <h3>검색 결과가 없습니다</h3>
              <p>다른 검색어 또는 카테고리를 선택해 주세요.</p>
              <button
                onClick={() => {
                  setFilters({ query: '', category: '전체', min: null, max: null, sort: 'featured' });
                }}
              >
                전체 상품 보기
              </button>
            </div>
          )}
        </section>
        <section className="editorial">
          <div>
            <span className="eyebrow">SMALL THINGS, GOOD DAYS</span>
            <h2>
              매일 쓰는 물건이
              <br />
              일상의 분위기를 바꾸니까.
            </h2>
            <button
              onClick={() => {
                setCategory('리빙');
                document
                  .getElementById('collection')
                  ?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              리빙 셀렉션 보기 <ArrowRight size={18} />
            </button>
          </div>
          <img src={photo(products[2])} alt="화이트 세라믹 머그" />
        </section>
      </main>

    </>
  );
}
