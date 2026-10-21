const assert = require('node:assert/strict');
(async () => {
 const {handleAvailabilityWithDatabase} = await import('./server/handlers/booking/availability.js');
 const business={bookingEnabled:false,status:'active',services:{cut:{id:'cut',duration:45}},weeklySchedule:{start:'09:00',end:'19:00'},staff:{a:{id:'a',active:true,services:['all']},b:{id:'b',active:true,services:['all']}}};
 const appointments=[{businessId:'biz',staffId:'a',date:'2099-01-05',time:'09:30',serviceDuration:45,status:'approved'}];
 const db={ref(path){return {orderByChild(){return this},equalTo(){return this},async get(){return {exists:()=>true,val:()=>path==='appointments'?appointments:business}}}}};
 let status,body;const res={setHeader(){},status(value){status=value;return this},json(value){body=value}};
 const run=async(profile,extra={})=>{await handleAvailabilityWithDatabase({method:'POST',auth:{profile},body:{businessId:'biz',staffId:'a',serviceId:'cut',date:'2099-01-05',...extra}},res,db);return body};
 const staff=await run({role:'barber',businessId:'biz'},{internalView:true});assert.equal(status,200);assert(staff.busySlots.includes('09:30'));assert(!staff.slots.includes('09:30'));
 const owner=await run({role:'owner',businessId:'biz'},{isManual:true});assert.deepEqual(staff.slots,owner.slots);assert.deepEqual(staff.busySlots,owner.busySlots);
 await run({role:'customer'},{internalView:true});assert.equal(status,403);
 await run({role:'barber',businessId:'other'},{internalView:true});assert.equal(status,403);
 await run({role:'barber',businessId:'biz'},{isManual:true});assert.equal(status,403);
 await run({role:'customer'});assert.equal(status,409);
 business.bookingEnabled=true;const customer=await run({role:'customer'});assert.equal(status,200);assert.deepEqual(customer.slots,staff.slots);assert.deepEqual(customer.busySlots,staff.busySlots);
 const any=await run({role:'customer'},{staffId:'staff-any'});assert(any.slots.includes('09:30'));
 console.log('MOBILE CALENDAR PASS: shared slots, busy duration, any staff, internal read-only and cross-tenant authorization');
})().catch(error=>{console.error(error);process.exitCode=1});
