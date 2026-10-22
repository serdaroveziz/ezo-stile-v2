const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const fs = require('node:fs');
const uid = 'target-user-123';
const phone = '+905321234567';
const email = 'target@example.test';
const sha = s => createHash('sha256').update(s).digest('hex');
const clone = s => JSON.parse(JSON.stringify(s));

function fixture() {
  return {
    users: { admin: { role:'super_admin' }, [uid]: { uid, role:'barber', businessId:'salon', name:'Deleted Person', phone, email, pushTokens:{ private:'token' } }, other:{ uid:'other', role:'customer', phone:'+905559876543' }, legacyAlias:{ uid, name:'Deleted Person' } },
    businesses: { salon:{ ownerUid:'owner-safe', staff:{ oldStaff:{ userId:uid, displayName:'Deleted Person', phone }, otherStaff:{ userId:'other-staff', displayName:'Keep' } } }, another:{ staff:{ oldStaff:{ userId:'different', displayName:'Keep too' } } } },
    public_businesses:{ salon:{ staff:[{ id:'oldStaff', displayName:'Deleted Person' }, { id:'otherStaff', displayName:'Keep' }] } },
    staff_phone_index:{ '5321234567':{ uid, staffId:'oldStaff', businessId:'salon', acceptedTokenHash:'private-invite-hash' }, keep:{ uid:'other' } },
    email_index:{ [sha(email)]:uid, keep:'other' },
    lookups:{ phones:{ '905321234567':uid, keep:'other' }, emails:{ [encodeURIComponent(email)]:uid, keep:'other' } },
    legacy_uid_hash:{ [sha(uid)]:true },
    staff_invites:{ linked:{ acceptedByUid:uid, token:'private-code' }, pending:{ phone, token:'pending-code' }, keep:{ phone:'+905559876543' } },
    salon_applications:{ own:{ applicantUid:uid, phone }, keep:{ applicantUid:'other' } },
    appointments:{ a:{ aptId:'a', appointmentId:'a', customerUid:uid, customerName:'Deleted Person', customerPhoneSnapshot:phone, customerEmail:email, notes:'private', status:'completed', servicePrice:350, date:'2026-09-20', time:'09:00', businessId:'salon', nested:{ phone } }, b:{ appointmentId:'b', businessId:'salon', staffId:'oldStaff', staffName:'Deleted Person', status:'completed', servicePrice:200 }, keep:{ businessId:'another', staffId:'oldStaff', customerUid:'other', status:'completed', servicePrice:100 } },
    audit_logs:{ own:{ logId:'log', actorUid:uid, action:'booking.completed', targetId:uid, timestamp:'2026-09-20', metadata:{ phone, email, before:{ name:'Deleted Person' } } }, keep:{ actorUid:'other', action:'keep' } },
    notifications:{ [uid]:{ private:{ message:'private' } }, owner:{ linked:{ appointmentId:'a', message:'Deleted Person booked' }, keep:{ message:'Keep' } } },
    push_delivery_events:{ [uid]:{ event:{ success:true } } },
    reviews:{ r:{ customerUid:uid, businessId:'salon', rating:5, comment:'My phone is '+phone } },
    payments:{ p:{ userUid:uid, amount:350, status:'paid', email, billingAddress:'Private' } }
  };
}

function harness(data = fixture(), options = {}) {
  const h = { data:clone(data), transactions:0, authDeleted:false, deletions:0, failCommit:options.failCommit, failAuth:options.failAuth, getUserError:options.getUserError };
  const ref = { on:()=>()=>{}, off:()=>{}, get:async()=>({val:()=>clone(h.data)}), transaction:async fn=> {
    h.transactions++;
    if (h.transactions === h.failCommit) throw new Error('Injected DB failure');
    if (options.nullOnly) return { committed:false };
    if (options.firstNull && h.transactions === 1) { assert.equal(fn(null), undefined); return {committed:false}; }
    if (h.transactions === 2 && options.concurrent) h.data.unrelatedConcurrent = {keep:true};
    const next=fn(clone(h.data));
    if (next === undefined) return {committed:false};
    h.data=next; return {committed:true};
  } };
  h.db={ref:()=>ref};
  h.auth={getUser:async()=> {
    if (h.getUserError) throw Object.assign(new Error('lookup'),{code:h.getUserError});
    if (h.authDeleted) throw Object.assign(new Error('gone'),{code:'auth/user-not-found'});
    return { uid, email, phoneNumber:phone, customClaims:options.claims || {} };
  },deleteUser:async()=> {
    h.deletions++;
    if(h.failAuth) throw new Error('Injected Auth failure');
    if(h.authDeleted) throw Object.assign(new Error('gone'),{code:'auth/user-not-found'});
    h.authDeleted=true;
  }};
  return h;
}

(async()=> {
  // This suite injects in-memory Auth/RTDB only. No Firebase SDK or network.
  global.fetch=()=>{throw new Error('Network forbidden in local test');};
  const {hardDeleteUser}=await import('./server/user-hard-delete.js');
  let passed=0;
  async function test(name,run){await run();passed++;console.log('PASS '+name);}
  const run=h=>hardDeleteUser({db:h.db,auth:h.auth,actorUid:'admin',targetUid:uid});
  await test('Auth, profile, private tokens, phone/email/UID indexes and invitation hashes physically removed',async()=>{
    const h=harness(); const r=await run(h); assert.equal(r.hardDeleted,true); assert.equal(h.authDeleted,true);
    for(const marker of [uid,phone,email,sha(uid),sha(email),'private-invite-hash','private-code','pending-code','Deleted Person']) assert.equal(JSON.stringify(h.data).includes(marker),false,marker);
    assert.equal(h.data.users.legacyAlias,undefined); assert.equal(h.data.staff_phone_index['5321234567'],undefined);
  });
  await test('Historical completed revenue/status retained; personal snapshots and audit metadata removed',async()=>{
    const h=harness();await run(h); assert.equal(h.data.appointments.a.servicePrice,350); assert.equal(h.data.appointments.a.status,'completed'); assert.equal(h.data.audit_logs.own.action,'booking.completed'); assert.equal(h.data.audit_logs.own.metadata,undefined); assert.equal(h.data.reviews.r.rating,5);assert.equal(h.data.reviews.r.comment,undefined);
  });
  await test('Other users, tenants, nested indexes and concurrent writes preserved',async()=>{
    const initial=fixture(),h=harness(initial,{concurrent:true});await run(h);
    assert.deepEqual(h.data.users.other,initial.users.other);assert.deepEqual(h.data.appointments.keep,initial.appointments.keep);assert.equal(h.data.lookups.phones.keep,'other');assert.equal(h.data.lookups.emails.keep,'other');assert.equal(h.data.unrelatedConcurrent.keep,true);assert.deepEqual(h.data.businesses.another,initial.businesses.another);
  });
  await test('Staff deletion does not collect another customer phone from shared appointments',async()=>{
    const h=harness();const other=clone(h.data.users.other);
    h.data.appointments.shared={businessId:'salon',staffUserId:uid,customerUid:'other',customerPhone:other.phone,status:'completed',servicePrice:80};
    await run(h);assert.deepEqual(h.data.users.other,other);assert.equal(h.data.appointments.shared.servicePrice,80);
  });
  await test('Repeated successful request is idempotent and retains no deletion journal',async()=>{
    const h=harness();await run(h);const first=clone(h.data);await run(h);assert.deepEqual(h.data,first);assert.equal(h.data._user_deletion_jobs?.[uid],undefined);
  });
  await test('Auth failure is not success; retry removes account and temporary cleanup journal',async()=>{
    const h=harness(undefined,{failAuth:true});await assert.rejects(run(h),/AUTH_DELETE_FAILED_RETRY/);assert.equal(h.data.users[uid].disabled,true);h.failAuth=false;await run(h);assert.equal(h.data.users[uid],undefined);
  });
  await test('Auth deleted + RTDB failure retries using saved contact identities',async()=>{
    const h=harness(undefined,{failCommit:2});await assert.rejects(run(h));assert.equal(h.authDeleted,true);assert.ok(h.data._user_deletion_jobs[uid]);h.failCommit=0;await run(h);assert.equal(JSON.stringify(h.data).includes(email),false);assert.equal(h.data._user_deletion_jobs[uid],undefined);
  });
  await test('Failure before journal commit leaves Auth untouched',async()=>{const h=harness(undefined,{failCommit:1});await assert.rejects(run(h));assert.equal(h.deletions,0);});
  await test('Self deletion blocked',async()=>{const h=harness();await assert.rejects(hardDeleteUser({db:h.db,auth:h.auth,actorUid:uid,targetUid:uid}),/SELF_DELETE_DENIED/);assert.equal(h.deletions,0);});
  await test('Other Super Admin and Auth custom-claim Super Admin blocked',async()=>{
    const h=harness();h.data.users[uid].role='super_admin';await assert.rejects(run(h),/SUPER_ADMIN_DELETE_DENIED/);const claims=harness(undefined,{claims:{role:'super_admin'}});await assert.rejects(run(claims),/SUPER_ADMIN_DELETE_DENIED/);assert.equal(h.deletions+claims.deletions,0);
  });
  await test('Non-admin and disabled admin blocked',async()=>{for(const change of [{role:'customer'},{role:'super_admin',disabled:true}]){const h=harness();h.data.users.admin=change;await assert.rejects(run(h),/ADMIN_REQUIRED/);assert.equal(h.deletions,0);}});
  await test('Actual ownership blocks deletion even with stale customer profile',async()=>{const h=harness();h.data.users[uid].role='customer';h.data.businesses.another.ownerUid=uid;await assert.rejects(run(h),/OWNER_TRANSFER_REQUIRED/);assert.equal(h.deletions,0);});
  await test('Invalid UID/path injection blocked',async()=>{const h=harness();await assert.rejects(hardDeleteUser({db:h.db,auth:h.auth,actorUid:'admin',targetUid:'../users'}),/INVALID_UID/);assert.equal(h.transactions,0);});
  await test('Auth lookup errors fail closed',async()=>{const h=harness(undefined,{getUserError:'auth/internal-error'});await assert.rejects(run(h),/AUTH_LOOKUP_FAILED/);assert.equal(h.transactions,0);});
  await test('Initial null cache retries; repeated null has bounded failure',async()=>{await run(harness(undefined,{firstNull:true}));const h=harness(undefined,{nullOnly:true});await assert.rejects(run(h),/DELETE_RETRY_REQUIRED/);assert.equal(h.transactions,3);assert.equal(h.deletions,0);});
  await test('Endpoint uses verified actor; deletes before missing-profile 404; no UID-bearing delete audit',async()=>{
    const source=fs.readFileSync('server/handlers/user/toggle-status.js','utf8');assert.match(source,/req\.auth\?\.uid/);assert.ok(source.indexOf("action === 'delete'")<source.indexOf('if (!targetUser)'));assert.doesNotMatch(source,/user\.archived|archived:|deletedBy/);
  });
  console.log(`HARD DELETE LOCAL: ${passed}/${passed} PASS`);
})().catch(e=>{console.error(e);process.exitCode=1;});
