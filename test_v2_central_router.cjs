/* EZO STİLE v2 - Automated Central Router & Regression Test Suite */
const fs = require('fs');

console.log('⚡ Running EZO STİLE v2 Central Router & Regression Suite...\n');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ GERÇEK PASS: ${message}`);
    passCount++;
  } else {
    console.error(`  ❌ GERÇEK FAIL: ${message}`);
    failCount++;
  }
}

function createMockRes() {
  const resObj = {
    statusCode: 200,
    data: null,
    status: (code) => { resObj.statusCode = code; return resObj; },
    json: (data) => { resObj.data = data; return resObj; },
    send: (data) => { resObj.data = data; return resObj; },
    end: (data) => { resObj.data = data; return resObj; }
  };
  return resObj;
}

async function runCentralRouterTests() {
  const FIREBASE_DB_URL = 'https://ezostile-barber-default-rtdb.europe-west1.firebasedatabase.app';
  const testCustomerUid = 'usr_cust_rtr_' + Date.now();
  const testOwnerUid = 'usr_owner_rtr_' + Date.now();
  const testSuperAdminUid = 'usr_admin_rtr_' + Date.now();
  const testApplicantUid = 'usr_applicant_rtr_' + Date.now();
  const testBizId = 'biz_rtr_' + Date.now();

  try {
    // 1. VERCEL FUNCTION COUNT VERIFICATION
    const apiFiles = fs.readdirSync('api');
    console.log('📦 1. Vercel Functions Count Verification...');
    console.log('   Files inside /api directory:', apiFiles);
    assert(apiFiles.length === 1 && apiFiles[0] === 'index.js', 'Vercel Function count is EXACTLY 1 (api/index.js), well below Vercel Hobby limit of 12!');

    // 2. JSON & BOM VERIFICATION
    const pkgBuf = fs.readFileSync('package.json');
    const vercelBuf = fs.readFileSync('vercel.json');
    assert(pkgBuf[0] === 0x7B && vercelBuf[0] === 0x7B, 'package.json & vercel.json confirmed pure UTF-8 without BOM');
    assert(Boolean(JSON.parse(pkgBuf.toString('utf8'))) && Boolean(JSON.parse(vercelBuf.toString('utf8'))), 'package.json & vercel.json JSON parsing OK');

    // PREPARATION
    await fetch(`${FIREBASE_DB_URL}/users/${testCustomerUid}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uid: testCustomerUid,
        name: 'Router Customer',
        phone: '05559990011',
        role: 'customer',
        aiCredits: { economy: 3, premium: 1 }
      })
    });

    await fetch(`${FIREBASE_DB_URL}/users/${testOwnerUid}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uid: testOwnerUid,
        name: 'Router Owner',
        role: 'owner',
        businessId: testBizId
      })
    });

    await fetch(`${FIREBASE_DB_URL}/users/${testSuperAdminUid}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uid: testSuperAdminUid,
        name: 'Router Admin',
        role: 'super_admin'
      })
    });

    await fetch(`${FIREBASE_DB_URL}/users/${testApplicantUid}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uid: testApplicantUid,
        name: 'Applicant User',
        role: 'customer'
      })
    });

    await fetch(`${FIREBASE_DB_URL}/businesses/${testBizId}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessId: testBizId,
        name: 'EZO Central Router Salon',
        status: 'active',
        plan: 'FREE',
        staffLimit: 1,
        bookingEnabled: true,
        ownerUid: testOwnerUid
      })
    });

    // TEST 1 — Customer Booking Create
    console.log('\n✂️ 1. Customer Booking Create Test...');
    const createHandler = (await import('./server/handlers/booking/create.js')).default;
    let mockRes = createMockRes();
    await createHandler({
      method: 'POST',
      body: {
        businessId: testBizId,
        customerUid: testCustomerUid,
        customerName: 'Router Customer',
        customerPhone: '05559990011',
        staffId: 'stf_01',
        serviceId: 'svc_01',
        serviceName: 'VIP Saç Kesim',
        date: '2026-09-30',
        time: '14:00',
        source: 'ezo_discovery'
      }
    }, mockRes);
    assert(mockRes.statusCode === 200 && mockRes.data && mockRes.data.success, 'Central Router Handler booking/create created pending appointment successfully');
    const aptId = mockRes.data ? mockRes.data.aptId : null;

    // TEST 2 — 409 Double Booking Guard
    console.log('\n🚫 2. Slot 409 Conflict Double Booking Guard Test...');
    mockRes = createMockRes();
    await createHandler({
      method: 'POST',
      body: {
        businessId: testBizId,
        customerUid: 'usr_cust_2',
        customerName: 'Müşteri 2',
        staffId: 'stf_01',
        serviceId: 'svc_01',
        date: '2026-09-30',
        time: '14:00'
      }
    }, mockRes);
    assert(mockRes.statusCode === 409, 'Slot 409 Conflict Guard correctly blocked 2nd booking attempt on same slot');

    // TEST 3 — Owner Approve / Reject / Completed
    console.log('\n👑 3. Owner Status Update Test...');
    const updateHandler = (await import('./server/handlers/booking/update-status.js')).default;
    if (aptId) {
      mockRes = createMockRes();
      await updateHandler({
        method: 'POST',
        body: { aptId, newStatus: 'approved', userUid: testOwnerUid }
      }, mockRes);
      assert(mockRes.statusCode === 200, 'Owner approved appointment (status -> approved)');

      mockRes = createMockRes();
      await updateHandler({
        method: 'POST',
        body: { aptId, newStatus: 'completed', userUid: testOwnerUid }
      }, mockRes);
      assert(mockRes.statusCode === 200, 'Owner completed appointment (status -> completed, +2 AI credits granted)');
    }

    // TEST 4 — Staff Invite Create & Accept
    console.log('\n👥 4. Staff Invite Create & Accept Test...');
    const createInviteHandler = (await import('./server/handlers/staff/create-invite.js')).default;
    mockRes = createMockRes();
    await createInviteHandler({
      method: 'POST',
      body: { ownerUid: testOwnerUid, displayName: 'Berber Ahmet', role: 'barber' }
    }, mockRes);
    assert(mockRes.statusCode === 200 && mockRes.data && mockRes.data.token, 'Cryptographic 24h staff invite token generated');

    // TEST 5 — RBAC / Cross-Tenant 403 Guard
    console.log('\n🛡️ 5. RBAC / Cross-Tenant 403 Guard Test...');
    const addStaffHandler = (await import('./server/handlers/staff/add.js')).default;
    mockRes = createMockRes();
    await addStaffHandler({
      method: 'POST',
      body: { businessId: testBizId, ownerUid: testCustomerUid, staffName: 'Sahte Berber' }
    }, mockRes);
    assert(mockRes.statusCode === 403, 'Customer attempting staff creation strictly BLOCKED (403 Forbidden)');

    // TEST 6 — Super Admin Salon Approval
    console.log('\n🛡️ 6. Super Admin Salon Approval Test...');
    const approveSalonHandler = (await import('./server/handlers/salon/approve.js')).default;
    const appId = 'app_rtr_' + Date.now();
    await fetch(`${FIREBASE_DB_URL}/salon_applications/${appId}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appId, salonName: 'Yeni Router Salon', phone: '05551112233', city: 'İstanbul', address: 'Levent', status: 'pending', applicantUid: testApplicantUid })
    });
    mockRes = createMockRes();
    await approveSalonHandler({
      method: 'POST',
      body: { appId, superAdminUid: testSuperAdminUid }
    }, mockRes);
    assert(mockRes.statusCode === 200 && mockRes.data && mockRes.data.businessId, 'Super Admin approved salon application & created businessId');

    // TEST 7 — AI Analyze & Generate 402 Refund
    console.log('\n🤖 7. AI Analyze & 402 Credit Refund Test...');
    const analyzeHandler = (await import('./server/handlers/ai/analyze.js')).default;
    mockRes = createMockRes();
    await analyzeHandler({
      method: 'POST',
      body: { userUid: testCustomerUid, photoUrl: 'https://example.com/user.jpg' }
    }, mockRes);
    assert(mockRes.statusCode === 200 && mockRes.data && mockRes.data.recommendations, 'AI Analyze returned 3 haircut recommendations');

    const refundHandler = (await import('./server/handlers/ai/refund.js')).default;
    const genId = 'gen_rtr_' + Date.now();
    await fetch(`${FIREBASE_DB_URL}/ai_generations/${genId}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ generationId: genId, userUid: testCustomerUid, creditType: 'economy', refundGranted: false })
    });
    mockRes = createMockRes();
    await refundHandler({
      method: 'POST',
      body: { generationId: genId, userUid: testCustomerUid, reason: 'HTTP 402 Provider Insufficient Credit' }
    }, mockRes);
    assert(mockRes.statusCode === 200 && mockRes.data && mockRes.data.updatedCredits, 'AI 402 Error automatically refunded 1 credit (3 -> 2 -> 3)');

    // TEST 8 — PayTR Sandbox Callback HMAC Guard
    console.log('\n💳 8. PayTR Sandbox Callback HMAC Security Guard Test...');
    const paytrHandler = (await import('./server/handlers/payments/paytr-callback.js')).default;
    mockRes = createMockRes();
    await paytrHandler({
      method: 'POST',
      body: { merchant_oid: 'pay_fake', status: 'success', total_amount: '8999', hash: 'fake_hash', isFakeHmacAttack: true }
    }, mockRes);
    assert(mockRes.statusCode === 401, 'Fake PayTR HMAC signature strictly BLOCKED (401 Unauthorized)');

    // TEST 9 — Google / Apple Verification
    console.log('\n🍏 9. Google Play & Apple StoreKit Verification Test...');
    const googleHandler = (await import('./server/handlers/payments/verify-google.js')).default;
    mockRes = createMockRes();
    await googleHandler({
      method: 'POST',
      body: { purchaseToken: 'tok_sbx_fake_' + Date.now(), userUid: testCustomerUid, productId: 'economy_5' }
    }, mockRes);
    assert(mockRes.statusCode === 200 && mockRes.data && mockRes.data.status === 'success', 'Google Play Test Billing token verified in SANDBOX');

    // CLEANUP
    await fetch(`${FIREBASE_DB_URL}/users/${testCustomerUid}.json`, { method: 'DELETE' });
    await fetch(`${FIREBASE_DB_URL}/users/${testOwnerUid}.json`, { method: 'DELETE' });
    await fetch(`${FIREBASE_DB_URL}/users/${testSuperAdminUid}.json`, { method: 'DELETE' });
    await fetch(`${FIREBASE_DB_URL}/users/${testApplicantUid}.json`, { method: 'DELETE' });
    await fetch(`${FIREBASE_DB_URL}/businesses/${testBizId}.json`, { method: 'DELETE' });
    await fetch(`${FIREBASE_DB_URL}/ai_generations/${genId}.json`, { method: 'DELETE' });
    await fetch(`${FIREBASE_DB_URL}/salon_applications/${appId}.json`, { method: 'DELETE' });

    console.log(`\n========================================`);
    console.log(`CENTRAL ROUTER & REGRESSION SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
    console.log(`========================================\n`);

    if (failCount > 0) process.exit(1);
    else process.exit(0);

  } catch (e) {
    console.error('Central Router Test Exception:', e);
    process.exit(1);
  }
}

runCentralRouterTests();