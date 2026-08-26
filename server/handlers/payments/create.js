/* EZO STİLE v2 - Unified Sandbox Payment Initialization Endpoint */
import { getProductById } from '../../../src/config/products.js';

const FIREBASE_DB_URL = 'https://ezostile-barber-default-rtdb.europe-west1.firebasedatabase.app';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { userUid, productId, platform, businessId } = req.body || {};

    if (!userUid || !productId) {
      return res.status(400).json({ error: 'userUid ve productId zorunludur' });
    }

    // 1. BACKEND SINGLE SOURCE CATALOG LOOKUP (CLIENT PRICE IGNORED)
    const product = getProductById(productId);
    if (!product) {
      return res.status(404).json({ error: 'Geçersiz veya bulunamayan ürün ID' });
    }

    const paymentId = 'pay_sbx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const targetPlatform = (platform || 'web').toLowerCase();

    // 2. CREATE PAYMENT STATE RECORD (State: created, Environment: SANDBOX)
    const paymentRecord = {
      paymentId,
      userUid,
      businessId: businessId || null,
      productId: product.id,
      productType: product.type,
      productName: product.name,
      officialPriceTry: product.priceTry,
      creditsGranted: product.credits || 0,
      creditType: product.creditType || null,
      plan: product.plan || null,
      platform: targetPlatform,
      status: 'created',
      environment: 'SANDBOX',
      createdAt: new Date().toISOString()
    };

    await fetch(`${FIREBASE_DB_URL}/payments/${paymentId}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(paymentRecord)
    });

    return res.status(200).json({
      success: true,
      paymentId,
      merchantOid: paymentId,
      environment: 'SANDBOX',
      platform: targetPlatform,
      product: {
        id: product.id,
        name: product.name,
        officialPriceTry: product.priceTry,
        type: product.type
      },
      checkoutUrl: `https://www.paytr.com/odeme/sandbox/${paymentId}`
    });

  } catch (err) {
    console.error('Payment create API error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}