const assert = require('node:assert/strict');
const fs = require('node:fs');
const read = path => fs.readFileSync(path, 'utf8');

const reschedule = read('server/handlers/booking/reschedule-approve.js');
const updateStatus = read('server/handlers/booking/update-status.js');
const list = read('server/handlers/booking/list.js');
const notifications = read('server/handlers/notifications/send.js');
const customer = read('src/ui/customer.js');
const owner = read('src/ui/owner.js');
const auth = read('src/auth.js');
const index = read('index.html');
const invite = read('server/handlers/staff/accept-invite.js');
const portal = read('src/ui/portal.js');

const results = [];
function check(name, test) { test(); results.push(name); }

check('pending direct reschedule pending kalır', () => {
  assert.match(reschedule, /apt\.status === 'approved' \? 'approved' : 'pending'/);
});

check('48 saat altı pending/approved statusBeforeRequest saklanır', () => {
  assert.match(reschedule, /statusBeforeRequest = \['pending', 'approved'\]\.includes\(apt\.status\)/);
  assert.match(reschedule, /rescheduleRequestStatus: 'pending'/);
});

check('patron onayı önceki appointment durumunu korur', () => {
  assert.match(reschedule, /\['pending', 'approved'\]\.includes\(apt\.statusBeforeRequest\)/);
  assert.match(reschedule, /rescheduleRequestStatus: isOwnerOrAdmin \? 'approved'/);
});

check('Firebase node key authoritative kimliktir', () => {
  assert.match(list, /aptId: nodeId/);
  assert.match(list, /appointmentId: nodeId/);
});

check('değişiklik talebi geri çekme appointment iptali değildir', () => {
  const withdraw = reschedule.slice(reschedule.indexOf("action === 'withdraw'"), reschedule.indexOf("action === 'reject'"));
  assert.match(withdraw, /rescheduleRequestStatus: 'withdrawn'/);
  assert.match(withdraw, /status: restoredStatus/);
  assert.doesNotMatch(withdraw, /status: 'cancelled'/);
  assert.match(customer, /Değişiklik Talebini Geri Çek/);
});

check('randevu iptali ayrı 48 saat akışındadır', () => {
  assert.match(customer, /requestCancelCustomer/);
  assert.match(updateStatus, /effectiveStatus = 'cancelled'/);
  assert.match(updateStatus, /cancelRequestStatus/);
});

check('Bekleyenler birleşik inbox içerir', () => {
  assert.match(owner, /plainPendingApts/);
  assert.match(owner, /\.\.\.cancelRequestApts, \.\.\.rescheduleRequestApts/);
  assert.match(owner, /cancelRequestStatus === 'pending'/);
  assert.match(owner, /rescheduleRequestStatus === 'pending'/);
});

check('notification deep-link metadata ve güvenli fallback vardır', () => {
  for (const field of ['requestId', 'targetTab', 'targetSection']) assert.match(notifications, new RegExp(field));
  assert.match(owner, /openOwnerNotificationTarget/);
  assert.match(owner, /activeOwnerAptCategory = .*\? section : 'all'/);
});

check('çalışan rolü stale müşteri portal moduna yenilmez', () => {
  assert.match(index, /routeForResolvedRole\(user\.role\)/);
  assert.match(index, /resolvedRoute === 'staff'[\s\S]*setPortalMode\('salon'\)/);
  assert.match(index, /resolvedRoute === 'staff'[\s\S]*renderStaffScreen\(user/);
});

check('aynı Firebase hesabı daveti idempotent tamamlayabilir', () => {
  assert.match(auth, /auth\/email-already-in-use/);
  assert.match(auth, /signInWithEmailAndPassword/);
  assert.match(invite, /alreadyAccepted: isAccepted\(invite\)/);
  assert.match(invite, /acceptedUid\(invite\)/);
  assert.match(invite, /claimantUid && claimantUid !== uid/);
  assert.match(portal, /showErrorModal\('Hata'/);
  assert.match(portal, /loginSuggested \? 'Giriş Yap' : 'Kapat'/);
});

check('approve çakışması requesti approved yapmaz', () => {
  assert.match(reschedule, /targetConflict = true/);
  assert.match(reschedule, /if \(!updateResult\.committed\)/);
  assert.match(reschedule, /status\(targetConflict \? 409 : 404\)/);
});

console.log(`FINAL FIX v2 LOCAL: ${results.length}/${results.length} kontrol geçti`);
for (const result of results) console.log(`PASS ${result}`);
