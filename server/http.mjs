import { CheckoutError } from './checkout.mjs';
import { publicConfig } from './config.mjs';

export function createHandler(config, checkout) {
  const limits = new Map();
  return async (request, response) => {
    const origin = request.headers.origin;
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Vary', 'Origin');
    const send = (status, value) => { response.writeHead(status); response.end(JSON.stringify(value)); };
    if (origin !== config.origin) return send(403, { error: '허용되지 않은 접근입니다.' });
    response.setHeader('Access-Control-Allow-Origin', config.origin);
    response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (request.method === 'OPTIONS') { response.writeHead(204); response.end(); return; }
    // Proxy trust is deliberately not enabled; use upstream rate limiting if deployed behind a proxy.
    const address = request.socket.remoteAddress || 'unknown';
    const now = Date.now();
    for (const [key, value] of limits) if (value.until < now) limits.delete(key);
    const counter = limits.get(address) || { count: 0, until: now + 60000 };
    counter.count += 1; limits.set(address, counter);
    if (counter.count > 60) return send(429, { error: '요청이 많습니다. 잠시 후 다시 시도해 주세요.' });
    const token = request.headers.authorization?.replace(/^Bearer /, '') || '';
    const path = new URL(request.url, 'http://internal').pathname;
    try {
      if (request.method === 'GET' && path === '/api/checkout/config') return send(200, publicConfig(config));
      if (request.method === 'GET' && /^\/api\/checkout\/orders\/km_[\w-]+$/.test(path)) {
        return send(200, checkout.get(path.split('/').pop(), token));
      }
      if (request.method !== 'POST' || !['/api/checkout/orders', '/api/checkout/confirm'].includes(path)) return send(404, { error: '요청을 찾을 수 없습니다.' });
      if (!request.headers['content-type']?.startsWith('application/json')) return send(415, { error: 'JSON 요청이 필요합니다.' });
      let raw = '';
      for await (const chunk of request) {
        raw += chunk.toString('utf8');
        if (Buffer.byteLength(raw) > 8192) return send(413, { error: '요청이 너무 큽니다.' });
      }
      let input;
      try { input = JSON.parse(raw); } catch { return send(400, { error: '요청 형식이 올바르지 않습니다.' }); }
      if (!input || typeof input !== 'object' || Array.isArray(input)) return send(400, { error: '요청 형식이 올바르지 않습니다.' });
      if (path.endsWith('/orders')) return send(201, checkout.create(input, token));
      return send(200, await checkout.confirm(input, token));
    } catch (error) {
      send(error instanceof CheckoutError ? error.status : 500, {
        error: error instanceof CheckoutError ? error.message : '주문 처리 중 오류가 발생했습니다.',
      });
    }
  };
}
