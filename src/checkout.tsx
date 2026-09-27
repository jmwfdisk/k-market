import { useEffect, useRef, useState } from 'react';
import { loadTossPayments, ANONYMOUS, type TossPaymentsWidgets, type WidgetPaymentMethodWidget, type WidgetAgreementWidget } from '@tosspayments/tosspayments-sdk';
import { type Product, money, photo } from './catalog';
import { checkoutApi, getConfig, getPaymentReturn, newOrderAccess, paymentAmount, saveOrder, savedOrders, type CheckoutConfig, type SavedOrder, type TestOrder } from './checkout-api';

function TestNotice() {
  return <p className="checkout-notice">테스트 결제 전용입니다. 실제 금액이 청구되지 않으며 상품 주문·배송은 이루어지지 않습니다.</p>;
}

function PaymentWidget({ saved, config }: { saved: SavedOrder; config: CheckoutConfig }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const widgets = useRef<TossPaymentsWidgets | null>(null);
  const cleanup = useRef<Promise<unknown>>(Promise.resolve());
  useEffect(() => {
    let disposed = false;
    let methods: WidgetPaymentMethodWidget | undefined;
    let agreement: WidgetAgreementWidget | undefined;
    setReady(false); setError('');
    const initialize = async () => {
      try {
        await cleanup.current;
        if (disposed) return;
        if (!config.clientKey?.startsWith('test_gck_') || !config.testMode) throw new Error('테스트 결제 설정이 올바르지 않습니다.');
        const sdk = await loadTossPayments(config.clientKey);
        if (disposed) return;
        const widget = sdk.widgets({ customerKey: ANONYMOUS });
        await widget.setAmount({ currency: saved.order.currency, value: saved.order.amount });
        if (disposed) return;
        methods = await widget.renderPaymentMethods({ selector: '#toss-payment-methods', variantKey: config.variantKey });
        if (disposed) return;
        agreement = await widget.renderAgreement({ selector: '#toss-agreement', variantKey: config.agreementVariantKey });
        if (disposed) return;
        widgets.current = widget;
        setReady(true);
      } catch {
        if (!disposed) setError('토스 테스트 결제창을 불러오지 못했습니다. 상점 키·결제 UI 설정 또는 네트워크를 확인해 주세요.');
      }
    };
    const initialized = initialize();
    return () => {
      disposed = true; widgets.current = null;
      cleanup.current = initialized.then(() => Promise.allSettled([
        methods?.destroy(), agreement?.destroy(),
      ]));
    };
  }, [saved.order.orderId, saved.order.amount, saved.order.currency, config, attempt]);
  async function pay() {
    if (!ready || !widgets.current || busy) return;
    setBusy(true); setError('');
    try {
      // Redirect returns to the existing Pages index; hash-only routes are not passed to Toss.
      const success = new URL(location.pathname, location.origin);
      success.searchParams.set('checkoutResult', 'success');
      const failure = new URL(success);
      failure.searchParams.set('checkoutResult', 'fail');
      await widgets.current.requestPayment({
        orderId: saved.order.orderId, orderName: saved.order.orderName,
        successUrl: success.href, failUrl: failure.href, windowTarget: 'self',
      });
    } catch (failure) {
      const code = (failure as { code?: string })?.code;
      setError(code === 'USER_CANCEL' || code === 'PAY_PROCESS_CANCELED'
        ? '결제창을 닫았습니다. 결제는 완료되지 않았습니다.'
        : '결제 요청이 완료되지 않았습니다. 약관 동의와 결제수단을 확인해 주세요.');
    } finally { setBusy(false); }
  }
  return <div className="checkout-card">
    <h2>토스페이먼츠 테스트 결제</h2>
    <p className="checkout-muted">주문번호 {saved.order.orderId}</p>
    <div id="toss-payment-methods" />
    <div id="toss-agreement" />
    {error && <p role="alert" className="checkout-error">{error}</p>}
    {!ready && !error && <p role="status">결제창을 준비하고 있습니다…</p>}
    {error && !ready && <button className="checkout-secondary" onClick={() => setAttempt((value) => value + 1)}>결제창 다시 불러오기</button>}
    <button className="checkout-primary" disabled={!ready || busy} onClick={() => void pay()}>{busy ? '결제창으로 이동 중…' : `${paymentAmount(saved.order)} 테스트 결제`}</button>
  </div>;
}

export function Checkout({ product }: { product: Product | undefined }) {
  const [config, setConfig] = useState<CheckoutConfig | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [option, setOption] = useState(product?.options[0] || '');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState<SavedOrder | null>(null);
  const access = useRef<ReturnType<typeof newOrderAccess> | null>(null);
  useEffect(() => {
    let active = true;
    getConfig().then((value) => { if (active) setConfig(value); }).catch((failure: Error) => { if (active) setError(failure.message); });
    return () => { active = false; };
  }, []);
  if (!product) return <main className="wrap checkout-page"><h1>상품을 찾을 수 없습니다</h1><a href="#collection">상품 보기</a></main>;
  const testAmount = { currency: config?.currency || 'KRW', amount: config?.currency === 'USD' ? product.price * quantity / 100 : (config?.krwTestUnitAmount || 1000) * quantity };
  const update = () => { access.current = null; };
  async function prepare() {
    if (!product || !config?.enabled || !consent || busy || saved) return;
    setBusy(true); setError('');
    try {
      // Verify storage works BEFORE opening a checkout that needs the token on return.
      sessionStorage.setItem('kmarket.storage-check', '1');
      sessionStorage.removeItem('kmarket.storage-check');
      access.current ??= newOrderAccess();
      const { requestId, token } = access.current;
      const order = await checkoutApi<TestOrder>('/orders', token, { requestId, productId: product.id, option, quantity, testConsent: consent });
      const value = { order, token };
      saveOrder(value); setSaved(value);
    } catch (failure) { setError(failure instanceof Error ? failure.message : '주문을 만들지 못했습니다. 브라우저 저장소 설정을 확인해 주세요.'); }
    finally { setBusy(false); }
  }
  return <main className="wrap checkout-page">
    <div className="checkout-title"><div><span className="eyebrow">TEST CHECKOUT</span><h1>테스트 주문서</h1></div><a href="#test-orders">이 브라우저의 테스트 주문</a></div>
    <TestNotice />
    <div className="checkout-grid">
      <section className="checkout-card">
        <div className="checkout-product"><img src={photo(product)} alt={product.name} /><div><h2>{product.name}</h2><p>상품 소개 가격 {money(product.price)}</p></div></div>
        <label>옵션<select value={option} disabled={Boolean(saved) || busy} onChange={(event) => { setOption(event.target.value); update(); }}>{product.options.map((name) => <option key={name}>{name}</option>)}</select></label>
        <label>수량<select value={quantity} disabled={Boolean(saved) || busy} onChange={(event) => { setQuantity(Number(event.target.value)); update(); }}>{Array.from({ length: 10 }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}개</option>)}</select></label>
        <div className="checkout-total"><span>테스트 결제 금액</span><strong>{paymentAmount(saved?.order || testAmount)}</strong></div>
        {(config?.currency || 'KRW') === 'KRW' && <p className="checkout-muted">연동 시험을 위한 별도 금액(상품 1개당 1,000원)입니다. 위 USD 상품 가격을 환산한 금액이 아닙니다.</p>}
        <p className="checkout-muted">배송비·세금·재고 예약을 포함하지 않는 결제 기능 테스트입니다. 배송지와 개인정보를 입력하지 않습니다.</p>
        <a href={`#product/${product.id}`}>상품 상세 보기</a>
      </section>
      {saved && config ? <PaymentWidget saved={saved} config={config} /> : <section className="checkout-card">
        <h2>테스트 결제 준비</h2>
        {!config && !error && <p role="status">연결 상태 확인 중…</p>}
        {config && !config.enabled && <div className="checkout-setup" role="status"><strong>테스트 결제 연결 준비 중</strong><p>현재 결제창을 사용할 수 없습니다. 토스페이먼츠 테스트 키와 결제 서버 연결이 완료되면 테스트할 수 있습니다.</p></div>}
        <label className="checkout-consent"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} disabled={busy} /><span>실제 구매·배송이 없는 테스트 주문임을 확인했습니다.</span></label>
        {error && <p className="checkout-error" role="alert">{error}</p>}
        <button className="checkout-primary" disabled={!config?.enabled || !consent || busy} onClick={() => void prepare()}>{busy ? '주문 확인 중…' : '테스트 주문 생성 및 결제 준비'}</button>
      </section>}
    </div>
  </main>;
}

export function PaymentResult() {
  const [callback] = useState(getPaymentReturn);
  const [order, setOrder] = useState<TestOrder | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!callback || callback.result !== 'success') return;
    const saved = savedOrders().find((entry) => entry.order.orderId === callback.orderId);
    if (!saved || !callback.paymentKey || !/^\d+(\.\d{1,2})?$/.test(callback.amount)) {
      setError('주문 접근 정보를 확인할 수 없습니다. 결제에 사용한 브라우저에서 확인해 주세요.'); return;
    }
    let active = true;
    setBusy(true); setError('');
    checkoutApi<TestOrder>('/confirm', saved.token, { orderId: callback.orderId, paymentKey: callback.paymentKey, amount: Number(callback.amount) })
      .then((value) => { saveOrder({ ...saved, order: value }); if (active) setOrder(value); })
      .catch((failure: Error) => { if (active) setError(failure.message); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [callback, attempt]);
  const failed = callback?.result === 'fail';
  return <main className="wrap checkout-page">
    <h1>{order?.status === 'PAID' ? '테스트 결제 완료' : failed ? '테스트 결제가 완료되지 않았습니다' : '테스트 결제 확인'}</h1>
    <TestNotice />
    <section className="checkout-card checkout-result" aria-live="polite">
      {busy && <p>서버에서 주문 금액과 토스 결제 결과를 확인하고 있습니다…</p>}
      {failed && <p>{callback?.code === 'PAY_PROCESS_CANCELED' ? '결제창에서 결제를 취소했습니다.' : '결제가 취소되었거나 결제 요청에 실패했습니다.'} 완료된 결제는 아닙니다.</p>}
      {!callback && <p>확인할 결제 결과가 없습니다.</p>}
      {error && <><p className="checkout-error" role="alert">{error}</p><p>새로 결제하지 말고 기존 주문의 결제 상태를 다시 확인해 주세요.</p><button className="checkout-primary" disabled={busy} onClick={() => setAttempt((value) => value + 1)}>결제 상태 다시 확인</button></>}
      {order?.status === 'PAID' && <><h2>{order.productName}</h2><p>{order.option} · {order.quantity}개</p><strong>{paymentAmount(order)}</strong><p className="checkout-muted">주문번호 {order.orderId}</p><p>토스 승인 결과를 서버에서 확인했습니다. 실제 주문이나 배송은 진행되지 않습니다.</p></>}
      <a href="#test-orders">테스트 주문 내역 보기 →</a>
    </section>
  </main>;
}

export function TestOrders() {
  const [orders, setOrders] = useState(savedOrders);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function refresh() {
    setBusy(true); setError('');
    const results = await Promise.allSettled(orders.map(async (value) => {
      const order = await checkoutApi<TestOrder>(`/orders/${value.order.orderId}`, value.token);
      saveOrder({ ...value, order });
    }));
    if (results.some((value) => value.status === 'rejected')) setError('일부 주문 상태를 확인하지 못했습니다. 아래에는 마지막 확인 상태가 표시됩니다.');
    setOrders(savedOrders()); setBusy(false);
  }
  return <main className="wrap checkout-page"><h1>테스트 주문 내역</h1><TestNotice />
    <p className="checkout-muted">이 탭에서 만든 최근 테스트 주문만 표시합니다. 탭을 닫거나 브라우저 저장소를 지우면 조회 정보가 사라집니다.</p>
    {orders.length > 0 && <button className="checkout-secondary" disabled={busy} onClick={() => void refresh()}>{busy ? '조회 중…' : '서버 상태 새로고침'}</button>}
    {error && <p className="checkout-error" role="alert">{error}</p>}
    {orders.length === 0 ? <div className="checkout-card"><p>토스 테스트 결제 주문은 아직 없습니다.</p><a href="#collection">상품 둘러보기 →</a></div> : orders.map(({ order }) => <article key={order.orderId} className="checkout-card">
      <h2>{order.productName}</h2><p>{order.option} · {order.quantity}개 · {paymentAmount(order)}</p>
      <p>마지막 확인 상태: {order.status === 'PAID' ? '테스트 결제 완료' : order.status === 'PENDING' ? '테스트 결제 대기' : '결제 확인 필요'}</p>
      <p className="checkout-muted">{order.orderId}</p>
      {getPaymentReturn()?.orderId === order.orderId && order.status !== 'PAID' && <a href="#payment-result">결제 결과 다시 확인 →</a>}
    </article>)}
  </main>;
}
