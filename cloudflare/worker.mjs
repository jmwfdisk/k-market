import { DurableObject } from 'cloudflare:workers';
import { createCheckoutCore, CheckoutError } from '../server/checkout-core.mjs';
import { readConfig, publicConfig } from '../server/config.mjs';

export class CheckoutStore extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.config = readConfig(env);
    const sql = ctx.storage.sql;
    const db = {
      exec: (query) => sql.exec(query).toArray(),
      prepare: (query) => ({
        get: (...args) => sql.exec(query, ...args).toArray()[0],
        run: (...args) => { const cursor = sql.exec(query, ...args); cursor.toArray(); return { changes: cursor.rowsWritten }; },
      }),
      close: () => {},
    };
    this.checkout = createCheckoutCore(this.config, db);
    this.limits = new Map();
  }
  async fetch(request) {
    const origin = request.headers.get('Origin');
    const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', Vary: 'Origin' };
    const send = (status, data) => new Response(JSON.stringify(data), { status, headers });
    if (origin !== this.config.origin) return send(403, { error: '허용되지 않은 접근입니다.' });
    Object.assign(headers, { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' });
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    const time = Date.now();
    for (const [key, entry] of this.limits) if (entry.until < time) this.limits.delete(key);
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const limit = this.limits.get(ip) || { count: 0, until: time + 60000 };
    limit.count++; this.limits.set(ip, limit);
    if (limit.count > 60 || this.limits.size > 10000) return send(429, { error: '요청이 많습니다. 잠시 후 다시 시도해 주세요.' });
    const path = new URL(request.url).pathname;
    const token = request.headers.get('Authorization')?.replace(/^Bearer /, '') || '';
    try {
      if (request.method === 'GET' && path === '/api/checkout/config') return send(200, publicConfig(this.config));
      if (request.method === 'GET' && /^\/api\/checkout\/orders\/km_[\w-]+$/.test(path)) return send(200, this.checkout.get(path.split('/').pop(), token));
      if (request.method !== 'POST' || !['/api/checkout/orders', '/api/checkout/confirm'].includes(path)) return send(404, { error: '요청을 찾을 수 없습니다.' });
      if (!request.headers.get('Content-Type')?.startsWith('application/json')) return send(415, { error: 'JSON 요청이 필요합니다.' });
      const reader = request.body?.getReader();
      const chunks = []; let size = 0;
      if (reader) while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 8192) { await reader.cancel(); return send(413, { error: '요청이 너무 큽니다.' }); }
        chunks.push(value);
      }
      let input;
      try { input = JSON.parse(await new Blob(chunks).text()); } catch { return send(400, { error: '요청 형식이 올바르지 않습니다.' }); }
      if (!input || typeof input !== 'object' || Array.isArray(input)) return send(400, { error: '요청 형식이 올바르지 않습니다.' });
      return path.endsWith('/orders') ? send(201, this.checkout.create(input, token)) : send(200, await this.checkout.confirm(input, token));
    } catch (error) {
      return send(error instanceof CheckoutError ? error.status : 500, { error: error instanceof CheckoutError ? error.message : '주문 처리 중 오류가 발생했습니다.' });
    }
  }
}

export default {
  async fetch(request, env) {
    try {
      // One durable database preserves cross-order payment-key uniqueness and leases.
      const id = env.CHECKOUT_STORE.idFromName('test-orders-v1');
      return await env.CHECKOUT_STORE.get(id).fetch(request);
    } catch {
      return Response.json({ error: '테스트 결제 서버 설정을 확인해 주세요.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
    }
  },
};
