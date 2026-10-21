// One-time localization catalog builder. It sends only static UI copy, never user data.
const fs = require('node:fs');
const { entries } = require('./i18n-inventory.cjs');
const languages = ['tr','en','ru','ar','tk','fa'];
const existingFiles = ['core','owner','staff-admin'];
const existingSources = new Set();

async function loadExisting() {
  const { pathToFileURL } = require('node:url');
  for (const name of existingFiles) {
    const mod = await import(pathToFileURL(`${process.cwd()}/src/locales/${name}.js`));
    for (const value of Object.values(mod)[0] ? Object.values(Object.values(mod)[0]) : []) existingSources.add(String(value.source || value.tr).trim());
  }
}

const reject = text => !text || text.length < 2 || text.length > 320 || /\u0001|<\/?|style=|onclick=|class=|https?:|^[a-z][\w.-]*$|^inv_|^[#@]/i.test(text)
  || ['EZO STİLE','EZO STİLE v2','Notification','FileReader','OpenStreetMap','Website','Instagram','WhatsApp','TikTok','FREE','PRO','PREMIUM','VIP','TL','SMS','TRY'].includes(text)
  || ['Saç Kesimi & Sakal','VIP Saç & Cilt Bakımı','Ense & Sakal Düzeltme','Fark Etmez','Kuvvat','Mustafa Usta'].includes(text)
  || /^\d|^[A-Z0-9_./:-]+$/.test(text);

async function translateBatch(texts, target) {
  if (target === 'tr') return texts;
  const results=[];
  for (let i=0;i<texts.length;i+=20) {
    const chunk=texts.slice(i,i+20);
    const separator='\n__EZO_I18N_SPLIT__\n';
    const url='https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl='+target+'&dt=t&q='+encodeURIComponent(chunk.join(separator));
    const response=await fetch(url);
    if(!response.ok)throw new Error(`Translation ${target} failed: ${response.status}`);
    const data=await response.json();
    const joined=(data[0]||[]).map(item=>item[0]).join('');
    const translated=joined.split(/\s*__EZO_I18N_SPLIT__\s*/);
    if(translated.length!==chunk.length)throw new Error(`Translation ${target} count mismatch ${translated.length}/${chunk.length}`);
    results.push(...translated.map(value=>value.trim()));
  }
  return results;
}

(async()=>{
  await loadExisting();
  const sources=[...new Set(entries.flatMap(entry=>entry.ranges?entry.ranges.map(item=>item.text.trim()):[entry.text.trim()]))]
    .filter(text=>!existingSources.has(text)&&!reject(text));
  if (process.argv.includes('--list')) {
    console.log(sources.map((source, index) => `${index + 1}|${source}`).join('\n'));
    return;
  }
  const columns={};
  for(const lang of languages)columns[lang]=await translateBatch(sources,lang);
  const messages={};
  sources.forEach((source,index)=>messages[`uiAuto_${String(index+1).padStart(3,'0')}`]={source,...Object.fromEntries(languages.map(lang=>[lang,columns[lang][index]]))});
  const body='// Generated from reviewed static UI literals; no user or salon data.\nexport const remainingMessages = '+JSON.stringify(messages,null,2)+';\n';
  fs.writeFileSync('src/locales/remaining.js',body,'utf8');
  console.log(`Generated ${sources.length} reviewed UI messages.`);
})().catch(error=>{console.error(error.message);process.exitCode=1;});
