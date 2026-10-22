const assert=require('assert');
(async()=>{
 const perms=await import('./src/staff-permissions.js'); const phone=await import('./server/staff-phone.js'); let passed=0;const check=(v,m)=>{assert.ok(v,m);passed++};
 const forbidden=/[.#$\/[\]]/;
 const firebaseSafe=value=>{if(Array.isArray(value))return value.every(firebaseSafe);if(value&&typeof value==='object')return Object.entries(value).every(([k,v])=>!forbidden.test(k)&&firebaseSafe(v));return true;};
 for(const role of ['barber','receptionist','manager']){const value=perms.getDefaultPermissionsForRole(role);check(Array.isArray(value),`${role} defaults array`);check(firebaseSafe({permissions:value}),`${role} Firebase safe`);}
 for(const name of ['appointments.view','appointments.own.view','schedule.manage','requests.manage','finance.view','reports.view']){const role=name==='appointments.own.view'?'barber':'manager';const value=perms.sanitizeStaffPermissions(role,[name]);check(value.includes(name),`${name} preserved`);check(firebaseSafe({permissions:value}),`${name} write safe`);}
 check(perms.hasPermission({'appointments.view':true},'appointments.view'),'legacy dotted object readable');
 check(perms.hasPermission({appointments_view:true},'appointments.view'),'legacy underscore object readable');
 check(perms.hasPermission({appointments:{own:{view:true}}},'appointments.own.view'),'legacy nested object readable');
 assert.throws(()=>perms.sanitizeStaffPermissions('barber',['malformed.permission']),/Geçersiz/);passed++;
 let indexState=null,written=null;const indexRef={transaction:async cb=>{const next=cb(indexState);if(next===undefined)return{committed:false};indexState=next;return{committed:true};}};
 await assert.rejects(()=>phone.reservePhoneAndWriteInvite({indexRef,inviteRef:{set:async()=>{throw new Error('firebase validation');}},reservation:{inviteId:'bad',businessId:'biz'},invite:{}}),/firebase validation/);passed++;check(indexState===null,'failed write rolls index back');
 const success=await phone.reservePhoneAndWriteInvite({indexRef,inviteRef:{set:async value=>{written=value;}},reservation:{inviteId:'ok',businessId:'biz'},invite:{permissions:['appointments.view']}});check(success.committed&&indexState.inviteId==='ok'&&written.permissions[0]==='appointments.view','successful write keeps reservation');
 console.log(`PERMISSION STORAGE LOCAL: ${passed}/25 kontrol geçti`);
})().catch(e=>{console.error(e);process.exit(1)});
