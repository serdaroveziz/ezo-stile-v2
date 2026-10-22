const assert=require('node:assert/strict');
(async()=>{
const {contrast,onColor,normalizeBranding}=await import('./src/brand-colors.js');
for(let i=0;i<=0xffffff;i+=7919){const color='#'+i.toString(16).padStart(6,'0');assert(contrast(color,onColor(color))>=4.5);}
assert.deepEqual(normalizeBranding({primary:'red;url(x)',secondary:'#ABCDEF',mode:'oops',secret:'private'}),{version:1,primary:'#d9ad42',secondary:'#abcdef',mode:'light'});
const {buildPublicBusiness}=await import('./server/public-business.js');
const projection=buildPublicBusiness('biz',{status:'active',discoveryEnabled:true,branding:{primary:'#ffff00',ownerUid:'secret',mode:'dark'},ownerUid:'private'});
assert.equal(projection.branding.primary,'#ffff00');assert(!JSON.stringify(projection).includes('secret'));assert(!projection.ownerUid);
const {availableStaffBySlot,handleAvailabilityWithDatabase}=await import('./server/handlers/booking/availability.js');
const {chooseAvailableStaff}=await import('./server/booking-staff.js');
const business={status:'active',services:{cut:{id:'cut',duration:60}},weeklySchedule:{start:'09:00',end:'12:00'},staff:{a:{id:'a',services:['cut'],active:true},b:{id:'b',services:['cut'],active:true},c:{id:'c',services:['other'],active:true},off:{id:'off',services:['cut'],timeOff:['2099-01-05']}}};
const appointments=[{businessId:'biz',date:'2099-01-05',staffId:'a',time:'09:00',serviceDuration:60,status:'approved'}];
const bySlot=availableStaffBySlot({business,businessId:'biz',serviceId:'cut',date:'2099-01-05',durationMinutes:60,appointments,slots:['09:00','10:00']});
assert.deepEqual(bySlot['09:00'],['b']);assert.deepEqual(bySlot['10:00'],['a','b']);
assert.equal(chooseAvailableStaff({business,businessId:'biz',serviceId:'cut',date:'2099-01-05',startMinutes:540,endMinutes:600,appointments})[0],'b');
assert.equal(chooseAvailableStaff({business,businessId:'biz',serviceId:'cut',date:'2099-01-05',startMinutes:540,endMinutes:600,appointments:[...appointments,{...appointments[0],staffId:'b'}]}),null);
const db={ref(key){return {orderByChild(){return this},equalTo(){return this},async get(){return {exists:()=>true,val:()=>key==='appointments'?appointments:business}}}}};
let status,body;const res={setHeader(){},status(s){status=s;return this},json(b){body=b;return b}};
await handleAvailabilityWithDatabase({method:'POST',auth:{profile:{role:'customer'}},body:{businessId:'biz',staffId:'staff-any',serviceId:'cut',date:'2099-01-05',durationMinutes:1}},res,db);
assert.equal(status,200);assert(!body.slots.includes('11:30'),'server duration overrides client');assert.deepEqual(body.staffBySlot['09:00'],['b']);
business.weeklySchedule.monday={isOpen:false};
await handleAvailabilityWithDatabase({method:'POST',auth:{profile:{role:'customer'}},body:{businessId:'biz',staffId:'staff-any',serviceId:'cut',date:'2099-01-05',findNextAvailable:true}},res,db);
assert.equal(body.date,'2099-01-06');assert.equal(body.advanceReason,'closed');
await handleAvailabilityWithDatabase({method:'POST',auth:{profile:{role:'owner',businessId:'other'}},body:{businessId:'biz',staffId:'staff-any',serviceId:'cut',date:'2099-01-05',isManual:true}},res,db);assert.equal(status,403);
await handleAvailabilityWithDatabase({method:'POST',auth:{profile:{role:'customer'}},body:{businessId:'biz',staffId:'staff-any',serviceId:'cut',date:'2099-02-30'}},res,db);assert.equal(status,400);
console.log('UNELIVO runtime tests PASS: 2119 color contrasts, projection whitelist, eligibility, time-off, full duration, any-staff collision, next day, tenant isolation');
})().catch(e=>{console.error(e);process.exitCode=1});
