export function normalizeTurkishInvitePhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  let national = digits;
  if (national.startsWith('90') && national.length === 12) national = national.slice(2);
  if (national.startsWith('0') && national.length === 11) national = national.slice(1);
  if (!/^5\d{9}$/.test(national)) throw new Error('Geçerli bir Türkiye cep telefonu numarası giriniz.');
  return `+90${national}`;
}

export function buildStaffInviteMessage(inviteCode) {
  return `UNELIVO salon ekibine davet edildiniz. Davet kodunuz: ${String(inviteCode || '').trim()}. Kod 24 saat geçerlidir.`;
}

export function buildStaffInviteShareLinks(phone, inviteCode) {
  const normalizedPhone = normalizeTurkishInvitePhone(phone);
  const message = buildStaffInviteMessage(inviteCode);
  const internationalDigits = normalizedPhone.slice(1);
  return {
    phone: normalizedPhone,
    message,
    whatsappUrl: `https://wa.me/${internationalDigits}?text=${encodeURIComponent(message)}`,
    smsUrl: `sms:${normalizedPhone}?body=${encodeURIComponent(message)}`
  };
}
