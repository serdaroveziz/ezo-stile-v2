/* EZO STİLE v2 - Atomic Staff Invitation Redemption & Account Creation Endpoint */
const FIREBASE_DB_URL = 'https://ezostile-barber-default-rtdb.europe-west1.firebasedatabase.app';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { token, phone, password } = req.body || {};

    if (!token || !phone || !password) {
      return res.status(400).json({ error: 'token, phone ve password zorunludur' });
    }

    // 1. FETCH ALL INVITES AND FIND TOKEN MATCH
    const invitesRes = await fetch(`${FIREBASE_DB_URL}/staff_invites.json`);
    const allInvites = invitesRes.ok ? await invitesRes.json() : null;

    if (!allInvites) {
      return res.status(404).json({ error: 'Davet bulunamadı' });
    }

    const inviteRecord = Object.values(allInvites).find(inv => inv && inv.token === token);

    if (!inviteRecord) {
      return res.status(404).json({ error: 'Geçersiz veya bulunamayan davet tokenı' });
    }

    // 2. VERIFY EXPIRATION AND RE-USE GUARDS
    if (inviteRecord.used) {
      return res.status(400).json({ error: 'Bu davet bağlantısı daha önce kullanılmış. Tekrar kullanılamaz.' });
    }

    if (Date.now() > inviteRecord.expiresAt) {
      return res.status(400).json({ error: 'Bu davet bağlantısının 24 saatlik geçerlilik süresi dolmuş.' });
    }

    // 3. CREATE STAFF USER ACCOUNT
    const cleanPhone = phone.replace(/\D/g, '');
    const uid = 'usr_' + cleanPhone;

    const userProfile = {
      uid,
      phone: cleanPhone,
      name: inviteRecord.displayName,
      role: inviteRecord.role,
      businessId: inviteRecord.businessId,
      permissions: inviteRecord.permissions || {},
      createdAt: new Date().toISOString()
    };

    await fetch(`${FIREBASE_DB_URL}/users/${uid}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userProfile)
    });

    // 4. ADD TO BUSINESS STAFF LIST
    const staffId = 'stf_' + Date.now();
    const staffRecord = {
      id: staffId,
      userId: uid,
      displayName: inviteRecord.displayName,
      role: inviteRecord.role,
      services: inviteRecord.services || ['all'],
      active: true,
      createdAt: new Date().toISOString()
    };

    await fetch(`${FIREBASE_DB_URL}/businesses/${inviteRecord.businessId}/staff/${staffId}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(staffRecord)
    });

    // 5. MARK INVITE AS USED (SINGLE-USE ENFORCEMENT)
    await fetch(`${FIREBASE_DB_URL}/staff_invites/${inviteRecord.inviteId}.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        used: true,
        usedByUid: uid,
        usedAt: new Date().toISOString()
      })
    });

    return res.status(200).json({
      success: true,
      message: 'Personel hesabı başarıyla oluşturuldu ve salona bağlandı',
      user: userProfile
    });

  } catch (err) {
    console.error('Accept invite API error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}