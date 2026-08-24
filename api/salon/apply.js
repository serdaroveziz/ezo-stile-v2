/* EZO STİLE v2 - Serverless Salon Application Ingestion Endpoint */
const FIREBASE_DB_URL = 'https://ezostile-barber-default-rtdb.europe-west1.firebasedatabase.app';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { salonName, phone, city, district, address, instagram, photoUrl, applicantUid } = req.body || {};

    if (!salonName || !phone || !city || !address || !applicantUid) {
      return res.status(400).json({ error: 'Zorunlu alanlar eksik' });
    }

    const appId = 'app_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const applicationRecord = {
      appId,
      salonName,
      phone,
      city,
      district: district || '',
      address,
      instagram: instagram || '',
      photoUrl: photoUrl || '',
      applicantUid,
      status: 'pending', // Hardcoded status - client cannot send 'approved'
      createdAt: new Date().toISOString()
    };

    const saveRes = await fetch(`${FIREBASE_DB_URL}/salon_applications/${appId}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(applicationRecord)
    });

    if (!saveRes.ok) {
      return res.status(500).json({ error: 'Veritabanı kayıt hatası' });
    }

    return res.status(200).json({
      success: true,
      appId,
      status: 'pending'
    });

  } catch (err) {
    console.error('Salon application error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}