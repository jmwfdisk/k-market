import { createServer } from 'node:http';
import { readConfig } from './config.mjs';
import { createCheckout } from './checkout.mjs';
import { createHandler } from './http.mjs';

process.umask(0o077);
const config = readConfig();
const checkout = createCheckout(config);
const server = createServer(createHandler(config, checkout));
server.requestTimeout = 20000;
server.headersTimeout = 10000;
server.listen(Number(process.env.PORT || 4010), process.env.CHECKOUT_HOST || '127.0.0.1', () => {
  console.log(`Test checkout server running; payments ${config.enabled ? 'enabled (TEST ONLY)' : 'disabled (keys required)'}`);
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => { checkout.close(); process.exit(0); }));
