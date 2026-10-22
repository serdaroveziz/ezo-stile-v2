const assert = require('assert');
const fs = require('fs');

const source = fs.readFileSync('src/ui/customer.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');
const start = source.indexOf('export async function renderPublicSalonRoute');
assert(start >= 0, 'public route renderer must exist');
const routeSource = source.slice(start);

assert(!routeSource.includes('renderCustomerScreen('), 'public route must never mount the customer shell');
assert(!routeSource.includes("activeCustomerTab = 'home'"), 'public route must not select customer home');
assert(routeSource.includes('renderPublicStorefrontDirect(business)'), 'resolved public business must render directly');
assert(routeSource.includes('public-storefront-loading'), 'fetch delay must show only public loading state');
assert(routeSource.includes('public-storefront-state'), 'invalid and failed requests need a public full-page state');
assert(!routeSource.includes('bottom-nav'), 'public route must not contain customer navigation');
assert(!routeSource.includes("displayName:'Misafir'" ) || !routeSource.includes('renderCustomerScreen'), 'guest identity must never be rendered through customer home');
assert(index.includes("if (publicSalonMatch)"), 'direct salon path must branch before normal portal rendering');
assert(index.indexOf('if (publicSalonMatch)') < index.indexOf('if (!user)'), 'public branch must precede root app routing');
assert(index.includes("beginNewBookingFromSalonById(pendingBusinessId, pendingServiceId)"), 'post-login booking context must remain intact');

console.log('PUBLIC STOREFRONT ROUTE ISOLATION LOCAL: PASS');
