const assert = require('assert');
const fs = require('fs');

(async () => {
  const { validateOwnerPromotion } = await import('./server/handlers/salon/approve.js');
  const registerSource = fs.readFileSync('./server/handlers/auth/register-profile.js', 'utf8');
  const applySource = fs.readFileSync('./server/handlers/salon/apply.js', 'utf8');
  const approveSource = fs.readFileSync('./server/handlers/salon/approve.js', 'utf8');
  const authSource = fs.readFileSync('./src/auth.js', 'utf8');
  const indexSource = fs.readFileSync('./index.html', 'utf8');
  const customerSource = fs.readFileSync('./src/ui/customer.js', 'utf8');

  assert.match(registerSource, /role:\s*'customer'/, 'customer registration must be customer');
  assert.match(registerSource, /businessId:\s*null/, 'customer registration must not attach a tenant');
  assert.doesNotMatch(applySource, /role\s*:\s*['"]owner['"]/, 'pending application must not assign owner role');
  assert.doesNotMatch(applySource, /ownerUid\s*:/, 'pending application must not create ownership');

  const application = { status: 'pending', applicantUid: 'applicant-a' };
  assert.equal(validateOwnerPromotion(application, { role: 'customer' }, {}), 'applicant-a');
  assert.throws(() => validateOwnerPromotion(application, { role: 'owner', businessId: 'other' }, {}), /mevcut salon/);
  assert.throws(() => validateOwnerPromotion(application, { role: 'customer' }, { b1: { ownerUid: 'applicant-a' } }), /mevcut salon/);
  assert.throws(() => validateOwnerPromotion(application, { role: 'customer' }, { b1: { staff: { s1: { userId: 'applicant-a', active: true } } } }), /personel bağlantısı/);
  assert.throws(() => validateOwnerPromotion({ status: 'pending', applicantUid: 'different' }, null, {}), /kullanıcı hesabı/);

  assert.match(approveSource, /ownerUid:\s*applicantUid/, 'business owner must come from stored application applicant');
  assert.match(approveSource, /requireRole\(req\.auth, \['super_admin'\]\)/, 'approval must be server-authorized');
  assert.doesNotMatch(authSource, /body:\s*JSON\.stringify\([^)]*ownerUid/s, 'frontend auth flow must not submit ownerUid');
  assert.match(indexSource, /authoritativeRoute === 'owner' && getPortalMode\(\) === 'customer'/, 'owner customer mode must be UI-only');
  assert.match(customerSource, /user\.role === 'owner' && user\.portalMode === 'customer'/, 'customer renderer must explicitly gate owner customer mode');

  console.log('OWNER PROMOTION INVARIANTS LOCAL: 13/13 kontrol geçti');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
