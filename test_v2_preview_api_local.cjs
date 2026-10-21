
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
(async()=>{
let state,authError;const clone=x=>JSON.parse(JSON.stringify(x));
function reset(){state={users:{admin:{role:'super_admin'},target:{role:'customer'},boss:{role:'owner'},staff:{role:'barber'},super:{role:'super_admin'}},businesses:{salon:{ownerUid:'boss',staff:{s:{userId:'staff'}}}}};}reset();
const auth={verifyIdToken:async()=>{if(authError)throw Object.assign(Error('injected'),{code:authError});return{uid:'admin'}},getUser:async uid=>({uid}),deleteUser:async uid=>{state.authDeleted=uid}};
const db={ref:p=>({get:async()=>({exists:()=>!!state.users[p?.split('/')[1]],val:()=>p?state.users[p.split('/')[1]]:clone(state)}),on:()=>()=>{},off:()=>{},transaction:async fn=>{const result=fn(clone(state));if(!result)return{committed:false};state=result;return{committed:true}}})};
const app={options:{credential:{getAccessToken:async()=>({access_token:'fixture'})}}};
const context=vm.createContext({console,Buffer,URL,process:{env:{}},fetch:async url=>{assert.match(String(url),/^https:\/\/ezostile-barber/);return{ok:true,json:async()=>state.users.admin}}});const modules=new Map();
const real=new Set(['api/index.js','server/firebase-admin.js','server/user-hard-delete.js','server/handlers/user/toggle-status.js']);
async function synthetic(id,values){const m=new vm.SyntheticModule(Object.keys(values),function(){for(const[k,v]of Object.entries(values))this.setExport(k,v)},{context,identifier:id});modules.set(id,m);return m;}
async function load(id){if(modules.has(id))return modules.get(id);
if(id==='firebase-admin/app')return synthetic(id,{applicationDefault:()=>app.options.credential,cert:()=>app.options.credential,getApps:()=>[app],initializeApp:()=>app});
if(id==='firebase-admin/auth')return synthetic(id,{getAuth:()=>auth});
if(id==='firebase-admin/database')return synthetic(id,{getDatabase:()=>db});
if(id==='firebase-admin/messaging')return synthetic(id,{getMessaging:()=>({})});
if(!id.includes('/')||id.startsWith('node:'))return synthetic(id,await import(id));
if(id==='src/staff-permissions.js')return synthetic(id,{hasPermission:()=>true});
if(id==='server/handlers/audit/log.js')return synthetic(id,{default:()=>{},writeAuditLog:async()=>{}});
if(!real.has(id))return synthetic(id,{default:()=>{throw Error('Unexpected unrelated handler '+id)}});
const m=new vm.SourceTextModule(fs.readFileSync(id,'utf8'),{context,identifier:id});modules.set(id,m);await m.link((specifier,parent)=>load(specifier.startsWith('.')?path.posix.normalize(path.posix.join(path.posix.dirname(parent.identifier),specifier)):specifier));return m;
}
const router=await load('api/index.js');await router.evaluate();
async function request(target,headers={authorization:'Bearer fixture'}){let status=200,body;await router.namespace.default({url:'/api/user/toggle-status',method:'POST',headers,body:{targetUid:target,action:'delete',superAdminUid:'admin'}},{status(n){status=n;return this},json(x){body=x;return this}});return{status,body};}
let count=0;
for(const uid of ['target','staff']){reset();const r=await request(uid);assert.equal(r.status,200);assert.equal(r.body.hardDeleted,true);assert.equal(state.users[uid],undefined);assert.equal(state.businesses.salon.ownerUid,'boss');count++;}
for(const [uid,status,message]of [['boss',409,'OWNER_TRANSFER_REQUIRED'],['admin',400,'Kendi hesabınızı'],['super',403,'SUPER_ADMIN_DELETE_DENIED']]){reset();const r=await request(uid);assert.equal(r.status,status);assert(r.body.error.includes(message));assert(state.users[uid]);count++;}
for(const [code,status]of [['auth/id-token-expired',401],['auth/id-token-revoked',401],['auth/internal-error',503],['app/invalid-credential',503]]){authError=code;const r=await request('target');assert.equal(r.status,status);assert.equal(r.body.code,status===401?'AUTH_SESSION_INVALID':undefined);count++;}authError=null;
const missing=await request('target',{});assert.equal(missing.status,401);assert.equal(missing.body.code,'AUTH_SESSION_INVALID');count++;
console.log('PREVIEW API LOCAL: '+count+'/'+count+' PASS; real router/auth boundary/handler/deletion service, mocked SDK only');
})().catch(e=>{console.error(e);process.exitCode=1});
