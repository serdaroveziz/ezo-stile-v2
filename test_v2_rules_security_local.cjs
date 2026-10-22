/* Static RTDB rules contract checks. Local-only; never contacts Firebase. */
const assert = require('node:assert/strict');
const fs = require('node:fs');

const rules = JSON.parse(fs.readFileSync('database.rules.json', 'utf8')).rules;
const cases = [];
const check = (name, assertion) => {
  assertion();
  cases.push(name);
  console.log(`  PASS: ${name}`);
};

const user = rules.users.$uid;
const business = rules.businesses.$businessId;

check('customer aiCredits artıramaz', () => assert.equal(user.aiCredits['.write'], false));
check('customer role=owner yapamaz', () => {
  assert.equal(user['.write'], false);
  assert.doesNotMatch(user.role['.write'], /\$uid === auth\.uid/);
});
check('customer businessId değiştiremez', () => assert.doesNotMatch(user.businessId['.write'], /\$uid === auth\.uid/));
check('customer permissions değiştiremez', () => assert.doesNotMatch(user.permissions['.write'], /\$uid === auth\.uid/));
check('owner plan değiştiremez', () => {
  assert.equal(business['.write'], false);
  assert.doesNotMatch(business.plan['.write'], /ownerUid/);
});
check('owner subscription değiştiremez', () => assert.doesNotMatch(business.subscription['.write'], /ownerUid/));
check('reviews client write bypass kapalı', () => assert.equal(rules.reviews.$reviewId['.write'], false));
check('salon başvurusu client write yalnız admin', () => { assert.match(rules.salon_applications.$appId['.write'], /super_admin/); assert.doesNotMatch(rules.salon_applications.$appId['.write'], /newData/); });
check('customer appointment kaydına doğrudan yazamaz', () => assert.equal(rules.appointments.$aptId['.write'], false));
check('customer başka kullanıcıya notification yazamaz', () => assert.equal(rules.notifications.$uid['.write'], false));
check('customer kendi notification/read boolean alanını değiştirebilir', () => {
  assert.match(rules.notifications.$uid.$notificationId.read['.write'], /\$uid === auth\.uid/);
  assert.match(rules.notifications.$uid.$notificationId.read['.validate'], /newData\.isBoolean\(\)/);
});
check('normal profil adı dil ve fotoğraf güncellemesi izinlidir', () => {
  for (const field of ['displayName', 'name', 'language', 'photoUrl']) {
    assert.match(user[field]['.write'], /\$uid === auth\.uid/);
  }
});
check('AI ledger ve bonus alanları istemciye kapalıdır', () => {
  assert.equal(user.welcomeAiBonusGranted['.write'], false);
  assert.equal(user.credit_ledger['.write'], false);
});
check('business hassas alanları public okunamaz', () => {
  assert.notEqual(business['.read'], true);
  for (const field of ['plan', 'planStatus', 'subscription', 'staffLimit', 'ownerUid']) {
    assert.notEqual(business[field]['.read'], true);
  }
});
check('aynı businessId kullanıcıları başka user profilini okuyamaz', () => {
  assert.doesNotMatch(user['.read'], /businessId/);
});
check('public_businesses herkese okunur ve istemci yazımına kapalıdır', () => {
  assert.equal(rules.public_businesses['.read'], true);
  assert.equal(rules.public_businesses['.write'], false);
});

console.log(`RTDB rules security contract: ${cases.length}/${cases.length} PASS (local, no network)`);
