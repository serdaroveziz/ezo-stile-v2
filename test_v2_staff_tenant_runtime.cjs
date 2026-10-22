const assert=require('node:assert/strict');
(async()=>{
 const {createBookingHandler}=await import('./server/handlers/booking/create.js');
 const {handleAvailabilityWithDatabase}=await import('./server/handlers/booking/availability.js');
 const {handleBookingListWithDatabase}=await import('./server/handlers/booking/list.js');
 const {handleStaffContextWithDatabase}=await import('./server/handlers/staff/context.js');
 const {enforceAuthenticatedIdentity}=await import('./api/index.js');
 const member={userId:'employee',role:'barber',active:true,name:'Employee',services:['all'],permissions:['appointments.create']};
 const business={name:'Only Salon A',staff:{a:member},services:{cut:{id:'cut',duration:30}},weeklySchedule:{start:'09:00',end:'19:00'}};
 let reads=[],writes=0;const appointments={own:{businessId:'A',staffId:'a',date:'2099-01-05',time:'09:00',status:'approved',customerName:'Own'},other:{businessId:'B',staffId:'a',customerName:'PRIVATE_OTHER_SALON'},colleague:{businessId:'A',staffId:'other',customerName:'PRIVATE_COLLEAGUE'}};
 const db={ref(path){reads.push(path);return{orderByChild(){return this},equalTo(){return this},get:async()=>({exists:()=>true,val:()=>path==='businesses/A/staff'?business.staff:path==='businesses/A'?business:appointments}),transaction:async()=>{writes++;throw Error('Must not write')}}}};
 const auth={uid:'employee',profile:{role:'barber',businessId:'A',permissions:['appointments.create']}};
 const invoke=async(fn,body)=>{let status,data;await fn({method:'POST',auth,body},{setHeader(){},status(v){status=v;return this},json(v){data=v}},db);return{status,data}};
 const create=createBookingHandler({database:()=>db,publishRevision:async()=>{},push:async()=>{},notify:async()=>{}});
 const base={businessId:'B',serviceId:'cut',staffId:'a',date:'2099-01-05',time:'10:00'};
 for(const manual of [true,false]){reads=[];assert.equal((await invoke(create,{...base,isManual:manual})).status,403);assert.equal(reads.length,0);assert.throws(()=>enforceAuthenticatedIdentity('booking/create',{auth,body:{...base,isManual:manual}}),e=>e.statusCode===403);}
 reads=[];assert.equal((await invoke(handleAvailabilityWithDatabase,base)).status,403);assert.equal(reads.length,0);
 assert.equal((await invoke(handleBookingListWithDatabase,{businessId:'B'})).status,403);
 assert.equal((await invoke(handleStaffContextWithDatabase,{businessId:'B'})).status,403);
 const list=await invoke(handleBookingListWithDatabase,{businessId:'A'});assert.equal(list.status,200);assert.equal(list.data.appointments.length,1);assert(!JSON.stringify(list.data).includes('PRIVATE'));
 const context=await invoke(handleStaffContextWithDatabase,{businessId:'A'});assert.equal(context.status,200);assert.equal(context.data.business.name,'Only Salon A');
 member.active=false;
 for(const [fn,body] of [[create,{...base,businessId:'A',isManual:true}],[handleAvailabilityWithDatabase,{...base,businessId:'A'}],[handleBookingListWithDatabase,{businessId:'A'}],[handleStaffContextWithDatabase,{businessId:'A'}]])assert.equal((await invoke(fn,body)).status,403);
 assert.equal(writes,0);
 console.log('STAFF TENANT PASS: other salon create/manual/availability/list/context denied; own scoped records; inactive membership denied; no foreign read/write');
})().catch(e=>{console.error(e);process.exitCode=1});
