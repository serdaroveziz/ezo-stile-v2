import { getAdminDatabase } from '../../firebase-admin.js';

function formatPersonName(value) {
  return String(value || '').trim().replace(/[<>&"'`]/g, '').replace(/\s+/g, ' ').split(' ')
    .filter(Boolean).map(part => part.charAt(0).toLocaleUpperCase('tr-TR') + part.slice(1).toLocaleLowerCase('tr-TR')).join(' ');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  if (!req.auth || !req.auth.uid) return res.status(401).json({ error: 'Oturum doğrulaması gerekli.' });
  const { displayName, phone } = req.body || {};
  const normalizedName = formatPersonName(displayName);
  const normalizedPhone = String(phone || '').trim();
  if (normalizedName.length < 2 || !/^\+905\d{9}$/.test(normalizedPhone)) {
    return res.status(400).json({ error: 'Geçerli ad soyad ve Türkiye telefon numarası gereklidir.' });
  }
  const ref = getAdminDatabase().ref(`users/${req.auth.uid}`);
  const existing = await ref.get();
  if (existing.exists()) return res.status(409).json({ error: 'Bu Firebase hesabının profili zaten mevcut.' });
  const profile = {
    uid: req.auth.uid,
    phone: normalizedPhone,
    name: normalizedName,
    displayName: normalizedName,
    role: 'customer',
    businessId: null,
    aiCredits: { economy: 3, premium: 1 },
    language: 'tr',
    phoneVerified: false,
    createdAt: new Date().toISOString()
  };
  await ref.set(profile);
  return res.status(201).json({ success: true, user: profile });
}
