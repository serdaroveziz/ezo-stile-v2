// Converts static quoted HTML fragments to templates only when known UI copy is localized.
const fs=require('node:fs');
const vm=require('node:vm');
const {pathToFileURL}=require('node:url');
const parser={exports:{}};
vm.runInNewContext(process.binding('natives')['internal/deps/acorn/acorn/dist/acorn'],{exports:parser.exports,module:parser});
const acorn=parser.exports;
const files=['src/ui/customer.js','src/ui/owner.js','src/ui/staff.js','src/ui/staff-operations.js','src/ui/super-admin.js','src/ui/portal.js','src/ui/salon-application.js'];
const esc=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
(async()=>{
 const modules=await Promise.all(['core','owner','staff-admin','remaining'].map(name=>import(pathToFileURL(`${process.cwd()}/src/locales/${name}.js`))));
 const messages=Object.assign({},...modules.map(mod=>Object.values(mod)[0]));
 for(const file of files){let source=fs.readFileSync(file,'utf8');const ast=acorn.parse(source,{ecmaVersion:'latest',sourceType:'module'});const replacements=[];
  const walk=node=>{if(!node||typeof node!=='object')return;if(node.type==='Literal'&&typeof node.value==='string'&&/<[a-z][^>]*>/i.test(node.value)){let value=node.value,count=0;for(const [key,item] of Object.entries(messages)){const text=String(item.source||item.tr).trim();const expression=`\${t('${key}')}`;const between=new RegExp(`(>\\s*)${esc(text)}(\\s*<)`,'g');const attr=new RegExp(`((?:placeholder|title|aria-label|alt)=["'])${esc(text)}(["'])`,'g');value=value.replace(between,(_,a,b)=>{count++;return a+expression+b});value=value.replace(attr,(_,a,b)=>{count++;return a+expression+b});}if(count)replacements.push({start:node.start,end:node.end,value:'`'+value.replace(/`/g,'\\`')+'`',count});}for(const [k,v]of Object.entries(node)){if(['start','end','loc'].includes(k))continue;if(Array.isArray(v))v.forEach(walk);else if(v&&typeof v==='object')walk(v)}};walk(ast);
  for(const item of replacements.sort((a,b)=>b.start-a.start))source=source.slice(0,item.start)+item.value+source.slice(item.end);if(replacements.length){fs.writeFileSync(file,source,'utf8');console.log(file,replacements.reduce((n,x)=>n+x.count,0));}}
})().catch(error=>{console.error(error);process.exitCode=1});
