const assert=require('node:assert/strict');
(async()=>{
 const {handleSalonApplicationWithDatabase:apply}=await import('./server/handlers/salon/apply.js');
 const {handleSalonProfileWithDatabase:update}=await import('./server/handlers/salon/update-profile.js');
 const store={};let writes=0;
 const business={name:'Salon',ownerUid:'owner',phone:'05551112233',address:'Test sokak 10',status:'active',discoveryEnabled:true,salonTypes:['barber']};
 const db={ref(path){return{get:async()=>({exists:()=>path!=='salon_applications',val:()=>path==='businesses/biz'?business:null}),set:async value=>{store[path]=value;writes++},update:async value=>{Object.assign(business,value);writes++},remove:async()=>{writes++}}}};
 const call=async(fn,auth,body)=>{let status,result;await fn({method:'POST',auth,body},{status(v){status=v;return this},json(v){result=v}},db);return{status,result}};
 const body={salonName:'Test',ownerName:'Owner',phone:'05551112233',city:'İstanbul',district:'Kadıköy',salonTypes:['hair','nails']};
 const created=await call(apply,{uid:'applicant'},body);assert.equal(created.status,200);assert.deepEqual(created.result.application.salonTypes,['hair','nails']);assert.equal(created.result.application.status,'pending');
 const count=writes;assert.equal((await call(apply,{uid:'applicant'},{...body,salonTypes:['hacked']})).status,400);assert.equal(writes,count);
 const auth={uid:'owner',profile:{role:'owner',businessId:'biz'}};assert.equal((await call(update,auth,{salonTypes:['beauty','nails']})).status,200);assert.deepEqual(business.salonTypes,['beauty','nails']);assert.deepEqual(store['public_businesses/biz'].salonTypes,['beauty','nails']);assert(store['public_businesses/biz'].category.includes('Nail art'));
 assert.equal((await call(update,auth,{salonTypes:[]})).status,400);assert.equal((await call(update,{uid:'other',profile:{role:'owner',businessId:'biz'}},{salonTypes:['barber']})).status,403);
 console.log('SALON TYPES API PASS: application saves pending types; invalid rejected before write; owner update/public sync; wrong owner denied');
})().catch(e=>{console.error(e);process.exitCode=1});
