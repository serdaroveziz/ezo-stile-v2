/* EZO STİLE v2 - Single Source of Truth Product & Subscription Catalog */
export const AI_CREDIT_CATALOG = {
  economy_5: {
    id: 'economy_5',
    type: 'ai_credits',
    name: '5 Economy AI Hakkı',
    creditType: 'economy',
    credits: 5,
    priceTry: 49.99,
    description: 'Temel AI saç deneme paketi.'
  },
  economy_10: {
    id: 'economy_10',
    type: 'ai_credits',
    name: '10 Economy AI Hakkı',
    creditType: 'economy',
    credits: 10,
    priceTry: 89.99,
    description: 'En popüler saç modeli deneme paketi.'
  },
  economy_25: {
    id: 'economy_25',
    type: 'ai_credits',
    name: '25 Economy AI Hakkı',
    creditType: 'economy',
    credits: 25,
    priceTry: 199.99,
    description: 'Avantajlı VIP saç stil paketi.'
  },
  premium_3: {
    id: 'premium_3',
    type: 'ai_credits',
    name: '3 Premium AI Hakkı',
    creditType: 'premium',
    credits: 3,
    priceTry: 79.99,
    description: 'VIP Yüz Korumalı yüksek çözünürlüklü deneme.'
  },
  premium_10: {
    id: 'premium_10',
    type: 'ai_credits',
    name: '10 Premium AI Hakkı',
    creditType: 'premium',
    credits: 10,
    priceTry: 219.99,
    description: 'Maksimum yüz korumalı profesyonel VIP paket.'
  },
  salon_pro: {
    id: 'salon_pro',
    type: 'salon_subscription',
    name: 'PRO Salon Aboneliği',
    plan: 'PRO',
    staffLimit: 5,
    priceTry: 499.00,
    description: 'Maksimum 5 personel, gelişmiş istatistikler ve AI referanslı randevular.'
  },
  salon_premium: {
    id: 'salon_premium',
    type: 'salon_subscription',
    name: 'PREMIUM VIP Salon Aboneliği',
    plan: 'PREMIUM',
    staffLimit: 20,
    priceTry: 1299.00,
    description: 'Maksimum 20 personel, Keşfet öne çıkarma ve VIP destek.'
  }
};

export function getProductById(productId) {
  return AI_CREDIT_CATALOG[productId] || null;
}