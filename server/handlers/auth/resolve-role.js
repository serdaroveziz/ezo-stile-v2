/* EZO STİLE v2 - Serverless Backend Role Resolution API */
const FIREBASE_DB_URL = 'https://ezostile-barber-default-rtdb.europe-west1.firebasedatabase.app';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { uid, phone } = req.body || {};
    if (!uid) {
      return res.status(400).json({ error: 'UID is required' });
    }

    // Fetch user record strictly from DB
    const dbRes = await fetch(`${FIREBASE_DB_URL}/users/${uid}.json`);
    const dbUser = dbRes.ok ? await dbRes.json() : null;

    if (dbUser && dbUser.role) {
      const allowedRoles = ['super_admin', 'owner', 'manager', 'barber', 'receptionist', 'customer'];
      const verifiedRole = allowedRoles.includes(dbUser.role) ? dbUser.role : 'customer';

      return res.status(200).json({
        success: true,
        user: {
          uid,
          phone: dbUser.phone || phone || '',
          name: dbUser.name || 'EZO Kullanıcısı',
          role: verifiedRole,
          businessId: dbUser.businessId || null,
          permissions: dbUser.permissions || {}
        }
      });
    }

    // Initialize new customer profile if absent
    const newCustomer = {
      uid,
      phone: phone || '',
      name: 'Müşteri',
      role: 'customer',
      createdAt: new Date().toISOString()
    };

    await fetch(`${FIREBASE_DB_URL}/users/${uid}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCustomer)
    });

    return res.status(200).json({
      success: true,
      user: newCustomer
    });

  } catch (err) {
    console.error('Role resolution API error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}