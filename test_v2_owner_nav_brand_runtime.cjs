const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
(async()=>{
 const saved=new Map();global.localStorage={getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)};
 const {getOwnerAppearance,setOwnerAppearance,ownerAppearanceStyle,renderOwnerSalonLogo}=await import('./src/ui/owner-appearance.js');
 const {uiIcon}=await import('./src/ui/icons.js');
 assert.equal(getOwnerAppearance('u','a'),'user');setOwnerAppearance('u','a','salon');assert.equal(getOwnerAppearance('u','a'),'salon');assert.equal(getOwnerAppearance('v','a'),'user');assert.equal(getOwnerAppearance('u','b'),'user');assert.equal(saved.get('ezo_theme'),undefined);
 const b={name:'<Salon>',branding:{primary:'#ffee00',mode:'light'},media:{logoUrl:'https://example.com/logo.png'}};
 assert(renderOwnerSalonLogo(b).includes('https://example.com/logo.png'));assert(!renderOwnerSalonLogo({logoUrl:'javascript:alert(1)'}).includes('javascript:'));assert(renderOwnerSalonLogo({}).includes('owner-salon-logo-empty'));assert(!renderOwnerSalonLogo(b).includes('<Salon>'));assert.equal(ownerAppearanceStyle(b,false),'');const style=ownerAppearanceStyle(b,true);assert(style.includes('--salon-primary:#ffee00'));assert(style.includes('--text-primary:var(--salon-text)'));assert(!style.includes('undefined'));
 const source=fs.readFileSync('src/ui/owner.js','utf8'),nav=source.slice(source.indexOf('    <nav class="bottom-nav workspace-nav"'),source.indexOf('    </nav>',source.indexOf('    <nav class="bottom-nav workspace-nav"'))+10);
 for(const activeOwnerTab of ['dashboard','ciro','agenda','appointments','management','profile']){
  const html=vm.runInNewContext('`'+nav+'`',{activeOwnerTab,uiIcon});assert.equal((html.match(/<button/g)||[]).length,5);assert.equal((html.match(/aria-current="page"/g)||[]).length,1);assert.deepEqual([...html.matchAll(/<span>([^<]+)<\/span>/g)].map(m=>m[1]),['Özet','Ciro','Randevular','Menüler','Profil']);
 }
 console.log('OWNER NAV BRAND PASS: five ordered destinations, active appointment views, safe salon logo/fallback, per-owner/per-salon preference, global theme unchanged');
})().catch(e=>{console.error(e);process.exitCode=1});
