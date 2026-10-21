/* Authenticated, appointment-scoped review create/edit with a 48-hour edit window. */
import { getAdminDatabase, transactionWithCurrentValue } from '../../firebase-admin.js';
import { syncPublicBusiness } from '../../public-business.js';

const EDIT_WINDOW_MS = 48 * 60 * 60 * 1000;

export function validateReviewMutation({ appointment, uid, existingReview = null, now = Date.now() }) {
  if (!appointment) return 'not_found';
  if (appointment.customerUid !== uid) return 'other_customer';
  if (appointment.status !== 'completed') return 'not_completed';
  if (!existingReview) return 'create';
  if (existingReview.customerUid !== uid) return 'other_customer';
  const createdAt = Date.parse(existingReview.createdAt || '');
  return Number.isFinite(createdAt) && now - createdAt <= EDIT_WINDOW_MS ? 'edit' : 'expired';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error:'Method Not Allowed' });
  try {
    const uid = req.auth && req.auth.uid;
    const appointmentId = String((req.body && req.body.appointmentId) || '').trim();
    const requestedBusinessId = String((req.body && req.body.businessId) || '').trim();
    const mode = req.body && req.body.mode;
    if (mode && !['create', 'edit'].includes(mode)) return res.status(400).json({ error:'Geçersiz yorum işlemi.' });
    const rating = Number(req.body && req.body.rating);
    const rawComment = String((req.body && req.body.comment) || '');
    if (rawComment.length > 2000) return res.status(400).json({ error:'Yorum en fazla 2000 karakter olabilir.' });
    const comment = rawComment.trim();
    if (!uid || !appointmentId || !Number.isInteger(rating) || rating < 1 || rating > 5) return res.status(400).json({ error:'Geçerli randevu ve 1–5 arası tam sayı puan zorunludur.' });

    const db = getAdminDatabase();
    const appointmentSnapshot = await db.ref(`appointments/${appointmentId}`).get();
    if (!appointmentSnapshot.exists()) return res.status(404).json({ error:'Randevu bulunamadı.' });
    const appointment = appointmentSnapshot.val();
    if (requestedBusinessId && appointment.businessId !== requestedBusinessId) return res.status(403).json({ error:'Randevu bu salonla eşleşmiyor.' });
    const appointmentDecision = validateReviewMutation({ appointment, uid });
    if (appointmentDecision === 'other_customer') return res.status(403).json({ error:'Sadece kendi randevunuz için yorum yapabilirsiniz.' });
    if (appointmentDecision === 'not_completed') return res.status(409).json({ error:'Yalnızca tamamlanmış randevular için yorum yapılabilir.' });

    let outcome = 'create';
    let failure = null;
    let savedReviewId = null;
    const nowIso = new Date().toISOString();
    const reviewsRef = db.ref('reviews');
    const transaction = await transactionWithCurrentValue(reviewsRef, current => {
      const reviews = current && typeof current === 'object' ? { ...current } : {};
      const entry = Object.entries(reviews).find(([, review]) => review && review.appointmentId === appointmentId);
      if (entry) {
        const [reviewId, existing] = entry;
        if (existing.businessId !== appointment.businessId) { failure = 'other_customer'; return; }
        if (mode === 'create') { failure = 'duplicate'; return; }
        const decision = validateReviewMutation({ appointment, uid, existingReview:existing });
        if (decision === 'other_customer') { failure = 'other_customer'; return; }
        if (decision === 'expired') { failure = 'expired'; return; }
        outcome = 'edit';
        savedReviewId = reviewId;
        reviews[reviewId] = { ...existing, rating, comment, updatedAt:nowIso };
        return reviews;
      }
      if (mode === 'edit') { failure = 'missing'; return; }
      savedReviewId = `rev_${appointmentId}`;
      reviews[savedReviewId] = { reviewId:savedReviewId, businessId:appointment.businessId, appointmentId, customerUid:uid, customerName:appointment.customerName || 'Müşteri', rating, comment, createdAt:nowIso };
      return reviews;
    });

    if (!transaction.committed) {
      if (failure === 'duplicate' || failure === 'missing') return res.status(409).json({ error:'Yorum durumu değişti. Yorumlar bölümünü yeniden açın.' });
      if (failure === 'other_customer') return res.status(403).json({ error:'Bu randevunun yorumu başka bir kullanıcıya aittir.' });
      if (failure === 'expired') return res.status(409).json({ error:'Yorum düzenleme süresi 48 saattir.' });
      return res.status(409).json({ error:'Yorum kaydedilemedi. Lütfen tekrar deneyin.' });
    }

    const allReviews = Object.values(transaction.snapshot.val() || {}).filter(review => review && review.businessId === appointment.businessId && Number.isInteger(Number(review.rating)) && Number(review.rating) >= 1 && Number(review.rating) <= 5);
    const ratingCount = allReviews.length;
    const averageRating = ratingCount ? Number((allReviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / ratingCount).toFixed(1)) : 0;
    await db.ref(`businesses/${appointment.businessId}`).update({ averageRating, ratingCount });
    await syncPublicBusiness(appointment.businessId);
    return res.status(200).json({ success:true, mode:outcome, reviewId:savedReviewId, averageRating, ratingCount });
  } catch (error) {
    console.error('Review submit API error:', error);
    return res.status(500).json({ error:'Yorum kaydedilemedi.' });
  }
}
