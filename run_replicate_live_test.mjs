/* EZO STİLE v2 - Automated Phase 7.7 Live Replicate Production Execution Test */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import handler from './api/ai/generate.js';

console.log('⚡ Running EZO STİLE v2 Phase 7.7 Live Replicate Production Test...\n');

function getEnvToken() {
  if (process.env.REPLICATE_API_TOKEN) return process.env.REPLICATE_API_TOKEN;
  const envPaths = ['.env', '.env.local'];
  for (const envFile of envPaths) {
    const fullPath = path.resolve(process.cwd(), envFile);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const match = content.match(/REPLICATE_API_TOKEN\s*=\s*(.+)/);
      if (match && match[1]) {
        return match[1].trim().replace(/^["']|["']$/g, '');
      }
    }
  }
  return null;
}

async function runLiveTest() {
  const FIREBASE_DB_URL = 'https://ezostile-barber-default-rtdb.europe-west1.firebasedatabase.app';
  const token = getEnvToken();

  console.log(`🔑 1. REPLICATE_API_TOKEN Status: ${token ? 'configured: true' : 'configured: false'}`);
  if (!token) {
    console.error('❌ REPLICATE_API_TOKEN is missing in .env file!');
    process.exit(1);
  }

  const testUserUid = 'usr_replicate_live_' + Date.now();
  const inputPhotoUrl = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500';

  try {
    // 1. SETUP USER CREDITS (economy: 3)
    await fetch(`${FIREBASE_DB_URL}/users/${testUserUid}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uid: testUserUid,
        name: 'Live Replicate Tester',
        role: 'customer',
        aiCredits: { economy: 3, premium: 1 }
      })
    });

    console.log('\n🚀 2. Dispatching Live Production Prediction Request to Replicate API...');
    const req = {
      method: 'POST',
      body: {
        userUid: testUserUid,
        photoUrl: inputPhotoUrl,
        selectedStyle: 'Italian Side Part',
        mode: 'economy'
      }
    };

    let responseData = null;
    let statusCode = 200;

    const res = {
      status: (code) => {
        statusCode = code;
        return {
          json: (data) => {
            responseData = data;
          }
        };
      }
    };

    await handler(req, res);

    console.log(`\n📡 3. Live Replicate API Response (HTTP ${statusCode}):`);
    console.log(JSON.stringify(responseData, null, 2));

    // 4. VERIFY USER CREDIT DEDUCTION (3 -> 2)
    const userAfter = await (await fetch(`${FIREBASE_DB_URL}/users/${testUserUid}.json`)).json();
    console.log(`\n💳 4. User Credit Status: Economy ${userAfter.aiCredits.economy} (Expected: 2)`);

    // CLEANUP
    await fetch(`${FIREBASE_DB_URL}/users/${testUserUid}.json`, { method: 'DELETE' });

    if (statusCode === 200 && responseData && responseData.success) {
      console.log('\n========================================');
      console.log('REPLICATE PRODUCTION AI: PASS');
      console.log('========================================\n');
      process.exit(0);
    } else {
      console.log('\n========================================');
      console.log('REPLICATE PRODUCTION AI: FAIL / REFUNDED');
      console.log('Reason:', responseData ? responseData.error : 'Unknown error');
      console.log('========================================\n');
      process.exit(1);
    }

  } catch (err) {
    console.error('Live test exception:', err);
    process.exit(1);
  }
}

runLiveTest();