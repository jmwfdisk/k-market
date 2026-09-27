export function readConfig(env = process.env) {
  const clientKey = env.TOSS_CLIENT_KEY || '';
  const secretKey = env.TOSS_SECRET_KEY || '';
  if ((clientKey && !/^test_gck_/.test(clientKey)) ||
      (secretKey && !/^test_gsk_/.test(secretKey))) {
    throw new Error('Only test_gck_/test_gsk_ widget keys are accepted. Live payments are disabled.');
  }
  const currency = env.TOSS_TEST_CURRENCY || 'KRW';
  if (!['KRW', 'USD'].includes(currency)) throw new Error('Unsupported test currency');
  const variantKey = env.TOSS_PAYMENT_VARIANT_KEY || (currency === 'KRW' ? 'DEFAULT' : '');
  const site = new URL(env.CHECKOUT_SITE_URL || 'http://127.0.0.1:5173/');
  if ((site.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(site.hostname)) ||
      !['https:', 'http:'].includes(site.protocol) || site.username || site.password || site.hash || site.search) {
    throw new Error('CHECKOUT_SITE_URL must be HTTPS (HTTP is allowed only on localhost).');
  }
  if (!site.pathname.endsWith('/')) throw new Error('CHECKOUT_SITE_URL must end with /');
  return {
    clientKey, secretKey, currency, variantKey,
    agreementVariantKey: env.TOSS_AGREEMENT_VARIANT_KEY || 'AGREEMENT',
    siteUrl: site.href, origin: site.origin,
    // A separate test fixture, never a USD->KRW exchange rate.
    krwTestUnitAmount: 1000,
    enabled: Boolean(clientKey && secretKey && variantKey),
    dbPath: env.CHECKOUT_DB_PATH || 'server/data/checkout.sqlite',
  };
}

export function publicConfig(config) {
  return {
    enabled: config.enabled, testMode: true, currency: config.currency,
    krwTestUnitAmount: config.krwTestUnitAmount,
    ...(config.enabled ? {
      clientKey: config.clientKey, variantKey: config.variantKey,
      agreementVariantKey: config.agreementVariantKey,
    } : {}),
  };
}
