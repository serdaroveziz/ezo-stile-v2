const assert=require('node:assert/strict');
(async()=>{
 const {logoCropGeometry,openLogoCropper}=await import('./src/ui/logo-cropper.js');
 const {hasStaffPermission}=await import('./src/staff-permissions.js');
 const {enforceAuthenticatedIdentity}=await import('./api/index.js');
 const {handleAvailabilityWithDatabase}=await import('./server/handlers/booking/availability.js');
 const {createBookingHandler}=await import('./server/handlers/booking/create.js');
 for(const [w,h] of [[1200,600],[600,1200],[800,800]]){
  const center=logoCropGeometry(w,h);assert(Math.abs(center.width/center.height-w/h)<1e-8);assert(center.width>=384&&center.height>=384);assert.equal(center.left,(384-center.width)/2);
  const fit=logoCropGeometry(w,h,{zoom:center.fit});assert(fit.width<=384.00001&&fit.height<=384.00001);assert.equal(Math.max(fit.width,fit.height),384);
  const moved=logoCropGeometry(w,h,{zoom:3,x:999,y:-999});assert(moved.left<=0&&moved.left+moved.width>=384);assert(moved.top<=0&&moved.top+moved.height>=384);
 }
 assert.throws(()=>logoCropGeometry(0,20));await assert.rejects(()=>openLogoCropper({type:'image/svg+xml',size:50}));await assert.rejects(()=>openLogoCropper({type:'image/png',size:6000000}));
 for(const role of ['barber','receptionist','manager']){
  const profile={role,businessId:'biz',permissions:[]},auth={uid:'worker',profile};assert(hasStaffPermission(profile,'appointments.create'));assert(!hasStaffPermission(profile,'finance.view'));assert(!hasStaffPermission(profile,'staff.manage'));
  const body={businessId:'biz',serviceId:'cut',staffId:'a',date:'2099-01-05',time:'09:00',customerName:'Test',customerPhone:'5551112233',isManual:true};enforceAuthenticatedIdentity('booking/create',{auth,body});assert.throws(()=>enforceAuthenticatedIdentity('booking/create',{auth,body:{...body,businessId:'foreign'}}),e=>e.statusCode===403);
  const member={id:'a',userId:'worker',role,active:true,services:['all']},business={staff:{a:member},services:{cut:{id:'cut',duration:30,price:100}},weeklySchedule:{start:'09:00',end:'19:00'}};let appointments={};
  const db={ref(path){return{orderByChild(){return this},equalTo(){return this},get:async()=>({exists:()=>true,val:()=>path.startsWith('businesses/')?business:appointments}),transaction:async fn=>{const next=fn(appointments);if(next===undefined)return{committed:false};appointments=next;return{committed:true}}}}};
  const call=async(fn,payload)=>{let status,data;await fn({method:'POST',auth,body:payload},{setHeader(){},status(v){status=v;return this},json(v){data=v}},db);return{status,data}};
  const create=createBookingHandler({database:()=>db,publishRevision:async()=>{},push:async()=>{},notify:async()=>{}});assert.equal((await call(handleAvailabilityWithDatabase,body)).status,200);assert.equal((await call(create,body)).status,200);const slots=await call(handleAvailabilityWithDatabase,body);assert(slots.data.busySlots.includes('09:00'));assert.equal((await call(create,body)).status,409);
  member.active=false;assert.equal((await call(handleAvailabilityWithDatabase,body)).status,403);
 }
 assert(!hasStaffPermission({role:'customer',permissions:[]},'appointments.create'));
 console.log('LOGO + STAFF MANUAL PASS: proportional crop/fit/pan bounds, invalid uploads, all employee roles create and busy agree, conflict/inactive/foreign denied, finance unchanged');
})().catch(e=>{console.error(e);process.exitCode=1});
