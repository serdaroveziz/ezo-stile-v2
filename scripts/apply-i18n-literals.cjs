// Mechanical pass for user-visible JavaScript literals. Control/data literals are excluded.
const fs = require('node:fs');
const vm = require('node:vm');
const { pathToFileURL } = require('node:url');
const parser = { exports:{} };
vm.runInNewContext(process.binding('natives')['internal/deps/acorn/acorn/dist/acorn'], { exports:parser.exports, module:parser });
const acorn = parser.exports;
const files = ['src/ui/customer.js','src/ui/owner.js','src/ui/staff.js','src/ui/staff-operations.js','src/ui/super-admin.js','src/ui/portal.js','src/ui/salon-application.js'];

(async () => {
  const modules = await Promise.all(['core','owner','staff-admin','remaining'].map(name => import(pathToFileURL(`${process.cwd()}/src/locales/${name}.js`))));
  const messages = Object.assign({}, ...modules.map(mod => Object.values(mod)[0]));
  const byText = new Map(Object.entries(messages).map(([key, translations]) => [String(translations.source || translations.tr).trim(), key]));
  const uiCalls = new Set(['alert','confirm','showErrorModal','showSuccessModal','showConfirmModal','uiIcon','staffIcon']);
  const displayCalls = new Set(['title','empty','statusMeta']);
  const neverReplace = new Set(['Fark Etmez','Saç Kesimi & Sakal','VIP Saç & Cilt Bakımı','Ense & Sakal Düzeltme','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday','Closed','Open today','Closed today']);
  for (const file of files) {
    let source = fs.readFileSync(file, 'utf8');
    const ast = acorn.parse(source,{ecmaVersion:'latest',sourceType:'module'});
    const replacements=[];
    const walk=(node,ancestors=[])=>{
      if(!node||typeof node!=='object')return;
      if(node.type==='Literal'&&typeof node.value==='string'){
        const key=byText.get(node.value.trim());
        if(key && !neverReplace.has(node.value.trim())){
          const parent=ancestors.at(-1);
          const call=ancestors.slice().reverse().find(item=>item.type==='CallExpression');
          const callName=call && (call.callee.name || call.callee.property?.name);
          const assignment=ancestors.slice().reverse().find(item=>item.type==='AssignmentExpression');
          const assignedName=assignment?.left?.property?.name;
          const inFunction=ancestors.some(item=>/Function/.test(item.type));
          const isDirectCallArgument=call && call.arguments && call.arguments.includes(node);
          const safe=uiCalls.has(callName) || displayCalls.has(callName) || ['innerHTML','textContent','innerText','placeholder','title','ariaLabel'].includes(assignedName) || (inFunction && !isDirectCallArgument);
          const structural=parent && ((parent.type==='Property'&&parent.key===node)||(parent.type==='ImportDeclaration')||(parent.type==='ExportNamedDeclaration'));
          const control=parent && ['BinaryExpression','SwitchCase'].includes(parent.type);
          if(safe&&!structural&&!control) replacements.push({start:node.start,end:node.end,replacement:`t('${key}')`});
        }
      }
      for(const [name,value] of Object.entries(node)){
        if(['start','end','loc'].includes(name))continue;
        if(Array.isArray(value))value.forEach(child=>walk(child,[...ancestors,node]));
        else if(value&&typeof value==='object')walk(value,[...ancestors,node]);
      }
    };
    walk(ast);
    for(const item of replacements.sort((a,b)=>b.start-a.start))source=source.slice(0,item.start)+item.replacement+source.slice(item.end);
    if(replacements.length){fs.writeFileSync(file,source,'utf8');console.log(`${file}: ${replacements.length}`);}
  }
})();
