const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
(async()=>{
 const source=p=>fs.readFileSync(p,'utf8').replace(/^import .*;\s*$/gm,'').replace(/export /g,'');
 const push={navigator:{serviceWorker:{get ready(){throw Error('Must not await ready during logout')},getRegistration:async()=>null}},window:{Notification:{}},Notification:{permission:'granted'},console,isSupported:async()=>true};
 vm.createContext(push);vm.runInContext(source('src/push-notifications.js'),push);assert.equal((await push.disablePushNotifications()).state,'disabled');push.Notification.permission='denied';assert.equal((await push.disablePushNotifications()).state,'disabled');
 let generation=1,session='admin',pendingResolve;
 const app={innerHTML:'',querySelectorAll:()=>[]},modal={innerHTML:''};
 const context={console,setTimeout,clearTimeout,Date,window:{},document:{documentElement:{lang:'tr'},body:{classList:{remove(){}},style:{}},getElementById:id=>id==='app-container'?app:modal},getSessionGeneration:()=>generation,isSessionCurrent:(uid,g)=>uid===session&&g===generation,t:x=>x,uiIcon:()=>'',SUPPORTED_LANGUAGES:[],getSalonApplications:async()=>[],fetchRecord:async()=>({}),getAppointmentsForBusiness:async()=>[],applyDocumentLanguage(){},triggerTouchNavIconBounce(){},logoutUserSession:async()=>{generation++;session=null},authenticatedFetch:async()=>({ok:true,json:async()=>({})})};
 vm.createContext(context);vm.runInContext(source('src/ui/super-admin.js'),context);
 const user={uid:'admin',role:'super_admin',name:'Admin'};
 await context.renderSuperAdminScreen(user,()=>{});assert(app.innerHTML.includes('super-admin-shell'));
 await context.window.confirmAdminLogout();session='admin';generation++;
 await context.renderSuperAdminScreen(user,()=>{});assert(app.innerHTML.includes('super-admin-shell'));
 let first=true;context.fetchRecord=async()=>{if(first){first=false;return new Promise(resolve=>pendingResolve=resolve)}return {}};
 const stale=context.renderSuperAdminScreen({...user,name:'OLD'},()=>{});await new Promise(resolve=>setImmediate(resolve));
 await context.renderSuperAdminScreen({...user,name:'NEW'},()=>{});const latest=app.innerHTML;pendingResolve({});await stale;assert.equal(app.innerHTML,latest);
 console.log('ADMIN REENTRY RUNTIME PASS: logout without active worker, repeat sign-in, stale renderer cannot overwrite latest panel');
})().catch(error=>{console.error(error);process.exitCode=1});
