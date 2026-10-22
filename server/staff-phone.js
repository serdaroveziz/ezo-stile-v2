export function normalizeStaffPhone(value) {
  let digits = String(value == null ? '' : value).replace(/\D/g, '');
  if (digits.startsWith('90') && digits.length === 12) digits = digits.slice(2);
  if (digits.startsWith('0') && digits.length === 11) digits = digits.slice(1);
  if (!/^5\d{9}$/.test(digits)) return '';
  return digits;
}

export function canonicalStaffPhone(value) {
  const normalized = normalizeStaffPhone(value);
  return normalized ? `+90${normalized}` : '';
}

export function staffPhoneIndexPath(value) {
  const normalized = normalizeStaffPhone(value);
  return normalized ? `staff_phone_index/${normalized}` : '';
}

export function isValidPendingInvite(invite, now = Date.now()) {
  return Boolean(invite && invite.used !== true && invite.status === 'pending' && Number(invite.expiresAt || 0) > now);
}

export function staffPhoneOf(record) {
  return normalizeStaffPhone(record && (record.phoneNormalized || record.phone));
}

export async function claimStaffPhone(indexRef, reservation) {
  return indexRef.transaction(current => current ? undefined : reservation);
}

export async function releaseStaffPhone(indexRef, predicate) {
  return indexRef.transaction(current => current && predicate(current) ? null : current);
}

export async function reservePhoneAndWriteInvite({indexRef,inviteRef,reservation,invite}){
  const claim=await claimStaffPhone(indexRef,reservation);
  if(!claim.committed)return{committed:false};
  try{await inviteRef.set(invite);return{committed:true};}
  catch(error){await releaseStaffPhone(indexRef,current=>current.inviteId===reservation.inviteId&&current.businessId===reservation.businessId);throw error;}
}
