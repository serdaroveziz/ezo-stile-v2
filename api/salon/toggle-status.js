/* EZO STİLE v2 - Super Admin Salon Suspension & Reactivation Endpoint */
import { writeAuditLog } from '../audit/log.js';

const FIREBASE_DB_URL = 'https://ezostile-barber-default-rtdb.europe-west1.firebasedatabase.app';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { businessId, action, superAdminUid, reason } = req.body || {};

    if (!businessId || !action || !superAdminUid) {
      return res.status(400).json({ error: 'businessId, action ve superAdminUid zorunludur' });
    }

    if (action !== 'suspend' && action !== 'reactivate') {
      return res.status(400).json({ error: 'Geçersiz işlem. Sadece suspend veya reactivate kullanılabilir.' });
    }

    // 1. VERIFY CALLER IS SUPER ADMIN STRICTLY IN DB
    const adminCheckRes = await fetch(`${FIREBASE_DB_URL}/users/${superAdminUid}.json`);
    const adminUser = adminCheckRes.ok ? await adminCheckRes.json() : null;

    if (!adminUser || adminUser.role !== 'super_admin') {
      console.warn(`[SECURITY ALERT] Unauthorized salon status update attempt by UID: ${superAdminUid}`);
      return res.status(403).json({ error: 'Yetkisiz erişim! Yalnızca Süper Admin bu işlemi yapabilir.' });
    }

    // 2. FETCH BUSINESS RECORD
    const bizRes = await fetch(`${FIREBASE_DB_URL}/businesses/${businessId}.json`);
    const biz = bizRes.ok ? await bizRes.json() : null;

    if (!biz) {
      return res.status(404).json({ error: 'Salon bulunamadı' });
    }

    const newStatus = action === 'suspend' ? 'suspended' : 'active';

    // 3. UPDATE BUSINESS STATUS IN DB
    const updateRes = await fetch(`${FIREBASE_DB_URL}/businesses/${businessId}.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: newStatus,
        suspensionReason: action === 'suspend' ? (reason || 'Süper Admin tarafından askıya alındı') : null,
        statusUpdatedAt: new Date().toISOString()
      })
    });

    if (!updateRes.ok) {
      return res.status(500).json({ error: 'Salon durumu güncellenemedi' });
    }

    // 4. WRITE AUDIT LOG
    await writeAuditLog({
      actorUid: superAdminUid,
      actorRole: 'super_admin',
      action: action === 'suspend' ? 'salon.suspended' : 'salon.reactivated',
      targetType: 'business',
      targetId: businessId,
      businessId,
      metadata: { reason: reason || 'Platform yönetimi' }
    });

    return res.status(200).json({
      success: true,
      businessId,
      status: newStatus
    });

  } catch (err) {
    console.error('Toggle salon status error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}