/* EZO STİLE v2 - In-App Notification Dispatcher Service */
const FIREBASE_DB_URL = 'https://ezostile-barber-default-rtdb.europe-west1.firebasedatabase.app';

export async function sendNotification({ targetUid, type, title, message, appointmentId, businessId }) {
  if (!targetUid || !title || !message) {
    console.error('Missing targetUid, title, or message for notification');
    return null;
  }

  try {
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