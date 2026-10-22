const assert = require('assert');
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync('index.html', 'utf8');
const vercel = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
const origin = 'https://preview.example';

assert.match(html, /<base\s+href=["']\/["']\s*\/?>/i, 'app assets need a root URL base');
assert(html.includes('id="app-container"'), 'root route must serve the app shell');
assert(html.includes("window.__EZO_STAGE__ = 'MAIN_MODULE_LOADING'"), 'root boot contract must remain present');

// A query string makes the browser load a second, separate instance of the same ES
// module. auth.js keeps the session in module state, so index.html restoring into
// './src/auth.js?v=x' while ui/*.js read './auth.js' left the app on "Yükleniyor…" after F5.
const versionedModules = html.match(/['"]\.\/src\/[^'"]+\.js\?[^'"]*['"]/g) || [];
assert.deepStrictEqual(versionedModules, [], 'index.html module imports must not carry query strings (duplicate module instances)');

const relativeAssetPaths = [
  './src/styles/app.css',
  './src/auth.js',
  './assets/images/ezo_stile_logo.png',
  './sw.js?v=2.3.3-staff-analytics'
];

for (const route of ['/', '/salon/test-slug']) {
  const documentBase = new URL('/', new URL(route, origin));
  for (const asset of relativeAssetPaths) {
    const resolved = new URL(asset, documentBase);
    assert(!resolved.pathname.startsWith('/salon/'), `${route}: asset must not resolve below /salon`);
  }
}

for (const asset of relativeAssetPaths) {
  const pathname = new URL(asset, `${origin}/`).pathname.slice(1);
  assert(fs.existsSync(path.join(process.cwd(), pathname)), `missing boot asset: ${pathname}`);
}

const salonRewrite = vercel.rewrites.find(rule => rule.source === '/salon/:slug');
assert.deepStrictEqual(salonRewrite, { source: '/salon/:slug', destination: '/' }, 'direct salon route must serve app HTML');
assert(vercel.rewrites.some(rule => rule.source === '/api/(.*)' && rule.destination.startsWith('/api/index')), '/api routes must stay on the serverless router');
assert(!vercel.rewrites.some(rule => ['/((.*))', '/(.*)', '/:path*'].includes(rule.source)), 'static assets and APIs must not be caught by a SPA catch-all');

console.log('BOOT ROUTING LOCAL: PASS');
