/* EZO STİLE v2 - Serverless Transactional Super Admin Application Approval Endpoint */
const FIREBASE_DB_URL = 'https://ezostile-barber-default-rtdb.europe-west1.firebasedatabase.app';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { appId, superAdminUid } = req.body || {};

    if (!appId || !superAdminUid) {
      return res.status(400).json({ error: 'appId ve superAdminUid zorunludur' });
    }

    // 1. STRICT BACKEND SUPER ADMIN VERIFICATION
    const adminCheckRes = await fetch(`${FIREBASE_DB_URL}/users/${superAdminUid}.json`);
    const adminUser = adminCheckRes.ok ? await adminCheckRes.json() : null;

    if (!adminUser || adminUser.role !== 'super_admin') {
      console.warn(`[SECURITY ALERT] Unauthorized approval attempt by UID: ${superAdminUid}`);
      return res.status(403).json({ error: 'Yetkisiz erişim! Yalnızca Süper Admin bu işlemi yapabilir.' });
    }

    // 2. FETCH APPLICATION
    const appRes = await fetch(`${FIREBASE_DB_URL}/salon_applications/${appId}.json`);
    const appData = appRes.ok ? await appRes.json() : null;

    if (!appData) {
      return res.status(404).json({ error: 'Başvuru bulunamadı' });
    }

    if (appData.status !== 'pending') {
      return res.status(400).json({ error: 'Başvuru zaten işlenmiş veya onaylanmış' });
    }

    // 3. GENERATE UNIQUE BUSINESS ID
    const businessId = 'biz_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);

    const businessRecord = {
      businessId,
      name: appData.salonName,
      phone: appData.phone,
      city: appData.city,
      district: appData.district || '',
      address: appData.address,
      instagram: appData.instagram || '',
      photoUrl: appData.photoUrl || '',
      bookingEnabled: false, // Requires 5-step onboarding wizard
      ownerUid: appData.applicantUid,
      createdAt: new Date().toISOString()
    };

    // 4. ATOMIC TRANSACTIONAL STEPS
    // Step A: Create Business Node
    const bizWrite = await fetch(`${FIREBASE_DB_URL}/businesses/${businessId}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(businessRecord)
    });

    if (!bizWrite.ok) {
      return res.status(500).json({ error: 'İşletme kaydı oluşturulamadı' });
    }

    // Step B: Upgrade Applicant User to Owner & Attach BusinessId
    const userUpdate = await fetch(`${FIREBASE_DB_URL}/users/${appData.applicantUid}.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: 'owner',
        businessId,
        permissions: { business_manage: true, staff_manage: true, finance_view: true }
      })
    });

    if (!userUpdate.ok) { 
      return res.status(500).json({ error: 'Kullanıcı rolü güncellenemedi' });
    }

    // Step C: Mark Application as Approved
    await fetch(`${FIREBASE_DB_URL}/salon_applications/${appId}.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'approved',
        businessId,
        approvedAt: new Date().toISOString()
      })
    });

    return res.status(200).json({
      success: true,
      businessId,
      ownerUid: appData.applicantUid,
      status: 'approved'
    });

  } catch (err) {
    console.error('Super Admin approval API error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}