const assert = require('node:assert/strict');
const fs = require('node:fs');

(async () => {
  const customer = fs.readFileSync('src/ui/customer.js', 'utf8');
  const css = fs.readFileSync('src/styles/app.css', 'utf8');
  const reviewApi = fs.readFileSync('server/handlers/reviews/submit.js', 'utf8');
  const publicReviews = fs.readFileSync('server/handlers/reviews/public-list.js', 'utf8');

  assert.match(customer, /\$\{showWelcome \? `<div id="customer-welcome-hero"[\s\S]*?<\/div>` : ''\}\s*<!-- CLEAN MAIN ACTION BUTTONS -->/);
  assert.match(customer, /await renderCustomerScreen\(user, onTabChange\);/);
  assert.match(customer, /const visiblePastApts = pastAptsAll\.slice\(0, 5\);/);
  assert.match(customer, /Geçmiş<br><strong>\$\{visiblePastApts\.length\}/);

  assert.match(css, /salon-detail-sticky-header\{position:sticky/);
  assert.match(css, /salon-detail-cta\{position:sticky/);
  assert.match(customer, /openCustomerGallery/);
  assert.match(customer, /stepCustomerGallery/);
  assert.match(customer, /customerLightboxImages/);
  assert.match(customer, /beginNewBookingFromSalonById\('\$\{businessId\}'\)/);
  assert.match(customer, /!\(latitude === 0 && longitude === 0\)/);
  assert.match(customer, /instagram: \['Instagram', 'instagram'\]/);
  assert.match(customer, /scheduleOrder = \['monday','tuesday','wednesday','thursday','friday','saturday','sunday'\]/);

  assert.match(reviewApi, /req\.auth && req\.auth\.uid/);
  assert.match(reviewApi, /db\.ref\('reviews'\)\.transaction/);
  assert.match(reviewApi, /48 \* 60 \* 60 \* 1000/);
  assert.match(publicReviews, /status === 'completed'/);
  assert.match(publicReviews, /reviewEligibility/);

  const { validateReviewMutation } = await import('./server/handlers/reviews/submit.js');
  const now = Date.parse('2026-09-05T12:00:00.000Z');
  const completed = { customerUid:'customer-a', status:'completed' };
  assert.equal(validateReviewMutation({ appointment:completed, uid:'customer-a', now }), 'create');
  assert.equal(validateReviewMutation({ appointment:{...completed,status:'approved'}, uid:'customer-a', now }), 'not_completed');
  assert.equal(validateReviewMutation({ appointment:completed, uid:'customer-b', now }), 'other_customer');
  assert.equal(validateReviewMutation({ appointment:completed, uid:'customer-a', existingReview:{customerUid:'customer-a',createdAt:'2026-09-04T12:01:00.000Z'}, now }), 'edit');
  assert.equal(validateReviewMutation({ appointment:completed, uid:'customer-a', existingReview:{customerUid:'customer-a',createdAt:'2026-09-03T11:59:00.000Z'}, now }), 'expired');

  console.log('customer tour part 2 local checks: PASS');
})().catch(error => { console.error(error); process.exitCode = 1; });
