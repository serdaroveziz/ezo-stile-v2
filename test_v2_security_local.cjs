/* Local-only Firebase authentication boundary checks. Never contacts Firebase. */
const assert = require('node:assert/strict');
const fs = require('node:fs');

(async () => {
  const { isCustomerPortalRole, isSalonPortalRole, normalizePhone, normalizePhoneToUid } = await import('./src/auth.js');
  const { enforceAuthenticatedIdentity } = await import('./api/index.js');
  const { buildAnyStaffAvailability } = await import('./server/handlers/booking/availability.js');

  assert.equal(normalizePhone('0532 111 22 33'), '+905321112233');
  assert.equal(normalizePhone('+90 (532) 111 22 33'), '+905321112233');
  assert.equal(normalizePhoneToUid('+90 532 111 22 33'), 'usr_05321112233');
  assert.throws(() => normalizePhone('123'), /geçerli/i);
  assert.equal(isCustomerPortalRole('customer'), true);
  assert.equal(isCustomerPortalRole('owner'), false);
  assert.equal(isCustomerPortalRole('super_admin'), false);
  assert.equal(isSalonPortalRole('customer'), false);
  assert.equal(isSalonPortalRole('owner'), true);
  assert.equal(isSalonPortalRole('barber'), true);
  assert.equal(isSalonPortalRole('super_admin'), true);

  const customerReq = {
    auth: { uid: 'firebase-customer', profile: { role: 'customer' } },
    body: { customerUid: 'attacker-selected', businessId: 'biz-a' }
  };
  assert.throws(
    () => enforceAuthenticatedIdentity('booking/create', customerReq),
    error => error.statusCode === 403
  );

  const ownBookingReq = {
    auth: { uid: 'firebase-customer', profile: { role: 'customer' } },
    body: { businessId: 'biz-a' }
  };
  enforceAuthenticatedIdentity('booking/create', ownBookingReq);
  assert.equal(ownBookingReq.body.customerUid, 'firebase-customer');

  const spoofedAdminReq = {
    auth: { uid: 'firebase-customer', profile: { role: 'customer' } },
    body: { superAdminUid: 'known-admin', businessId: 'biz-a' }
  };
  assert.throws(
    () => enforceAuthenticatedIdentity('salon/toggle-status', spoofedAdminReq),
    error => error.statusCode === 403
  );

  const manualCrossTenantReq = {
    auth: { uid: 'owner-a', profile: { role: 'owner', businessId: 'biz-a' } },
    body: { isManual: true, businessId: 'biz-b', customerUid: 'manual-customer' }
  };
  assert.throws(
    () => enforceAuthenticatedIdentity('booking/create', manualCrossTenantReq),
    error => error.statusCode === 403
  );

  const rules = JSON.parse(fs.readFileSync('database.rules.json', 'utf8')).rules;
  assert.doesNotMatch(rules.appointments['.read'], /^auth != null$/);
  assert.match(rules.appointments['.read'], /query\.orderByChild/);
  assert.equal(rules.appointments.$aptId['.write'], false);
  assert.equal(rules.notifications.$uid['.write'], false);
  assert.match(rules.notifications.$uid.$notificationId.read['.write'], /\$uid === auth\.uid/);

  const bookingCreateSource = fs.readFileSync('server/handlers/booking/create.js', 'utf8');
  const rescheduleSource = fs.readFileSync('server/handlers/booking/reschedule-approve.js', 'utf8');
  assert.match(bookingCreateSource, /ref\('appointments'\)\.transaction/);
  assert.match(rescheduleSource, /transactionWithCurrentValue\(getAdminDatabase\(\)\.ref\('appointments'\)/);

  const business = {
    staff: {'staff-1': {id:'staff-1',services:['cut']}},
    weeklySchedule: { friday: { isOpen: true, start: '09:00', end: '12:00' }, saturday: { isOpen: false } }
  };
  const availability = buildAnyStaffAvailability({
    business,
    businessId:'biz', serviceId:'cut', staffId:'staff-1',
    appointments: [{ businessId:'biz', date: '2026-08-28', time: '10:30', serviceDuration: 30, staffId: 'staff-1', status: 'approved' }],
    date: '2026-08-28',
    durationMinutes: 30,
    now: new Date('2026-08-28T07:15:00Z')
  });
  assert.deepEqual(availability.pastSlots, ['09:00', '09:30', '10:00']);
  assert.deepEqual(availability.busySlots, ['10:30']);
  assert.deepEqual(availability.slots, ['11:00', '11:30']);
  assert.equal(availability.slotIntervalMinutes, 30);

  const closedAvailability = buildAnyStaffAvailability({
    business,
    businessId:'biz', serviceId:'cut', staffId:'staff-1',
    appointments: [],
    date: '2026-08-29',
    durationMinutes: 30,
    now: new Date('2026-08-28T07:15:00Z')
  });
  assert.equal(closedAvailability.isClosed, true);
  assert.deepEqual(closedAvailability.slots, []);

  console.log('Firebase auth and booking boundary: 19/19 PASS (local, no network)');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
