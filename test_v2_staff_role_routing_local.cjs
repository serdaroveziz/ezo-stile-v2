const assert = require('assert');
const fs = require('fs');

(async () => {
  const { routeForResolvedRole } = await import('./src/role-routing.js');
  for (const role of ['barber', 'receptionist', 'manager']) {
    assert.equal(routeForResolvedRole(role), 'staff', `${role} must route to staff`);
  }
  assert.equal(routeForResolvedRole('owner'), 'owner');
  assert.equal(routeForResolvedRole('customer'), 'customer');
  assert.equal(routeForResolvedRole('super_admin'), 'super_admin');

  const auth = fs.readFileSync('src/auth.js', 'utf8');
  const firebase = fs.readFileSync('src/firebase.js', 'utf8');
  const owner = fs.readFileSync('src/ui/owner.js', 'utf8');
  const staff = fs.readFileSync('src/ui/staff.js', 'utf8');
  const portal = fs.readFileSync('src/ui/portal.js', 'utf8');
  const resolveRole = fs.readFileSync('server/handlers/auth/resolve-role.js', 'utf8');
  const firebaseAdmin = fs.readFileSync('server/firebase-admin.js', 'utf8');
  const index = fs.readFileSync('index.html', 'utf8');
  assert.match(auth, /resolveBackendUserRole\(credential\.user\.uid\)/, 'invite success must re-resolve authoritative role');
  assert.match(auth, /refreshCurrentIdToken\(credential\.user\.uid\)/, 'invite success refreshes the accepting Firebase identity token');
  assert.match(firebase, /getIdToken\(true\)/, 'forced ID token refresh is implemented');
  assert.match(auth, /resetUidBoundClientState\(nextUid\)/, 'UID changes clear previous portal state');
  assert.match(auth, /_currentRenderOwnerScreen = null/, 'UID reset invalidates stale owner renderer');
  assert.match(auth, /\['barber', 'receptionist', 'manager'\]\.includes\(resolvedUser\.role\)/, 'invite response cannot open owner for staff');
  assert.match(portal, /await onAuthenticated\(user\)/, 'invite success waits for central authoritative routing');
  assert.match(index, /renderPortalScreen\(handleUserRouting\)/, 'portal forwards the central async routing function without dropping its promise');
  assert.match(owner, /\['barber', 'receptionist', 'manager'\]\.includes\(user\.role\)[\s\S]*renderStaffScreen/, 'owner renderer must redirect staff fail-closed');
  assert.match(owner, /user\.role !== 'owner'[\s\S]*throw new Error/, 'non-owner cannot render owner panel');
  assert.match(owner, /isSessionCurrent\(user\.uid, renderGeneration\)[\s\S]*return/, 'stale owner async render cannot overwrite a new UID panel');
  assert.match(staff, /isSessionCurrent\(user\.uid,renderGeneration\)[\s\S]*return/, 'staff async render is UID scoped');
  assert.match(firebaseAdmin, /ownerUid === uid[\s\S]*VERIFIED_OWNER_UID/, 'real owner relation has explicit precedence');
  assert.match(firebaseAdmin, /linkedStaff[\s\S]*VERIFIED_ACTIVE_STAFF/, 'active linked staff record controls staff role');
  assert.match(firebaseAdmin, /INVALID_OWNER_PROFILE_FALLBACK_CUSTOMER/, 'unverified owner profile fails closed');
  assert.match(resolveRole, /authContext\.resolution[\s\S]*resolutionReason/, 'resolve-role exposes the central decision reason only in diagnostic mode');
  assert.match(index, /resolvedRoute === 'super_admin'[\s\S]*renderSuperAdminScreen/, 'super admin route unchanged');
  console.log('PASS: barber/receptionist/manager staff routing, owner guard, customer and super admin routing');
})().catch(error => { console.error(error); process.exit(1); });
