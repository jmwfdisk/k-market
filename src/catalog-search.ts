import type { Product } from './catalog';

export const categories = ['전체', '패션', '뷰티', '리빙', '문구', '디지털'];
export type SortOrder = 'featured' | 'price-low' | 'price-high';
export type SearchFilters = {
  query: string;
  category: string;
  min: number | null;
  max: number | null;
  sort: SortOrder;
};
export function priceRange(min: string, max: string) {
  const parse = (value: string) => value.trim() === '' ? null : Math.round(Number(value) * 100);
  const low = parse(min);
  const high = parse(max);
  if ([low, high].some((n) => n !== null && (!Number.isSafeInteger(n) || n < 0))) {
    return { error: '가격은 0 이상의 숫자로 입력해 주세요.', min: null, max: null };
  }
  if (low !== null && high !== null && low > high) {
    return { error: '최저 가격은 최고 가격보다 클 수 없습니다.', min: null, max: null };
  }
  return { error: '', min: low, max: high };
}
export function searchCatalog(catalog: Product[], filters: SearchFilters) {
  const query = filters.query.trim().toLocaleLowerCase();
  const result = catalog.filter((p) =>
    (filters.category === '전체' || p.category === filters.category) &&
    `${p.name} ${p.en}`.toLocaleLowerCase().includes(query) &&
    (filters.min === null || p.price >= filters.min) &&
    (filters.max === null || p.price <= filters.max),
  );
  if (filters.sort === 'price-low') result.sort((a, b) => a.price - b.price);
  if (filters.sort === 'price-high') result.sort((a, b) => b.price - a.price);
  return result;
}
