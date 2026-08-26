/* EZO STİLE v2 - Platform Audit Logger Service */
const FIREBASE_DB_URL = 'https://ezostile-barber-default-rtdb.europe-west1.firebasedatabase.app';

export async function writeAuditLog({ actorUid, actorRole, action, targetType, targetId, businessId, metadata }) {
  try {
    const logId = 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const logRecord = {
      logId,
      actorUid: actorUid || 'system',
      actorRole: actorRole || 'system',
      action,
      targetType,
      targetId: targetId || null,
      businessId: businessId || null,
      metadata: metadata || {},
      timestamp: new Date().toISOString()
    };

    await fetch(`${FIREBASE_DB_URL}/audit_logs/${logId}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(logRecord)
    });

    return logRecord;
  } catch (err) {
    console.error('Audit Log Error:', err);
    return null;
  }
}

export default writeAuditLog;