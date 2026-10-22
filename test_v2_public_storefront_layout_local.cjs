const assert = require('assert');
const fs = require('fs');

const customer = fs.readFileSync('src/ui/customer.js', 'utf8');
const shared = fs.readFileSync('src/ui/salon-detail-shared.js', 'utf8');
const css = fs.readFileSync('src/styles/app.css', 'utf8');

assert(customer.includes('class="public-storefront-page animate-fade"'), 'public storefront needs a real page wrapper');
assert(customer.includes('class="public-storefront-content"'), 'storefront content needs a centered page container');
assert(!customer.includes("publicStorefront ? `<a class=\"icon-button\""), 'public storefront must not render the large close X');
assert(customer.includes("mode: 'public'"), 'public route must use the shared public detail surface');
assert(customer.includes("state.mode === 'public'"), 'public mode must render into the application page, not a modal');
assert(css.includes('.public-storefront-mode{display:block;padding:0'), 'storefront must use natural body layout');
assert(css.includes('.public-storefront-page{width:100%;min-height:100dvh'), 'storefront must be a full page');
assert(!css.includes('.public-storefront-overlay{position:fixed'), 'storefront must not use a fixed modal overlay');
assert(!css.includes('.public-storefront-card{'), 'storefront must not use a modal card frame');
assert(customer.includes('class="btn btn-secondary public-service-book"'), 'service rows need compact booking actions');
assert(css.includes('bottom:max(10px,env(safe-area-inset-bottom))'), 'mobile CTA must respect the safe area');
assert(css.includes('@media(min-width:800px)') && css.includes('position:static;transform:none'), 'desktop CTA must return to document flow');
assert(!shared.includes('class="bottom-nav"'), 'public storefront template must not add customer bottom navigation');
assert(shared.includes("SALON_DETAIL_SECTIONS") && shared.includes("renderSalonDetailTabs"), 'detail sections must be shared and selected on demand');
assert(customer.includes("state.activeSection === 'reviews' && state.reviews === null"), 'reviews must load only after the Reviews section is selected');
assert(shared.includes('loading="lazy"'), 'gallery images must stay lazy');

console.log('PUBLIC STOREFRONT LAYOUT LOCAL: PASS');
