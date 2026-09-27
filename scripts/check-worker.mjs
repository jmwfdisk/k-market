import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';

const base = process.env.CHECKOUT_VERIFY_URL || 'http://127.0.0.1:8787';
const origin = 'https://jmwfdisk.github.io';
const token = randomBytes(32).toString('hex');
async function call(path, body, access = token, site = origin) {
  return fetch(`${base}/api/checkout${path}`, {
    method: body ? 'POST' : 'GET', headers: { Origin: site, Authorization: `Bearer ${access}`, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}
const config = await (await call('/config')).json();
assert.equal(config.enabled, true);
assert.equal(config.testMode, true);
assert.ok(!JSON.stringify(config).includes('test_gsk_'));
assert.equal((await call('/config', null, token, 'https://invalid.example')).status, 403);
const input = { requestId: randomUUID(), productId: 'tote', quantity: 2, option: '내추럴', testConsent: true, amount: 1 };
const created = await call('/orders', input);
assert.equal(created.status, 201);
const order = await created.json();
assert.equal(order.amount, 2000);
assert.equal((await (await call('/orders', input)).json()).orderId, order.orderId);
assert.equal((await call(`/orders/${order.orderId}`, null, randomBytes(32).toString('hex'))).status, 404);
assert.equal((await call(`/orders/${order.orderId}`)).status, 200);
assert.equal((await call('/confirm', { orderId: order.orderId, paymentKey: 'not_a_real_payment', amount: 1 })).status, 400);
assert.equal((await call('/orders', { huge: 'x'.repeat(9000) })).status, 413);
console.log('Worker storage, idempotency, amount, ownership, CORS and request limits passed. No provider approval requested.');
