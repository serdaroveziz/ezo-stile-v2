const assert=require('node:assert/strict');
(async()=>{
 const {createBookingHandler}=await import('./server/handlers/booking/create.js');
 const {handleAvailabilityWithDatabase}=await import('./server/handlers/booking/availability.js');
 const business={businessId:'biz',status:'active',bookingEnabled:true,services:{cut:{id:'cut',name:'Kesim',price:100,duration:45}},weeklySchedule:{start:'09:00',end:'19:00'},staff:{legacyA:{id:'a',userId:'userA',active:true,services:['all']},b:{id:'b',active:true,services:['all']}}};
 let appointments={},queue=Promise.resolve();
 const clone=x=>JSON.parse(JSON.stringify(x));
 const db={ref(path){return{orderByChild(){return this},equalTo(){return this},async get(){const value=path.startsWith('businesses/')?business:path==='appointments'?appointments:{};return{exists:()=>true,val:()=>clone(value)}},async set(){},transaction(update){const task=queue.then(()=>{const current=clone(appointments);update(null);const next=update(current);if(next===undefined)return{committed:false};appointments=clone(next);return{committed:true}});queue=task.catch(()=>{});return task}}}};
 const handler=createBookingHandler({database:()=>db,publishRevision:async()=>{},push:async()=>{},notify:async()=>{}});
 const call=async(manual,staffId='a',time='09:30')=>{let code,body;const res={status(s){code=s;return this},json(b){body=b;return b}};await handler({method:'POST',auth:{profile:{role:manual?'owner':'customer',name:'Test'}},body:{businessId:'biz',customerUid:'customer',customerName:'Test',customerPhone:'5551112233',staffId,serviceId:'cut',date:'2099-01-05',time,isManual:manual}},res);return{code,body}};
 for(const first of [true,false]){appointments={};assert.equal((await call(first)).code,200);assert.equal((await call(!first)).code,409);assert.equal(Object.keys(appointments).length,1);assert.equal((await call(!first,'a','10:00')).code,409);assert.equal((await call(!first,'a','10:30')).code,200)}
 appointments={};const concurrent=await Promise.all([call(true),call(false)]);assert.deepEqual(concurrent.map(r=>r.code).sort(),[200,409]);assert.equal(Object.keys(appointments).length,1);
 const fallback=await call(false,'staff-any');assert.equal(fallback.code,200);assert.equal(fallback.body.data.staffId,'b');assert.equal((await call(true,'staff-any')).code,409);
 for(const field of ['staffId','staffUid','staffUserId']){appointments={old:{businessId:'biz',date:'2099-01-05',[field]:'userA',startTime:'09:30',endTime:'10:30',status:'approved'}};assert.equal((await call(false,'a','10:00')).code,409);let status,payload;await handleAvailabilityWithDatabase({method:'POST',auth:{profile:{role:'customer'}},body:{businessId:'biz',serviceId:'cut',staffId:'a',date:'2099-01-05'}},{setHeader(){},status(s){status=s;return this},json(v){payload=v}},db);assert.equal(status,200);assert(payload.busySlots.includes('10:00'));}
 console.log('BOOKING COLLISION RUNTIME PASS: both manual/customer orders, partial overlaps, simultaneous requests, any staff fallback, legacy user IDs, saved end time, availability agrees');
})().catch(e=>{console.error(e);process.exitCode=1});
