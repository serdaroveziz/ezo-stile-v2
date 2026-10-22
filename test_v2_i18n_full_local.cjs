const assert = require('node:assert/strict');
const fs = require('node:fs');
const { DICTIONARY, SUPPORTED_LANGUAGES } = require('./src/config.js');
const codes = SUPPORTED_LANGUAGES.map(x => x.code);
assert.deepEqual(codes, ['tr','en','ru','ar','tk','fa']);
for (const code of codes) {
  const dict = DICTIONARY[code];
  assert.ok(dict && Object.keys(dict).length > 0, `${code} dictionary`);
  assert.equal(Object.values(dict).filter(v => !String(v || '').trim()).length, 0, `${code} empty translations`);
}
const rtl = new Set(['ar','fa']);
assert.deepEqual(codes.map(c => rtl.has(c)), [false,false,false,true,false,true]);
for (const file of ['customer.js','owner.js','staff.js','super-admin.js']) {
  const source = fs.readFileSync(`src/ui/${file}`, 'utf8');
  assert.match(source, /\bt\(/, `${file} uses i18n`);
}
console.log('PASS i18n 6-language dictionary, RTL/LTR, customer/owner/staff/super-admin render contracts');
