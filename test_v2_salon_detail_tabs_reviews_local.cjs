const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

(async () => {
  const root = __dirname;
  const customer = fs.readFileSync(path.join(root, 'src/ui/customer.js'), 'utf8');
  const shared = fs.readFileSync(path.join(root, 'src/ui/salon-detail-shared.js'), 'utf8');
  const css = fs.readFileSync(path.join(root, 'src/styles/app.css'), 'utf8');
  const reviewList = fs.readFileSync(path.join(root, 'server/handlers/reviews/public-list.js'), 'utf8');
  const reviewSubmitSource = fs.readFileSync(path.join(root, 'server/handlers/reviews/submit.js'), 'utf8');
  const reviewSubmit = await import(pathToFileURL(path.join(root, 'server/handlers/reviews/submit.js')).href);

  assert.match(shared, /\['about', 'services', 'staff', 'gallery', 'hours', 'location', 'reviews'\]/, 'seven canonical salon sections remain available');
  assert.match(css, /\.salon-detail-surface \.salon-detail-tabs \{\s*display:flex;[\s\S]*overflow-x:auto/, 'mobile and tablet tabs use one horizontal row');
  assert.match(css, /@media\(min-width:1000px\)[\s\S]*\.salon-detail-surface \.salon-detail-tabs\{overflow:visible;flex-wrap:wrap;/, 'desktop may show all tabs without a horizontal scroller');
  assert.match(css, /\.salon-detail-tabs button\.is-active::after/, 'active tab has a visible accent underline');
  assert.match(customer, /activeTab\?\.scrollIntoView\(\{ block: 'nearest', inline: 'center'/, 'selected tab is brought into view without hijacking page scroll');

  assert.match(customer, /eligibleAppointments: Array\.isArray\(payload\.eligibleAppointments\)/, 'client consumes server-provided completed appointment options');
  assert.match(customer, /eligibility\.mode === 'create' && eligibility\.appointmentId \? \[\{ appointmentId: eligibility\.appointmentId \}\] : \[\]/, 'single eligible appointment response still opens the composer');
  assert.match(customer, /state\.selectedReviewAppointmentId \|\| \(eligibility && eligibility\.mode === 'create' \? eligibility\.appointmentId : null\)/, 'compatibility fallback submits the server-selected appointment');
  assert.match(customer, /class="salon-review-composer"/, 'eligible customer receives an inline composer');
  assert.match(customer, /window\.selectSharedReviewAppointment/, 'multiple completed appointments can be selected');
  assert.match(customer, /window\.setSharedReviewRating/, 'star rating state is handled inline');
  assert.match(customer, /businessId: state\.model\.businessId, appointmentId, rating, comment/, 'review submission binds the selected appointment to the displayed salon');
  assert.match(reviewList, /item\.status === 'completed'/, 'only completed appointments become review options');
  assert.match(reviewList, /item\.businessId === businessId && item\.customerUid === uid/, 'review options are restricted to the signed-in customer and salon');
  assert.match(reviewList, /appointmentId, date:appointment\.date/, 'review option payload is minimal and avoids private appointment data');
  assert.match(reviewSubmitSource, /requestedBusinessId && appointment\.businessId !== requestedBusinessId/, 'submit handler rejects cross-salon appointment binding');

  const appointment = { businessId:'biz_review', customerUid:'customer-a', status:'completed' };
  assert.equal(reviewSubmit.validateReviewMutation({ appointment, uid:'customer-a' }), 'create', 'own completed appointment can be reviewed');
  assert.equal(reviewSubmit.validateReviewMutation({ appointment, uid:'customer-b' }), 'other_customer', 'another customer cannot review it');
  assert.equal(reviewSubmit.validateReviewMutation({ appointment:{ ...appointment, status:'pending' }, uid:'customer-a' }), 'not_completed', 'pending appointment cannot be reviewed');
  assert.equal(reviewSubmit.validateReviewMutation({ appointment, uid:'customer-a', existingReview:{ customerUid:'customer-a', createdAt:new Date().toISOString() } }), 'edit', 'own review is editable for 48 hours');

  console.log('SALON DETAIL TABS + REVIEWS LOCAL: PASS');
})().catch(error => { console.error(error); process.exitCode = 1; });
