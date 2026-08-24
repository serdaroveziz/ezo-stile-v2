/* EZO STİLE v2 - Cryptographically Secure Staff Invitation Token Generator */
import crypto from 'crypto';

const FIREBASE_DB_URL = 'https://ezostile-barber-default-rtdb.europe-west1.firebasedatabase.app';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { ownerUid, displayName, phone, role, services, permissions } = req.body || {};

    if (!ownerUid || !displayName || !role) {
      return res.status(400).json({ error: 'ownerUid, displayName ve role zorunludur' });
    }

    const allowedRoles = ['manager', 'barber', 'receptionist'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ error: 'Geçersiz personel rolü. Owner veya Super Admin atanamaz.' });
    }

    // 1. VERIFY CALLER AUTHORIZATION
    const callerRes = await fetch(`${FIREBASE_DB_URL}/users/${ownerUid}.json`);
    const caller = callerRes.ok ? await callerRes.json() : null;

    if (!caller || !caller.businessId) {
      return res.status(403).json({ error: 'Yetkisiz kullanıcı' });
    }

    const isOwner = caller.role === 'owner' || caller.role === 'super_admin';
    const isManagerWithPerm = caller.role === 'manager' && caller.permissions && caller.permissions['staff.manage'];

    if (!isOwner && !isManagerWithPerm) {
      return res.status(403).json({ error: 'Personel daveti oluşturmak için staff.manage yetkiniz bulunmalıdır' });
    }

    // 2. GENERATE UNPREDICTABLE CRYPTOGRAPHIC TOKEN
    const randomBytes = crypto.randomBytes(16).toString('hex');
    const token = 'inv_' + randomBytes;
    const inviteId = 'inv_rec_' + Date.now();
    const expiresAt = Date.now() + (24 * 60 * 60 * 1000); // 24 Hours

    const inviteRecord = {
      inviteId,
      token,
      businessId: caller.businessId,
      displayName,
      phone: phone || '',
      role,
      services: services || ['all'],
      permissions: permissions || {},
      createdBy: ownerUid,
      expiresAt,
      used: false,
      createdAt: new Date().toISOString()
    };

    const saveRes = await fetch(`${FIREBASE_DB_URL}/staff_invites/${inviteId}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inviteRecord)
    });

    if (!saveRes.ok) {
      return res.status(500).json({ error: 'Davet kaydedilemedi' });
    }

    const inviteUrl = `https://ezostile.app/join?token=${token}`;

    return res.status(200).json({
      success: true,
      inviteId,
      token,
      inviteUrl,
      expiresAt,
      invite: inviteRecord
    });

  } catch (err) {
    console.error('Create invite API error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}