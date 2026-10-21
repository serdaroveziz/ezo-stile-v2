const assert = require('node:assert/strict');
const fs = require('node:fs');
const read = file => fs.readFileSync(file, 'utf8');

const staff = read('src/ui/staff.js');
const list = read('server/handlers/booking/list.js');
const admin = read('src/ui/super-admin.js');
const status = read('server/handlers/salon/toggle-status.js');
const discovery = read('server/handlers/salon/toggle-discovery.js');
const css = read('src/styles/app.css');

assert.match(staff, /a\.staffId,a\.staffUid,a\.staffUserId/, 'all canonical staff identity fields are matched');
assert.match(staff, /a\.businessId===user\.businessId/, 'client view is tenant scoped');
assert.match(list, /ownIds\.has\(record\.staffUserId\)/, 'server list supports staffUserId assignments');
assert.match(list, /profile\.businessId === requestedBusinessId/, 'server list verifies tenant');
assert.doesNotMatch(staff, /Hızlı İşlemler/, 'staff home no longer contains quick actions');
assert.match(staff, /t\('staffUi_26'\)/, 'staff home has compact metrics');
assert.match(staff, /\['today','upcoming','past'\]/, 'appointment scopes exist');
assert.match(staff, /t\('staffUi_55'\)/, 'profile permissions are read-only');
assert.match(staff, /user\.email/, 'profile exposes email when present');
assert.match(admin, /normalized\.length < 2/, 'admin smart search ignores one-character queries');
assert.match(admin, /salonCityFilter/, 'admin city filter exists');
assert.match(admin, /t\('uiRemaining_182'\)/, 'support mode is explicitly read-only');
assert.doesNotMatch(admin, /localStorage[\s\S]{0,120}supportViewBusinessId/, 'support mode does not impersonate through localStorage');
assert.match(status, /profile\.role !== 'super_admin'/, 'status action rejects non-admin users');
assert.match(discovery, /profile\.role !== 'super_admin'/, 'discovery action rejects non-admin users');
assert.match(status, /before: \{ status:/, 'status audit contains before/after');
assert.match(discovery, /metadata: \{ before:/, 'discovery audit contains before/after');
assert.match(admin, /<details class="card admin-audit-row"/, 'audit rows are summary-first');
assert.doesNotMatch(admin, /max-height: 400px; overflow-y: auto/, 'audit nested scroll was removed');
assert.match(css, /admin-salon-actions/, 'admin action grid is mobile safe');

console.log('STAFF + SUPER ADMIN TOUR LOCAL: 20/20 kontrol geçti');
