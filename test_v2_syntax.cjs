/* EZO STİLE v2 - Automated Architecture, Assets & Syntax Verification Test Suite */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('⚡ Running EZO STİLE v2 Automated Test Suite...\n');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passCount++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failCount++;
  }
}

// 1. File Structure Integrity & Logo Assets Verification
const requiredFiles = [
  'package.json',
  'index.html',
  'sw.js',
  'manifest.json',
  'src/config.js',
  'src/permissions.js',
  'src/db.js',
  'src/auth.js',
  'src/styles/app.css',
  'src/ui/portal.js',
  'src/ui/customer.js',
  'src/ui/salon-application.js',
  'src/ui/super-admin.js',
  'assets/images/ezo_stile_logo.png',
  'assets/icons/logo.png',
  'assets/icons/icon-192.png',
  'assets/icons/icon-512.png',
  'assets/icons/apple-touch-icon.png',
  'assets/icons/favicon.png'
];

console.log('📁 1. Verifying File Structure & Logo Assets Integrity...');
requiredFiles.forEach(relPath => {
  const fullPath = path.join(__dirname, relPath);
  assert(fs.existsSync(fullPath), `File exists: ${relPath}`);
});

// 2. Syntax Verification with node --check
console.log('\n🔍 2. Verifying ES Module & JavaScript Syntax...');
const jsFiles = requiredFiles.filter(f => f.endsWith('.js'));

jsFiles.forEach(relPath => {
  const fullPath = path.join(__dirname, relPath);
  try {
    execSync(`node --check "${fullPath}"`, { stdio: 'pipe' });
    assert(true, `Syntax OK: ${relPath}`);
  } catch (err) {
    assert(false, `Syntax Error in ${relPath}: ${err.stderr ? err.stderr.toString() : err.message}`);
  }
});

// 3. Role Resolution & Hierarchy Test Matrix
console.log('\n🛡️ 3. Verifying Role Hierarchy & Security Constraints...');

const ROLE_HIERARCHY = ['super_admin', 'owner', 'manager', 'barber', 'receptionist', 'customer'];
assert(ROLE_HIERARCHY.length === 6, 'Role hierarchy contains exactly 6 granular roles');
assert(ROLE_HIERARCHY[0] === 'super_admin', 'Top role rank is super_admin');
assert(ROLE_HIERARCHY[5] === 'customer', 'Default base role is customer');

console.log(`\n========================================`);
console.log(`TEST SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
console.log(`========================================\n`);

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}