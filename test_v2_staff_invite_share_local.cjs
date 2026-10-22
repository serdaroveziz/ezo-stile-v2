const assert = require('node:assert/strict');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');

(async () => {
  const share = await import(pathToFileURL(require('node:path').resolve('src/staff-invite-share.js')).href);
  const links = share.buildStaffInviteShareLinks('(0553) 876-25-88', 'inv_test_123');
  const expectedMessage = 'EZO STİLE salon ekibine davet edildiniz. Davet kodunuz: inv_test_123. Kod 24 saat geçerlidir.';
  assert.equal(links.phone, '+905538762588', 'invite phone +90 formatında korunmalı');
  assert.equal(links.message, expectedMessage, 'hazır mesaj birebir olmalı');
  assert.equal(links.whatsappUrl, `https://wa.me/905538762588?text=${encodeURIComponent(expectedMessage)}`, 'WhatsApp URL doğru olmalı');
  assert.equal(links.smsUrl, `sms:+905538762588?body=${encodeURIComponent(expectedMessage)}`, 'SMS URL doğru olmalı');
  assert.throws(() => share.normalizeTurkishInvitePhone('123'), /Geçerli bir Türkiye/, 'geçersiz telefon anlaşılır hata vermeli');

  const owner = fs.readFileSync('src/ui/owner.js', 'utf8');
  const create = fs.readFileSync('server/handlers/staff/create-invite.js', 'utf8');
  const accept = fs.readFileSync('server/handlers/staff/accept-invite.js', 'utf8');
  const list = fs.readFileSync('server/handlers/staff/list-invites.js', 'utf8');
  const index = fs.readFileSync('index.html', 'utf8');

  assert.match(create, /phone:canonicalStaffPhone\(phoneNormalized\)/, 'backend normalize edilmiş telefonu davette saklamalı');
  assert.match(create, /status:'pending'/, 'yeni davet pending olmalı');
  assert.match(owner, /WhatsApp ile Gönder/);
  assert.match(owner, /SMS ile Gönder/);
  assert.match(owner, /Şimdi Değil \/ Kapat/);
  const shareMarkup = owner.slice(owner.indexOf('const share = buildStaffInviteShareLinks'), owner.indexOf('window.copyStaffInviteCode'));
  assert.doesNotMatch(shareMarkup, /saveRecord|authenticatedFetch/, 'paylaşım eylemi davet state değiştirmemeli');
  assert.match(accept, /status: 'accepted'|status:'accepted'/, 'kabul claim aşaması accepted olmalı');
  assert.match(accept, /businesses\/\$\{invite\.businessId\}\/staff\/\$\{staffId\}/, 'staff kaydı business altında bağlanmalı');
  assert.match(accept, /active: true/, 'kabul edilen çalışan aktif olmalı');
  assert.match(accept, /alreadyAccepted: isAccepted\(invite\)/, 'aynı kullanıcı kabulü idempotent olmalı');
  assert.match(accept, /reconciled: true/, 'yarım kabul staff/profile reconciliation yapmalı');
  assert.match(list, /isValidPendingInvite/, 'bekleyen listeden accepted davet çıkmalı');
  assert.match(owner, /Bekleyen Davetler/);
  assert.match(owner, /Aktif Çalışanlar/);
  assert.match(owner, /_unsubscribeOwnerStaffRealtime/, 'staff listesi realtime yenilenmeli');
  assert.match(index, /routeForResolvedRole\(user\.role\)/, 'backend staff rolü routing kaynağı olmalı');
  assert.match(index, /resolvedRoute === 'staff'[\s\S]*renderStaffScreen\(user/, 'barber ayrı çalışan paneline route edilmeli');

  console.log('STAFF INVITE SHARE LOCAL: 18/18 kontrol geçti');
})().catch(error => { console.error(error); process.exit(1); });
