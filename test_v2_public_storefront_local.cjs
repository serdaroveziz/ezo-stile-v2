const assert = require('assert');
const fs = require('fs');

const customer = fs.readFileSync('src/ui/customer.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('src/styles/app.css', 'utf8');
(async () => {
  assert(customer.includes("document.body.classList.add('public-storefront-mode')"), 'public route must enter storefront mode before fetching');
  assert(customer.includes('public-storefront-loading'), 'customer landing must be replaced by a public loading state');
  assert(customer.includes('renderPublicStorefrontDirect(business)'), 'public route must use the direct storefront renderer');
  assert(customer.includes("sessionStorage.setItem('ezo_pending_public_booking_service'"), 'service context must be saved for auth');
  assert(index.includes("beginNewBookingFromSalonById(pendingBusinessId, pendingServiceId)"), 'auth completion must restore salon and service');
  assert(customer.includes("window.openCustomerAuthModal()"), 'anonymous booking must open the existing customer login modal');
  assert(customer.includes("biz.bookingEnabled !== false"), 'booking-disabled storefront must suppress service booking actions');
  assert(customer.includes("business.status !== 'active' || business.discoveryEnabled !== true"), 'non-public salons must remain unavailable');
  assert(css.includes('.public-storefront-mode #app-container{display:block;max-width:none'), 'storefront must use the app container as a full page');
  assert(customer.includes("const container = document.getElementById('app-container')"), 'public storefront must render into the page, not modal root');
  const { buildPublicBusiness } = await import('./server/public-business.js');
  const projection = buildPublicBusiness('biz_safe', { name:'Safe', status:'active', discoveryEnabled:true, ownerUid:'secret', subscription:{}, planStatus:'paid', staffLimit:99, permissions:['all'], revenue:100, internalNotes:'private' });
  for (const forbidden of ['ownerUid','subscription','planStatus','staffLimit','permissions','revenue','internalNotes']) assert(!(forbidden in projection), `${forbidden} must not enter public projection`);
  assert(index.includes("window.location.pathname.match(/^\\/salon\\/"), 'salon direct route must remain explicit');
  assert(index.includes('<base href="/">'), 'root asset base must remain intact');
  console.log('PUBLIC STOREFRONT LOCAL: PASS');
})().catch(error => { console.error(error); process.exit(1); });
