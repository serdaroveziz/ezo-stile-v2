// Mechanical localization pass for static text/accessible attributes inside HTML templates.
// It intentionally ignores JavaScript control/data literals.
const fs = require('node:fs');
const vm = require('node:vm');
const { pathToFileURL } = require('node:url');
const { files } = require('./i18n-inventory.cjs');
const parser = { exports:{} };
vm.runInNewContext(process.binding('natives')['internal/deps/acorn/acorn/dist/acorn'], { exports:parser.exports, module:parser });
const acorn = parser.exports;

(async () => {
  const modules = await Promise.all(['core','owner','staff-admin','remaining'].map(name => import(pathToFileURL(`${process.cwd()}/src/locales/${name}.js`))));
  const messages = Object.assign({}, ...modules.map(mod => Object.values(mod)[0]));
  const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  for (const file of files) {
    let source = fs.readFileSync(file, 'utf8');
    const ast = acorn.parse(source, { ecmaVersion:'latest', sourceType:'module' });
    const quasis=[];
    const walk=(node)=>{
      if(!node||typeof node!=='object')return;
      if(node.type==='TemplateElement') quasis.push(node);
      for(const [name,value] of Object.entries(node)){
        if(['start','end','loc'].includes(name))continue;
        if(Array.isArray(value))value.forEach(child=>walk(child));
        else if(value&&typeof value==='object')walk(value);
      }
    };
    walk(ast);
    let count = 0;
    for(const quasi of quasis.sort((a,b)=>b.start-a.start)){
      let fragment=source.slice(quasi.start,quasi.end);
      for (const [key, translations] of Object.entries(messages)) {
        const text = String(translations.source || translations.tr).trim();
        const expression = `\${t('${key}')}`;
        const betweenTags = new RegExp(`(>\\s*)${escapeRegex(text)}(\\s*<)`, 'g');
        const beforeExpression = new RegExp(`(>\\s*)${escapeRegex(text)}(\\s*)$`);
        const afterExpression = new RegExp(`^(\\s*)${escapeRegex(text)}(\\s*<)`);
        const attribute = new RegExp(`((?:placeholder|title|aria-label|alt)=["'])${escapeRegex(text)}(["'])`, 'g');
        fragment = fragment.replace(betweenTags, (_, before, after) => { count++; return before + expression + after; });
        fragment = fragment.replace(beforeExpression, (_, before, after) => { count++; return before + expression + after; });
        fragment = fragment.replace(afterExpression, (_, before, after) => { count++; return before + expression + after; });
        fragment = fragment.replace(attribute, (_, before, after) => { count++; return before + expression + after; });
      }
      source=source.slice(0,quasi.start)+fragment+source.slice(quasi.end);
    }
    if (count) fs.writeFileSync(file, source, 'utf8');
    console.log(`${file}: ${count}`);
  }
})();
