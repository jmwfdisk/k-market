import { test } from 'node:test';
import assert from 'node:assert/strict';
import { searchCatalog, priceRange } from '../src/catalog-search.ts';
import { products } from '../src/catalog.ts';
const defaults = { query: '', category: '전체', min: null, max: null, sort: 'featured' };
test('category, text and USD-cent bounds combine without mutating catalog', () => {
  const original = products.map((p) => p.id);
  const range = priceRange('15.90', '22.90');
  assert.equal(range.error, '');
  const result = searchCatalog(products, { ...defaults, ...range, category: '리빙', sort: 'price-high' });
  assert.deepEqual(result.map((p) => p.id), ['vase', 'mug']);
  assert.deepEqual(products.map((p) => p.id), original);
  assert.equal(searchCatalog(products, { ...defaults, category: '리빙', query: ' MUG ' })[0].id, 'mug');
  assert.equal(searchCatalog(products, { ...defaults, query: '없는상품' }).length, 0);
});
test('price validation rejects reversed, invalid and negative bounds, preserves zero', () => {
  assert.ok(priceRange('20', '10').error);
  assert.ok(priceRange('-1', '').error);
  assert.ok(priceRange('invalid', '').error);
  assert.deepEqual(priceRange('', ''), { error: '', min: null, max: null });
  assert.deepEqual(priceRange('0', '18.90'), { error: '', min: 0, max: 1890 });
});
test('reset defaults restore all products; low-price sorting is numeric', () => {
  assert.equal(searchCatalog(products, defaults).length, 6);
  const prices = searchCatalog(products, { ...defaults, sort: 'price-low' }).map((p) => p.price);
  assert.deepEqual(prices, [...prices].sort((a,b) => a-b));
});
