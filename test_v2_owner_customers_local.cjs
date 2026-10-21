const assert = require('node:assert/strict');
const fs = require('node:fs');
(async () => {
  const {buildOwnerCustomers,filterOwnerCustomers} = await import('./src/ui/owner-customers.js');
  const base = {businessId:'biz_a',customerUid:'u1',customerName:'İpek',customerPhone:'+90 555 123 45 67',date:'2026-09-01',status:'completed'};
  const rows = [
    {...base,aptId:'a'}, {...base,aptId:'a'},
    {...base,aptId:'b',date:'2026-10-01',status:'approved'},
    {...base,aptId:'c',businessId:'biz_b',customerName:'SECRET'},
    {...base,aptId:'d',customerUid:'u2'}, {...base,aptId:'e',customerUid:null},
    {...base,aptId:'f',customerUid:null}, null, {...base,aptId:'g',businessId:null}
  ];
  const customers = buildOwnerCustomers(rows,'biz_a','2026-09-11');
  assert.equal(customers.length,4);
  assert.equal(customers[0].count,2);
  assert.equal(customers[0].completed,1);
  assert.equal(customers[0].lastDate,'2026-09-01');
  assert.ok(!JSON.stringify(customers).includes('SECRET'));
  assert.equal(filterOwnerCustomers(customers,'ipek').length,4);
  assert.equal(filterOwnerCustomers(customers,'555123').length,4);
  assert.equal(filterOwnerCustomers(customers,'absent').length,0);
  assert.deepEqual(buildOwnerCustomers(rows,'','2026-09-11'),[]);
  assert.equal(buildOwnerCustomers([{...base,aptId:'future',date:'2099-01-01'}],'biz_a','2026-09-11')[0].lastDate,'');
  const {ownerMessages}=await import('./src/locales/owner.js');
  for(const key of ['ownerCustomersTitle','ownerCustomersSearch','ownerCustomersScope','ownerCustomerLast','ownerCustomerCompleted','ownerCustomersNoMatch','ownerCustomersEmpty','ownerAverageRating','ownerServiceRevenue','ownerReviewsLoading','ownerReviewsUnavailable','ownerRevenueByDate','ownerLoadedReviewsFilter','ownerReviewsAll'])
    for(const lang of ['tr','en','ru','ar','tk','fa']) assert.ok(ownerMessages[key][lang]);
  const owner=fs.readFileSync('src/ui/owner.js','utf8');
  assert.match(owner,/ownerSessionValid/);
  assert.match(owner,/filter\(appointment => appointment && appointment.businessId === businessId\)/);
  const revenueSource = owner.match(/function renderOwnerServiceRevenue\(appointments\) \{[\s\S]*?\n\}/)[0];
  const renderRevenue = Function('getAptServiceName','getAptPrice','t','escapeOwnerText','formatMoney', 'return ('+revenueSource+')')(a=>a.serviceName,a=>a.price,key=>key,String,String);
  const revenueHtml = renderRevenue([{status:'completed',date:'2026-09-12',serviceName:'Hair',price:250},{status:'completed',date:'2026-09-12',serviceName:'Hair',price:100},{status:'cancelled',date:'2026-09-12',serviceName:'Cancelled',price:900}]);
  assert.ok(revenueHtml.includes('350'));
  assert.ok(!revenueHtml.includes('900'));
  assert.ok(!revenueHtml.includes('Cancelled'));
  assert.ok(revenueHtml.includes('owner-chart-column'));
  assert.match(owner,/ownerManagementView === 'customers'/);
  assert.match(owner,/escapeOwnerText\(customer.phone\)/);
  assert.match(owner,/escapeOwnerText\(name\)/);
  assert.doesNotMatch(fs.readFileSync('src/ui/owner-customers.js','utf8'),/\bfetch\s*\(/);
  console.log('OWNER CUSTOMERS: tenant, identity, deduplication, future dates, search and 6 languages PASS');
})().catch(error=>{console.error(error);process.exitCode=1});
