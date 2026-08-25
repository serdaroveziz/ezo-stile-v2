/* EZO STİLE v2 - New User Welcome AI Bonus Endpoint (+3 Economy Credits, Strictly Idempotent) */
const FIREBASE_DB_URL = 'https://ezostile-barber-default-rtdb.europe-west1.firebasedatabase.app';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { userUid } = req.body || {};

    if (!userUid) {
      return res.status(400).json({ error: 'userUid zorunludur' });
    }

    // 1. FETCH USER PROFILE
    const userRes = await fetch(`${FIREBASE_DB_URL}/users/${userUid}.json`);
    const user = userRes.ok ? await userRes.json() : null;

    if (!user) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }

    // 2. IDEMPOTENCY CHECK
    if (user.welcomeAiBonusGranted) {
      return res.status(400).json({
        error: 'Hoş geldin AI bonusu bu hesap tarafından daha önce alınmıştır.',
        welcomeAiBonusGranted: true
      });
    }

    // 3. GRANT +3 ECONOMY CREDITS ATOMICALLY
    const currentCredits = user.aiCredits || { economy: 0, premium: 1 };
    const updatedCredits = {
      ...currentCredits,
      economy: (currentCredits.economy || 0) + 3
    };
    const currentBonusEarned = user.bonusEarnedCredits || 0;

    await fetch(`${FIREBASE_DB_URL}/users/${userUid}.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        aiCredits: updatedCredits,
        welcomeAiBonusGranted: true,
        welcomeAiBonusGrantedAt: new Date().toISOString(),
        bonusEarnedCredits: currentBonusEarned + 3
      })
    });

    return res.status(200).json({
      success: true,
      userUid,
      bonusGranted: 3,
      aiCredits: updatedCredits
    });

  } catch (err) {
    console.error('Welcome bonus API error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}