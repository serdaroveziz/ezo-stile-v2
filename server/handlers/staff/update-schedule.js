import { getAdminDatabase } from '../../firebase-admin.js';
import { hasStaffPermission } from '../../../src/staff-permissions.js';

const DAY_KEYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];

export function canManageStaffSchedule(caller) {
  return Boolean(caller && caller.businessId && (caller.role === 'owner' || (caller.role === 'manager' && hasStaffPermission(caller, 'schedule.manage'))));
}

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const MAX_BREAKS_PER_DAY = 6;

// Breaks are consumed by src/booking-engine.js (scheduleForDate). A day without a
// `breaks` key in the request keeps whatever breaks are already stored.
function normalizeBreaks(key, breaks, start, end) {
  if (!Array.isArray(breaks) || breaks.length > MAX_BREAKS_PER_DAY) {
    throw Object.assign(new Error(`${key} mola listesi geçersiz.`), { statusCode: 400 });
  }
  return breaks.map(item => {
    const breakStart = String(item?.start || ''), breakEnd = String(item?.end || '');
    if (!TIME_PATTERN.test(breakStart) || !TIME_PATTERN.test(breakEnd) || breakStart >= breakEnd || breakStart < start || breakEnd > end) {
      throw Object.assign(new Error(`${key} mola saatleri geçersiz.`), { statusCode: 400 });
    }
    return { start: breakStart, end: breakEnd };
  });
}

export function normalizeWeeklySchedule(input, existing = null) {
  if (!input || typeof input !== 'object') throw Object.assign(new Error('Çalışma programı zorunludur.'), { statusCode: 400 });
  const result = {};
  for (const key of DAY_KEYS) {
    const day = input[key] || {};
    const isOpen = day.isOpen === true;
    const start = String(day.start || '09:00');
    const end = String(day.end || '19:00');
    if (isOpen && (!TIME_PATTERN.test(start) || !TIME_PATTERN.test(end) || start >= end)) {
      throw Object.assign(new Error(`${key} çalışma saatleri geçersiz.`), { statusCode: 400 });
    }
    result[key] = { isOpen, start, end };
    if (Object.prototype.hasOwnProperty.call(day, 'breaks')) {
      const breaks = normalizeBreaks(key, day.breaks, start, end);
      if (breaks.length) result[key].breaks = breaks;
    } else if (Array.isArray(existing?.[key]?.breaks) && existing[key].breaks.length) {
      result[key].breaks = existing[key].breaks;
    }
  }
  return result;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  const caller = req.auth && req.auth.profile;
  if (!canManageStaffSchedule(caller)) {
    return res.status(403).json({ error: 'Çalışan programını düzenleme izniniz yok.' });
  }
  const staffId = String((req.body && req.body.staffId) || '');
  if (!staffId) return res.status(400).json({ error: 'Çalışan seçimi zorunludur.' });
  try {
    normalizeWeeklySchedule(req.body.weeklySchedule);
    const ref = getAdminDatabase().ref(`businesses/${caller.businessId}/staff/${staffId}`);
    const snap = await ref.get();
    if (!snap.exists()) return res.status(404).json({ error: 'Çalışan bulunamadı.' });
    const schedule = normalizeWeeklySchedule(req.body.weeklySchedule, snap.val()?.weeklySchedule);
    await ref.update({ weeklySchedule: schedule, updatedAt: new Date().toISOString() });
    return res.status(200).json({ success: true, staffId, weeklySchedule: schedule });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : 'Çalışan programı güncellenemedi.' });
  }
}
