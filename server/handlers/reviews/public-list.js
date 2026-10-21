import { getAdminDatabase } from '../../firebase-admin.js';

function publicName(value) {
  const parts = String(value || 'Müşteri').trim().split(/\s+/).filter(Boolean);
  return parts.length > 1 ? `${parts[0]} ${parts.at(-1).slice(0, 1)}.` : (parts[0] || 'Müşteri');
}

async function readBusinessReviews(businessId) {
  const ref = getAdminDatabase().ref('reviews');
  try {
    return await ref.orderByChild('businessId').equalTo(businessId).get();
  } catch (error) {
    // Older Preview databases may not have this index. Keep all filtering and
    // identity masking server-side; never fall back on auth/permission errors.
    if (!String(error.message || '').includes('Index not defined, add ".indexOn": "businessId", for path "/reviews"')) throw error;
    return await getAdminDatabase().ref('reviews').get();
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error:'Method Not Allowed' });
  const businessId = String((req.body && req.body.businessId) || '');
  const limit = Math.max(1, Math.min(20, Number(req.body && req.body.limit) || 5));
  const offset = Math.max(0, Number(req.body && req.body.offset) || 0);
  if (!/^biz_[a-z0-9_-]+$/i.test(businessId)) return res.status(400).json({ error:'Geçerli salon kimliği zorunludur.' });
  const uid = req.auth && req.auth.uid;
  const [businessSnapshot, reviewSnapshot, appointmentSnapshot] = await Promise.all([
    getAdminDatabase().ref(`public_businesses/${businessId}`).get(),
    readBusinessReviews(businessId),
    uid ? getAdminDatabase().ref('appointments').orderByChild('customerUid').equalTo(uid).get() : Promise.resolve(null)
  ]);
  if (!businessSnapshot.exists()) return res.status(404).json({ error:'Salon bulunamadı.' });
  const rawReviews = Object.values(reviewSnapshot.val() || {}).filter(item => item && item.businessId === businessId && Number.isInteger(Number(item.rating)) && Number(item.rating) >= 1 && Number(item.rating) <= 5);
  const ownReviews = rawReviews.filter(item => item.customerUid === uid).sort((a,b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  const completedAppointments = appointmentSnapshot && appointmentSnapshot.exists()
    ? Object.entries(appointmentSnapshot.val() || {}).filter(([, item]) => item && item.businessId === businessId && item.customerUid === uid && item.status === 'completed')
    : [];
  const eligibleAppointments = completedAppointments
    .filter(([appointmentId]) => !rawReviews.some(review => review.appointmentId === appointmentId))
    .sort(([, left], [, right]) => String(right.date || right.createdAt || '').localeCompare(String(left.date || left.createdAt || '')))
    .slice(0, 20)
    .map(([appointmentId, appointment]) => ({ appointmentId, date:appointment.date || '', time:appointment.time || appointment.startTime || '', serviceName:String(appointment.serviceNameSnapshot || appointment.serviceName || '').slice(0, 120), staffName:String(appointment.staffName || '').slice(0, 120) }));
  const unreviewedAppointment = eligibleAppointments[0];
  const editableReview = ownReviews.find(review => Number.isFinite(Date.parse(review.createdAt)) && Date.now() - Date.parse(review.createdAt) <= 48 * 60 * 60 * 1000);
  const displayOwnReview = editableReview || ownReviews[0] || null;
  const editDeadline = displayOwnReview ? Date.parse(displayOwnReview.createdAt || '') + 48 * 60 * 60 * 1000 : 0;
  const reviewEligibility = editableReview
    ? { mode:'edit', appointmentId:editableReview.appointmentId, reviewId:editableReview.reviewId, rating:editableReview.rating, comment:editableReview.comment || '', editableUntil:new Date(editDeadline).toISOString() }
    : unreviewedAppointment ? { mode:'create', appointmentId:unreviewedAppointment.appointmentId }
      : displayOwnReview ? { mode:'readonly', appointmentId:displayOwnReview.appointmentId, reviewId:displayOwnReview.reviewId, rating:displayOwnReview.rating, comment:displayOwnReview.comment || '' } : { mode:'none' };
  const sortedReviews = rawReviews.sort((a,b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  const reviews = sortedReviews.slice(offset, offset + limit)
    .map(item => ({ rating:Math.max(1, Math.min(5, Number(item.rating) || 1)), comment:String(item.comment || '').slice(0, 1000), createdAt:item.createdAt || '', customerName:publicName(item.customerName) }));
  return res.status(200).json({ success:true, reviews, hasMore: offset + reviews.length < sortedReviews.length, reviewEligibility, eligibleAppointments });
}
