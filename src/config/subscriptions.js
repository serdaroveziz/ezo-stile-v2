/* EZO STİLE v2 - Salon Subscription Tiers & Entitlements Engine */
export const SALON_SUBSCRIPTION_TIERS = {
  FREE: {
    planKey: 'FREE',
    name: 'FREE (Ücretsiz Başlangıç)',
    staffLimit: 1,
    priceMonthlyTry: 0,
    features: ['1 Çalışan', 'Temel Randevu Altyapısı', 'Temel Salon Profili']
  },
  PRO: {
    planKey: 'PRO',
    name: 'PRO (Büyüyen Salon)',
    staffLimit: 5,
    priceMonthlyTry: 499.00,
    features: ['En fazla 5 Çalışan', 'Gelişmiş İstatistikler', 'AI Referanslı Randevular', 'Gelişmiş Yönetim']
  },
  PREMIUM: {
    planKey: 'PREMIUM',
    name: 'PREMIUM (VIP Zincir Salon)',
    staffLimit: 20,
    priceMonthlyTry: 1299.00,
    features: ['En fazla 20 Çalışan', 'Keşfet Öne Çıkarma', 'Kampanya Araçları', 'Öncelikli Destek']
  }
};

export const SUBSCRIPTION_STATUSES = [
  'free',
  'trial',
  'active',
  'past_due',
  'cancelled',
  'expired'
];

export function getStaffLimitForPlan(planKey = 'FREE') {
  const tier = SALON_SUBSCRIPTION_TIERS[(planKey || 'FREE').toUpperCase()];
  return tier ? tier.staffLimit : 1;
}