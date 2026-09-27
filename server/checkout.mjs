import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { createCheckoutCore } from './checkout-core.mjs';
export { CheckoutError } from './checkout-core.mjs';

export function createCheckout(config, options) {
  if (config.dbPath !== ':memory:') mkdirSync(dirname(config.dbPath), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(config.dbPath);
  db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
  return createCheckoutCore(config, db, options);
}
