import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { createCheckout } from '../server/checkout.mjs';
import { readConfig, publicConfig } from '../server/config.mjs';
import { createHandler } from '../server/http.mjs';

const env = { TOSS_CLIENT_KEY: 'test_gck_fixture', TOSS_SECRET_KEY: 'test_gsk_fixture', CHECKOUT_DB_PATH: ':memory:' };
const token = () => randomBytes(32).toString('hex');
const input = (extra = {}) => ({ requestId: randomUUID(), productId: 'tote', quantity: 2, option: '내추럴', testConsent: true, ...extra });
const response = (data, status = 200) => new Response(JSON.stringify(data), { status });
const payment = (order, key = 'payment_test_key') => ({ orderId: order.orderId, paymentKey: key, totalAmount: order.amount, currency: order.currency, status: 'DONE', approvedAt: '2026-09-27T00:00:00Z' });
const confirmation = (order, extra = {}) => ({ orderId: order.orderId, paymentKey: 'payment_test_key', amount: order.amount, ...extra });

test('missing keys disable checkout; live/incorrect keys and insecure site URLs fail closed', () => {
  const config = readConfig({});
  assert.equal(config.enabled, false);
  for (const values of [
    { TOSS_SECRET_KEY: 'live_gsk_anything' },
    { TOSS_CLIENT_KEY: 'live_gck_anything' },
    { CHECKOUT_SITE_URL: 'http://example.com/' },
    { TOSS_TEST_CURRENCY: 'THB' },
  ]) assert.throws(() => readConfig(values));
  assert.equal(readConfig({ ...env, TOSS_TEST_CURRENCY: 'USD' }).enabled, false);
  assert.equal(readConfig({ ...env, TOSS_TEST_CURRENCY: 'USD', TOSS_PAYMENT_VARIANT_KEY: 'USD_TEST' }).enabled, true);
  const published = JSON.stringify(publicConfig(readConfig(env)));
  assert.ok(!published.includes('test_gsk_'));
  const service = createCheckout(config);
  try { assert.throws(() => service.create(input(), token()), { status: 503 }); } finally { service.close(); }
});

test('server determines price/currency; quantity/option/consent checks; request id is idempotent', () => {
  const service = createCheckout(readConfig(env));
  try {
    const access = token();
    const request = input({ amount: 1, currency: 'USD', price: 0 });
    const order = service.create(request, access);
    assert.equal(order.amount, 2000);
    assert.equal(order.currency, 'KRW');
    assert.equal(service.create(request, access).orderId, order.orderId);
    assert.throws(() => service.create({ ...request, quantity: 3 }, access), { status: 409 });
    assert.throws(() => service.get(order.orderId, token()), { status: 404 });
    assert.throws(() => service.create(request, token()), { status: 404 });
    for (const bad of [{ quantity: -1 }, { quantity: 1.1 }, { quantity: 11 }, { option: 'unknown' }, { testConsent: false }, { productId: 'missing' }]) {
      assert.throws(() => service.create(input(bad), access), { status: 400 });
    }
  } finally { service.close(); }
});

test('USD orders use server cent prices rather than KRW test fixtures', () => {
  const service = createCheckout(readConfig({ ...env, TOSS_TEST_CURRENCY: 'USD', TOSS_PAYMENT_VARIANT_KEY: 'USD_TEST' }));
  try {
    const order = service.create(input(), token());
    assert.equal(order.currency, 'USD'); assert.equal(order.amount, 37.8);
  } finally { service.close(); }
});

test('tampered amount and foreign token never reach Toss', async () => {
  let calls = 0;
  const service = createCheckout(readConfig(env), { fetchImpl: async () => { calls++; throw new Error('must not call'); } });
  try {
    const access = token(), order = service.create(input(), access);
    await assert.rejects(service.confirm(confirmation(order, { amount: 1 }), access), { status: 400 });
    await assert.rejects(service.confirm(confirmation(order), token()), { status: 404 });
    assert.equal(calls, 0);
  } finally { service.close(); }
});

test('success needs provider DONE and exact order/key/amount/currency; response never exposes payment key', async () => {
  for (const patch of [{ status: 'WAITING_FOR_DEPOSIT' }, { currency: 'USD' }, { totalAmount: 1 }, { orderId: 'wrong_order' }, { paymentKey: 'wrong_key' }]) {
    let expected;
    const service = createCheckout(readConfig(env), { fetchImpl: async (url) => url.endsWith('/confirm') ? response({ ...expected, ...patch }) : response({}, 404) });
    try {
      const access = token(), order = service.create(input(), access); expected = payment(order);
      await assert.rejects(service.confirm(confirmation(order), access));
      assert.notEqual(service.get(order.orderId, access).status, 'PAID');
    } finally { service.close(); }
  }
});

test('concurrent confirmation sends one approval; repeat is idempotent and key is locked', async () => {
  let started;
  const pending = new Promise((resolve) => { started = resolve; });
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  let posts = 0, expected;
  const service = createCheckout(readConfig(env), { fetchImpl: async (url, options) => {
    if (!url.endsWith('/confirm')) return response({}, 404);
    posts++; started(); await gate;
    assert.equal(options.headers['Idempotency-Key'], `confirm_${expected.orderId}`);
    assert.equal(options.headers.Authorization, `Basic ${Buffer.from('test_gsk_fixture:').toString('base64')}`);
    return response(expected);
  } });
  try {
    const access = token(), order = service.create(input(), access); expected = payment(order);
    const first = service.confirm(confirmation(order), access);
    await pending;
    await assert.rejects(service.confirm(confirmation(order), access), { status: 409 });
    release();
    assert.equal((await first).status, 'PAID');
    assert.equal((await service.confirm(confirmation(order), access)).status, 'PAID');
    await assert.rejects(service.confirm(confirmation(order, { paymentKey: 'different' }), access), { status: 409 });
    assert.equal(posts, 1);
    assert.ok(!JSON.stringify(service.get(order.orderId, access)).includes('payment_test_key'));
  } finally { service.close(); }
});

test('lost approval response recovers by authenticated lookup without a new charge', async () => {
  let expected, approved = false, posts = 0;
  const service = createCheckout(readConfig(env), { fetchImpl: async (url) => {
    if (url.endsWith('/confirm')) { posts++; approved = true; throw new Error('connection lost after approval'); }
    return approved ? response(expected) : response({}, 404);
  } });
  try {
    const access = token(), order = service.create(input(), access); expected = payment(order);
    await assert.rejects(service.confirm(confirmation(order), access), { status: 502 });
    assert.equal(service.get(order.orderId, access).status, 'VERIFYING');
    assert.equal((await service.confirm(confirmation(order), access)).status, 'PAID');
    assert.equal(posts, 1);
  } finally { service.close(); }
});

test('a payment key cannot be claimed by a second order', async () => {
  let expected;
  const service = createCheckout(readConfig(env), { fetchImpl: async (url) => url.endsWith('/confirm') ? response(expected) : response({}, 404) });
  try {
    const access = token();
    const first = service.create(input(), access), second = service.create(input(), access);
    expected = payment(first);
    await service.confirm(confirmation(first), access);
    await assert.rejects(service.confirm(confirmation(second), access), { status: 409 });
    assert.equal(service.get(second.orderId, access).status, 'PENDING');
  } finally { service.close(); }
});

test('expired unused orders cannot be charged; persistent orders survive restart', async () => {
  const folder = mkdtempSync(join(tmpdir(), 'kmarket-checkout-test-'));
  const config = readConfig({ ...env, CHECKOUT_DB_PATH: join(folder, 'test.sqlite') });
  let clock = 1000;
  let service = createCheckout(config, { now: () => clock, fetchImpl: async () => { throw new Error('must not call'); } });
  try {
    const access = token(), order = service.create(input(), access);
    service.close();
    service = createCheckout(config, { now: () => clock, fetchImpl: async () => { throw new Error('must not call'); } });
    assert.equal(service.get(order.orderId, access).amount, 2000);
    clock += 31 * 60 * 1000;
    await assert.rejects(service.confirm(confirmation(order), access), { status: 410 });
  } finally { service.close(); rmSync(folder, { recursive: true }); }
});

test('HTTP API enforces Origin, bearer access, JSON size and hides secret configuration', async () => {
  const config = readConfig(env), service = createCheckout(config);
  const handler = createHandler(config, service);
  async function request(path, { method = 'GET', origin = config.origin, bearer, raw } = {}) {
    const req = Readable.from(raw ? [Buffer.from(raw)] : []);
    Object.assign(req, { url: path, method, socket: { remoteAddress: 'test' }, headers: {
      origin, ...(raw ? { 'content-type': 'application/json' } : {}), ...(bearer ? { authorization: `Bearer ${bearer}` } : {}),
    } });
    const result = { headers: {}, status: 0, body: '' };
    await handler(req, { setHeader: (k, v) => { result.headers[k] = v; }, writeHead: (s) => { result.status = s; }, end: (body) => { result.body = body || ''; } });
    return result;
  }
  try {
    assert.equal((await request('/api/checkout/config', { origin: 'https://evil.example' })).status, 403);
    const configResponse = await request('/api/checkout/config');
    assert.equal(configResponse.status, 200); assert.ok(!configResponse.body.includes('test_gsk'));
    const access = token();
    const created = await request('/api/checkout/orders', { method: 'POST', bearer: access, raw: JSON.stringify(input()) });
    assert.equal(created.status, 201);
    const order = JSON.parse(created.body);
    assert.equal((await request(`/api/checkout/orders/${order.orderId}`)).status, 404);
    assert.equal((await request(`/api/checkout/orders/${order.orderId}`, { bearer: access })).status, 200);
    assert.equal((await request('/api/checkout/orders', { method: 'POST', bearer: access, raw: '{' })).status, 400);
    assert.equal((await request('/api/checkout/orders', { method: 'POST', bearer: access, raw: JSON.stringify({ huge: 'x'.repeat(9000) }) })).status, 413);
  } finally { service.close(); }
});
