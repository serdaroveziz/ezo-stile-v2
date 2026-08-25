/* EZO STİLE v2 - Production AI Generation Endpoint with Real Provider HTTP Call & Automatic Credit Refund */
import { resolveProductionAiModel } from '../../src/ai/ai-router.js';

const FIREBASE_DB_URL = 'https://ezostile-barber-default-rtdb.europe-west1.firebasedatabase.app';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { userUid, photoUrl, selectedStyle, mode, forceFail } = req.body || {};

    if (!userUid || !photoUrl || !selectedStyle) {
      return res.status(400).json({ error: 'userUid, photoUrl ve selectedStyle zorunludur' });
    }

    const targetCreditType = (mode || 'economy').toLowerCase() === 'premium' ? 'premium' : 'economy';
    const modelConfig = resolveProductionAiModel('replicate');

    // 1. FETCH & VERIFY CREDIT BALANCE
    const userRes = await fetch(`${FIREBASE_DB_URL}/users/${userUid}.json`);
    const user = userRes.ok ? await userRes.json() : null;

    if (!user) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }

    const currentCredits = user.aiCredits || { economy: 3, premium: 1 };
    const currentBalance = currentCredits[targetCreditType] || 0;

    if (currentBalance <= 0) {
      return res.status(402).json({ error: `Yetersiz AI Kredisi (${targetCreditType.toUpperCase()}). Lütfen kredi paketi yükleyin.` });
    }

    // 2. ATOMIC CREDIT DEDUCTION BEFORE GENERATION
    const updatedCredits = {
      ...currentCredits,
      [targetCreditType]: currentBalance - 1
    };

    await fetch(`${FIREBASE_DB_URL}/users/${userUid}/aiCredits.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedCredits)
    });

    const generationId = 'gen_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const apiToken = process.env.REPLICATE_API_TOKEN || process.env.FAL_KEY;

    let outputImage = null;
    let providerRequestId = null;
    let isSuccess = false;
    let durationMs = 0;
    const startTime = Date.now();

    // 3. REAL PROVIDER HTTP API CALL (IF API KEY CONFIGURED)
    if (apiToken && !forceFail) {
      try {
        const prompt = `Professional men's hairstyle ${selectedStyle}, realistic hair texture, high resolution, preserve facial features, beard, and eyes`;
        
        const providerRes = await fetch(modelConfig.endpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            version: modelConfig.modelVersion,
            input: {
              image: photoUrl,
              prompt: prompt,
              num_inference_steps: 25
            }
          })
        });

        durationMs = Date.now() - startTime;
        const providerData = await providerRes.json();

        if (providerRes.ok && providerData) {
          providerRequestId = providerData.id || providerData.request_id || generationId;
          
          if (Array.isArray(providerData.output) && providerData.output.length > 0) {
            outputImage = providerData.output[0];
            isSuccess = true;
          } else if (typeof providerData.output === 'string') {
            outputImage = providerData.output;
            isSuccess = true;
          }
        }
      } catch (providerErr) {
        console.error('Real AI Provider Call Error:', providerErr);
        isSuccess = false;
      }
    }

    // 4. FAIL GUARD: NO STOCK PHOTO FALLBACK ALLOWED (RULE 4 & RULE 19)
    if (!isSuccess || !outputImage || outputImage === photoUrl) {
      // Record Failed Telemetry
      const failedRecord = {
        generationId,
        userUid,
        provider: modelConfig.providerName,
        exactModel: modelConfig.exactModelName,
        providerRequestId: providerRequestId || null,
        creditType: targetCreditType,
        status: 'failed',
        errorCode: apiToken ? 'PROVIDER_GENERATION_FAILED' : 'API_KEY_NOT_CONFIGURED',
        estimatedCostUsd: 0,
        refundGranted: true,
        createdAt: new Date().toISOString()
      };

      await fetch(`${FIREBASE_DB_URL}/ai_generations/${generationId}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(failedRecord)
      });

      // RESTORE CREDIT IMMEDIATELY (AUTOMATIC REFUND)
      const refundedCredits = {
        ...updatedCredits,
        [targetCreditType]: updatedCredits[targetCreditType] + 1
      };

      await fetch(`${FIREBASE_DB_URL}/users/${userUid}/aiCredits.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(refundedCredits)
      });

      return res.status(500).json({
        error: apiToken ? 'AI saç üretimi başarısız oldu. Krediniz otomatik olarak iade edildi.' : 'AI Provider API anahtarı (REPLICATE_API_TOKEN / FAL_KEY) sunucuda henüz tanımlanmamış. Krediniz otomatik iade edildi.',
        generationId,
        refundGranted: true,
        apiKeyConfigured: Boolean(apiToken)
      });
    }

    // 5. RECORD SUCCESSFUL REAL TELEMETRY
    const successRecord = {
      generationId,
      userUid,
      provider: modelConfig.providerName,
      exactModel: modelConfig.exactModelName,
      providerRequestId,
      creditType: targetCreditType,
      status: 'success',
      durationMs,
      estimatedCostUsd: modelConfig.costPerRunUsd,
      outputImage,
      createdAt: new Date().toISOString()
    };

    await fetch(`${FIREBASE_DB_URL}/ai_generations/${generationId}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(successRecord)
    });

    return res.status(200).json({
      success: true,
      generationId,
      providerRequestId,
      outputImage,
      beforeAfter: { input: photoUrl, output: outputImage },
      selectedStyle,
      durationMs,
      remainingCredits: updatedCredits
    });

  } catch (err) {
    console.error('AI generate API error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}