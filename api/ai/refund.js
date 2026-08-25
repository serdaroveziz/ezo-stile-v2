/* EZO STİLE v2 - Idempotent AI Credit Refund Endpoint */
const FIREBASE_DB_URL = 'https://ezostile-barber-default-rtdb.europe-west1.firebasedatabase.app';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { generationId, userUid, reason } = req.body || {};

    if (!generationId || !userUid) {
      return res.status(400).json({ error: 'generationId ve userUid zorunludur' });
    }

    // 1. FETCH GENERATION RECORD
    const genRes = await fetch(`${FIREBASE_DB_URL}/ai_generations/${generationId}.json`);
    const genRecord = genRes.ok ? await genRes.json() : null;

    if (!genRecord) {
      return res.status(404).json({ error: 'AI üretimi kaydı bulunamadı' });
    }

    // 2. IDEMPOTENCY GUARD: CHECK IF REFUND ALREADY GRANTED
    if (genRecord.refundGranted) {
      return res.status(400).json({ error: 'Bu işlem için daha önce kredi iadesi yapılmıştır. İkinci iade engellendi.' });
    }

    const creditType = genRecord.creditType || 'economy';

    // 3. FETCH USER & RESTORE CREDIT
    const userRes = await fetch(`${FIREBASE_DB_URL}/users/${userUid}.json`);
    const user = userRes.ok ? await userRes.json() : null;

    if (!user) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }

    const currentCredits = user.aiCredits || { economy: 3, premium: 1 };
    const updatedCredits = {
      ...currentCredits,
      [creditType]: (currentCredits[creditType] || 0) + 1
    };

    await fetch(`${FIREBASE_DB_URL}/users/${userUid}/aiCredits.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedCredits)
    });

    // 4. MARK GENERATION AS REFUNDED
    await fetch(`${FIREBASE_DB_URL}/ai_generations/${generationId}.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        refundGranted: true,
        refundReason: reason || 'İstek üzerine iade',
        refundedAt: new Date().toISOString()
      })
    });

    return res.status(200).json({
      success: true,
      generationId,
      refundedCreditType: creditType,
      updatedCredits
    });

  } catch (err) {
    console.error('AI refund API error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}