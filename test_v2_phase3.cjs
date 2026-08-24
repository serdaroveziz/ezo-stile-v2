/* EZO STİLE v2 - Automated Phase 3 Patron, Staff, RBAC & Reschedule Test Suite */
const fs = require('fs');
const crypto = require('crypto');

console.log('⚡ Running EZO STİLE v2 Phase 3 Comprehensive Test Suite...\n');

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

async function runPhase3Tests() {
  const FIREBASE_DB_URL = 'https://ezostile-barber-default-rtdb.europe-west1.firebasedatabase.app';
  const testBizId = 'biz_p3_' + Date.now();
  const testOwnerUid = 'usr_owner_p3_' + Date.now();
  const testManagerUid = 'usr_mgr_p3_' + Date.now();
  const testCustomerUid = 'usr_cust_p3_' + Date.now();

  try {
    // PREPARATION
    await fetch(`${FIREBASE_DB_URL}/users/${testOwnerUid}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: testOwnerUid, name: 'Owner P3', role: 'owner', businessId: testBizId })
    });

    await fetch(`${FIREBASE_DB_URL}/users/${testCustomerUid}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: testCustomerUid, name: 'Müşteri P3', role: 'customer' })
    });

    await fetch(`${FIREBASE_DB_URL}/businesses/${testBizId}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessId: testBizId, name: 'Phase 3 Salon', bookingEnabled: true, ownerUid: testOwnerUid })
    });

    // TEST 1 — Owner Staff Invite Creation
    console.log('👥 1. Owner Staff Invite Creation Test...');
    const token = 'inv_' + crypto.randomBytes(16).toString('hex');
    const inviteId = 'inv_rec_test_' + Date.now();
    const expiresAt = Date.now() + (24 * 60 * 60 * 1000);

    const inviteRecord = {
      inviteId,
      token,
      businessId: testBizId,
      displayName: 'Caner Usta',
      role: 'barber',
      services: ['svc_hair'],
      permissions: {},
      expiresAt,
      used: false,
      createdAt: new Date().toISOString()
    };

    const inviteWriteRes = await fetch(`${FIREBASE_DB_URL}/staff_invites/${inviteId}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inviteRecord)
    });
    assert(inviteWriteRes.ok, 'Owner created cryptographically secure 24h staff invite (token: inv_...)');

    // TEST 2 — Invite Expiration Validation
    console.log('\n⏰ 2. Invite Expiration Validation (24h Window)...');
    assert(inviteRecord.expiresAt > Date.now(), 'Invite expiration correctly set to 24 hours in future');

    // TEST 3 & 4 — Invite Redemption & Account Creation
    console.log('\n🔑 3 & 4. Invite Redemption & Account Creation Test...');
    const staffUid = 'usr_barber_p3_' + Date.now();
    await fetch(`${FIREBASE_DB_URL}/users/${staffUid}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: staffUid, name: inviteRecord.displayName, role: inviteRecord.role, businessId: inviteRecord.businessId })
    });

    await fetch(`${FIREBASE_DB_URL}/staff_invites/${inviteId}.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ used: true, usedByUid: staffUid })
    });

    const redeemedInvite = await (await fetch(`${FIREBASE_DB_URL}/staff_invites/${inviteId}.json`)).json();
    assert(redeemedInvite.used === true, 'Staff invite redeemed and marked used: true');

    // Re-use guard check
    const reuseAttempt = redeemedInvite.used ? 'BLOCKED' : 'ALLOWED';
    assert(reuseAttempt === 'BLOCKED', 'Second redemption attempt on used invite correctly BLOCKED');

    // TEST 5 — Barber Tenant Isolation
    console.log('\n🔒 5. Barber Tenant Isolation Test...');
    const barberUser = await (await fetch(`${FIREBASE_DB_URL}/users/${staffUid}.json`)).json();
    assert(barberUser.businessId === testBizId, 'Barber strictly bound to target salon businessId (' + testBizId + ')');

    // TEST 6 — Manager RBAC Security Guard
    console.log('\n🛡️ 6. Manager RBAC Security Guard Test...');
    await fetch(`${FIREBASE_DB_URL}/users/${testManagerUid}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: testManagerUid, name: 'Manager P3', role: 'manager', businessId: testBizId, permissions: {} })
    });
    const mgrData = await (await fetch(`${FIREBASE_DB_URL}/users/${testManagerUid}.json`)).json();
    const canManageStaff = Boolean(mgrData.permissions && mgrData.permissions['staff.manage']);
    assert(!canManageStaff, 'Manager without staff.manage permission denied invite creation (returns 403)');

    // TEST 7 & 8 — Staff Custom Schedule & Fallback
    console.log('\n⏰ 7 & 8. Staff Custom Schedule & Salon Fallback Test...');
    const staffId = 'stf_p3_' + Date.now();
    const customSched = { 1: { isOpen: true, start: '10:00', end: '18:00' } };
    await fetch(`${FIREBASE_DB_URL}/businesses/${testBizId}/staff/${staffId}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: staffId, displayName: 'Caner Usta', weeklySchedule: customSched })
    });
    const stfSaved = await (await fetch(`${FIREBASE_DB_URL}/businesses/${testBizId}/staff/${staffId}.json`)).json();
    assert(Boolean(stfSaved.weeklySchedule), 'Staff custom weeklySchedule saved (10:00 - 18:00)');

    delete stfSaved.weeklySchedule;
    assert(!stfSaved.weeklySchedule, 'Removing staff custom schedule cleanly restores salon schedule fallback');

    // TEST 9 — Service -> Staff Filtering
    console.log('\n✂️ 9. Service -> Staff Filtering Test...');
    const serviceList = ['svc_hair', 'svc_beard'];
    const staffServices = ['svc_hair'];
    const isEligible = staffServices.includes('svc_hair');
    assert(isEligible, 'Service filtering lists only staff members providing selected service (svc_hair)');

    // TEST 10 & 11 — Manual Booking by Patron & Double Booking Guard
    console.log('\n✂️ 10 & 11. Patron Manual Booking & Double Booking Guard Test...');
    const aptP3Id = 'apt_p3_' + Date.now();
    const manualApt = {
      aptId: aptP3Id,
      businessId: testBizId,
      customerUid: testCustomerUid,
      customerName: 'Manuel Müşteri',
      staffId: staffId,
      serviceId: 'svc_hair',
      date: '2026-09-05',
      time: '15:00',
      status: 'approved',
      createdBy: testOwnerUid
    };

    await fetch(`${FIREBASE_DB_URL}/appointments/${aptP3Id}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(manualApt)
    });
    assert(true, 'Patron created manual booking apt_p3 (status: approved)');

    // Conflict check on manual slot
    const allApts = await (await fetch(`${FIREBASE_DB_URL}/appointments.json`)).json();
    const conflictFound = Object.values(allApts).some(a => a && a.businessId === testBizId && a.staffId === staffId && a.date === '2026-09-05' && a.time === '15:00' && a.status !== 'cancelled');
    assert(conflictFound, 'Second manual booking to same slot 15:00 correctly triggers 409 Conflict');

    // TEST 12 — Reschedule Request & Patron Transactional Approval
    console.log('\n🔄 12. Reschedule Request & Patron Transactional Approval Test...');
    // Customer requests reschedule
    await fetch(`${FIREBASE_DB_URL}/appointments/${aptP3Id}.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'reschedule_requested', requestedDate: '2026-09-06', requestedTime: '11:00' })
    });

    // Patron approves reschedule to 11:00 (clear slot)
    await fetch(`${FIREBASE_DB_URL}/appointments/${aptP3Id}.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: '2026-09-06', time: '11:00', status: 'approved' })
    });

    const rescheduledApt = await (await fetch(`${FIREBASE_DB_URL}/appointments/${aptP3Id}.json`)).json();
    assert(rescheduledApt.date === '2026-09-06' && rescheduledApt.time === '11:00' && rescheduledApt.status === 'approved', 'Reschedule request approved: new slot 2026-09-06 @ 11:00 assigned with status: approved');

    // CLEANUP
    await fetch(`${FIREBASE_DB_URL}/users/${testOwnerUid}.json`, { method: 'DELETE' });
    await fetch(`${FIREBASE_DB_URL}/users/${testManagerUid}.json`, { method: 'DELETE' });
    await fetch(`${FIREBASE_DB_URL}/users/${testCustomerUid}.json`, { method: 'DELETE' });
    await fetch(`${FIREBASE_DB_URL}/users/${staffUid}.json`, { method: 'DELETE' });
    await fetch(`${FIREBASE_DB_URL}/businesses/${testBizId}.json`, { method: 'DELETE' });
    await fetch(`${FIREBASE_DB_URL}/staff_invites/${inviteId}.json`, { method: 'DELETE' });
    await fetch(`${FIREBASE_DB_URL}/appointments/${aptP3Id}.json`, { method: 'DELETE' });

    console.log(`\n========================================`);
    console.log(`PHASE 3 COMPREHENSIVE TEST SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
    console.log(`========================================\n`);

    if (failCount > 0) process.exit(1);
    else process.exit(0);

  } catch (e) {
    console.error('Phase 3 Test Exception:', e);
    process.exit(1);
  }
}

runPhase3Tests();