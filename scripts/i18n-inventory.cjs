// Local-only source inventory. Uses the parser bundled with Node; no network or dependencies.
const fs = require('node:fs');
const vm = require('node:vm');
const parser = { exports:{} };
vm.runInNewContext(process.binding('natives')['internal/deps/acorn/acorn/dist/acorn'], { exports:parser.exports, module:parser });
const acorn = parser.exports;
const files = ['src/ui/customer.js','src/ui/owner.js','src/ui/staff.js','src/ui/staff-operations.js','src/ui/super-admin.js','src/ui/portal.js','src/ui/salon-application.js'];
const brand = /^(?:EZO STİLE(?: v2)?|AI|VIP|PRO|FREE|PREMIUM|Premium|Pro|Free|WhatsApp|Instagram|TikTok|JPEG|PNG|WebP|TL|SMS|TRY|Notification|FileReader|OpenStreetMap|&copy;|Kuvvat|Mustafa Usta|https?:.*|05X+|@salonhesabi|İstanbul|Şişli|[\d., ]+TL)$/i;
const prose = text => /\p{L}/u.test(text) && !brand.test(text) && !/^(?:[a-z][\w-]*\.[\w.-]+|[\w-]+\/[^ ]+|--[\w-]+|#[\da-f]+|[\w]+:|[\w.-]+\(.*\))$/i.test(text);
const entries=[];
function scan(file, source) {
 const ast=acorn.parse(source,{ecmaVersion:'latest',sourceType:'module'});
 const add=(start,end,text,kind,extra={})=>{const trimmed=text.trim();if(prose(trimmed))entries.push({file,start,end,text:trimmed,kind,...extra});};
 function htmlRanges(text, emit) {
   const tags=/<!--[\s\S]*?-->|<(?:"[^"]*"|'[^']*'|[^'">])*>|[^<]+/g;let match;
   while((match=tags.exec(text))) {
     const chunk=match[0];if(chunk.startsWith('<!--'))continue;
     if(chunk.startsWith('<')) {
       const attrs=/\b(placeholder|title|aria-label|alt)\s*=\s*(["'])(.*?)\2/gs;let a;
       while((a=attrs.exec(chunk))) {const at=match.index+a.index+a[0].indexOf(a[2])+1;emit(at,at+a[3].length,a[3]);}
     }else emit(match.index,match.index+chunk.length,chunk);
   }
 }
 function walk(node,parent,key) {
   if(!node||typeof node!=='object')return;
   if(node.type==='TemplateLiteral') {
     const raw=node.quasis.map(q=>q.value.raw).join('\u0001');
     if(/<\/?[a-z]/i.test(raw)) {
       const maps=[];let pos=0;
       node.quasis.forEach(q=>{maps.push({from:pos,to:pos+q.value.raw.length,q});pos+=q.value.raw.length+1;});
       htmlRanges(raw,(start,end,text)=>{
         for(const m of maps){const a=Math.max(m.from,start),b=Math.min(m.to,end);if(a>=b)continue;const part=raw.slice(a,b);const trim=part.trim();if(!trim)continue;
           add(m.q.start+a-m.from+part.indexOf(trim),m.q.start+b-m.from-(part.length-part.trimEnd().length),trim,'html');
         }
       });
     } else if(node.expressions.length===0) add(node.start,node.end,node.quasis[0].value.cooked,'literal');
     else if(/[şğıİçöüŞĞÇÖÜ]/u.test(raw)) entries.push({file,start:node.start,end:node.end,text:raw,kind:'dynamic',source:source.slice(node.start,node.end)});
   }
   if(node.type==='Literal'&&typeof node.value==='string') {
     const val=node.value;
     if(/<\/?[a-z][^>]*>/i.test(val)) {
       // Preserve quoting through a template conversion only when the literal contains UI text.
       const ranges=[];htmlRanges(val,(start,end,text)=>{if(prose(text.trim()))ranges.push({start,end,text:text.trim()});});
       if(ranges.length)entries.push({file,start:node.start,end:node.end,text:val,kind:'htmlLiteral',ranges});
     } else if(prose(val.trim()) && (/[şğıİçöüŞĞÇÖÜ]/u.test(val)||/[A-Z][a-z].*\s|^[A-Z][a-z]+$/.test(val))) {
       const excluded=parent&&(parent.type==='ImportDeclaration'||parent.type==='ExportNamedDeclaration'||(parent.type==='Property'&&key==='key')||parent.type==='ImportExpression'||(parent.type==='CallExpression'&&parent.callee.type==='MemberExpression'&&['log','warn','error','includes','startsWith','endsWith','match','replace','replaceAll'].includes(parent.callee.property.name)));
       if(!excluded) add(node.start,node.end,val,'literal');
     }
   }
   for(const [k,value] of Object.entries(node)){if(k==='quasis')continue;if(Array.isArray(value))value.forEach(v=>walk(v,node,k));else if(value&&typeof value==='object')walk(value,node,k);}
 }
 walk(ast);
}
files.forEach(file=>scan(file,fs.readFileSync(file,'utf8')));
if(require.main===module){
 const all=[...new Set(entries.flatMap(e=>e.ranges?e.ranges.map(r=>r.text):[e.text]))];
 console.log(JSON.stringify({occurrences:entries.length,unique:all.length,strings:all},null,2));
}
module.exports={entries,files,scan};
