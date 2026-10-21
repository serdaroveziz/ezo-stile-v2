export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });
  const config = {
    apiKey: process.env.FIREBASE_WEB_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.FIREBASE_DATABASE_URL,
    projectId: process.env.FIREBASE_PROJECT_ID,
    appId: process.env.FIREBASE_APP_ID,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID
  };
  // Auth and core Firebase services do not require a Messaging sender ID.
  // Web Push validates its optional config separately so a missing FCM setting
  // can never block sign-in, booking, or the application shell.
  const missing = ['apiKey','authDomain','databaseURL','projectId','appId'].filter(key => !config[key]);
  if (missing.length) {
    return res.status(503).json({ error: `Firebase Auth yapılandırması eksik: ${missing.join(', ')}` });
  }
  res.setHeader('Cache-Control', 'no-store');
  // Firebase web configuration is public client configuration. The service worker
  // needs the same runtime values after a browser has been closed, so expose a
  // JavaScript form only for its same-origin importScripts call.
  const format = new URL(req.url, 'http://localhost').searchParams.get('format');
  if (format === 'service-worker') {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    const messagingConfig = config.messagingSenderId ? config : null;
    return res.status(200).send(`self.__EZO_FIREBASE_CONFIG__ = ${JSON.stringify(messagingConfig)};`);
  }
  return res.status(200).json({ config, vapidKey: process.env.FIREBASE_WEB_PUSH_VAPID_KEY || null });
}
