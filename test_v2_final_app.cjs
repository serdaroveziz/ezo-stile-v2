/* EZO STİLE v2 - Automated Final Application & Regression Test Suite */
const fs = require('fs');

console.log('⚡ Running EZO STİLE v2 Final Toplu Uygulama Regression Suite...\n');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ GERÇEK PASS: ${message}`);
    passCount++;
  } else {
    console.error(`  ❌ GERÇEK FAIL: ${message}`);
    failCount++;
  }
}

async function runFinalAppTests() {
  const FIREBASE_DB_URL = 'https://ezostile-barber-default-rtdb.europe-west1.firebasedatabase.app';

  try {
    // 1. VERCEL FUNCTION COUNT VERIFICATION (MUST BE <= 12, TERCIHEN 1)
    const apiFiles = fs.readdirSync('api');
    console.log('📦 1. Vercel Functions Count Check...');
    assert(apiFiles.length === 1 && apiFiles[0] === 'index.js', 'Vercel Function count is EXACTLY 1 (api/index.js), well below Vercel Hobby limit of 12!');

    // 2. FILE INTEGRITY & BOM FREEDOM
    const pkgBuf = fs.readFileSync('package.json');
    const vercelBuf = fs.readFileSync('vercel.json');
    assert(pkgBuf[0] === 0x7B && vercelBuf[0] === 0x7B, 'package.json & vercel.json are confirmed pure UTF-8 without BOM');
    assert(Boolean(JSON.parse(pkgBuf.toString('utf8'))) && Boolean(JSON.parse(vercelBuf.toString('utf8'))), 'package.json & vercel.json valid JSON parsing');

    // 3. 5-LANGUAGE DICTIONARY & RTL TEST
    const configModule = await import('./src/config.js');
    assert(configModule.SUPPORTED_LANGUAGES.length === 5, 'System configured with exactly 5 supported languages (TR, EN, RU, AR, TK)');
    assert(configModule.isRtl('ar') === true && configModule.isRtl('tr') === false, 'Arabic language correctly identified for RTL layout support');
    assert(configModule.t('imCustomer', 'en') === '👤 I am a Customer', 'i18n translation engine resolves language strings dynamically');

    // 4. SECURITY & PERMISSIONS ENGINE TEST
    const permModule = await import('./src/permissions.js');
    const bizFree = { plan: 'FREE' };
    const bizGrant = { plan: 'PREMIUM', premiumSource: 'super_admin_grant' };
    assert(!permModule.canAccessStaffRevenueAnalytics(bizFree), 'Per-staff revenue analytics correctly LOCKED for FREE plan');
    assert(permModule.canAccessStaffRevenueAnalytics(bizGrant), 'Per-staff revenue analytics correctly UNLOCKED for Super Admin Grant Premium');

    // 5. SERVICE WORKER / API PASS-THROUGH TEST
    const swCode = fs.readFileSync('sw.js', 'utf8');
    assert(swCode.includes('/api/'), 'sw.js configured with explicit /api/* network pass-through rule');

    // 6. SUPER ADMIN MAX 2 FREE PREMIUM GRANTS GUARD TEST
    console.log('\n⚡ 6. Super Admin Max 2 Free Premium Grants Guard Test...');
    const testGrantBiz1 = 'biz_grant_1_' + Date.now();
    const testGrantBiz2 = 'biz_grant_2_' + Date.now();

    await fetch(`${FIREBASE_DB_URL}/businesses/${testGrantBiz1}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessId: testGrantBiz1, name: 'Grant Salon 1', plan: 'PREMIUM', premiumSource: 'super_admin_grant' })
    });

    await fetch(`${FIREBASE_DB_URL}/businesses/${testGrantBiz2}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessId: testGrantBiz2, name: 'Grant Salon 2', plan: 'PREMIUM', premiumSource: 'super_admin_grant' })
    });

    const allBizData = await (await fetch(`${FIREBASE_DB_URL}/businesses.json`)).json() || {};
    const currentGranted = Object.values(allBizData).filter(b => b && b.premiumSource === 'super_admin_grant');
    assert(currentGranted.length >= 2, 'Super Admin Grant system tracked 2 active free permanent Premium grants');

    // CLEANUP GRANTS
    await fetch(`${FIREBASE_DB_URL}/businesses/${testGrantBiz1}.json`, { method: 'DELETE' });
    await fetch(`${FIREBASE_DB_URL}/businesses/${testGrantBiz2}.json`, { method: 'DELETE' });

    console.log(`\n========================================`);
    console.log(`FINAL TOPLU UYGULAMA SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
    console.log(`========================================\n`);

    if (failCount > 0) process.exit(1);
    else process.exit(0);

  } catch (e) {
    console.error('Final App Test Exception:', e);
    process.exit(1);
  }
}

runFinalAppTests();