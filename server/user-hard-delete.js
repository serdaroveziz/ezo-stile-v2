import { createHash } from 'node:crypto';

const JOBS = '_user_deletion_jobs';
const fail = (code, statusCode = 409) => Object.assign(new Error(code), { statusCode });
const validUid = value => typeof value === 'string' && value.length > 0 && value.length <= 128 && !/[.#$\[\]\/\u0000-\u001f\u007f]/.test(value);
const obj = value => value && typeof value === 'object';
const historyFields = {
  appointments: new Set(['appointmentId','aptId','businessId','serviceId','servicePriceSnapshot','servicePrice','durationMinutes','serviceDuration','date','time','startTime','endTime','status','completedAt','createdAt','updatedAt','source','isManual']),
  audit_logs: new Set(['logId','action','targetType','timestamp']),
  payments: new Set(['amount','currency','status','createdAt','updatedAt']),
  reviews: new Set(['businessId','rating','createdAt','updatedAt'])
};

function assertAllowed(root, actorUid, uid, authUser) {
  const actor = root.users?.[actorUid];
  if (!actor || actor.role !== 'super_admin' || actor.disabled || ['disabled','deleted'].includes(actor.status)) throw fail('ADMIN_REQUIRED', 403);
  if (actorUid === uid) throw fail('SELF_DELETE_DENIED', 403);
  if (root.users?.[uid]?.role === 'super_admin' || authUser?.customClaims?.role === 'super_admin' || authUser?.customClaims?.super_admin === true) throw fail('SUPER_ADMIN_DELETE_DENIED', 403);
  // Check actual ownership, not just the possibly stale user profile.
  if (Object.values(root.businesses || {}).some(b => b?.ownerUid === uid)) throw fail('OWNER_TRANSFER_REQUIRED');
}

function gatherContact(record, seeds) {
  if (!obj(record)) return;
  for (const [key, value] of Object.entries(record)) {
    if (typeof value === 'string' && /phone|email/i.test(key) && value.trim()) seeds.add(value.trim());
    else if (obj(value)) gatherContact(value, seeds);
  }
}

function variants(seeds) {
  const result = new Set();
  for (const value of seeds) {
    const raw = String(value).trim();
    if (!raw) continue;
    result.add(raw); result.add(raw.toLowerCase());
    if (/^[+\d\s()\-]+$/.test(raw)) {
      const digits = raw.replace(/\D/g, '');
      if (digits.length >= 10) {
        result.add(digits);
        const national = digits.replace(/^90(?=5\d{9}$)/, '').replace(/^0(?=5\d{9}$)/, '');
        if (/^5\d{9}$/.test(national)) for (const phone of [national, `0${national}`, `90${national}`, `+90${national}`]) result.add(phone);
      }
    }
  }
  for (const value of [...result]) {
    result.add(encodeURIComponent(value));
    result.add(value.replace(/[.#$\[\]\/]/g, '_'));
    result.add(Buffer.from(value).toString('base64url'));
    for (const algorithm of ['sha256','sha1','md5']) result.add(createHash(algorithm).update(value).digest('hex'));
  }
  return result;
}

function matches(value, identities) {
  if (typeof value !== 'string' && typeof value !== 'number') return false;
  const text = String(value);
  return identities.has(text) || identities.has(text.toLowerCase()) ||
    [...identities].some(identity => identity.length >= 6 && text.toLowerCase().includes(identity.toLowerCase())) ||
    (/[\d][\s()\-]+\d/.test(text) && identities.has(text.replace(/\D/g, '')));
}

function contains(value, identities) {
  return obj(value) ? Object.entries(value).some(([k,v]) => matches(k, identities) || contains(v, identities)) : matches(value, identities);
}

function deletionContext(root, uid, authUser, savedSeeds = []) {
  const seeds = new Set([uid, ...savedSeeds]);
  gatherContact(root.users?.[uid], seeds);
  gatherContact(authUser, seeds);
  const staffIds = new Map();
  for (const [businessId, business] of Object.entries(root.businesses || {})) {
    for (const [id, staff] of Object.entries(business?.staff || {})) {
      if (staff?.userId === uid || staff?.uid === uid || id === `stf_${uid}`) {
        if (!staffIds.has(businessId)) staffIds.set(businessId, new Set());
        staffIds.get(businessId).add(id);
        gatherContact(staff, seeds);
      }
    }
  }
  // Include historical phones/emails and legacy profile aliases linked to this UID.
  const visit = value => {
    if (!obj(value)) return;
    // Contact snapshots belong to different people in shared appointments.
    const prefixes = [];
    if (value.customerUid === uid) prefixes.push('customer');
    if (value.staffUid === uid || value.staffUserId === uid) prefixes.push('staff');
    if (prefixes.length) {
      for (const [key, contact] of Object.entries(value)) {
        if (typeof contact === 'string' && prefixes.some(prefix => key.toLowerCase().startsWith(prefix)) && /phone|email/i.test(key)) seeds.add(contact);
      }
    } else if (['uid','userId','userUid','applicantUid'].some(key => value[key] === uid)) {
      for (const [key, contact] of Object.entries(value)) {
        if (typeof contact === 'string' && /^(phone|phoneNormalized|phoneNumber|email|emailAddress)$/i.test(key)) seeds.add(contact);
      }
    }
    for (const child of Object.values(value)) if (obj(child)) visit(child);
  };
  visit(root);
  return { seeds:[...seeds], identities:variants(seeds), staffIds };
}

export function eraseUserData(root, uid, context) {
  const { identities, staffIds } = context;
  const staffMatch = record => staffIds.get(record?.businessId)?.has(record.staffId);
  const affectedAppointments = new Set(Object.entries(root.appointments || {}).filter(([,v]) => contains(v, identities) || staffMatch(v)).map(([id]) => id));
  const walk = (value, path = []) => {
    if (!obj(value)) return matches(value, identities) ? null : value;
    const top = path[0];
    if (top === 'users' && path.length === 2 && Object.entries(value).some(([k,v]) => /^(uid|userId|phone|phoneNormalized|email)$/.test(k) && matches(v, identities))) return null;
    if (path.length === 2 && historyFields[top] && (contains(value, identities) || staffMatch(value) || affectedAppointments.has(value.appointmentId) || affectedAppointments.has(value.targetId))) {
      // Allowlist removes names, snapshots, free text, IPs and nested before/after data.
      return Object.fromEntries(Object.entries(value).filter(([key,v]) => historyFields[top].has(key) && !obj(v) && !matches(v, identities)));
    }
    if (!['users','businesses','public_businesses',JOBS,'notifications', ...Object.keys(historyFields)].includes(top) && path.length >= 2 && (staffMatch(value) || Object.entries(value).some(([key,v]) => /uid|userId|phone|email/i.test(key) && !obj(v) && matches(v, identities)))) return null;
    if (top === 'notifications' && path.length >= 3 && (contains(value, identities) || affectedAppointments.has(value.appointmentId))) return null;
    if (['businesses','public_businesses'].includes(top) && path[2] === 'staff' && path.length === 4 && (staffIds.get(path[1])?.has(path[3]) || staffIds.get(path[1])?.has(value.id) || contains(value, identities))) return null;
    const output = Array.isArray(value) ? Array(value.length).fill(null) : {};
    for (const [key, child] of Object.entries(value)) {
      if (matches(key, identities)) continue;
      const cleaned = walk(child, [...path, key]);
      if (cleaned !== null) output[key] = cleaned;
    }
    return output;
  };
  return walk(root);
}

async function rootTransaction(db, transform) {
  const ref = db.ref();
  const listener = ref.on('value', () => {});
  try {
    for (let attempt = 0; attempt < 3; attempt++) {
      await ref.get();
      const result = await ref.transaction(current => current ? transform(current) : undefined);
      if (result.committed) return result;
    }
    throw fail('DELETE_RETRY_REQUIRED', 503);
  } finally { ref.off('value', listener); }
}

export async function hardDeleteUser({ db, auth, actorUid, targetUid }) {
  if (!validUid(actorUid) || !validUid(targetUid)) throw fail('INVALID_UID', 400);
  if (actorUid === targetUid) throw fail('SELF_DELETE_DENIED', 403);
  let authUser;
  try { authUser = await auth.getUser(targetUid); }
  catch (error) { if (error.code !== 'auth/user-not-found') throw fail('AUTH_LOOKUP_FAILED', 503); }
  // A private temporary journal retains cleanup inputs if Auth deletion succeeds but
  // RTDB fails. It is removed in the same transaction as all identity data; no UID
  // tombstone, UID hash or reversible mapping remains after success.
  await rootTransaction(db, root => {
    assertAllowed(root, actorUid, targetUid, authUser);
    const context = deletionContext(root, targetUid, authUser, root[JOBS]?.[targetUid]?.seeds);
    root[JOBS] ||= {};
    root[JOBS][targetUid] = { seeds:context.seeds };
    if (root.users?.[targetUid]) root.users[targetUid].disabled = true;
    return root;
  });
  try { await auth.deleteUser(targetUid); }
  catch (error) { if (error.code !== 'auth/user-not-found') throw fail('AUTH_DELETE_FAILED_RETRY', 503); }
  await rootTransaction(db, root => {
    assertAllowed(root, actorUid, targetUid, authUser);
    const context = deletionContext(root, targetUid, authUser, root[JOBS]?.[targetUid]?.seeds);
    const clean = eraseUserData(root, targetUid, context);
    if (contains(clean, context.identities)) throw fail('IDENTITY_CLEANUP_INCOMPLETE', 503);
    return clean;
  });
  return { success:true, hardDeleted:true };
}
