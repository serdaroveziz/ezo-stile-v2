import { firebaseFetchChecked as firebaseFetch } from '../../firebase-admin.js';
/* UNELIVO - Super Admin User Disable & Reactivation Endpoint */
import { writeAuditLog } from '../audit/log.js';
import { getAdminAuth, getAdminDatabase } from '../../firebase-admin.js';
import { hardDeleteUser } from '../../user-hard-delete.js';

const FIREBASE_DB_URL = 'https://ezostile-barber-default-rtdb.europe-west1.firebasedatabase.app';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { targetUid, action, superAdminUid } = req.body || {};
    const actorUid = req.auth?.uid;

    if (!targetUid || !action || !actorUid) {
      return res.status(400).json({ error: 'targetUid ve action zorunludur' });
    }
    if (typeof targetUid !== 'string' || targetUid.length > 128 || /[.#$\[\]\/\u0000-\u001f\u007f]/.test(targetUid)) return res.status(400).json({ error: 'INVALID_UID' });

    if (action !== 'disable' && action !== 'enable' && action !== 'delete') {
      return res.status(400).json({ error: 'Geçersiz işlem' });
    }
    if (superAdminUid && superAdminUid !== actorUid) return res.status(403).json({ error: 'İstek kimliği doğrulanmış oturumla eşleşmiyor.' });
    if (targetUid === actorUid) return res.status(400).json({ error: 'Kendi hesabınızı bu ekrandan silemezsiniz.' });

    // 1. VERIFY SUPER ADMIN AUTHORIZATION
    const adminCheckRes = await firebaseFetch(`${FIREBASE_DB_URL}/users/${actorUid}.json`);
    const adminUser = adminCheckRes.ok ? await adminCheckRes.json() : null;

    if (!adminUser || adminUser.role !== 'super_admin') {
      return res.status(403).json({ error: 'Yetkisiz erişim! Yalnızca Süper Admin kullanıcı durumunu değiştirebilir.' });
    }

    if (action === 'delete') {
      const result = await hardDeleteUser({ db: getAdminDatabase(), auth: getAdminAuth(), actorUid, targetUid });
      // Do not write a fresh target UID to audit after erasing it.
      return res.status(200).json(result);
    }

    // 2. FETCH TARGET USER
    const userRes = await firebaseFetch(`${FIREBASE_DB_URL}/users/${targetUid}.json`);
    const targetUser = userRes.ok ? await userRes.json() : null;

    if (!targetUser) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }

    if (targetUser.role === 'super_admin') {
      return res.status(403).json({ error: 'Süper Admin hesapları bu ekrandan silinemez.' });
    }

    const now = new Date().toISOString();
    const newStatus = action === 'disable' ? 'disabled' : 'active';

    // 3. UPDATE USER STATUS IN DB (Role remains untouched)
    const updateRes = await firebaseFetch(`${FIREBASE_DB_URL}/users/${targetUid}.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: newStatus,
        disabled: action === 'disable',
        statusUpdatedAt: now
      })
    });

    if (!updateRes.ok) {
      return res.status(500).json({ error: 'Kullanıcı durumu güncellenemedi' });
    }

    // 4. WRITE AUDIT LOG
    await writeAuditLog({
      actorUid,
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
    return res.status(err.statusCode || 500).json({ error: err.statusCode ? err.message : 'USER_OPERATION_FAILED_RETRY' });
  }
}
