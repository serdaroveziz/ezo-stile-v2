/* EZO STİLE v2 - Super Admin User Disable & Reactivation Endpoint */
import { writeAuditLog } from '../audit/log.js';

const FIREBASE_DB_URL = 'https://ezostile-barber-default-rtdb.europe-west1.firebasedatabase.app';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { targetUid, action, superAdminUid } = req.body || {};

    if (!targetUid || !action || !superAdminUid) {
      return res.status(400).json({ error: 'targetUid, action ve superAdminUid zorunludur' });
    }

    if (action !== 'disable' && action !== 'enable') {
      return res.status(400).json({ error: 'Geçersiz işlem' });
    }

    // 1. VERIFY SUPER ADMIN AUTHORIZATION
    const adminCheckRes = await fetch(`${FIREBASE_DB_URL}/users/${superAdminUid}.json`);
    const adminUser = adminCheckRes.ok ? await adminCheckRes.json() : null;

    if (!adminUser || adminUser.role !== 'super_admin') {
      return res.status(403).json({ error: 'Yetkisiz erişim! Yalnızca Süper Admin kullanıcı durumunu değiştirebilir.' });
    }

    // 2. FETCH TARGET USER
    const userRes = await fetch(`${FIREBASE_DB_URL}/users/${targetUid}.json`);
    const targetUser = userRes.ok ? await userRes.json() : null;

    if (!targetUser) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }

    const newStatus = action === 'disable' ? 'disabled' : 'active';

    // 3. UPDATE USER STATUS IN DB (Role remains untouched)
    const updateRes = await fetch(`${FIREBASE_DB_URL}/users/${targetUid}.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: newStatus,
        statusUpdatedAt: new Date().toISOString()
      })
    });

    if (!updateRes.ok) {
      return res.status(500).json({ error: 'Kullanıcı durumu güncellenemedi' });
    }

    // 4. WRITE AUDIT LOG
    await writeAuditLog({
      actorUid: superAdminUid,
      actorRole: 'super_admin',
      action: action === 'disable' ? 'user.disabled' : 'user.reactivated',
      targetType: 'user',
      targetId: targetUid,
      businessId: targetUser.businessId || null,
      metadata: { targetRole: targetUser.role }
    });

    return res.status(200).json({
      success: true,
      targetUid,
      status: newStatus
    });

  } catch (err) {
    console.error('Toggle user status error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}