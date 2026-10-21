const fs=require('fs'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/kuvvat/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const lum=c=>c.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
const contrast=(a,b)=>{const x=lum(a),y=lum(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
(async()=>{const browser=await chromium.launch({headless:true,channel:'msedge'});try{const page=await browser.newPage({reducedMotion:'reduce'});let checks=0;
for(const cls of ['customer-panel','owner-panel']){
await page.setContent(`<html data-theme="light"><body><main class="${cls}"><div class="card"><h3 style="color:var(--gold)">Gold</h3><p style="color:var(--text-muted)">Secondary</p><button class="btn btn-gold">Save</button><div class="owner-upcoming-row">${['approved','pending','completed','cancelled','no_show','info'].map(s=>`<span class="badge badge-${s}">${s}</span>`).join('')}</div><button class="customer-time-slot" aria-pressed="true">09:30</button><input class="input-field" placeholder="Name"></div></main><div id="modal-root"><div class="modal-card">Modal</div></div></body></html>`);
await page.addStyleTag({content:fs.readFileSync('src/styles/app.css','utf8')+'\n'+fs.readFileSync('src/styles/theme-palette.css','utf8')+'\n*{transition:none!important}'});
const inspect=async selector=>page.locator(selector).evaluateAll(nodes=>nodes.map(e=>{const s=getComputedStyle(e);let bg=s.backgroundColor;for(let p=e.parentElement;bg==='rgba(0, 0, 0, 0)'&&p;p=p.parentElement)bg=getComputedStyle(p).backgroundColor;return{cls:e.className,fg:s.color.match(/[\d.]+/g).map(Number).slice(0,3),bg:bg.match(/[\d.]+/g).map(Number).slice(0,3)}}));
for(const x of await inspect('h3,p,.btn-gold,.badge,.customer-time-slot,.input-field,.modal-card')){assert(contrast(x.fg,x.bg)>=4.5,cls+' '+x.cls+' '+contrast(x.fg,x.bg));checks++}
await page.locator('.btn-gold').hover();for(const x of await inspect('.btn-gold')){assert(contrast(x.fg,x.bg)>=4.5,'hover contrast');checks++}
}
console.log('LIGHT CONTRAST: '+checks+' computed text/background pairs >= 4.5:1');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
