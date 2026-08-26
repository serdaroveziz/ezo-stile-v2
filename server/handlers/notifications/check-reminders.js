/* EZO STİLE v2 - Idempotent Appointment Reminder Service (24h & 2h Guards) */
import { sendNotification } from './send.js';

const FIREBASE_DB_URL = 'https://ezostile-barber-default-rtdb.europe-west1.firebasedatabase.app';

export default async function handler(req, res) {
  try {
    const allAptsRes = await fetch(`${FIREBASE_DB_URL}/appointments.json`);
    const allAptsData = allAptsRes.ok ? await allAptsRes.json() : null;
    if (!allAptsData) {
      return res.status(200).json({ checked: 0, sent: 0 });
    }

    const allApts = Object.values(allAptsData);
    const now = Date.now();
    let sentCount = 0;

    for (const apt of allApts) {
      if (!apt || apt.status !== 'approved') continue;

      const aptTimeMs = new Date(`${apt.date}T${apt.time}:00`).getTime();
      const diffMs = aptTimeMs - now;

      // 24 Hour Reminder (23h to 25h window)
      if (diffMs > 0 && diffMs <= 25 * 3600 * 1000 && diffMs >= 23 * 3600 * 1000 && !apt.reminder24hSent) {
        await sendNotification({
          targetUid: apt.customerUid,
          type: 'reminder_24h',
          title: '📅 Randevunuza 24 Saat Kaldı',
          message: `Hatırlatma: Yarın saat ${apt.time} için ${apt.serviceName || 'salon'} randevunuz mevcuttur.`,
          appointmentId: apt.aptId,
          businessId: apt.businessId
        });

        await fetch(`${FIREBASE_DB_URL}/appointments/${apt.aptId}.json`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reminder24hSent: true })
        });
        sentCount++;
      }

      // 2 Hour Reminder (1.5h to 2.5h window)
      if (diffMs > 0 && diffMs <= 2.5 * 3600 * 1000 && diffMs >= 1.5 * 3600 * 1000 && !apt.reminder2hSent) {
        await sendNotification({
          targetUid: apt.customerUid,
          type: 'reminder_2h',
          title: '⏰ Randevunuza 2 Saat Kaldı',
          message: `Hatırlatma: Bugün saat ${apt.time} salon randevunuz yaklaşıyor.`,
          appointmentId: apt.aptId,
          businessId: apt.businessId
        });

        await fetch(`${FIREBASE_DB_URL}/appointments/${apt.aptId}.json`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reminder2hSent: true })
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