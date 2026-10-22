const assert = require('assert');
const fs = require('fs');

(async () => {
  const projection = await import('./server/public-business.js');
  const profileHandler = await import('./server/handlers/salon/update-profile.js');
  const customer = fs.readFileSync('src/ui/customer.js','utf8');
  const shared = fs.readFileSync('src/ui/salon-detail-shared.js','utf8');
  const owner = fs.readFileSync('src/ui/owner.js','utf8');
  const update = fs.readFileSync('server/handlers/salon/update-profile.js','utf8');
  const reviews = fs.readFileSync('server/handlers/reviews/public-list.js','utf8');
  const api = fs.readFileSync('api/index.js','utf8');
  const source = {
    status:'active', discoveryEnabled:true, ownerUid:'private-owner', plan:'PREMIUM', subscription:{secret:true}, permissions:['owner'], revenue:999,
    name:'Salon', category:'Berber', publicDescription:'Açıklama', address:'Adres', city:'İstanbul', district:'Şişli', latitude:41.1, longitude:29.1, ratingCount:7,
    media:{ profileImageUrl:'data:image/png;base64,QUJD', coverImageUrl:'data:image/jpeg;base64,QUJD', gallery:['data:image/webp;base64,QUJD','data:image/svg+xml;base64,PHNjcmlwdD4='] },
    socials:{ website:{active:true,value:'https://example.com'}, instagram:{active:true,value:'javascript:alert(1)'}, whatsapp:{active:true,value:'+905551112233'} },
    staff:{ a:{id:'a',userId:'private-uid',displayName:'Ata',permissions:['finance.view'],phone:'+905551112233',active:true,services:['all']} }
  };
  const result = projection.buildPublicBusiness('biz_test',source);
  for (const field of ['ownerUid','plan','subscription','permissions','revenue']) assert.equal(result[field],undefined,`${field} leaked`);
  assert.deepEqual(Object.keys(result.staff.a).sort(),['active','displayName','id','name','services'].sort());
  assert.equal(result.socials.instagram,undefined);
  assert.equal(result.socials.website,'https://example.com/');
  assert.equal(result.media.gallery.length,1);
  assert.equal(result.latitude,41.1); assert.equal(result.longitude,29.1);
  assert.equal(result.reviewCount,7);
  const invalidCoordinates = projection.buildPublicBusiness('biz_bad_coordinates',{...source,latitude:91,longitude:-181});
  assert.equal(invalidCoordinates.latitude,undefined); assert.equal(invalidCoordinates.longitude,undefined);
  assert.equal(profileHandler.isVerifiedBusinessOwner({role:'owner',businessId:'biz_a'},{ownerUid:'owner-a'},'owner-a'),true);
  assert.equal(profileHandler.isVerifiedBusinessOwner({role:'owner',businessId:'biz_a'},{ownerUid:'owner-b'},'owner-a'),false);
  assert.match(update,/profile\.businessId/);
  assert.ok(update.includes('data:image\\/(?:jpeg|png|webp)'));
  assert.match(owner,/api\/salon\/update-profile/);
  assert.match(owner,/saveOwnerSalonContact[\s\S]*api\/salon\/update-profile/);
  assert.match(owner,/api\/salon\/update-profile[\s\S]*invalidateDbCache\('businesses'\)/);
  assert.match(update,/hasOwnProperty\.call\(body, key\)/);
  assert.match(customer,/api\/reviews\/public-list/);
  const renderStart = customer.indexOf('export async function renderCustomerScreen');
  const detailHandler = customer.indexOf('window.openSalonDetailsModal');
  const renderClose = customer.lastIndexOf('\n}');
  assert.ok(renderStart >= 0 && detailHandler > renderStart && detailHandler < renderClose, 'Salon detail handler render scope içinde olmalı');
  assert.doesNotMatch(customer,/averageRating \|\| '4\.9'/);
  assert.match(customer,/google\.com\/maps\/dir\/\?api=1&destination=\$\{encodedDestination\}&travelmode=driving/);
  assert.match(shared,/instagram:\['Instagram','instagram'\]/);
  assert.match(shared,/whatsapp:\['WhatsApp','whatsapp'\]/);
  assert.match(shared,/tiktok:\['TikTok','music'\]/);
  assert.match(shared,/website:\[t\('uiRemaining_300'\),'globe'\]/);
  assert.match(shared,/text\(review\.comment, escape\)/);
  const publicReviewMapper = reviews.match(/\.map\(item => \(\{[\s\S]*?\}\)\);/)[0];
  assert.doesNotMatch(publicReviewMapper,/customerUid:/);
  assert.doesNotMatch(publicReviewMapper,/appointmentId:/);
  assert.match(api,/'salon\/update-profile': salonUpdateProfile/);
  assert.match(api,/'reviews\/public-list': reviewsPublicList/);
  const rules = JSON.parse(fs.readFileSync('database.rules.json','utf8')).rules;
  // Public reviews use the masked API projection. Raw collection access is
  // reserved for active super-admins; an active customer can read their own key.
  const activeUser = "auth != null && root.child('users').child(auth.uid).exists() && root.child('users').child(auth.uid).child('disabled').val() !== true && root.child('users').child(auth.uid).child('status').val() !== 'disabled'";
  const superAdmin = "root.child('users').child(auth.uid).child('role').val() === 'super_admin'";
  assert.strictEqual(rules['.read'], false, 'Root must not bypass review read restrictions');
  assert.strictEqual(rules.reviews['.read'], `${activeUser} && ${superAdmin}`);
  assert.strictEqual(rules.reviews.$reviewId['.read'], `${activeUser} && (data.child('customerUid').val() === auth.uid || ${superAdmin})`);
  assert.strictEqual(rules['.write'], false);
  assert.strictEqual(rules.reviews['.write'], undefined);
  assert.strictEqual(rules.reviews.$reviewId['.write'], false, 'Review writes must go through the verified booking API');
  const html = fs.readFileSync('index.html','utf8');
  assert.match(html,/document\.readyState === 'loading'[\s\S]*initApp\(\)/);
  console.log('SALON PROFILE DETAIL LOCAL: PASS (projection, socials, API routing and least-privilege review Rules contract)');
})().catch(error=>{console.error(error);process.exit(1)});
