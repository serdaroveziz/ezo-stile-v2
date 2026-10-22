const fs = require('fs');
const assert = require('assert');

const index = fs.readFileSync('index.html', 'utf8');
const staff = fs.readFileSync('src/ui/staff.js', 'utf8');
const icons = fs.readFileSync('src/ui/icons.js', 'utf8');
const owner = fs.readFileSync('src/ui/owner.js', 'utf8');
const customer = fs.readFileSync('src/ui/customer.js', 'utf8');
const admin = fs.readFileSync('src/ui/super-admin.js', 'utf8');
const bookingList = fs.readFileSync('server/handlers/booking/list.js', 'utf8');

assert.match(index, /const authoritativeRoute = routeForResolvedRole\(user\.role\)/, 'backend role must be the authorization routing source');
assert.match(index, /authoritativeRoute === 'owner' && getPortalMode\(\) === 'customer'/, 'only a verified owner may select customer UI mode');
assert.doesNotMatch(index, /authoritativeRoute === 'staff'[\s\S]{0,120}getPortalMode/, 'staff routing must never be overridden by portal preference');
assert.match(index, /resolvedRoute === 'staff'[\s\S]*setPortalMode\('salon'\)/, 'staff login must repair stale customer preference');
assert.match(index, /resolvedRoute === 'owner'[\s\S]*renderOwnerScreen\(user/, 'owner must still use owner screen');
assert.match(index, /resolvedRoute === 'staff'[\s\S]*renderStaffScreen\(user/, 'staff must use dedicated staff screen');
assert.match(index, /renderCustomerScreen/, 'customer renderer must remain available');

assert.match(staff, /export async function renderStaffScreen/, 'dedicated staff renderer must exist');
assert.match(staff, /role==='barber'[\s\S]*appointmentBelongsToStaff/, 'barber appointments must be filtered to own identity');
assert.match(staff, /uiIcon as staffIcon/, 'staff panel uses shared SVG icon system');
assert.match(icons, /export function uiIcon[\s\S]*stroke-width="1\.8"/, 'shared icons use one stroke system');
assert.doesNotMatch(staff, /📅|⚙️|👥|📊|⏰|🔔|👤|🚪/, 'staff panel contains no emoji icons');
assert.match(staff, /\['home','home',t\('[^']+'\)\][\s\S]*\['profile','user',t\('[^']+'\)\]/, 'bottom navigation contains the primary destinations');
assert.match(staff, /operationTabs\.length\?\[\['operations'/, 'operations navigation remains permission gated');
assert.match(bookingList, /profile\.role !== 'owner' && !canViewAllStaffAppointments[\s\S]*records = records\.filter/, 'unprivileged staff filtering must also happen on the authoritative server response');
assert.match(bookingList, /hasPermission\(profile\.permissions,'appointments\.view'\)[\s\S]*hasPermission\(profile\.permissions,'appointments\.manage'\)/, 'manager and receptionist appointment permissions must be preserved');
['staffUi_22','staffUi_30','staffUi_28','staffUi_50','staffUi_58'].forEach(key => assert.ok(staff.includes(key), `${key} must exist`));
['Personel Kadrosu', 'Paket Yükselt', 'Salon Ayarları'].forEach(label => assert.ok(!staff.includes(label), `${label} must not exist in staff panel`));
assert.match(staff, /canManual=hasStaffPermission\(user,'appointments\.create'\)/, 'manual booking must be permission gated');
assert.match(staff, /canFinance=hasStaffPermission\(user,'finance\.view'\)/, 'finance panel must be permission gated');
assert.match(owner, /export async function renderOwnerScreen/, 'owner renderer unchanged and present');
assert.match(owner, /\['barber', 'receptionist', 'manager'\]\.includes\(user\.role\)[\s\S]*renderStaffScreen/, 'owner renderer must fail closed to staff renderer');
assert.match(customer, /export async function renderCustomerScreen/, 'customer renderer unchanged and present');
assert.match(admin, /export async function renderSuperAdminScreen/, 'super admin renderer unchanged and present');

console.log('PASS: staff routing, dedicated renderer, own-appointment isolation, and role regressions');
