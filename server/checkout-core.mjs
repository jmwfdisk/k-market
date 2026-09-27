import { createHash, randomUUID } from 'node:crypto';
import { products } from '../src/catalog.ts';

export class CheckoutError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const digest = (value) => createHash('sha256').update(value).digest('hex');
const fail = (status, message) => { throw new CheckoutError(status, message); };
const validToken = (token) => typeof token === 'string' && /^[a-f0-9]{64}$/.test(token);

export function createCheckoutCore(config, db, { fetchImpl = fetch, now = Date.now } = {}) {
  db.exec(`CREATE TABLE IF NOT EXISTS test_orders (
      id TEXT PRIMARY KEY, request_id TEXT NOT NULL UNIQUE,
      token_hash TEXT NOT NULL, product_id TEXT NOT NULL, product_name TEXT NOT NULL,
      option_name TEXT NOT NULL, quantity INTEGER NOT NULL,
      currency TEXT NOT NULL, amount_minor INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING', payment_key TEXT UNIQUE,
      created INTEGER NOT NULL, expires INTEGER NOT NULL,
      lease_until INTEGER NOT NULL DEFAULT 0, approved_at TEXT
    );`);
  const get = (id) => db.prepare('SELECT * FROM test_orders WHERE id=?').get(id);
  const amount = (row) => row.currency === 'USD' ? row.amount_minor / 100 : row.amount_minor;
  function authorize(id, token) {
    const row = typeof id === 'string' ? get(id) : null;
    if (!row || !validToken(token) || row.token_hash !== digest(token)) fail(404, '주문을 찾을 수 없습니다. 같은 브라우저에서 다시 확인해 주세요.');
    return row;
  }
  function view(row) {
    return {
      orderId: row.id, productId: row.product_id, productName: row.product_name,
      orderName: `[TEST] ${row.product_name} x ${row.quantity}`,
      option: row.option_name, quantity: row.quantity, currency: row.currency,
      amount: amount(row), status: row.status, expiresAt: row.expires,
      approvedAt: row.approved_at, testMode: true,
    };
  }
  function requireEnabled() {
    if (!config.enabled) fail(503, '토스페이먼츠 테스트 결제 연결을 준비 중입니다.');
  }
  function create(input, token) {
    requireEnabled();
    if (!validToken(token)) fail(401, '주문 접근 정보가 올바르지 않습니다.');
    if (!input || typeof input !== 'object' || input.testConsent !== true) fail(400, '테스트 주문 안내에 동의해 주세요.');
    if (typeof input.requestId !== 'string' || !/^[a-f0-9-]{36}$/.test(input.requestId)) fail(400, '주문 요청 번호가 올바르지 않습니다.');
    const product = products.find((p) => p.id === input.productId);
    if (!product || !product.options.includes(input.option) || !Number.isInteger(input.quantity) || input.quantity < 1 || input.quantity > 10) fail(400, '상품, 옵션 또는 수량이 올바르지 않습니다.');
    const existing = db.prepare('SELECT * FROM test_orders WHERE request_id=?').get(input.requestId);
    if (existing) {
      authorize(existing.id, token);
      if (existing.product_id !== product.id || existing.quantity !== input.quantity || existing.option_name !== input.option) fail(409, '이미 사용된 주문 요청 번호입니다.');
      return view(existing);
    }
    const id = `km_${randomUUID()}`;
    const created = now();
    const unit = config.currency === 'USD' ? product.price : config.krwTestUnitAmount;
    db.prepare(`INSERT INTO test_orders (id, request_id, token_hash, product_id, product_name,
      option_name, quantity, currency, amount_minor, created, expires) VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
      .run(id, input.requestId, digest(token), product.id, product.name, input.option,
        input.quantity, config.currency, unit * input.quantity, created, created + 30 * 60 * 1000);
    return view(get(id));
  }
  async function toss(path, body, idempotencyKey) {
    const response = await fetchImpl(`https://api.tosspayments.com${path}`, {
      method: body ? 'POST' : 'GET',
      headers: {
        Authorization: `Basic ${Buffer.from(`${config.secretKey}:`).toString('base64')}`,
        'Content-Type': 'application/json',
        ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(15000),
    });
    const data = await response.json();
    if (!response.ok) throw new Error('Payment provider request failed');
    return data;
  }
  function validPayment(row, payment) {
    return payment && payment.orderId === row.id && payment.paymentKey === row.payment_key &&
      payment.currency === row.currency && typeof payment.totalAmount === 'number' &&
      Number.isFinite(payment.totalAmount) &&
      Math.abs(payment.totalAmount - amount(row)) < 0.000001;
  }
  async function confirm(input, token) {
    requireEnabled();
    let row = authorize(input?.orderId, token);
    if (typeof input.paymentKey !== 'string' || !/^[\w=-]{1,200}$/.test(input.paymentKey) ||
        typeof input.amount !== 'number' || !Number.isFinite(input.amount) || input.amount !== amount(row)) {
      fail(400, '결제 요청 금액 또는 결제 정보가 주문과 일치하지 않습니다.');
    }
    if (row.payment_key && row.payment_key !== input.paymentKey) fail(409, '주문에 연결된 결제 정보가 다릅니다.');
    if (row.status === 'PAID') return view(row);
    if (!row.payment_key && row.expires < now()) fail(410, '테스트 주문이 만료되었습니다. 새 주문을 만들어 주세요.');
    if (row.lease_until > now()) fail(409, '결제 확인 중입니다. 잠시 후 다시 확인해 주세요.');
    try {
      const lock = db.prepare(`UPDATE test_orders SET payment_key=?, status='CONFIRMING', lease_until=?
        WHERE id=? AND status!='PAID' AND lease_until<=?`).run(input.paymentKey, now() + 60000, row.id, now());
      if (!lock.changes) fail(409, '결제 확인 중입니다. 잠시 후 다시 확인해 주세요.');
    } catch (error) {
      if (error instanceof CheckoutError) throw error;
      fail(409, '다른 주문에 사용된 결제 정보입니다.');
    }
    row = get(row.id);
    try {
      let payment;
      // Read back first on every retry, including recovery after a server restart.
      try { payment = await toss(`/v1/payments/${encodeURIComponent(row.payment_key)}`); } catch { /* confirm with the same idempotency key */ }
      if (payment && !validPayment(row, payment)) fail(502, '조회된 결제 정보가 주문과 일치하지 않습니다.');
      if (!payment || payment.status === 'IN_PROGRESS' || payment.status === 'READY') {
        if (row.expires < now()) fail(410, '주문이 만료되어 새 결제 승인을 요청할 수 없습니다.');
        payment = await toss('/v1/payments/confirm', {
          paymentKey: row.payment_key, orderId: row.id, amount: amount(row),
        }, `confirm_${row.id}`);
      }
      if (!validPayment(row, payment)) fail(502, '결제 결과가 주문과 일치하지 않습니다. 결제 확인을 다시 시도해 주세요.');
      if (payment.status !== 'DONE') fail(409, '결제가 완료되지 않았습니다. 결제 상태를 다시 확인해 주세요.');
      db.prepare("UPDATE test_orders SET status='PAID', approved_at=?, lease_until=0 WHERE id=?")
        .run(typeof payment.approvedAt === 'string' ? payment.approvedAt : new Date(now()).toISOString(), row.id);
      return view(get(row.id));
    } catch (error) {
      // Keep the payment key: an uncertain response must not cause a new charge.
      db.prepare("UPDATE test_orders SET status='VERIFYING', lease_until=0 WHERE id=? AND status!='PAID'").run(row.id);
      if (error instanceof CheckoutError) throw error;
      fail(502, '결제 확인이 지연되고 있습니다. 새로 결제하지 말고 다시 확인을 눌러 주세요.');
    }
  }
  return { create, confirm, get: (id, token) => view(authorize(id, token)), close: () => db.close() };
}
