/* EZO STİLE v2 - Payment Status Query Endpoint with Security Isolation */
const FIREBASE_DB_URL = 'https://ezostile-barber-default-rtdb.europe-west1.firebasedatabase.app';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { paymentId, callerUid } = req.body || {};

    if (!paymentId || !callerUid) {
      return res.status(400).json({ error: 'paymentId ve callerUid zorunludur' });
    }

    // 1. FETCH PAYMENT RECORD
    const paymentRes = await fetch(`${FIREBASE_DB_URL}/payments/${paymentId}.json`);
    const payment = paymentRes.ok ? await paymentRes.json() : null;

    if (!payment) {
      return res.status(404).json({ error: 'Ödeme kaydı bulunamadı' });
    }

    // 2. AUTHORIZATION GUARD FOR CALLER
    const callerRes = await fetch(`${FIREBASE_DB_URL}/users/${callerUid}.json`);
    const caller = callerRes.ok ? await callerRes.json() : null;

    const isOwnerOfPayment = callerUid === payment.userUid;
    const isSuperAdmin = caller && caller.role === 'super_admin';

    if (!isOwnerOfPayment && !isSuperAdmin) {
      console.warn(`[SECURITY ALERT] User UID ${callerUid} attempted reading Payment ID ${paymentId} owned by ${payment.userUid}!`);
      return res.status(403).json({ error: 'Başka bir kullanıcının ödeme kaydını okuyamazsınız.' });
    }

    return res.status(200).json({
      success: true,
      payment
    });

  } catch (err) {
    console.error('Payment status API error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}