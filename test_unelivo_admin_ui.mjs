// Super admin review (22 Oct 2026): escaping of user-supplied text, readable labels, Istanbul date.
import assert from 'node:assert/strict';
import fs from 'node:fs';

let passed = 0;
const check = (ok, message) => { assert.ok(ok, message); passed++; };
const admin = fs.readFileSync('src/ui/super-admin.js', 'utf8');

// salon/apply stores salonName as typed, so the applications list must escape it.
check(admin.includes('${escapeAdminText(a.salonName)}') && !/\$\{a\.salonName\}/.test(admin), 'application salon name is escaped');
check(admin.includes('${escapeAdminText(u.displayName || u.name ||') && admin.includes('${escapeAdminText(u.phone ||'), 'user name and phone are escaped');
check(!/\$\{a\.status\}/.test(admin) && admin.includes("t('approved')") && admin.includes("t('rejected')"), 'application status badge is translated, not the raw value');
check(admin.includes("timeZone: 'Europe/Istanbul'") && !admin.includes("new Date().toISOString().split('T')[0]"), "today's appointments use the Istanbul calendar day");
const dashboard = admin.slice(admin.indexOf("if (activeAdminTab === 'dashboard')"), admin.indexOf('admin-metrics'));
check(!dashboard.includes("t('superAdminTitle')") && !dashboard.includes('admin-shortcuts'), 'dashboard has no duplicated title or nav-duplicating shortcuts');
check(admin.includes("window.openAuditLogModal") , 'audit log stays reachable');

const remaining = fs.readFileSync('src/locales/remaining.js', 'utf8');
for (const label of ['Ücretsiz Premium Tanımları|', 'AI Kullanımı ve Sağlayıcı Durumu|', 'Denetim Kayıtları|']) check(remaining.includes('\n' + label), `Turkish admin label: ${label.slice(0, -1)}`);

console.log(`UNELIVO ADMIN UI: ${passed}/${passed} PASS`);
