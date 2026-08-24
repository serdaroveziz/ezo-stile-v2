/* EZO STİLE v2 - Atomic Review Submission & Server-Side Rating Calculator */
const FIREBASE_DB_URL = 'https://ezostile-barber-default-rtdb.europe-west1.firebasedatabase.app';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { appointmentId, customerUid, rating, comment } = req.body || {};

    if (!appointmentId || !customerUid || !rating) {
      return res.status(400).json({ error: 'appointmentId, customerUid ve rating zorunludur' });
    }

    const ratingNum = parseFloat(rating);
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ error: 'Puan 1 ile 5 arasında olmalıdır' });
    }

    // 1. FETCH APPOINTMENT & VERIFY ELIGIBILITY
    const aptRes = await fetch(`${FIREBASE_DB_URL}/appointments/${appointmentId}.json`);
    const apt = aptRes.ok ? await aptRes.json() : null;

    if (!apt) {
      return res.status(404).json({ error: 'Randevu bulunamadı' });
    }

    if (apt.customerUid !== customerUid) {
      return res.status(403).json({ error: 'Sadece kendi randevunuz için yorum yapabilirsiniz' });
    }

    if (apt.status !== 'approved' && apt.status !== 'completed') {
      return res.status(400).json({ error: 'Yalnızca tamamlanmış randevular için yorum yapılabilir.' });
    }

    // 2. VERIFY SINGLE REVIEW PER APPOINTMENT
    const allReviewsRes = await fetch(`${FIREBASE_DB_URL}/reviews.json`);
    const allReviewsData = allReviewsRes.ok ? await allReviewsRes.json() : null;
    const allReviews = allReviewsData ? Object.values(allReviewsData) : [];

    const existingReview = allReviews.find(r => r && r.appointmentId === appointmentId);
    if (existingReview) {
      return res.status(400).json({ error: 'Bu randevu için zaten yorum yapılmıştır. İkinci yorum yazılamaz.' });
    }

    // 3. SAVE REVIEW
    const reviewId = 'rev_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const reviewRecord = {
      reviewId,
      businessId: apt.businessId,
      appointmentId,
      customerUid,
      customerName: apt.customerName || 'Müşteri',
      rating: ratingNum,
      comment: comment || '',
      createdAt: new Date().toISOString()
    };

    await fetch(`${FIREBASE_DB_URL}/reviews/${reviewId}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reviewRecord)
    });

    // 4. SERVER-SIDE RATING RECALCULATION FOR SALON
    const bizReviews = allReviews.filter(r => r && r.businessId === apt.businessId);
    bizReviews.push(reviewRecord);

    const sumRating = bizReviews.reduce((acc, r) => acc + (r.rating || 5), 0);
    const averageRating = parseFloat((sumRating / bizReviews.length).toFixed(1));
    const ratingCount = bizReviews.length;

    await fetch(`${FIREBASE_DB_URL}/businesses/${apt.businessId}.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ averageRating, ratingCount })
    });

    return res.status(200).json({
      success: true,
      reviewId,
      averageRating,
      ratingCount
    });

  } catch (err) {
    console.error('Review submit API error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}