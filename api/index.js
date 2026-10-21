import bookingAssistant from '../server/handlers/ai/booking-assistant.js';
import salonWorkspace from '../server/handlers/salon/workspace.js';
/* EZO STİLE v2 - Central Vercel Catch-All Router (1 Single Function for Vercel Hobby Limit) */
import url from 'url';

// EXPLICIT STATIC HANDLER REGISTRY (REQUIRED FOR VERCEL NFT BUNDLING)
import bookingCreate from '../server/handlers/booking/create.js';
import bookingUpdateStatus from '../server/handlers/booking/update-status.js';
import bookingRescheduleApprove from '../server/handlers/booking/reschedule-approve.js';
import bookingAvailability from '../server/handlers/booking/availability.js';
import bookingList from '../server/handlers/booking/list.js';
import customerHideAppointment from '../server/handlers/customer/hide-appointment.js';
import staffContext from '../server/handlers/staff/context.js';
import staffAdd from '../server/handlers/staff/add.js';
import staffCreateInvite from '../server/handlers/staff/create-invite.js';
import staffAcceptInvite from '../server/handlers/staff/accept-invite.js';
import staffListInvites from '../server/handlers/staff/list-invites.js';
import staffCancelInvite from '../server/handlers/staff/cancel-invite.js';
import staffUpdate from '../server/handlers/staff/update.js';
import staffUpdateSchedule from '../server/handlers/staff/update-schedule.js';
import staffUpdatePhoto from '../server/handlers/staff/update-photo.js';
import staffUpdateSelfProfile from '../server/handlers/staff/update-self-profile.js';
import salonApply from '../server/handlers/salon/apply.js';
import salonApprove from '../server/handlers/salon/approve.js';
import salonToggleStatus from '../server/handlers/salon/toggle-status.js';
import salonToggleDiscovery from '../server/handlers/salon/toggle-discovery.js';
import salonSyncPublic from '../server/handlers/salon/sync-public.js';
import aiAnalyze from '../server/handlers/ai/analyze.js';
import aiGenerate from '../server/handlers/ai/generate.js';
import aiRefund from '../server/handlers/ai/refund.js';
import aiRewardedAd from '../server/handlers/ai/rewarded-ad.js';
import authResolveRole from '../server/handlers/auth/resolve-role.js';
import authConfig from '../server/handlers/auth/config.js';
import authRegisterProfile from '../server/handlers/auth/register-profile.js';
import { requireAuth } from '../server/firebase-admin.js';
import authWelcomeBonus from '../server/handlers/auth/welcome-bonus.js';
import paymentsCreate from '../server/handlers/payments/create.js';
import paymentsStatus from '../server/handlers/payments/status.js';
import paymentsRefund from '../server/handlers/payments/refund.js';
import paymentsPaytrCallback from '../server/handlers/payments/paytr-callback.js';
import paymentsVerifyGoogle from '../server/handlers/payments/verify-google.js';
import paymentsVerifyApple from '../server/handlers/payments/verify-apple.js';
import reviewsSubmit from '../server/handlers/reviews/submit.js';
import reviewsPublicList from '../server/handlers/reviews/public-list.js';
import salonUpdateProfile from '../server/handlers/salon/update-profile.js';
import auditLog from '../server/handlers/audit/log.js';
import userToggleStatus from '../server/handlers/user/toggle-status.js';
import notificationsSend from '../server/handlers/notifications/send.js';
import notificationsCheckReminders from '../server/handlers/notifications/check-reminders.js';
import notificationsPushToken from '../server/handlers/notifications/push-token.js';
import { hasPermission } from '../src/staff-permissions.js';

const HANDLERS = {
  'salon/workspace': salonWorkspace,
  'ai/booking-assistant': bookingAssistant,
  'booking/create': bookingCreate,
  'booking/update-status': bookingUpdateStatus,
  'booking/reschedule-approve': bookingRescheduleApprove,
  'booking/availability': bookingAvailability,
  'booking/list': bookingList,
  'customer/hide-appointment': customerHideAppointment,
  'staff/context': staffContext,
  'staff/add': staffAdd,
  'staff/create-invite': staffCreateInvite,
  'staff/accept-invite': staffAcceptInvite,
  'staff/list-invites': staffListInvites,
  'staff/cancel-invite': staffCancelInvite,
  'staff/update': staffUpdate,
  'staff/update-schedule': staffUpdateSchedule,
  'staff/update-photo': staffUpdatePhoto,
  'staff/update-self-profile': staffUpdateSelfProfile,
  'salon/apply': salonApply,
  'salon/approve': salonApprove,
  'salon/toggle-status': salonToggleStatus,
  'salon/toggle-discovery': salonToggleDiscovery,
  'salon/sync-public': salonSyncPublic,
  'ai/analyze': aiAnalyze,
  'ai/generate': aiGenerate,
  'ai/refund': aiRefund,
  'ai/rewarded-ad': aiRewardedAd,
  'auth/resolve-role': authResolveRole,
  'auth/config': authConfig,
  'auth/register-profile': authRegisterProfile,
  'auth/welcome-bonus': authWelcomeBonus,
  'payments/create': paymentsCreate,
  'payments/status': paymentsStatus,
  'payments/refund': paymentsRefund,
  'payments/paytr-callback': paymentsPaytrCallback,
  'payments/verify-google': paymentsVerifyGoogle,
  'payments/verify-apple': paymentsVerifyApple,
  'reviews/submit': reviewsSubmit,
  'reviews/public-list': reviewsPublicList,
  'salon/update-profile': salonUpdateProfile,
  'audit/log': auditLog,
  'user/toggle-status': userToggleStatus,
  'notifications/send': notificationsSend,
  'notifications/check-reminders': notificationsCheckReminders
  ,'notifications/push-token': notificationsPushToken
};

const ACTOR_FIELDS = {
  'ai/generate': ['userUid'],
  'ai/refund': ['userUid'],
  'ai/rewarded-ad': ['userUid'],
  'auth/welcome-bonus': ['userUid'],
  'booking/update-status': ['userUid'],
  'booking/reschedule-approve': ['userUid'],
  'salon/apply': ['applicantUid'],
  'salon/toggle-status': ['superAdminUid'],
  'salon/toggle-discovery': ['superAdminUid'],
  'staff/create-invite': ['ownerUid'],
  'staff/add': ['ownerUid'],
  'reviews/submit': ['customerUid'],
  'user/toggle-status': ['superAdminUid'],
  'payments/create': ['userUid'],
  'payments/verify-google': ['userUid'],
  'payments/verify-apple': ['userUid'],
  'payments/status': ['callerUid'],
  'payments/refund': ['superAdminUid']
};

export function enforceAuthenticatedIdentity(routePath, req) {
  const body = req.body || {};
  if (routePath === 'booking/create') {
    if (['barber','manager','receptionist'].includes(req.auth.profile?.role) && req.auth.profile.businessId !== body.businessId) {
      throw Object.assign(new Error('Çalışan yalnız kendi salonunda randevu oluşturabilir.'), {statusCode:403});
    }
    if (body.isManual) {
      const profile = req.auth.profile || {};
      const staffRoles = ['super_admin', 'owner', 'manager', 'receptionist', 'barber'];
      const canCreate = profile.role === 'super_admin' || profile.role === 'owner' ||
        ['manager', 'receptionist', 'barber'].includes(profile.role);
      if (!staffRoles.includes(profile.role) || !canCreate || (profile.role !== 'super_admin' && profile.businessId !== body.businessId)) {
        const error = new Error('Manuel randevu için salon personeli yetkisi gerekli.');
        error.statusCode = 403;
        throw error;
      }
    } else {
      if (body.customerUid && body.customerUid !== req.auth.uid) {
        const error = new Error('Başka bir kullanıcı adına randevu oluşturamazsınız.');
        error.statusCode = 403;
        throw error;
      }
      body.customerUid = req.auth.uid;
    }
  }
  for (const field of ACTOR_FIELDS[routePath] || []) {
    if (body[field] && body[field] !== req.auth.uid) {
      const error = new Error('İstek kimliği doğrulanmış oturumla eşleşmiyor.');
      error.statusCode = 403;
      throw error;
    }
    body[field] = req.auth.uid;
  }
  if (['payments/create', 'payments/verify-google', 'payments/verify-apple'].includes(routePath) && body.businessId) {
    const profile = req.auth.profile || {};
    if (profile.role !== 'owner' || profile.businessId !== body.businessId) {
      const error = new Error('Ödeme salonu yetkisi geçersiz.'); error.statusCode = 403; throw error;
    }
  }
  req.body = body;
}

function extractRoutePath(req) {
  const reqUrl = req.url || '';
  const parsedUrl = url.parse(reqUrl, true);

  // 0. Query object populated by the platform (string or catch-all array)
  const platformPath = req.query && req.query.path;
  if (platformPath) {
    const p = (Array.isArray(platformPath) ? platformPath.join('/') : String(platformPath)).trim();
    if (p && p !== 'index' && p !== 'api') return p;
  }

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

    // Route only: query strings may carry personal data and must not reach platform logs.
    console.log(`[API ROUTER] ${req.method} '${routePath}'`);

        if (!routePath || routePath === 'index' || routePath === 'api' || routePath === 'version') {
      return res.status(200).json({
        status: 'online',
        service: 'EZO STİLE v2 Central API Router',
        version: 'v2.2.0-master-fix',
        commit: process.env.VERCEL_GIT_COMMIT_SHA || 'v2.2.0-master-fix',
        environment: 'VERCEL_FUNCTIONS_SINGLE_ROUTER',
        timestamp: new Date().toISOString()
      });
    }

    const handlerFn = HANDLERS[routePath];
    if (handlerFn && typeof handlerFn === 'function') {
      if (routePath === 'notifications/check-reminders') {
        const cronSecret = process.env.CRON_SECRET;
        if (!cronSecret) return res.status(503).json({ error: 'CRON_SECRET yapılandırılmamış.' });
        if (!req.headers || req.headers.authorization !== `Bearer ${cronSecret}`) {
          return res.status(401).json({ error: 'Cron yetkilendirmesi geçersiz.' });
        }
      } else if (routePath === 'reviews/public-list') {
        if (req.headers && (req.headers.authorization || req.headers.Authorization)) {
          try { req.auth = await requireAuth(req); }
          catch (error) { return res.status(error.statusCode || 503).json({ error: error.message, code: error.code }); }
        } else { req.auth = null; }
      } else if (!['auth/config', 'payments/paytr-callback'].includes(routePath)) {
        try {
          req.auth = await requireAuth(req);
          enforceAuthenticatedIdentity(routePath, req);
        } catch (authError) {
          return res.status(authError.statusCode || 503).json({ error: authError.message, code: authError.code });
        }
      }
      return await handlerFn(req, res);
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
