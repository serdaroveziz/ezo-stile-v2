/* EZO STİLE v2 - Super Admin Discovery Visibility Control Endpoint */
import { writeAuditLog } from '../audit/log.js';

const FIREBASE_DB_URL = 'https://ezostile-barber-default-rtdb.europe-west1.firebasedatabase.app';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { businessId, hiddenFromDiscovery, superAdminUid } = req.body || {};

    if (!businessId || hiddenFromDiscovery === undefined || !superAdminUid) {
      return res.status(400).json({ error: 'businessId, hiddenFromDiscovery ve superAdminUid zorunludur' });
    }

    // 1. VERIFY SUPER ADMIN
    const adminCheckRes = await fetch(`${FIREBASE_DB_URL}/users/${superAdminUid}.json`);
    const adminUser = adminCheckRes.ok ? await adminCheckRes.json() : null;

    if (!adminUser || adminUser.role !== 'super_admin') {
      return res.status(403).json({ error: 'Yetkisiz erişim! Yalnızca Süper Admin keşfet görünürlüğünü değiştirebilir.' });
    }

    // 2. UPDATE BUSINESS RECORD
    await fetch(`${FIREBASE_DB_URL}/businesses/${businessId}.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hiddenFromDiscovery: Boolean(hiddenFromDiscovery) })
    });

    // 3. AUDIT LOG
    await writeAuditLog({
      actorUid: superAdminUid,
      actorRole: 'super_admin',
      action: hiddenFromDiscovery ? 'salon.hidden_from_discovery' : 'salon.restored_to_discovery',
      targetType: 'business',
      targetId: businessId,
      businessId
    });

    return res.status(200).json({
      success: true,
      businessId,
      hiddenFromDiscovery: Boolean(hiddenFromDiscovery)
    });

  } catch (err) {
    console.error('Toggle discovery error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}