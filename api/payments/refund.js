/* EZO STİLE v2 - Sandbox Payment Refund & Entitlements Revocation Endpoint */
import { getProductById } from '../../src/config/products.js';

const FIREBASE_DB_URL = 'https://ezostile-barber-default-rtdb.europe-west1.firebasedatabase.app';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { paymentId, superAdminUid, reason } = req.body || {};

    if (!paymentId || !superAdminUid) {
      return res.status(400).json({ error: 'paymentId ve superAdminUid zorunludur' });
    }

    // 1. SUPER ADMIN AUTHORIZATION GUARD
    const adminRes = await fetch(`${FIREBASE_DB_URL}/users/${superAdminUid}.json`);
    const admin = adminRes.ok ? await adminRes.json() : null;

    if (!admin || admin.role !== 'super_admin') {
      return res.status(403).json({ error: 'İade işlemi için Süper Admin yetkisi gereklidir.' });
    }

    // 2. FETCH PAYMENT RECORD
    const paymentRes = await fetch(`${FIREBASE_DB_URL}/payments/${paymentId}.json`);
    const payment = paymentRes.ok ? await paymentRes.json() : null;

    if (!payment) {
      return res.status(404).json({ error: 'Ödeme kaydı bulunamadı' });
    }

    if (payment.status !== 'success') {
      return res.status(400).json({ error: `Yalnızca 'success' durumundaki ödemeler iade edilebilir. Mevcut durum: ${payment.status}` });
    }

    const product = getProductById(payment.productId);
    const userUid = payment.userUid;
    const businessId = payment.businessId;

    // 3. REVOKE ENTITLEMENTS SAFELY
    if (product && product.type === 'ai_credits') {
      const userRes = await fetch(`${FIREBASE_DB_URL}/users/${userUid}.json`);
      const user = userRes.ok ? await userRes.json() : null;

      if (user && user.aiCredits) {
        const targetType = product.creditType || 'economy';
        const currentBalance = user.aiCredits[targetType] || 0;
        const grantedAmount = payment.creditsGranted || product.credits || 0;

        // Revoke granted credits, ensuring balance never drops below 0
        const revokedBalance = Math.max(0, currentBalance - grantedAmount);
        const updatedCredits = {
          ...user.aiCredits,
          [targetType]: revokedBalance
        };

        await fetch(`${FIREBASE_DB_URL}/users/${userUid}/aiCredits.json`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedCredits)
        });

        // Write Refund Ledger Record
        const ledgerId = 'led_ref_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
        const refundLedger = {
          ledgerId,
          paymentId,
          userUid,
          productId: product.id,
          creditType: targetType,
          amount: -grantedAmount,
          creditsGranted: 0,
          creditsRemaining: revokedBalance,
          provider: payment.provider || 'paytr',
          environment: 'SANDBOX',
          refundReason: reason || 'Süper Admin iadesi',
          createdAt: new Date().toISOString()
        };

        await fetch(`${FIREBASE_DB_URL}/users/${userUid}/credit_ledger/${ledgerId}.json`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(refundLedger)
        });
      }

    } else if (product && product.type === 'salon_subscription') {
      const targetBizId = businessId || (await (await fetch(`${FIREBASE_DB_URL}/users/${userUid}.json`)).json()).businessId;

      if (targetBizId) {
        // Revert Plan back to FREE and staff limit to 1
        await fetch(`${FIREBASE_DB_URL}/businesses/${targetBizId}.json`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            plan: 'FREE',
            planStatus: 'expired',
            staffLimit: 1
          })
        });

        await fetch(`${FIREBASE_DB_URL}/businesses/${targetBizId}/subscription.json`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'cancelled',
            refundedAt: new Date().toISOString()
          })
        });
      }
    }

    // 4. TRANSITION PAYMENT STATE TO REFUNDED
    await fetch(`${FIREBASE_DB_URL}/payments/${paymentId}.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'refunded',
        statusUpdatedAt: new Date().toISOString(),
        refundReason: reason || 'Süper Admin Tarafından İade Edildi'
      })
    });

    return res.status(200).json({
      success: true,
      paymentId,
      status: 'refunded',
      refundReason: reason || 'Süper Admin Tarafından İade Edildi'
    });

  } catch (err) {
    console.error('Payment refund API error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}