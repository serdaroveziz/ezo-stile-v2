
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.EZO_PLAYWRIGHT_PATH||'C:/Users/kuvvat/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const browser=await chromium.launch({headless:true,channel:'msedge'});try{
const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce',serviceWorkers:'block'});const errors=[];const contrastFindings=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('**/*',async r=>{const u=new URL(r.request().url());if(u.hostname!=='fix.test')return r.abort();let body,type='text/javascript';
if(u.pathname==='/'){type='text/html';body='<html><head><link rel="stylesheet" href="/src/styles/app.css"><link rel="stylesheet" href="/src/styles/theme-palette.css"></head><body><div id="app-container"></div><div id="modal-root"></div><script type="module">import * as portal from "/src/ui/portal.js";import {renderSuperAdminScreen} from "/src/ui/super-admin.js";import {renderOwnerScreen} from "/src/ui/owner.js";import {renderStaffScreen} from "/src/ui/staff.js";import {renderCustomerScreen,renderPublicSalonRoute} from "/src/ui/customer.js";import {applyDocumentLanguage} from "/src/config.js";window.api={...portal,renderSuperAdminScreen,renderOwnerScreen,renderStaffScreen,renderCustomerScreen,renderPublicSalonRoute,applyDocumentLanguage};window.current={uid:"admin",role:"super_admin",language:"tr",businessId:"biz_fixture"};portal.renderPortalScreen(()=>{});</script></body></html>';}
else if(u.pathname==='/src/auth.js'){body='export const loginUser=async()=>{if(window.loginError)throw Error(window.loginError);return window.current};export const registerCustomer=loginUser,registerSalonApplicant=loginUser,registerStaffWithInvite=loginUser;export const getCurrentUser=()=>window.current;export const isSessionCurrent=()=>true;export const getSessionGeneration=()=>1;export const isSalonPortalRole=r=>r!=="customer";export const isCustomerPortalRole=r=>r==="customer";export const logoutUserSession=async()=>{};export const setPortalMode=()=>{};export const getPortalMode=()=>"salon";export const setCurrentUser=u=>window.current=u;export const updateUserLanguage=async()=>{};export const changeCurrentUserPassword=async()=>{};';}
else if(u.pathname==='/src/db.js'){
const names=[...fs.readFileSync('src/db.js','utf8').matchAll(/export (?:async )?function (\w+)/g)].map(m=>m[1]);
body='const business={businessId:"biz_fixture",name:"Test Salon",ownerUid:"owner",status:"active",discoveryEnabled:true,services:{s:{id:"s",name:"Haircut",price:100,duration:30}},staff:{stf_staff:{id:"stf_staff",userId:"staff",displayName:"Staff",role:"barber",active:true}},weeklySchedule:{}};const users={admin:{role:"super_admin",name:"Admin"},target:{role:"customer",name:"Delete Me"},owner:{role:"owner",name:"Owner"},staff:{role:"barber",name:"Staff"}};';
body+=names.map(n=>n==='fetchRecord'?'export const fetchRecord=async p=>p.startsWith("public_salon_slugs/")?"biz_fixture":p.startsWith("public_businesses/")?business:p==="users"?users:p==="businesses"?{biz_fixture:business}:p.startsWith("businesses/")?business:{};':n==='getStaffContext'?'export const getStaffContext=async()=>({business,staff:Object.values(business.staff)});':n==='invalidateDbCache'?'export const invalidateDbCache=()=>{window.cacheInvalidated=true};':n.startsWith('subscribe')?'export const '+n+'=()=>()=>{};':'export const '+n+'=async()=>[];').join('\n');
}
else if(u.pathname==='/src/firebase.js')body='export const getIdToken=async()=>"fixture";export const authenticatedFetch=async()=>{if(window.networkError)throw new TypeError("Failed to fetch");return {ok:!window.apiError,json:async()=>window.apiError?{error:window.apiError}:{success:true,hardDeleted:!window.badSuccess,appointments:[],staff:[],notifications:[]}}};export const getFirebaseAuth=async()=>({});export const getFirebaseApp=async()=>({});';
else if(u.pathname==='/src/push-notifications.js'){const names=[...fs.readFileSync('src/push-notifications.js','utf8').matchAll(/export (?:async )?function (\w+)/g)].map(m=>m[1]);body=names.map(n=>'export const '+n+'=async()=>({});').join('\n');}
else{const f=path.join(process.cwd(),u.pathname);if(!fs.existsSync(f))return r.fulfill({status:404,body:''});body=fs.readFileSync(f);type=f.endsWith('.css')?'text/css':f.endsWith('.png')?'image/png':'text/javascript';}
return r.fulfill({contentType:type,body});});
await page.goto('http://fix.test/');await page.waitForFunction(()=>window.api);
let preserved=0;
for(const lang of ['tr','en','ru','ar','tk','fa']){
await page.evaluate(l=>{localStorage.setItem('ezo_lang',l);window.api.renderPortalScreen(()=>{});window.openCustomerAuthModal();},lang);
await page.locator('#auth-phone').fill('05321112233');await page.locator('#auth-password').fill('secret123');
for(const error of ['Validation failed','SERVER_ERROR','Failed to fetch','OWNER_TRANSFER_REQUIRED']){
await page.evaluate(e=>{window.loginError=e;return window.submitCustomerAuthLogin();},error);
assert.equal(await page.locator('#auth-phone').inputValue(),'05321112233');assert.equal(await page.locator('#auth-password').inputValue(),'secret123');assert.equal(await page.locator('.auth-entry').count(),1);assert.equal(await page.locator('.modal-card').count(),1);assert.equal(await page.locator('[data-operation-error]').count(),1);
if(error==='OWNER_TRANSFER_REQUIRED')assert(!await page.locator('[data-operation-error]').innerText().then(t=>t.includes(error)));
preserved++;
}
await page.evaluate(()=>{window.closeModal();window.api.showConfirmModal('Delete','Confirm',async()=>{throw Error('OWNER_TRANSFER_REQUIRED')});});await page.locator('#btn-modal-confirm').click();await page.waitForFunction(()=>!document.querySelector('#modal-confirm-error').hidden);assert(!await page.locator('#btn-modal-confirm').isDisabled());assert(!await page.locator('#modal-confirm-error').innerText().then(t=>t.includes('OWNER_TRANSFER_REQUIRED')));
await page.evaluate(()=>{window._onModalConfirm=async()=>true;});await page.locator('#btn-modal-confirm').click();assert.equal(await page.locator('.modal-card').count(),0);
}
// Actual admin renderer and real delete click handler, with isolated transport.
await page.evaluate(async()=>{window.current={uid:'admin',role:'super_admin',language:'tr'};await window.api.renderSuperAdminScreen(window.current,()=>{});await window.switchAdminTab('users');window.setUserRoleFilter('customer');});
await page.waitForSelector('[data-user-uid=target]');await page.evaluate(()=>window.deleteUserAdmin('target'));await page.evaluate(()=>window.apiError='OWNER_TRANSFER_REQUIRED');await page.locator('#btn-modal-confirm').click();await page.waitForFunction(()=>!document.querySelector('#modal-confirm-error').hidden);assert.equal(await page.locator('.super-admin-shell').count(),1);assert.match(await page.locator('#modal-confirm-error').innerText(),/sahipliğini/);
await page.evaluate(()=>{window.apiError=null;window.badSuccess=true});await page.locator('#btn-modal-confirm').click();await page.waitForFunction(()=>!document.querySelector('#modal-confirm-error').hidden);assert.equal(await page.locator('.modal-card').count(),1);
await page.evaluate(()=>{window.badSuccess=false});await page.locator('#btn-modal-confirm').click();await page.waitForFunction(()=>!document.querySelector('#btn-modal-confirm'));assert.equal(await page.evaluate(()=>window.cacheInvalidated),true);assert.equal(await page.locator('[data-user-uid=target]').count(),0);assert.equal(await page.locator('.operation-toast').count(),1);
// Render every role with local fixtures; then test central components in both themes and directions.
let themes=0;const roleResults=[];
for(const [role,render,cls] of [['customer','renderCustomerScreen','customer-panel'],['owner','renderOwnerScreen','owner-panel'],['barber','renderStaffScreen','staff-reference'],['super_admin','renderSuperAdminScreen','super-admin-shell']]){
await page.evaluate(async({role,render})=>{window.current={uid:role==='barber'?'staff':role==='super_admin'?'admin':role,role,language:'tr',businessId:'biz_fixture'};await window.api[render](window.current,()=>{});},{role,render});
assert.equal(await page.locator('.'+cls).count(),1,'render '+role);roleResults.push(role);
for(const lang of ['tr','en','ru','ar','tk','fa'])for(const theme of ['light','dark']){
 await page.evaluate(async({lang,theme,render})=>{window.current.language=lang;document.documentElement.dataset.theme=theme;await window.api[render](window.current,()=>{});},{lang,theme,render});
 assert.equal(await page.locator('.'+cls).count(),1);
 
 await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 if(lang==='tr'&&theme==='light'){
 const findings=await page.evaluate(()=>{
 const rgb=s=>(s.match(/[\d.]+/g)||[]).map(Number);const blend=(a,b)=>{const alpha=a[3]??1;return a.slice(0,3).map((v,i)=>v*alpha+b[i]*(1-alpha))};const lum=a=>a.slice(0,3).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);
 return [...document.querySelectorAll('#app-container *')].filter(e=>[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())&&e.getBoundingClientRect().width&&e.getBoundingClientRect().height).map(e=>{
 const ancestors=[];for(let p=e;p;p=p.parentElement)ancestors.unshift(p);let bg=[255,255,255];for(const p of ancestors)bg=blend(rgb(getComputedStyle(p).backgroundColor),bg);const st=getComputedStyle(e);const fg=blend(rgb(st.color),bg);const a=lum(fg),b=lum(bg),ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);return {text:e.textContent.trim().slice(0,45),cls:e.className,ratio:+ratio.toFixed(2),fg:st.color,bg};
 }).filter(x=>x.ratio<4.5);
 });contrastFindings.push({role,findings});
 }
 if(lang==='tr')await page.screenshot({path:'work/preview-fixes/'+role+'-'+theme+'.png',fullPage:true});

}

}
for(const lang of ['tr','en','ru','ar','tk','fa'])for(const theme of ['light','dark']){await page.evaluate(async({lang,theme})=>{window.api.applyDocumentLanguage(lang);document.documentElement.dataset.theme=theme;await window.api.renderPublicSalonRoute('fixture',()=>{},null);},{lang,theme});assert.equal(await page.locator('.public-storefront-page').count(),1);if(lang==='tr')await page.screenshot({path:'work/preview-fixes/public-'+theme+'.png',fullPage:true});}
for(const lang of ['tr','en','ru','ar','tk','fa'])for(const theme of ['light','dark'])for(const cls of ['customer-panel','owner-panel','staff-reference','super-admin-shell','auth-entry','public-storefront-page salon-detail-surface']){
await page.evaluate(({lang,theme,cls})=>{window.api.applyDocumentLanguage(lang);document.documentElement.dataset.theme=theme;document.getElementById('modal-root').innerHTML='';document.getElementById('app-container').innerHTML='<section class="'+cls+'"><div class="card"><h3 style="color:var(--gold-primary)">Heading</h3><p style="color:var(--text-main)">Body</p><p style="color:var(--text-muted)">Secondary</p><input class="input-field" placeholder="Input"><button class="btn btn-gold">Save</button><button class="btn" disabled>Disabled</button><span class="badge badge-pending">Pending</span></div></section>';},{lang,theme,cls});
const metrics=await page.evaluate(()=>{const colors=[...document.querySelectorAll('h3,p,.btn-gold')].map(e=>getComputedStyle(e).color);return{colors,bg:getComputedStyle(document.querySelector('.card')).backgroundColor,buttonBg:getComputedStyle(document.querySelector('.btn-gold')).backgroundColor,dir:document.documentElement.dir};});
assert.equal(metrics.dir,['ar','fa'].includes(lang)?'rtl':'ltr');
if(theme==='light'){assert.equal(metrics.colors[0],'rgb(118, 85, 0)',cls);assert.equal(metrics.colors[1],'rgb(23, 23, 23)');assert.equal(metrics.colors[3],'rgb(23, 23, 23)');assert.equal(metrics.buttonBg,'rgb(184, 137, 36)');}
themes++;
if(lang==='tr'&&theme==='light'&&cls==='owner-panel')await page.screenshot({path:'work/preview-fixes/light-components.png',fullPage:true});
}

// Exercise the actual central routing function, including render failures after DOM mutation.
const html=fs.readFileSync('index.html','utf8');const routeSource=html.slice(html.indexOf('async function handleUserRouting(user)'),html.indexOf("    window.addEventListener('ezo:session-invalid'"));
let routingChecks=0;
for(const error of [{message:'validation',statusCode:400},{message:'server',statusCode:500},{message:'network'},{message:'OWNER_TRANSFER_REQUIRED'},{message:'forbidden',statusCode:403},{code:'AUTH_SESSION_INVALID'},{code:'auth/user-token-expired'}]){
const result=await page.evaluate(async({source,error})=>{
const app=document.getElementById('app-container'),modal=document.getElementById('modal-root');app.innerHTML='<div id="original">Original screen</div>';modal.innerHTML='<div class="modal-card"><input id="retained" value="Draft"></div>';const input=document.getElementById('retained');
let redirected=false;const isInvalidSession=e=>['AUTH_SESSION_INVALID','auth/user-token-expired'].includes(e.code);const logoutUserSession=async()=>{};const renderPortalScreen=()=>{redirected=true;app.innerHTML='<div>Login</div>'};const resolveAuthoritativeSession=async u=>{throw error};const showErrorModal=window.api.showErrorModal;
const route=eval('('+source.trim()+')');await route({uid:'fixture'});return{redirected,preserved:document.getElementById('retained')===input,value:input.value};
},{source:routeSource,error});
assert.equal(result.redirected,Boolean(error.code));assert.equal(result.preserved,!error.code);assert.equal(result.value,'Draft');routingChecks++;
}
fs.writeFileSync('work/preview-fixes/contrast-findings.json',JSON.stringify(contrastFindings,null,2));assert.deepEqual(errors,[]);console.log(JSON.stringify({routingChecks,preserved,confirmLanguages:6,deleteUi:true,roles:roleResults,themeLanguageSurfaces:themes,pageErrors:errors}));
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
