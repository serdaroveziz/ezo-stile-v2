/* EZO STİLE v2 - Staff Creation Endpoint with Subscription Tier Entitlement Enforcement */
import { getStaffLimitForPlan } from '../../../src/config/subscriptions.js';

const FIREBASE_DB_URL = 'https://ezostile-barber-default-rtdb.europe-west1.firebasedatabase.app';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { businessId, ownerUid, staffName, staffRole, services } = req.body || {};

    if (!businessId || !ownerUid || !staffName) {
      return res.status(400).json({ error: 'businessId, ownerUid ve staffName zorunludur' });
    }

    // 1. FETCH BUSINESS PROFILE & PLAN
    const bizRes = await fetch(`${FIREBASE_DB_URL}/businesses/${businessId}.json`);
    const biz = bizRes.ok ? await bizRes.json() : null;

    if (!biz) {
      return res.status(404).json({ error: 'Salon bulunamadı' });
    }

    if (biz.ownerUid !== ownerUid) {
      const ownerRes = await fetch(`${FIREBASE_DB_URL}/users/${ownerUid}.json`);
      const owner = ownerRes.ok ? await ownerRes.json() : null;
      if (!owner || owner.role !== 'super_admin') {
        return res.status(403).json({ error: 'Bu işlem için yetkiniz bulunmamaktadır.' });
      }
    }

    const currentPlan = biz.plan || 'FREE';
    const staffLimit = biz.staffLimit || getStaffLimitForPlan(currentPlan);

    // 2. FETCH EXISTING STAFF COUNT
    const staffRes = await fetch(`${FIREBASE_DB_URL}/businesses/${businessId}/staff.json`);
    const existingStaffMap = staffRes.ok ? await staffRes.json() : {};
    const existingStaffCount = existingStaffMap ? Object.keys(existingStaffMap).length : 0;

    // 3. BACKEND SUBSCRIPTION ENTITLEMENT GUARD
    if (existingStaffCount >= staffLimit) {
      return res.status(403).json({
        error: `Personel ekleme limiti aşıldı! Mevcut paketiniz (${currentPlan}) maksimum ${staffLimit} personel eklemenize izin vermektedir. Lütfen üst pakete yükseltin.`,
        currentPlan,
        staffLimit,
        existingStaffCount
      });
    }

    // 4. CREATE NEW STAFF
    const staffId = 'stf_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const newStaff = {
      id: staffId,
      displayName: staffName,
      role: staffRole || 'barber',
      active: true,
      services: services || [],
      createdAt: new Date().toISOString()
    };

    await fetch(`${FIREBASE_DB_URL}/businesses/${businessId}/staff/${staffId}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newStaff)
    });

    return res.status(200).json({
      success: true,
      businessId,
      staff: newStaff,
      currentPlan,
      staffCount: existingStaffCount + 1,
      staffLimit
    });

  } catch (err) {
    console.error('Add staff API error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}