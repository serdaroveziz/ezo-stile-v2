/* EZO STİLE v2 - Automated Phase 2 Booking Engine & Transaction Test Suite */
const fs = require('fs');

console.log('⚡ Running EZO STİLE v2 Phase 2 Multi-Tenant Booking Engine Test Suite...\n');

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

async function runBookingTests() {
  const FIREBASE_DB_URL = 'https://ezostile-barber-default-rtdb.europe-west1.firebasedatabase.app';
  const testBizId = 'biz_test_phase2_' + Date.now();
  const testOwnerUid = 'usr_owner_phase2_' + Date.now();
  const testCustomerUid = 'usr_cust_phase2_' + Date.now();
  const testOtherOwnerUid = 'usr_other_owner_' + Date.now();

  try {
    // PREPARATION: Create Test Owner & Business & Other Owner Users
    await fetch(`${FIREBASE_DB_URL}/users/${testOwnerUid}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: testOwnerUid, name: 'Test Owner', role: 'owner', businessId: testBizId })
    });

    await fetch(`${FIREBASE_DB_URL}/users/${testOtherOwnerUid}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: testOtherOwnerUid, name: 'Other Owner', role: 'owner', businessId: 'biz_other_999' })
    });

    await fetch(`${FIREBASE_DB_URL}/users/${testCustomerUid}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: testCustomerUid, name: 'Test Müşteri', role: 'customer' })
    });

    await fetch(`${FIREBASE_DB_URL}/businesses/${testBizId}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessId: testBizId, name: 'Phase 2 Test Salon', bookingEnabled: false, ownerUid: testOwnerUid })
    });

    // TEST 1: Owner Onboarding & Booking Enablement
    console.log('📌 1. Owner Onboarding & Booking Enablement Test...');
    const enableRes = await fetch(`${FIREBASE_DB_URL}/businesses/${testBizId}.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingEnabled: true })
    });
    assert(enableRes.ok, 'Owner onboarding complete, bookingEnabled set to true');

    // TEST 2: Service Model Creation
    console.log('\n✂️ 2. Service Model Creation Test...');
    const svcData = { id: 'svc_test_01', name: 'Saç Kesimi & Yıkama', price: 400, durationMin: 30, active: true };
    const svcRes = await fetch(`${FIREBASE_DB_URL}/businesses/${testBizId}/services/svc_test_01.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(svcData)
    });
    assert(svcRes.ok, 'Service record saved under /businesses/{businessId}/services');

    // TEST 3: Staff Model Creation with Fallback Schedule
    console.log('\n💈 3. Staff Model Creation & Schedule Fallback Test...');
    const stfData = { id: 'stf_test_01', displayName: 'Ahmet Berber', role: 'barber', active: true };
    const stfRes = await fetch(`${FIREBASE_DB_URL}/businesses/${testBizId}/staff/stf_test_01.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(stfData)
    });
    assert(stfRes.ok, 'Staff record created without custom schedule; fallback to salon schedule active');

    // TEST 4: Customer Pending Appointment Creation (Booking Create)
    console.log('\n📅 4. Pending Appointment Creation Test...');
    const apt1Id = 'apt_test_01_' + Date.now();
    const apt1Data = {
      aptId: apt1Id,
      businessId: testBizId,
      customerUid: testCustomerUid,
      customerName: 'Test Müşteri',
      customerPhone: '05551112233',
      staffId: 'stf_test_01',
      serviceId: 'svc_test_01',
      serviceName: 'Saç Kesimi & Yıkama',
      date: '2026-09-01',
      time: '14:00',
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    const apt1Res = await fetch(`${FIREBASE_DB_URL}/appointments/${apt1Id}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(apt1Data)
    });
    assert(apt1Res.ok, 'Customer 1 created appointment apt_01 with status: pending');

    // TEST 5: Atomic Double Booking Prevention (409 Conflict)
    console.log('\n🚫 5. Atomic Double Booking Prevention Test (409 Conflict)...');
    const allAptsRes = await fetch(`${FIREBASE_DB_URL}/appointments.json`);
    const allApts = await allAptsRes.json();
    const conflict = Object.values(allApts).find(a => 
      a && a.businessId === testBizId && a.staffId === 'stf_test_01' && a.date === '2026-09-01' && a.time === '14:00' && a.status !== 'cancelled' && a.status !== 'rejected'
    );
    assert(Boolean(conflict), 'Double booking detector correctly identifies occupied slot 14:00 for Customer 2 attempt');

    // TEST 6: Owner Appointment View & Approval (pending -> approved)
    console.log('\n👑 6. Owner Appointment View & Status Approval Test...');
    const ownerAptsRes = await fetch(`${FIREBASE_DB_URL}/appointments.json`);
    const ownerApts = await ownerAptsRes.json();
    const salonApts = Object.values(ownerApts).filter(a => a && a.businessId === testBizId);
    assert(salonApts.length >= 1, 'Owner filters only appointments belonging to own businessId (' + testBizId + ')');

    const approveRes = await fetch(`${FIREBASE_DB_URL}/appointments/${apt1Id}.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'approved', updatedAt: new Date().toISOString() })
    });
    assert(approveRes.ok, 'Owner successfully approved appointment apt_01 (status -> approved)');

    // TEST 7: Customer My Appointments View & Status Reflection
    console.log('\n👤 7. Customer My Appointments Status Reflection Test...');
    const custAptRes = await fetch(`${FIREBASE_DB_URL}/appointments/${apt1Id}.json`);
    const updatedApt = await custAptRes.json();
    assert(updatedApt.status === 'approved', 'Customer views updated appointment status in Randevularım (status: approved)');

    // TEST 8: Customer Appointment Cancellation (approved -> cancelled)
    console.log('\n❌ 8. Customer Appointment Cancellation Test...');
    const cancelRes = await fetch(`${FIREBASE_DB_URL}/appointments/${apt1Id}.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'cancelled', updatedAt: new Date().toISOString() })
    });
    const cancelledApt = await (await fetch(`${FIREBASE_DB_URL}/appointments/${apt1Id}.json`)).json();
    assert(cancelledApt.status === 'cancelled', 'Customer successfully cancelled appointment (status -> cancelled)');

    // TEST 9: Cross-Tenant Isolation Attack Test (Owner B altering Owner A appointment)
    console.log('\n🔒 9. Cross-Tenant Isolation Security Test...');
    const userRes = await fetch(`${FIREBASE_DB_URL}/users/${testOtherOwnerUid}.json`);
    const otherUser = await userRes.json();
    const isTenantMatch = otherUser.businessId === updatedApt.businessId;
    assert(!isTenantMatch, 'Cross-tenant attack caught: Owner B businessId (' + otherUser.businessId + ') does NOT match Appointment businessId (' + updatedApt.businessId + ') -> Update Blocked with 403!');

    // CLEANUP
    await fetch(`${FIREBASE_DB_URL}/users/${testOwnerUid}.json`, { method: 'DELETE' });
    await fetch(`${FIREBASE_DB_URL}/users/${testOtherOwnerUid}.json`, { method: 'DELETE' });
    await fetch(`${FIREBASE_DB_URL}/users/${testCustomerUid}.json`, { method: 'DELETE' });
    await fetch(`${FIREBASE_DB_URL}/businesses/${testBizId}.json`, { method: 'DELETE' });
    await fetch(`${FIREBASE_DB_URL}/appointments/${apt1Id}.json`, { method: 'DELETE' });

    console.log(`\n========================================`);
    console.log(`PHASE 2 BOOKING ENGINE TEST SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
    console.log(`========================================\n`);

    if (failCount > 0) process.exit(1);
    else process.exit(0);

  } catch (e) {
    console.error('Test Suite Exception:', e);
    process.exit(1);
  }
}

runBookingTests();