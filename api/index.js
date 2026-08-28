/* EZO STİLE v2 - Central Vercel Catch-All Router (1 Single Function for Vercel Hobby Limit) */
import url from 'url';

// EXPLICIT STATIC HANDLER REGISTRY (REQUIRED FOR VERCEL NFT BUNDLING)
import bookingCreate from '../server/handlers/booking/create.js';
import bookingUpdateStatus from '../server/handlers/booking/update-status.js';
import bookingRescheduleApprove from '../server/handlers/booking/reschedule-approve.js';
import staffAdd from '../server/handlers/staff/add.js';
import staffCreateInvite from '../server/handlers/staff/create-invite.js';
import staffAcceptInvite from '../server/handlers/staff/accept-invite.js';
import salonApply from '../server/handlers/salon/apply.js';
import salonApprove from '../server/handlers/salon/approve.js';
import salonToggleStatus from '../server/handlers/salon/toggle-status.js';
import salonToggleDiscovery from '../server/handlers/salon/toggle-discovery.js';
import aiAnalyze from '../server/handlers/ai/analyze.js';
import aiGenerate from '../server/handlers/ai/generate.js';
import aiRefund from '../server/handlers/ai/refund.js';
import aiRewardedAd from '../server/handlers/ai/rewarded-ad.js';
import authResolveRole from '../server/handlers/auth/resolve-role.js';
import authWelcomeBonus from '../server/handlers/auth/welcome-bonus.js';
import paymentsCreate from '../server/handlers/payments/create.js';
import paymentsStatus from '../server/handlers/payments/status.js';
import paymentsRefund from '../server/handlers/payments/refund.js';
import paymentsPaytrCallback from '../server/handlers/payments/paytr-callback.js';
import paymentsVerifyGoogle from '../server/handlers/payments/verify-google.js';
import paymentsVerifyApple from '../server/handlers/payments/verify-apple.js';
import reviewsSubmit from '../server/handlers/reviews/submit.js';
import auditLog from '../server/handlers/audit/log.js';
import userToggleStatus from '../server/handlers/user/toggle-status.js';
import notificationsSend from '../server/handlers/notifications/send.js';
import notificationsCheckReminders from '../server/handlers/notifications/check-reminders.js';

const HANDLERS = {
  'booking/create': bookingCreate,
  'booking/update-status': bookingUpdateStatus,
  'booking/reschedule-approve': bookingRescheduleApprove,
  'staff/add': staffAdd,
  'staff/create-invite': staffCreateInvite,
  'staff/accept-invite': staffAcceptInvite,
  'salon/apply': salonApply,
  'salon/approve': salonApprove,
  'salon/toggle-status': salonToggleStatus,
  'salon/toggle-discovery': salonToggleDiscovery,
  'ai/analyze': aiAnalyze,
  'ai/generate': aiGenerate,
  'ai/refund': aiRefund,
  'ai/rewarded-ad': aiRewardedAd,
  'auth/resolve-role': authResolveRole,
  'auth/welcome-bonus': authWelcomeBonus,
  'payments/create': paymentsCreate,
  'payments/status': paymentsStatus,
  'payments/refund': paymentsRefund,
  'payments/paytr-callback': paymentsPaytrCallback,
  'payments/verify-google': paymentsVerifyGoogle,
  'payments/verify-apple': paymentsVerifyApple,
  'reviews/submit': reviewsSubmit,
  'audit/log': auditLog,
  'user/toggle-status': userToggleStatus,
  'notifications/send': notificationsSend,
  'notifications/check-reminders': notificationsCheckReminders
};

function extractRoutePath(req) {
  const reqUrl = req.url || '';
  const parsedUrl = url.parse(reqUrl, true);

  // 1. Check explicit query parameter 'path' (e.g. ?path=booking/create)
  if (parsedUrl.query && parsedUrl.query.path) {
    let p = String(parsedUrl.query.path).trim();
    if (p && p !== 'index' && p !== 'api') return p;
  }

  // 2. Check query string in req.url
  if (reqUrl.includes('path=')) {
    const qMatch = reqUrl.match(/[?&]path=([^&]+)/);
    if (qMatch && qMatch[1]) {
      let p = decodeURIComponent(qMatch[1]).trim();
      if (p && p !== 'index' && p !== 'api') return p;
    }
  }

  // 3. Check Vercel routing headers
  const matchedHeader = req.headers && (req.headers['x-matched-path'] || req.headers['x-now-route-matches']);
  if (matchedHeader) {
    const match = String(matchedHeader).match(/path=([^&]+)/);
    if (match && match[1]) {
      let p = match[1].trim();
      if (p && p !== 'index' && p !== 'api') return p;
    }
  }

  // 4. Extract directly from URL pathname (e.g. /api/booking/create -> booking/create)
  let rawPath = parsedUrl.pathname || reqUrl.split('?')[0] || '';
  
  rawPath = rawPath
    .replace(/^\/?(api\/)?/, '')
    .replace(/^index\/?/, '')
    .replace(/\/$/, '')
    .trim();

  return rawPath;
}

export default async function handler(req, res) {
  try {
    const routePath = extractRoutePath(req);

    console.log(`[API ROUTER] Incoming Request -> Method: ${req.method}, URL: ${req.url}, Extracted Route: '${routePath}'`);

    if (!routePath || routePath === 'index' || routePath === 'api' || routePath === 'version') {
      return res.status(200).json({
        status: 'online',
        service: 'EZO STİLE v2 Central API Router',
        version: 'v2.0.6',
        commit: 'v2.0.6-booking-state-authoritative',
        environment: 'VERCEL_FUNCTIONS_SINGLE_ROUTER',
        timestamp: new Date().toISOString()
      });
    }

    const handlerFn = HANDLERS[routePath];
    if (handlerFn && typeof handlerFn === 'function') {
      return await handlerFn(req, res);
    }

    // Dynamic import fallback for any unlisted handler
    try {
      const handlerModule = await import(`../server/handlers/${routePath}.js`);
      if (handlerModule && typeof handlerModule.default === 'function') {
        return await handlerModule.default(req, res);
      }
    } catch (importErr) {
      console.warn(`[API ROUTER] Handler not found for route: '${routePath}'`, importErr.message);
    }

    return res.status(404).json({
      error: `API endpoint '${routePath}' bulunamadı veya Vercel Router tarafından eşleştirilemedi.`,
      routePath,
      url: req.url
    });

  } catch (err) {
    console.error('[API ROUTER ERROR]', err);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
}