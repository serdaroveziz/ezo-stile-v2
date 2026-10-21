const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const files=fs.readdirSync('.').filter(f=>/^test_v2.*\.cjs$/.test(f)&&!f.includes('browser')).sort();
const out='work/production-gate';fs.mkdirSync(out,{recursive:true});let passed=0;const results=[];
for(const file of files){const r=spawnSync(process.execPath,['--experimental-vm-modules','--require',path.resolve('scripts/security-offline-guard.cjs'),file],{encoding:'utf8',timeout:60000});const output=(r.stdout||'')+(r.stderr||'');fs.writeFileSync(path.join(out,file+'.log'),output);const ok=r.status===0;results.push({file,passed:ok,exit:r.status});if(ok)passed++;console.log((ok?'PASS ':'FAIL ')+file);if(!ok)console.log(output.slice(-1800));}
fs.writeFileSync(path.join(out,'summary.json'),JSON.stringify({passed,total:files.length,results},null,2));console.log('WIDE REGRESSION: '+passed+'/'+files.length);process.exitCode=passed===files.length?0:1;
