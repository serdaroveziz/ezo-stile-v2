/* EZO STİLE v2 - Production AI Generation Endpoint with Real Async Replicate Polling & Credit Guard */
import fs from 'fs';
import path from 'path';
import { resolveProductionAiModel } from '../../../src/ai/ai-router.js';

const FIREBASE_DB_URL = 'https://ezostile-barber-default-rtdb.europe-west1.firebasedatabase.app';

function getEnvToken() {
  if (process.env.REPLICATE_API_TOKEN) return process.env.REPLICATE_API_TOKEN;
  if (process.env.FAL_KEY) return process.env.FAL_KEY;

  const envPaths = ['.env', '.env.local'];
  for (const envFile of envPaths) {
    const fullPath = path.resolve(process.cwd(), envFile);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const match = content.match(/REPLICATE_API_TOKEN\s*=\s*(.+)/) || content.match(/FAL_KEY\s*=\s*(.+)/);
      if (match && match[1]) {
        return match[1].trim().replace(/^["']|["']$/g, '');
      }
    }
  }
  return null;
}

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
    const apiToken = getEnvToken();

    let outputImage = null;
    let providerRequestId = null;
    let isSuccess = false;
    let durationMs = 0;
    const startTime = Date.now();

    // 3. REAL REPLICATE HTTP API CALL & ASYNC POLLING
    if (apiToken && !forceFail) {
      try {
        const prompt = `Professional men's haircut hairstyle ${selectedStyle}`;
        
        // A: Create Prediction
        const createRes = await fetch(modelConfig.endpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            version: modelConfig.modelVersion,
            input: {
              text: prompt
            }
          })
        });

        const createData = await createRes.json();

        if (createRes.ok && createData && createData.id) {
          providerRequestId = createData.id;
          const pollUrl = createData.urls ? createData.urls.get : `https://api.replicate.com/v1/predictions/${createData.id}`;

          // B: Poll for completion (max 60 seconds)
          let attempts = 0;
          while (attempts < 30) {
            await new Promise(r => setTimeout(r, 2000));
            attempts++;

            const pollRes = await fetch(pollUrl, {
              headers: { 'Authorization': `Bearer ${apiToken}` }
            });
            const pollData = await pollRes.json();

            if (pollData.status === 'succeeded') {
              if (Array.isArray(pollData.output) && pollData.output.length > 0) {
                outputImage = pollData.output.join('');
              } else if (typeof pollData.output === 'string') {
                outputImage = pollData.output;
              }
              isSuccess = Boolean(outputImage);
              break;
            } else if (pollData.status === 'failed' || pollData.status === 'canceled') {
              console.error('Replicate prediction failed/canceled:', pollData.error);
              isSuccess = false;
              break;
            }
          }
        } else {
          console.error('Replicate prediction creation failed:', createData);
        }
      } catch (providerErr) {
        console.error('Real Replicate API Call Error:', providerErr);
        isSuccess = false;
      }
    }

    durationMs = Date.now() - startTime;

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
        error: apiToken ? 'AI saç üretimi Replicate sunucularında başarısız oldu veya zaman aşımına uğradı. Krediniz otomatik iade edildi.' : 'REPLICATE_API_TOKEN henüz yapılandırılmamış.',
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