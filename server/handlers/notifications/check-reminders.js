/* UNELIVO - Idempotent Appointment Reminder Service (24h & 2h Guards) */
import { sendNotification } from './send.js';

const FIREBASE_DB_URL = 'https://ezostile-barber-default-rtdb.europe-west1.firebasedatabase.app';
import { firebaseFetch, getAdminDatabase } from '../../firebase-admin.js';
import { reminderEligibility } from '../../push-notifications.js';

export default async function handler(req, res) {
  try {
    const allAptsRes = await firebaseFetch(`${FIREBASE_DB_URL}/appointments.json`);
    const allAptsData = allAptsRes.ok ? await allAptsRes.json() : null;
    if (!allAptsData) {
      return res.status(200).json({ checked: 0, sent: 0 });
    }

    const allApts = Object.values(allAptsData);
    const now = Date.now();
    let sentCount = 0;

    for (const apt of allApts) {
      if (!apt || apt.status !== 'approved') continue;

      if (reminderEligibility(apt, now, 180) && !apt.reminder3hSent && await claimReminder(apt.aptId, 'reminder3hSent')) {
        await sendNotification({
          targetUid: apt.customerUid,
          type: 'reminder_3h',
          title: 'Randevunuza 3 Saat Kaldı',
          message: `Bugün saat ${apt.time} randevunuz var.`,
          appointmentId: apt.aptId,
          businessId: apt.businessId,
          requestId: `appointment:${apt.aptId}:reminder:3h`
        });

        sentCount++;
      }

      if (reminderEligibility(apt, now, 30) && !apt.reminder30mSent && await claimReminder(apt.aptId, 'reminder30mSent')) {
        await sendNotification({
          targetUid: apt.customerUid,
          type: 'reminder_30m',
          title: 'Randevunuza 30 Dakika Kaldı',
          message: `Saat ${apt.time} randevunuz yaklaşıyor.`,
          appointmentId: apt.aptId,
          businessId: apt.businessId,
          requestId: `appointment:${apt.aptId}:reminder:30m`
        });

        sentCount++;
      }
    }

    return res.status(200).json({ success: true, checked: allApts.length, sent: sentCount });

  } catch (err) {
    console.error('Check reminders error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

export async function claimReminder(appointmentId, field, database = getAdminDatabase()) {
  if (!appointmentId || !['reminder3hSent', 'reminder30mSent'].includes(field)) return false;
  const result = await database.ref(`appointments/${appointmentId}/${field}`).transaction(current => current ? undefined : true);
  return Boolean(result && result.committed);
}
