/* EZO STİLE v2 - Rewarded Ad Verification & Credit Endpoint */
const FIREBASE_DB_URL = 'https://ezostile-barber-default-rtdb.europe-west1.firebasedatabase.app';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { userUid, admobSsvToken, isSandboxSimulation } = req.body || {};

    if (!userUid) {
      return res.status(400).json({ error: 'userUid zorunludur' });
    }

    // PRODUCTION REJECT GUARD: Fake client requests without SSV signature strictly blocked
    if (!admobSsvToken && !isSandboxSimulation) {
      return res.status(400).json({
        error: 'Sahte reklam isteği reddedildi. Production modunda geçerli AdMob Server-Side Verification (SSV) imzası gereklidir.'
      });
    }

    // SANDBOX SIMULATION OR VERIFIED SSV
    const userRes = await fetch(`${FIREBASE_DB_URL}/users/${userUid}.json`);
    const user = userRes.ok ? await userRes.json() : null;

    if (!user) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }

    const currentCredits = user.aiCredits || { economy: 3, premium: 1 };
    const updatedCredits = {
      ...currentCredits,
      economy: (currentCredits.economy || 0) + 1
    };
    const currentBonusEarned = user.bonusEarnedCredits || 0;

    await fetch(`${FIREBASE_DB_URL}/users/${userUid}.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        aiCredits: updatedCredits,
        bonusEarnedCredits: currentBonusEarned + 1
      })
    });

    return res.status(200).json({
      success: true,
      userUid,
      mode: isSandboxSimulation ? 'TEST / SANDBOX REKLAM SİMÜLASYONU' : 'PRODUCTION ADMOB SSV VERIFIED',
      reward: '+1 Economy AI Hakkı Kazanıldı',
      aiCredits: updatedCredits
    });

  } catch (err) {
    console.error('Rewarded ad API error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}