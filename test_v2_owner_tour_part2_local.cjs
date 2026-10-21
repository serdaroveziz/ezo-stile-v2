const assert = require('node:assert/strict');
const fs = require('node:fs');

(async () => {
const owner = fs.readFileSync('src/ui/owner.js', 'utf8');
const ownerLocales = fs.readFileSync('src/locales/owner.js', 'utf8');
  const css = fs.readFileSync('src/styles/app.css', 'utf8');
  const updateProfile = fs.readFileSync('server/handlers/salon/update-profile.js', 'utf8');
  const publicBusiness = fs.readFileSync('server/public-business.js', 'utf8');

  const summarySource = owner.match(/export function calculateStaffAppointmentSummary\(appointments\) \{[\s\S]*?\n\}/);
  assert.ok(summarySource);
  const summarize = Function(`return (${summarySource[0].replace('export ', '')})`)();
  assert.deepEqual(summarize([{status:'completed'},{status:'no_show'},{status:'cancelled'},{status:'rejected'},{status:'pending'}]), { total:5, completed:1, noShow:1, cancelled:2, pending:1 });

  assert.match(owner, /ownerStaffAccordionOpen/);
  assert.match(owner, /toggleOwnerStaffAccordion/);
  assert.match(owner, /dateScopedAppointments/);
  assert.match(owner, /calculateStaffAppointmentSummary\(dateScopedAppointments\)/);
  assert.match(owner, /owner-category-grid/);
  assert.match(owner, /ownerRevenueDetailsExpanded/);
  assert.match(owner, /toggleOwnerRevenueDetails/);
  assert.match(owner, /status === 'completed'/);
  assert.match(owner, /Europe\/Istanbul/);

  assert.match(updateProfile, /profile\.role !== 'owner'/);
  assert.match(updateProfile, /business\.ownerUid === uid/);
  assert.match(updateProfile, /neighborhood/);
  assert.match(updateProfile, /Salon adı, telefon ve açık adres zorunludur/);
  assert.ok(updateProfile.includes('data:image\\/(?:jpeg|png|webp)'));
  assert.match(owner, /navigator\.geolocation\.getCurrentPosition/);
  assert.match(owner, /onclick="window\.useOwnerCurrentLocation\(\)"/);
  assert.match(ownerLocales, /\['Mevcut Konumumu Kullan','Use My Current Location'/);
  assert.match(owner, /adjustCropPosition/);

  const { buildPublicBusiness, PUBLIC_BUSINESS_FORBIDDEN_FIELDS } = await import('./server/public-business.js');
  const source = { status:'active', discoveryEnabled:true, name:'Salon', ownerUid:'secret-owner', subscription:{plan:'PREMIUM'}, permissions:['x'], phone:'05550000000', latitude:'', longitude:'', neighborhood:'Merkez' };
  const projection = buildPublicBusiness('biz_test', source);
  for (const key of PUBLIC_BUSINESS_FORBIDDEN_FIELDS) assert.equal(Object.prototype.hasOwnProperty.call(projection, key), false, `private field leaked: ${key}`);
  assert.equal(projection.latitude, undefined);
  assert.equal(projection.longitude, undefined);
  const zeroProjection = buildPublicBusiness('biz_test', {...source,latitude:0,longitude:0});
  assert.equal(zeroProjection.latitude, undefined);
  assert.equal(zeroProjection.longitude, undefined);
  assert.equal(projection.neighborhood, 'Merkez');

  const { validCoordinate } = await import('./server/handlers/salon/update-profile.js');
  assert.equal(validCoordinate('', -90, 90), true);
  assert.equal(validCoordinate(true, -90, 90), false);
  assert.equal(validCoordinate('91', -90, 90), false);
  assert.equal(validCoordinate('41.01', -90, 90), true);

  assert.match(css, /owner-modal-header\{position:sticky/);
  assert.match(css, /owner-category-grid\{display:grid/);
  assert.match(css, /owner-crop-position/);
  console.log('OWNER TOUR PART 2 LOCAL: PASS');
})().catch(error => { console.error(error); process.exitCode = 1; });
