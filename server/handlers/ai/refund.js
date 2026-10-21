import { getAdminDatabase, transactionWithCurrentValue } from '../../firebase-admin.js';
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  const { generationId, userUid, reason } = req.body || {};
  if (!generationId || !/^[a-zA-Z0-9_-]+$/.test(generationId) || !userUid) return res.status(400).json({ error: 'Geçerli generationId ve userUid zorunludur.' });
  if (!req.auth || req.auth.uid !== userUid) return res.status(403).json({ error: 'Kimlik eşleşmiyor.' });
  try {
    const db = getAdminDatabase();
    const generationRef = db.ref('ai_generations/' + generationId);
    const genRecord = (await generationRef.get()).val();
    if (!genRecord) return res.status(404).json({ error: 'AI üretimi kaydı bulunamadı.' });
    if (genRecord.userUid !== req.auth.uid) return res.status(403).json({ error: 'AI kaydı bu kullanıcıya ait değil.' });
    if (genRecord.status !== 'failed') return res.status(409).json({ error: 'Bu üretim iade için uygun değil.' });
    if (genRecord.refundGranted) return res.status(400).json({ error: 'Bu işlem için kredi iadesi yapılmıştır.' });
    const creditType = genRecord.creditType || 'economy';
    if (!['economy','premium'].includes(creditType)) return res.status(409).json({ error: 'Kredi türü geçersiz.' });
    // A durable per-user marker and balance change commit together. Retrying after
    // a failed telemetry update cannot grant a second credit.
    const result = await transactionWithCurrentValue(db.ref('users/' + userUid), user => {
      if (!user || user.aiRefunds?.[generationId]) return;
      const credits = user.aiCredits || { economy:0, premium:0 };
      return { ...user, aiCredits:{ ...credits, [creditType]:(Number(credits[creditType]) || 0) + 1 }, aiRefunds:{ ...user.aiRefunds, [generationId]:true } };
    });
    if (!result.snapshot.exists()) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
    await generationRef.update({ refundGranted:true, refundReason:String(reason || 'Başarısız üretim').slice(0,300), refundedAt:new Date().toISOString() });
    if (!result.committed) return res.status(400).json({ error:'Bu işlem için kredi iadesi yapılmıştır.' });
    return res.status(200).json({ success:true, generationId, refundedCreditType:creditType, updatedCredits:result.snapshot.val().aiCredits });
  } catch (error) { return res.status(500).json({ error:'Kredi iadesi kaydedilemedi.' }); }
}
