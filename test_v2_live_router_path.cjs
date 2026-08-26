/* EZO STİLE v2 - Direct Live Router Path & Capture Simulation Test */
const fs = require('fs');

console.log('⚡ Running Direct Vercel Router Path & Capture Simulation Test...\n');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ GERÇEK ROUTER PASS: ${message}`);
    passCount++;
  } else {
    console.error(`  ❌ GERÇEK ROUTER FAIL: ${message}`);
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

async function runLiveRouterSimulation() {
  const FIREBASE_DB_URL = 'https://ezostile-barber-default-rtdb.europe-west1.firebasedatabase.app';
  const testCustomerUid = 'usr_sim_cust_' + Date.now();
  const testBizId = 'biz_sim_' + Date.now();

  try {
    const mainRouter = (await import('./api/index.js')).default;

    // PREPARATION
    await fetch(`${FIREBASE_DB_URL}/users/${testCustomerUid}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: testCustomerUid, name: 'Sim Customer', phone: '05559998877', role: 'customer' })
    });

    await fetch(`${FIREBASE_DB_URL}/businesses/${testBizId}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessId: testBizId, name: 'Sim Salon', status: 'active', bookingEnabled: true })
    });

    // SIMULATION 1: Vercel rewrite with query parameter ?path=booking/create
    console.log('📡 1. Simulating Vercel Rewrite (/api/index?path=booking/create)...');
    let mockRes = createMockRes();
    await mainRouter({
      method: 'POST',
      url: '/api/index?path=booking/create',
      body: {
        businessId: testBizId,
        customerUid: testCustomerUid,
        customerName: 'Sim Customer',
        customerPhone: '05559998877',
        staffId: 'stf_01',
        serviceId: 'svc_01',
        serviceName: 'Saç Kesimi',
        date: '2026-10-05',
        time: '15:00',
        source: 'ezo_discovery'
      }
    }, mockRes);

    assert(mockRes.statusCode === 200 && mockRes.data && mockRes.data.success && mockRes.data.aptId, 'Query param rewrite ?path=booking/create executed handler & created Firebase appointment with real aptId!');
    const createdAptId = mockRes.data ? mockRes.data.aptId : null;

    // VERIFY FIREBASE RECORD EXISTS
    if (createdAptId) {
      const aptDbRes = await fetch(`${FIREBASE_DB_URL}/appointments/${createdAptId}.json`);
      const aptDbData = aptDbRes.ok ? await aptDbRes.json() : null;
      assert(aptDbData && aptDbData.status === 'pending' && aptDbData.time === '15:00', 'Firebase DB verified: /appointments/' + createdAptId + ' contains correct pending appointment data!');
    }

    // SIMULATION 2: 409 Double Booking Conflict over Central Router
    console.log('\n🚫 2. Simulating 409 Conflict over Central Router...');
    mockRes = createMockRes();
    await mainRouter({
      method: 'POST',
      url: '/api/index?path=booking/create',
      body: {
        businessId: testBizId,
        customerUid: 'usr_sim_2',
        customerName: 'Sim Customer 2',
        staffId: 'stf_01',
        serviceId: 'svc_01',
        date: '2026-10-05',
        time: '15:00'
      }
    }, mockRes);

    assert(mockRes.statusCode === 409 && mockRes.data && mockRes.data.error, 'Central Router correctly returned 409 Conflict for duplicate slot booking!');

    // SIMULATION 3: Pathname fallback /api/booking/create
    console.log('\n🛣️ 3. Simulating Pathname fallback (/api/booking/create)...');
    mockRes = createMockRes();
    await mainRouter({
      method: 'POST',
      url: '/api/booking/create',
      body: {
        businessId: testBizId,
        customerUid: testCustomerUid,
        customerName: 'Sim Customer',
        customerPhone: '05559998877',
        staffId: 'stf_01',
        serviceId: 'svc_01',
        serviceName: 'Saç Kesimi',
        date: '2026-10-05',
        time: '16:00',
        source: 'ezo_discovery'
      }
    }, mockRes);

    assert(mockRes.statusCode === 200 && mockRes.data && mockRes.data.success, 'Raw pathname /api/booking/create correctly routed & created appointment!');

    // CLEANUP
    await fetch(`${FIREBASE_DB_URL}/users/${testCustomerUid}.json`, { method: 'DELETE' });
    await fetch(`${FIREBASE_DB_URL}/businesses/${testBizId}.json`, { method: 'DELETE' });
    if (createdAptId) {
      await fetch(`${FIREBASE_DB_URL}/appointments/${createdAptId}.json`, { method: 'DELETE' });
    }

    console.log(`\n========================================`);
    console.log(`LIVE ROUTER SIMULATION SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
    console.log(`========================================\n`);

    if (failCount > 0) process.exit(1);
    else process.exit(0);

  } catch (e) {
    console.error('Live Router Simulation Exception:', e);
    process.exit(1);
  }
}

runLiveRouterSimulation();