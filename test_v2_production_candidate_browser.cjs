const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require(process.env.EZO_PLAYWRIGHT_PATH||'C:/Users/kuvvat/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const browser=await chromium.launch({headless:true,channel:'msedge'});try{
 const page=await browser.newPage({viewport:{width:390,height:844},serviceWorkers:'block'});const errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')console.log('CONSOLE',m.text().slice(0,200))});
 // Validate candidate module and verified public web configuration against live read-only discovery data.
 const sdk=JSON.parse(fs.readFileSync('work/final-production/firebase-sdk-result.json','utf8')).result.sdkConfig;
 await page.route('**/src/ui/customer.js*',r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('src/ui/customer.js','utf8')}));
 await page.route('**/api/auth/config*',r=>r.fulfill({contentType:'application/json',body:JSON.stringify({config:sdk,vapidKey:null})}));
 for(const [slug,name,id] of [['seko-px6x3','şeko','biz_1788043581889_cr17'],['azat-4p73c','azat','biz_1788083828190_rvep'],['ezo-merkez-salon-1writ','EZO Merkez Salon','biz_merkez_salon']]){
 for(const refresh of [false,true]){const response=refresh?await page.reload():await page.goto('https://ezo-stile-v2-bice.vercel.app/salon/'+slug);assert.equal(response.status(),200);await page.locator('.salon-detail-cta').waitFor({timeout:30000});assert((await page.locator('body').innerText()).includes(name));console.log('PASS route',slug,'refresh',refresh);}
 console.log('BUTTONS',await page.locator('button').allTextContents());await page.locator('.salon-detail-cta').first().click();await page.locator('#auth-phone').waitFor();assert.equal(await page.evaluate(()=>sessionStorage.getItem('ezo_pending_public_booking')),id);console.log('PASS booking auth entry',slug);
 }
 assert.deepEqual(errors,[]);console.log('CANDIDATE BROWSER PASS');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
