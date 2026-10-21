import { getAdminDatabase, transactionWithCurrentValue } from '../../firebase-admin.js';
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  const uid = req.auth?.uid;
  if (!uid || (req.body?.userUid && req.body.userUid !== uid)) return res.status(403).json({ error: 'Kimlik eşleşmiyor.' });
  try {
    const result = await transactionWithCurrentValue(getAdminDatabase().ref('users/' + uid), user => {
      if (!user || user.welcomeAiBonusGranted) return;
      const credits = user.aiCredits || { economy: 0, premium: 1 };
      return { ...user, aiCredits: { ...credits, economy: (Number(credits.economy) || 0) + 3 }, welcomeAiBonusGranted: true, welcomeAiBonusGrantedAt: new Date().toISOString(), bonusEarnedCredits: (Number(user.bonusEarnedCredits) || 0) + 3 };
    });
    if (!result.committed) return res.status(result.snapshot.exists() ? 400 : 404).json({ error: 'Bonus daha önce alınmış veya kullanıcı bulunamadı.', welcomeAiBonusGranted: Boolean(result.snapshot.val()?.welcomeAiBonusGranted) });
    return res.status(200).json({ success: true, userUid: uid, bonusGranted: 3, aiCredits: result.snapshot.val().aiCredits });
  } catch (error) { return res.status(500).json({ error: 'Bonus kaydedilemedi.' }); }
}
