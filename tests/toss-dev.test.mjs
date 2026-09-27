import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

function check(overrides = {}) {
  return spawnSync(process.execPath, ['scripts/toss-dev.mjs', '--check'], {
    encoding: 'utf8', env: {
      ...process.env, TOSS_CLIENT_KEY: '', TOSS_SECRET_KEY: '',
      CHECKOUT_SITE_URL: 'http://127.0.0.1:5173/', CHECKOUT_HOST: '127.0.0.1',
      PORT: '4010', TOSS_TEST_CURRENCY: 'KRW', TOSS_PAYMENT_VARIANT_KEY: 'DEFAULT', ...overrides,
    },
  });
}
test('local launcher refuses missing/live keys without echoing credentials', () => {
  assert.equal(check().status, 1);
  const result = check({ TOSS_CLIENT_KEY: 'live_gck_do-not-print', TOSS_SECRET_KEY: 'live_gsk_do-not-print' });
  assert.equal(result.status, 1);
  assert.ok(!`${result.stdout}${result.stderr}`.includes('do-not-print'));
});
test('local launcher checks config only and refuses remote origins and port collisions', () => {
  const fixture = { TOSS_CLIENT_KEY: 'test_gck_fixture', TOSS_SECRET_KEY: 'test_gsk_fixture' };
  assert.equal(check(fixture).status, 0);
  assert.equal(check({ ...fixture, CHECKOUT_SITE_URL: 'https://example.com/' }).status, 1);
  assert.equal(check({ ...fixture, PORT: '5173' }).status, 1);
});
