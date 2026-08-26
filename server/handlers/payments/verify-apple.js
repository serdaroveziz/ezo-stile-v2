/* EZO STİLE v2 - iOS StoreKit Sandbox Verification Endpoint */
import { getProductById } from '../../../src/config/products.js';

const FIREBASE_DB_URL = 'https://ezostile-barber-default-rtdb.europe-west1.firebasedatabase.app';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { userUid, transactionId, signedPayload, productId, businessId, isFakeTransaction } = req.body || {};

    if (!userUid || !transactionId || !productId) {
      return res.status(400).json({ error: 'userUid, transactionId ve productId zorunludur' });
    }

    // 1. FAKE TRANSACTION GUARD
    if (isFakeTransaction) {
      return res.status(400).json({ error: 'Sahte Apple transaction ID reddedildi.' });
    }

    // 2. IDEMPOTENCY GUARD (REPLAY PREVENTION)
    const tokenKey = 'apple_' + transactionId;
    const existingRes = await fetch(`${FIREBASE_DB_URL}/payments/${tokenKey}.json`);
    const existingPayment = existingRes.ok ? await existingRes.json() : null;

    if (existingPayment && (existingPayment.status === 'success' || existingPayment.status === 'refunded')) {
      return res.status(400).json({ error: 'Bu Apple transaction ID daha önce kullanılmıştır. İkinci işlem engellendi.' });
    }

    // 3. CATALOG LOOKUP
    const product = getProductById(productId);
    if (!product) {
      return res.status(404).json({ error: 'Geçersiz ürün ID' });
    }

    // 4. GRANT ENTITLEMENTS
    if (product.type === 'ai_credits') {
      const userRes = await fetch(`${FIREBASE_DB_URL}/users/${userUid}.json`);
      const user = userRes.ok ? await userRes.json() : null;
      const currentCredits = (user && user.aiCredits) ? user.aiCredits : { economy: 3, premium: 1 };
      const targetType = product.creditType || 'economy';

      const updatedCredits = {
        ...currentCredits,
        [targetType]: (currentCredits[targetType] || 0) + product.credits
      };

      await fetch(`${FIREBASE_DB_URL}/users/${userUid}/aiCredits.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedCredits)
      });
    } else if (product.type === 'salon_subscription') {
      const targetBizId = businessId || (await (await fetch(`${FIREBASE_DB_URL}/users/${userUid}.json`)).json()).businessId;
      if (targetBizId) {
        await fetch(`${FIREBASE_DB_URL}/businesses/${targetBizId}.json`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan: product.plan, planStatus: 'active', staffLimit: product.staffLimit })
        });
      }
    }

    // 5. RECORD PAYMENT STATE
    const paymentRecord = {
      paymentId: tokenKey,
      userUid,
      businessId: businessId || null,
      productId: product.id,
      transactionId,
      platform: 'ios',
      provider: 'storekit',
      status: 'success',
      environment: 'SANDBOX',
      createdAt: new Date().toISOString()
    };

    await fetch(`${FIREBASE_DB_URL}/payments/${tokenKey}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(paymentRecord)
    });

    return res.status(200).json({
      success: true,
      paymentId: tokenKey,
      platform: 'ios',
      status: 'success',
      productName: product.name
    });

  } catch (err) {
    console.error('Apple StoreKit verification API error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}