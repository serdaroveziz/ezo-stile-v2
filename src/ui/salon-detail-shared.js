import { t } from '../config.js';
import { uiIcon } from './icons.js';

export const SALON_DETAIL_SECTIONS = Object.freeze(['about', 'services', 'staff', 'gallery', 'hours', 'location', 'reviews']);

const dayLabels = Object.freeze([
  ['monday', 'staffUi_9'], ['tuesday', 'staffUi_10'], ['wednesday', 'staffUi_11'], ['thursday', 'staffUi_12'],
  ['friday', 'staffUi_13'], ['saturday', 'staffUi_14'], ['sunday', 'staffUi_15']
]);

function text(value, escape) { return escape(value == null ? '' : value); }
function validRating(value) { const rating = Number(value); return Number.isFinite(rating) && rating >= 1 && rating <= 5 ? rating : null; }
function safeUrl(value) { try { const url = new URL(String(value || '')); return ['http:', 'https:'].includes(url.protocol) ? url.href : ''; } catch { return ''; } }

export function createSalonDetailModel(business, { escape, sanitizeImageUrl }) {
  const media = business.media || {};
  const services = Object.entries(business.services || {}).map(([id, service]) => ({ ...(service || {}), id: (service && service.id) || id })).filter(service => service && service.active !== false);
  const staff = Object.values(business.staff || {}).filter(member => member && member.active !== false);
  const gallery = (media.gallery || business.gallery || []).map(sanitizeImageUrl).filter(Boolean);
  const latitude = Number(business.latitude), longitude = Number(business.longitude);
  const hasCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude) && !(latitude === 0 && longitude === 0) && latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
  const destination = hasCoordinates ? `${latitude},${longitude}` : [business.address, business.neighborhood, business.district, business.city].filter(Boolean).join(', ');
  const today = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Istanbul', weekday: 'long' }).format(new Date()).toLowerCase();
  const todaySchedule = (business.weeklySchedule || {})[today];
  const rating = validRating(business.averageRating);
  const reviewCount = Math.max(0, Number(business.reviewCount || business.ratingCount || 0) || 0);
  return {
    business, businessId: String(business.businessId || ''), services, staff, gallery, destination,
    mapUrl: destination ? `https://www.google.com/maps?q=${encodeURIComponent(destination)}&output=embed` : '',
    directionsUrl: destination ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&travelmode=driving` : '',
    coverUrl: sanitizeImageUrl(media.coverImageUrl || business.coverPhoto || business.coverImageUrl || media.profileImageUrl || business.photoUrl) || './assets/images/unelivo-placeholder.svg',
    logoUrl: sanitizeImageUrl(media.logoUrl || business.logoUrl || media.profileImageUrl || business.photoUrl),
    weeklySchedule: business.weeklySchedule || {}, today, todaySchedule, rating, reviewCount,
    socials: Object.fromEntries(Object.entries(business.socials || {}).map(([key, value]) => [key, safeUrl(value)]).filter(([, value]) => value))
  };
}

export function renderSalonDetailSummary(model, escape) {
  const { business, coverUrl, logoUrl, rating, reviewCount, todaySchedule } = model;
  const location = [business.neighborhood, business.district, business.city].filter(Boolean).join(' / ');
  const ratingLabel = rating && reviewCount ? `${rating.toFixed(1)} · ${reviewCount}` : t('salonDetailNew');
  const isClosed = todaySchedule && todaySchedule.isOpen === false;
  return `<section class="salon-detail-hero"><img src="${text(coverUrl, escape)}" alt="${t('uiRemaining_004')}" loading="eager"><div class="salon-detail-hero__shade"></div></section>
    <section class="salon-detail-summary"><div class="salon-detail-summary__identity">${logoUrl ? `<img src="${text(logoUrl, escape)}" alt="${t('uiRemaining_005')}">` : ''}<div><h1>${text(business.name || '', escape)}</h1><p>${text(business.category || '', escape)}${business.category && location ? ' · ' : ''}${text(location, escape)}</p><div class="salon-detail-badges"><span>${uiIcon('star')} ${ratingLabel}</span><span class="${isClosed ? 'is-closed' : 'is-open'}">${isClosed ? t('uiRemaining_001') : t('uiRemaining_002')}</span></div></div></div>${business.description ? `<p class="salon-detail-summary__description">${text(business.description, escape)}</p>` : ''}</section>`;
}

export function renderSalonDetailTabs(activeSection) {
  const labels = { about: 'salonDetailAbout', services: 'serviceLabel', staff: 'uiRemaining_309', gallery: 'ownerUi_274', hours: 'uiRemaining_013', location: 'uiRemaining_014', reviews: 'uiRemaining_302' };
  return `<nav class="salon-detail-tabs" aria-label="${t('salonDetailSections')}">${SALON_DETAIL_SECTIONS.map(section => `<button type="button" class="${section === activeSection ? 'is-active' : ''}" aria-current="${section === activeSection ? 'page' : 'false'}" onclick="window.selectSalonDetailSection('${section}')">${t(labels[section])}</button>`).join('')}</nav>`;
}

export function renderSalonDetailSection(model, section, { escape, renderStaffAvatar, reviews = null, reviewLimit = 5, canLoadMore = false, favoriteHtml = '', reviewActionHtml = '' } = {}) {
  const { business, services, staff, gallery, weeklySchedule, today, destination, mapUrl, directionsUrl, socials } = model;
  if (section === 'about') return `<section class="salon-detail-section"><h2>${t('salonDetailAbout')}</h2><p class="salon-detail-copy">${business.description ? text(business.description, escape) : t('salonDetailNoDescription')}</p>${favoriteHtml}</section>`;
  if (section === 'services') return `<section class="salon-detail-section"><h2>${t('ownerUi_087')}</h2><div class="public-service-list">${services.length ? services.map(service => `<div class="public-service-row"><span>${text(service.name, escape)} <small>${Number(service.duration) || 30} ${t('ownerUi_109')}</small></span><strong>${Number(service.price) || 0} TL</strong>${business.bookingEnabled !== false ? `<button class="btn btn-secondary public-service-book" type="button" onclick="window.beginNewBookingFromSalonById('${model.businessId}',decodeURIComponent('${encodeURIComponent(String(service.id))}'))">${t('uiRemaining_007')}</button>` : ''}</div>`).join('') : `<div class="public-empty">${t('uiRemaining_008')}</div>`}</div></section>`;
  if (section === 'staff') return `<section class="salon-detail-section"><h2>${t('uiRemaining_309')}</h2><div class="salon-staff-grid">${staff.length ? staff.map(member => `<div class="salon-staff-card">${renderStaffAvatar(member, 42)}<span><strong>${text(member.displayName || member.name, escape)}</strong><small>${text(member.roleLabel || member.title || t('ownerUi_076'), escape)}</small></span></div>`).join('') : `<div class="public-empty">${t('uiRemaining_009')}</div>`}</div></section>`;
  if (section === 'gallery') return `<section class="salon-detail-section"><h2>${t('ownerUi_274')}</h2>${gallery.length ? `<div class="public-storefront-gallery">${gallery.map((url, index) => `<button class="salon-gallery-thumb" type="button" onclick="window.openSharedSalonGallery(${index})"><img src="${text(url, escape)}" alt="${t('uiRemaining_010')} ${index + 1}" loading="lazy"></button>`).join('')}</div>` : `<div class="public-empty">${t('salonDetailNoGallery')}</div>`}</section>`;
  if (section === 'hours') return `<section class="salon-detail-section"><h2>${uiIcon('clock')} ${t('uiRemaining_013')}</h2><div class="salon-schedule">${dayLabels.map(([key, label]) => { const day = weeklySchedule[key]; if (!day || typeof day !== 'object') return ''; return `<div class="salon-schedule-row ${key === today ? 'is-today' : ''}"><span>${t(label)}</span><strong>${day.isOpen === false ? t('staffUi_16') : `${text(day.start || day.openTime || '09:00', escape)}–${text(day.end || day.closeTime || '20:00', escape)}`}</strong></div>`; }).join('') || `<div class="public-empty">${t('salonDetailNoHours')}</div>`}</div></section>`;
  if (section === 'location') return `<section class="salon-detail-section"><h2>${uiIcon('mapPin')} ${t('uiRemaining_014')}</h2><p class="salon-detail-copy">${text([business.address, business.neighborhood, business.district, business.city].filter(Boolean).join(', '), escape) || t('salonDetailNoAddress')}</p>${mapUrl ? `<iframe class="public-storefront-map" title="${t('uiRemaining_015')}" src="${mapUrl}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>` : ''}${directionsUrl ? `<a href="${directionsUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary public-directions">${uiIcon('mapPin')} ${t('uiRemaining_006')}</a>` : ''}${Object.keys(socials).length ? `<div class="salon-social-grid">${Object.entries({ instagram:['Instagram','instagram'], whatsapp:['WhatsApp','whatsapp'], tiktok:['TikTok','music'], website:[t('uiRemaining_300'),'globe'] }).filter(([key]) => socials[key]).map(([key,[label,icon]]) => `<a class="btn btn-secondary" href="${text(socials[key], escape)}" target="_blank" rel="noopener noreferrer">${uiIcon(icon)} ${label}</a>`).join('')}</div>` : ''}</section>`;
  const visible = (reviews || []).filter(review => validRating(review.rating)).slice(0, reviewLimit);
  return `<section class="salon-detail-section"><h2>${uiIcon('star')} ${t('uiRemaining_302')}</h2>${reviews === null ? `<div class="public-empty">${t('salonDetailLoadReviews')}</div>` : visible.length ? visible.map(review => `<article class="public-review"><div><strong>${text(review.customerName, escape)}</strong><span>${uiIcon('star')} ${validRating(review.rating)}</span></div>${review.comment ? `<p>${text(review.comment, escape)}</p>` : ''}<small>${text(String(review.createdAt || '').slice(0, 10), escape)}</small></article>`).join('') : `<div class="public-empty">${t('uiRemaining_011')}</div>`}${canLoadMore ? `<button type="button" class="btn btn-secondary salon-detail-more" onclick="window.loadMoreSalonReviews()">${t('uiRemaining_012')}</button>` : ''}${reviewActionHtml}</section>`;
}
