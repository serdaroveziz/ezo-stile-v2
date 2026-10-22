import crypto from 'crypto';
import { getAdminDatabase } from '../../firebase-admin.js';

const tokenId = token => crypto.createHash('sha256').update(token).digest('hex').slice(0,40);
export async function updatePushToken({ uid, method, body = {}, database = getAdminDatabase() }) {
  const token = String(body.token || '').trim();
  if (method === 'DELETE') {
    if (token) await database.ref(`users/${uid}/pushTokens/${tokenId(token)}`).remove();
    return { success:true };
  }
  if (method !== 'POST' || token.length < 40 || token.length > 4096) {
    const error = new Error('Geçersiz push token.'); error.statusCode = 400; throw error;
  }
  const now = new Date().toISOString();
  const ref = database.ref(`users/${uid}/pushTokens/${tokenId(token)}`);
  const existing = (await ref.get()).val() || {};
  await ref.set({ token, enabled:true, platform:String(body.platform || 'web').slice(0,30), deviceHint:String(body.deviceHint || '').slice(0,80), createdAt:existing.createdAt || now, updatedAt:now, lastSeenAt:now });
  return { success:true };
}

export default async function handler(req,res) {
  if (!req.auth || !req.auth.uid) return res.status(401).json({ error:'Oturum gerekli.' });
  try {
    return res.status(200).json(await updatePushToken({ uid:req.auth.uid, method:req.method, body:req.body || {} }));
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error:error.statusCode ? error.message : 'Push token kaydedilemedi.' });
  }
}
