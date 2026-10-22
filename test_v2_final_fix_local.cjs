const assert = require('node:assert/strict');
const fs = require('node:fs');

const read = (path) => fs.readFileSync(path, 'utf8');
const customer = read('src/ui/customer.js');
const owner = read('src/ui/owner.js');
const superAdmin = read('src/ui/super-admin.js');
const db = read('src/db.js');
const auth = read('src/auth.js');
const index = read('index.html');
const api = read('api/index.js');
const list = read('server/handlers/booking/list.js');
const create = read('server/handlers/booking/create.js');
const reschedule = read('server/handlers/booking/reschedule-approve.js');
const roleRouting = read('src/role-routing.js');

const checks = [];
function check(name, fn) {
  fn();
  checks.push(name);
}

check('appointment node key korunuyor', () => {
  assert.match(list, /Object\.entries/);
  assert.match(list, /aptId:\s*nodeId/);
  assert.match(list, /appointmentId:\s*nodeId/);
});

check('reschedule merkezi availability kullanıyor ve serbest saat almıyor', () => {
  assert.match(customer, /\/api\/booking\/availability/);
  assert.match(customer, /selectCustomerRescheduleTime/);
  assert.doesNotMatch(customer, /id=["']resched-time["']/);
  assert.match(customer, /Randevuya 48 saatten az kaldığı için bu işlem işletme onayına gönderilecektir\./);
});

check('patron iptal ve değişiklik taleplerini ayrı görüyor', () => {
  assert.match(owner, /cancelRequestApts/);
  assert.match(owner, /rescheduleRequestApts/);
  assert.match(owner, /İptal Talepleri/);
  assert.match(owner, /Değişiklik Talepleri/);
  assert.match(owner, /reviewOwnerReschedule/);
  assert.match(owner, /updateAppointmentStatusOwner/);
});

check('WhatsApp SMS ve Şimdi Değil seçenekleri mevcut', () => {
  assert.match(customer, /WhatsApp/);
  assert.match(customer, /SMS/);
  assert.match(customer, /t\('notNow'/);
});

check('davet tekrar denemesi mevcut hesapla idempotent kabul akışına gider', () => {
  assert.match(auth, /auth\/email-already-in-use/);
  assert.match(auth, /signInWithEmailAndPassword/);
  assert.match(auth, /staff\/accept-invite/);
  assert.match(roleRouting, /barber/);
  assert.match(roleRouting, /receptionist/);
  assert.match(roleRouting, /manager/);
});

check('berber patrona özel manuel randevu işlemine erişemez', () => {
  assert.match(owner, /canCreateManualBooking/);
  assert.match(owner, /Bu işlem için randevu yönetme yetkiniz bulunmuyor/);
  assert.match(api, /\['super_admin', 'owner', 'manager', 'receptionist'\]/);
  assert.doesNotMatch(api, /\['super_admin', 'owner', 'manager', 'barber', 'receptionist'\]/);
});

check('super admin filtreleri kesin status değerleri kullanıyor', () => {
  assert.match(superAdmin, /\.status === 'active'/);
  assert.match(superAdmin, /\.status === 'suspended'/);
  assert.doesNotMatch(superAdmin, /isTechnicalSalonRecord/);
  assert.match(superAdmin, /Belirtilmemiş/);
});

check('Firebase SSE named eventleri dinleniyor ve cleanup var', () => {
  assert.match(db, /addEventListener\('put'/);
  assert.match(db, /addEventListener\('patch'/);
  assert.match(db, /es\.close\(\)/);
  assert.match(customer, /_unsubscribeCustomerPublicBusinesses/);
});

check('normal booking ve reschedule atomik transaction kullanıyor', () => {
  assert.match(create, /\.transaction\(/);
  assert.match(reschedule, /\.transaction\(/);
  assert.match(create, /intervalOverlapsAppointment/);
  assert.match(reschedule, /newStart < start \+/);
});

check('ciro yalnızca tamamlanan randevuları gelir kabul ediyor', () => {
  assert.match(owner, /status === 'completed'/);
  assert.match(owner, /status === 'cancelled'/);
  assert.match(owner, /status === 'rejected'/);
});

console.log(`FINAL FIX LOCAL: ${checks.length}/${checks.length} kontrol geçti`);
for (const name of checks) console.log(`PASS ${name}`);
