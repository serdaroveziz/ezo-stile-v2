import { validateSalonTypes } from '../../../src/salon-discovery.js';
/* UNELIVO - Serverless Salon Application Ingestion Endpoint */
import { getAdminDatabase } from '../../firebase-admin.js';

export async function handleSalonApplicationWithDatabase(req, res, db) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { salonName, ownerName, phone, city, district } = req.body || {};
    const applicantUid = req.auth && req.auth.uid;

    if (!salonName || !ownerName || !phone || !city || !district || !applicantUid) {
      return res.status(400).json({ error: 'Zorunlu alanlar eksik' });
    }

    const salonTypes=req.body.salonTypes===undefined?[]:validateSalonTypes(req.body.salonTypes);
    // Do not depend on a deployed RTDB index here. Some environments can lag
    // behind the repository rules and reject orderByChild with HTTP 500.
    const existingSnapshot = await db.ref('salon_applications').get();
    const existing = existingSnapshot.exists()
      ? Object.values(existingSnapshot.val()).filter(application => application && application.applicantUid === applicantUid)
      : [];
    if (existing.some(application => application && application.status === 'pending')) {
      return res.status(409).json({ error: 'Bu hesaba ait bekleyen bir salon başvurusu zaten var.' });
    }

    const appId = 'app_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const applicationRecord = {
      appId,
      salonName,
      salonTypes,
      address: String(req.body.address||'').trim().slice(0,300),
      ownerName,
      phone,
      city,
      district,
      applicantUid,
      status: 'pending', // Hardcoded status - client cannot send 'approved'
      createdAt: new Date().toISOString()
    };

    await db.ref(`salon_applications/${appId}`).set(applicationRecord);

    return res.status(200).json({
      success: true,
      appId,
      status: 'pending',
      application: applicationRecord
    });

  } catch (err) {
    console.error('Salon application error:', err);
    return res.status(err.statusCode||500).json({ error: err.statusCode?err.message:'Internal Server Error' });
  }
}

export default (req,res)=>handleSalonApplicationWithDatabase(req,res,getAdminDatabase());
