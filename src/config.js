/* EZO STİLE v2 - System Configuration & Constants */

export const CONFIG = {
  APP_NAME: 'EZO STİLE v2',
  APP_VERSION: '2.0.0',
  FIREBASE_DB_URL: 'https://ezostile-barber-default-rtdb.europe-west1.firebasedatabase.app',
  ROLE_HIERARCHY: ['super_admin', 'owner', 'manager', 'barber', 'receptionist', 'customer'],
  ROLE_LABELS: {
    super_admin: '⚡ Platform Süper Admin',
    owner: '👑 Salon Sahibi / Owner',
    manager: '🧑‍💼 Yönetici / Manager',
    barber: '💈 Berber Uzmanı / Barber',
    receptionist: '🛎️ Resepsiyonist',
    customer: '👤 Müşteri'
  },
  DEFAULT_BUSINESS_ID: 'biz_merkez_salon'
};

export function getApiBaseUrl() {
  if (typeof window !== 'undefined' && window.location.hostname.includes('github.io')) {
    return 'https://ezo-stile-app.vercel.app';
  }
  return '';
}