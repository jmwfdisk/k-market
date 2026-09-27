export type CheckoutConfig = {
  enabled: boolean;
  testMode: true;
  currency: 'KRW' | 'USD';
  krwTestUnitAmount: number;
  clientKey?: string;
  variantKey?: string;
  agreementVariantKey?: string;
};
export type TestOrder = {
  orderId: string; productId: string; productName: string; orderName: string;
  option: string; quantity: number; currency: 'KRW' | 'USD'; amount: number;
  status: 'PENDING' | 'CONFIRMING' | 'VERIFYING' | 'PAID';
  expiresAt: number; approvedAt: string | null; testMode: true;
};
export type SavedOrder = { order: TestOrder; token: string };
type PaymentReturn = { result: string; orderId: string; paymentKey: string; amount: string; code: string };

const env = import.meta.env;
const apiBase = (env.VITE_CHECKOUT_API_URL || (env.DEV ? 'http://127.0.0.1:4010' : '')).replace(/\/$/, '');
const ordersKey = 'kmarket.test-orders.v1';
const returnKey = 'kmarket.test-return.v1';

export async function checkoutApi<T>(path: string, token?: string, body?: unknown): Promise<T> {
  if (!apiBase) throw new Error('테스트 결제 연결을 준비 중입니다. 아직 결제할 수 없습니다.');
  const url = new URL(apiBase);
  if (url.protocol !== 'https:' && !(env.DEV && url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) {
    throw new Error('결제 서버 연결 설정을 확인해 주세요.');
  }
  let response: Response;
  try {
    response = await fetch(`${apiBase}/api/checkout${path}`, {
      method: body ? 'POST' : 'GET',
      headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined, cache: 'no-store',
      credentials: 'omit', referrerPolicy: 'no-referrer', signal: AbortSignal.timeout(35000),
    });
  } catch { throw new Error('결제 서버에 연결하지 못했습니다. 잠시 후 다시 확인해 주세요.'); }
  const value = await response.json();
  if (!response.ok) throw new Error(typeof value.error === 'string' ? value.error : '결제 요청을 처리하지 못했습니다.');
  return value as T;
}
export function getConfig(): Promise<CheckoutConfig> {
  if (!apiBase) return Promise.resolve({ enabled: false, testMode: true, currency: 'KRW', krwTestUnitAmount: 1000 });
  return checkoutApi('/config');
}
export function savedOrders(): SavedOrder[] {
  try { return JSON.parse(sessionStorage.getItem(ordersKey) || '[]'); } catch { return []; }
}
export function saveOrder(value: SavedOrder) {
  const orders = savedOrders().filter((entry) => entry.order.orderId !== value.order.orderId);
  sessionStorage.setItem(ordersKey, JSON.stringify([value, ...orders].slice(0, 20)));
}
export function paymentAmount(value: { currency: string; amount: number }) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: value.currency, currencyDisplay: 'code' }).format(value.amount);
}
export function newOrderAccess() {
  const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), (n) => n.toString(16).padStart(2, '0')).join('');
  return { requestId: crypto.randomUUID(), token };
}
export function capturePaymentReturn() {
  const query = new URLSearchParams(location.search);
  if (!query.has('checkoutResult')) return;
  const result: PaymentReturn = {
    result: query.get('checkoutResult') || '', orderId: query.get('orderId') || '',
    paymentKey: query.get('paymentKey') || '', amount: query.get('amount') || '', code: query.get('code') || '',
  };
  try { sessionStorage.setItem(returnKey, JSON.stringify(result)); } catch { /* result screen reports missing session */ }
  // Drop payment data from the visible URL before rendering any page links.
  history.replaceState(null, '', `${location.pathname}#payment-result`);
}
export function getPaymentReturn(): PaymentReturn | null {
  try { return JSON.parse(sessionStorage.getItem(returnKey) || 'null'); } catch { return null; }
}
