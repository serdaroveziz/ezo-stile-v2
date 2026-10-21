// These legacy handlers do not verify provider receipts/signatures.
// Never grant entitlements outside an explicitly isolated demo emulator.
export function requirePaymentSandbox(res) {
  const allowed = process.env.EZO_PAYMENT_SANDBOX === 'emulator-only' &&
    /^(localhost|127\.0\.0\.1):\d+$/.test(process.env.FIREBASE_DATABASE_EMULATOR_HOST || '') &&
    (process.env.FIREBASE_PROJECT_ID || '').startsWith('demo-');
  if (!allowed) res.status(503).json({ error: 'Ödeme sağlayıcısı doğrulaması hazır değil.', code: 'PAYMENT_PROVIDER_VERIFICATION_REQUIRED' });
  return allowed;
}
