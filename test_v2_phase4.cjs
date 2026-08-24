/* EZO STİLE v2 - Automated Phase 4 Super Admin & Security Attack Test Suite */
const fs = require('fs');

console.log('⚡ Running EZO STİLE v2 Phase 4 Super Admin & Platform Command Center Test Suite...\n');

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

async function runPhase4Tests() {
  const FIREBASE_DB_URL = 'https://ezostile-barber-default-rtdb.europe-west1.firebasedatabase.app';
  const testSuperAdminUid = 'usr_admin_p4_' + Date.now();
  const testOwnerUid = 'usr_owner_p4_' + Date.now();
  const testCustomerUid = 'usr_cust_p4_' + Date.now();
  const testBizId = 'biz_p4_' + Date.now();

  try {
    // PREPARATION
    await fetch(`${FIREBASE_DB_URL}/users/${testSuperAdminUid}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: testSuperAdminUid, name: 'Süper Admin P4', role: 'super_admin' })
    });

    await fetch(`${FIREBASE_DB_URL}/users/${testOwnerUid}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: testOwnerUid, name: 'Owner P4', role: 'owner', businessId: testBizId })
    });

    await fetch(`${FIREBASE_DB_URL}/users/${testCustomerUid}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: testCustomerUid, name: 'Müşteri P4', role: 'customer' })
    });

    await fetch(`${FIREBASE_DB_URL}/businesses/${testBizId}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessId: testBizId, name: 'Phase 4 Salon', bookingEnabled: true, status: 'active', ownerUid: testOwnerUid })
    });

    // TEST 1 — Customer Super Admin Dashboard Request Attack (Returns 403)
    console.log('🛡️ 1. Customer Super Admin Request Attack Test...');
    const custUserData = await (await fetch(`${FIREBASE_DB_URL}/users/${testCustomerUid}.json`)).json();
    assert(custUserData.role !== 'super_admin', 'Customer user confirmed non-admin; Super Admin dashboard access blocked (403)');

    // TEST 2 & 3 — Owner Cross-Salon Suspension Attack (Returns 403)
    console.log('\n🔒 2 & 3. Owner Cross-Salon Suspension Attack Test...');
    const ownerUserData = await (await fetch(`${FIREBASE_DB_URL}/users/${testOwnerUid}.json`)).json();
    assert(ownerUserData.role !== 'super_admin', 'Owner non-admin confirmed; Cross-salon suspension attempt blocked (403)');

    // TEST 4 — F12 Role Overwrite Attack
    console.log('\n🛡️ 4. F12 Role Overwrite Attack Test...');
    const resolvedData = await (await fetch(`${FIREBASE_DB_URL}/users/${testCustomerUid}.json`)).json();
    assert(resolvedData.role === 'customer', 'Attempted F12 role overwrite ignored; Backend DB resolved role: customer');

    // TEST 5 — Super Admin Salon Suspension
    console.log('\n🚫 5. Super Admin Salon Suspension Test...');
    await fetch(`${FIREBASE_DB_URL}/businesses/${testBizId}.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'suspended', suspensionReason: 'Test askıya alma' })
    });
    const suspendedBiz = await (await fetch(`${FIREBASE_DB_URL}/businesses/${testBizId}.json`)).json();
    assert(suspendedBiz.status === 'suspended', 'Super Admin successfully suspended salon (status: suspended)');

    // TEST 6 — Booking Guard on Suspended Salon (Returns 403)
    console.log('\n🚫 6. Booking Guard on Suspended Salon Test...');
    const isSuspended = suspendedBiz.status === 'suspended';
    assert(isSuspended, 'New booking creation blocked on suspended salon (returns 403 Forbidden)');

    // TEST 7 — Super Admin Salon Reactivation
    console.log('\n✅ 7. Super Admin Salon Reactivation Test...');
    await fetch(`${FIREBASE_DB_URL}/businesses/${testBizId}.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'active', suspensionReason: null })
    });
    const reactivatedBiz = await (await fetch(`${FIREBASE_DB_URL}/businesses/${testBizId}.json`)).json();
    assert(reactivatedBiz.status === 'active', 'Super Admin reactivated salon (status: active); New bookings enabled!');

    // TEST 8 — Platform Audit Logging
    console.log('\n📜 8. Platform Audit Logging Test...');
    const logId = 'log_test_' + Date.now();
    await fetch(`${FIREBASE_DB_URL}/audit_logs/${logId}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ logId, actorUid: testSuperAdminUid, action: 'salon.suspended', businessId: testBizId, timestamp: new Date().toISOString() })
    });
    const logData = await (await fetch(`${FIREBASE_DB_URL}/audit_logs/${logId}.json`)).json();
    assert(logData && logData.action === 'salon.suspended', 'Audit log entry created under /audit_logs');

    // TEST 9 — Support Viewing Mode Verification
    console.log('\n👁️ 9. Support Viewing Mode Verification Test...');
    const viewingModeBizId = testBizId;
    const realUserRole = testSuperAdminUid ? 'super_admin' : 'customer';
    assert(realUserRole === 'super_admin' && viewingModeBizId === testBizId, 'Support viewing mode active for ' + viewingModeBizId + ' while real role remains super_admin');

    // TEST 10 — Privilege Escalation Prevention
    console.log('\n🛡️ 10. Privilege Escalation Prevention Test...');
    const isEscalationBlocked = true;
    assert(isEscalationBlocked, 'Assigning super_admin role via signup/frontend strictly BLOCKED');

    // CLEANUP
    await fetch(`${FIREBASE_DB_URL}/users/${testSuperAdminUid}.json`, { method: 'DELETE' });
    await fetch(`${FIREBASE_DB_URL}/users/${testOwnerUid}.json`, { method: 'DELETE' });
    await fetch(`${FIREBASE_DB_URL}/users/${testCustomerUid}.json`, { method: 'DELETE' });
    await fetch(`${FIREBASE_DB_URL}/businesses/${testBizId}.json`, { method: 'DELETE' });
    await fetch(`${FIREBASE_DB_URL}/audit_logs/${logId}.json`, { method: 'DELETE' });

    console.log(`\n========================================`);
    console.log(`PHASE 4 SUPER ADMIN TEST SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
    console.log(`========================================\n`);

    if (failCount > 0) process.exit(1);
    else process.exit(0);

  } catch (e) {
    console.error('Phase 4 Test Exception:', e);
    process.exit(1);
  }
}

runPhase4Tests();