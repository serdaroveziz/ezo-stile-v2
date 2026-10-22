const assert=require('node:assert/strict');
(async()=>{
 const {handleAvailabilityWithDatabase}=await import('./server/handlers/booking/availability.js');
 const {renderAvailabilityHints}=await import('./src/ui/booking-availability-hints.js');
 const business={status:'active',bookingEnabled:true,services:{cut:{id:'cut',duration:45}},weeklySchedule:{start:'09:00',end:'19:00'},staff:{a:{id:'a',name:'Ali',userId:'employee',role:'barber',active:true,services:['all']},b:{id:'b',name:'Bora',active:true,services:['all']}}};
 let appointments={one:{businessId:'biz',staffId:'a',date:'2099-01-05',time:'09:00',durationMinutes:45,status:'approved',customerName:'PRIVATE_CUSTOMER',customerPhone:'PRIVATE_PHONE'}};
 const db={ref(path){return{orderByChild(){return this},equalTo(){return this},get:async()=>({exists:()=>true,val:()=>path.startsWith('businesses/')?business:appointments})}}};
 const call=async(role,staffId='a',isManual=false,internalView=false)=>{let status,data;await handleAvailabilityWithDatabase({method:'POST',auth:{uid:'employee',profile:{role,businessId:'biz'}},body:{businessId:'biz',serviceId:'cut',staffId,date:'2099-01-05',isManual,internalView}},{setHeader(){},status(n){status=n;return this},json(v){data=v}},db);assert.equal(status,200);return data};
 const customer=await call('customer'),owner=await call('owner','a',true),staff=await call('barber','a',false,true);
 for(const result of [customer,owner,staff]){assert(result.busySlots.includes('09:00'));assert(!result.slots.includes('09:00'));assert.deepEqual(result.alternativesBySlot['09:00'],['Bora']);assert(!JSON.stringify(result).includes('PRIVATE'));}
 assert.deepEqual(customer.slots,owner.slots);assert.deepEqual(owner.slots,staff.slots);
 assert((await call('customer','staff-any')).slots.includes('09:00'));
 appointments.two={...appointments.one,staffId:'b'};const full=await call('customer','staff-any');assert(!full.slots.includes('09:00'));assert(full.busySlots.includes('09:00'));assert.equal((await call('customer')).alternativesBySlot['09:00'],undefined);
 const html=renderAvailabilityHints({alternativesBySlot:{'09:00':['<img onerror=x>']}});assert(!html.includes('<img'));assert(html.includes('&lt;img'));assert.equal(renderAvailabilityHints({}),'');
 console.log('SHARED AVAILABILITY PASS: customer/owner/staff agree, selected busy with other staff suggestion, all busy, privacy, safe rendering');
})().catch(e=>{console.error(e);process.exitCode=1});
