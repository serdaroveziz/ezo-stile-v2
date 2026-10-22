const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const repo = path.resolve(process.argv[2] || __dirname);
const read = file => fs.readFileSync(path.join(repo,file),'utf8');
(async () => {
  // config.t() may fall back to persisted language while modal handlers are evaluated.
  const storage = new Map();
  global.localStorage = { getItem:key => storage.get(key) || null, setItem:(key,value) => storage.set(key, String(value)) };
  global.navigator = { language:'tr-TR' };
  const {SUPPORTED_LANGUAGES, DICTIONARY, t, applyDocumentLanguage} = await import(pathToFileURL(path.join(repo,'src/config.js')));
  const customer = read('src/ui/customer.js');
  const owner = read('src/ui/owner.js');
  const portal = read('src/ui/portal.js');
  const codes = ['tr','en','ru','ar','tk','fa'];
  assert.deepEqual(SUPPORTED_LANGUAGES.map(l => l.code), codes);
  const root = {innerHTML:''};
  const app = {innerHTML:'customer screen'};
  global.document = {documentElement:{}, getElementById:id => id === 'modal-root' ? root : app};
  global.window = {closeModal:() => {root.innerHTML = '';}};
  const uiIcon = (...args) => args.join(' ');
  function bind(source, name, end, lang) {
    const start = source.indexOf(`  window.${name} =`);
    assert.ok(start >= 0);
    const block = source.slice(start, source.indexOf(end,start));
    Function('SUPPORTED_LANGUAGES','t','currentLang','uiIcon',block)(SUPPORTED_LANGUAGES,t,lang,uiIcon);
  }
  // Execute the actual customer click handler. The old options reference throws here.
  bind(customer,'openLanguageModal','  window.selectCustomerLanguage =','tr');
  assert.doesNotThrow(() => window.openLanguageModal(), 'customer language trigger opens without a ReferenceError');
  assert.match(root.innerHTML, /modal-overlay/);
  assert.equal(app.innerHTML,'customer screen','opening language selector preserves the screen');
  const expected = {
    tr:['Türkçe','İngilizce','Rusça','Arapça','Türkmence','Farsça'],
    en:['Turkish','English','Russian','Arabic','Turkmen','Persian'],
    ru:['Турецкий','Английский','Русский','Арабский','Туркменский','Персидский'],
    ar:['التركية','الإنجليزية','الروسية','العربية','التركمانية','الفارسية'],
    tk:['Türkçe','Iňlisçe','Rusça','Arapça','Türkmençe','Parsça'],
    fa:['ترکی','انگلیسی','روسی','عربی','ترکمنی','فارسی']
  };
  for (const lang of codes) {
    assert.deepEqual(codes.map(code => t('languageName_' + code,lang)),expected[lang]);
    for (const [source,name,end] of [[customer,'openLanguageModal','  window.selectCustomerLanguage ='],[owner,'openLanguageModalOwner','  window.selectOwnerLanguage ='],[portal,'openLanguageModal','  window.selectAppLanguage =']]) {
      bind(source,name,end,lang);
      window[name]();
      expected[lang].forEach(label => assert.ok(root.innerHTML.includes(label),`${name} ${lang}: ${label}`));
      assert.equal((root.innerHTML.match(/select(?:Customer|Owner|App)Language\('/g)||[]).length,6);
      assert.ok(root.innerHTML.includes(t('language',lang)));
      window.closeModal();
      assert.equal(root.innerHTML,'');
    }
    applyDocumentLanguage(lang);
    assert.equal(document.documentElement.dir,['ar','fa'].includes(lang)?'rtl':'ltr');
    assert.equal(document.documentElement.lang,lang);
  }
  for (const lang of ['fa','ar','tr','en','fa','tk','ru']) {
    applyDocumentLanguage(lang);
    assert.equal(document.documentElement.dir,['ar','fa'].includes(lang)?'rtl':'ltr');
  }
  assert.equal(t('language','tr'),'Dil');
  for (const key of Object.keys(DICTIONARY.tr)) assert.ok(DICTIONARY.fa[key],`Persian key: ${key}`);
  // Render the actual owner dashboard/profile templates with representative data.
  function ownerTemplate(start,end,lang,employee=false) {
    const block = owner.slice(owner.indexOf(start),owner.indexOf(end,owner.indexOf(start)));
    const begin = block.indexOf('mainHtml = `') + 'mainHtml = '.length;
    const template = block.slice(begin,block.lastIndexOf('`;') + 1);
    return Function('t','currentLang','bizRecord','isEmployee','displayName','isBookingOpen','dailyMetrics','pendingRequests','canViewCiro','todayRevenue','canCreateManualBooking','canManageSalon','initials','user','currentLangObj','escapeOwnerText','todayApts','appointmentHasEnded','getAptServiceName','ownerCustomers','hasOwnerRating','ownerRating','uiIcon',`return ${template}`)(t,lang,{name:'Example Salon'},employee,'Example User',true,{appointmentCount:2,completedCount:1},[],true,100,true,!employee,'EU',{phone:'123'},SUPPORTED_LANGUAGES.find(l=>l.code===lang),String,[{status:'approved',time:'14:00',customerName:'Example',serviceName:'Haircut'}],()=>false,a=>a.serviceName,[],true,4.8,()=>'<svg></svg>');
  }
  for (const employee of [false,true]) {
    const profile = ownerTemplate("else if (activeOwnerTab === 'profile')",'  // WORKSPACE VIEW OVERRIDES','fa',employee);
    assert.doesNotMatch(profile,/Ad, Telefon|Ad ve Telefon|Yönet|Kategori/);
    assert.ok(profile.includes('مدیریت'));
    const dashboard = ownerTemplate("if (activeOwnerTab === 'dashboard')",'  // 2. ADVANCED','fa',employee);
    assert.doesNotMatch(dashboard,/Patron Paneli|Çalışan Paneli|Randevuları Aç|Bekleyenleri Gör|Tamamlananlar|Ciro Detayı|Hızlı İşlemler|Online Randevu|Müşteriler online|Randevuyu Kapat/);
    assert.ok(dashboard.includes(employee?'پنل کارمند':'پنل مالک'));
  }
  console.log('LANGUAGE/CUSTOMER/OWNER REGRESSION: PASS (six locales, real modal handlers, owner templates, RTL transitions)');
})().catch(error => {console.error(error);process.exitCode=1;});
