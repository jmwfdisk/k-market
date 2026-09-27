import { useState } from 'react';
import {
  Search,
  ArrowUpRight,
  ArrowRight,
  Menu,
  Globe2,
  PackageCheck,
  Truck,
  ShieldCheck,
} from 'lucide-react';
import { products, photo, money, type Product } from './catalog';
export default function Store({ catalog }: { catalog: Product[] }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('전체');
  const filtered = catalog.filter(
    (p) =>
      (category === '전체' || p.category === category) &&
      (p.name + ' ' + p.en).toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <div className="utility">
        <div className="wrap">
          <span>한국의 좋은 일상, 더 가까이.</span>
          <div>
            <a href="#about">컬렉션 안내</a>
            <span>
              <Globe2 size={13} /> Thailand · USD
            </span>
          </div>
        </div>
      </div>
      <header className="wrap main-header">
        <a className="logo" href="./">
          K-<span>MARKET</span>
          <i />
        </a>
        <form className="search" onSubmit={(e) => e.preventDefault()}>
          <input
            aria-label="상품 검색"
            placeholder="어떤 한국 상품을 찾으세요?"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button aria-label="검색">
            <Search size={22} />
          </button>
        </form>
        <div className="header-actions"><a href="#collection">상품 둘러보기 <ArrowUpRight /></a></div>
      </header>
      <nav className="nav wrap" aria-label="상품 카테고리">
        {['전체', '패션', '뷰티', '리빙', '문구', '디지털'].map((n, i) => (
          <button
            className={category === n ? 'active' : ''}
            onClick={() => setCategory(n)}
            key={n}
          >
            {i === 0 && <Menu size={18} />} {n === '전체' ? '전체 카테고리' : n}
          </button>
        ))}
        <span className="nav-note">CURATED IN KOREA</span>
      </nav>
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
            <span>{filtered.length}개의 상품</span>
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
                  setQuery('');
                  setCategory('전체');
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
      <footer>
        <div className="wrap">
          <a href="./" className="logo">
            K-<span>MARKET</span>
            <i />
          </a>
          <p>한국의 좋은 상품을 세계의 일상으로.</p>
          <div className="footer-links" id="about">
            <a href="#collection">전체 컬렉션</a>
          </div>
          <div className="footnote">
            오픈 준비 중 · 상품과 가격은 시연용입니다. 현재는 상품 소개만 제공하며 주문·결제는 받지 않습니다.
            <br />
            Illustrative photography: Unsplash · © 2026 K-MARKET
          </div>
        </div>
      </footer>
    </>
  );
}
