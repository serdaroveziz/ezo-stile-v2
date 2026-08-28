/* EZO STİLE v2 - In-App Notification Dispatcher Service with Idempotency & Master Guard */
const FIREBASE_DB_URL = 'https://ezostile-barber-default-rtdb.europe-west1.firebasedatabase.app';

export async function sendNotification({ targetUid, type, title, message, appointmentId, businessId }) {
  if (!targetUid || !title || !message) {
    console.error('Missing targetUid, title, or message for notification');
    return null;
  }

  try {
    // 1. Check Master Notification Toggle
    const prefsRes = await fetch(`${FIREBASE_DB_URL}/users/${targetUid}/notificationPreferences.json`);
    const prefs = prefsRes.ok ? await prefsRes.json() : null;
    if (prefs && prefs.inApp === false) {
      console.log(`[NOTIF SKIPPED] UID ${targetUid} has inApp master notification disabled`);
      return null;
    }

    // 2. Idempotency Guard (Prevent Duplicate Notifications for Same Event/Appointment)
    if (appointmentId && type) {
      const userNotifsRes = await fetch(`${FIREBASE_DB_URL}/notifications/${targetUid}.json`);
      const userNotifsData = userNotifsRes.ok ? await userNotifsRes.json() : null;
      if (userNotifsData) {
        const alreadySent = Object.values(userNotifsData).some(n => n && n.appointmentId === appointmentId && n.type === type);
        if (alreadySent) {
          console.log(`[NOTIF IDEMPOTENT BLOCK] Notification type '${type}' for aptId '${appointmentId}' already sent to UID ${targetUid}`);
          return null;
        }
      }
    }

    const notificationId = 'notif_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const notificationRecord = {
      notificationId,
      type: type || 'system',
      title,
      message,
      appointmentId: appointmentId || null,
      businessId: businessId || null,
      read: false,
      createdAt: new Date().toISOString()
    };

    await fetch(`${FIREBASE_DB_URL}/notifications/${targetUid}/${notificationId}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(notificationRecord)
    });

    return notificationRecord;
  } catch (err) {
    console.error('Send Notification Error:', err);
    return null;
  }
}

export default sendNotification;
