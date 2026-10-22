const assert = require('assert');
const fs = require('fs');

function clone(value) { return value === undefined ? undefined : JSON.parse(JSON.stringify(value)); }
function parts(path) { return String(path || '').split('/').filter(Boolean); }
function read(root, path) { return parts(path).reduce((value, key) => value && value[key], root); }
function write(root, path, value) {
  const keys = parts(path); let target = root;
  for (const key of keys.slice(0, -1)) target = target[key] ||= {};
  if (!keys.length) throw new Error('root write must use update');
  if (value === null) delete target[keys.at(-1)]; else target[keys.at(-1)] = clone(value);
}
function snapshot(value) { return { exists: () => value !== undefined && value !== null, val: () => clone(value) }; }
function fakeDb(seed, beforeTransaction, transactionMode = 'normal') {
  const state = clone(seed);
  const metrics = { transactions: 0 };
  return { state, metrics, ref(path = '') {
    return {
      async get() { return snapshot(read(state, path)); },
      async transaction(callback) {
        metrics.transactions += 1;
        if (beforeTransaction) await beforeTransaction(state, path);
        let next;
        if (transactionMode === 'repeated-null') {
          for (let index = 0; index < 4; index += 1) next = callback(null);
          return { committed: false, snapshot: snapshot(read(state, path)) };
        }
        next = callback(transactionMode === 'null-first' ? null : clone(read(state, path)));
        if (next === undefined) return { committed: false, snapshot: snapshot(read(state, path)) };
        write(state, path, next);
        return { committed: true, snapshot: snapshot(next) };
      },
      async update(values) { for (const [key, value] of Object.entries(values)) write(state, key, value); },
      async set(value) { write(state, path, value); },
      async remove() { write(state, path, null); }
    };
  }};
}

(async () => {
  const { acceptStaffInvite, normalizeInviteCode } = await import('./server/handlers/staff/accept-invite.js');
  const baseInvite = { token: 'inv_ABC123', phone: '+905551112233', displayName: 'Test Çalışan', role: 'barber', businessId: 'biz_1', permissions: {}, expiresAt: Date.now() + 60000, used: false, status: 'pending' };
  const base = { staff_invites: { inv1: baseInvite }, businesses: { biz_1: { name: 'Salon', status: 'active', discoveryEnabled: true, staff: {} } }, users: {} };

  const fresh = fakeDb(base, null, 'null-first');
  const result = await acceptStaffInvite({ db: fresh, uid: 'uid_1', token: ' INV_ abc123 ', phone: '+905551112233' });
  assert.equal(result.success, true, 'fresh invite succeeds');
  assert.equal(fresh.state.users.uid_1.role, 'barber');
  assert.equal(fresh.state.businesses.biz_1.staff.stf_uid_1.userId, 'uid_1');
  assert.equal(fresh.state.staff_invites.inv1, undefined, 'fully accepted invite is removed');
  assert.equal(Object.keys(fresh.state.businesses.biz_1.staff).length, 1, 'accept does not duplicate staff');
  const receiptRetry = await acceptStaffInvite({ db: fresh, uid: 'uid_1', token: 'inv_abc123', phone: '+905551112233' });
  assert.equal(receiptRetry.alreadyAccepted, true, 'same UID retry succeeds from phone index receipt after invite deletion');
  assert.equal(Object.keys(fresh.state.businesses.biz_1.staff).length, 1, 'receipt retry does not duplicate staff');

  for (const invitedRole of ['receptionist', 'manager']) {
    const roleSeed = clone(base);
    roleSeed.staff_invites.inv1.role = invitedRole;
    const roleDb = fakeDb(roleSeed);
    const roleResult = await acceptStaffInvite({ db: roleDb, uid: `uid_${invitedRole}`, token: 'inv_abc123', phone: '+905551112233' });
    assert.equal(roleResult.user.role, invitedRole, `${invitedRole} invite preserves its backend role`);
    assert.equal(roleDb.state.users[`uid_${invitedRole}`].role, invitedRole, `${invitedRole} profile is finalized`);
    assert.equal(roleDb.state.businesses.biz_1.staff[`stf_uid_${invitedRole}`].role, invitedRole, `${invitedRole} staff link is finalized`);
  }

  const repeatedNull = fakeDb(base, null, 'repeated-null');
  await assert.rejects(() => acceptStaffInvite({ db: repeatedNull, uid: 'uid_null', token: 'inv_abc123', phone: '+905551112233' }), /geçici olarak tamamlanamadı/);
  assert.equal(repeatedNull.metrics.transactions, 3, 'null retry is bounded to three transaction attempts');

  const partialSeed = clone(base);
  partialSeed.staff_invites.inv1 = { ...baseInvite, used: true, status: 'accepted', acceptedByUid: 'uid_2' };
  const partial = fakeDb(partialSeed);
  const repaired = await acceptStaffInvite({ db: partial, uid: 'uid_2', token: 'inv_abc123', phone: '+905551112233' });
  assert.equal(repaired.reconciled, true, 'partial accept is repaired');
  assert.equal(partial.state.users.uid_2.businessId, 'biz_1');
  assert.equal(Object.keys(partial.state.businesses.biz_1.staff).length, 1);

  const foreignSeed = clone(base);
  foreignSeed.staff_invites.inv1 = { ...baseInvite, used: true, status: 'accepted', acceptedByUid: 'uid_2' };
  await assert.rejects(() => acceptStaffInvite({ db: fakeDb(foreignSeed), uid: 'uid_other', token: 'inv_abc123', phone: '+905551112233' }), /başka bir kullanıcı tarafından kullanılmış/);

  const expiredSeed = clone(base);
  expiredSeed.staff_invites.inv1.expiresAt = Date.now() - 1;
  await assert.rejects(() => acceptStaffInvite({ db: fakeDb(expiredSeed), uid: 'uid_expired', token: 'inv_abc123', phone: '+905551112233' }), /süresi dolmuş/);

  let raced = false;
  const race = fakeDb(base, async (state, path) => {
    if (!raced && path === 'staff_invites/inv1') {
      raced = true;
      state.staff_invites.inv1 = { ...state.staff_invites.inv1, used: true, status: 'accepted', usedByUid: 'uid_race' };
    }
  });
  const raceResult = await acceptStaffInvite({ db: race, uid: 'uid_race', token: 'inv_abc123', phone: '+905551112233' });
  assert.equal(raceResult.success, true, 'same UID concurrent retry reconciles');

  const ownerSeed = clone(base);
  ownerSeed.businesses.biz_1.ownerUid = 'uid_owner';
  ownerSeed.users = { uid_owner: { uid: 'uid_owner', role: 'owner', businessId: 'biz_1' } };
  await assert.rejects(
    () => acceptStaffInvite({ db: fakeDb(ownerSeed), uid: 'uid_owner', token: 'inv_abc123', phone: '+905551112233' }),
    /Salon sahibi hesabı çalışan davetiyle değiştirilemez/,
    'real owner identity cannot be downgraded by a staff invite'
  );

  assert.equal(normalizeInviteCode('  INV_ AB C  '), 'inv_abc');
  assert.equal(normalizeInviteCode(123456), '123456');

  const portal = fs.readFileSync('src/ui/portal.js', 'utf8');
  const index = fs.readFileSync('index.html', 'utf8');
  assert.match(portal, /showErrorModal\('Hata'/, 'invite error title is UTF-8 Turkish');
  assert.doesNotMatch(portal.slice(portal.indexOf('submitAcceptStaffInvite')), /Ýalňyşlyk/);
  assert.match(portal, /setPortalMode\('salon'\)/, 'accepted employee selects salon portal');
  assert.match(index, /renderStaffScreen\(user/, 'accepted staff routes to staff renderer');
  console.log('PASS: null-first success, bounded null failure, retry, partial repair, foreign UID reject, expiry, duplicate prevention and normalization');
})().catch(error => { console.error(error); process.exit(1); });
