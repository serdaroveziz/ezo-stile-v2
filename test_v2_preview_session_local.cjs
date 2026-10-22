
const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
const {isInvalidSession}=await import('./src/operation-errors.js');
const source=fs.readFileSync('src/firebase.js','utf8');const fn=source.slice(source.indexOf('export async function authenticatedFetch')).replace('export ','');
let events=0,tokenError=null,response;
const fetchFn=Function('getIdToken','isInvalidSession','window','Headers','fetch','Event','return ('+fn+')')(async()=>{if(tokenError)throw tokenError;return'fixture'},isInvalidSession,{dispatchEvent:()=>events++},Headers,async()=>response,Event);
for(const [status,body]of [[400,{error:'VALIDATION_ERROR'}],[403,{error:'DENIED'}],[409,{error:'OWNER_TRANSFER_REQUIRED'}],[500,{error:'SERVER_ERROR'}],[503,{error:'AUTH_SERVICE_UNAVAILABLE'}],[401,{error:'business authentication failure'}]]){
response=new Response(JSON.stringify(body),{status});assert.equal((await fetchFn('/fixture')).status,status);assert.equal(events,0);
}
response=new Response(JSON.stringify({code:'AUTH_SESSION_INVALID'}),{status:401});await assert.rejects(fetchFn('/fixture'),e=>e.code==='AUTH_SESSION_INVALID');assert.equal(events,1);
tokenError=Object.assign(Error('expired'),{code:'auth/user-token-expired'});await assert.rejects(fetchFn('/fixture'));assert.equal(events,2);
tokenError=Object.assign(Error('network'),{code:'auth/network-request-failed'});await assert.rejects(fetchFn('/fixture'));assert.equal(events,2);
const auth=fs.readFileSync('src/auth.js','utf8');const restore=auth.slice(auth.indexOf('export async function restoreSession'),auth.indexOf('export async function logoutUserSession')).replace('export ','');
const restoreFn=Function('sessionGeneration','waitForFirebaseUser','resolveBackendUserRole','console','return ('+restore+')')(1,async()=>({uid:'fixture'}),async()=>{throw Error('server failed')},{warn(){}});await assert.rejects(restoreFn(),/server failed/);
console.log('SESSION LOCAL: 10/10 PASS; 4xx/5xx/business errors stay; explicit invalid/expired emits login event; transient restore rejects for retry');
})().catch(e=>{console.error(e);process.exitCode=1});
