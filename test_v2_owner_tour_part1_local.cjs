const assert = require('node:assert/strict');
const fs = require('node:fs');

const owner = fs.readFileSync('src/ui/owner.js', 'utf8');
const css = fs.readFileSync('src/styles/app.css', 'utf8');
const permissions = fs.readFileSync('src/staff-permissions.js', 'utf8');
const staffUpdate = fs.readFileSync('server/handlers/staff/update.js', 'utf8');

const metricSource = owner.match(/export function calculateOwnerDailyMetrics\(appointments, dateKey = getIstanbulDateKey\(\)\) \{[\s\S]*?\n\}/);
assert.ok(metricSource, 'central daily metric helper exists');
const calculateOwnerDailyMetrics = Function('getIstanbulDateKey', 'getAptPrice', `return (${metricSource[0].replace('export ', '')})`)(() => '2026-09-05', apt => Number(apt.servicePriceSnapshot ?? apt.servicePrice ?? 0));
const records = [
  { date:'2026-09-05', status:'completed', servicePriceSnapshot:400 },
  { date:'2026-09-05', status:'completed', servicePriceSnapshot:350 },
  { date:'2026-09-05', status:'cancelled', servicePriceSnapshot:900 },
  { date:'2026-09-04', status:'completed', servicePriceSnapshot:1000 }
];
assert.deepEqual(calculateOwnerDailyMetrics(records, '2026-09-05'), { appointmentCount:3, completedCount:2, revenue:750, pendingCount:0 });
assert.match(owner, /timeZone:'Europe\/Istanbul'/);
assert.match(owner, /dailyMetrics\.appointmentCount/);
assert.match(owner, /dailyMetrics\.completedCount/);
assert.match(owner, /todayCompleted\.reduce/);

assert.match(owner, /dateScopedAppointments/);
assert.match(owner, /owner-staff-filter/);
assert.match(owner, /subView === 'bugun' \|\| subView === 'menu'/);
assert.match(owner, /targetAppointment && targetAppointment\.date/);
assert.doesNotMatch(owner, /window\.setOwnerStaffFilter[\s\S]{0,180}selectedOwnerAptDate = ''/);

assert.match(owner, /api\/booking\/availability/);
assert.match(owner, /api\/booking\/create/);
assert.match(owner, /staffId: manualBookingDraft\.staffId/);
assert.match(owner, /isManual: true/);

assert.match(owner, /enableAllOwnerNotifications/);
assert.doesNotMatch(owner, /if \(!enabled\) cb\.checked = false/);
assert.match(owner, /users\/\$\{user\.uid\}\/notificationPreferences/);

assert.match(owner, /owner-permission-choice/);
assert.match(permissions, /strict&&invalid\.length/);
assert.match(staffUpdate, /sanitizeStaffPermissions/);
assert.doesNotMatch(permissions, /subscription\.manage|ownerUid|billing\.manage/);

assert.match(css, /owner-modal-header\{position:sticky/);
assert.match(css, /modal-overlay:has\(\.owner-modal-card\)\{align-items:center/);
assert.match(css, /owner-staff-filter\{display:grid/);
assert.match(css, /owner-permission-choice:hover/);

console.log('OWNER TOUR PART 1 LOCAL: PASS');
