const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

(async () => {
  const storage = new Map();
  global.localStorage = { getItem:key => storage.get(key) || null, setItem:(key,value) => storage.set(key,String(value)) };
  Object.defineProperty(global, 'navigator', { value:{ language:'fa-IR' }, configurable:true });
  global.window = {};
  global.document = { documentElement:{ lang:'', dir:'' } };
  const config = await import(pathToFileURL(path.join(__dirname,'src/config.js')).href + `?fa=${Date.now()}`);
  assert.deepEqual(config.SUPPORTED_LANGUAGES.map(item => item.code), ['tr','en','ru','ar','tk','fa'], 'existing language order preserved and fa appended');
  assert.equal(config.detectDefaultLanguage(), 'fa', 'browser fa detection');
  localStorage.setItem('ezo_lang','fa');
  assert.equal(config.detectDefaultLanguage(), 'fa', 'fa persistence');
  assert.equal(config.isRtl('fa'), true);
  assert.equal(config.isRtl('ar'), true);
  for (const language of ['tr','en','ru','tk']) assert.equal(config.isRtl(language), false, `${language} remains LTR`);
  config.applyDocumentLanguage('fa');
  assert.equal(document.documentElement.lang, 'fa'); assert.equal(document.documentElement.dir, 'rtl');
  config.applyDocumentLanguage('tr');
  assert.equal(document.documentElement.lang, 'tr'); assert.equal(document.documentElement.dir, 'ltr', 'RTL cleared');
  const trKeys = Object.keys(config.DICTIONARY.tr);
  assert.deepEqual(trKeys.filter(key => !config.DICTIONARY.fa[key]), [], 'no missing/empty Persian key from canonical dictionary');
  assert.ok(trKeys.every(key => config.t(key,'fa') !== 'undefined'), 'no undefined translation output');
  assert.equal(config.t('anyStaff','fa'), 'فرقی ندارد');

  const read = file => fs.readFileSync(path.join(__dirname,file),'utf8');
  for (const file of ['src/ui/portal.js','src/ui/customer.js','src/ui/owner.js','src/ui/staff.js','src/ui/super-admin.js']) assert.match(read(file), /applyDocumentLanguage/, `${file} applies lang/dir`);
  assert.match(read('src/styles/app.css'), /html\[dir="rtl"\].*input\[type="tel"\]/s, 'numeric/contact data remain readable in RTL');
  assert.match(read('src/ui/owner.js'), /owner-salon-neighborhood/, 'address UI preserved');
  assert.match(read('src/ui/owner.js'), /openOwnerMapPicker/, 'map UI preserved');
  assert.match(read('src/push-notifications.js'), /enablePushNotifications/, 'push integration preserved');
  console.log('PERSIAN I18N LOCAL: PASS');
})().catch(error => { console.error(error); process.exitCode = 1; });
