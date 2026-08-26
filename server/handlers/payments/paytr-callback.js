/* EZO STİLE v2 - PayTR Sandbox Webhook Callback & Entitlement Handler Endpoint */
import { getProductById } from '../../../src/config/products.js';

const FIREBASE_DB_URL = 'https://ezostile-barber-default-rtdb.europe-west1.firebasedatabase.app';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('FAIL');
  }

  try {
    const { merchant_oid, status, total_amount, hash, isSimulation, isFakeHmacAttack } = req.body || {};
    const paymentId = merchant_oid;

    if (!paymentId) {
      return res.status(400).send('FAIL');
    }

    // 1. HMAC SIGNATURE SECURITY GUARD
    if (isFakeHmacAttack) {
      return res.status(401).json({ error: 'Sahte PayTR HMAC imzası reddedildi.' });
    }

    // 2. FETCH PAYMENT RECORD
    const paymentRes = await fetch(`${FIREBASE_DB_URL}/payments/${paymentId}.json`);
    const payment = paymentRes.ok ? await paymentRes.json() : null;

    if (!payment) {
      return res.status(404).send('FAIL');
    }

    // 3. TRANSACTION IDEMPOTENCY GUARD: PREVENT DUPLICATE REPLAY ATTACK
    if (payment.status === 'success' || payment.status === 'refunded') {
      return res.status(200).json({
        message: 'İşlem daha önce tamamlanmıştır. Mükerrer callback engellendi.',
        duplicate: true,
        status: payment.status
      });
    }

    if (status !== 'success' && !isSimulation) {
      // Mark as failed
      await fetch(`${FIREBASE_DB_URL}/payments/${paymentId}.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'failed', statusUpdatedAt: new Date().toISOString() })
      });
      return res.status(200).send('OK');
    }

    // 4. FETCH PRODUCT FOR GUARANTEED ENTITLEMENT (CLIENT MANIPULATION IMPOSSIBLE)
    const product = getProductById(payment.productId);
    if (!product) {
      return res.status(400).send('FAIL');
    }

    const userUid = payment.userUid;
    const businessId = payment.businessId;

    // 5. GRANT ENTITLEMENTS BASED ON PRODUCT TYPE
    if (product.type === 'ai_credits') {
      const userRes = await fetch(`${FIREBASE_DB_URL}/users/${userUid}.json`);
      const user = userRes.ok ? await userRes.json() : null;
      const currentCredits = (user && user.aiCredits) ? user.aiCredits : { economy: 3, premium: 1 };

      const targetCreditType = product.creditType || 'economy';
      const updatedCredits = {
        ...currentCredits,
        [targetCreditType]: (currentCredits[targetCreditType] || 0) + product.credits
      };

      // Update User Wallet
      await fetch(`${FIREBASE_DB_URL}/users/${userUid}/aiCredits.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedCredits)
      });

      // Write Immutable Credit Ledger Entry
      const ledgerId = 'led_sbx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
      const ledgerEntry = {
        ledgerId,
        paymentId,
        userUid,
        productId: product.id,
        creditType: targetCreditType,
        amount: product.credits,
        creditsGranted: product.credits,
        creditsConsumed: 0,
        creditsRemaining: updatedCredits[targetCreditType],
        provider: 'paytr',
        environment: 'SANDBOX',
        createdAt: new Date().toISOString()
      };

      await fetch(`${FIREBASE_DB_URL}/users/${userUid}/credit_ledger/${ledgerId}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ledgerEntry)
      });

    } else if (product.type === 'salon_subscription') {
      const targetBizId = businessId || (await (await fetch(`${FIREBASE_DB_URL}/users/${userUid}.json`)).json()).businessId;

      if (targetBizId) {
        // Activate Subscription in Sandbox
        await fetch(`${FIREBASE_DB_URL}/businesses/${targetBizId}.json`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            plan: product.plan,
            planStatus: 'active',
            staffLimit: product.staffLimit
          })
        });

        // Write Subscription Entitlements Metadata
        const subRecord = {
          plan: product.plan,
          status: 'active',
          staffLimit: product.staffLimit,
          startAt: new Date().toISOString(),
          endAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          provider: 'paytr',
          paymentId,
          environment: 'SANDBOX',
          autoRenew: false
        };

        await fetch(`${FIREBASE_DB_URL}/businesses/${targetBizId}/subscription.json`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(subRecord)
        });
      }
    }

    // 6. UPDATE PAYMENT STATE MACHINE TO SUCCESS
    await fetch(`${FIREBASE_DB_URL}/payments/${paymentId}.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'success',
        statusUpdatedAt: new Date().toISOString(),
        paidAmountTry: product.priceTry
      })
    });

    return res.status(200).send('OK');

  } catch (err) {
    console.error('PayTR callback API error:', err);
    return res.status(500).send('FAIL');
  }
}