/* UNELIVO - Super Admin Discovery Visibility Control Endpoint */
import { writeAuditLog } from '../audit/log.js';
import { firebaseFetch } from '../../firebase-admin.js';
import { syncPublicBusiness } from '../../public-business.js';

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

    if (!req.auth || !req.auth.profile || req.auth.profile.role !== 'super_admin' || req.auth.uid !== superAdminUid) {
      return res.status(403).json({ error: 'Yetkisiz erişim! Yalnızca Süper Admin keşfet görünürlüğünü değiştirebilir.' });
    }

    const beforeRes = await firebaseFetch(`${FIREBASE_DB_URL}/businesses/${businessId}.json`);
    const beforeBusiness = beforeRes.ok ? await beforeRes.json() : null;
    if (!beforeBusiness) return res.status(404).json({ error: 'Salon bulunamadı.' });

    // 2. UPDATE BUSINESS RECORD
    const updateRes = await firebaseFetch(`${FIREBASE_DB_URL}/businesses/${businessId}.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hiddenFromDiscovery: Boolean(hiddenFromDiscovery), discoveryEnabled: !Boolean(hiddenFromDiscovery), discoveryUpdatedAt: new Date().toISOString() })
    });
    if (!updateRes.ok) return res.status(500).json({ error: 'Keşfet görünürlüğü güncellenemedi.' });
    await syncPublicBusiness(businessId);

    // 3. AUDIT LOG
    await writeAuditLog({
      actorUid: superAdminUid,
      actorRole: 'super_admin',
      action: hiddenFromDiscovery ? 'salon.hidden_from_discovery' : 'salon.restored_to_discovery',
      targetType: 'business',
      targetId: businessId,
      businessId,
      metadata: { before: { discoveryEnabled: beforeBusiness.discoveryEnabled, hiddenFromDiscovery: beforeBusiness.hiddenFromDiscovery }, after: { discoveryEnabled: !Boolean(hiddenFromDiscovery), hiddenFromDiscovery: Boolean(hiddenFromDiscovery) } }
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
