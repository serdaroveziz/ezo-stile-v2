const fs=require('fs'),path=require('path'),assert=require('assert');
// Run with EZO_PLAYWRIGHT_PATH pointing to an installed Playwright package when it is not local.
const {chromium}=require(process.env.EZO_PLAYWRIGHT_PATH || 'playwright');
const root=process.cwd();fs.mkdirSync('work/auth-refresh',{recursive:true});
(async()=>{
const browser=await chromium.launch({headless:true,channel:'msedge'});const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('**/*',async route=>{
 const u=new URL(route.request().url());if(u.hostname!=='auth.test')return route.abort();let body,type='text/javascript';
 if(u.pathname==='/') {type='text/html';body='<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/src/styles/app.css"></head><body><div id="app-container"></div><div id="modal-root"></div><script type="module">import {renderPortalScreen} from "/src/ui/portal.js"; window.renderEntry=()=>renderPortalScreen(u=>window.result=u);window.renderEntry();</script></body></html>';}
 else if(u.pathname==='/src/auth.js')body=`export const loginUser=async()=>{await new Promise(r=>{if(window.holdLogin)window.releaseLogin=r;else setTimeout(r,100)});if(window.failLogin)throw Error('Invalid credentials');return {uid:'fixture',role:window.testRole||'customer',businessId:'fixture-business'}};export const registerCustomer=loginUser,registerSalonApplicant=loginUser,registerStaffWithInvite=loginUser;export const updateUserLanguage=async l=>localStorage.setItem('ezo_lang',l);export const getCurrentUser=()=>null;export const isSalonPortalRole=r=>['owner','barber','manager','receptionist','super_admin'].includes(r);export const logoutUserSession=async()=>{};export const setPortalMode=m=>window.portalMode=m;`;
 else if(u.pathname==='/src/db.js')body='export const submitSalonApplication=async()=>({});export const fetchRecord=async()=>({});';
 else {const file=path.join(root,u.pathname);if(!fs.existsSync(file))return route.fulfill({status:404,body:''});body=fs.readFileSync(file);type=file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':'text/javascript';}
 await route.fulfill({contentType:type,body});});
await page.goto('http://auth.test/');await page.waitForSelector('.auth-entry');
let layouts=0;
for(const lang of ['tr','en','ru','ar','tk','fa']){
 await page.evaluate(l=>{localStorage.setItem('ezo_lang',l);window.renderEntry();},lang);
 assert.equal(await page.locator('html').getAttribute('dir'), ['ar','fa'].includes(lang)?'rtl':'ltr');
 for(const width of [320,375,390,768,1280]){
 await page.setViewportSize({width,height:900});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${lang}/${width} entry overflow`);
 for(const modal of ['openCustomerChoiceModal','openCustomerAuthModal','openCustomerRegisterModal','openSalonChoiceModal','openSalonLoginModal','openSalonApplyModal','openStaffInviteModal','openLanguageModal']){
 await page.evaluate(m=>window[m](),modal);
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.querySelector('.modal-card').scrollWidth<=document.querySelector('.modal-card').clientWidth),`${lang}/${width}/${modal} overflow`);
 await page.evaluate(()=>window.closeModal());
 }layouts++;
 }
}
await page.evaluate(()=>{localStorage.setItem('ezo_lang','tr');window.renderEntry();});
await page.setViewportSize({width:390,height:844});await page.screenshot({path:'work/auth-refresh/mobile.png',fullPage:true});
await page.setViewportSize({width:1280,height:900});await page.screenshot({path:'work/auth-refresh/desktop.png',fullPage:true});
await page.locator('#auth-entry-customer').click();await page.keyboard.press('Escape');assert(await page.locator('#auth-entry-customer').evaluate(e=>e===document.activeElement));
for(const role of ['customer','owner','barber','super_admin']){
 await page.evaluate(r=>{window.testRole=r;window.result=null;window.holdLogin=true;window[r==='customer'?'openCustomerAuthModal':'openSalonLoginModal']();},role);
 await page.locator('input[type=tel]').fill('05000000000');await page.locator('input[type=password]').fill('fixture-password');
 await page.locator('.modal-card .btn-gold').click();assert(await page.locator('.modal-card').getAttribute('aria-busy')==='true');await page.evaluate(()=>{window.holdLogin=false;window.releaseLogin();});
 await page.waitForFunction(()=>window.result);assert.equal(await page.evaluate(()=>window.result.role),role);
}
await page.evaluate(()=>{window.failLogin=true;window.openCustomerAuthModal();});await page.locator('#auth-phone').fill('05000000000');await page.locator('#auth-password').fill('wrong');await page.locator('.modal-card .btn-gold').click();await page.waitForFunction(()=>document.querySelector('.modal-card').textContent.includes('Invalid credentials'));
assert.equal(await page.locator('.modal-card').getAttribute('role'),'dialog');
await page.screenshot({path:'work/auth-refresh/error.png'});
await page.evaluate(()=>{window.failLogin=false;window.openCustomerRegisterModal();});
for(const [id,value] of Object.entries({'reg-name':'Fixture','reg-phone':'05000000000','reg-password':'fixture-password','reg-password-confirm':'fixture-password'}))await page.locator('#'+id).fill(value);
await page.evaluate(()=>window.result=null);await page.locator('.modal-card .btn-gold').click();await page.waitForFunction(()=>window.result);
await page.evaluate(()=>window.openCustomerAuthModal());await page.locator('.modal-card button').last().focus();await page.keyboard.press('Tab');assert(await page.locator('.modal-card button').first().evaluate(e=>e===document.activeElement));
await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.modal-card').evaluate(e=>getComputedStyle(e).animationName),'none');
await page.setViewportSize({width:390,height:844});await page.screenshot({path:'work/auth-refresh/login.png'});
await page.evaluate(async()=>{const {showSuccessModal}=await import('/src/ui/portal.js');showSuccessModal('Success','Completed');});assert.equal(await page.locator('.modal-card').getAttribute('role'),'dialog');
// Entry selectors must release their styles when any authenticated panel replaces it.
for(const panel of ['customer-panel','owner-panel','staff-panel','super-admin-panel']) {
 await page.evaluate(p=>{document.querySelector('#app-container').innerHTML='<div class="'+p+'"></div>';document.querySelector('#modal-root').innerHTML='<div class="modal-card"><button class="btn btn-gold">OK</button></div>';},panel);
 const readStyle=()=>page.evaluate(async()=>{await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));const c=getComputedStyle(document.querySelector('.modal-card')),a=getComputedStyle(document.querySelector('#app-container'));return [c.backgroundColor,c.borderRadius,a.maxWidth,getComputedStyle(document.body).backgroundColor]});
 const actual=await readStyle();await page.locator('link[rel=stylesheet]').evaluate(e=>e.disabled=true);const baseline=await page.addStyleTag({content:fs.readFileSync('src/styles/app.css','utf8').split('/* Entry-only presentation:')[0]});
 assert.deepEqual(actual,await readStyle(),panel+' style leakage');await baseline.evaluate(e=>e.remove());await page.locator('link[rel=stylesheet]').evaluate(e=>e.disabled=false);
}
assert.deepEqual(errors,[]);console.log(JSON.stringify({layouts,modalLayouts:layouts*8,roles:4,error:true,signup:true,loading:true,focus:true,reducedMotion:true,pageErrors:errors}));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});


