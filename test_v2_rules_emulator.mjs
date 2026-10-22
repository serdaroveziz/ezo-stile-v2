import assert from 'node:assert/strict';
import fs from 'node:fs';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
const projectId = 'demo-ezo-rules';
const host = process.env.FIREBASE_DATABASE_EMULATOR_HOST;
if (host !== '127.0.0.1:19000' || process.env.FIREBASE_AUTH_EMULATOR_HOST !== '127.0.0.1:19099' || process.env.FIREBASE_PROJECT_ID !== projectId) throw new Error('Only isolated local demo emulators allowed');
const originalFetch = globalThis.fetch;
globalThis.fetch = (input, options) => {
  const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
  if (!['127.0.0.1','localhost'].includes(url.hostname)) throw new Error('External network prohibited: ' + url.hostname);
  return originalFetch(input, options);
};
const env = await initializeTestEnvironment({ projectId, database: { host:'127.0.0.1', port:19000, rules:fs.readFileSync('database.rules.json','utf8') } });
let count=0;
async function check(name, fn) { await fn(); console.log('PASS ' + ++count + ': ' + name); }
const schedule = Object.fromEntries(['monday','tuesday','wednesday','thursday','friday','saturday','sunday'].map(day=>[day,{isOpen:true,start:'00:00',end:'23:59'}]));
const seed = {
 users:{c1:{role:'customer',phone:'5551112233',language:'tr',aiCredits:{economy:0,premium:1}},c2:{role:'customer',phone:'5551112233'},o1:{role:'owner',businessId:'biz_a'},o2:{role:'owner',businessId:'biz_b'},s1:{role:'barber',businessId:'biz_a',permissions:['appointments.own.view','appointments.own.complete']},m1:{role:'manager',businessId:'biz_a',permissions:['appointments.view']},admin:{role:'super_admin'},spoof:{role:'owner',businessId:'biz_a'},stale:{role:'barber',businessId:'biz_a'},disabled:{role:'customer',disabled:true},missingRole:{businessId:'biz_a'}},
 businesses:{biz_a:{businessId:'biz_a',ownerUid:'o1',name:'Salon A',status:'active',discoveryEnabled:true,plan:'PREMIUM',subscription:{secret:'private'},weeklySchedule:schedule,services:{svc:{id:'svc',name:'Cut',price:100,duration:30,active:true}},staff:{stf_s1:{id:'stf_s1',userId:'s1',role:'barber',active:true,name:'Staff',permissions:['appointments.own.view','appointments.own.complete'],weeklySchedule:schedule,phone:'secret',commissionPercent:42},stf_m1:{id:'stf_m1',userId:'m1',role:'manager',active:true,name:'Manager',permissions:['appointments.view'],weeklySchedule:schedule}}},biz_b:{ownerUid:'o2',name:'B'}},
 public_businesses:{biz_a:{businessId:'biz_a',name:'Salon A'}},
 appointments:{a1:{businessId:'biz_a',customerUid:'c1',customerName:'Ayşe Yılmaz',customerPhone:'5551112233',staffId:'stf_s1',status:'completed',price:100,servicePriceSnapshot:100,privateExtra:{secret:true},date:'2026-01-01',time:'10:00'},a2:{businessId:'biz_b',customerUid:'c2',customerPhone:'5551112233',status:'completed'},a3:{businessId:'biz_a',customerUid:'c2',staffId:'stf_m1',status:'pending'}},
 reviews:{r2:{businessId:'biz_b',customerUid:'c2',appointmentId:'a2',rating:4,comment:'OK',customerName:'Full Private Name',createdAt:new Date().toISOString()}},
 notifications:{c1:{n1:{read:false,message:'mine'}},c2:{n2:{read:false,message:'other'}}},
 ai_generations:{g1:{userUid:'c1',status:'success'},g2:{userUid:'c2',status:'failed',refundGranted:false}},
 payments:{p1:{userUid:'c1',status:'created'}},audit_logs:{log1:{actorUid:'admin'}}
};
const db = uid => uid ? env.authenticatedContext(uid).database() : env.unauthenticatedContext().database();
try {
 await env.withSecurityRulesDisabled(async c=>c.database().ref().set(seed));
 await check('public projection read',()=>assertSucceeds(db().ref('public_businesses').once('value')));
 for(const p of ['users','businesses','appointments','reviews','notifications','ai_generations','payments','audit_logs','staff_phone_index','staff_invites','unknown']) await check('public deny '+p,()=>assertFails(db().ref(p).once('value')));
 for(const uid of ['c1','o1','s1','m1']) {
  await check(uid+' own profile allow',()=>assertSucceeds(db(uid).ref('users/'+uid).once('value')));
  await check(uid+' cross user deny',()=>assertFails(db(uid).ref('users/c2').once('value')));
  await check(uid+' role escalation deny',()=>assertFails(db(uid).ref('users/'+uid+'/role').set('super_admin')));
  await check(uid+' root multi-path escalation deny',()=>assertFails(db(uid).ref().update({['users/'+uid+'/role']:'super_admin',['users/'+uid+'/name']:'x'})));
  await check(uid+' public projection write deny',()=>assertFails(db(uid).ref('public_businesses/biz_a/name').set('evil')));
  await check(uid+' review bypass deny',()=>assertFails(db(uid).ref('reviews/evil').set({customerUid:uid,rating:5,businessId:'biz_a',appointmentId:'a3'})));
  await check(uid+' AI read deny',()=>assertFails(db(uid).ref('ai_generations/g1').once('value')));
  await check(uid+' AI write deny',()=>assertFails(db(uid).ref('ai_generations/g1/refundGranted').set(false)));
 }
 await check('owner own business read',()=>assertSucceeds(db('o1').ref('businesses/biz_a').once('value')));
 await check('owner safe name update',()=>assertSucceeds(db('o1').ref('businesses/biz_a/name').set('Salon A')));
 await check('owner cross business deny',()=>assertFails(db('o1').ref('businesses/biz_b').once('value')));
 await check('owner plan escalation deny',()=>assertFails(db('o1').ref('businesses/biz_a/plan').set('PREMIUM')));
 for(const uid of ['s1','m1','stale','spoof','missingRole','c1']) {
  await check(uid+' private business deny',()=>assertFails(db(uid).ref('businesses/biz_a').once('value')));
  await check(uid+' private staff subtree deny',()=>assertFails(db(uid).ref('businesses/biz_a/staff').once('value')));
  await check(uid+' raw tenant query deny',()=>assertFails(db(uid).ref('appointments').orderByChild('businessId').equalTo('biz_a').once('value')));
  if(uid!=='c1') await check(uid+' raw appointment key deny',()=>assertFails(db(uid).ref('appointments/a1').once('value')));
 }
 await check('customer own appointment query',()=>assertSucceeds(db('c1').ref('appointments').orderByChild('customerUid').equalTo('c1').once('value')));
 await check('customer other appointment deny',()=>assertFails(db('c1').ref('appointments/a2').once('value')));
 await check('customer cross UID query deny',()=>assertFails(db('c1').ref('appointments').orderByChild('customerUid').equalTo('c2').once('value')));
 await check('unfiltered appointment deny',()=>assertFails(db('o1').ref('appointments').once('value')));
 await check('owner tenant query allow',()=>assertSucceeds(db('o1').ref('appointments').orderByChild('businessId').equalTo('biz_a').once('value')));
 await check('owner cross tenant query deny',()=>assertFails(db('o1').ref('appointments').orderByChild('businessId').equalTo('biz_b').once('value')));
 await check('owner raw write deny',()=>assertFails(db('o1').ref('appointments/a1/status').set('completed')));
 await check('customer own notification allow',()=>assertSucceeds(db('c1').ref('notifications/c1').once('value')));
 await check('cross notification deny',()=>assertFails(db('c1').ref('notifications/c2').once('value')));
 await check('super admin cross notification deny',()=>assertFails(db('admin').ref('notifications/c1').once('value')));
 await check('notification read flag allow',()=>assertSucceeds(db('c1').ref('notifications/c1/n1/read').set(true)));
 await check('notification read flag false allow',()=>assertSucceeds(db('c1').ref('notifications/c1/n1/read').set(false)));
 await check('notification forged message deny',()=>assertFails(db('c1').ref('notifications/c1/n1/message').set('evil')));
 await check('notification forged owner uid deny',()=>assertFails(db('c1').ref('notifications/c1/n1/ownerUid').set('c1')));
 await check('notification delete deny',()=>assertFails(db('c1').ref('notifications/c1/n1').remove()));
 await check('notification arbitrary create deny',()=>assertFails(db('c1').ref('notifications/c1/new').set({read:false,title:' forged'})));
 await check('notification phantom deny',()=>assertFails(db('c1').ref('notifications/c1/missing/read').set(true)));
 await check('unauthenticated notification read deny',()=>assertFails(db().ref('notifications/c1').once('value')));
 for(const language of ['tr','tk','en','ru','ar','fa'])await check('language '+language,()=>assertSucceeds(db('c1').ref('users/c1/language').set(language)));
 await check('invalid language deny',()=>assertFails(db('c1').ref('users/c1/language').set('de')));
 await check('disabled own read deny',()=>assertFails(db('disabled').ref('users/disabled').once('value')));
 await check('disabled own write deny',()=>assertFails(db('disabled').ref('users/disabled/name').set('x')));
 await check('admin audit allow',()=>assertSucceeds(db('admin').ref('audit_logs').once('value')));
 await check('customer audit deny',()=>assertFails(db('c1').ref('audit_logs').once('value')));
 await check('audit forged client entry deny',()=>assertFails(db('admin').ref('audit_logs/new').set({action:'forged'})));
 await check('admin users allow',()=>assertSucceeds(db('admin').ref('users').once('value')));
 await check('reviews indexed query admin allow',()=>assertSucceeds(db('admin').ref('reviews').orderByChild('businessId').equalTo('biz_b').once('value')));
 await check('reviews index declared',async()=>assert(JSON.parse(fs.readFileSync('database.rules.json')).rules.reviews['.indexOn'].includes('businessId')));
 await check('payment own allow',()=>assertSucceeds(db('c1').ref('payments/p1').once('value')));
 await check('payment other deny',()=>assertFails(db('c2').ref('payments/p1').once('value')));
 await check('payment write deny',()=>assertFails(db('c1').ref('payments/p1/status').set('success')));
 // Actual router + actual Admin SDK against the same emulator (not mocked DB I/O).
 const { getAdminDatabase, getAdminAuth } = await import('./server/firebase-admin.js');
 const adminDb=getAdminDatabase();
 const router=(await import('./api/index.js')).default;
 const tokens={};
 for(const uid of Object.keys(seed.users)) {
  const email=uid+'@example.test';
  try { await getAdminAuth().createUser({uid,email,password:'Test-only-Password42!'}); } catch(e) { if(e.code!=='auth/uid-already-exists'&&e.code!=='auth/email-already-exists')throw e; }
  const login=await fetch('http://127.0.0.1:19099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password:'Test-only-Password42!',returnSecureToken:true})});
  tokens[uid]=(await login.json()).idToken; assert(tokens[uid]);
 }
 const call=async(path,body={},uid='c1')=>{
  const res={code:200,headers:{},status(v){this.code=v;return this;},setHeader(k,v){this.headers[k]=v;},json(v){this.body=v;return this;},send(v){this.body=v;return this;}};
  await router({method:'POST',url:'/api/'+path,headers:uid?{authorization:'Bearer '+tokens[uid]}:{},body:structuredClone(body)},res);return res;
 };
 await check('router requires auth',async()=>assert.equal((await call('booking/list',{customer:true},null)).code,401));
 await check('disabled router deny',async()=>assert.equal((await call('booking/list',{customer:true},'disabled')).code,403));
 await check('customer list excludes same-phone different UID',async()=>{const r=await call('booking/list',{customer:true});assert.equal(r.code,200);assert.deepEqual(r.body.appointments.map(a=>a.aptId),['a1']);});
 await check('staff minimum appointment projection',async()=>{const r=await call('booking/list',{businessId:'biz_a'},'s1');assert.equal(r.code,200);assert.equal(r.body.appointments.length,1);for(const key of ['customerPhone','price','servicePriceSnapshot','privateExtra'])assert(!(key in r.body.appointments[0]),key);});
 await check('staff private context projection',async()=>{const r=await call('staff/context',{businessId:'biz_a'},'s1');assert.equal(r.code,200);for(const key of ['ownerUid','plan','subscription'])assert(!(key in r.body.business));for(const m of r.body.staff){assert(!('phone'in m));assert(!('commissionPercent'in m));assert(!('permissions'in m));}assert(r.body.staff.find(s=>s.userId==='s1').weeklySchedule);});
 await check('staff context cross tenant deny',async()=>assert.equal((await call('staff/context',{businessId:'biz_b'},'s1')).code,403));
 await check('stale staff context deny',async()=>assert.equal((await call('staff/context',{businessId:'biz_a'},'stale')).code,403));
 await check('owner cross tenant API deny',async()=>assert.equal((await call('booking/list',{businessId:'biz_b'},'o1')).code,403));
 await check('owner own API allow',async()=>assert.equal((await call('booking/list',{businessId:'biz_a'},'o1')).code,200));
 await check('staff explicit phone/finance grant',async()=>{await adminDb.ref('businesses/biz_a/staff/stf_m1/permissions').set(['appointments.view','customer.phone.view','finance.view']);const r=await call('booking/list',{businessId:'biz_a'},'m1');const a=r.body.appointments.find(a=>a.aptId==='a1');assert.equal(a.price,100);assert.equal(a.customerPhone,'5551112233');assert(!('privateExtra'in a));});
 await check('AI other generation refund deny',async()=>assert.equal((await call('ai/refund',{generationId:'g2',userUid:'c1'})).code,403));
 await check('AI successful generation refund deny',async()=>assert.equal((await call('ai/refund',{generationId:'g1',userUid:'c1'})).code,409));
 await check('review server create pass',async()=>assert.equal((await call('reviews/submit',{appointmentId:'a1',businessId:'biz_a',rating:5,comment:'Nice',mode:'create'})).code,200));
 await check('review duplicate deny',async()=>assert.equal((await call('reviews/submit',{appointmentId:'a1',rating:5,mode:'create'})).code,409));
 await check('review same salon enforce',async()=>assert.equal((await call('reviews/submit',{appointmentId:'a1',businessId:'biz_b',rating:5})).code,403));
 await check('review other owner deny',async()=>assert.equal((await call('reviews/submit',{appointmentId:'a1',rating:5},'c2')).code,403));
 await check('review incomplete deny',async()=>assert.equal((await call('reviews/submit',{appointmentId:'a3',rating:5},'c2')).code,409));
 await check('review edit pass',async()=>assert.equal((await call('reviews/submit',{appointmentId:'a1',rating:4,comment:'Edited',mode:'edit'})).code,200));
 await check('review 48h expiry deny',async()=>{await adminDb.ref('reviews/rev_a1/createdAt').set(new Date(Date.now()-49*3600000).toISOString());assert.equal((await call('reviews/submit',{appointmentId:'a1',rating:3,mode:'edit'})).code,409);});
 await check('public review masked projection',async()=>{const r=await call('reviews/public-list',{businessId:'biz_a'},null);assert.equal(r.code,200);assert.equal(r.body.reviews[0].customerName,'Ayşe Y.');assert(!JSON.stringify(r.body).includes('customerUid'));assert.equal(r.body.reviewEligibility.mode,'none');});
 await check('bonus concurrent once',async()=>{const rs=await Promise.all([call('auth/welcome-bonus',{}),call('auth/welcome-bonus',{})]);assert.deepEqual(rs.map(r=>r.code).sort(),[200,400]);assert.equal((await adminDb.ref('users/c1/aiCredits/economy').get()).val(),3);});
 await check('payment provider fails closed',async()=>{delete process.env.EZO_PAYMENT_SANDBOX;for(const path of ['payments/create','payments/verify-google','payments/verify-apple','payments/paytr-callback'])assert.equal((await call(path,{},path.endsWith('callback')?null:'c1')).code,503);});
 await check('payment spoof identity deny',async()=>assert.equal((await call('payments/create',{userUid:'c2'})).code,403));
 await check('payment cross tenant deny',async()=>assert.equal((await call('payments/create',{businessId:'biz_b'},'o1')).code,403));
 process.env.EZO_PAYMENT_SANDBOX='emulator-only';
 let paymentId;
 await check('payment create Admin emulator pass',async()=>{const r=await call('payments/create',{productId:'economy_10'});assert.equal(r.code,200,JSON.stringify(r.body));paymentId=r.body.paymentId;});
 await check('payment sandbox callback pass',async()=>{const r=await call('payments/paytr-callback',{merchant_oid:paymentId,status:'success',isSimulation:true},null);assert.equal(r.code,200);assert.equal((await adminDb.ref('payments/'+paymentId+'/status').get()).val(),'success');});
 await check('payment status isolation',async()=>{assert.equal((await call('payments/status',{paymentId})).code,200);assert.equal((await call('payments/status',{paymentId},'c2')).code,403);});
 await check('payment refund admin regression',async()=>assert.equal((await call('payments/refund',{paymentId,reason:'test'},'admin')).code,200));
 await check('booking double guard + Any Staff',async()=>{
  const body={businessId:'biz_a',staffId:'staff-any',serviceId:'svc',customerName:'Customer',customerPhone:'5551112233',date:'2099-10-01',time:'10:00'};
  const rs=await Promise.all([call('booking/create',body),call('booking/create',body),call('booking/create',body)]);
  assert.equal(rs.filter(r=>r.code===200).length,2,JSON.stringify(rs));assert.equal(rs.filter(r=>r.code===409).length,1);
  const records=Object.values((await adminDb.ref('appointments').get()).val()).filter(a=>a.date===body.date);assert.equal(new Set(records.map(a=>a.staffId)).size,2);
 });
 await check('customer cancel >=48h and cross-owner deny',async()=>{await adminDb.ref('appointments/future').set({businessId:'biz_a',customerUid:'c1',staffId:'stf_s1',status:'approved',date:'2099-10-03',time:'10:00'});assert.equal((await call('booking/update-status',{aptId:'future',newStatus:'cancel_requested'},'c2')).code,403);assert.equal((await call('booking/update-status',{aptId:'future',newStatus:'cancel_requested'})).code,200);assert.equal((await adminDb.ref('appointments/future/status').get()).val(),'cancelled');});
 await check('customer reschedule >=48h',async()=>{await adminDb.ref('appointments/move').set({businessId:'biz_a',customerUid:'c1',staffId:'stf_s1',serviceId:'svc',serviceDuration:30,status:'approved',date:'2099-10-04',time:'10:00'});const r=await call('booking/reschedule-approve',{aptId:'move',newDate:'2099-10-05',newTime:'11:00'});assert.equal(r.code,200,JSON.stringify(r.body));assert.equal((await adminDb.ref('appointments/move/date').get()).val(),'2099-10-05');});

 await check('AI failed own generation concurrent refund once', async()=>{
  await adminDb.ref('ai_generations/g_failed').set({userUid:'c1',status:'failed',creditType:'economy'});
  const before=(await adminDb.ref('users/c1/aiCredits/economy').get()).val();
  const rs=await Promise.all([call('ai/refund',{generationId:'g_failed'}),call('ai/refund',{generationId:'g_failed'})]);
  assert.deepEqual(rs.map(r=>r.code).sort(),[200,400]);assert.equal((await adminDb.ref('users/c1/aiCredits/economy').get()).val(),before+1);
 });
 await check('review concurrent creation one winner',async()=>{
  await adminDb.ref('appointments/review_race').set({businessId:'biz_a',customerUid:'c1',status:'completed'});
  const rs=await Promise.all([call('reviews/submit',{appointmentId:'review_race',rating:5,mode:'create'}),call('reviews/submit',{appointmentId:'review_race',rating:4,mode:'create'})]);assert.deepEqual(rs.map(r=>r.code).sort(),[200,409]);
 });
 await check('staff own complete, other assigned deny',async()=>{
  await adminDb.ref('appointments/staff_own').set({businessId:'biz_a',customerUid:'c1',staffId:'stf_s1',status:'approved',date:'2026-01-02',time:'10:00'});
  await adminDb.ref('appointments/staff_other').set({businessId:'biz_a',customerUid:'c1',staffId:'stf_m1',status:'approved',date:'2026-01-02',time:'10:00'});
  assert.equal((await call('booking/update-status',{aptId:'staff_other',newStatus:'completed'},'s1')).code,403);
  assert.equal((await call('booking/update-status',{aptId:'staff_own',newStatus:'completed'},'s1')).code,200);
 });
 await check('customer cancel <48h requires owner approval',async()=>{
  const soon=new Date(Date.now()+24*3600000).toISOString();
  await adminDb.ref('appointments/soon').set({businessId:'biz_a',customerUid:'c1',staffId:'stf_s1',status:'approved',date:soon.slice(0,10),time:soon.slice(11,16)});
  assert.equal((await call('booking/update-status',{aptId:'soon',newStatus:'cancel_requested'})).code,200);
  assert.equal((await adminDb.ref('appointments/soon/status').get()).val(),'cancel_requested');
  assert.equal((await call('booking/update-status',{aptId:'soon',newStatus:'cancelled'},'o1')).code,200);
 });
 await check('customer reschedule <48h needs approval',async()=>{
  const soon=new Date(Date.now()+24*3600000).toISOString();
  await adminDb.ref('appointments/soon_move').set({businessId:'biz_a',customerUid:'c1',staffId:'stf_s1',serviceId:'svc',durationMinutes:30,status:'approved',date:soon.slice(0,10),time:soon.slice(11,16)});
  assert.equal((await call('booking/reschedule-approve',{aptId:'soon_move',newDate:'2099-11-01',newTime:'12:00'})).code,200);
  assert.equal((await adminDb.ref('appointments/soon_move/status').get()).val(),'reschedule_requested');
  assert.equal((await call('booking/reschedule-approve',{aptId:'soon_move',action:'approve'},'o1')).code,200);
  assert.equal((await adminDb.ref('appointments/soon_move/date').get()).val(),'2099-11-01');
 });
 // Product decision (22 Oct 2026): manual booking is a base capability of every active
 // employee of the salon; customers and other salons' staff stay blocked.
 await check('manual booking: own-salon staff allowed, customers and other salons denied',async()=>{
  const body=time=>({businessId:'biz_a',isManual:true,customerName:'Walk in',customerPhone:'5551112233',staffId:'stf_s1',serviceId:'svc',date:'2099-12-01',time});
  assert.equal((await call('booking/create',body('10:00'),'m1')).code,200);
  assert.equal((await call('booking/create',body('11:00'),'c1')).code,403);
  assert.equal((await call('booking/create',body('12:00'),'o2')).code,403);
 });
 await check('sandbox Google and Apple Admin migration',async()=>{
  assert.equal((await call('payments/verify-google',{productId:'economy_10',purchaseToken:'emulator-receipt',isFakeToken:false})).code,200);
  assert.equal((await call('payments/verify-apple',{productId:'economy_10',transactionId:'emulator-transaction',isFakeTransaction:false})).code,200);
 });

 await check('super admin user status migration and audit',async()=>{
  assert.equal((await call('user/toggle-status',{targetUid:'c2',action:'disable'},'c1')).code,403);
  assert.equal((await call('user/toggle-status',{targetUid:'c2',action:'disable'},'admin')).code,200);
  assert.equal((await call('booking/list',{customer:true},'c2')).code,403);
  assert.equal((await call('user/toggle-status',{targetUid:'c2',action:'enable'},'admin')).code,200);
  assert.equal((await call('booking/list',{customer:true},'c2')).code,200);
  assert(Object.values((await adminDb.ref('audit_logs').get()).val()).some(log=>log.targetId==='c2'));
 });
 await check('owner branding whitelist and social persistence through actual API',async()=>{
  await adminDb.ref('businesses/biz_a').update({name:'Salon A',phone:'5551112233',address:'Test Address 12'});
  const branding={primary:'#FFFF00',secondary:'#123456',mode:'dark',privateToken:'never-public'};
  const socials={instagram:{value:'https://instagram.com/unelivo-test',active:true}};
  assert.equal((await call('salon/update-profile',{branding,socials},'o1')).code,200);
  const saved=(await adminDb.ref('businesses/biz_a').get()).val(),pub=(await adminDb.ref('public_businesses/biz_a').get()).val();
  assert.equal(saved.socials.instagram.value,socials.instagram.value);assert.equal(pub.branding.primary,'#ffff00');assert(!JSON.stringify(pub).includes('never-public'));assert(!pub.ownerUid);
  assert.equal((await call('salon/update-profile',{branding},'c1')).code,403);
  await assertFails(db('o1').ref('public_businesses/biz_a/branding').set(branding));
  await assertFails(db('o1').ref('businesses/biz_a/branding').set(branding));
 });
 await check('brand media partial update preserves cover/gallery and rejects SVG',async()=>{
  const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aOZ8AAAAASUVORK5CYII=';
  assert.equal((await call('salon/update-profile',{media:{coverImageUrl:png,gallery:[png]}},'o1')).code,200);
  assert.equal((await call('salon/update-profile',{media:{logoUrl:png}},'o1')).code,200);
  const media=(await adminDb.ref('businesses/biz_a/media').get()).val();assert.equal(media.coverImageUrl,png);assert.equal(media.gallery.length,1);assert.equal(media.logoUrl,png);
  assert.equal((await call('salon/update-profile',{media:{logoUrl:'data:image/svg+xml;base64,AAAA'}},'o1')).code,400);
 });

 // Bidirectional contract: real router, auth, handlers and serializable RTDB writes.
 const bookingBody=(date,staffId='stf_s1',time='10:00')=>({businessId:'biz_a',serviceId:'svc',staffId,date,time});
 const availability=async(body,manual=false)=>{
   const r=await call('booking/availability',{...body,isManual:manual},manual?'o1':'c1');
   assert.equal(r.code,200,JSON.stringify(r.body));assert.match(r.headers['Cache-Control'],/no-store/);return r.body;
 };
 await check('customer -> manual slot closes and cancellation reopens both',async()=>{
   const b=bookingBody('2099-12-10');assert((await availability(b,true)).slots.includes(b.time));
   const created=await call('booking/create',b);assert.equal(created.code,200,JSON.stringify(created.body));
   assert(!(await availability(b,true)).slots.includes(b.time));assert(!(await availability(b)).slots.includes(b.time));
   assert.equal((await call('booking/update-status',{aptId:created.body.aptId,newStatus:'cancel_requested'})).code,200);
   assert((await availability(b,true)).slots.includes(b.time));assert((await availability(b)).slots.includes(b.time));
 });
 await check('manual -> customer slot closes; same staff overlap blocked',async()=>{
   const b=bookingBody('2099-12-11');assert.equal((await call('booking/create',{...b,isManual:true},'o1')).code,200);
   assert(!(await availability(b)).slots.includes(b.time));assert.equal((await call('booking/create',b)).code,409);
 });
 await check('one eligible staff free keeps Any open, all eligible busy closes',async()=>{
   const b=bookingBody('2099-12-12');assert.equal((await call('booking/create',{...b,isManual:true},'o1')).code,200);
   const any={...b,staffId:'staff-any'};assert((await availability(any)).slots.includes(b.time));
   const created=await call('booking/create',any);assert.equal(created.code,200);assert.equal(created.body.data.staffId,'stf_m1');
   assert(!(await availability(any,true)).slots.includes(b.time));assert.equal((await call('booking/create',any)).code,409);
 });
 await check('concurrent customer/manual explicit staff has exactly one winner',async()=>{
   const b=bookingBody('2099-12-13');const rs=await Promise.all([call('booking/create',b),call('booking/create',{...b,isManual:true},'o1')]);
   assert.deepEqual(rs.map(r=>r.code).sort(),[200,409]);
 });
 await check('authoritative duration overlap in both directions',async()=>{
   await adminDb.ref('businesses/biz_a/services/svc/duration').set(60);
   const b=bookingBody('2099-12-14');assert.equal((await call('booking/create',{...b,serviceDuration:15})).code,200);
   const overlapping={...b,time:'10:30'};assert(!(await availability(overlapping,true)).slots.includes('10:30'));
   assert.equal((await call('booking/create',{...overlapping,isManual:true},'o1')).code,409);
   assert.equal((await call('booking/create',{...b,time:'09:30',isManual:true},'o1')).code,409);
   assert.equal((await call('booking/create',{...b,time:'11:00',isManual:true},'o1')).code,200);
   await adminDb.ref('businesses/biz_a/services/svc/duration').set(30);
 });
 await check('Istanbul midnight boundary and exact current minute',async()=>{
   const {buildAnyStaffAvailability}=await import('./server/handlers/booking/availability.js');
   const business=(await adminDb.ref('businesses/biz_a').get()).val();
   const options={business,businessId:'biz_a',serviceId:'svc',appointments:[],durationMinutes:30,now:new Date('2099-12-14T21:00:00Z')};
   assert.equal(buildAnyStaffAvailability({...options,date:'2099-12-14'}).slots.length,0);
   const next=buildAnyStaffAvailability({...options,date:'2099-12-15'});assert.equal(next.serverDate,'2099-12-15');assert(!next.slots.includes('00:00'));assert(next.slots.includes('00:30'));
 });
 await check('staff leave, salon hours and breaks shared by read and write',async()=>{
   const b=bookingBody('2099-12-16');await adminDb.ref('businesses/biz_a/staff/stf_s1/timeOff/'+b.date).set(true);
   assert(!(await availability(b,true)).slots.length);assert.equal((await call('booking/create',{...b,isManual:true},'o1')).code,409);
   await adminDb.ref('businesses/biz_a/staff/stf_s1/timeOff').remove();
   const day=['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][new Date(b.date+'T12:00:00Z').getUTCDay()];
   await adminDb.ref('businesses/biz_a/weeklySchedule/'+day).set({isOpen:true,start:'09:00',end:'12:00',breaks:[{start:'10:00',end:'10:30'}]});
   for(const time of ['08:30','10:00','12:00']){assert(!(await availability(b)).slots.includes(time));assert.equal((await call('booking/create',{...b,time,isManual:true},'o1')).code,409);}
   await adminDb.ref('businesses/biz_a/weeklySchedule').set(schedule);
 });
 await check('status effects identical in both availability views',async()=>{
   const b=bookingBody('2099-12-17');
   for(const status of ['pending','approved','cancel_requested','reschedule_requested','cancelled','rejected','completed','expired','no_show']){
     await adminDb.ref('appointments/status_contract').set({...b,status,durationMinutes:30});
     const shouldBlock=['pending','approved','cancel_requested','reschedule_requested'].includes(status);
     for(const manual of [false,true])assert.equal((await availability(b,manual)).slots.includes(b.time),!shouldBlock,status);
   }
 });
 await check('invalid date and past time rejected by both APIs',async()=>{
   for(const date of ['2099-02-30','2020-01-01']){
     const b=bookingBody(date);assert.equal((await call('booking/create',b)).code,date==='2099-02-30'?400:409);
     const r=await call('booking/availability',b);if(date==='2099-02-30')assert.equal(r.code,400);else assert.equal(r.body.slots.length,0);
   }
 });
 await check('terminal booking cannot resurrect and customer cannot approve',async()=>{
   const b=bookingBody('2099-12-18');const c=await call('booking/create',b);assert.equal(c.code,200);
   assert.equal((await call('booking/update-status',{aptId:c.body.aptId,newStatus:'approved'})).code,403);
   assert.equal((await call('booking/update-status',{aptId:c.body.aptId,newStatus:'cancel_requested'})).code,200);
   assert.equal((await call('booking/create',b)).code,200);
   assert.equal((await call('booking/update-status',{aptId:c.body.aptId,newStatus:'approved'},'o1')).code,409);
 });
 await check('revision signal contains no appointment data; clients cannot forge it',async()=>{
   const signal=(await db('c1').ref('availability_revisions/biz_a').once('value')).val();assert.equal(typeof signal,'string');assert.match(signal,/^[a-f0-9-]{36}$/);
   await assertFails(db('c1').ref('availability_revisions/biz_a').set('forged'));
   await assertFails(db().ref('availability_revisions/biz_a').once('value'));
   await assertFails(db('c1').ref('availability_revisions/biz_b').once('value'));
 });
 console.log('EMULATOR TOTAL: '+count+' PASS');
} finally { await env.cleanup(); }
process.exit(0);
