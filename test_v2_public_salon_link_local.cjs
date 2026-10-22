const assert = require('assert');
const fs = require('fs');

(async () => {
  const helpers = await import('./src/public-businesses.js');
  const server = await import('./server/public-business.js');
  assert.strictEqual(helpers.normalizePublicSalonSlug('Şeko Erkek Kuaförü'), 'seko-erkek-kuaforu');
  assert.strictEqual(helpers.normalizePublicSalonSlug('Älem  Ýeňiş'), 'alem-yenis');
  const first = helpers.createPublicSalonSlug('Aynı Salon', 'biz_one');
  const second = helpers.createPublicSalonSlug('Aynı Salon', 'biz_two');
  assert.notStrictEqual(first, second, 'aynı adlı salon slugları benzersiz olmalı');
  assert.strictEqual(first, helpers.createPublicSalonSlug('Aynı Salon', 'biz_one'), 'slug deterministik olmalı');
  assert.notStrictEqual(helpers.createPublicSalonSlug('Salon', 'biz_one', 'legacy'), helpers.createPublicSalonSlug('Salon', 'biz_two', 'legacy'), 'legacy duplicate slug business suffix ile ayrılmalı');

  const privateBusiness = {
    name:'Şeko Erkek Kuaförü', status:'active', discoveryEnabled:true, bookingEnabled:true,
    ownerUid:'secret-owner', subscription:{ plan:'PREMIUM' }, permissions:['finance.view'], revenue:999,
    services:{ cut:{ name:'Saç Kesimi', price:500, duration:45, active:true } }
  };
  const projection = server.buildPublicBusiness('biz_one', privateBusiness);
  assert(projection.publicSlug);
  for (const key of ['ownerUid','subscription','permissions','revenue']) assert(!(key in projection), `${key} public projeksiyona sızdı`);
  const records = { biz_one:projection };
  assert.strictEqual(helpers.resolvePublicBusinessBySlug(records, projection.publicSlug).businessId, 'biz_one');
  assert.strictEqual(helpers.resolvePublicBusinessBySlug(records, 'yanlis-link'), null);
  assert.strictEqual(helpers.publicSalonPath(projection.publicSlug), `/salon/${projection.publicSlug}`);

  const customer = fs.readFileSync('src/ui/customer.js','utf8');
  const owner = fs.readFileSync('src/ui/owner.js','utf8');
  const index = fs.readFileSync('index.html','utf8');
  const vercel = JSON.parse(fs.readFileSync('vercel.json','utf8'));
  assert(customer.includes("fetchRecord('public_businesses', true)"));
  assert(customer.includes('resolvePublicBusinessBySlug(records, slug)'));
  assert(customer.includes("sessionStorage.setItem('ezo_pending_public_booking'"));
  assert(customer.includes("window.beginNewBookingFromSalonById('${businessId}')"), 'mevcut booking CTA korunmalı');
  assert(owner.includes('owner-public-salon-link') && owner.includes('copyOwnerSalonLink'));
  assert(index.includes('renderPublicSalonRoute') && index.includes('ezo_pending_public_booking'));
  assert(vercel.rewrites.some(rule => rule.source === '/salon/:slug' && rule.destination === '/'));
  console.log('PUBLIC SALON LINK LOCAL: PASS');
})().catch(error => { console.error(error); process.exit(1); });
