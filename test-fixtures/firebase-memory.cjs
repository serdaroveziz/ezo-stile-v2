// Legacy data-flow fixtures only. Security is tested against real rules in test_v2_rules_emulator.mjs.
// No network access: every URL except this synthetic host is rejected.
const state={};const clone=x=>JSON.parse(JSON.stringify(x ?? null));
globalThis.fetch=async(input,options={})=>{
 const u=new URL(String(input));if(u.origin!=='https://firebase.test')throw Error('Network prohibited in memory test: '+u.hostname);
 const keys=u.pathname.replace(/\.json$/,'').split('/').filter(Boolean);let parent=state;
 for(const key of keys.slice(0,-1)){parent[key]??={};parent=parent[key];}
 const key=keys.at(-1),method=options.method||'GET';let value=key?parent[key]:state;
 if(method==='PUT'){parent[key]=JSON.parse(options.body);value=parent[key];}
 else if(method==='PATCH'){parent[key]??={};Object.assign(parent[key],JSON.parse(options.body));value=parent[key];}
 else if(method==='DELETE'){delete parent[key];value=null;}
 else if(method==='POST'){const id='fixture_'+Object.keys(parent[key]||{}).length;parent[key]??={};parent[key][id]=JSON.parse(options.body);value={name:id};}
 else if(method!=='GET')throw Error('Unsupported method '+method);
 if(u.searchParams.has('orderBy')){const field=JSON.parse(u.searchParams.get('orderBy')),equal=JSON.parse(u.searchParams.get('equalTo'));value=Object.fromEntries(Object.entries(value||{}).filter(([,v])=>v?.[field]===equal));}
 return {ok:true,status:200,json:async()=>clone(value),text:async()=>JSON.stringify(value??null)};
};
module.exports={url:'https://firebase.test',state};
