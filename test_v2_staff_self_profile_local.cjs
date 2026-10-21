const assert = require('node:assert/strict');
const fs = require('node:fs');

(async () => {
  const profile = await import('./server/handlers/staff/update-self-profile.js');
  const staffUi = fs.readFileSync('src/ui/staff.js', 'utf8');
  const router = fs.readFileSync('api/index.js', 'utf8');

  assert.deepEqual(profile.normalizeSelfProfileInput({ displayName:'  azat   şeker ', phone:'0532 123 45 67', language:'fa', notificationsEnabled:false }), {
    displayName:'Azat Şeker', phone:'+905321234567', language:'fa', notificationsEnabled:false
  }, 'own name, phone, language and notifications are allowlisted');
  assert.throws(() => profile.normalizeSelfProfileInput({ phone:'0532123' }), /Türkiye telefon/, 'invalid phone rejected');
  assert.throws(() => profile.normalizeSelfProfileInput({ language:'xx' }), /Geçersiz dil/, 'invalid language rejected');
  for (const field of ['role','permissions','businessId','ownerUid','staffId','userId','email','photoUrl']) {
    assert.equal(profile.hasForbiddenSelfProfileFields({ [field]:'attempt' }), true, `${field} is server-blocked`);
  }
  const own = profile.findOwnStaffEntry({ a:{ userId:'other' }, own:{ userId:'me', role:'barber' } }, 'me');
  assert.equal(own[0], 'own', 'only current auth uid resolves own staff record');
  assert.equal(profile.findOwnStaffEntry({ a:{ userId:'other' } }, 'me'), undefined, 'other staff cannot be selected');
  assert.match(router, /staff\/update-self-profile/, 'central API router exposes self profile endpoint');
  assert.match(staffUi, /openStaffProfileEditor/, 'profile edit action exists');
  assert.match(staffUi, /authenticatedFetch\('\/api\/staff\/update-self-profile'/, 'profile form uses server endpoint');
  assert.match(staffUi, /STAFF_PERMISSION_LABEL_KEYS/, 'permissions are translated instead of raw display');
  assert.doesNotMatch(staffUi, /staff-readonly-permission">\$\{esc\(permission\)\}/, 'raw permission keys are not rendered');
  console.log('STAFF SELF PROFILE LOCAL: PASS');
})().catch(error => { console.error(error); process.exitCode = 1; });
