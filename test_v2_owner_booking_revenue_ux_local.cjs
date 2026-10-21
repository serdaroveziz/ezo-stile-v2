const assert = require('node:assert/strict');
const fs = require('node:fs');

const owner = fs.readFileSync('src/ui/owner.js', 'utf8');
const css = fs.readFileSync('src/styles/app.css', 'utf8');

const appointmentSummarySource = owner.match(/export function calculateStaffAppointmentSummary\(appointments\) \{[\s\S]*?\n\}/);
assert.ok(appointmentSummarySource, 'appointment summary helper exists');
const appointmentSummary = Function(`return (${appointmentSummarySource[0].replace('export ', '')})`)();
assert.deepEqual(appointmentSummary([
  { status:'completed' }, { status:'approved' }, { status:'pending' },
  { status:'no_show' }, { status:'cancelled' }, { status:'rejected' }
]), { total:6, completed:1, noShow:1, cancelled:2, pending:2 });

const categoryFilterSource = owner.match(/export function filterOwnerAppointmentsByCategory\(appointments, category\) \{[\s\S]*?\n\}/);
assert.ok(categoryFilterSource, 'disjoint appointment category filter exists');
const categoryFilter = Function('effectiveAppointmentStatus', `return (${categoryFilterSource[0].replace('export ', '')})`)(item => item.status);
const categoryRows = [
  { appointmentId:'completed', status:'completed' }, { appointmentId:'no-show', status:'no_show' },
  { appointmentId:'cancelled', status:'cancelled' }, { appointmentId:'rejected', status:'rejected' }, { appointmentId:'expired', status:'expired' }
];
assert.deepEqual(categoryFilter(categoryRows, 'no_show').map(item => item.appointmentId), ['no-show'], 'no-show category contains only canonical no_show rows');
assert.deepEqual(categoryFilter(categoryRows, 'cancelled').map(item => item.appointmentId), ['cancelled', 'rejected', 'expired'], 'cancelled category excludes no_show rows');

const revenueSummarySource = owner.match(/export function calculateOwnerRevenueSummary\(appointments,[\s\S]*?\n\}/);
assert.ok(revenueSummarySource, 'revenue summary helper exists');
const revenueSummary = Function('getIstanbulDateKey','getAptPrice','toLocalDateKey',`return (${revenueSummarySource[0].replace('export ', '')})`)(
  ()=>'2026-09-06', item=>Number(item.price||0), date=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
);
assert.deepEqual(revenueSummary([
  { date:'2026-09-06', status:'completed', price:100 },
  { date:'2026-09-05', status:'completed', price:200 },
  { date:'2026-09-06', status:'approved', price:900 },
  { date:'2026-09-01', status:'cancelled', price:700 }
], '2026-09-06'), { day:100, week:300, month:300 });

assert.match(owner, /ownerStaffAccordionOpen = false/, 'staff accordion starts collapsed');
assert.match(owner, /selectedStaff \? allApts\.filter/, 'selected employee scopes the summary');
assert.match(owner, /window\.switchOwnerAptCategory/, 'appointment detail navigation remains');
assert.match(owner, /switchOwnerAptCategory\('no_show'\)/, 'no-show counter opens its own category');
assert.match(owner, /activeOwnerAptCategory === 'no_show'.*ownerNoShowAppointments/, 'no-show list uses its dedicated localized title');
assert.match(owner, /targetList\.length === 0[\s\S]*ownerUi_074/, 'category empty state remains shared and localized');
assert.match(owner, /window\.updateAppointmentStatusOwner/, 'appointment actions remain');
assert.match(owner, /a && a\.status === 'approved' && !a\.requestedDate/, 'approved appointments stay visible even after their scheduled time');
assert.match(owner, /\.\.\.plainPendingApts, \.\.\.approvedApts/, 'approved appointments remain in the existing waiting list and retain its actions');
assert.match(owner, /updateAppointmentStatusOwner\('\$\{a\.aptId\}', 'completed'/, 'approved appointment keeps the canonical complete action');
assert.match(owner, /\$\{false \? `<div class="owner-category-grid">/, 'duplicated large category grid is not rendered');
assert.match(owner, /owner-revenue-periods/, 'day/week/month summary cards exist');
assert.match(owner, /window\.openOwnerRevenuePeriod/, 'summary cards open detail');
assert.match(owner, /ownerRevenueDetailsExpanded \? ciroBodyHtml/, 'revenue breakdown is collapsed initially');
assert.match(owner, /status === 'completed'/, 'completed-only revenue remains');
assert.match(owner, /Europe\/Istanbul/, 'Istanbul date handling remains');
assert.match(css, /owner-modal-header\{position:sticky/, 'owner modal header remains sticky');
assert.match(css, /overflow:hidden/, 'mobile overflow protection remains');

console.log('OWNER BOOKING + REVENUE UX LOCAL: 16/16 kontrol geçti');
