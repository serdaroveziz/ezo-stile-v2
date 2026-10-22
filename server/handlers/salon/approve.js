import { normalizeSalonTypes } from '../../../src/salon-discovery.js';
/* UNELIVO - Serverless Transactional Super Admin Application Approval Endpoint */
import { getAdminDatabase, requireRole } from '../../firebase-admin.js';
import { buildPublicBusiness } from '../../public-business.js';
import { createPublicSalonSlug } from '../../../src/public-businesses.js';
import { normalizePermissions } from '../../../src/staff-permissions.js';

export function validateOwnerPromotion(application, applicantProfile, businesses = {}) {
  if (!application || application.status !== 'pending') {
    const error = new Error('Başvuru zaten işlenmiş veya onaylanmış');
    error.statusCode = 400;
    throw error;
  }
  const applicantUid = String(application.applicantUid || '').trim();
  if (!applicantUid || !applicantProfile || typeof applicantProfile !== 'object') {
    const error = new Error('Başvuru sahibinin kullanıcı hesabı bulunamadı.');
    error.statusCode = 409;
    throw error;
  }
  const currentRole = String(applicantProfile.role || 'customer');
  const currentBusinessId = String(applicantProfile.businessId || '').trim();
  const alreadyOwned = Object.entries(businesses || {}).find(([, business]) => business && business.ownerUid === applicantUid);
  const activeStaffLink = Object.entries(businesses || {}).find(([, business]) =>
    Object.values((business && business.staff) || {}).some(staff => staff && staff.active !== false && (staff.userId === applicantUid || staff.uid === applicantUid))
  );
  if (currentRole !== 'customer' || currentBusinessId || alreadyOwned || activeStaffLink) {
    const error = new Error('Başvuru sahibinin mevcut salon veya personel bağlantısı doğrulanamadı.');
    error.statusCode = 409;
    throw error;
  }
  return applicantUid;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { appId } = req.body || {};

    if (!appId) {
      return res.status(400).json({ error: 'appId zorunludur' });
    }

    requireRole(req.auth, ['super_admin']);
    const db = getAdminDatabase();

    // 2. FETCH APPLICATION
    const appSnapshot = await db.ref(`salon_applications/${appId}`).get();
    const appData = appSnapshot.exists() ? appSnapshot.val() : null;

    if (!appData) {
      return res.status(404).json({ error: 'Başvuru bulunamadı' });
    }

    const applicantUid = String(appData.applicantUid || '').trim();
    const [userSnapshot, businessesSnapshot] = await Promise.all([
      applicantUid ? db.ref(`users/${applicantUid}`).get() : Promise.resolve(null),
      db.ref('businesses').get()
    ]);
    const applicantProfile = userSnapshot && userSnapshot.exists() ? userSnapshot.val() : null;
    const businesses = businessesSnapshot.exists() ? businessesSnapshot.val() : {};
    validateOwnerPromotion(appData, applicantProfile, businesses);

    // 3. GENERATE UNIQUE BUSINESS ID
    const businessId = 'biz_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);

    const businessRecord = {
      businessId,
      publicSlug: createPublicSalonSlug(appData.salonName, businessId),
      name: appData.salonName,
      salonTypes: normalizeSalonTypes(appData.salonTypes),
      phone: appData.phone,
      city: appData.city,
      district: appData.district || '',
      address: String(appData.address||'').slice(0,300),
      bookingEnabled: false, // Requires 5-step onboarding wizard
      discoveryEnabled: true,
      status: 'active',
      plan: 'FREE',
      ownerUid: applicantUid,
      createdAt: new Date().toISOString()
    };

    const approvedAt = new Date().toISOString();
    const publicBusiness = buildPublicBusiness(businessId, businessRecord);
    await db.ref().update({
      [`businesses/${businessId}`]: businessRecord,
      [`public_businesses/${businessId}`]: publicBusiness,
      [`users/${applicantUid}/role`]: 'owner',
      [`users/${applicantUid}/businessId`]: businessId,
      [`users/${applicantUid}/permissions`]: normalizePermissions(['business.manage','staff.manage','finance.view']),
      [`salon_applications/${appId}/status`]: 'approved',
      [`salon_applications/${appId}/businessId`]: businessId,
      [`salon_applications/${appId}/approvedAt`]: approvedAt
    });

    return res.status(200).json({
      success: true,
      businessId,
      ownerUid: applicantUid,
      status: 'approved'
    });

  } catch (err) {
    console.error('Super Admin approval API error:', err);
    return res.status(err.statusCode || 500).json({ error: err.statusCode ? err.message : 'Internal Server Error' });
  }
}
