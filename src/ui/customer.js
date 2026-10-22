import { SALON_TYPES, discoverSalons, salonTypeLabel, validPoint, uniquePlaceNames } from '../salon-discovery.js';
import { renderAvailabilityHints } from './booking-availability-hints.js';
import { staffCanProvideService } from '../booking-selection.js';
import { brandingStyle } from '../brand-colors.js';

// TURKISH CHARACTER CASE-INSENSITIVE NORMALIZATION HELPER (REQUIREMENT 5)
function trNormalize(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c');
}
/* UNELIVO - Customer Final Panel (Notification Center, Photo Upload, Password Change, Cancel & 6-Hour Reschedule Requests, VIP Modals) */
import { getAppointmentsForCustomer, fetchRecord, saveRecord, subscribeToPath, subscribeToQuery } from '../db.js';
import { changeCurrentUserPassword, getSessionGeneration, isSessionCurrent, updateUserLanguage, logoutUserSession } from '../auth.js';
import { SUPPORTED_LANGUAGES, applyDocumentLanguage, t, autoTranslateCustomContent } from '../config.js';
import { showSuccessModal, showErrorModal, showConfirmModal } from './portal.js';
const renderAiConsultantScreen = async (...args) => (await import('./ai-consultant.js')).renderAiConsultantScreen(...args);
import { authenticatedFetch } from '../firebase.js';
import { normalizePublicBusinesses, normalizePublicSalonSlug, resolvePublicBusinessBySlug } from '../public-businesses.js';
import { uiIcon } from './icons.js';
import { appointmentHasEnded, effectiveAppointmentStatus } from '../appointment-lifecycle.js';
import { disablePushNotifications, enablePushNotifications, getPushPermissionState } from '../push-notifications.js';
import { triggerTouchNavIconBounce } from './nav-bounce.js';
import { createSalonDetailModel, renderSalonDetailSummary, renderSalonDetailTabs, renderSalonDetailSection, SALON_DETAIL_SECTIONS } from './salon-detail-shared.js';

export function formatPersonName(value) {
  return String(value || '')
    .trim()
    .replace(/[<>&"'`]/g, '')
    .replace(/\s+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map(part => part.charAt(0).toLocaleUpperCase('tr-TR') + part.slice(1).toLocaleLowerCase('tr-TR'))
    .join(' ');
}
function escapeCustomerText(value) { return String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;'); }

function normalizeCoordinate(value, min, max) {
  if (value === null || value === undefined || typeof value === 'boolean') return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const num = Number(raw);
  if (!Number.isFinite(num) || num < min || num > max) return null;
  return num;
}

export function sanitizeProfilePhotoUrl(value) {
  const url = String(value || '').trim();
  if (!url) return '';
  if (/^https:\/\/[^\s]+$/i.test(url)) return url;
  if (/^data:image\/(?:jpeg|png|webp);base64,[a-z0-9+/=]+$/i.test(url)) return url;
  return '';
}

function renderCustomerAvatar(user, displayName, size = 44) {
  const photoUrl = sanitizeProfilePhotoUrl(user && user.photoUrl);
  const parts = displayName.split(' ').filter(Boolean);
  const initials = (parts.length > 1 ? parts[0][0] + parts.at(-1)[0] : displayName.slice(0, 2)).toLocaleUpperCase('tr-TR');
  return photoUrl
    ? `<img src="${photoUrl}" class="customer-avatar" style="width:${size}px;height:${size}px" alt="${displayName}">`
    : `<span class="customer-avatar customer-avatar--fallback" style="width:${size}px;height:${size}px" aria-label="${displayName}">${initials}</span>`;
}

function renderStaffAvatar(staff, size = 38) {
  const name = formatPersonName((staff && (staff.displayName || staff.name)) || t('ownerUi_076'));
  const photoUrl = sanitizeProfilePhotoUrl(staff && (staff.photoUrl || staff.profileImageUrl));
  return photoUrl ? `<img class="customer-avatar" style="width:${size}px;height:${size}px" src="${photoUrl}" alt="${name}">` : `<span class="customer-avatar customer-avatar--fallback" style="width:${size}px;height:${size}px">${name.slice(0, 1)}</span>`;
}


/* UNELIVO - Single Authoritative Customer Booking Flow (v2.0.6) */
/* UNELIVO - Single Authoritative Customer Booking Architecture (v2.0.8) */
let activeCustomerTab = 'home';
let activeCustomerAppointmentCategory = 'pending';
let customerRenderSequence=0;
let currentBookingSlots = [], currentBookingStaffBySlot = {}, bookingBranding = null;
function bookingToday(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
let customerBookingDraft = {
  flowId: null,
  businessId: null,
  businessName: null,
  serviceId: null,
  serviceName: null,
  servicePrice: null,
  serviceDuration: 30,
  staffId: null,
  staffName: null,
  date: null,
  time: null
};
let customerBookingReturnContext = null;

let cachedCurrentServices = [];
let cachedCurrentStaff = [];

let isServicePickerExpanded = false;
let isStaffPickerExpanded = false;
let isDatePickerExpanded = false;
let currentCustomerUser = null;
let currentCustomerOnTabChange = null;
const recentlyCreatedCustomerAppointments = new Map();
const welcomeShownForSession = new Set();
let currentCustomerAppointmentsById = new Map();
let customerRescheduleDraft = null;
let customerLightboxImages = [];
let customerLightboxIndex = 0;
let currentFavoriteSalonIds = new Set();
let salonDetailState = null;

function mergeRecentCustomerAppointments(appointments, customerUid) {
  const merged = new Map();
  for (const [id, apt] of recentlyCreatedCustomerAppointments) {
    if (apt && apt.customerUid === customerUid) merged.set(id, apt);
  }
  // Authoritative server records must win after an owner changes the status.
  for (const apt of (appointments || []).filter(Boolean)) {
    const id = apt.aptId || apt.appointmentId;
    if (id) {
      merged.set(id, apt);
      recentlyCreatedCustomerAppointments.delete(id);
    }
  }
  return Array.from(merged.values());
}

function rerenderCurrentCustomer() {
  if (currentCustomerUser) {
    return renderCustomerScreen(currentCustomerUser, currentCustomerOnTabChange);
  }
}

async function readPublicSalonReviews(businessId, offset = 0) {
  const request = currentCustomerUser && !currentCustomerUser.isPublicGuest ? authenticatedFetch : fetch;
  const response = await request('/api/reviews/public-list', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ businessId, limit: 5, offset }) });
  const payload = await response.json();
  if (!response.ok || payload.success !== true) throw new Error(payload.error || t('uiRemaining_156'));
  return {
    reviews: Array.isArray(payload.reviews) ? payload.reviews : [],
    hasMore: payload.hasMore === true,
    reviewEligibility: payload.reviewEligibility || { mode: 'none' },
    eligibleAppointments: Array.isArray(payload.eligibleAppointments) ? payload.eligibleAppointments : []
  };
}

function reviewActionMarkup() {
  const state = salonDetailState;
  const eligibility = state && state.reviewEligibility;
  if (!state || !eligibility || !currentCustomerUser || currentCustomerUser.isPublicGuest) return '';
  // Keep the composer compatible with the established API response: older
  // responses expose the single eligible appointment via reviewEligibility.
  // The server still remains the authority for ownership/completed checks.
  const appointments = (state.eligibleAppointments || []).length
    ? state.eligibleAppointments
    : (eligibility.mode === 'create' && eligibility.appointmentId ? [{ appointmentId: eligibility.appointmentId }] : []);
  const editing = state.reviewComposerMode === 'edit' && eligibility.mode === 'edit';
  const selected = editing
    ? { appointmentId: eligibility.appointmentId, date:'', time:'', serviceName:'', staffName:'' }
    : appointments.find(item => item.appointmentId === state.selectedReviewAppointmentId) || appointments[0];
  if (!selected) {
    if (eligibility.mode === 'edit') return `<button class="btn btn-secondary salon-detail-more" type="button" onclick="window.beginSharedReviewEdit()">${t('uiRemaining_149')}</button>`;
    if (eligibility.mode === 'readonly') return `<p class="public-empty">${t('uiRemaining_150')}</p>`;
    return `<p class="public-empty">${t('salonDetailReviewRequiresCompleted')}</p>`;
  }
  const rating = Math.min(5, Math.max(1, Number(state.reviewDraftRating || (editing ? eligibility.rating : 5)) || 5));
  const comment = state.reviewDraftComment == null ? String(editing ? eligibility.comment || '' : '') : state.reviewDraftComment;
  const appointmentLabel = item => [item.date, item.time, item.serviceName, item.staffName].filter(Boolean).join(' · ');
  const selectHtml = !editing && appointments.length > 1 ? `<label class="salon-review-composer__label" for="shared-review-appointment">${t('salonDetailChooseAppointment')}</label><select id="shared-review-appointment" class="input-field" onchange="window.selectSharedReviewAppointment(this.value)">${appointments.map(item => `<option value="${escapeCustomerText(item.appointmentId)}" ${item.appointmentId === selected.appointmentId ? 'selected' : ''}>${escapeCustomerText(appointmentLabel(item))}</option>`).join('')}</select>` : '';
  const editAction = !editing && eligibility.mode === 'edit' ? `<button class="btn btn-secondary salon-review-composer__edit" type="button" onclick="window.beginSharedReviewEdit()">${t('uiRemaining_149')}</button>` : '';
  return `<form class="salon-review-composer" onsubmit="event.preventDefault();window.submitSharedSalonReview()"><h3>${t('salonDetailRateExperience')}</h3><p>${t('salonDetailRatePrompt')}</p>${selectHtml}<div class="salon-review-stars" role="group" aria-label="${t('salonDetailRateExperience')}">${[1,2,3,4,5].map(value => `<button type="button" class="${value <= rating ? 'is-selected' : ''}" aria-label="${t('salonDetailStarLabel', null, { value })}" aria-pressed="${value === rating ? 'true' : 'false'}" data-review-rating="${value}" onclick="window.setSharedReviewRating(${value})">${uiIcon('star')}</button>`).join('')}</div><label class="salon-review-composer__label" for="shared-review-comment">${t('uiRemaining_155')}</label><textarea id="shared-review-comment" class="input-field" maxlength="2000" aria-describedby="shared-review-count" rows="4" placeholder="${t('salonDetailReviewPlaceholder')}" oninput="window.updateSharedReviewComment(this.value)">${escapeCustomerText(comment)}</textarea><output id="shared-review-count" class="salon-review-count" for="shared-review-comment" dir="ltr">${comment.length} / 2000</output><button class="btn btn-gold" type="submit">${t('salonDetailSubmitReview')}</button>${editAction}</form>`;
}

async function renderSharedSalonDetail() {
  const state = salonDetailState;
  if (!state) return;
  const previousScroll = document.querySelector('.salon-detail-sheet .salon-detail-layout')?.scrollTop || 0;
  if (state.activeSection === 'reviews' && state.reviews === null) {
    const reviewUser = currentCustomerUser;
    const requestId = state.reviewRequestId = (state.reviewRequestId || 0) + 1;
    let loaded;
    try { loaded = await readPublicSalonReviews(state.model.businessId); }
    catch (error) {
      if (salonDetailState === state && currentCustomerUser === reviewUser && state.reviewRequestId === requestId) showErrorModal(t('errorTitle'), error.message || t('uiRemaining_156'));
      return;
    }
    if (currentCustomerUser !== reviewUser || state.reviewRequestId !== requestId) return;
    if (!salonDetailState || salonDetailState !== state) return;
    state.reviews = loaded.reviews;
    state.reviewHasMore = loaded.hasMore;
    state.reviewEligibility = loaded.reviewEligibility;
    state.eligibleAppointments = loaded.eligibleAppointments;
    if (state.reviewEligibility.mode !== 'edit') state.reviewComposerMode = 'create';
    if (!state.selectedReviewAppointmentId && state.eligibleAppointments.length) state.selectedReviewAppointmentId = state.eligibleAppointments[0].appointmentId;
  }
  const favoriteHtml = state.mode === 'modal' && currentCustomerUser && !currentCustomerUser.isPublicGuest
    ? `<button type="button" class="btn btn-secondary salon-detail-more" onclick="window.toggleFavoriteSalon('${state.model.businessId}')">${currentFavoriteSalonIds.has(state.model.businessId) ? t('uiRemaining_151') : t('uiRemaining_152')}</button>` : '';
  const contactPhone = String(state.model.business.phone || '').replace(/[^+0-9]/g, '');
  const customerContacts = state.mode !== 'public' ? `<div class="customer-salon-contacts">${state.model.directionsUrl ? `<a class="btn btn-secondary" href="${escapeCustomerText(state.model.directionsUrl)}" target="_blank" rel="noopener noreferrer">${uiIcon('mapPin')}${t('uiRemaining_006')}</a>` : ''}${/^\+?\d{7,15}$/.test(contactPhone) ? `<a class="btn btn-secondary" href="tel:${contactPhone}">${uiIcon('phone')}${escapeCustomerText(state.model.business.phone)}</a>` : ''}${['instagram', 'whatsapp'].filter(key => state.model.socials[key]).map(key => `<a class="btn btn-secondary" href="${escapeCustomerText(state.model.socials[key])}" target="_blank" rel="noopener noreferrer">${uiIcon(key)}${key === 'instagram' ? 'Instagram' : 'WhatsApp'}</a>`).join('')}${state.model.business.publicSlug ? `<a class="btn btn-secondary" href="/salon/${encodeURIComponent(state.model.business.publicSlug)}" target="_blank" rel="noopener noreferrer">${uiIcon('globe')}${t('uiRemaining_003')}</a>` : ''}</div>` : '';
  const body = `<div class="salon-detail-layout"><div class="salon-detail-overview">${renderSalonDetailSummary(state.model, escapeCustomerText)}${customerContacts}</div><div class="salon-detail-workspace">${renderSalonDetailTabs(state.activeSection)}${renderSalonDetailSection(state.model, state.activeSection, { escape: escapeCustomerText, renderStaffAvatar, reviews: state.reviews, reviewLimit: state.reviewLimit, canLoadMore: state.reviewHasMore, favoriteHtml, reviewActionHtml: reviewActionMarkup() })}</div></div>`;
  const bookButton = `<button type="button" onclick="window.beginNewBookingFromSalonById('${state.model.businessId}')" class="btn btn-gold salon-detail-cta" ${state.model.business.bookingEnabled === false ? 'disabled' : ''}>${state.model.business.bookingEnabled === false ? t('uiRemaining_016') : t('uiRemaining_017')}</button>`;
  if (state.mode === 'public') {
    document.body.classList.add('public-storefront-mode');
    const container = document.getElementById('app-container');
    if (!container) return;
    container.innerHTML = `<div class="public-storefront-page animate-fade" style="${brandingStyle(state.model.business.branding)}"><header class="public-storefront-header"><a href="/" aria-label="${t('uiRemaining_147')}">UNELIVO</a><span>${t('uiRemaining_003')}</span></header><main class="public-storefront-content salon-detail-surface salon-brand" style="${brandingStyle(state.model.business.branding)}">${body}<footer class="salon-detail-footer">${bookButton}</footer></main></div>`;
  } else {
    document.body.classList.add('modal-open');
    document.body.style.overflow = 'hidden';
    const root = document.getElementById('modal-root');
    if (!root) return;
    root.innerHTML = `<div class="modal-overlay salon-detail-overlay" onclick="window.closeModal()"><div class="modal-card salon-detail-sheet salon-detail-surface salon-brand animate-fade" style="${brandingStyle(state.model.business.branding)}" role="dialog" aria-modal="true" aria-label="${escapeCustomerText(state.model.business.name)}" onclick="event.stopPropagation()"><div class="salon-detail-sticky-header"><strong>${escapeCustomerText(state.model.business.name || t('staffUi_59'))}</strong><button type="button" class="icon-button" aria-label="${t('closeBtn')}" onclick="window.closeModal()">${uiIcon('x')}</button></div>${body}<footer class="salon-detail-footer">${bookButton}</footer></div></div>`;
  }
  const scroller = document.querySelector('.salon-detail-sheet .salon-detail-layout');
  if (scroller) scroller.scrollTop = previousScroll;
}

function installSharedSalonDetailActions() {
  window.selectSalonDetailSection = async section => {
    if (!salonDetailState || !SALON_DETAIL_SECTIONS.includes(section)) return;
    if (section === 'reviews') {
      salonDetailState.reviews = null;
      salonDetailState.selectedReviewAppointmentId = null;
    }
    salonDetailState.activeSection = section;
    await renderSharedSalonDetail();
    const activeTab = document.querySelector('.salon-detail-surface .salon-detail-tabs .is-active');
    activeTab?.focus({ preventScroll: true });
    const reduced = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    activeTab?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: reduced ? 'auto' : 'smooth' });
  };
  window.loadMoreSalonReviews = async () => {
    const state = salonDetailState;
    const reviewUser = currentCustomerUser;
    if (!state) return;
    const requestId = state.reviewRequestId;
    try {
      const loaded = await readPublicSalonReviews(state.model.businessId, (state.reviews || []).length);
      if (salonDetailState !== state || currentCustomerUser !== reviewUser || state.reviewRequestId !== requestId) return;
      state.reviews = [...(state.reviews || []), ...loaded.reviews];
      state.reviewHasMore = loaded.hasMore;
      state.reviewLimit = state.reviews.length;
      await renderSharedSalonDetail();
    } catch (error) {
      if (salonDetailState === state && currentCustomerUser === reviewUser) showErrorModal(t('errorTitle'), error.message || t('uiRemaining_156'));
    }
  };
  window.openSharedSalonGallery = index => {
    if (!salonDetailState) return;
    customerLightboxImages = salonDetailState.model.gallery;
    customerLightboxIndex = Math.max(0, Math.min(customerLightboxImages.length - 1, Number(index) || 0));
    const root = document.getElementById('modal-root');
    if (!root || !customerLightboxImages.length) return;
    root.innerHTML = `<div class="customer-lightbox" onclick="window.closeModal()"><button class="icon-button customer-lightbox-close" aria-label="${t('closeBtn')}" onclick="window.closeModal()">${uiIcon('x')}</button><img onclick="event.stopPropagation()" src="${escapeCustomerText(customerLightboxImages[customerLightboxIndex])}" alt="${t('uiRemaining_018')}"></div>`;
  };
  window.openSharedSalonReviewModal = mode => {
    const eligibility = salonDetailState && salonDetailState.reviewEligibility;
    if (!salonDetailState || !eligibility || !eligibility.appointmentId) return;
    salonDetailState.reviewComposerMode = mode === 'edit' ? 'edit' : 'create';
    salonDetailState.selectedReviewAppointmentId = eligibility.appointmentId;
    salonDetailState.reviewDraftRating = Number(eligibility.rating) || 5;
    salonDetailState.reviewDraftComment = String(eligibility.comment || '');
    const root = document.getElementById('modal-root');
    if (!root) return;
    root.innerHTML = `<div class="modal-overlay" onclick="window.closeModal()"><div class="modal-card animate-fade" onclick="event.stopPropagation()"><div class="salon-detail-sticky-header"><strong>${mode === 'edit' ? t('uiRemaining_149') : t('uiRemaining_148')}</strong><button class="icon-button" aria-label="${t('closeBtn')}" onclick="window.closeModal()">${uiIcon('x')}</button></div>${reviewActionMarkup()}</div></div>`;
  };
  window.selectSharedReviewAppointment = appointmentId => {
    const state = salonDetailState;
    if (!state || !(state.eligibleAppointments || []).some(item => item.appointmentId === appointmentId)) return;
    state.selectedReviewAppointmentId = appointmentId;
    state.reviewDraftRating = 5;
    state.reviewDraftComment = '';
    renderSharedSalonDetail();
  };
  window.setSharedReviewRating = rating => {
    if (!salonDetailState || !Number.isInteger(Number(rating)) || rating < 1 || rating > 5) return;
    salonDetailState.reviewDraftRating = Number(rating);
    document.querySelectorAll('[data-review-rating]').forEach(button => {
      const value = Number(button.dataset.reviewRating);
      button.classList.toggle('is-selected', value <= Number(rating));
      button.setAttribute('aria-pressed', String(value === Number(rating)));
    });
  };
  window.updateSharedReviewComment = value => {
    if (salonDetailState) salonDetailState.reviewDraftComment = String(value || '').slice(0, 2000);
    const counter = document.getElementById('shared-review-count');
    if (counter) counter.textContent = `${String(value || '').slice(0, 2000).length} / 2000`;
  };
  window.beginSharedReviewEdit = () => {
    const state = salonDetailState;
    const eligibility = state && state.reviewEligibility;
    if (!state || !eligibility || eligibility.mode !== 'edit') return;
    state.reviewComposerMode = 'edit';
    state.reviewDraftRating = Number(eligibility.rating) || 5;
    state.reviewDraftComment = String(eligibility.comment || '');
    renderSharedSalonDetail();
  };
  window.submitSharedSalonReview = async () => {
    const state = salonDetailState;
    const eligibility = state && state.reviewEligibility;
    const appointmentId = state && state.reviewComposerMode === 'edit'
      ? eligibility && eligibility.appointmentId
      : state && (state.selectedReviewAppointmentId || (eligibility && eligibility.mode === 'create' ? eligibility.appointmentId : null));
    if (!state || !appointmentId) return;
    const rating = Number(state.reviewDraftRating || 5);
    const comment = String(state.reviewDraftComment || '');
    const response = await authenticatedFetch('/api/reviews/submit', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ businessId: state.model.businessId, appointmentId, rating, comment, mode: state.reviewComposerMode === 'edit' ? 'edit' : 'create' }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) return showErrorModal(t('errorTitle'), result.error || t('uiRemaining_156'));
    state.model.business.averageRating = result.averageRating;
    state.model.business.reviewCount = result.ratingCount;
    state.model.rating = Number(result.averageRating) || null;
    state.model.reviewCount = Number(result.ratingCount) || 0;
    state.reviews = null;
    state.reviewEligibility = { mode:'none' };
    state.eligibleAppointments = [];
    state.selectedReviewAppointmentId = null;
    state.reviewComposerMode = 'create';
    state.reviewDraftRating = 5;
    state.reviewDraftComment = '';
    await renderSharedSalonDetail();
    showSuccessModal(t('successTitle'), result.mode === 'edit' ? t('uiRemaining_157') : t('uiRemaining_158'));
  };
}

async function renderPublicStorefrontDirect(biz) {
  installSharedSalonDetailActions();
  salonDetailState = { model: createSalonDetailModel(biz, { escape: escapeCustomerText, sanitizeImageUrl: sanitizeProfilePhotoUrl }), mode: 'public', activeSection: 'about', reviews: null, reviewHasMore: false, reviewEligibility: { mode:'none' }, eligibleAppointments: [], selectedReviewAppointmentId: null, reviewComposerMode: 'create', reviewDraftRating: 5, reviewDraftComment: '', reviewLimit: 5 };
  return renderSharedSalonDetail();

  /* Legacy eager storefront markup is retained below only as a migration fallback.
     The shared renderer above is the active public and in-app detail surface. */
  const container = document.getElementById('app-container');
  const modalRoot = document.getElementById('modal-root');
  if (!container) return;
  const businessId = String(biz.businessId || '');
  const media = biz.media || {};
  const coverUrl = media.coverImageUrl || biz.coverPhoto || biz.coverImageUrl || media.profileImageUrl || biz.photoUrl || './assets/images/unelivo-placeholder.svg';
  const profileUrl = media.profileImageUrl || biz.logoUrl || biz.photoUrl || '';
  const services = Object.entries(biz.services || {}).map(([id, service]) => ({ ...(service || {}), id:(service && service.id) || id })).filter(service => service.active !== false);
  const staff = Object.values(biz.staff || {}).filter(member => member && member.active !== false);
  const reviewsResponse = await authenticatedFetch('/api/reviews/public-list', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ businessId }) }).catch(() => null);
  const reviewsPayload = reviewsResponse && reviewsResponse.ok ? await reviewsResponse.json().catch(() => ({})) : {};
  const reviews = Array.isArray(reviewsPayload.reviews) ? reviewsPayload.reviews : [];
  const ratingLabel = Number(biz.averageRating) > 0 ? `${Number(biz.averageRating).toFixed(1)} (${Number(biz.reviewCount) || reviews.length})` : t('uiRemaining_299');
  const scheduleOrder = [['monday',t('staffUi_9')],['tuesday',t('staffUi_10')],['wednesday',t('staffUi_11')],['thursday',t('staffUi_12')],['friday',t('staffUi_13')],['saturday',t('staffUi_14')],['sunday',t('staffUi_15')]];
  const todayKey = new Intl.DateTimeFormat('en-US', { timeZone:'Europe/Istanbul', weekday:'long' }).format(new Date()).toLowerCase();
  const todaySchedule = (biz.weeklySchedule || {})[todayKey];
  const todayStatus = todaySchedule && todaySchedule.isOpen === false ? t('uiRemaining_001') : t('uiRemaining_002');
  const scheduleHtml = scheduleOrder.map(([key, label]) => [key, label, (biz.weeklySchedule || {})[key]]).filter(([, , day]) => day && typeof day === 'object').map(([key, label, day]) => `<div class="salon-schedule-row ${key === todayKey ? 'is-today' : ''}"><span>${label}</span><strong>${day.isOpen === false ? t('staffUi_16') : `${escapeCustomerText(day.start || day.openTime || '09:00')}–${escapeCustomerText(day.end || day.closeTime || '20:00')}`}</strong></div>`).join('');
  const latitude = normalizeCoordinate(biz.latitude, -90, 90);
  const longitude = normalizeCoordinate(biz.longitude, -180, 180);
  const hasCoordinates = latitude !== null && longitude !== null && !(latitude === 0 && longitude === 0);
  const destination = hasCoordinates ? `${latitude},${longitude}` : [biz.address, biz.neighborhood, biz.district, biz.city].filter(Boolean).join(', ');
  const encodedDestination = encodeURIComponent(destination);
  const mapUrl = destination ? `https://www.google.com/maps?q=${encodedDestination}&output=embed` : '';
  const directionsUrl = destination ? `https://www.google.com/maps/dir/?api=1&destination=${encodedDestination}&travelmode=driving` : '';
  const socials = biz.socials || {};
  const socialHtml = Object.entries({ instagram:['Instagram','instagram'], whatsapp:['WhatsApp','whatsapp'], tiktok:['TikTok','music'], website:[t('uiRemaining_300'),'globe'] }).filter(([key]) => socials[key]).map(([key,[label,icon]]) => `<a class="btn btn-secondary" href="${escapeCustomerText(socials[key])}" target="_blank" rel="noopener noreferrer">${uiIcon(icon)} ${label}</a>`).join('');
  const gallery = (media.gallery || []).map(sanitizeProfilePhotoUrl).filter(Boolean);
  customerLightboxImages = gallery;
  customerLightboxIndex = 0;
  const renderReview = review => `<article class="public-review"><div><strong>${escapeCustomerText(review.customerName)}</strong><span>${uiIcon('star')} ${Number(review.rating) || 0}</span></div>${review.comment ? `<p>${escapeCustomerText(review.comment)}</p>` : ''}<small>${escapeCustomerText(String(review.createdAt || '').slice(0,10))}</small></article>`;

  container.innerHTML = `<div class="public-storefront-page animate-fade">
    <header class="public-storefront-header"><a href="/">UNELIVO</a><span>${t('uiRemaining_003')}</span></header>
    <main class="public-storefront-content">
      <section class="public-storefront-hero"><img class="public-storefront-cover" src="${escapeCustomerText(coverUrl)}" alt="${t('uiRemaining_004')}"></section>
      <section class="public-storefront-identity"><div class="public-storefront-summary">${profileUrl ? `<img class="public-storefront-logo" src="${escapeCustomerText(profileUrl)}" alt="${t('uiRemaining_005')}">` : ''}<div><h1>${escapeCustomerText(biz.name || t('staffUi_59'))}</h1><p>${escapeCustomerText(biz.category || '')}${biz.category ? ' • ' : ''}${escapeCustomerText([biz.neighborhood,biz.district,biz.city].filter(Boolean).join(' / '))}</p><div class="public-storefront-badges"><span>${uiIcon('star')} ${ratingLabel}</span><span class="${todaySchedule && todaySchedule.isOpen === false ? 'is-closed' : 'is-open'}">${todayStatus}</span></div></div></div>${biz.description ? `<p class="public-storefront-description">${escapeCustomerText(biz.description)}</p>` : ''}<div class="public-storefront-location">${uiIcon('mapPin')}<span>${escapeCustomerText([biz.address,biz.neighborhood,biz.district,biz.city].filter(Boolean).join(', '))}</span>${directionsUrl ? `<a href="${directionsUrl}" target="_blank" rel="noopener noreferrer">${t('uiRemaining_006')}</a>` : ''}</div></section>
      <div class="public-storefront-grid"><div class="public-storefront-main">
        <section class="public-storefront-section"><h2>${t('ownerUi_087')}</h2><div class="public-service-list">${services.length ? services.map(service => `<div class="public-service-row"><span>${escapeCustomerText(service.name)} (${Number(service.duration) || 30} ${t('ownerUi_109')})</span><strong>${Number(service.price) || 0} TL</strong>${biz.bookingEnabled !== false ? `<button class="btn btn-secondary public-service-book" onclick="window.beginNewBookingFromSalonById('${businessId}',decodeURIComponent('${encodeURIComponent(String(service.id))}'))">${t('uiRemaining_007')}</button>` : ''}</div>`).join('') : `<div class="public-empty">${t('uiRemaining_008')}</div>`}</div></section>
        <section class="public-storefront-section"><h2>${t('uiRemaining_301')}</h2><div class="salon-staff-grid">${staff.length ? staff.map(member => `<div class="salon-staff-card">${renderStaffAvatar(member,42)}<span><strong>${formatPersonName(member.displayName || member.name)}</strong><small>${escapeCustomerText(member.roleLabel || member.title || member.role || t('ownerUi_076'))}</small></span></div>`).join('') : `<div class="public-empty">${t('uiRemaining_009')}</div>`}</div></section>
        ${gallery.length ? `<section class="public-storefront-section"><h2>${t('ownerUi_274')}</h2><div class="public-storefront-gallery">${gallery.map((url,index) => `<button class="salon-gallery-thumb" onclick="window.openPublicStorefrontGallery(${index})"><img src="${escapeCustomerText(url)}" alt="${t('uiRemaining_010')} ${index+1}"></button>`).join('')}</div></section>` : ''}
        <section class="public-storefront-section"><h2>${uiIcon('star')} ${t('uiRemaining_302')} <small>${ratingLabel}</small></h2>${reviews.length ? reviews.slice(0,3).map(renderReview).join('') : `<div class="public-empty">${t('uiRemaining_011')}</div>`}${reviews.length > 3 ? `<details class="public-more-reviews"><summary>${t('uiRemaining_012')}${reviews.length-3})</summary>${reviews.slice(3).map(renderReview).join('')}</details>` : ''}</section>
      </div><aside class="public-storefront-side">${scheduleHtml ? `<section class="public-storefront-section"><h2>${uiIcon('clock')} ${t('uiRemaining_013')}</h2><div class="salon-schedule">${scheduleHtml}</div></section>` : ''}${destination || socialHtml ? `<section class="public-storefront-section"><h2>${uiIcon('mapPin')} ${t('uiRemaining_014')}</h2>${mapUrl ? `<iframe class="public-storefront-map" title="${t('uiRemaining_015')}" src="${mapUrl}" loading="lazy"></iframe>` : ''}${socialHtml ? `<div class="salon-social-grid">${socialHtml}</div>` : ''}${directionsUrl ? `<a href="${directionsUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary public-directions">${uiIcon('mapPin')} ${t('uiRemaining_006')}</a>` : ''}</section>` : ''}</aside></div>
      <button onclick="window.beginNewBookingFromSalonById('${businessId}')" class="btn btn-gold salon-detail-cta" ${biz.bookingEnabled === false ? 'disabled' : ''}>${biz.bookingEnabled === false ? t('uiRemaining_016') : t('uiRemaining_017')}</button>
    </main></div>`;

  window.openPublicStorefrontGallery = index => {
    customerLightboxIndex = Math.max(0, Math.min(customerLightboxImages.length - 1, Number(index) || 0));
    if (!modalRoot || !customerLightboxImages.length) return;
    modalRoot.innerHTML = `<div class="customer-lightbox" onclick="window.closeModal()"><button class="icon-button customer-lightbox-close" aria-label="${t('closeBtn', currentLang)}" onclick="window.closeModal()">${uiIcon('x')}</button><img onclick="event.stopPropagation()" src="${escapeCustomerText(customerLightboxImages[customerLightboxIndex])}" alt="${t('uiRemaining_018')}"></div>`;
  };
}


export async function beginNewBookingFromSalonById(businessId, preferredServiceId = null) {
  try {
    if (currentCustomerUser && currentCustomerUser.isPublicGuest === true) {
      history.replaceState({}, '', '/');
      if (typeof currentCustomerOnTabChange === 'function') await currentCustomerOnTabChange(null);
      // Routing to login clears the previous session; preserve booking intent afterward.
      sessionStorage.setItem('ezo_pending_public_booking', String(businessId));
      if (preferredServiceId) sessionStorage.setItem('ezo_pending_public_booking_service', String(preferredServiceId));
      else sessionStorage.removeItem('ezo_pending_public_booking_service');
      if (typeof window.openCustomerAuthModal === 'function') window.openCustomerAuthModal();
      return;
    }
    document.body.classList.remove('public-storefront-mode');
    let businessName = t('staffUi_59');
    let preferredService = null;
    try {
      const bizData = await fetchRecord('public_businesses/' + businessId) || {};
      businessName = bizData.name || t('staffUi_59');
      preferredService = Object.entries(bizData.services || {}).map(([id, service]) => ({ ...(service || {}), id:(service && service.id) || id })).find(service => service.id === preferredServiceId) || null;
    } catch (e) {}

    customerBookingDraft = {
      flowId: 'flw_' + Date.now(),
      businessId: businessId,
      businessName: businessName,
      serviceId: preferredService ? preferredService.id : null,
      serviceName: preferredService ? preferredService.name : null,
      servicePrice: preferredService ? preferredService.price : null,
      serviceDuration: preferredService ? (Number(preferredService.duration) || 30) : 30,
      staffId: null,
      staffName: null,
      date: bookingToday(),
      time: null
    };
    customerBookingReturnContext = { businessId, tab: activeCustomerTab === 'booking' ? 'salons' : activeCustomerTab };

    // Cleanly close modal & body scroll locks
    try {
      window.closeModal();
    } catch (e) {}

    const modalRoot = document.getElementById('modal-root');
    if (modalRoot) modalRoot.innerHTML = '';
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';

    activeCustomerTab = 'booking';
    isServicePickerExpanded = !preferredService;
    isStaffPickerExpanded = Boolean(preferredService);
    isDatePickerExpanded = true;
    if (typeof window._currentRenderCustomerScreen === 'function') {
      window._currentRenderCustomerScreen();
    } else if (currentCustomerUser) {
      await renderCustomerScreen(currentCustomerUser, currentCustomerOnTabChange);
    }
  } catch (err) {
    console.error('Error in beginNewBookingFromSalonById:', err);
    try {
      window.closeModal();
    } catch (e) {}
    const modalRoot = document.getElementById('modal-root');
    if (modalRoot) modalRoot.innerHTML = '';
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
  }
}
window.beginNewBookingFromSalonById = beginNewBookingFromSalonById;
window.beginNewBookingFromSalon = beginNewBookingFromSalonById;
window.startSalonBookingFromDiscovery = beginNewBookingFromSalonById;
window.selectSalonForBooking = beginNewBookingFromSalonById;

let searchQuery = '';
let customerSalonFilter = 'all';
let discoveryFilters={type:'',city:'',district:'',origin:null,nearby:false,radius:0};
let discoveryLocationMessage='';
let discoveryLocating=false;
let discoverySession='';
let discoveryLocationSequence=0;




export async function renderCustomerScreen(user, onTabChange) {
  const renderGeneration = getSessionGeneration();
  const renderSequence=++customerRenderSequence;
  const container = document.getElementById('app-container');
  if (!container) return;

  // A restored customer session can render without the portal ever mounting.
  // Always install the modal lifecycle here so F5 cannot leave overlays frozen.
  window.closeModal = () => {
    const root = document.getElementById('modal-root');
    if (root) root.innerHTML = '';
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
  };

  const isPublicGuest = user && user.isPublicGuest === true;
  const currentLang = user.language || 'tr';
  applyDocumentLanguage(currentLang);

  // Fetch In-App Notifications
  const [notifsData, favoriteSalonsData, hiddenAppointmentsData] = isPublicGuest ? [{},{},{}] : await Promise.all([
    fetchRecord('notifications/' + user.uid), fetchRecord(`users/${user.uid}/favoriteSalons`), fetchRecord(`users/${user.uid}/hiddenAppointments`)
  ]).then(values=>values.map(value=>value||{}));
  const notificationCutoff = Date.now() - 24 * 60 * 60 * 1000;
  const notificationSeen = new Set();
  const notifList = Object.entries(notifsData).map(([id, item]) => ({ ...(item || {}), notificationId:(item && item.notificationId) || id })).filter(item => item && Date.parse(item.createdAt) >= notificationCutoff).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).filter(item => { const key=item.eventId || `${item.type || ''}|${item.appointmentId || ''}|${item.businessId || ''}|${item.title || ''}|${item.message || ''}`; if(notificationSeen.has(key)) return false; notificationSeen.add(key); return true; }).slice(0, 20);
  const unreadCount = notifList.filter(n => n && !n.read).length;
  const canUseCustomerMode = isPublicGuest || user.role === 'customer' || (user.role === 'owner' && user.portalMode === 'customer');
  if ((!isPublicGuest && !isSessionCurrent(user.uid, renderGeneration)) || !canUseCustomerMode) return;
  const discoveryKey=user.uid+':'+renderGeneration;
  if(discoverySession!==discoveryKey){discoverySession=discoveryKey;discoveryFilters={type:'',city:'',district:'',origin:null,nearby:false,radius:0};discoveryLocationMessage='';discoveryLocating=false;++discoveryLocationSequence;}
  currentCustomerUser = user;
  currentCustomerOnTabChange = onTabChange;
  window._currentOnTabChange = onTabChange;
  window._currentRenderCustomerScreen = () => renderCustomerScreen(user, onTabChange);
  const favoriteSalonIds = new Set(Object.entries(favoriteSalonsData).filter(([, enabled]) => enabled === true).map(([businessId]) => businessId));
  currentFavoriteSalonIds = favoriteSalonIds;
  installSharedSalonDetailActions();
  if(!window._unsubscribeCustomerPublicBusinesses)window._unsubscribeCustomerPublicBusinesses=subscribeToPath('public_businesses',()=>{if(['home','salons','favorites'].includes(activeCustomerTab))window._currentRenderCustomerScreen?.();});

  const displayName = formatPersonName(user.displayName || user.name || t('staffUi_6'));

  
    // Attach True Realtime Database SSE Listener for appointments
    if (!isPublicGuest && !window._unsubscribeCustomerRealtime) window._unsubscribeCustomerRealtime = subscribeToQuery('appointments', 'customerUid', user.uid, () => {
      console.log(' [Realtime SSE] Customer appointments updated via Firebase stream');
      if (salonDetailState) {
        salonDetailState.reviews = null;
        if (salonDetailState.activeSection === 'reviews' && document.querySelector('.salon-detail-surface')) renderSharedSalonDetail();
      }
      if (typeof window._currentRenderCustomerScreen === 'function') {
        window._currentRenderCustomerScreen();
      }
    });

    let mainHtml = '';

  if (activeCustomerTab === 'home') {
    const welcomeSessionKey = `${user.uid}:${renderGeneration}`;
    const showWelcome = !welcomeShownForSession.has(welcomeSessionKey);
    if (showWelcome) welcomeShownForSession.add(welcomeSessionKey);
    const homeFavorites = favoriteSalonIds.size ? normalizePublicBusinesses(await fetchRecord('public_businesses') || {}).filter(b => favoriteSalonIds.has(b.businessId) && b.status === 'active' && b.discoveryEnabled === true && b.hiddenFromDiscovery !== true && /^biz_[a-z0-9_-]+$/i.test(b.businessId)) : [];
    mainHtml = `
      ${showWelcome ? `<div id="customer-welcome-hero" class="card card-gold animate-fade" style="padding:20px;margin-bottom:16px;transition:opacity .35s ease,transform .35s ease;">
        <h3 style="font-size: 18px; font-weight: 800; color: var(--theme-ink-ffffff, #fff); margin-bottom: 4px;">
           ${t('uiRemaining_019')} ${displayName}
        </h3>
        <p style="font-size: 12px; color: var(--text-muted);">
          ${t('uiRemaining_020')}
        </p>
      </div>` : ''}

      <form id="customer-home-search" class="customer-search" role="search">
        ${uiIcon('search')}<input name="query" aria-label="${t('uiRemaining_021')}" placeholder="${t('uiRemaining_021')}" maxlength="120"><button type="submit" class="icon-button" aria-label="${t('discoverSalons', currentLang)}">${uiIcon('compass')}</button>
      </form>
      <section class="customer-brand-hero"><div><span class="customer-eyebrow">UNELIVO</span><h2>${t('bookAppointment', currentLang)}</h2><p>${t('uiRemaining_020')}</p><button type="button" class="btn btn-gold" data-customer-action="book">${t('bookAppointment', currentLang)} ${uiIcon('calendarPlus')}</button></div><img src="./assets/images/unelivo-placeholder.svg" alt="" aria-hidden="true"></section>
      <button type="button" class="btn btn-secondary" style="width:100%;margin-bottom:12px" onclick="window.openBookingAssistant()">Randevu asistanı · Yazışarak planla</button>
      <!-- CLEAN MAIN ACTION BUTTONS -->
      <div class="page-grid customer-quick-actions" style="margin-bottom: 16px;">
        <button type="button" class="card quick-action animate-fade" style="border-color: var(--gold-primary);" data-customer-action="book">
          ${uiIcon('calendarPlus')}
          <div style="font-size: 13px; font-weight: 800; color: var(--theme-ink-ffffff, #fff);">${t('bookAppointment', currentLang)}</div>
        </button>

        <button type="button" class="card quick-action animate-fade" data-customer-action="salons">
          ${uiIcon('store')}
          <div style="font-size: 13px; font-weight: 800; color: var(--theme-ink-ffffff, #fff);">${t('discoverSalons', currentLang)}</div>
        </button>

        <button type="button" class="card quick-action animate-fade" data-customer-action="ai">
          ${uiIcon('styleAi')}
          <div style="font-size: 13px; font-weight: 800; color: var(--theme-ink-ffffff, #fff);">${t('aiConsultant', currentLang)}</div>
        </button>

        <button type="button" class="card quick-action animate-fade" data-customer-action="appointments">
          ${uiIcon('calendar')}
          <div style="font-size: 13px; font-weight: 800; color: var(--theme-ink-ffffff, #fff);">${t('myAppointments', currentLang)}</div>
        </button>
      </div>
      ${homeFavorites.length ? `<section class="customer-home-favorites"><h3>${t('favorites', currentLang)}</h3><div class="customer-favorite-strip">${homeFavorites.map(b => `<button type="button" data-customer-salon="${escapeCustomerText(b.businessId)}"><img src="${escapeCustomerText(sanitizeProfilePhotoUrl(b.media?.coverImageUrl || b.coverImageUrl || b.photoUrl) || './assets/images/unelivo-placeholder.svg')}" alt="" loading="lazy"><strong>${escapeCustomerText(b.name)}</strong><small>${escapeCustomerText([b.district,b.city].filter(Boolean).join(' / '))}</small></button>`).join('')}</div></section>` : ''}
    `;
  } else if (activeCustomerTab === 'salons') {
    const allBusinessesData = (await fetchRecord('public_businesses')) || {};
    let salons = normalizePublicBusinesses(allBusinessesData).filter(b =>
      b &&
      /^biz_[a-z0-9_-]+$/i.test(String(b.businessId || '')) &&
      b.status === 'active' &&
      b.bookingEnabled !== false &&
      b.discoveryEnabled === true &&
      b.hiddenFromDiscovery !== true
    );

    const seenIds = new Set();
    salons = salons.filter(b => {
      if (seenIds.has(b.businessId)) return false;
      seenIds.add(b.businessId);
      return true;
    });

    if (searchQuery) {
      const q = trNormalize(searchQuery);
      salons = salons.filter(b => {
        const nameMatch = trNormalize(b.name).includes(q);
        const cityMatch = trNormalize(b.city).includes(q);
        const distMatch = trNormalize(b.district).includes(q);
        
        // Match service names offered by the salon
        const servicesData = b.services ? Object.values(b.services) : [];
        const serviceMatch = servicesData.some(s => s && trNormalize(s.name).includes(q));
        
        return nameMatch || cityMatch || distMatch || serviceMatch;
      });
    }
    if (customerSalonFilter === 'favorites') salons = salons.filter(b => favoriteSalonIds.has(b.businessId));
    const discoveryCities=uniquePlaceNames(salons.map(b=>b.city));
    const sameCity=(a,b)=>String(a||'').trim().toLocaleLowerCase('tr-TR')===String(b||'').trim().toLocaleLowerCase('tr-TR');const discoveryDistricts=uniquePlaceNames(salons.filter(b=>!discoveryFilters.city||sameCity(b.city,discoveryFilters.city)).map(b=>b.district));
    salons=discoverSalons(salons,discoveryFilters);

    const salonCardsHtml = salons.map(b => {
      const coverUrl = (b.media && (b.media.coverImageUrl || b.media.profileImageUrl)) || b.coverImageUrl || b.profileImageUrl || './assets/images/unelivo-placeholder.svg';
      const servicesText = b.services ? Object.values(b.services).map(service => service && service.name).filter(Boolean).join(' ') : '';
      const salonSearchText = encodeURIComponent(trNormalize([b.name, b.city, b.district, salonTypeLabel(b), servicesText].join(' ')));
      return `
        <div class="card card-gold animate-fade customer-salon-card" data-salon-search="${salonSearchText}" style="padding: 12px; margin-bottom: 12px; cursor: pointer;position:relative;" onclick="window.openSalonDetailsModal('${b.businessId}')">
          <button type="button" onclick="event.stopPropagation();window.toggleFavoriteSalon('${b.businessId}')" aria-label="${favoriteSalonIds.has(b.businessId) ? t('removeFavorite', currentLang) : t('addFavorite', currentLang)}" class="icon-button favorite-toggle ${favoriteSalonIds.has(b.businessId) ? 'is-favorite' : ''}">${uiIcon('heart')}</button>
          <div style="width: 100%; height: 110px; border-radius: 8px; overflow: hidden; background: var(--theme-panel-1f2937, #1f2937); margin-bottom: 10px;">
            <img src="${escapeCustomerText(coverUrl)}" onerror="this.onerror=null; this.src='./assets/images/unelivo-placeholder.svg';" style="width: 100%; height: 100%; object-fit: cover;" alt="${escapeCustomerText(b.name || t('staffUi_59'))}">
          </div>
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <h4 style="font-size: 15px; font-weight: 800; color: var(--theme-ink-ffffff, #fff);"> ${escapeCustomerText(b.name)}</h4>
              <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">
                 ${escapeCustomerText([b.district, b.city].filter(Boolean).join(' / '))}
                 <div>${escapeCustomerText(salonTypeLabel(b))}</div>${discoveryFilters.nearby?`<div>${b.distanceKm===null?'Konum bilgisi yok':(b.distanceKm<1?Math.round(b.distanceKm*1000)+' m':b.distanceKm.toLocaleString('tr-TR',{maximumFractionDigits:1})+' km')+' · kuş uçuşu'}</div>`:''}
              </div>
            </div>
            <span class="badge badge-approved"> ${Number(b.averageRating) > 0 ? Number(b.averageRating) : t('uiRemaining_299')}</span>
          </div>
          <button type="button" onclick="event.stopPropagation();window.beginNewBookingFromSalonById('${b.businessId}')" class="btn btn-gold" style="width: 100%; margin-top: 10px; min-height: 36px; font-size: 11px;">
             ${t('bookAppointment', currentLang)} →
          </button>
        </div>
      `;
    }).join('');

    mainHtml = `
      <div class="card animate-fade">
        <h3 style="font-size: 16px; font-weight: 800; color: var(--gold-primary); margin-bottom: 12px;"> ${t('discoverSalons', currentLang)}</h3>
        <div class="segment-control" style="margin-bottom:10px;">
          <button class="btn ${customerSalonFilter === 'all' ? 'btn-gold' : 'btn-secondary'}" onclick="window.setCustomerSalonFilter('all')">${t('allSalons', currentLang)}</button>
          <button class="btn ${customerSalonFilter === 'favorites' ? 'btn-gold' : 'btn-secondary'}" onclick="window.setCustomerSalonFilter('favorites')">${t('favorites', currentLang)} (${favoriteSalonIds.size})</button>
        </div>
        <input id="discovery-search-input" type="text" placeholder="${t('uiRemaining_021')}" value="${escapeCustomerText(searchQuery)}" oninput="window.setDiscoverySearch(this.value)" class="input-field">
        <section class="discovery-controls" aria-label="Salon filtreleri">
          <label>İşletme türü<select class="input-field" onchange="window.setDiscoveryFilter('type',this.value)"><option value="">Tüm türler</option>${SALON_TYPES.map(type=>`<option value="${type.id}" ${discoveryFilters.type===type.id?'selected':''}>${type.label}</option>`).join('')}</select></label>
          <label>İl<select class="input-field" onchange="window.setDiscoveryFilter('city',this.value)"><option value="">Tüm iller</option>${discoveryCities.map(city=>`<option value="${escapeCustomerText(city)}" ${city===discoveryFilters.city?'selected':''}>${escapeCustomerText(city)}</option>`).join('')}</select></label>
          <label>İlçe<select class="input-field" onchange="window.setDiscoveryFilter('district',this.value)"><option value="">Tüm ilçeler</option>${discoveryDistricts.map(district=>`<option value="${escapeCustomerText(district)}" ${district===discoveryFilters.district?'selected':''}>${escapeCustomerText(district)}</option>`).join('')}</select></label>
          <button class="btn btn-secondary" ${discoveryLocating?'disabled':''} onclick="window.findNearbySalons()">${uiIcon('mapPin')} ${discoveryLocating?'Konum alınıyor…':'Yakınımdaki salonlar'}</button>
          ${discoveryFilters.origin?`<label>Mesafe<select class="input-field" onchange="window.setDiscoveryFilter('radius',this.value)">${[0,2,5,10,25,50].map(km=>`<option value="${km}" ${Number(discoveryFilters.radius)===km?'selected':''}>${km?km+' km içinde':'Tüm mesafeler'}</option>`).join('')}</select></label><button class="btn btn-secondary" onclick="window.clearDiscoveryLocation()">Konumumu kaldır</button>`:''}
          <p role="status">${escapeCustomerText(discoveryLocationMessage||'Konum izni vermeden il ve ilçe seçebilirsiniz.')}</p>
        </section>
        <div id="discovery-salon-list">${salonCardsHtml}</div>
        <div id="discovery-search-empty" style="display: ${salons.length === 0 ? 'block' : 'none'}; font-size: 12px; color: var(--text-muted); text-align: center; padding: 20px;">${t('uiRemaining_022')}</div>
      </div>
    `;

  } else if (activeCustomerTab === 'favorites') {
    const allBusinessesData = (await fetchRecord('public_businesses')) || {};
    const favoriteSalons = Array.from(favoriteSalonIds).map(id => allBusinessesData[id]).filter(b => b && b.status === 'active' && b.discoveryEnabled === true);
    const favoriteCards = favoriteSalons.map(b => {
      const coverUrl = (b.media && (b.media.coverImageUrl || b.media.profileImageUrl)) || b.coverImageUrl || b.profileImageUrl || './assets/images/unelivo-placeholder.svg';
      return `<div class="card card-gold animate-fade" style="padding:12px;margin-bottom:10px;">
        <div style="display:flex;gap:10px;align-items:center;"><img loading="lazy" decoding="async" src="${coverUrl}" onerror="this.src='./assets/images/unelivo-placeholder.svg'" style="width:64px;height:64px;object-fit:cover;border-radius:9px;"><div style="flex:1;"><div style="font-size:14px;font-weight:800;color:var(--theme-ink-ffffff, #fff);">${b.name || t('staffUi_59')}</div><div style="font-size:10px;color:var(--text-muted);">${b.district || ''} ${b.city || ''}</div></div><button aria-label="${t('uiRemaining_023')}" onclick="window.toggleFavoriteSalon('${b.businessId}')" class="icon-button">${uiIcon('heart')}</button></div>
        <button onclick="window.beginNewBookingFromSalonById('${b.businessId}')" class="btn btn-gold" style="width:100%;margin-top:10px;"> ${t('uiRemaining_024')}</button>
      </div>`;
    }).join('');
    mainHtml = `<div class="card animate-fade"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;"><h3 style="font-size:16px;color:var(--gold-primary);margin:0;"> ${t('uiRemaining_025')}</h3><button onclick="window.switchCustomerTab('salons')" class="btn btn-secondary" style="font-size:10px;padding:5px 8px;">${t('uiRemaining_026')}</button></div>${favoriteCards || `<div style="text-align:center;padding:24px 8px;color:var(--text-muted);font-size:12px;">${t('uiRemaining_027')}<br>${t('uiRemaining_028')}</div>`}</div>`;

    } else if (activeCustomerTab === 'booking') {
    if (customerBookingDraft.businessId && window._bookingRevisionBusiness !== customerBookingDraft.businessId) {
      window._unsubscribeBookingRevision?.();
      window._bookingRevisionBusiness = customerBookingDraft.businessId;
      window._unsubscribeBookingRevision = subscribeToPath('availability_revisions/'+customerBookingDraft.businessId, () => {
        if (activeCustomerTab === 'booking') window._currentRenderCustomerScreen?.();
      });
    }
    if (!customerBookingDraft.businessId) {
      mainHtml = `
        <div class="card card-gold animate-fade" style="padding: 24px; text-align: center; margin-top: 10px;">
          <div style="font-size: 44px; margin-bottom: 12px;"></div>
          <h3 style="font-size: 16px; font-weight: 800; color: var(--theme-ink-ffffff, #fff); margin-bottom: 8px;">
            ${t('uiRemaining_029')}
          </h3>
          <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 16px;">
            ${t('uiRemaining_030')}
          </p>
          <button onclick="window.switchCustomerTab('salons')" class="btn btn-gold" style="width: 100%; min-height: 44px; font-weight: 800;">
             ${t('uiRemaining_031')}
          </button>
        </div>
      `;
    } else {
      const bizData = await fetchRecord('public_businesses/' + customerBookingDraft.businessId) || {};
      cachedCurrentServices = bizData.services ? Object.values(bizData.services).filter(s => s && s.active !== false) : [];
      cachedCurrentStaff = bizData.staff ? Object.values(bizData.staff).filter(st => st && st.active !== false) : [];

      const isStep1Valid = !!customerBookingDraft.serviceId;
      bookingBranding = bizData.branding;
      if(isStep1Valid&&!customerBookingDraft.date)customerBookingDraft.date=bookingToday();
      let isStep2Valid = isStep1Valid && !!customerBookingDraft.staffId;
      let isStep3Valid = isStep2Valid && !!customerBookingDraft.date;
      let isStep4Valid = isStep3Valid && !!customerBookingDraft.time;

      const now = new Date(bookingToday()+'T12:00:00Z');
      const todayStr = bookingToday();
      const tmr = new Date(now.getTime() + 86400000);
      const tomorrowStr = `${tmr.getFullYear()}-${String(tmr.getMonth() + 1).padStart(2, '0')}-${String(tmr.getDate()).padStart(2, '0')}`;
      const dayAfterTomorrow = new Date(now.getTime() + 172800000);
      const dayAfterTomorrowStr = `${dayAfterTomorrow.getFullYear()}-${String(dayAfterTomorrow.getMonth() + 1).padStart(2, '0')}-${String(dayAfterTomorrow.getDate()).padStart(2, '0')}`;

      const todayFormatted = `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}`;
      const tomorrowFormatted = `${String(tmr.getDate()).padStart(2, '0')}.${String(tmr.getMonth() + 1).padStart(2, '0')}`;
      const dayAfterTomorrowFormatted = `${String(dayAfterTomorrow.getDate()).padStart(2, '0')}.${String(dayAfterTomorrow.getMonth() + 1).padStart(2, '0')}`;

      const selectedServiceObj = cachedCurrentServices.find(s => s && s.id === customerBookingDraft.serviceId);

      let availability = { isClosed: false, slots: [], candidateSlots: [], pastSlots: [], busySlots: [] };
      let availabilityError = '';
      if (isStep3Valid) {
        try {
          const availabilityResponse = await authenticatedFetch(`${window.location.origin}/api/booking/availability`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              businessId: customerBookingDraft.businessId,
              staffId: customerBookingDraft.staffId,
              findNextAvailable: false,
              serviceId: customerBookingDraft.serviceId,
              date: customerBookingDraft.date,
              customerPhone: currentCustomerUser.phone,
              durationMinutes: (selectedServiceObj && selectedServiceObj.duration) || customerBookingDraft.serviceDuration || 30
            })
          });
          const availabilityData = await availabilityResponse.json().catch(() => ({}));
          if(renderSequence!==customerRenderSequence)return;
          if (!availabilityResponse.ok) throw new Error(availabilityData.error || t('ownerUi_108'));
          availability = availabilityData;
          if(availability.date)customerBookingDraft.date=availability.date;
          if(availability.advancedFrom)customerBookingDraft.advanceNotice='Seçilen gün kapalı veya uygun saat kalmadı. İlk uygun gün gösteriliyor: '+availability.date;
          currentBookingSlots=availability.slots||[];currentBookingStaffBySlot=availability.staffBySlot||{};
          if (customerBookingDraft.time && !currentBookingSlots.includes(customerBookingDraft.time)) customerBookingDraft.time=null;
          isStep4Valid=isStep3Valid && !!customerBookingDraft.time;
        } catch (error) {
          if(renderSequence!==customerRenderSequence)return;
          availabilityError = error.message || t('ownerUi_108');
          currentBookingSlots=[];currentBookingStaffBySlot={};customerBookingDraft.time=null;isStep4Valid=false;
        }
      }
      const availableSlots = Array.isArray(availability.slots) ? availability.slots : [];
      const candidateSlots = Array.isArray(availability.candidateSlots) ? availability.candidateSlots : availableSlots;
      const busySlots = Array.isArray(availability.busySlots) ? availability.busySlots : [];
      const nextAvailableTime = availability.nextAvailableTime || availableSlots[0] || '';
      const serviceSlotInterval = Number(availability.slotIntervalMinutes) || Number((selectedServiceObj && selectedServiceObj.duration) || customerBookingDraft.serviceDuration) || 30;
      const chronologicalSlots = [...new Set([...busySlots, ...availableSlots])].sort((a, b) => a.localeCompare(b));

      mainHtml = `
        ${customerBookingDraft.advanceNotice ? `<p role="status">${escapeCustomerText(customerBookingDraft.advanceNotice)}</p>` : ''}
        ${availability.searchExhausted ? '<p role="status">Önümüzdeki 60 günde uygun saat bulunamadı. Takvimden başka tarih seçebilirsiniz.</p>' : ''}
        <ol class="customer-booking-progress" aria-label="${t('bookAppointment', currentLang)}">${['serviceLabel', 'staffStep', 'selectDateTime', 'confirmBooking'].map((label, index) => { const current = !isStep1Valid ? 0 : !isStep2Valid ? 1 : !isStep4Valid ? 2 : 3; return `<li class="${index <= current ? 'is-reached' : ''}" ${index === current ? 'aria-current="step"' : ''}><span>${index + 1}</span><small>${t(label, currentLang)}</small></li>`; }).join('')}</ol>
        <div class="card card-gold animate-fade" style="padding: 14px; margin-bottom: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-size: 11px; color: var(--gold-primary); font-weight: 700;"> ${t('uiRemaining_032')}</div>
              <div style="font-size: 15px; font-weight: 800; color: var(--theme-ink-ffffff, #fff);">${customerBookingDraft.businessName || bizData.name || t('staffUi_59')}</div>
            </div>
            <button onclick="window.returnFromCustomerBooking()" class="btn btn-secondary" style="font-size: 11px; padding: 4px 8px;">${t('uiRemaining_033')}</button>
          </div>
        </div>

        <!-- STEP 1: HİZMET SEÇ (COMPACT ACCORDION) -->
        <div class="card animate-fade" style="padding: 12px; margin-bottom: 10px; border-color: ${isStep1Valid ? '#22c55e' : 'var(--gold-primary)'};">
          ${isStep1Valid && !isServicePickerExpanded ? `
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div class="booking-step-title">${uiIcon('service')} ${t('selectedService', currentLang)}</div>
                <div style="font-size: 14px; font-weight: 800; color: var(--theme-ink-ffffff, #fff);">${customerBookingDraft.serviceName}</div>
                <div class="booking-service-meta"><span>${customerBookingDraft.serviceDuration || 30} ${t('ownerUi_139')}</span><strong>${customerBookingDraft.servicePrice} TL</strong></div>
              </div>
              <button onclick="window.toggleServicePicker(true)" class="btn btn-secondary" style="font-size: 11px; padding: 4px 10px;">${t('uiRemaining_033')}</button>
            </div>
          ` : `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <h4 style="font-size: 13px; font-weight: 800; color: var(--gold-primary); margin: 0;">
                ${uiIcon('service')} ${t('serviceStep', currentLang)} *
              </h4>
              ${isStep1Valid ? `<button onclick="window.toggleServicePicker(false)" class="btn btn-secondary" style="font-size: 10px; padding: 2px 6px;">${t('ownerUi_099')} </button>` : ''}
            </div>
            <div style="display: flex; flex-direction: column; gap: 6px;">
              ${cachedCurrentServices.length === 0 ? `<div style="font-size: 11px; color: var(--text-muted);">${t('uiRemaining_034')}</div>` : cachedCurrentServices.map(s => `
                <div onclick="window.selectDraftServiceById('${s.id}')" class="card" style="padding: 10px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; background: ${customerBookingDraft.serviceId === s.id ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.03)'}; border-color: ${customerBookingDraft.serviceId === s.id ? 'var(--gold-primary)' : 'transparent'};">
                  <div>
                    <div style="font-size: 13px; font-weight: 700; color: var(--theme-ink-ffffff, #fff);">${s.name} (${s.duration || 30} ${t('ownerUi_109')})</div>
                    <div style="font-size: 11px; color: var(--gold-primary); font-weight: 800;"> ${s.price} TL</div>
                  </div>
                  <div style="font-size: 13px; font-weight: 800; color: ${customerBookingDraft.serviceId === s.id ? 'var(--gold-primary)' : 'var(--text-muted)'};">${customerBookingDraft.serviceId === s.id ? t('uiRemaining_035') : t('uiRemaining_036')}</div>
                </div>
              `).join('')}
            </div>
          `}
        </div>

        <!-- STEP 2: BERBER / UZMAN SEÇ (COMPACT ACCORDION) -->
        <div class="card animate-fade" style="padding: 12px; margin-bottom: 10px; opacity: ${isStep1Valid ? '1' : '0.5'}; border-color: ${isStep1Valid ? '#22c55e' : 'var(--border-color)'};">
          ${!isStep1Valid ? `
            <h4 class="booking-step-title">${uiIcon('users')} ${t('staffStep', currentLang)}</h4>
            <div style="font-size: 11px; color: var(--text-muted);">Önce hizmet seçin.</div>
          ` : (customerBookingDraft.staffId && !isStaffPickerExpanded ? `
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div class="booking-step-title">${uiIcon('users')} ${t('staffStep', currentLang)}</div>
                <div style="font-size: 14px; font-weight: 800; color: var(--theme-ink-ffffff, #fff);">${formatPersonName(customerBookingDraft.staffName)}</div>
              </div>
              <button onclick="window.toggleStaffPicker(true)" class="btn btn-secondary" style="font-size: 11px; padding: 4px 10px;">${t('uiRemaining_033')}</button>
            </div>
          ` : `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <h4 class="booking-step-title">${uiIcon('users')} ${t('staffStep', currentLang)} *</h4>
              ${isStep1Valid ? `<button onclick="window.toggleStaffPicker(false)" class="btn btn-secondary" style="font-size: 10px; padding: 2px 6px;">${t('ownerUi_099')} </button>` : ''}
            </div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              <button onclick="window.selectDraftStaffById('staff-any')" class="btn ${customerBookingDraft.staffId === 'staff-any' ? 'btn-gold' : 'btn-secondary'}" style="flex: 1; min-width: 120px; font-size: 11px;display:flex;align-items:center;justify-content:center;gap:7px;">
                 ${uiIcon('users')} ${t('anyStaff', currentLang)}
              </button>
              ${cachedCurrentStaff.filter(st => staffCanProvideService(st, customerBookingDraft.serviceId, bizData)).map(st => `
                <button onclick="window.selectDraftStaffById('${st.id}')" class="btn ${customerBookingDraft.staffId === st.id ? 'btn-gold' : 'btn-secondary'}" style="flex: 1; min-width: 120px; font-size: 11px;display:flex;align-items:center;gap:8px;text-align:left;">
                   ${renderStaffAvatar(st)} <span>${formatPersonName(st.displayName || st.name)}</span>
                </button>
              `).join('')}
            </div>
          `)}
        </div>


        <!-- STEP 3: TARİH SEÇ (BUGÜN / YARIN / TAKVİM) -->
        <div class="card animate-fade" style="padding: 12px; margin-bottom: 10px; opacity: ${isStep2Valid ? '1' : '0.5'}; border-color: ${isStep3Valid ? '#22c55e' : 'var(--border-color)'};">
          ${!isStep2Valid ? `
            <h4 class="booking-step-title">${uiIcon('calendar')} ${t('dateStep', currentLang)}</h4>
            <div style="font-size: 11px; color: var(--text-muted);">Önce hizmet ve çalışan seçin.</div>
          ` : (isStep3Valid && !isDatePickerExpanded ? `
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div class="booking-step-title">${uiIcon('calendar')} ${t('dateStep', currentLang)}</div>
                <div style="font-size: 14px; font-weight: 800; color: var(--theme-ink-ffffff, #fff);"> ${customerBookingDraft.date === todayStr ? t('uiRemaining_039') + todayFormatted + ')' : (customerBookingDraft.date === tomorrowStr ? t('uiRemaining_040') + tomorrowFormatted + ')' : (customerBookingDraft.date === dayAfterTomorrowStr ? t('uiRemaining_041') + dayAfterTomorrowFormatted + ')' : customerBookingDraft.date.split('-').reverse().join('.')))}</div>
              </div>
              <button onclick="window.toggleDatePicker(true)" class="btn btn-secondary" style="font-size: 11px; padding: 4px 10px;">${t('uiRemaining_033')}</button>
            </div>
          ` : `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <h4 class="booking-step-title">${uiIcon('calendar')} ${t('dateStep', currentLang)} *</h4>
              ${isStep3Valid ? `<button onclick="window.toggleDatePicker(false)" class="btn btn-secondary" style="font-size: 10px; padding: 2px 6px;">${t('ownerUi_099')} </button>` : ''}
            </div>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; margin-bottom: 8px;">
              <button onclick="window.selectDraftDate('${todayStr}')" class="btn ${customerBookingDraft.date === todayStr ? 'btn-gold' : 'btn-secondary'}" style="flex: 1; font-size: 11px; font-weight: 700;">
                 ${t('uiRemaining_039')}${todayFormatted})
              </button>
              <button onclick="window.selectDraftDate('${tomorrowStr}')" class="btn ${customerBookingDraft.date === tomorrowStr ? 'btn-gold' : 'btn-secondary'}" style="flex: 1; font-size: 11px; font-weight: 700;">
                 ${t('uiRemaining_040')}${tomorrowFormatted})
              </button>
            </div>
            <div style="display: flex; align-items: center; gap: 8px; margin-top: 6px;">
              <span style="font-size: 11px; color: var(--gold-primary); font-weight: 700;"> Tarih Seç</span>
              <input type="date" value="${customerBookingDraft.date || ''}" min="${todayStr}" onchange="window.selectDraftDate(this.value)" class="input-field" style="flex: 1; background: var(--theme-panel-111827, #111827); color: var(--theme-ink-ffffff, #fff); margin: 0;">
            </div>
          `)}
        </div>

        <!-- STEP 4: MÜSAİT SAATLER -->
        <div class="card animate-fade" style="padding: 12px; margin-bottom: 14px; opacity: ${isStep3Valid ? '1' : '0.5'}; border-color: ${isStep4Valid ? '#22c55e' : 'var(--border-color)'};">
          <h4 class="booking-step-title">
            ${uiIcon('clock')} ${t('timeStep', currentLang)}
          </h4>
          ${!isStep3Valid ? `
            <div style="font-size: 11px; color: var(--text-muted);">${t('uiRemaining_043')}</div>
          ` : (availabilityError ? `
            <div style="font-size: 11px; color: var(--theme-ink-fca5a5, #fca5a5);">${availabilityError}</div>
          ` : (availability.isClosed ? `
            <div style="font-size: 12px; color: var(--theme-ink-fca5a5, #fca5a5); font-weight:800; margin-bottom: 10px;">${customerBookingDraft.date === todayStr ? t('uiRemaining_044') : t('uiRemaining_045')}</div>${renderAvailabilityHints(availability)}
            ${customerBookingDraft.date === todayStr ? `<button onclick="window.selectDraftDate('${tomorrowStr}')" class="btn btn-gold" style="width: 100%;"> ${t('uiRemaining_046')}</button>` : ''}
          ` : `
            <div style="font-size:10px;color:var(--text-muted);margin-bottom:7px;">${t('uiRemaining_047')} ${customerBookingDraft.serviceDuration || serviceSlotInterval} ${t('staffUi_5')} • ${t('uiRemaining_048')} ${serviceSlotInterval} ${t('uiRemaining_049')}</div>
            ${nextAvailableTime ? `<div style="font-size:11px;color:var(--theme-copy-22c55e, #22c55e);font-weight:800;margin-bottom:8px;"> ${t('ownerUi_125')} ${nextAvailableTime}</div>` : `<div style="font-size:11px;color:var(--text-muted);margin-bottom:8px;">${t('ownerUi_126')}</div>`}
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px;">
              ${chronologicalSlots.map(slot => !availableSlots.includes(slot) ? `
                <button disabled class="btn" style="padding: 6px; font-size: 10px; background: #991b1b; color: var(--theme-ink-ffffff, #fff); border: 1px solid #ef4444; opacity: .75;">${slot}<br><span style="font-size: 8px;">${t('uiRemaining_303')}</span></button>
              ` : `<button onclick="window.selectDraftTime('${slot}')" class="btn customer-time-slot" aria-pressed="${customerBookingDraft.time === slot}" style="padding: 6px; font-size: 11px; font-weight: 700; background: ${customerBookingDraft.time === slot ? '#eab308' : (availableSlots.includes(slot) ? '#22c55e' : '#b7791f')}; color: #000; border: 1px solid ${customerBookingDraft.time === slot ? '#eab308' : (availableSlots.includes(slot) ? '#22c55e' : '#b7791f')};">${slot}<br><span style="font-size:8px;">Müsait</span></button>`).join('')}
            </div>
            ${renderAvailabilityHints(availability)}
            ${availableSlots.length === 0 ? `<button onclick="window.selectDraftDate('${tomorrowStr}')" class="btn btn-gold" style="width:100%;margin-top:10px;"> ${t('ownerUi_128')}</button>` : ''}
          `))}
        </div>


        ${isStep4Valid ? `<section class="card customer-booking-summary"><h3>${t('confirmBooking', currentLang)}</h3><dl>${[['salonsTab', customerBookingDraft.businessName], ['serviceLabel', customerBookingDraft.serviceName], ['staffStep', customerBookingDraft.staffId === 'staff-any' ? t('anyStaff', currentLang) : customerBookingDraft.staffName], ['dateStep', customerBookingDraft.date], ['timeLabel', customerBookingDraft.time], ['ownerUi_136', customerBookingDraft.serviceDuration + ' ' + t('ownerUi_139')], ['priceLabel', customerBookingDraft.servicePrice + ' TL']].map(([label, value]) => `<div><dt>${t(label, currentLang)}</dt><dd>${escapeCustomerText(value || '')}</dd></div>`).join('')}</dl></section>` : ''}
        <!-- STEP 5: ONALYA BUTTON -->
        <button id="btn-submit-booking" onclick="window.submitCustomerBookingAuthoritative()" class="btn btn-gold" style="width: 100%; min-height: 48px; font-weight: 900; font-size: 15px; opacity: ${isStep4Valid ? '1' : '0.5'};" ${!isStep4Valid ? 'disabled' : ''}>
           ${uiIcon('check')} ${t('confirmBooking', currentLang)}
        </button>
      `;
    }
  }

 else if (activeCustomerTab === 'appointments') {
    const userApts = mergeRecentCustomerAppointments(await getAppointmentsForCustomer(user.uid, user.phone), user.uid);
    currentCustomerAppointmentsById = new Map(userApts.filter(Boolean).map(apt => [apt.aptId || apt.appointmentId, apt]));
    const allBusinessesData = (await fetchRecord('public_businesses')) || {};

    const currentTimeMs = Date.now();
    const cancelledStatuses = new Set(['cancelled', 'rejected', 'no_show']);
    const appointmentHasPassed = apt => appointmentHasEnded(apt, currentTimeMs);

    // A record belongs to exactly one section. Approval moves it from pending to active;
    // elapsed records move to history even if an older status update was missed.
    const isHiddenForCustomer = apt => Boolean(hiddenAppointmentsData[apt.aptId || apt.appointmentId]);
    const cancelledApts = userApts.filter(apt => apt && cancelledStatuses.has(apt.status) && !isHiddenForCustomer(apt));
    const pastAptsAll = userApts.filter(apt => apt && !cancelledStatuses.has(apt.status) && (apt.status === 'completed' || appointmentHasPassed(apt)));
    const pendingApts = userApts.filter(apt => apt && apt.status === 'pending' && !appointmentHasPassed(apt));
    const activeApts = userApts.filter(apt => apt && !appointmentHasPassed(apt) && (apt.status === 'approved' || apt.status === 'cancel_requested' || apt.status === 'reschedule_requested'));

    // Keep each category separate and chronologically ordered.
    pastAptsAll.sort((a, b) => (b.date + (b.time || '')).localeCompare(a.date + (a.time || '')));
    cancelledApts.sort((a, b) => (b.date + (b.time || '')).localeCompare(a.date + (a.time || '')));

    const renderCustomerAppointment = (apt) => {
      const bizObj = (allBusinessesData && apt.businessId) ? allBusinessesData[apt.businessId] : null;
      const salonName = apt.businessNameSnapshot || (bizObj ? bizObj.name : 'EZO Salon');
      const aptTimeMs = new Date(`${apt.date}T${apt.time || '00:00'}:00`).getTime();
      const hoursUntilApt = (aptTimeMs - Date.now()) / (1000 * 3600);
      const is48HoursOrMore = hoursUntilApt >= 48;

      return `
        <div class="card card-gold animate-fade" style="padding: 14px; margin-bottom: 10px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <div style="font-size: 11px; color: var(--gold-primary); font-weight: 800; margin-bottom: 2px;"> ${t('salonLabel', currentLang)}: ${salonName}</div>
              <div style="font-size: 14px; font-weight: 800; color: var(--theme-ink-ffffff, #fff);"> ${apt.serviceNameSnapshot || apt.serviceName}</div>
              <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">
                 ${t('barberLabel', currentLang)}: ${escapeCustomerText(apt.staffNameSnapshot || apt.staffName || '—')} •  ${escapeCustomerText(apt.servicePriceSnapshot ?? apt.servicePrice ?? '—')} TL
              </div>
              <div style="font-size: 12px; color: var(--gold-primary); font-weight: 700; margin-top: 2px;"> ${apt.date} @ ${apt.time} (${apt.serviceDuration || 30} ${t('ownerUi_109')})</div>
            </div>
            <span class="badge ${apt.status === 'approved' ? 'badge-approved' : 'badge-pending'}">${t(apt.status, currentLang)}</span>
          </div>

          <div style="display: flex; gap: 8px; margin-top: 10px;">
            ${apt.status === 'reschedule_requested' ? `<button onclick="window.withdrawRescheduleRequestCustomer('${apt.aptId}')" class="btn btn-secondary" style="flex:1;font-size:11px;padding:6px;border-color:#f59e0b;color:var(--theme-copy-f59e0b, #f59e0b);"> ${t('uiRemaining_050')}</button>` : `<button onclick="window.requestRescheduleCustomer('${apt.aptId}', ${is48HoursOrMore})" class="btn btn-secondary" style="flex: 1; font-size: 11px; padding: 6px;">${t('rescheduleRequestBtn', currentLang)}</button>`}
            <button onclick="window.requestCancelCustomer('${apt.aptId}')" class="btn btn-secondary" style="flex: 1; font-size: 11px; padding: 6px; border-color: #ef4444; color:var(--theme-copy-ef4444, #ef4444);" ${apt.status === 'cancel_requested' ? 'disabled' : ''}>
              ${apt.status === 'cancel_requested' ? t('uiRemaining_051') : t('cancelRequestBtn', currentLang)}
            </button>
          </div>
        </div>
      `;
    };
    const pendingHtml = pendingApts.map(renderCustomerAppointment).join('');
    const activeHtml = activeApts.map(renderCustomerAppointment).join('');

    // The tab counter and rendered rows must describe the same customer-visible set.
    const visiblePastApts = pastAptsAll.slice(0, 5).filter(apt => !isHiddenForCustomer(apt));
    const visibleCancelledApts = cancelledApts;
    const renderPastCustomerAppointment = apt => {
      const bizObj = (allBusinessesData && apt.businessId) ? allBusinessesData[apt.businessId] : null;
      const salonName = apt.businessNameSnapshot || (bizObj ? bizObj.name : 'EZO Salon');

      return `
        <div class="card animate-fade" style="padding: 12px; margin-bottom: 8px; opacity: 0.85;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <div style="font-size: 10px; color: var(--gold-primary); font-weight: 700;"> ${t('salonLabel', currentLang)}: ${salonName}</div>
              <div style="font-size: 13px; font-weight: 800; color: var(--theme-ink-ffffff, #fff);"> ${apt.serviceNameSnapshot || apt.serviceName} • ${escapeCustomerText(apt.staffNameSnapshot || apt.staffName || '—')}</div>
              <div style="font-size: 11px; color: var(--text-muted);"> ${apt.date} @ ${apt.time} •  ${escapeCustomerText(apt.servicePriceSnapshot ?? apt.servicePrice ?? '—')} TL</div>
            </div>
            <div style="display:flex;align-items:center;gap:6px;"><span class="badge badge-secondary" style="font-size: 10px;">${effectiveAppointmentStatus(apt, currentTimeMs) === 'completed' ? t('completed', currentLang) : effectiveAppointmentStatus(apt, currentTimeMs) === 'expired' ? t('expired', currentLang) : t('pastLabel', currentLang)}</span><button class="icon-button" aria-label="${t('removeFromHistory', currentLang)}" onclick="window.hideCustomerAppointment('${apt.aptId || apt.appointmentId}')">${uiIcon('trash')}</button></div>
          </div>
        </div>
      `;
    };
    const pastHtml = visiblePastApts.map(renderPastCustomerAppointment).join('');
    const cancelledHtml = visibleCancelledApts.map(apt => {
      const bizObj = (allBusinessesData && apt.businessId) ? allBusinessesData[apt.businessId] : null;
      const salonName = apt.businessNameSnapshot || (bizObj ? bizObj.name : 'EZO Salon');
      return `<div class="card animate-fade" style="padding:12px;margin-bottom:8px;border-color:#ef4444;opacity:.9;"><div style="display:flex;justify-content:space-between;align-items:flex-start;"><div><div style="font-size:10px;color:var(--gold-primary);font-weight:700;">${salonName}</div><div style="font-size:13px;font-weight:800;color:var(--theme-ink-ffffff, #fff);">${apt.serviceNameSnapshot || apt.serviceName}</div><div style="font-size:11px;color:var(--text-muted);">${apt.date} @ ${apt.time}</div></div><div style="display:flex;align-items:center;gap:6px;"><span class="badge" style="background:rgba(239,68,68,.18);color:var(--theme-copy-ef4444, #ef4444);">${t(apt.status, currentLang)}</span><button class="icon-button" aria-label="${t('removeFromHistory', currentLang)}" onclick="window.hideCustomerAppointment('${apt.aptId || apt.appointmentId}')">${uiIcon('trash')}</button></div></div></div>`;
    }).join('');

    const appointmentCategories = {
      pending: { title: t('uiRemaining_052'), rows: pendingApts, html: pendingHtml, empty: t('uiRemaining_053') },
      active: { title: t('uiRemaining_054'), rows: activeApts, html: activeHtml, empty: t('uiRemaining_055') },
      cancelled: { title: t('uiRemaining_056'), rows: visibleCancelledApts, html: cancelledHtml, empty: t('uiRemaining_057') },
      past: { title: t('pastAppointmentsLimit', currentLang), rows: visiblePastApts, html: pastHtml, empty: t('uiRemaining_058') }
    };
    const selectedAppointmentCategory = appointmentCategories[activeCustomerAppointmentCategory] || appointmentCategories.pending;

    mainHtml = `
      <div class="card animate-fade"><h3 style="font-size:16px;font-weight:800;color:var(--gold-primary);margin-bottom:12px;"> ${t('myAppointments', currentLang)}</h3>
        <div class="customer-appointment-filters" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px;">
          <button onclick="window.switchCustomerAppointmentCategory('pending')" class="btn ${activeCustomerAppointmentCategory === 'pending' ? 'btn-gold' : 'btn-secondary'}" style="min-height:58px;font-size:11px;"> ${t('ownerUi_055')}<br><strong>${pendingApts.length}</strong></button>
          <button onclick="window.switchCustomerAppointmentCategory('active')" class="btn ${activeCustomerAppointmentCategory === 'active' ? 'btn-gold' : 'btn-secondary'}" style="min-height:58px;font-size:11px;"> ${t('ownerUi_163')}<br><strong>${activeApts.length}</strong></button>
          <button onclick="window.switchCustomerAppointmentCategory('cancelled')" class="btn ${activeCustomerAppointmentCategory === 'cancelled' ? 'btn-gold' : 'btn-secondary'}" style="min-height:58px;font-size:11px;"> ${t('uiRemaining_059')}<br><strong>${cancelledApts.length}</strong></button>
          <button onclick="window.switchCustomerAppointmentCategory('past')" class="btn ${activeCustomerAppointmentCategory === 'past' ? 'btn-gold' : 'btn-secondary'}" style="min-height:58px;font-size:11px;"> ${t('staffUi_32')}<br><strong>${visiblePastApts.length}</strong></button>
        </div>
        <h4 style="font-size:13px;color:var(--theme-ink-ffffff, #fff);margin-bottom:9px;">${selectedAppointmentCategory.title} (${selectedAppointmentCategory.rows.length})</h4>
        ${selectedAppointmentCategory.rows.length ? selectedAppointmentCategory.html : `<div style="font-size:11px;color:var(--text-muted);text-align:center;padding:20px 8px;">${selectedAppointmentCategory.empty}</div>`}
      </div>
    `;
  } else if (activeCustomerTab === 'ai') {
    mainHtml = '<section id="customer-ai-surface" class="customer-ai-surface"></section>';
  } else if (activeCustomerTab === 'profile') {
    const currentLangObj = SUPPORTED_LANGUAGES.find(l => l.code === currentLang) || SUPPORTED_LANGUAGES[0];

    mainHtml = `
        <button class="btn btn-secondary" onclick="window.switchCustomerTab('ai')">${uiIcon('sparkles')} ${t('aiTab',currentLang)}</button>

      <div class="card animate-fade" style="padding: 20px;">
        <div style="text-align: center; margin-bottom: 16px;">
          <div style="position: relative; display: inline-block;">
            ${renderCustomerAvatar(user, displayName, 72)}
          </div>
          <h3 style="font-size: 16px; font-weight: 800; color: var(--theme-ink-ffffff, #fff); margin-top: 8px;">${displayName}</h3>
          <div style="font-size: 12px; color: var(--gold-primary); font-weight: 700;">${user.phone}</div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 8px;">
          <button type="button" class="btn btn-outline-gold" data-customer-action="edit">${uiIcon('pencil')} ${t('editDisplayName', currentLang)}</button>
          <button type="button" class="btn btn-secondary" data-customer-action="favorites">${uiIcon('heart')} ${t('favorites', currentLang)}</button>
          <button onclick="window.openAppSettings()" class="btn btn-secondary app-settings-entry" style="width:100%;text-align:left;min-height:44px;">Ayarlar · Tema ve görünüm</button>
          <button onclick="window.openLanguageModal()" class="btn btn-secondary" style="width: 100%; text-align: left; padding: 12px; display: flex; justify-content: space-between; align-items: center;">
            <span> ${t('language', currentLang)}</span>
            <span style="font-size: 12px; color: var(--gold-primary);">${uiIcon('globe')} ${t('languageName_' + currentLangObj.code, currentLang)}</span>
          </button>

          <button onclick="window.openNotificationSettingsModal()" class="btn btn-secondary" style="width: 100%; text-align: left; padding: 12px;">
            ${uiIcon('bell')}<span>${t('notificationSettings', currentLang)}</span>
          </button>

          <button onclick="window.openPrivacyAccountModal()" class="btn btn-secondary" style="width: 100%; text-align: left; padding: 12px;">
            ${uiIcon('shield')}<span>${t('privacyAccount', currentLang)}</span>
          </button>

          <button onclick="window.openHelpSupportModal()" class="btn btn-secondary" style="width: 100%; text-align: left; padding: 12px;">
            ${uiIcon('message')}<span>${t('helpSupport', currentLang)}</span>
          </button>

          <button onclick="window.promptUserLogout()" class="btn btn-secondary" style="width: 100%; margin-top: 10px; min-height: 42px; border-color: #ef4444; color:var(--theme-copy-ef4444, #ef4444);">
             ${uiIcon('logout')}<span>${t('logout', currentLang)}</span>
          </button>
        </div>
      </div>
    `;
  }

  // TOP BAR HEADER WITH NOTIFICATION BELL (REQUIREMENT 9)
  if(activeCustomerTab==='booking')mainHtml=`<section class="salon-brand" style="${brandingStyle(bookingBranding)}">${mainHtml}</section>`;
  if(renderSequence!==customerRenderSequence||(!isPublicGuest&&!isSessionCurrent(user.uid,renderGeneration)))return;
  container.innerHTML = `
    <div class="customer-panel" data-customer-screen="${activeCustomerTab}">
    <div class="header-bar">
      <div class="customer-header-identity">
        ${renderCustomerAvatar(user, displayName)}
        <span class="customer-header-name">${displayName}</span>
      </div>

      <div style="display: flex; align-items: center;">
        <button aria-label="${t('notificationSettings', currentLang)}" onclick="window.openNotificationCenterModal()" class="icon-button" style="position:relative;color:var(--gold-primary);">
          ${uiIcon('bell')}
          ${unreadCount > 0 ? `<span id="customer-unread-badge" style="position: absolute; top: -4px; right: -4px; width: 16px; height: 16px; border-radius: 50%; background: #dc2626; color: #fff; font-size: 10px; font-weight: 900; display: flex; align-items: center; justify-content: center;">${unreadCount}</span>` : ''}
        </button>
      </div>
    </div>

    ${mainHtml}

        <nav class="bottom-nav customer-bottom-nav">
      <button onclick="window.switchCustomerTab('home', null, true)" class="nav-item ${activeCustomerTab === 'home' ? 'active' : ''}" data-nav-bounce-tab="home">
        <span class="icon nav-bounce-icon">${uiIcon('home')}</span>
        <span>${t('homeTab', currentLang)}</span>
      </button>
      <button onclick="window.switchCustomerTab('salons', null, true)" class="nav-item ${activeCustomerTab === 'salons' ? 'active' : ''}" data-nav-bounce-tab="salons">
        <span class="icon nav-bounce-icon">${uiIcon('compass')}</span>
        <span>${t('salonsTab', currentLang)}</span>
      </button>
      <button onclick="window.switchCustomerTab('appointments', null, true)" class="nav-item ${activeCustomerTab === 'appointments' ? 'active' : ''}" data-nav-bounce-tab="appointments">
        <span class="icon nav-bounce-icon">${uiIcon('calendar')}</span>
        <span>${t('myAppointments', currentLang)}</span>
      </button>
      <button onclick="window.switchCustomerTab('profile', null, true)" class="nav-item ${activeCustomerTab === 'profile' ? 'active' : ''}" data-nav-bounce-tab="profile">
        <span class="icon nav-bounce-icon">${uiIcon('user')}</span>
        <span>${t('profileTab', currentLang)}</span>
      </button>
    </nav>
    </div>
  `;

  if (activeCustomerTab === 'ai') renderAiConsultantScreen(document.getElementById('customer-ai-surface'));
  container.querySelectorAll('[data-customer-salon]').forEach(button => button.addEventListener('click', () => window.openSalonDetailsModal(button.dataset.customerSalon)));
  container.querySelectorAll('[data-customer-action]').forEach(button => button.addEventListener('click', () => {
    const action = button.dataset.customerAction;
    if (action === 'book') window.startFavoriteAwareBooking();
    else if (action === 'edit') window.openPrivacyAccountModal();
    else window.switchCustomerTab(action);
  }));
  container.querySelector('#customer-home-search')?.addEventListener('submit', event => {
    event.preventDefault();
    searchQuery = new FormData(event.currentTarget).get('query').trim();
    window.switchCustomerTab('salons');
  });

  if (activeCustomerTab === 'home' && document.getElementById('customer-welcome-hero')) {
    setTimeout(() => { const hero=document.getElementById('customer-welcome-hero'); if(hero){ hero.style.opacity='0'; hero.style.transform='translateY(-8px)'; setTimeout(()=>hero.remove(),350); } }, 2400);
  }

  window.openLanguageModal = () => {
    const root = document.getElementById('modal-root');
    if (!root) return;
    const rows = SUPPORTED_LANGUAGES.map(language => `
      <button class="btn btn-secondary" onclick="window.selectCustomerLanguage('${language.code}')" style="width:100%;display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;border-color:${language.code === currentLang ? 'var(--gold)' : 'var(--border)'};">
        <span style="display:flex;align-items:center;gap:10px;"><span style="font-size:20px" aria-hidden="true">${language.flag}</span><span>${t('languageName_' + language.code, currentLang)}</span></span>
        ${language.code === currentLang ? uiIcon('check', '', t('selectedLanguage', currentLang)) : ''}
      </button>`).join('');
    root.innerHTML = `<div class="modal-overlay" onclick="window.closeModal()"><div class="modal-card animate-fade" onclick="event.stopPropagation()"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;"><h3 style="margin:0;color:var(--gold);">${t('language', currentLang)}</h3><button class="icon-button" aria-label="${t('closeBtn', currentLang)}" onclick="window.closeModal()">${uiIcon('x')}</button></div>${rows}</div></div>`;
  };

  window.selectCustomerLanguage = async languageCode => {
    if (!SUPPORTED_LANGUAGES.some(language => language.code === languageCode)) return;
    try {
      await updateUserLanguage(languageCode);
      user.language = languageCode;
      window.closeModal();
      renderCustomerScreen(user, onTabChange);
    } catch (error) {
      showErrorModal(t('errorTitle', currentLang), t('languageSaveFailed', currentLang));
    }
  };

  // NOTIFICATION CENTER MODAL (REQUIREMENT 9)
  window.openNotificationCenterModal = () => {
    const root = document.getElementById('modal-root');
    if (!root) return;

    const notificationLocale = currentLang === 'ru' ? 'ru-RU' : currentLang === 'en' ? 'en-GB' : 'tr-TR';
    const notifRows = notifList.map(n => `
      <button type="button" onclick="window.openCustomerNotification('${n.notificationId || ''}')" class="card" style="display:block;width:100%;text-align:left;padding: 10px; margin-bottom: 6px; background: ${n.read ? 'rgba(255,255,255,0.03)' : 'rgba(245,158,11,0.12)'}; border-color: ${n.read ? 'var(--border-color)' : 'var(--gold-primary)'};">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div style="font-size: 12px; font-weight: 800; color: var(--theme-ink-ffffff, #fff);">${escapeCustomerText(n.title)}</div>
          <div style="font-size: 9px; color: var(--text-muted);white-space:nowrap;">${new Date(n.createdAt).toLocaleString(notificationLocale, {timeZone:'Europe/Istanbul',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</div>
        </div>
        <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">${escapeCustomerText(n.message)}</div>
      </button>
    `).join('');

    root.innerHTML = `
      <div class="modal-overlay" onclick="window.closeModal()">
        <div class="modal-card animate-fade" onclick="event.stopPropagation()">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
            <h3 style="font-size: 15px; font-weight: 800; color: var(--gold-primary); margin: 0;"> ${t('ownerUi_098')}</h3>
            <button aria-label="${t('ownerUi_099')}" onclick="window.closeModal()" class="btn btn-secondary" style="padding: 4px 10px;">${uiIcon('x')}</button>
          </div>

          <div style="max-height:min(60vh, 420px);overflow-y:auto;margin-bottom:12px;display:flex;flex-direction:column;gap:8px;">
            ${notifList.length === 0 ? `<div style="font-size: 12px; color: var(--text-muted); text-align: center; padding: 20px;">${t('uiRemaining_060')}</div>` : notifRows}
          </div>

          <button onclick="window.markAllNotificationsRead()" class="btn btn-gold" style="width: 100%;">
            ${t('ownerUi_100')}
          </button>
        </div>
      </div>
    `;
  };

  window.markAllNotificationsRead = async () => {
    for (const n of notifList) {
      if (!n.read) {
        await saveRecord(`notifications/${user.uid}/${n.notificationId}/read`, true);
      }
    }
    window.closeModal();
    await renderCustomerScreen(user, onTabChange);
  };

  // PROFILE PHOTO UPLOAD & REMOVE MODAL (REQUIREMENT 4)
  window.openProfilePhotoModal = () => {
    const root = document.getElementById('modal-root');
    if (!root) return;

    root.innerHTML = `
      <div class="modal-overlay" onclick="window.closeModal()">
        <div class="modal-card animate-fade" onclick="event.stopPropagation()">
          <h3 style="font-size: 15px; font-weight: 800; color: var(--gold-primary); margin-bottom: 12px;"> ${t('uiRemaining_061')}</h3>

          <input type="file" id="profile-photo-input" accept="image/jpeg,image/png,image/webp" style="display: none;" onchange="window.handleProfilePhotoSelect(event)">

          <div style="display: flex; flex-direction: column; gap: 8px;">
            <button onclick="document.getElementById('profile-photo-input').click()" class="btn btn-gold">
               ${t('uiRemaining_062')}
            </button>
            ${user.photoUrl ? `
              <button onclick="window.removeProfilePhoto()" class="btn btn-secondary" style="border-color: #ef4444; color:var(--theme-copy-ef4444, #ef4444);">
                 ${t('uiRemaining_063')}
              </button>
            ` : ''}
            <button onclick="window.closeModal()" class="btn btn-secondary">
              ${t('portalUi_cancel')}
            </button>
          </div>
        </div>
      </div>
    `;
  };

  window.handleProfilePhotoSelect = (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      showErrorModal(t('errorTitle'), t('invalidProfilePhoto', currentLang));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showErrorModal(t('errorTitle'), t('profilePhotoTooLarge', currentLang));
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        canvas.width = 180;
        canvas.height = 180;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, 180, 180);

        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
        const safePhotoUrl = sanitizeProfilePhotoUrl(compressedBase64);
        if (!safePhotoUrl) return showErrorModal(t('errorTitle'), t('invalidProfilePhoto', currentLang));
        const saved = await saveRecord(`users/${user.uid}/photoUrl`, safePhotoUrl);
        if (!saved) return showErrorModal(t('errorTitle'), t('profilePhotoSaveFailed', currentLang));
        user.photoUrl = safePhotoUrl;
        window.closeModal();
        showSuccessModal(t('successTitle'), t('uiRemaining_064'));
        renderCustomerScreen(user, onTabChange);
      };
      img.onerror = () => showErrorModal(t('errorTitle'), t('invalidProfilePhoto', currentLang));
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  window.removeProfilePhoto = async () => {
    user.photoUrl = null;
    await saveRecord(`users/${user.uid}/photoUrl`, null);
    window.closeModal();
    showSuccessModal(t('successTitle'), t('uiRemaining_065'));
    renderCustomerScreen(user, onTabChange);
  };

  // CHANGE PASSWORD MODAL (REQUIREMENT 5)
  window.openChangePasswordModal = () => {
    const root = document.getElementById('modal-root');
    if (!root) return;

    root.innerHTML = `
      <div class="modal-overlay" onclick="window.closeModal()">
        <div class="modal-card animate-fade" onclick="event.stopPropagation()">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
            <h3 style="font-size: 15px; font-weight: 800; color: var(--gold-primary); margin: 0;"> ${t('uiRemaining_066')}</h3>
            <button aria-label="${t('ownerUi_099')}" onclick="window.closeModal()" class="btn btn-secondary" style="padding: 4px 10px;">${uiIcon('x')}</button>
          </div>

          <label style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">${t('uiRemaining_067')}</label>
          <input type="password" id="pwd-current" class="input-field" placeholder="••••••••">

          <label style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">${t('uiRemaining_068')}</label>
          <input type="password" id="pwd-new" class="input-field" placeholder="••••••••">

          <label style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">${t('uiRemaining_069')}</label>
          <input type="password" id="pwd-confirm" class="input-field" placeholder="••••••••">

          <button onclick="window.submitChangePassword()" class="btn btn-gold" style="width: 100%; margin-top: 8px;">
             ${t('uiRemaining_070')}
          </button>
        </div>
      </div>
    `;
  };

  window.submitChangePassword = async () => {
    const currentPwd = document.getElementById('pwd-current').value;
    const newPwd = document.getElementById('pwd-new').value;
    const confirmPwd = document.getElementById('pwd-confirm').value;

    if (!newPwd || newPwd.length < 6) {
      showErrorModal(t('errorTitle'), t('uiRemaining_071'));
      return;
    }
    if (newPwd !== confirmPwd) {
      showErrorModal(t('errorTitle'), t('uiRemaining_072'));
      return;
    }

    try {
      await changeCurrentUserPassword(currentPwd, newPwd);
      window.closeModal();
      showSuccessModal(t('successTitle'), t('uiRemaining_073'));
    } catch (error) {
      showErrorModal(t('errorTitle'), error.message || t('uiRemaining_074'));
    }
  };

  // BILDİRİM AYARLARI MODAL (REQUIREMENT 6)
  window.openNotificationSettingsModal = async () => {
    const root = document.getElementById('modal-root');
    if (!root) return;

    const prefs = await fetchRecord(`users/${user.uid}/notificationPreferences`) || {
      inApp: true,
      reminders: true,
      sound: true,
      campaigns: false
    };

    root.innerHTML = `
      <div class="modal-overlay" onclick="window.closeModal()">
        <div class="modal-card animate-fade" onclick="event.stopPropagation()">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
            <h3 style="font-size: 15px; font-weight: 800; color: var(--gold-primary); margin: 0;">${t('notificationSettings', currentLang)}</h3>
            <button aria-label="${t('ownerUi_099')}" onclick="window.closeModal()" class="btn btn-secondary" style="padding: 4px 10px;">${uiIcon('x')}</button>
          </div>

          <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px;">
            <label style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: var(--theme-ink-ffffff, #fff);">
              <span> ${t('inAppNotifs')}</span>
              <input type="checkbox" id="pref-inapp" ${prefs.inApp !== false ? 'checked' : ''} onchange="window.handleNotificationPermission(this.checked)">
            </label>
            <label style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: var(--theme-ink-ffffff, #fff);">
              <span> ${t('soundNotifs')}</span>
              <input type="checkbox" id="pref-sound" ${prefs.sound !== false ? 'checked' : ''}>
            </label>
            <label style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: var(--theme-ink-ffffff, #fff);">
              <span> ${t('uiRemaining_075')}</span>
              <input type="checkbox" id="pref-campaigns" ${prefs.campaigns ? 'checked' : ''}>
            </label>
          </div>

          <button type="button" onclick="window.toggleCustomerPush()" class="btn btn-secondary" style="width:100%;margin-bottom:8px;">${t('ownerUi_246')}</button>
          <div id="customer-push-state" style="font-size:10px;color:var(--text-muted);margin-bottom:8px;"></div>
          <button onclick="window.saveNotificationPreferences()" class="btn btn-gold" style="width: 100%; min-height: 42px;">
             ${t('ownerUi_184')}
          </button>
        </div>
      </div>
    `;
  };

  window.handleNotificationPermission = (isEnabling) => {
    if (isEnabling && 'Notification' in window && Notification.permission !== 'granted') {
      Notification.requestPermission().then(perm => {
        if (perm !== 'granted') {
          showErrorModal(t('uiRemaining_076'), t('uiRemaining_077'));
        }
      });
    }
  };

  window.saveNotificationPreferences = async () => {
    const existingPrefs = await fetchRecord(`users/${user.uid}/notificationPreferences`) || {};
    const prefs = {
      ...existingPrefs,
      inApp: document.getElementById('pref-inapp').checked,
      sound: document.getElementById('pref-sound').checked,
      campaigns: document.getElementById('pref-campaigns').checked,
      updatedAt: new Date().toISOString()
    };
    await saveRecord(`users/${user.uid}/notificationPreferences`, prefs);
    window.closeModal();
    showSuccessModal(t('successTitle'), t('uiRemaining_078'));
  };

  // GİZLİLİK VE HESAP MODAL
    // GİZLİLİK VE HESAP MODAL (SECTION 5 - NAME & PHONE EDIT + FORGOT PWD)
  window.openPrivacyAccountModal = () => {
    const root = document.getElementById('modal-root');
    if (!root) return;

    root.innerHTML = `
      <div class="modal-overlay" onclick="window.closeModal()">
        <div class="modal-card animate-fade" onclick="event.stopPropagation()">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
            <h3 style="font-size: 15px; font-weight: 800; color: var(--gold-primary); margin: 0;">${t('privacyAccount', currentLang)}</h3>
            <button aria-label="${t('ownerUi_099')}" onclick="window.closeModal()" class="btn btn-secondary" style="padding: 4px 10px;">${uiIcon('x')}</button>
          </div>

          <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px;">
            <button onclick="window.openProfilePhotoModal()" class="btn btn-secondary" style="width:100%;display:flex;align-items:center;justify-content:center;gap:8px;">
              ${uiIcon('user')} ${t('changeProfilePhoto', currentLang)}
            </button>
            <label style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">${t('ownerUi_253')}</label>
            <input type="text" id="cust-edit-name" value="${displayName}" class="input-field" placeholder="${t('ownerUi_253')}">

            <label style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">${t('uiRemaining_079')}</label>
            <input type="tel" id="cust-edit-phone" value="${user.phone || ''}" class="input-field" readonly>
            <small style="color: var(--text-muted);">${t('uiRemaining_080')}</small>

            <button onclick="window.submitCustomerProfileUpdate()" class="btn btn-gold" style="width: 100%;">
               ${t('uiRemaining_081')}
            </button>

            <div style="display: flex; gap: 8px; margin-top: 6px;">
              <button onclick="window.openChangePasswordModal()" class="btn btn-outline-gold" style="flex: 1; font-size: 11px;">
                 ${t('uiRemaining_066')}
              </button>
              <button onclick="window.openForgotPasswordModal()" class="btn btn-secondary" style="flex: 1; font-size: 11px;">
                 ${t('uiRemaining_082')}
              </button>
            </div>
          </div>

          <button onclick="window.requestDeleteAccount()" class="btn btn-secondary" style="width: 100%; border-color: #ef4444; color:var(--theme-copy-ef4444, #ef4444); font-size: 11px;">
             ${t('uiRemaining_083')}
          </button>
        </div>
      </div>
    `;
  };

  window.submitCustomerProfileUpdate = async () => {
    const nameInput = document.getElementById('cust-edit-name');
    const newName = formatPersonName(nameInput ? nameInput.value : displayName);

    if (!newName) {
      showErrorModal(t('errorTitle'), t('uiRemaining_084'));
      return;
    }

    user.displayName = newName;
    user.name = newName;
    await saveRecord(`users/${user.uid}/displayName`, newName, 'PUT');
    await saveRecord(`users/${user.uid}/name`, newName, 'PUT');

    window.closeModal();
    showSuccessModal(t('successTitle'), t('uiRemaining_085'));
    renderCustomerScreen(user, onTabChange);
  };

  window.openForgotPasswordModal = () => {
    const root = document.getElementById('modal-root');
    if (!root) return;

    root.innerHTML = `
      <div class="modal-overlay" onclick="window.closeModal()">
        <div class="modal-card animate-fade" onclick="event.stopPropagation()">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
            <h3 style="font-size: 15px; font-weight: 800; color: var(--gold-primary); margin: 0;"> ${t('uiRemaining_082')}</h3>
            <button aria-label="${t('ownerUi_099')}" onclick="window.closeModal()" class="btn btn-secondary" style="padding: 4px 10px;">${uiIcon('x')}</button>
          </div>

          <div style="font-size: 12px; color: var(--theme-ink-ffffff, #fff); background: rgba(245,158,11,0.12); padding: 12px; border-radius: 8px; line-height: 1.5; margin-bottom: 14px;">
             ${t('uiRemaining_086')}
          </div>

          <button onclick="window.closeModal(); window.openHelpSupportModal();" class="btn btn-gold" style="width: 100%;">
             ${t('uiRemaining_087')}
          </button>
        </div>
      </div>
    `;
  };

  window.requestDeleteAccount = () => {
    showConfirmModal(t('uiRemaining_088'), t('uiRemaining_089'), async () => {
      await saveRecord(`users/${user.uid}/deleteRequest`, { requestedAt: new Date().toISOString() });
      showSuccessModal(t('successTitle'), t('uiRemaining_090'));
    });
  };

  // YARDIM VE DESTEK MODAL
  window.openHelpSupportModal = () => {
    const root = document.getElementById('modal-root');
    if (!root) return;

    root.innerHTML = `
      <div class="modal-overlay" onclick="window.closeModal()">
        <div class="modal-card animate-fade" onclick="event.stopPropagation()">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
            <h3 style="font-size: 15px; font-weight: 800; color: var(--gold-primary); margin: 0;">${t('helpSupport', currentLang)}</h3>
            <button aria-label="${t('ownerUi_099')}" onclick="window.closeModal()" class="btn btn-secondary" style="padding: 4px 10px;">${uiIcon('x')}</button>
          </div>

          <label for="support-category" style="display:block;font-size:12px;font-weight:700;color:var(--theme-ink-ffffff, #fff);margin-bottom:6px;">${t('uiRemaining_304')}</label>
          <select id="support-category" class="input-field support-category-select" style="margin-bottom:10px;">
            <option>${t('uiRemaining_091')}</option><option>${t('uiRemaining_092')}</option><option>${t('uiRemaining_093')}</option><option>${t('uiRemaining_094')}</option><option>${t('uiRemaining_095')}</option><option>${t('uiRemaining_096')}</option>
          </select>
          <h4 style="font-size: 12px; font-weight: 700; color: var(--theme-ink-ffffff, #fff); margin-bottom: 6px;">${t('uiRemaining_097')}</h4>
          <textarea id="support-msg" class="input-field" rows="3" placeholder="${t('uiRemaining_098')}"></textarea>

          <button onclick="window.submitSupportTicket()" class="btn btn-gold" style="width: 100%; min-height: 40px;">
             ${t('uiRemaining_099')}
          </button>
        </div>
      </div>
    `;
  };

  window.submitSupportTicket = async () => {
    const msg = document.getElementById('support-msg').value;
    const category = document.getElementById('support-category').value;
    if (!msg) {
      showErrorModal(t('errorTitle'), t('uiRemaining_100'));
      return;
    }
    const ticketId = 'tkt_' + Date.now();
    await saveRecord(`support_tickets/${ticketId}`, { ticketId, userUid: user.uid, category, message: msg, createdAt: new Date().toISOString() });
    window.closeModal();
    showSuccessModal(t('successTitle'), t('uiRemaining_101'));
  };

  // CUSTOMER RESCHEDULE WITH 48-HOUR POLICY
  window.requestRescheduleCustomer = async (aptId, is48HoursOrMore) => {
    const apt = currentCustomerAppointmentsById.get(aptId);
    if (!apt || !aptId) return showErrorModal(t('errorTitle'), t('uiRemaining_102'));
    const todayDate = new Date().toISOString().split('T')[0];
    customerRescheduleDraft = { aptId, apt, date: apt.date >= todayDate ? apt.date : todayDate, time: null, is48HoursOrMore, requestId: 0 };
    await window.renderCustomerRescheduleModal();
  };

  window.toggleCustomerPush = async () => {
    const state = await getPushPermissionState();
    const next = state === 'granted' ? await disablePushNotifications() : await enablePushNotifications();
    const label = document.getElementById('customer-push-state');
    if (label) label.textContent = next.state === 'granted' ? t('ownerUi_247') : next.state === 'unsupported' ? t('ownerUi_248') : next.state === 'denied' ? t('ownerUi_249') : t('ownerUi_250');
    const prefs = await fetchRecord(`users/${user.uid}/notificationPreferences`) || {};
    await saveRecord(`users/${user.uid}/notificationPreferences`, { ...prefs, push:next.state === 'granted', updatedAt:new Date().toISOString() });
  };

  window.withdrawRescheduleRequestCustomer = (aptId) => {
    const apt = currentCustomerAppointmentsById.get(aptId);
    if (!apt || apt.status !== 'reschedule_requested') return showErrorModal(t('errorTitle'), t('uiRemaining_103'));
    showConfirmModal(t('uiRemaining_050'), t('uiRemaining_104'), async () => {
      try {
        const response = await authenticatedFetch('/api/booking/reschedule-approve', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ aptId, userUid: user.uid, action: 'withdraw' })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || t('uiRemaining_105'));
        recentlyCreatedCustomerAppointments.delete(aptId);
        showSuccessModal(t('successTitle'), t('uiRemaining_106'));
        await renderCustomerScreen(user, onTabChange);
      } catch (error) {
        showErrorModal(t('errorTitle'), error.message || t('uiRemaining_105'));
      }
    });
  };

  window.selectCustomerRescheduleDate = async (date) => {
    if (!customerRescheduleDraft || !/^\d{4}-\d{2}-\d{2}$/.test(String(date || ''))) return;
    customerRescheduleDraft.date = date;
    customerRescheduleDraft.time = null;
    await window.renderCustomerRescheduleModal();
  };

  window.selectCustomerRescheduleTime = (time) => {
    if (!customerRescheduleDraft) return;
    customerRescheduleDraft.time = time;
    window.renderCustomerRescheduleModal();
  };

  window.renderCustomerRescheduleModal = async () => {
    const root = document.getElementById('modal-root');
    if (!root || !customerRescheduleDraft) return;
    const draft = customerRescheduleDraft;
    const todayDate = new Date().toISOString().split('T')[0];
    const tomorrowDate = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const requestId = ++draft.requestId;
    root.innerHTML = `<div class="modal-overlay"><div class="modal-card animate-fade" style="text-align:center;"> ${t('ownerUi_107')}</div></div>`;
    let availability = { slots: [], busySlots: [], isClosed: false };
    let availabilityError = '';
    try {
      const response = await authenticatedFetch('/api/booking/availability', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: draft.apt.businessId, staffId: draft.apt.staffId, serviceId: draft.apt.serviceId, date: draft.date, durationMinutes: Number(draft.apt.serviceDuration || draft.apt.durationMinutes) || 30, customerPhone: user.phone })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || t('ownerUi_108'));
      availability = data;
    } catch (error) {
      availabilityError = error.message || t('ownerUi_108');
    }
    if (!customerRescheduleDraft || customerRescheduleDraft.requestId !== requestId) return;
    const availableSlots = Array.isArray(availability.slots) ? availability.slots : [];
    const busySlots = Array.isArray(availability.busySlots) ? availability.busySlots : [];
    const chronologicalSlots = [...new Set([...availableSlots, ...busySlots])].sort((a, b) => a.localeCompare(b));
    const slotHtml = chronologicalSlots.map(slot => {
      const available = availableSlots.includes(slot);
      const selected = draft.time === slot;
      return `<button type="button" ${available ? `onclick="window.selectCustomerRescheduleTime('${slot}')"` : 'disabled'} class="btn" style="padding:8px 5px;font-size:11px;background:${selected ? '#f59e0b' : available ? '#16a34a' : '#7f1d1d'};color:var(--theme-ink-ffffff, #fff);opacity:${available ? '1' : '.65'};">${slot}${available ? '' : t('uiRemaining_303')}</button>`;
    }).join('');

    root.innerHTML = `
      <div class="modal-overlay" onclick="window.closeModal()">
        <div class="modal-card animate-fade" onclick="event.stopPropagation()" style="max-height:88vh;overflow-y:auto;padding-bottom:max(18px,env(safe-area-inset-bottom));">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
          <h3 style="font-size: 15px; font-weight: 800; color: var(--gold-primary); margin-bottom: 10px;">
             ${draft.is48HoursOrMore ? t('uiRemaining_107') : t('uiRemaining_108')}
          </h3>
          <button aria-label="${t('ownerUi_099')}" type="button" onclick="window.closeModal()" class="btn btn-secondary" style="padding:5px 9px;">${uiIcon('x')}</button></div>
          <p style="font-size: 11px; color: var(--text-muted); margin-bottom: 12px;">
            ${draft.is48HoursOrMore ? t('uiRemaining_109') : t('uiRemaining_110')}
          </p>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-bottom:8px;">
            <button type="button" onclick="window.selectCustomerRescheduleDate('${todayDate}')" class="btn ${draft.date === todayDate ? 'btn-gold' : 'btn-secondary'}">${t('ownerUi_038')}</button>
            <button type="button" onclick="window.selectCustomerRescheduleDate('${tomorrowDate}')" class="btn ${draft.date === tomorrowDate ? 'btn-gold' : 'btn-secondary'}">${t('ownerUi_117')}</button>
          </div>
          <input type="date" min="${todayDate}" value="${draft.date}" onchange="window.selectCustomerRescheduleDate(this.value)" class="input-field" style="margin-bottom:10px;">
          ${availabilityError ? `<div style="color:var(--theme-copy-ef4444, #ef4444);font-size:11px;padding:10px;">${availabilityError}</div>` : availability.isClosed ? `<div style="color:var(--text-muted);font-size:11px;padding:12px;">${t('uiRemaining_111')}</div>` : `<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;">${slotHtml || `<div style="grid-column:1/-1;color:var(--text-muted);font-size:11px;padding:12px;">${t('ownerUi_126')}</div>`}</div>`}
          <button onclick="window.submitCustomerReschedule('${draft.aptId}')" ${!draft.time ? 'disabled' : ''} class="btn btn-gold" style="width:100%;margin-top:12px;opacity:${draft.time ? '1' : '.5'};">
             ${draft.is48HoursOrMore ? t('uiRemaining_112') : t('uiRemaining_113')}
          </button>
        </div>
      </button>
    `;
  };

  window.submitCustomerReschedule = async (aptId) => {
    const draft = customerRescheduleDraft;
    if (!draft || draft.aptId !== aptId) return showErrorModal(t('errorTitle'), t('uiRemaining_114'));
    const newDate = draft.date;
    const newTime = draft.time;

    if (!newDate || !newTime) {
      showErrorModal(t('errorTitle'), t('uiRemaining_115'));
      return;
    }

    const res = await authenticatedFetch(window.location.origin + '/api/booking/reschedule-approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aptId, newDate, newTime, userUid: user.uid })
    }).catch(() => null);

    const data = res ? await res.json().catch(() => null) : null;
    window.closeModal();

    if (res && res.ok && data && data.success) {
      customerRescheduleDraft = null;
      showSuccessModal(t('successTitle'), data.message || t('uiRemaining_116'));
      await renderCustomerScreen(user, onTabChange);
      if (data.requiresExternalNotice) {
        const apt = currentCustomerAppointmentsById.get(aptId) || {};
        window.openWhatsAppSmsModal(t('uiRemaining_117'), { customerName: user.displayName || user.name || t('staffUi_6'), customerPhone: user.phone, serviceName: apt.serviceNameSnapshot || apt.serviceName || t('ownerUi_056'), date: newDate, time: newTime, businessPhone: data.businessNotificationPhone || '' }, true);
      }
    } else {
      showErrorModal(t('errorTitle'), (data && data.error) ? data.error : t('uiRemaining_118'));
    }
  };

  // CUSTOMER CANCELLATION: >=48H DIRECT, <48H OWNER APPROVAL
  window.requestCancelCustomer = (aptId) => {
    const apt = currentCustomerAppointmentsById.get(aptId) || {};
    const hoursUntil = (new Date(`${apt.date}T${apt.time}:00`).getTime() - Date.now()) / 3600000;
    const direct = hoursUntil >= 48;
    showConfirmModal(direct ? t('uiRemaining_119') : t('cancelRequestBtn'), direct ? t('uiRemaining_120') : t('uiRemaining_121'), async () => {
      const res = await authenticatedFetch(window.location.origin + '/api/booking/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aptId, newStatus: 'cancel_requested', userUid: user.uid })
      }).catch(() => null);

      const data = res ? await res.json().catch(() => null) : null;
      if (res && res.ok && data && data.success) {
        showSuccessModal(t('successTitle'), data.mode === 'direct_cancelled' ? t('uiRemaining_122') : t('uiRemaining_123'));
        await renderCustomerScreen(user, onTabChange);
        if (data.requiresExternalNotice) window.openWhatsAppSmsModal(t('uiRemaining_124'), { customerName: user.displayName || user.name || t('staffUi_6'), customerPhone: user.phone, serviceName: apt.serviceNameSnapshot || apt.serviceName || t('ownerUi_056'), date: apt.date || '', time: apt.time || '', businessPhone: data.businessNotificationPhone || '' }, true);
      } else {
        showErrorModal(t('errorTitle'), (data && data.error) ? data.error : t('uiRemaining_125'));
      }
    });
  };

  // LOGOUT CONFIRM MODAL (REQUIREMENT 3)
  window.promptUserLogout = () => {
    showConfirmModal(t('staffUi_57'), t('ownerUi_322'), () => {
      window.completeExplicitLogout(onTabChange);
    });
  };

  // SERVICE SELECTION BOTTOM SHEET MODAL
  window.openServiceSelectionModal = async () => {
    const root = document.getElementById('modal-root');
    if (!root) return;

    const publicBusiness = await fetchRecord(`public_businesses/${bookingState.businessId}`) || {};
    const servicesList = Object.values(publicBusiness.services || {}).filter(service => service && service.active !== false);
    const availableServices = (servicesList.length > 0 ? servicesList : [
      { id: 'svc_1', name: 'Saç Kesimi & Sakal', price: 350, duration: 45 },
      { id: 'svc_2', name: 'VIP Saç & Cilt Bakımı', price: 500, duration: 60 },
      { id: 'svc_3', name: 'Ense & Sakal Düzeltme', price: 200, duration: 30 }
    ]);

    const serviceRowsHtml = availableServices.map(s => {
      const translatedName = autoTranslateCustomContent(s.name, currentLang);
      const isSelected = bookingState.serviceId === s.id;
      return `
        <div onclick="window.tempSelectService('${s.id}', '${translatedName}', ${s.price}, ${s.duration || 30})" class="card" style="padding: 12px; margin-bottom: 8px; cursor: pointer; border-color: ${isSelected ? 'var(--gold-primary)' : 'var(--border-color)'}; background: ${isSelected ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.04)'}; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-size: 13px; font-weight: 800; color: var(--theme-ink-ffffff, #fff);"> ${translatedName}</div>
            <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">${t('uiRemaining_126')} ${s.duration || 30} ${t('uiRemaining_305')}</div>
          </div>
          <div style="font-size: 14px; color: var(--gold-primary); font-weight: 900;">${s.price} TL</div>
        </div>
      `;
    }).join('');

    root.innerHTML = `
      <div class="modal-overlay" onclick="window.closeModal()">
        <div class="modal-card animate-fade" onclick="event.stopPropagation()">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
            <h3 style="font-size: 15px; font-weight: 800; color: var(--gold-primary); margin: 0;"> ${t('uiRemaining_127')}</h3>
            <button aria-label="${t('ownerUi_099')}" onclick="window.closeModal()" class="btn btn-secondary" style="padding: 4px 10px;">${uiIcon('x')}</button>
          </div>

          <div style="max-height: 300px; overflow-y: auto; margin-bottom: 14px;">
            ${serviceRowsHtml}
          </div>

          <button onclick="window.confirmServiceSelection()" class="btn btn-gold" style="width: 100%; min-height: 42px;">
            ${t('uiRemaining_128')}
          </button>
        </div>
      </div>
    `;
  };

  window.tempSelectService = (id, name, price, duration) => {
    bookingState.serviceId = id;
    bookingState.serviceName = name;
    bookingState.servicePrice = price;
    bookingState.serviceDuration = duration;
    window.openServiceSelectionModal();
  };

  window.confirmServiceSelection = () => {
    if (!bookingState.serviceId) {
      showErrorModal(t('errorTitle'), t('uiRemaining_129'));
      return;
    }
    window.closeModal();
    renderCustomerScreen(user, onTabChange);
  };

  window.selectSalonForBooking = (bizId) => { window.beginNewBookingFromSalonById(bizId); };

  window.selectBookingStaff = (id, name) => {
    bookingState.staffId = id;
    bookingState.staffName = name;
    renderCustomerScreen(user, onTabChange);
  };

  window.selectBookingDate = (d) => {
    bookingState.date = d;
    bookingState.time = null;
    renderCustomerScreen(user, onTabChange);
  };

  window.selectBookingTime = (tStr) => {
    bookingState.time = tStr;
    renderCustomerScreen(user, onTabChange);
  };

  window.switchCustomerTab = async (tab, targetBizId = null, animateTouchNav = false) => {
    if (tab === 'booking' && targetBizId) {
      beginNewBookingFromSalonById(targetBizId);
      return;
    }
    activeCustomerTab = tab;
    await renderCustomerScreen(user, onTabChange);
    triggerTouchNavIconBounce(tab, animateTouchNav);
  };

  window.openCustomerNotification = async notificationId => {
    const notification = notifList.find(item => item && item.notificationId === notificationId);
    if (!notification) return;
    const wasRead = notification.read === true;
    notification.read = true;
    if (!wasRead) {
      const badge = document.getElementById('customer-unread-badge');
      if (badge) {
        const nextCount = Math.max(0, Number(badge.textContent || 0) - 1);
        if (nextCount) badge.textContent = String(nextCount); else badge.remove();
      }
    }
    window.closeModal();
    const safeTab = ['appointments', 'profile', 'salons', 'home'].includes(notification.targetTab) ? notification.targetTab : (notification.appointmentId ? 'appointments' : 'home');
    activeCustomerTab = safeTab;
    if (safeTab === 'appointments') activeCustomerAppointmentCategory = notification.targetSection === 'pending' ? 'pending' : 'active';
    if (!wasRead) {
      const saved = await saveRecord(`notifications/${user.uid}/${notificationId}/read`, true, 'PUT');
      if (!saved) notification.read = false;
    }
    await renderCustomerScreen(user, onTabChange);
    if (safeTab === 'salons' && /^biz_[a-z0-9_-]+$/i.test(String(notification.businessId || ''))) {
      await window.openSalonDetailsModal(notification.businessId);
    }
  };

  window.switchCustomerAppointmentCategory = category => {
    if (!['pending', 'active', 'cancelled', 'past'].includes(category)) return;
    activeCustomerAppointmentCategory = category;
    renderCustomerScreen(user, onTabChange);
  };

  window.setCustomerSalonFilter = filter => {
    customerSalonFilter = filter === 'favorites' ? 'favorites' : 'all';
    renderCustomerScreen(user, onTabChange);
  };

  window.startFavoriteAwareBooking = async () => {
    const publicBusinesses = await fetchRecord('public_businesses') || {};
    const favorites = Array.from(favoriteSalonIds).map(id => publicBusinesses[id]).filter(Boolean);
    const bookable = favorites.filter(salon => salon.status === 'active' && salon.discoveryEnabled === true && salon.bookingEnabled !== false);
    if (!favoriteSalonIds.size) { activeCustomerTab = 'salons'; return renderCustomerScreen(user, onTabChange); }
    if (!bookable.length) {
      activeCustomerTab = 'salons';
      await renderCustomerScreen(user, onTabChange);
      return showErrorModal(t('errorTitle', currentLang), t('favoriteSalonUnavailable', currentLang));
    }
    if (bookable.length === 1 && favoriteSalonIds.size === 1) return beginNewBookingFromSalonById(bookable[0].businessId);
    const root = document.getElementById('modal-root');
    if (!root) return;
    root.innerHTML = `<div class="modal-overlay" onclick="window.closeModal()"><div class="modal-card" onclick="event.stopPropagation()"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;"><h3 style="margin:0;color:var(--gold);">${t('chooseFavoriteSalon', currentLang)}</h3><button class="icon-button" aria-label="${t('closeBtn', currentLang)}" onclick="window.closeModal()">${uiIcon('x')}</button></div><div class="favorite-booking-list">${bookable.map(salon => `<button class="favorite-booking-card" onclick="window.beginNewBookingFromSalonById('${salon.businessId}')"><img src="${salon.logoUrl || salon.photoUrl || './assets/images/unelivo-placeholder.svg'}" alt=""><span><strong>${escapeCustomerText(salon.name || t('staffUi_59'))}</strong><small>${escapeCustomerText([salon.district, salon.city].filter(Boolean).join(' / '))}</small>${salon.averageRating ? `<em>${uiIcon('star')} ${Number(salon.averageRating) || 0}</em>` : ''}</span>${uiIcon('chevron')}</button>`).join('')}</div></div></div>`;
  };

  window.toggleFavoriteSalon = async businessId => {
    if (!businessId) return;
    const nextValue = !favoriteSalonIds.has(businessId);
    if (nextValue) favoriteSalonIds.add(businessId); else favoriteSalonIds.delete(businessId);
    const saved = await saveRecord(`users/${user.uid}/favoriteSalons/${businessId}`, nextValue, 'PUT');
    if (!saved) {
      if (nextValue) favoriteSalonIds.delete(businessId); else favoriteSalonIds.add(businessId);
      return showErrorModal(t('errorTitle'), t('uiRemaining_130'));
    }
    renderCustomerScreen(user, onTabChange);
  };

  window.hideCustomerAppointment = appointmentId => {
    const appointment = currentCustomerAppointmentsById.get(appointmentId);
    if (!appointment || appointment.customerUid !== user.uid) return showErrorModal(t('errorTitle'), t('historyHideDenied', currentLang));
    if (!['completed', 'cancelled', 'rejected', 'no_show', 'expired'].includes(effectiveAppointmentStatus(appointment))) {
      return showErrorModal(t('errorTitle'), t('activeAppointmentCannotHide', currentLang));
    }
    showConfirmModal(t('removeFromHistory', currentLang), t('removeFromHistoryConfirm', currentLang), async () => {
      const response = await authenticatedFetch('/api/customer/hide-appointment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ appointmentId }) });
      if (!response.ok) return showErrorModal(t('errorTitle'), t('historyHideFailed', currentLang));
      renderCustomerScreen(user, onTabChange);
    });
  };

  window.setDiscoveryFilter=(key,value)=>{if(!['type','city','district','radius'].includes(key))return;discoveryFilters[key]=key==='radius'?Number(value):value;if(key==='city')discoveryFilters.district='';window._currentRenderCustomerScreen?.();};
  window.clearDiscoveryLocation=()=>{++discoveryLocationSequence;discoveryLocating=false;discoveryFilters.origin=null;discoveryFilters.nearby=false;discoveryFilters.radius=0;discoveryLocationMessage='Konum kaldırıldı.';window._currentRenderCustomerScreen?.();};
  window.findNearbySalons=()=>{
    if(discoveryLocating)return;
    if(!navigator.geolocation){discoveryLocationMessage='Konum desteklenmiyor. İl ve ilçe seçebilirsiniz.';window._currentRenderCustomerScreen?.();return;}
    const request=++discoveryLocationSequence;discoveryLocating=true;discoveryLocationMessage='Konum yalnız mesafeleri hesaplamak için bu sekmede kullanılır.';window._currentRenderCustomerScreen?.();
    navigator.geolocation.getCurrentPosition(position=>{if(request!==discoveryLocationSequence)return;discoveryLocating=false;const origin={latitude:position.coords.latitude,longitude:position.coords.longitude};if(!validPoint(origin.latitude,origin.longitude)){discoveryLocationMessage='Geçerli konum alınamadı.';}else{discoveryFilters.origin=origin;discoveryFilters.nearby=true;discoveryLocationMessage='Yakından uzağa sıralandı. Mesafeler kuş uçuşudur; konumu olmayan salonlar sonda gösterilir.';}window._currentRenderCustomerScreen?.();},()=>{if(request!==discoveryLocationSequence)return;discoveryLocating=false;discoveryLocationMessage='Konum alınamadı veya izin verilmedi. İl ve ilçe seçerek devam edebilirsiniz.';window._currentRenderCustomerScreen?.();},{enableHighAccuracy:false,timeout:10000,maximumAge:60000});
  };
  window.setDiscoverySearch = (value) => {
    searchQuery = value || '';
    const query = trNormalize(searchQuery.trim());
    const cards = Array.from(document.querySelectorAll('[data-salon-search]'));
    let visibleCount = 0;
    cards.forEach(card => {
      const searchable = decodeURIComponent(card.dataset.salonSearch || '');
      const visible = !query || searchable.includes(query);
      card.style.display = visible ? '' : 'none';
      if (visible) visibleCount += 1;
    });

    const emptyState = document.getElementById('discovery-search-empty');
    if (emptyState) emptyState.style.display = visibleCount === 0 ? 'block' : 'none';
  };

  // SUBMIT CUSTOMER BOOKING WITH LOADING STATE & DOUBLE CLICK GUARD
      window.submitCustomerBooking = async () => {
    if (!bookingState.serviceId) {
      showErrorModal(t('uiRemaining_131'), t('uiRemaining_129'));
      return;
    }
    if (!bookingState.staffId) {
      showErrorModal(t('uiRemaining_132'), t('uiRemaining_133'));
      return;
    }
    if (!bookingState.date) {
      showErrorModal(t('uiRemaining_134'), t('uiRemaining_135'));
      return;
    }
    if (!bookingState.time) {
      showErrorModal(t('uiRemaining_136'), t('uiRemaining_137'));
      return;
    }

    const btnSubmit = document.getElementById('btn-submit-booking');
    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.innerHTML = t('uiRemaining_138');
    }

    try {
      const res = await authenticatedFetch(window.location.origin + '/api/booking/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: bookingState.businessId,
          customerUid: user.uid,
          customerName: user.displayName || user.name || t('staffUi_6'),
          customerPhone: user.phone,
          serviceId: bookingState.serviceId,
          serviceName: bookingState.serviceName,
          servicePrice: bookingState.servicePrice,
          serviceDuration: bookingState.serviceDuration,
          staffId: bookingState.staffId,
          staffName: bookingState.staffName,
          date: bookingState.date,
          time: bookingState.time
        })
      });

      const data = await res.json().catch(() => null);

      if (res.ok && data && data.success) {
        if (data.data) recentlyCreatedCustomerAppointments.set(data.appointmentId || data.aptId, data.data);
        const created = data.data || {};
        resetBookingState();
        showSuccessModal(t('successTitle'), `${t('bookingCreated', currentLang)} • ${created.businessNameSnapshot || ''} • ${created.serviceNameSnapshot || ''} • ${created.date || ''} ${created.time || ''} • ${t('assignedStaff', currentLang)}: ${formatPersonName(created.staffNameSnapshot || created.staffName || t('ownerUi_076'))}`);
        activeCustomerTab = 'appointments';
        renderCustomerScreen(user, onTabChange);
      } else {
        showErrorModal(t('errorTitle'), (data && data.error) ? data.error : t('staffUi_95'));
        if (btnSubmit) {
          btnSubmit.disabled = false;
          btnSubmit.innerHTML = ' ' + t('confirmBooking', currentLang);
        }
      }
    } catch (err) {
      showErrorModal(t('errorTitle'), t('ownerUi_330'));
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = ' ' + t('confirmBooking', currentLang);
      }
    }
  };

  // WHATSAPP & SMS MODAL ENGINE
  window.openWhatsAppSmsModal = (actionType, details, requireChoice = false) => {
    const root = document.getElementById('modal-root');
    if (!root) return;
    window.closeWhatsAppSmsModal = () => {
      const modalRoot = document.getElementById('modal-root');
      if (modalRoot) modalRoot.innerHTML = '';
      document.body.classList.remove('modal-open');
      document.body.style.overflow = '';
    };

    const messageText = t('uiRemaining_314', null, {
      action: actionType.toUpperCase(), customer: details.customerName,
      phone: details.customerPhone, service: details.serviceName,
      date: details.date, time: details.time
    });
    const encodedText = encodeURIComponent(messageText);
    const rawBusinessPhone = String(details.businessPhone || '');
    let businessPhone = rawBusinessPhone.replace(/\D/g, '');
    if (businessPhone.startsWith('0')) businessPhone = '90' + businessPhone.slice(1);
    if (businessPhone.length === 10) businessPhone = '90' + businessPhone;
    const hasBusinessPhone = /^90\d{10}$/.test(businessPhone);

    root.innerHTML = `
      <div class="modal-overlay" onclick="${requireChoice ? '' : 'window.closeWhatsAppSmsModal()'}">
        <div class="modal-card animate-fade customer-notice-dialog" role="dialog" aria-modal="true" aria-label="${t(details.canonical ? 'bookingCreated' : 'uiRemaining_139', currentLang)}" onclick="event.stopPropagation()">
          ${details.canonical ? `<section class="customer-booking-success"><span class="customer-success-icon">${uiIcon('check')}</span><h2>${t('bookingCreated', currentLang)}</h2><div class="customer-success-details"><strong>${escapeCustomerText(details.canonical.businessNameSnapshot || '')}</strong><p>${escapeCustomerText(details.canonical.serviceNameSnapshot || '')}</p><p>${escapeCustomerText(details.canonical.staffNameSnapshot || details.canonical.staffName || '')}</p><p>${escapeCustomerText(details.canonical.date || '')} · ${escapeCustomerText(details.canonical.time || '')}</p>${details.canonical.servicePriceSnapshot != null ? `<p>${Number(details.canonical.servicePriceSnapshot)} TL</p>` : ''}<span class="badge badge-pending">${t(details.canonical.status || 'pending', currentLang)}</span></div></section>` : ''}
          <h3 style="font-size: 16px; font-weight: 800; color: var(--gold-primary); margin-bottom: 10px;">
             ${t('uiRemaining_139')}
          </h3>
          <p style="font-size: 11px; color: var(--text-muted); margin-bottom: 14px;">
            ${requireChoice ? t('uiRemaining_140') : t('uiRemaining_141')}
          </p>

          <div style="display: flex; flex-direction: column; gap: 8px;">
            <a href="${hasBusinessPhone ? `https://wa.me/${businessPhone}?text=${encodedText}` : `https://wa.me/?text=${encodedText}`}" target="_blank" rel="noopener" onclick="window.closeWhatsAppSmsModal()" class="btn btn-gold" style="text-align: center; text-decoration: none;">
               ${t('notifyWhatsApp', currentLang)}
            </a>
            <a href="${hasBusinessPhone ? `sms:+${businessPhone}?body=${encodedText}` : `sms:?body=${encodedText}`}" onclick="window.closeWhatsAppSmsModal()" class="btn btn-outline-gold" style="text-align: center; text-decoration: none;">
               ${t('notifySms', currentLang)}
            </a>
            ${!hasBusinessPhone ? `<div style="font-size: 10px; color: var(--text-muted); text-align: center;">${t('uiRemaining_142')}</div>` : ''}
            <button type="button" onclick="window.closeWhatsAppSmsModal()" class="btn btn-secondary">${t('notNow', currentLang)}</button>
          </div>
        </div>
      </div>
    `;
  };

  // MÜŞTERİ SALON DETAY EKRANI (REQUIREMENT 9)
  window.openSalonDetailsModal = async (businessId, options = {}) => {
    if (!/^biz_[a-z0-9_-]+$/i.test(String(businessId || ''))) return showErrorModal(t('errorTitle'), t('uiRemaining_143'));
    const publicRecord = await fetchRecord(`public_businesses/${businessId}`);
    const biz = publicRecord ? { ...publicRecord, businessId } : null;
    if (!biz) return showErrorModal(t('errorTitle'), t('uiRemaining_144'));

    salonDetailState = { model: createSalonDetailModel(biz, { escape: escapeCustomerText, sanitizeImageUrl: sanitizeProfilePhotoUrl }), mode: 'modal', activeSection: 'about', reviews: null, reviewHasMore: false, reviewEligibility: { mode:'none' }, eligibleAppointments: [], selectedReviewAppointmentId: null, reviewComposerMode: 'create', reviewDraftRating: 5, reviewDraftComment: '', reviewLimit: 5 };
    await renderSharedSalonDetail();
    return;

    const root = document.getElementById('modal-root');
    if (!root) return;

    const media = biz.media || {
      profileImageUrl: biz.profileImageUrl || null,
      coverImageUrl: biz.coverImageUrl || null,
      gallery: biz.gallery || []
    };

    const coverUrl = media.coverImageUrl || media.profileImageUrl || biz.coverImageUrl || biz.profileImageUrl || './assets/images/unelivo-placeholder.svg';
    const profileUrl = media.profileImageUrl || biz.profileImageUrl || null;
    const servicesList = Object.entries(biz.services || {}).map(([id, service]) => ({ ...(service || {}), id:(service && service.id) || id })).filter(service => service && service.active !== false);
    const staffList = Object.values(biz.staff || {}).filter(member => member && member.active !== false);

    const reviewsResponse = await authenticatedFetch('/api/reviews/public-list', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ businessId }) }).catch(() => null);
    const reviewsData = reviewsResponse && reviewsResponse.ok ? await reviewsResponse.json().catch(() => ({})) : {};
    const reviews = Array.isArray(reviewsData.reviews) ? reviewsData.reviews : [];
    const reviewEligibility = reviewsData.reviewEligibility || { mode:'none' };
    const servicesHtml = servicesList.map(s => `
      <div class="public-service-row">
        <span style="color: var(--theme-ink-ffffff, #fff);"> ${escapeCustomerText(s.name)} (${Number(s.duration) || 30} ${t('ownerUi_109')})</span>
        <span style="color: var(--gold-primary); font-weight: 800;">${Number(s.price) || 0} TL</span>
        ${options.publicStorefront && biz.bookingEnabled !== false ? `<button type="button" class="btn btn-secondary public-service-book" onclick="window.beginNewBookingFromSalonById('${businessId}',decodeURIComponent('${encodeURIComponent(String(s.id || ''))}'))">${t('uiRemaining_007')}</button>` : ''}
      </div>
    `).join('');

    const staffHtml = staffList.map(st => `<div class="salon-staff-card">${renderStaffAvatar(st, 42)}<span><strong>${formatPersonName(st.displayName || st.name)}</strong><small>${escapeCustomerText(st.roleLabel || st.title || st.role || t('ownerUi_076'))}</small></span></div>`).join('');

    const safeGallery = (media.gallery || []).map(sanitizeProfilePhotoUrl).filter(Boolean);
    const galleryHtml = safeGallery.map((imgUrl, index) => `
      <button type="button" class="salon-gallery-thumb" onclick="window.openCustomerGallery(${index})"><img src="${escapeCustomerText(imgUrl)}" alt="${t('uiRemaining_010')} ${index + 1}"></button>
    `).join('');
    const socials = biz.socials || {};
    const socialHtml = Object.entries({ instagram: ['Instagram', 'instagram'], whatsapp: ['WhatsApp', 'whatsapp'], tiktok: ['TikTok', 'music'], website: [t('uiRemaining_300'), 'globe'] }).filter(([key]) => socials[key]).map(([key, [label, icon]]) => `<a class="btn btn-secondary" href="${socials[key]}" target="_blank" rel="noopener noreferrer">${uiIcon(icon)} ${label}</a>`).join('');
    const scheduleLabels = {
      tr:{ monday:t('staffUi_9'),tuesday:t('staffUi_10'),wednesday:t('staffUi_11'),thursday:t('staffUi_12'),friday:t('staffUi_13'),saturday:t('staffUi_14'),sunday:t('staffUi_15'),closed:t('staffUi_16'),todayOpen:t('uiRemaining_002'),todayClosed:t('uiRemaining_001') },
      en:{ monday:'Monday',tuesday:'Tuesday',wednesday:'Wednesday',thursday:'Thursday',friday:'Friday',saturday:'Saturday',sunday:'Sunday',closed:'Closed',todayOpen:'Open today',todayClosed:'Closed today' },
      ru:{ monday:'Понедельник',tuesday:'Вторник',wednesday:'Среда',thursday:'Четверг',friday:'Пятница',saturday:'Суббота',sunday:'Воскресенье',closed:'Закрыто',todayOpen:'Сегодня открыто',todayClosed:'Сегодня закрыто' }
    };
    const scheduleText = scheduleLabels[currentLang] || scheduleLabels.en;
    const scheduleOrder = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
    const todayKey = new Intl.DateTimeFormat('en-US', { timeZone:'Europe/Istanbul', weekday:'long' }).format(new Date()).toLowerCase();
    const todaySchedule = (biz.weeklySchedule || {})[todayKey];
    const scheduleHtml = scheduleOrder.map(dayKey => [dayKey, (biz.weeklySchedule || {})[dayKey]]).filter(([, day]) => day && typeof day === 'object').map(([dayKey, day]) => `<div class="salon-schedule-row ${dayKey === todayKey ? 'is-today' : ''}"><span>${escapeCustomerText(scheduleText[dayKey] || dayKey)}</span><strong>${day.isOpen === false ? scheduleText.closed : `${escapeCustomerText(day.start || day.openTime || '09:00')}–${escapeCustomerText(day.end || day.closeTime || '20:00')}`}</strong></div>`).join('');
    const todayStatus = todaySchedule && todaySchedule.isOpen === false ? scheduleText.todayClosed : scheduleText.todayOpen;
    const latitude = normalizeCoordinate(biz.latitude, -90, 90);
    const longitude = normalizeCoordinate(biz.longitude, -180, 180);
    const coordinatesValid = latitude !== null && longitude !== null && !(latitude === 0 && longitude === 0);
    const destination = coordinatesValid ? `${latitude},${longitude}` : [biz.address,biz.district,biz.city].filter(Boolean).join(', ');
    const encodedDestination = encodeURIComponent(destination);
    const mapUrl = destination ? `https://www.google.com/maps?q=${encodedDestination}&output=embed` : '';
    const directionsUrl = destination ? `https://www.google.com/maps/dir/?api=1&destination=${encodedDestination}&travelmode=driving` : '';
    const renderReview = review => `<article class="public-review"><div><strong>${escapeCustomerText(review.customerName)}</strong><span>${uiIcon('star')} ${Number(review.rating) || 0}</span></div>${review.comment ? `<p>${escapeCustomerText(review.comment)}</p>` : ''}<small>${escapeCustomerText(String(review.createdAt || '').slice(0,10))}</small></article>`;
    const reviewsHtml = reviews.slice(0, 3).map(renderReview).join('');
    const remainingReviewsHtml = reviews.length > 3 ? `<details class="public-more-reviews"><summary>${t('uiRemaining_012')}${reviews.length - 3})</summary>${reviews.slice(3).map(renderReview).join('')}</details>` : '';
    const ratingLabel = Number(biz.averageRating) > 0 ? `${Number(biz.averageRating).toFixed(1)} (${Number(biz.ratingCount || biz.reviewCount) || reviews.length})` : t('uiRemaining_299');
    customerLightboxImages = safeGallery;

    const wrapperOpen = options.publicStorefront
      ? `<div class="public-storefront-page animate-fade"><header class="public-storefront-header"><a href="/" aria-label="${t('uiRemaining_147')}">UNELIVO</a><span>${t('uiRemaining_003')}</span></header><main class="public-storefront-content">`
      : `<div class="modal-overlay" onclick="window.closeModal()"><div class="modal-card salon-detail-sheet animate-fade" onclick="event.stopPropagation()"><div class="salon-detail-sticky-header"><strong>${escapeCustomerText(biz.name || t('staffUi_59'))}</strong><button type="button" class="icon-button" aria-label="${t('ownerUi_099')}" onclick="window.closeModal()">${uiIcon('x')}</button></div>`;
    const wrapperClose = options.publicStorefront ? '</main></div>' : '</div></div>';
    root.innerHTML = `
          ${wrapperOpen}
          <section class="public-storefront-hero">
            <img class="public-storefront-cover" src="${escapeCustomerText(coverUrl)}" alt="${t('uiRemaining_004')}">
          </section>

          <section class="public-storefront-identity">
            <div class="public-storefront-summary">
              ${profileUrl ? `<img class="public-storefront-logo" src="${escapeCustomerText(profileUrl)}" alt="${t('uiRemaining_005')}">` : ''}
              <div>
                <h1>${escapeCustomerText(biz.name)}</h1>
                <p>${escapeCustomerText(biz.category || '')}${biz.category ? ' • ' : ''}${escapeCustomerText([biz.neighborhood, biz.district, biz.city].filter(Boolean).join(' / '))}</p>
                <div class="public-storefront-badges"><span>${uiIcon('star')} ${ratingLabel}</span><span class="${todaySchedule && todaySchedule.isOpen === false ? 'is-closed' : 'is-open'}">${todayStatus}</span></div>
              </div>
            </div>
            ${biz.description ? `<p class="public-storefront-description">${escapeCustomerText(biz.description)}</p>` : ''}
            <div class="public-storefront-location">${uiIcon('mapPin')}<span>${escapeCustomerText([biz.address, biz.neighborhood, biz.district, biz.city].filter(Boolean).join(', '))}</span>${directionsUrl ? `<a href="${directionsUrl}" target="_blank" rel="noopener noreferrer">${t('uiRemaining_006')}</a>` : ''}</div>
          </section>

          <div class="public-storefront-grid">
          <div class="public-storefront-main">
          <section class="public-storefront-section">
          <h2>${t('ownerUi_087')}</h2>
          <div class="public-service-list">
            ${servicesList.length === 0 ? `<div class="public-empty">${t('uiRemaining_008')}</div>` : servicesHtml}
          </div>
          </section>
          <section class="public-storefront-section">
          <h2>${t('uiRemaining_301')}</h2>
          <div class="salon-staff-grid">
            ${staffList.length === 0 ? `<div class="public-empty">${t('uiRemaining_009')}</div>` : staffHtml}
          </div>
          </section>
          ${safeGallery.length > 0 ? `
            <section class="public-storefront-section"><h2>${t('ownerUi_274')}</h2>
            <div class="public-storefront-gallery">
              ${galleryHtml}
            </div></section>
          ` : ''}
          <section class="public-storefront-section"><h2>${uiIcon('star')} ${t('uiRemaining_302')} <small>${ratingLabel}</small></h2>
          ${reviews.length ? reviewsHtml : `<div style="font-size:11px;color:var(--text-muted);margin-bottom:10px;">${t('uiRemaining_011')}</div>`}
          ${remainingReviewsHtml}
          ${reviewEligibility.mode === 'create' ? `<button class="btn btn-secondary" style="width:100%;margin-bottom:8px;" onclick="window.openCustomerReviewModal('${businessId}','${reviewEligibility.appointmentId}','create')">${t('uiRemaining_148')}</button>` : ''}
          ${reviewEligibility.mode === 'edit' ? `<button class="btn btn-secondary" style="width:100%;margin-bottom:8px;" onclick="window.openCustomerReviewModal('${businessId}','${reviewEligibility.appointmentId}','edit',${Number(reviewEligibility.rating) || 5},'${encodeURIComponent(reviewEligibility.comment || '')}')">${t('uiRemaining_149')}</button>` : ''}
          ${reviewEligibility.mode === 'readonly' ? `<div style="font-size:10px;color:var(--text-muted);margin-bottom:8px;">${t('uiRemaining_150')}</div>` : ''}
          ${isPublicGuest ? '' : `<button onclick="window.toggleFavoriteSalon('${businessId}')" class="btn btn-secondary" style="width:100%;margin-bottom:8px;border-color:#ef4444;">${favoriteSalonIds.has(businessId) ? t('uiRemaining_151') : t('uiRemaining_152')}</button>`}
          </section>
          </div>
          <aside class="public-storefront-side">
            ${scheduleHtml ? `<section class="public-storefront-section"><h2>${uiIcon('clock')} ${t('uiRemaining_013')}</h2><div class="salon-schedule">${scheduleHtml}</div></section>` : ''}
            ${destination ? `<section class="public-storefront-section"><h2>${uiIcon('mapPin')} ${t('uiRemaining_014')}</h2>${mapUrl ? `<iframe class="public-storefront-map" title="${t('uiRemaining_015')}" src="${mapUrl}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>` : ''}${socialHtml ? `<div class="salon-social-grid">${socialHtml}</div>` : ''}${directionsUrl ? `<a href="${directionsUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary public-directions">${uiIcon('mapPin')} ${t('uiRemaining_006')}</a>` : ''}</section>` : (socialHtml ? `<section class="public-storefront-section"><h2>${t('uiRemaining_153')}</h2><div class="salon-social-grid">${socialHtml}</div></section>` : '')}
          </aside>
          </div>
          <button onclick="window.beginNewBookingFromSalonById('${businessId}')" class="btn btn-gold salon-detail-cta" ${biz.bookingEnabled === false ? 'disabled' : ''}>
             ${biz.bookingEnabled === false ? t('uiRemaining_016') : t('uiRemaining_017')}
          </button>
          ${wrapperClose}
    `;

    window.openCustomerGallery = index => {
      customerLightboxIndex = Math.max(0, Math.min(customerLightboxImages.length - 1, Number(index) || 0));
      window.renderCustomerGalleryLightbox();
    };
    window.renderCustomerGalleryLightbox = () => {
      if (!customerLightboxImages.length) return;
      if (modalRoot) modalRoot.innerHTML = `<div class="customer-lightbox" onclick="window.closeModal()"><button class="icon-button customer-lightbox-close" aria-label="${t('ownerUi_099')}" onclick="window.closeModal()">${uiIcon('x')}</button>${customerLightboxImages.length > 1 ? `<button class="icon-button customer-lightbox-prev" aria-label="${t('uiRemaining_154')}" onclick="event.stopPropagation();window.stepCustomerGallery(-1)">‹</button>` : ''}<img onclick="event.stopPropagation()" src="${escapeCustomerText(customerLightboxImages[customerLightboxIndex])}" alt="${t('uiRemaining_018')}">${customerLightboxImages.length > 1 ? `<button class="icon-button customer-lightbox-next" aria-label="${t('uiRemaining_306')}" onclick="event.stopPropagation();window.stepCustomerGallery(1)">›</button>` : ''}</div>`;
    };
    window.stepCustomerGallery = direction => { customerLightboxIndex = (customerLightboxIndex + direction + customerLightboxImages.length) % customerLightboxImages.length; window.renderCustomerGalleryLightbox(); };
    window.openCustomerReviewModal = (targetBusinessId, appointmentId, mode, rating = 5, encodedComment = '') => {
      if (modalRoot) modalRoot.innerHTML = `<div class="modal-overlay" onclick="window.closeModal()"><div class="modal-card animate-fade" onclick="event.stopPropagation()"><div class="salon-detail-sticky-header"><strong>${mode === 'edit' ? t('uiRemaining_149') : t('uiRemaining_148')}</strong><button class="icon-button" aria-label="${t('closeBtn', currentLang)}" onclick="window.closeModal()">${uiIcon('x')}</button></div><label class="booking-step-title" for="customer-review-rating">${t('uiRemaining_307')}</label><select id="customer-review-rating" class="input-field">${[5,4,3,2,1].map(value => `<option value="${value}" ${value === Number(rating) ? 'selected' : ''}>${value} / 5</option>`).join('')}</select><label class="booking-step-title" for="customer-review-comment">${t('uiRemaining_155')}</label><textarea id="customer-review-comment" class="input-field" maxlength="2000" aria-describedby="customer-review-count" oninput="document.getElementById('customer-review-count').textContent=this.value.length+' / 2000'" rows="4">${escapeCustomerText(decodeURIComponent(encodedComment || ''))}</textarea><output id="customer-review-count" class="salon-review-count" for="customer-review-comment" dir="ltr">${decodeURIComponent(encodedComment || '').length} / 2000</output><button class="btn btn-gold" style="width:100%;margin-top:12px;" onclick="window.submitCustomerReview('${targetBusinessId}','${appointmentId}')">${t('ownerUi_184')}</button></div></div>`;
    };
    window.submitCustomerReview = async (targetBusinessId, appointmentId) => {
      const rating = Number(document.getElementById('customer-review-rating').value);
      const comment = document.getElementById('customer-review-comment').value;
      const response = await authenticatedFetch('/api/reviews/submit', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ appointmentId, rating, comment }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) return showErrorModal(t('errorTitle', currentLang), result.error || t('uiRemaining_156'));
      window.closeModal();
      showSuccessModal(t('successTitle', currentLang), result.mode === 'edit' ? t('uiRemaining_157') : t('uiRemaining_158'));
    };
  };

  window.startSalonBookingFromDiscovery = (bizId) => beginNewBookingFromSalonById(bizId);

  window.toggleServicePicker = (isOpen) => {
    isServicePickerExpanded = Boolean(isOpen);
    rerenderCurrentCustomer();
  };

  window.toggleStaffPicker = (isOpen) => {
    isStaffPickerExpanded = Boolean(isOpen);
    rerenderCurrentCustomer();
  };

  window.toggleDatePicker = (isOpen) => {
    isDatePickerExpanded = Boolean(isOpen);
    rerenderCurrentCustomer();
  };

  window.selectDraftService = id => window.selectDraftServiceById(id);
  window.selectDraftStaff = id => window.selectDraftStaffById(id);

  window.selectDraftDate = (dateStr) => {
    if(!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)||dateStr<bookingToday())return;
    customerBookingDraft.advanceNotice='';
    customerBookingDraft.date = dateStr;
    customerBookingDraft.time = null;
    isDatePickerExpanded = false;
    rerenderCurrentCustomer();
  };

  window.selectDraftTime = (timeStr) => {
    if(!currentBookingSlots.includes(timeStr))return;
    if(!customerBookingDraft.staffId)return;
    customerBookingDraft.time = timeStr;
    rerenderCurrentCustomer();
  };

  window.returnFromCustomerBooking = async () => {
    const context = customerBookingReturnContext;
    activeCustomerTab = (context && context.tab) || 'salons';
    await rerenderCurrentCustomer();
    if (context && context.businessId && typeof window.openSalonDetailsModal === 'function') {
      await window.openSalonDetailsModal(context.businessId);
    }
  };

            window.submitCustomerBookingAuthoritative = async () => {
    if (!customerBookingDraft.serviceId) {
      showErrorModal(t('uiRemaining_131'), t('uiRemaining_159'));
      return;
    }
    if (!customerBookingDraft.staffId) {
      showErrorModal(t('uiRemaining_132'), t('uiRemaining_160'));
      return;
    }
    if (!customerBookingDraft.date) {
      showErrorModal(t('uiRemaining_134'), t('uiRemaining_161'));
      return;
    }
    if (!customerBookingDraft.time) {
      showErrorModal(t('uiRemaining_136'), t('uiRemaining_162'));
      return;
    }

    const btn = document.getElementById('btn-submit-booking');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = t('uiRemaining_138');
    }

    const apiUrl = `${window.location.origin}/api/booking/create`;

    const payload = {
      businessId: customerBookingDraft.businessId,
      businessName: customerBookingDraft.businessName,
      customerUid: currentCustomerUser.uid,
      customerName: currentCustomerUser.displayName || currentCustomerUser.name || t('staffUi_6'),
      customerPhone: currentCustomerUser.phone,
      serviceId: customerBookingDraft.serviceId,
      serviceName: customerBookingDraft.serviceName,
      servicePrice: customerBookingDraft.servicePrice,
      serviceDuration: customerBookingDraft.serviceDuration || 30,
      durationMinutes: customerBookingDraft.serviceDuration || 30,
      staffId: customerBookingDraft.staffId,
      staffName: customerBookingDraft.staffName,
      date: customerBookingDraft.date,
      time: customerBookingDraft.time,
      startTime: customerBookingDraft.time
    };

    try {
      const res = await authenticatedFetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => null);
      const createdId = data ? (data.appointmentId || data.aptId) : null;

      if (res.ok && data && data.success && createdId) {
        if (data.data) recentlyCreatedCustomerAppointments.set(createdId, data.data);
        const completedBooking = {
          customerName: payload.customerName,
          customerPhone: payload.customerPhone,
          canonical: data.data || null,
          serviceName: data.data?.serviceNameSnapshot || payload.serviceName,
          date: data.data?.date || payload.date,
          time: data.data?.time || payload.time,
          businessPhone: data.businessNotificationPhone || ''
        };
        // Clear booking draft completely
        customerBookingDraft = { flowId: null, businessId: null, businessName: null, serviceId: null, staffId: null, date: null, time: null };
        
        // Invalidate DB cache immediately so Randevularım sees new appointment
        if (typeof window.invalidateDbCache === 'function') {
          window.invalidateDbCache('appointments');
        }

        activeCustomerTab = 'appointments';
        await rerenderCurrentCustomer();
        window.openWhatsAppSmsModal(t('uiRemaining_163'), completedBooking);
      } else {
        const errorMessage = data && data.reason === 'DURATION_UNAVAILABLE'
          ? t('uiRemaining_321', currentLang)
          : (data && (data.error || data.message))
          ? (data.error || data.message) 
          : t('uiRemaining_315', null, { error: res.status });
        showErrorModal(t('uiRemaining_164'), errorMessage);
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = t('uiRemaining_165');
        }
      }
    } catch (err) {
      console.error('Submit booking fetch error:', err);
      showErrorModal(t('uiRemaining_166'), t('uiRemaining_167'));
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = t('uiRemaining_165');
      }
    }
  };


  window.selectDraftServiceById = (serviceId) => {
    const s = cachedCurrentServices.find(item => item && item.id === serviceId);
    if (s) {
      customerBookingDraft.serviceId = s.id;
      customerBookingDraft.serviceName = s.name;
      customerBookingDraft.servicePrice = s.price;
      customerBookingDraft.serviceDuration = s.duration || 30;
      customerBookingDraft.staffId = null;
      customerBookingDraft.staffName = null;
      customerBookingDraft.date = bookingToday();
      customerBookingDraft.advanceNotice='';
      isDatePickerExpanded=true;
      customerBookingDraft.time = null;
      isServicePickerExpanded = false;
      isStaffPickerExpanded = true;
      if (typeof window._currentRenderCustomerScreen === 'function') {
        window._currentRenderCustomerScreen();
      }
    }
  };

  window.selectDraftStaffById = (staffId) => {
    if(!customerBookingDraft.serviceId)return;
    if(staffId!=='staff-any'&&!cachedCurrentStaff.some(st=>st.id===staffId && staffCanProvideService(st,customerBookingDraft.serviceId,{services:cachedCurrentServices})))return;
    customerBookingDraft.time=null;
    if (staffId === 'staff-any') {
      customerBookingDraft.staffId = 'staff-any';
      customerBookingDraft.staffName = 'Fark Etmez';
    } else {
      const st = cachedCurrentStaff.find(item => item && item.id === staffId);
      if (st) {
        customerBookingDraft.staffId = st.id;
        customerBookingDraft.staffName = st.displayName || st.name;
      }
    }
    isStaffPickerExpanded = false;
    isDatePickerExpanded = true;
    if (typeof window._currentRenderCustomerScreen === 'function') {
      window._currentRenderCustomerScreen();
    }
  };

  // The legacy detail handlers above remain for existing inline callers, but the
  // active detail surface is installed last so both entry points share one UI.
  installSharedSalonDetailActions();

}

export async function renderPublicSalonRoute(slug, onAuthRequired, sessionUser = null) {
  document.body.classList.add('public-storefront-mode');
  const routeContainer = document.getElementById('app-container');
  if (routeContainer) routeContainer.innerHTML = `<div class="public-storefront-loading" role="status"><strong>UNELIVO</strong><span>${t('uiRemaining_168')}</span></div>`;
  window.closeModal = () => { const root = document.getElementById('modal-root'); if (root) root.innerHTML = ''; document.body.classList.remove('modal-open'); document.body.style.overflow = ''; };
  try {
    const normalizedSlug = normalizePublicSalonSlug(slug);
    const indexedBusinessId = normalizedSlug ? await fetchRecord(`public_salon_slugs/${normalizedSlug}`) : null;
    let business = indexedBusinessId ? await fetchRecord(`public_businesses/${String(indexedBusinessId)}`) : null;
    if (!business) {
      const records = await fetchRecord('public_businesses', true) || {};
      business = resolvePublicBusinessBySlug(records, slug);
    }
    if (!business || business.status !== 'active' || business.discoveryEnabled !== true) {
      if (routeContainer) routeContainer.innerHTML = `<main class="public-storefront-state"><strong>UNELIVO</strong><h1>${t('uiRemaining_169')}</h1><p>${t('uiRemaining_170')}</p><a class="btn btn-gold" href="/">${t('uiRemaining_171')}</a></main>`;
      return { found:false };
    }
    currentCustomerUser = sessionUser && sessionUser.role === 'customer'
      ? sessionUser
      : { uid:'public-guest', role:'customer', displayName:t('uiRemaining_308'), language:'tr', isPublicGuest:true };
    currentCustomerOnTabChange = onAuthRequired;
    await renderPublicStorefrontDirect(business);
    return { found:true, businessId:business.businessId };
  } catch (error) {
    console.error('Public storefront load failed:', error);
    if (routeContainer) routeContainer.innerHTML = `<main class="public-storefront-state"><strong>UNELIVO</strong><h1>${t('uiRemaining_172')}</h1><p>${t('uiRemaining_173')}</p><button class="btn btn-gold" onclick="window.location.reload()">${t('uiRemaining_174')}</button><a href="/">${t('staffUi_64')}</a></main>`;
    return { found:false, error:true };
  }
}
