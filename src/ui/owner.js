import { getOwnerAppearance, setOwnerAppearance, ownerAppearanceStyle, renderOwnerSalonLogo } from './owner-appearance.js';
import { renderSalonTypeFields } from './salon-type-fields.js';
import { salonTypes } from '../salon-discovery.js';
import { renderAvailabilityHints } from './booking-availability-hints.js';
import { renderOwnerAgenda, agendaShift } from './owner-agenda.js';
import { loadOwnerWorkspace, renderOwnerWorkspace, installOwnerWorkspace } from './owner-workspace.js';
import { renderOwnerSummary, renderWorkspaceMenu } from './owner-summary.js';
import { staffCanProvideService } from '../booking-selection.js';
import { openSalonBrandKit } from './salon-brand-kit.js';
/* UNELIVO - Salon Owner Panel (Ana Sayfa, Advanced Ciro Analytics, Persistent Manual Draft, Freeze-Free Toggle, Salon Image Editor, Package UX, Master Notifications) */
import { getAppointmentsForBusiness, fetchRecord, saveRecord, getServices, saveService, getStaffList, subscribeToPath, subscribeToQuery, invalidateDbCache } from '../db.js';
import { SUPPORTED_LANGUAGES, applyDocumentLanguage, t } from '../config.js';
import { showSuccessModal, showErrorModal, showConfirmModal } from './portal.js';
import { getCurrentUser, getSessionGeneration, isSessionCurrent, logoutUserSession } from '../auth.js';
import { authenticatedFetch } from '../firebase.js';
import { buildStaffInviteShareLinks, normalizeTurkishInvitePhone } from '../staff-invite-share.js';
import { ROLE_PERMISSION_KEYS, STAFF_PERMISSION_LABELS, hasPermission, staffPermissionPreset } from '../staff-permissions.js';
import { uiIcon } from './icons.js';
import { appointmentHasEnded, effectiveAppointmentStatus } from '../appointment-lifecycle.js';
import { findTurkeyLocation, loadTurkeyProvince, loadTurkeyProvinces } from '../turkey-address.js';
import { createPublicSalonSlug, normalizePublicSalonSlug, publicSalonPath } from '../public-businesses.js';
import { disablePushNotifications, enablePushNotifications, getPushPermissionState } from '../push-notifications.js';
import { triggerTouchNavIconBounce } from './nav-bounce.js';
import { buildOwnerCustomers, filterOwnerCustomers } from './owner-customers.js';

let ownerManagementView = '';
let ownerCustomerQuery = '';
let ownerCustomerExpanded = '';
let ownerViewSession = '';
let ownerRenderSequence = 0;

let agendaDate='',agendaMode='day',agendaStaff='all',agendaService='',legacyOwnerMenu=false;
let activeOwnerTab = 'dashboard'; // 'dashboard', 'ciro', 'appointments', 'management', 'profile'
let activeAptView = 'menu'; // 'menu', 'pending', 'approved', 'completed', 'requests', 'cancelled_rejected', 'bugun'
let activeOwnerAptCategory = 'all';
let selectedOwnerAptDate = getIstanbulDateKey();
let ciroTimeframe = 'day'; // 'day', 'week', 'month', 'history'
let selectedCiroDate = getIstanbulDateKey();
let selectedWeekOffset = 0; // 0: bu hafta, -1: geçen hafta
let selectedMonthOffset = 0; // 0: bu ay, -1: geçen ay, -2: iki ay önce
let selectedOwnerStaffFilter = 'all';
let expandedRevenueStaffId = null;
let ownerStaffAccordionOpen = false;
let ownerRevenueDetailsExpanded = false;
let ownerLocationMap = null;
let ownerLocationMarker = null;
let ownerLocationDraft = null;
let leafletLoadPromise = null;

export function normalizeOwnerMapCoordinate(value, min, max) {
  if (value === null || value === undefined || typeof value === 'boolean') return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const number = Number(raw);
  if (!Number.isFinite(number) || number < min || number > max) return null;
  return number;
}

export function isValidOwnerMapPoint(latitude, longitude) {
  const lat = normalizeOwnerMapCoordinate(latitude, -90, 90);
  const lng = normalizeOwnerMapCoordinate(longitude, -180, 180);
  return lat !== null && lng !== null && !(lat === 0 && lng === 0);
}

function cleanupOwnerLocationMap() {
  if (ownerLocationMap) {
    ownerLocationMap.off();
    ownerLocationMap.remove();
  }
  ownerLocationMap = null;
  ownerLocationMarker = null;
  ownerLocationDraft = null;
  document.getElementById('owner-map-picker-layer')?.remove();
}

function ensureLeafletLoaded() {
  if (window.L) return Promise.resolve(window.L);
  if (leafletLoadPromise) return leafletLoadPromise;
  leafletLoadPromise = new Promise((resolve, reject) => {
    if (!document.getElementById('owner-leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'owner-leaflet-css';
      link.rel = 'stylesheet';
      link.href = './src/vendor/leaflet/leaflet.css';
      document.head.appendChild(link);
    }
    const existing = document.getElementById('owner-leaflet-script');
    const script = existing || document.createElement('script');
    const onReady = () => window.L ? resolve(window.L) : reject(new Error(t('ownerUi_001')));
    script.addEventListener('load', onReady, { once:true });
    script.addEventListener('error', () => reject(new Error(t('ownerUi_001'))), { once:true });
    if (!existing) {
      script.id = 'owner-leaflet-script';
      script.src = './src/vendor/leaflet/leaflet.js';
      document.head.appendChild(script);
    }
  }).catch(error => { leafletLoadPromise = null; throw error; });
  return leafletLoadPromise;
}

let isSavingBookingToggle = false; // Freeze-free async lock guard
let manualAvailabilityRequestId = 0;
const recentlyCreatedOwnerAppointments = new Map();

async function syncOwnerPublicBusiness(businessId) {
  try {
    const response = await authenticatedFetch('/api/salon/sync-public', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ businessId })
    });
    return response.ok;
  } catch (error) {
    console.warn('Public salon görünümü güncellenemedi:', error);
    return false;
  }
}

function mergeRecentOwnerAppointments(appointments, businessId) {
  const merged = new Map((appointments || []).filter(Boolean).map(apt => [apt.aptId || apt.appointmentId, apt]));
  for (const [id, apt] of recentlyCreatedOwnerAppointments) {
    if (apt && apt.businessId === businessId) merged.set(id, apt);
  }
  return Array.from(merged.values()).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

// MODULE-LEVEL SINGLE SOURCE OF TRUTH STATE FOR MANUAL BOOKING DRAFT
let manualBookingDraft = {
  customerName: '',
  customerPhone: '',
  serviceId: null,
  serviceName: null,
  servicePrice: 0,
  serviceDuration: 30,
  staffId: null,
  staffName: 'Fark Etmez',
  date: getIstanbulDateKey(),
  time: null
};

// SALON IMAGE CROP EDITOR STATE
let imageEditorState = {
  file: null,
  imgObj: null,
  type: 'cover', // 'profile', 'cover', 'gallery'
  scale: 1.0,
  offsetX: 0,
  offsetY: 0
};

// HELPER: GET PRICE FROM SNAPSHOT OR FALLBACK
function getAptPrice(apt) {
  const price = Number(apt && (apt.servicePriceSnapshot ?? apt.servicePrice));
  return Number.isFinite(price) && price >= 0 ? price : 0;
}

function getAptServiceName(apt) {
  return apt.serviceNameSnapshot || apt.serviceName || t('staffUi_7');
}

function escapeOwnerText(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function permissionCheckboxes(role, permissions = [], prefix = 'staff-perm') {
  return (ROLE_PERMISSION_KEYS[role] || []).map(key => `<label class="owner-permission-choice ${key==='appointments.create'||hasPermission(permissions,key) ? 'is-selected' : ''}"><input type="checkbox" data-permission-key="${key}" data-permission-prefix="${prefix}" onchange="this.closest('.owner-permission-choice').classList.toggle('is-selected',this.checked)" ${key==='appointments.create'?'checked disabled':hasPermission(permissions,key)?'checked':''}><span>${escapeOwnerText(STAFF_PERMISSION_LABELS[key] || key)}</span></label>`).join('');
}

function collectPermissionCheckboxes(prefix) {
  return Array.from(document.querySelectorAll(`[data-permission-prefix="${prefix}"]`)).filter(input=>input.checked).map(input=>input.dataset.permissionKey);
}

function renderTurkeyLocationOptions(items, selectedValue, placeholder) {
  const selected = String(selectedValue || '').trim();
  const names = (items || []).map(item => typeof item === 'string' ? item : item.name).filter(Boolean);
  const hasSelected = names.some(name => findTurkeyLocation([{ name }], selected));
  const legacyOption = selected && !hasSelected ? `<option value="${escapeOwnerText(selected)}" selected>${escapeOwnerText(selected)} ${t('ownerUi_004')}</option>` : '';
  return `<option value="">${placeholder}</option>${legacyOption}${names.map(name => `<option value="${escapeOwnerText(name)}" ${findTurkeyLocation([{ name }], selected) ? 'selected' : ''}>${escapeOwnerText(name)}</option>`).join('')}`;
}

function toLocalDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getIstanbulDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone:'Europe/Istanbul', year:'numeric', month:'2-digit', day:'2-digit' }).formatToParts(date);
  const value = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export function calculateOwnerDailyMetrics(appointments, dateKey = getIstanbulDateKey()) {
  const today = (appointments || []).filter(appointment => appointment && appointment.date === dateKey);
  const completed = today.filter(appointment => appointment.status === 'completed');
  const pending = today.filter(appointment => appointment.status === 'pending' || appointment.status === 'cancel_requested' || appointment.status === 'reschedule_requested');
  return { appointmentCount:today.length, completedCount:completed.length, revenue:completed.reduce((sum, appointment) => sum + getAptPrice(appointment), 0), pendingCount:pending.length };
}

export function calculateStaffAppointmentSummary(appointments) {
  const rows = (appointments || []).filter(Boolean);
  return {
    total:rows.length,
    completed:rows.filter(item => item.status === 'completed').length,
    noShow:rows.filter(item => item.status === 'no_show').length,
    cancelled:rows.filter(item => item.status === 'cancelled' || item.status === 'rejected').length,
    pending:rows.filter(item => item.status === 'pending' || item.status === 'approved' || item.status === 'cancel_requested' || item.status === 'reschedule_requested').length
  };
}

// Terminal categories are intentionally disjoint: a no-show is not a cancellation.
export function filterOwnerAppointmentsByCategory(appointments, category) {
  const rows = (appointments || []).filter(Boolean);
  if (category === 'no_show') return rows.filter(item => item.status === 'no_show');
  if (category === 'cancelled') return rows.filter(item => ['cancelled', 'rejected', 'expired'].includes(effectiveAppointmentStatus(item)));
  return rows;
}

export function calculateOwnerRevenueSummary(appointments, dateKey = getIstanbulDateKey()) {
  const anchor = new Date(`${dateKey}T12:00:00`);
  const monday = new Date(anchor); monday.setDate(anchor.getDate() - ((anchor.getDay() + 6) % 7));
  const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
  const monthStart = new Date(anchor.getFullYear(), anchor.getMonth(), 1, 12);
  const monthEnd = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0, 12);
  const completed = (appointments || []).filter(item => item && item.status === 'completed');
  const revenueBetween = (start, end) => completed.filter(item => item.date >= start && item.date <= end).reduce((sum, item) => sum + getAptPrice(item), 0);
  return {
    day: revenueBetween(dateKey, dateKey),
    week: revenueBetween(toLocalDateKey(monday), toLocalDateKey(sunday)),
    month: revenueBetween(toLocalDateKey(monthStart), toLocalDateKey(monthEnd))
  };
}

export function formatMoney(value) {
  return `${Number(value || 0).toLocaleString('tr-TR')} TL`;
}

export function isSalonClosedOnDate(business, dateKey) {
  const date = new Date(`${dateKey}T12:00:00`);
  if (Number.isNaN(date.getTime())) return false;
  const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const configured = business && business.weeklySchedule && business.weeklySchedule[dayKeys[date.getDay()]];
  if (configured) return configured.isOpen === false;
  return date.getDay() === 0;
}

function buildEmployeeRevenueData(appointments, staffList) {
  const staffById = new Map((staffList || []).filter(Boolean).map(staff => [staff.id, staff]));
  const totals = new Map();
  for (const appointment of appointments || []) {
    const staff = staffById.get(appointment.staffId);
    const key = staff ? staff.id : (appointment.staffId || appointment.staffNameSnapshot || appointment.staffName || 'unassigned');
    const current = totals.get(key) || {
      staffId: staff && staff.id,
      name: (staff && (staff.displayName || staff.name)) || appointment.staffNameSnapshot || appointment.staffName || t('ownerUi_005'),
      commissionPercent: Number((staff && staff.commissionPercent) || 0),
      revenue: 0,
      count: 0
    };
    current.revenue += getAptPrice(appointment);
    current.count += 1;
    totals.set(key, current);
  }
  return Array.from(totals.values()).sort((a, b) => b.revenue - a.revenue);
}

export function calculateCommission(revenue, percent) {
  const safeRevenue = Math.max(0, Number(revenue || 0));
  const safePercent = Math.min(100, Math.max(0, Number(percent || 0)));
  return safePercent > 0 ? safeRevenue * safePercent / 100 : 0;
}

function appointmentMatchesStaff(appointment, staff) {
  if (!appointment || !staff) return false;
  const staffName = String(staff.displayName || staff.name || '').trim().toLocaleLowerCase('tr-TR');
  const appointmentName = String(appointment.staffNameSnapshot || appointment.staffName || '').trim().toLocaleLowerCase('tr-TR');
  return appointment.staffId === staff.id || appointment.staffId === staff.userId || (staffName && appointmentName === staffName);
}

function renderEmployeeRevenueCards(rows, appointments = []) {
  if (!rows.length) return `<div style="font-size:11px;color:var(--text-muted);padding:10px;">${t('ownerUi_006')}</div>`;
  return rows.map(row => {
    const percent = Math.min(100, Math.max(0, Number(row.commissionPercent || 0)));
    const commission = calculateCommission(row.revenue, percent);
    const expanded = expandedRevenueStaffId === (row.staffId || row.name);
    const details = expanded ? appointments.filter(appointment => row.staffId ? appointment.staffId === row.staffId : String(appointment.staffNameSnapshot || appointment.staffName || '') === row.name) : [];
    return `<div class="card" style="padding:10px;margin-top:7px;cursor:pointer;" onclick="window.toggleRevenueStaffDetails('${escapeOwnerText(row.staffId || row.name)}')"><div style="display:flex;justify-content:space-between;gap:8px;"><div><strong style="color:var(--theme-ink-ffffff, #fff);font-size:11px;">${escapeOwnerText(row.name)} ${expanded ? '▲' : '▼'}</strong><div style="font-size:9px;color:var(--text-muted);">${row.count} ${t('ownerUi_007')} ${formatMoney(row.revenue)}</div></div><strong style="color: ${percent ? 'var(--theme-copy-22c55e, #22c55e)' : 'var(--text-muted)'};font-size:11px;">${percent ? `%${percent} = ${formatMoney(commission)}` : t('ownerUi_331')}</strong></div>${expanded ? `<div style="border-top:1px solid rgba(255,255,255,.08);margin-top:8px;padding-top:5px;">${details.map(appointment => `<div style="display:flex;justify-content:space-between;font-size:9px;padding:4px 0;color:var(--text-muted);"><span>${escapeOwnerText(appointment.date || '')} • ${escapeOwnerText(appointment.customerName || t('staffUi_6'))} • ${escapeOwnerText(getAptServiceName(appointment))}</span><strong style="color:var(--theme-copy-22c55e, #22c55e);">${formatMoney(getAptPrice(appointment))}</strong></div>`).join('') || `<div style="font-size:9px;color:var(--text-muted);">${t('ownerUi_009')}</div>`}</div>` : ''}</div>`;
  }).join('');
}

function renderOwnerServiceRevenue(appointments) {
  const totals = new Map();
  const dates = new Map();
  for (const appointment of appointments) {
    if (appointment.status !== 'completed') continue;
    const name = getAptServiceName(appointment);
    totals.set(name, (totals.get(name) || 0) + getAptPrice(appointment));
    if (/^\d{4}-\d{2}-\d{2}$/.test(appointment.date || '')) dates.set(appointment.date, (dates.get(appointment.date) || 0) + getAptPrice(appointment));
  }
  const dateRows = [...dates].sort((a,b) => a[0].localeCompare(b[0]));
  const maximum = Math.max(1, ...dateRows.map(([,value]) => value));
  const chart = dateRows.length ? `<section class="owner-revenue-chart"><h4>${t('ownerRevenueByDate')}</h4><div class="owner-chart-scroll" tabindex="0" aria-label="${t('ownerRevenueByDate')}">${dateRows.map(([date,value]) => `<div class="owner-chart-column" title="${date}: ${formatMoney(value)}"><strong>${formatMoney(value)}</strong><div class="owner-chart-track"><span style="height:${value / maximum * 100}%"></span></div><time datetime="${date}">${date.slice(5)}</time></div>`).join('')}</div></section>` : '';
  return `${chart}<section class="owner-service-revenue"><h4>${t('ownerServiceRevenue')}</h4>${[...totals].sort((a,b) => b[1]-a[1]).map(([name,total]) => `<div><span>${escapeOwnerText(name)}</span><strong>${formatMoney(total)}</strong></div>`).join('') || `<p class="owner-summary-hint">${t('ownerUi_074')}</p>`}</section>`;
}

export async function renderOwnerScreen(user, onTabChange) {
  const ownerRenderId = ++ownerRenderSequence;
  const renderGeneration = getSessionGeneration();
  if (user && ['barber', 'receptionist', 'manager'].includes(user.role)) {
    const { renderStaffScreen } = await import('./staff.js');
    return renderStaffScreen(user, onTabChange);
  }
  if (!user || user.role !== 'owner') {
    throw new Error(t('ownerUi_010'));
  }
  const container = document.getElementById('app-container');
  if (!container) return;

  // Owner sessions can be restored without rendering the portal first.
  // Keep modal lifecycle available independently from the login screen.
  window.closeModal = () => {
    cleanupOwnerLocationMap();
    const root = document.getElementById('modal-root');
    if (root) root.innerHTML = '';
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
  };

  const currentLang = user.language || 'tr';
  const viewSession = user.uid + ':' + user.businessId + ':' + renderGeneration;
  if (ownerViewSession !== viewSession) {
    ownerManagementView = ''; ownerCustomerQuery = ''; ownerCustomerExpanded = '';
    agendaDate='';agendaMode='day';agendaStaff='all';agendaService='';legacyOwnerMenu=false;
    ownerViewSession = viewSession;
  }
  applyDocumentLanguage(currentLang);

  const businessId = user.businessId || 'biz_merkez_salon';
  const isEmployee = ['manager', 'barber', 'receptionist'].includes(user.role);
  const isBarber = user.role === 'barber';
  const canViewCiro = user.role === 'owner' || (user.role === 'manager' && hasPermission(user.permissions,'finance.view'));
  const canManageSalon = user.role === 'owner' || (user.role === 'manager' && hasPermission(user.permissions,'business.manage'));
  const canCreateManualBooking = user.role === 'owner' || user.role === 'receptionist' ||
    (user.role === 'manager' && hasPermission(user.permissions,'appointments.manage'));
  if (activeOwnerTab === 'ciro' && !canViewCiro) activeOwnerTab = 'dashboard';
  if (activeOwnerTab === 'management' && !canManageSalon) activeOwnerTab = 'dashboard';
  const bizRecord = await fetchRecord(`businesses/${businessId}`) || { name: 'EZO Salon', plan: 'FREE', bookingEnabled: true };
  const hasTwoYearHistory = bizRecord.plan === 'PREMIUM' || bizRecord.premiumSource === 'super_admin_grant' || (bizRecord.subscription && bizRecord.subscription.plan === 'PREMIUM' && bizRecord.subscription.status === 'active');
  const hasThreeMonthHistory = hasTwoYearHistory || String(bizRecord.plan || '').toUpperCase() === 'PRO' || (bizRecord.subscription && String(bizRecord.subscription.plan || '').toUpperCase() === 'PRO' && bizRecord.subscription.status === 'active');
  const staffList = await getStaffList(businessId);
  let pendingStaffInvites = [];
  if (canManageSalon) {
    try {
      const inviteResponse = await authenticatedFetch('/api/staff/list-invites', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const inviteData = await inviteResponse.json().catch(() => ({}));
      if (inviteResponse.ok && Array.isArray(inviteData.invitations)) pendingStaffInvites = inviteData.invitations;
    } catch (error) {
      console.warn('Bekleyen çalışan davetleri alınamadı:', error);
    }
  }
  const currentStaff = staffList.find(member => member.userId === user.uid || member.id === `stf_${user.uid}`);
  const businessAppointments = mergeRecentOwnerAppointments(await getAppointmentsForBusiness(businessId), businessId)
    .filter(appointment => appointment && appointment.businessId === businessId);
  const allApts = isBarber
    ? businessAppointments.filter(appointment => appointment && (appointment.staffId === currentStaff?.id || appointment.staffId === user.uid))
    : businessAppointments;
  const services = await getServices(businessId);
  const ownerNotificationsData = await fetchRecord(`notifications/${user.uid}`) || {};
  if (!isSessionCurrent(user.uid, renderGeneration) || !getCurrentUser() || getCurrentUser().role !== 'owner') return;
  window._currentRenderOwnerScreen = () => renderOwnerScreen(user, onTabChange);
  const ownerNotifications = Object.values(ownerNotificationsData).filter(Boolean).sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))).slice(0, 30);
  const ownerUnreadCount = ownerNotifications.filter(notification => notification.read !== true).length;

  const todayStr = getIstanbulDateKey();
  const ownerCustomers = buildOwnerCustomers(allApts, user.businessId, todayStr);
  const ownerRating = Number(bizRecord.averageRating);
  const ownerRatingCount = Number(bizRecord.reviewCount || bizRecord.ratingCount || 0);
  const hasOwnerRating = Number.isFinite(ownerRating) && ownerRating >= 1 && ownerRating <= 5 && ownerRatingCount > 0;
  const ownerSessionValid = () => isSessionCurrent(user.uid, renderGeneration) && getCurrentUser()?.role === 'owner' && getCurrentUser()?.businessId === businessId;

  const renderCustomerRows = () => {
    const filtered = filterOwnerCustomers(ownerCustomers, ownerCustomerQuery, currentLang);
    return filtered.map(customer => {
      const index = ownerCustomers.indexOf(customer);
      const expanded = ownerCustomerExpanded === customer.key;
      const name = customer.name || t('ownerUi_008');
      return `<article class="owner-customer-card">
        <button class="owner-customer-row" onclick="window.toggleOwnerCustomer(${index})" aria-expanded="${expanded}">
          <span class="owner-customer-avatar" aria-hidden="true">${escapeOwnerText(name.trim().slice(0,1).toLocaleUpperCase(currentLang))}</span>
          <span class="owner-customer-copy"><strong>${escapeOwnerText(name)}</strong>${customer.phone ? `<span dir="ltr">${escapeOwnerText(customer.phone)}</span>` : ''}
            <small>${customer.count} ${t('ownerUi_016')} · ${t('ownerCustomerLast')}: ${escapeOwnerText(customer.lastDate || '—')}</small>
          </span><span class="owner-row-chevron" aria-hidden="true">${uiIcon('chevron')}</span>
        </button>
        ${expanded ? `<div class="owner-customer-history"><p>${t('ownerCustomerCompleted')}: <strong>${customer.completed}</strong></p>${customer.appointments.map(a => `<div class="owner-history-row"><span><time dir="ltr">${escapeOwnerText(a.date || '')} ${escapeOwnerText(a.time || '')}</time><strong>${escapeOwnerText(getAptServiceName(a))}</strong></span><span>${escapeOwnerText(t(effectiveAppointmentStatus(a), currentLang))}</span></div>`).join('')}</div>` : ''}
      </article>`;
    }).join('') || `<p class="owner-summary-hint" role="status">${t(ownerCustomers.length ? 'ownerCustomersNoMatch' : 'ownerCustomersEmpty')}</p>`;
  };
  const renderCustomersView = () => `<section class="owner-customers">
    <div class="owner-section-heading"><button class="btn btn-secondary" onclick="window.openOwnerManagementView('')" aria-label="${t('backBtn')}">‹</button><h3>${t('ownerCustomersTitle')}</h3><span>${ownerCustomers.length}</span></div>
    <label class="owner-customer-search">${uiIcon('search')}<input id="owner-customer-search" type="search" value="${escapeOwnerText(ownerCustomerQuery)}" placeholder="${t('ownerCustomersSearch')}" aria-label="${t('ownerCustomersSearch')}" oninput="window.searchOwnerCustomers(this.value)"></label>
    <p class="owner-customer-note">${t('ownerCustomersScope')}</p>
    <div id="owner-customer-results" class="owner-customer-list">${renderCustomerRows()}</div>
  </section>`;
  const todayApts = allApts.filter(a => a && a.date === todayStr);

  const dailyMetrics = calculateOwnerDailyMetrics(allApts, todayStr);
  const pendingRequests = todayApts.filter(a => a && (
    (a.status === 'pending' && !appointmentHasEnded(a)) ||
    (a.status === 'cancel_requested' && (!a.cancelRequestStatus || a.cancelRequestStatus === 'pending')) ||
    (a.status === 'reschedule_requested' && (!a.rescheduleRequestStatus || a.rescheduleRequestStatus === 'pending'))
  ));
  const todayCompleted = todayApts.filter(a => a && a.status === 'completed');

  // AUTHORITATIVE TODAY REVENUE (COMPLETED ONLY)
  const todayRevenue = todayCompleted.reduce((sum, a) => sum + getAptPrice(a), 0);

  // USER AVATAR & INITIALS
  const displayName = user.displayName || user.name || t('ownerUi_011');
  const nameParts = displayName.trim().split(' ');
  const initials = nameParts.length >= 2
    ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
    : displayName.substring(0, 2).toUpperCase();

  
    // Attach True Realtime Database SSE Listener for Owner Appointments & Business
    if (typeof window._unsubscribeOwnerRealtime === 'function') {
      window._unsubscribeOwnerRealtime();
    }
    window._unsubscribeOwnerRealtime = subscribeToQuery('appointments', 'businessId', businessId, () => {
      console.log(' [Realtime SSE] Owner appointments updated via Firebase stream');
      if (document.getElementById('btn-submit-manual-booking')) window.renderManualBookingModalContent?.();
      if (typeof window._currentRenderOwnerScreen === 'function') {
        window._currentRenderOwnerScreen();
      }
    });
    if (typeof window._unsubscribeOwnerStaffRealtime === 'function') window._unsubscribeOwnerStaffRealtime();
    window._unsubscribeOwnerStaffRealtime = subscribeToPath(`businesses/${businessId}/staff`, () => {
      if (typeof window._currentRenderOwnerScreen === 'function') window._currentRenderOwnerScreen();
    });

    let mainHtml = '';

  // ==========================================
  // 1. PATRON ANA SAYFA
  // ==========================================
  if (activeOwnerTab === 'dashboard') {
    const isBookingOpen = bizRecord.bookingEnabled !== false;

    mainHtml = `
      <div class="card card-gold owner-welcome animate-fade" style="padding: 16px; margin-bottom: 14px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <h3 style="font-size: 16px; font-weight: 800; color: var(--theme-ink-ffffff, #fff);"> ${bizRecord.name}</h3>
            <div style="font-size: 11px; color: var(--gold-primary);">${t(isEmployee ? 'employeePanel' : 'ownerPanel', currentLang)} • ${escapeOwnerText(displayName)}</div>
          </div>
          <span id="booking-status-badge" class="badge ${isBookingOpen ? 'badge-approved' : 'badge-pending'}" style="font-size: 10px;">
            ${t(isBookingOpen ? 'bookingOpenLabel' : 'closedLabel', currentLang)}
          </span>
        </div>
      </div>

      <!-- 4 INTERACTIVE DASHBOARD KPI CARDS -->
      <div class="owner-kpis" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 14px;">
        <div class="card animate-fade" role="button" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click()}" style="padding: 14px; text-align: center; cursor: pointer; border-color: var(--gold-primary);" onclick="window.switchOwnerTab('appointments', 'bugun')">
          <div style="font-size: 11px; color: var(--gold-primary); font-weight: 700;"> ${t('todayBookings', currentLang)}</div>
          <div style="font-size: 24px; font-weight: 900; color: var(--theme-ink-ffffff, #fff); margin-top: 4px;">${dailyMetrics.appointmentCount}</div>
          <div style="font-size: 9px; color: var(--text-muted); margin-top: 4px;">${t('openAppointments', currentLang)} →</div>
        </div>

        <div class="card animate-fade" role="button" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click()}" style="padding: 14px; text-align: center; cursor: pointer;" onclick="window.openOwnerManagementView('customers')">
          <div style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">${t('ownerCustomersTitle')}</div>
          <div style="font-size: 24px; font-weight: 900; color: var(--theme-ink-ffffff, #fff); margin-top: 4px;">${ownerCustomers.length}</div>
          <div style="font-size: 9px; color: var(--text-muted); margin-top: 4px;">${t('manageLabel', currentLang)} →</div>
        </div>

        <div class="card animate-fade owner-rating-kpi" role="button" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click()}" style="padding: 14px; text-align: center; cursor: pointer;" onclick="${hasOwnerRating ? 'window.openOwnerReviews()' : "window.switchOwnerTab('appointments', 'completed')"}">
          <div style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">${t(hasOwnerRating ? 'ownerAverageRating' : 'completedBookings', currentLang)}</div>
          <div style="font-size: 24px; font-weight: 900; color: var(--gold-primary); margin-top: 4px;">${hasOwnerRating ? '★ ' + ownerRating.toFixed(1) : dailyMetrics.completedCount}</div>
          <div style="font-size: 9px; color: var(--text-muted); margin-top: 4px;">${t(hasOwnerRating ? 'uiRemaining_302' : 'completed', currentLang)} →</div>
        </div>

        ${canViewCiro ? `<div class="card animate-fade" role="button" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click()}" style="padding: 14px; text-align: center; cursor: pointer;" onclick="window.switchOwnerTab('ciro', 'day')">
          <div style="font-size: 11px; color: var(--gold-primary); font-weight: 700;"> ${t('todayRevenue', currentLang)}</div>
          <div style="font-size: 22px; font-weight: 900; color: var(--theme-ink-ffffff, #fff); margin-top: 4px;">${todayRevenue} TL</div>
          <div style="font-size: 9px; color: var(--text-muted); margin-top: 4px;">${t('revenueDetail', currentLang)} →</div>
        </div>` : ''}
      </div>

      <div class="owner-status-links">
        <button onclick="window.switchOwnerTab('appointments', 'pending')">${t('pendingRequests', currentLang)} <strong>${pendingRequests.length}</strong></button>
        <button onclick="window.switchOwnerTab('appointments', 'completed')">${t('completedBookings', currentLang)} <strong>${dailyMetrics.completedCount}</strong></button>
      </div>
      <section class="owner-upcoming">
        <div class="owner-section-heading"><h3>${t('ownerUpcoming')}</h3><button class="btn btn-secondary" onclick="window.switchOwnerTab('appointments', 'bugun')">${t('openAppointments', currentLang)} <span aria-hidden="true">›</span></button></div>
        <div class="owner-upcoming-list">
          ${todayApts.filter(a => ['pending', 'approved'].includes(a.status) && !appointmentHasEnded(a)).sort((a,b) => String(a.time || '').localeCompare(String(b.time || ''))).slice(0,4).map(a => `<button class="owner-upcoming-row" onclick="window.openOwnerUpcomingCategory('${a.status === 'approved' ? 'approved' : 'pending'}')"><time dir="ltr">${escapeOwnerText(a.time || '—')}</time><span><strong>${escapeOwnerText(a.customerName || t('ownerUi_008'))}</strong><small>${escapeOwnerText(getAptServiceName(a))}</small></span><span class="badge badge-${a.status}">${t(a.status, currentLang)}</span></button>`).join('') || `<p class="owner-summary-hint">${t('ownerUi_074')}</p>`}
        </div>
      </section>

      <!-- QUICK ACTIONS -->
      <div class="card animate-fade" style="padding: 16px; margin-bottom: 14px;">
        <h4 style="font-size: 13px; font-weight: 800; color: var(--gold-primary); margin-bottom: 10px;">${t('quickActions', currentLang)}</h4>
        
        <div style="display: flex; flex-direction: column; gap: 10px;">
          ${canCreateManualBooking ? `<button onclick="window.openManualBookingModal()" class="btn btn-gold" style="width: 100%; min-height: 42px; font-size: 13px; font-weight: 800;">
             ${t('addManualAppointment', currentLang)}
          </button>` : ''}

          ${canManageSalon ? `<div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: rgba(255,255,255,0.05); border-radius: 8px;">
            <div>
              <div style="font-size: 12px; font-weight: 800; color: var(--theme-ink-ffffff, #fff);">${t('onlineBookingSystem', currentLang)}</div>
              <div style="font-size: 10px; color: var(--text-muted);">${t(isBookingOpen ? 'onlineBookingEnabled' : 'onlineBookingDisabled', currentLang)}</div>
            </div>
            <button id="btn-toggle-booking-system" onclick="window.toggleBookingSystemEnabled(${!isBookingOpen})" class="btn ${isBookingOpen ? 'btn-secondary' : 'btn-gold'}" style="padding: 6px 12px; font-size: 11px;">
              ${t(isBookingOpen ? 'closeBooking' : 'openBooking', currentLang)}
            </button>
          </div>` : ''}
        </div>
      </div>
    `;
  }
  // ==========================================
  // 2. ADVANCED CİRO EKRANI
  // ==========================================
  else if (activeOwnerTab === 'ciro' && canViewCiro) {
    let ciroBodyHtml = '';
    let serviceRevenueAppointments = [];
    const revenueSummary = calculateOwnerRevenueSummary(allApts, todayStr);

    if (ciroTimeframe === 'day') {
      const dayApts = allApts.filter(a => a && a.date === selectedCiroDate);
      const dayCompleted = dayApts.filter(a => a && a.status === 'completed');
      serviceRevenueAppointments = dayCompleted;
      const dayCancelled = dayApts.filter(a => a && (a.status === 'cancelled' || a.status === 'rejected'));
      const dayNoShow = dayApts.filter(a => a && a.status === 'no_show');

      const totalRevenue = dayCompleted.reduce((sum, a) => sum + getAptPrice(a), 0);
      const cancelledLostRevenue = dayCancelled.reduce((sum, a) => sum + getAptPrice(a), 0);
      const noShowLostRevenue = dayNoShow.reduce((sum, a) => sum + getAptPrice(a), 0);
      const totalLostRevenue = cancelledLostRevenue + noShowLostRevenue;

      const completedCount = dayCompleted.length;
      const uniqueCustomers = new Set(dayCompleted.map(a => a.customerPhone || a.customerUid)).size;
      const salonClosed = isSalonClosedOnDate(bizRecord, selectedCiroDate);
      const friendlyName = escapeOwnerText((displayName || t('ownerUi_012')).split(' ')[0]);
      const dailyEmployeeRows = buildEmployeeRevenueData(dayCompleted, staffList);

      const completedRowsHtml = dayCompleted.map(a => `
        <div class="card" style="padding: 10px; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-size: 12px; font-weight: 800; color: var(--theme-ink-ffffff, #fff);"> ${a.time} •  ${a.customerName} (${a.customerPhone || ''})</div>
            <div style="font-size: 10px; color: var(--text-muted);"> ${getAptServiceName(a)} •  ${a.staffName || 'Mustafa Usta'}</div>
          </div>
          <div style="font-size: 13px; font-weight: 900; color:var(--theme-copy-22c55e, #22c55e);">+${getAptPrice(a)} TL</div>
        </div>
      `).join('');

      ciroBodyHtml = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <input type="date" value="${selectedCiroDate}" onchange="window.setSelectedCiroDate(this.value)" class="input-field" style="margin: 0; font-size: 11px; padding: 4px 8px; width: 140px;">
          <span style="font-size: 11px; color: var(--gold-primary); font-weight: 700;"> ${t('ownerUi_013')}</span>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 14px;">
          <div class="card" style="padding: 10px; text-align: center; border-color: #22c55e;">
            <div style="font-size: 10px; color: var(--text-muted);"> ${t('ownerUi_014')}</div>
            <div style="font-size: 20px; font-weight: 900; color:var(--theme-copy-22c55e, #22c55e);">${formatMoney(totalRevenue)}</div>
          </div>
          <div class="card" style="padding: 10px; text-align: center; border-color: #ef4444;">
            <div style="font-size: 10px; color: var(--text-muted);"> ${t('ownerUi_015')}</div>
            <div style="font-size: 20px; font-weight: 900; color:var(--theme-copy-ef4444, #ef4444);">${formatMoney(totalLostRevenue)}</div>
          </div>
        </div>

        <div class="owner-revenue-summary"><span>${dayApts.length} ${t('ownerUi_016')}</span><span>${completedCount} ${t('ownerUi_017')}</span><span>${uniqueCustomers} ${t('ownerUi_018')}</span></div>
        <button class="btn btn-secondary owner-detail-toggle" onclick="window.toggleOwnerRevenueDetails()">${ownerRevenueDetailsExpanded ? t('ownerUi_019') : t('ownerUi_020')}</button>
        ${ownerRevenueDetailsExpanded ? `<h4 style="font-size: 12px; font-weight: 800; color:var(--theme-copy-22c55e, #22c55e); margin-bottom: 6px;">${t('ownerUi_021')}${completedCount})</h4>${completedCount === 0 ? `<div class="card" style="font-size:11px;color:var(--text-muted);padding:14px;text-align:center;">${salonClosed ? t('uiRemaining_316', null, {name:friendlyName}) : t('uiRemaining_317', null, {name:friendlyName})}</div>` : completedRowsHtml}<h4 style="font-size:12px;color:var(--gold-primary);margin-top:12px;">${t('ownerUi_022')}</h4>${renderEmployeeRevenueCards(dailyEmployeeRows, dayCompleted)}` : ''}
      `;
    } else {
      const anchor = new Date(`${selectedCiroDate}T12:00:00`);
      if (ciroTimeframe === 'week') anchor.setDate(anchor.getDate() + (selectedWeekOffset * 7));
      if (ciroTimeframe === 'month') anchor.setMonth(anchor.getMonth() + selectedMonthOffset);
      let start = new Date(anchor);
      let end = new Date(anchor);
      let title = t('ownerUi_025');
      if (ciroTimeframe === 'week') {
        const mondayOffset = (anchor.getDay() + 6) % 7;
        start.setDate(anchor.getDate() - mondayOffset);
        end = new Date(start); end.setDate(start.getDate() + 6);
        title = t('ownerUi_026');
      } else if (ciroTimeframe === 'month') {
        start = new Date(anchor.getFullYear(), anchor.getMonth(), 1, 12);
        end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0, 12);
        title = t('ownerUi_027');
      }
      const startKey = toLocalDateKey(start), endKey = toLocalDateKey(end);
      const historyStart = new Date(anchor);
      if (hasTwoYearHistory) historyStart.setFullYear(anchor.getFullYear() - 2);
      else historyStart.setDate(anchor.getDate() - 30);
      const historyStartKey = toLocalDateKey(historyStart);
      const periodAppointments = allApts.filter(appointment => appointment && (ciroTimeframe === 'history' ? appointment.date >= historyStartKey && appointment.date <= toLocalDateKey(anchor) : (appointment.date >= startKey && appointment.date <= endKey)));
      const completed = periodAppointments.filter(appointment => appointment.status === 'completed');
      serviceRevenueAppointments = completed;
      const cancelled = periodAppointments.filter(appointment => ['cancelled', 'rejected', 'no_show'].includes(appointment.status));
      const revenue = completed.reduce((sum, appointment) => sum + getAptPrice(appointment), 0);
      const lost = cancelled.reduce((sum, appointment) => sum + getAptPrice(appointment), 0);
      const employeeRows = buildEmployeeRevenueData(completed, staffList);
      let comparisonHtml = '';
      if (ciroTimeframe === 'week') {
        const currentAnchor = new Date(`${selectedCiroDate}T12:00:00`);
        const currentMonday = new Date(currentAnchor); currentMonday.setDate(currentAnchor.getDate() - ((currentAnchor.getDay() + 6) % 7));
        const currentSunday = new Date(currentMonday); currentSunday.setDate(currentMonday.getDate() + 6);
        const previousMonday = new Date(currentMonday); previousMonday.setDate(currentMonday.getDate() - 7);
        const previousSunday = new Date(currentSunday); previousSunday.setDate(currentSunday.getDate() - 7);
        const revenueForRange = (rangeStart, rangeEnd) => allApts.filter(a => a && a.status === 'completed' && a.date >= toLocalDateKey(rangeStart) && a.date <= toLocalDateKey(rangeEnd)).reduce((sum, a) => sum + getAptPrice(a), 0);
        const currentWeekRevenue = revenueForRange(currentMonday, currentSunday);
        const previousWeekRevenue = revenueForRange(previousMonday, previousSunday);
        const difference = currentWeekRevenue - previousWeekRevenue;
        const rate = previousWeekRevenue > 0 ? (difference / previousWeekRevenue) * 100 : (currentWeekRevenue > 0 ? 100 : 0);
        comparisonHtml = `<div class="card" style="padding:10px;margin-bottom:12px;"><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;"><div><div style="font-size:9px;color:var(--text-muted);">${t('ownerUi_028')}</div><strong style="color:var(--theme-ink-ffffff, #fff);font-size:12px;">${formatMoney(currentWeekRevenue)}</strong></div><div><div style="font-size:9px;color:var(--text-muted);">${t('ownerUi_029')}</div><strong style="color:var(--theme-ink-ffffff, #fff);font-size:12px;">${formatMoney(previousWeekRevenue)}</strong></div></div><div style="margin-top:7px;font-size:10px;color: ${difference >= 0 ? 'var(--theme-copy-22c55e, #22c55e)' : 'var(--theme-copy-ef4444, #ef4444)'};">${difference >= 0 ? '▲' : '▼'} Fark: ${formatMoney(Math.abs(difference))} • %${Math.abs(rate).toFixed(1)}</div></div>`;
      }
      const historyRows = ciroTimeframe === 'history' ? completed.map(appointment => `<div class="card" style="padding:9px;margin-top:6px;display:grid;grid-template-columns:1.2fr 1.4fr auto;gap:7px;align-items:center;"><span style="color:var(--theme-ink-ffffff, #fff);font-size:10px;">${escapeOwnerText(appointment.customerName || t('staffUi_6'))}</span><span style="color:var(--text-muted);font-size:10px;">${escapeOwnerText(getAptServiceName(appointment))}</span><strong style="color:var(--theme-copy-22c55e, #22c55e);font-size:10px;">${formatMoney(getAptPrice(appointment))}</strong></div>`).join('') : '';
      const historyLabel = hasTwoYearHistory ? t('ownerUi_030') : t('ownerUi_031');
      ciroBodyHtml = `<div style="font-size:11px;color:var(--gold-primary);margin-bottom:10px;">${title}${ciroTimeframe === 'history' ? ` • ${historyLabel} (${historyStartKey} — ${toLocalDateKey(anchor)})` : ` • ${startKey} — ${endKey}`}</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;"><div class="card" style="padding:12px;text-align:center;border-color:#22c55e;"><div style="font-size:10px;color:var(--text-muted);">${t('ownerUi_032')}</div><strong style="font-size:20px;color:var(--theme-copy-22c55e, #22c55e);">${formatMoney(revenue)}</strong></div><div class="card" style="padding:12px;text-align:center;border-color:#ef4444;"><div style="font-size:10px;color:var(--text-muted);">${t('ownerUi_015')}</div><strong style="font-size:20px;color:var(--theme-copy-ef4444, #ef4444);">${formatMoney(lost)}</strong></div></div><div class="owner-revenue-summary"><span>${periodAppointments.length} ${t('ownerUi_016')}</span><span>${completed.length} ${t('ownerUi_017')}</span><span>${new Set(completed.map(a => a.customerPhone || a.customerUid)).size} ${t('ownerUi_018')}</span></div><button class="btn btn-secondary owner-detail-toggle" onclick="window.toggleOwnerRevenueDetails()">${ownerRevenueDetailsExpanded ? t('ownerUi_019') : t('ownerUi_033')}</button>${ownerRevenueDetailsExpanded ? `${comparisonHtml}${ciroTimeframe === 'history' ? `<h4 style="font-size:12px;color:var(--gold-primary);">${historyLabel} ${t('ownerUi_034')}</h4>${historyRows || `<div style="font-size:11px;color:var(--text-muted);padding:10px;">${historyLabel} ${t('ownerUi_035')}</div>`}` : `<h4 style="font-size:12px;color:var(--gold-primary);">${t('ownerUi_036')}</h4>${renderEmployeeRevenueCards(employeeRows, completed)}`}` : ''}`;
    }

    mainHtml = `
      <div class="card animate-fade">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <h3 style="font-size: 16px; font-weight: 800; color: var(--gold-primary); margin: 0;"> ${t('ciroTab', currentLang)} ${t('ownerUi_037')}</h3>
          <button onclick="window.switchOwnerTab('dashboard')" class="btn btn-secondary" style="padding: 4px 8px; font-size: 10px;">${t('backBtn', currentLang)}</button>
        </div>
        <div class="owner-revenue-periods"><button onclick="window.openOwnerRevenuePeriod('day')" class="${ownerRevenueDetailsExpanded && ciroTimeframe === 'day' ? 'is-active' : ''}"><span>${t('ownerUi_038')}</span><strong>${formatMoney(revenueSummary.day)}</strong></button><button onclick="window.openOwnerRevenuePeriod('week')" class="${ownerRevenueDetailsExpanded && ciroTimeframe === 'week' ? 'is-active' : ''}"><span>${t('ownerUi_039')}</span><strong>${formatMoney(revenueSummary.week)}</strong></button><button onclick="window.openOwnerRevenuePeriod('month')" class="${ownerRevenueDetailsExpanded && ciroTimeframe === 'month' ? 'is-active' : ''}"><span>${t('ownerUi_040')}</span><strong>${formatMoney(revenueSummary.month)}</strong></button></div>
        ${ownerRevenueDetailsExpanded ? `<button onclick="window.switchOwnerTab('ciro','history')" class="btn ${ciroTimeframe === 'history' ? 'btn-gold' : 'btn-secondary'}" style="width:100%;font-size:10px;margin-bottom:10px;">${t('ownerUi_041')}</button>` : ''}
        ${ownerRevenueDetailsExpanded && ciroTimeframe === 'week' ? `<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:10px;"><button onclick="window.setCiroWeekOffset(0)" class="btn ${selectedWeekOffset === 0 ? 'btn-gold' : 'btn-secondary'}" style="font-size:10px;">${t('ownerUi_028')}</button><button onclick="window.setCiroWeekOffset(-1)" class="btn ${selectedWeekOffset === -1 ? 'btn-gold' : 'btn-secondary'}" style="font-size:10px;">${t('ownerUi_029')}</button></div>` : ''}
        ${ownerRevenueDetailsExpanded && ciroTimeframe === 'month' ? `<div style="display:grid;grid-template-columns:${hasThreeMonthHistory ? 'repeat(3,1fr)' : '1fr'};gap:5px;margin-bottom:10px;"><button onclick="window.setCiroMonthOffset(0)" class="btn ${selectedMonthOffset === 0 ? 'btn-gold' : 'btn-secondary'}" style="font-size:9px;">${t('ownerUi_042')}</button>${hasThreeMonthHistory ? `<button onclick="window.setCiroMonthOffset(-1)" class="btn ${selectedMonthOffset === -1 ? 'btn-gold' : 'btn-secondary'}" style="font-size:9px;">${t('ownerUi_043')}</button><button onclick="window.setCiroMonthOffset(-2)" class="btn ${selectedMonthOffset === -2 ? 'btn-gold' : 'btn-secondary'}" style="font-size:9px;">${t('ownerUi_044')}</button>` : ''}</div>${hasThreeMonthHistory ? '' : `<div style="font-size:9px;color:var(--text-muted);margin:-4px 0 8px;">${t('ownerUi_045')}</div>`}` : ''}
        ${ciroTimeframe !== 'day' ? `<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;"><span style="font-size:10px;color:var(--text-muted);">${t('ownerUi_046')}</span><input type="date" value="${selectedCiroDate}" onchange="window.setSelectedCiroDate(this.value)" class="input-field" style="margin:0;flex:1;font-size:11px;"></div>` : ''}
        ${ownerRevenueDetailsExpanded ? renderOwnerServiceRevenue(serviceRevenueAppointments) : ''}
        ${ownerRevenueDetailsExpanded ? ciroBodyHtml : `<div class="owner-summary-hint">${t('ownerUi_047')}</div>`}
      </div>
    `;
  }
  // ==========================================
  // 3. RANDEVULAR EKRANI (REQS 2, 3, 4)
  // ==========================================
    else 
  if (activeOwnerTab === 'appointments') {
    const visibleStaffList = isBarber && currentStaff ? [currentStaff] : staffList;
    const selectedStaff = selectedOwnerStaffFilter === 'all' ? null : visibleStaffList.find(staff => staff.id === selectedOwnerStaffFilter);
    if (selectedOwnerStaffFilter !== 'all' && !selectedStaff) selectedOwnerStaffFilter = 'all';
    const staffFilteredAppointments = selectedStaff ? allApts.filter(appointment => appointmentMatchesStaff(appointment, selectedStaff)) : allApts;
    const dateScopedAppointments = selectedOwnerAptDate ? staffFilteredAppointments.filter(appointment => appointment && appointment.date === selectedOwnerAptDate) : staffFilteredAppointments;
    const plainPendingApts = dateScopedAppointments.filter(a => a && a.status === 'pending' && !a.requestedDate && !appointmentHasEnded(a));
    const approvedApts = dateScopedAppointments.filter(a => a && a.status === 'approved' && !a.requestedDate);
    const completedApts = dateScopedAppointments.filter(a => a && a.status === 'completed');
    const cancelRequestApts = dateScopedAppointments.filter(a => a && a.status === 'cancel_requested' && (!a.cancelRequestStatus || a.cancelRequestStatus === 'pending'));
    const rescheduleRequestApts = dateScopedAppointments.filter(a => a && (a.status === 'reschedule_requested' || (a.requestedDate && a.requestedTime)) && (!a.rescheduleRequestStatus || a.rescheduleRequestStatus === 'pending'));
    const pendingApts = Array.from(new Map([...plainPendingApts, ...approvedApts, ...cancelRequestApts, ...rescheduleRequestApts].map(a => [a.aptId || a.appointmentId, a])).values());
    const noShowApts = filterOwnerAppointmentsByCategory(dateScopedAppointments, 'no_show');
    const cancelledApts = filterOwnerAppointmentsByCategory(dateScopedAppointments, 'cancelled');
    const selectedRevenue = completedApts.reduce((sum, appointment) => sum + getAptPrice(appointment), 0);
    const staffSummary = calculateStaffAppointmentSummary(dateScopedAppointments);
    const staffFilterHtml = `<div class="owner-date-filter"><span>${t('dateLabel')}</span><input type="date" value="${selectedOwnerAptDate}" onchange="window.setOwnerAppointmentDate(this.value)" class="input-field"><button onclick="window.setOwnerAppointmentDate('')" class="btn btn-secondary">${t('ownerUi_049')}</button></div><button class="btn btn-secondary owner-accordion-trigger" onclick="window.toggleOwnerStaffAccordion()"><span>${t('ownerUi_050')}${selectedStaff ? ` • ${escapeOwnerText(selectedStaff.displayName || selectedStaff.name)}` : t('ownerUi_058')}</span><strong>${ownerStaffAccordionOpen ? '▲' : '▼'}</strong></button>${ownerStaffAccordionOpen ? `<div class="owner-staff-filter"><button onclick="window.setOwnerStaffFilter('all')" class="btn ${selectedOwnerStaffFilter === 'all' ? 'btn-gold' : 'btn-secondary'}">${t('ownerUi_049')}</button>${visibleStaffList.map(staff => `<button onclick="window.setOwnerStaffFilter('${staff.id}')" class="btn ${selectedOwnerStaffFilter === staff.id ? 'btn-gold' : 'btn-secondary'}">${escapeOwnerText(staff.displayName || staff.name)}</button>`).join('')}</div>` : ''}<div class="owner-staff-summary"><button onclick="window.switchOwnerAptCategory('all')"><span>${t('ownerUi_051')}</span><strong>${staffSummary.total}</strong></button><button onclick="window.switchOwnerAptCategory('pending')"><span>${t('ownerUi_055')}</span><strong>${staffSummary.pending}</strong></button><button onclick="window.switchOwnerAptCategory('completed')"><span>${t('ownerUi_052')}</span><strong>${staffSummary.completed}</strong></button><button onclick="window.switchOwnerAptCategory('no_show')"><span>${t('ownerUi_053')}</span><strong>${staffSummary.noShow}</strong></button><button onclick="window.switchOwnerAptCategory('cancelled')"><span>${t('ownerUi_054')}</span><strong>${staffSummary.cancelled}</strong></button></div><div class="card" style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;padding:10px;margin-bottom:12px;text-align:center;"><div><div style="font-size:9px;color:var(--text-muted);">${t('ownerUi_056')}</div><strong style="color:var(--theme-ink-ffffff, #fff);font-size:15px;">${dateScopedAppointments.length}</strong></div><div><div style="font-size:9px;color:var(--text-muted);">${t('ownerUi_052')}</div><strong style="color:var(--theme-copy-22c55e, #22c55e);font-size:15px;">${completedApts.length}</strong></div><div><div style="font-size:9px;color:var(--text-muted);">${t('ownerUi_057')}</div><strong style="color:var(--gold-primary);font-size:13px;">${formatMoney(selectedRevenue)}</strong></div></div>`;

    if (activeOwnerAptCategory === 'all') {
      // 5 CLEAN CLOSED CARDS ONLY (REQ 9)
      mainHtml = `
        <div class="card card-gold animate-fade" style="padding: 16px; margin-bottom: 16px;">
          <h3 style="font-size: 16px; font-weight: 800; color: var(--theme-ink-ffffff, #fff); margin-bottom: 4px;"> ${t('ownerUi_059')}</h3>
          <p style="font-size: 11px; color: var(--text-muted);">${t('ownerUi_060')}</p>
        </div>
        ${staffFilterHtml}
        <div class="owner-upcoming-list">
          ${[...dateScopedAppointments].sort((a,b) => String(a.date + a.time).localeCompare(String(b.date + b.time))).map(a => {
            const effectiveStatus = effectiveAppointmentStatus(a);
            const status = ['pending','approved','completed','no_show','cancelled','rejected','expired','cancel_requested','reschedule_requested'].includes(effectiveStatus) ? effectiveStatus : 'unknown';
            const category = ['cancelled','rejected','expired'].includes(status) ? 'cancelled' : status === 'cancel_requested' ? 'cancel_requests' : status === 'reschedule_requested' ? 'reschedule_requests' : status === 'unknown' ? 'all' : status;
            return `<button class="owner-upcoming-row" onclick="window.switchOwnerAptCategory('${category}')"><span><time dir="ltr">${escapeOwnerText(a.time || '—')}</time>${!selectedOwnerAptDate ? `<small dir="ltr">${escapeOwnerText(a.date)}</small>` : ''}</span><span><strong>${escapeOwnerText(a.customerName || t('ownerUi_008'))}</strong><small>${escapeOwnerText(getAptServiceName(a))}</small></span><span class="badge badge-${status}">${status === 'unknown' ? t('ownerUi_051') : t(status, currentLang)}</span></button>`;
          }).join('') || `<p class="owner-summary-hint">${t('ownerUi_074')}</p>`}
        </div>

        ${false ? `<div class="owner-category-grid">
          <div onclick="window.switchOwnerAptCategory('pending')" class="card owner-category-card animate-fade" style="border-color:#f59e0b;">
            <div>
              <div style="font-size: 14px; font-weight: 800; color: var(--theme-ink-ffffff, #fff);"> ${t('ownerUi_061')}</div>
              <div style="font-size: 11px; color: var(--text-muted);">${t('ownerUi_062')}</div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="badge badge-pending" style="font-size: 12px; font-weight: 800;">${pendingApts.length}</span>
              <span style="font-size: 16px; color: var(--gold-primary);">→</span>
            </div>
          </div>

          <div onclick="window.switchOwnerAptCategory('approved')" class="card owner-category-card animate-fade" style="border-color:#22c55e;">
            <div>
              <div style="font-size: 14px; font-weight: 800; color: var(--theme-ink-ffffff, #fff);"> ${t('ownerUi_063')}</div>
              <div style="font-size: 11px; color: var(--text-muted);">${t('ownerUi_064')}</div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="badge badge-approved" style="font-size: 12px; font-weight: 800;">${approvedApts.length}</span>
              <span style="font-size: 16px; color: var(--gold-primary);">→</span>
            </div>
          </div>

          <div onclick="window.switchOwnerAptCategory('completed')" class="card owner-category-card animate-fade" style="border-color:#3b82f6;">
            <div>
              <div style="font-size: 14px; font-weight: 800; color: var(--theme-ink-ffffff, #fff);"> ${t('ownerUi_065')}</div>
              <div style="font-size: 11px; color: var(--text-muted);">${t('ownerUi_066')}</div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="badge" style="background: rgba(59,130,246,0.2); color:var(--theme-copy-3b82f6, #3b82f6); font-size: 12px; font-weight: 800;">${completedApts.length}</span>
              <span style="font-size: 16px; color: var(--gold-primary);">→</span>
            </div>
          </div>

          <div onclick="window.switchOwnerAptCategory('cancel_requests')" class="card owner-category-card animate-fade" style="border-color:#ef4444;">
            <div>
              <div style="font-size: 14px; font-weight: 800; color: var(--theme-ink-ffffff, #fff);"> ${t('ownerUi_067')}</div>
              <div style="font-size: 11px; color: var(--text-muted);">${t('ownerUi_068')}</div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="badge badge-pending" style="font-size: 12px; font-weight: 800;">${cancelRequestApts.length}</span>
              <span style="font-size: 16px; color: var(--gold-primary);">→</span>
            </div>
          </div>

          <div onclick="window.switchOwnerAptCategory('reschedule_requests')" class="card owner-category-card animate-fade" style="border-color:#eab308;">
            <div>
              <div style="font-size: 14px; font-weight: 800; color: var(--theme-ink-ffffff, #fff);"> ${t('ownerUi_069')}</div>
              <div style="font-size: 11px; color: var(--text-muted);">${t('ownerUi_070')}</div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="badge badge-pending" style="font-size: 12px; font-weight: 800;">${rescheduleRequestApts.length}</span>
              <span style="font-size: 16px; color: var(--gold-primary);">→</span>
            </div>
          </div>

          <div onclick="window.switchOwnerAptCategory('cancelled')" class="card owner-category-card animate-fade" style="border-color:#ef4444;">
            <div>
              <div style="font-size: 14px; font-weight: 800; color: var(--theme-ink-ffffff, #fff);"> ${t('ownerUi_071')}</div>
              <div style="font-size: 11px; color: var(--text-muted);">${t('ownerUi_072')}</div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="badge" style="background: rgba(239,68,68,0.2); color:var(--theme-copy-ef4444, #ef4444); font-size: 12px; font-weight: 800;">${cancelledApts.length}</span>
              <span style="font-size: 16px; color: var(--gold-primary);">→</span>
            </div>
          </div>
        </div>` : ''}
      `;
    } else {
      // DEDICATED CATEGORY LIST VIEW
      let targetList = [];
      let catTitle = '';
      if (activeOwnerAptCategory === 'pending') { targetList = pendingApts; catTitle = t('ownerUi_061'); }
      if (activeOwnerAptCategory === 'approved') { targetList = approvedApts; catTitle = t('ownerUi_063'); }
      if (activeOwnerAptCategory === 'completed') { targetList = completedApts; catTitle = t('ownerUi_065'); }
      if (activeOwnerAptCategory === 'no_show') { targetList = noShowApts; catTitle = t('ownerNoShowAppointments'); }
      if (activeOwnerAptCategory === 'cancel_requests') { targetList = cancelRequestApts; catTitle = t('ownerUi_067'); }
      if (activeOwnerAptCategory === 'reschedule_requests') { targetList = rescheduleRequestApts; catTitle = t('ownerUi_069'); }
      if (activeOwnerAptCategory === 'cancelled') { targetList = cancelledApts; catTitle = t('ownerUi_071'); }
      mainHtml = `
        ${staffFilterHtml}
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 10px;">
          <h3 style="font-size: 16px; font-weight: 800; color: var(--gold-primary); margin: 0;">${catTitle} (${targetList.length})</h3>
          <button onclick="window.switchOwnerAptCategory('all')" class="btn btn-secondary" style="font-size: 11px; padding: 4px 10px;">${t('ownerUi_073')}</button>
        </div>
        <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px;">
          ${targetList.length === 0 ? `<div style="font-size: 11px; color: var(--text-muted); text-align: center; padding: 20px;">${t('ownerUi_074')}</div>` : targetList.map(a => `
            <div class="card animate-fade" data-appointment-id="${escapeOwnerText(a.aptId || a.appointmentId || '')}" style="padding: 12px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="font-size: 13px; font-weight: 800; color: var(--theme-ink-ffffff, #fff);"> ${escapeOwnerText(a.customerName || a.customerNameSnapshot || t('ownerUi_075'))} (${escapeOwnerText(a.customerPhone || t('ownerUi_075'))})</div>
                <span class="badge badge-approved">${escapeOwnerText(a.time || '—')} - ${escapeOwnerText(a.date || '—')}</span>
              </div>
              <div style="font-size: 11px; color: var(--gold-primary); margin-top: 4px;">
                 ${escapeOwnerText(a.serviceNameSnapshot || a.serviceName || t('staffUi_7'))} •  ${escapeOwnerText(a.staffNameSnapshot || a.staffName || t('ownerUi_076'))} •  ${getAptPrice(a)} TL
              </div>
              ${(a.cancelRequestedAt || a.rescheduleRequestedAt) ? `<div style="font-size:10px;color:var(--text-muted);margin-top:4px;">${t('ownerUi_077')} ${escapeOwnerText(new Date(a.cancelRequestedAt || a.rescheduleRequestedAt).toLocaleString('tr-TR'))}</div>` : ''}
              ${a.status === 'pending' ? `
                <div style="display: flex; gap: 8px; margin-top: 10px;">
                  <button onclick="window.updateAppointmentStatusOwner('${a.aptId}', 'approved', this)" class="btn btn-gold" style="flex: 1; font-size: 11px; padding: 6px;"> ${t('ownerUi_078')}</button>
                  <button onclick="window.updateAppointmentStatusOwner('${a.aptId}', 'rejected', this)" class="btn btn-secondary" style="flex: 1; font-size: 11px; padding: 6px; color:var(--theme-copy-ef4444, #ef4444); border-color: #ef4444;"> ${t('ownerUi_079')}</button>
                </div>
              ` : ''}
              ${a.status === 'approved' && !a.requestedDate ? `
                <div style="display: flex; gap: 8px; margin-top: 10px;">
                  <button onclick="window.updateAppointmentStatusOwner('${a.aptId}', 'completed', this)" class="btn btn-gold" style="flex: 1; font-size: 11px; padding: 6px;"> ${t('ownerUi_080')}</button>
                  <button onclick="window.updateAppointmentStatusOwner('${a.aptId}', 'no_show', this)" class="btn btn-secondary" style="flex: 1; font-size: 11px; padding: 6px; color:var(--theme-copy-ef4444, #ef4444); border-color: #ef4444;"> ${t('ownerUi_053')}</button>
                </div>
              ` : ''}
              ${a.requestedDate && a.requestedTime ? `
                <div style="margin-top:9px;padding:9px;border-radius:8px;background:rgba(234,179,8,.12);font-size:11px;color:var(--theme-ink-ffffff, #fff);"> ${t('ownerUi_081')} <strong>${a.requestedDate} @ ${a.requestedTime}</strong></div>
                <div style="display:flex;gap:8px;margin-top:8px;"><button onclick="window.reviewOwnerReschedule('${a.aptId}','approve','${a.requestedDate}','${a.requestedTime}')" class="btn btn-gold" style="flex:1;font-size:10px;"> ${t('ownerUi_082')}</button><button onclick="window.reviewOwnerReschedule('${a.aptId}','reject')" class="btn btn-secondary" style="flex:1;font-size:10px;color:var(--theme-copy-ef4444, #ef4444);"> ${t('ownerUi_079')}</button></div>
              ` : ''}
              ${a.status === 'cancel_requested' ? `
                <div style="margin-top:9px;padding:9px;border-radius:8px;background:rgba(239,68,68,.12);font-size:11px;color:var(--theme-ink-ffffff, #fff);"> ${t('ownerUi_083')}</div>
                <div style="display:flex;gap:8px;margin-top:8px;"><button onclick="window.updateAppointmentStatusOwner('${a.aptId}','cancelled',this)" class="btn btn-gold" style="flex:1;font-size:10px;"> ${t('ownerUi_084')}</button><button onclick="window.updateAppointmentStatusOwner('${a.aptId}','${a.statusBeforeRequest === 'pending' ? 'pending' : 'approved'}',this)" class="btn btn-secondary" style="flex:1;font-size:10px;"> ${t('ownerUi_085')}</button></div>
              ` : ''}
            </div>
          `).join('')}
        </div>
      `;
    }
  }

  // ==========================================
  // 4. YÖNETİM & PAKET & LİSANS DURUMU (REQUIREMENTS 12, 13, 14)
  // ==========================================
    else if (activeOwnerTab === 'management') {
    const isGrant = bizRecord.premiumSource === 'super_admin_grant';
    const planName = isGrant ? t('ownerUi_332') : (bizRecord.plan || 'FREE');

    mainHtml = `
      <div class="card animate-fade">
        <h3 style="font-size: 16px; font-weight: 800; color: var(--gold-primary); margin-bottom: 14px;"> ${t('managementTab', currentLang)}</h3>
        
        <div class="owner-management-links">
          <button class="owner-management-link" onclick="window.openOwnerSalonDetailsModal()">${uiIcon('store')}<span>${t('ownerUi_260')}</span>${uiIcon('chevron')}</button>
          <button class="owner-management-link" onclick="window.openOwnerManagementView('customers')">${uiIcon('users')}<span>${t('ownerCustomersTitle')}<small>${ownerCustomers.length} ${t('ownerUi_018')}</small></span>${uiIcon('chevron')}</button>
          <button class="owner-management-link" onclick="window.openOwnerSocialSection()">${uiIcon('instagram')}<span>${t('ownerUi_271')}</span>${uiIcon('chevron')}</button>
          <button class="owner-management-link" onclick="window.openOwnerReviews()">${uiIcon('star')}<span>${t('uiRemaining_302')}${hasOwnerRating ? `<small>★ ${ownerRating.toFixed(1)} · ${ownerRatingCount}</small>` : ''}</span>${uiIcon('chevron')}</button>
        </div>
        <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 14px;">
          <!-- CARD 1: PERSONEL -->
          <div onclick="window.openStaffManagementModal()" class="card animate-fade" style="padding: 14px; cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
            <h4 style="font-size: 14px; font-weight: 800; color: var(--theme-ink-ffffff, #fff); margin: 0;"> ${t('ownerUi_086')}</h4>
            <span class="badge badge-approved">${t('manageLabel', currentLang)} →</span>
          </div>

          <!-- CARD 2: HİZMETLER -->
          <div onclick="window.openServicesManagementModal()" class="card animate-fade" style="padding: 14px; cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
            <h4 style="font-size: 14px; font-weight: 800; color: var(--theme-ink-ffffff, #fff); margin: 0;"> ${t('ownerUi_087')}</h4>
            <span class="badge badge-approved">${t('manageLabel', currentLang)} →</span>
          </div>

          <!-- CARD 3: SAATLER -->
          <div onclick="window.openWeeklyScheduleModal()" class="card animate-fade" style="padding: 14px; cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
            <h4 style="font-size: 14px; font-weight: 800; color: var(--theme-ink-ffffff, #fff); margin: 0;"> ${t('ownerUi_088')}</h4>
            <span class="badge badge-approved">${t('ownerUi_089')}</span>
          </div>

          <!-- CARD 4: İLETİŞİM -->
          <div onclick="window.openSalonContactModal()" class="card animate-fade" style="padding: 14px; cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
            <h4 style="font-size: 14px; font-weight: 800; color: var(--theme-ink-ffffff, #fff); margin: 0;"> ${t('ownerUi_090')}</h4>
            <span class="badge badge-approved">${t('ownerUi_089')}</span>
          </div>

          <!-- CARD 5: PAKET & LİSANS DURUMU (ONLY ONCE AT THE VERY BOTTOM!) -->
          <div class="card card-gold animate-fade" style="padding: 16px; margin-top: 6px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <div>
                <div style="font-size: 11px; color: var(--gold-primary); font-weight: 700;"> ${t('packageManagementTitle')}</div>
                <div style="font-size: 18px; font-weight: 900; color: var(--theme-ink-ffffff, #fff); margin-top: 2px;">${t('ownerUi_092')} ${planName}</div>
                ${isGrant ? `<div style="font-size: 10px; color:var(--theme-copy-eab308, #eab308); font-weight: 800; margin-top: 4px;">${t('superAdminGrantNotice', currentLang)}</div>` : ''}
              </div>
              <button onclick="window.openPackageUpgradeModal()" class="btn btn-gold" style="font-size: 11px; padding: 6px 12px;">
                ${t('upgradePackageBtn', currentLang)}
              </button>
            </div>
            <div style="font-size: 11px; color: var(--text-muted); margin-top: 10px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 8px;">
              ${bizRecord.plan === 'PREMIUM' || isGrant ? t('ownerUi_093') : t('ownerUi_094')}
            </div>
          </div>
        </div>
      </div>
    `;
  }
  // ==========================================
  // 5. PATRON PROFİLİ SADE MENÜ (REQUIREMENTS 10 & 11)
  // ==========================================
  else if (activeOwnerTab === 'profile') {
    const currentLangObj = SUPPORTED_LANGUAGES.find(l => l.code === currentLang) || SUPPORTED_LANGUAGES[0];

    mainHtml = `
      <div class="card animate-fade" style="padding: 20px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <div style="width: 72px; height: 72px; border-radius: 50%; background: var(--gold-gradient); display: flex; align-items: center; justify-content: center; font-size: 26px; font-weight: 900; color: #000; margin: 0 auto;">
            ${initials}
          </div>
          <h3 style="font-size: 16px; font-weight: 800; color: var(--theme-ink-ffffff, #fff); margin-top: 8px;">${displayName}</h3>
          <div style="font-size: 12px; color: var(--gold-primary); font-weight: 700;"> ${bizRecord.name} • ${user.phone}</div>
        </div>

        <!-- SADELEŞTİRİLMİŞ 5 MENÜ SEÇENEĞİ (REQS 10 & 11) -->
        <div style="display: flex; flex-direction: column; gap: 10px;">
          <button onclick="window.openPrivacyAccountModal()" class="btn btn-secondary" style="width: 100%; text-align: left; padding: 14px; display: flex; justify-content: space-between; align-items: center;">
            <span> ${t('privacyAccount', currentLang)} (${canManageSalon ? t('ownerProfileDetails', currentLang) : t('employeeProfileDetails', currentLang)})</span>
            <span style="font-size: 12px; color: var(--gold-primary);">${t('manageLabel', currentLang)} →</span>
          </button>

          <button onclick="window.openOwnerAppearanceSettings()" class="btn btn-secondary app-settings-entry" style="width:100%;text-align:left;min-height:44px;">Ayarlar · Tema ve görünüm</button>
          <button onclick="window.openLanguageModalOwner()" class="btn btn-secondary" style="width: 100%; text-align: left; padding: 14px; display: flex; justify-content: space-between; align-items: center;">
            <span> ${t('language', currentLang)}</span>
            <span style="font-size: 12px; color: var(--gold-primary);">${currentLangObj.flag} ${t('languageName_' + currentLangObj.code, currentLang)}</span>
          </button>

          <button onclick="window.openNotificationSettingsModal()" class="btn btn-secondary" style="width: 100%; text-align: left; padding: 14px; display: flex; justify-content: space-between; align-items: center;">
            <span> ${t('notificationSettings', currentLang)}</span>
            <span style="font-size: 12px; color: var(--gold-primary);">${t('notificationCategories', currentLang)} →</span>
          </button>

          <button onclick="window.openHelpSupportModal()" class="btn btn-secondary" style="width: 100%; text-align: left; padding: 14px;">
             ${t('helpSupport', currentLang)}
          </button>

          <button onclick="window.promptOwnerLogout()" class="btn btn-secondary" style="width: 100%; margin-top: 10px; min-height: 44px; border-color: #ef4444; color:var(--theme-copy-ef4444, #ef4444);">
             ${t('logout', currentLang)}
          </button>
        </div>
      </div>
    `;
  }

  // WORKSPACE VIEW OVERRIDES
  if(activeOwnerTab==='dashboard')mainHtml=renderOwnerSummary({name:displayName,business:bizRecord,appointments:allApts,today:todayStr,revenue:calculateOwnerDailyMetrics(allApts,todayStr).revenue});
  if(activeOwnerTab==='management'&&!legacyOwnerMenu)mainHtml=renderWorkspaceMenu();
  if(activeOwnerTab==='agenda')mainHtml=renderOwnerAgenda({business:bizRecord,businessId,appointments:allApts,date:agendaDate||todayStr,mode:agendaMode,staffId:agendaStaff,serviceId:agendaService,canBook:canCreateManualBooking});
  const workspaceTabs=['customers','cash','packages','products','campaigns','reports'];
  if(workspaceTabs.includes(activeOwnerTab)){
    try{
      const data=await loadOwnerWorkspace();
      if(!isSessionCurrent(user.uid,renderGeneration))return;
      mainHtml=renderOwnerWorkspace({tab:activeOwnerTab,data,appointments:allApts,businessId,today:todayStr});
      installOwnerWorkspace({data,appointments:allApts,businessId,today:todayStr,rerender:()=>renderOwnerScreen(user,onTabChange)});
    }catch(error){mainHtml=`<div class="workspace-empty" role="alert">${escapeOwnerText(error.message)}<button class="btn btn-secondary" onclick="window.switchOwnerTab('dashboard')">Ana sayfa</button></div>`;}
  }

  if(ownerRenderId !== ownerRenderSequence || !isSessionCurrent(user.uid,renderGeneration))return;

  // HEADER & BOTTOM NAV
  if (activeOwnerTab === 'management' && legacyOwnerMenu && ownerManagementView === 'customers') mainHtml = renderCustomersView();

  container.innerHTML = `
    <section class="owner-panel salon-workspace ${getOwnerAppearance(user.uid,businessId)==='salon'&&bizRecord.branding?'salon-brand owner-salon-appearance':''}" style="${ownerAppearanceStyle(bizRecord,getOwnerAppearance(user.uid,businessId)==='salon')}" data-owner-tab="${activeOwnerTab}">
    <div class="header-bar">
      <div style="display: flex; align-items: center; gap: 8px;">
        ${renderOwnerSalonLogo(bizRecord)}
        <span style="font-size: 12px; font-weight: 800; color: var(--gold-primary);">${bizRecord.name}</span>
      </div>
      <div style="display:flex;align-items:center;gap:8px;"><button aria-label="${t('ownerUi_096')}" onclick="window.openOwnerNotificationCenter()" class="icon-button" style="position:relative;color:var(--gold-primary);">${uiIcon('bell')}${ownerUnreadCount ? `<span style="position:absolute;right:-3px;top:-4px;background:#ef4444;color:var(--theme-ink-ffffff, #fff);border-radius:10px;min-width:15px;height:15px;font-size:9px;display:flex;align-items:center;justify-content:center;">${ownerUnreadCount}</span>` : ''}</button><div style="font-size: 11px; color: var(--text-muted);">${escapeOwnerText(displayName)} (${t(isEmployee ? 'employeeRole' : 'ownerRole', currentLang)})</div></div>
    </div>

    <main class="owner-content">${mainHtml}</main>

    <nav class="bottom-nav workspace-nav" aria-label="Salon menüsü">
      <button class="nav-item ${activeOwnerTab==='dashboard'?'active':''}" aria-current="${activeOwnerTab==='dashboard'?'page':'false'}" onclick="window.switchOwnerTab('dashboard')"><span class="icon">${uiIcon('home')}</span><span>Özet</span></button>
      <button class="nav-item ${activeOwnerTab==='ciro'?'active':''}" aria-current="${activeOwnerTab==='ciro'?'page':'false'}" onclick="window.switchOwnerTab('ciro')"><span class="icon">${uiIcon('chart')}</span><span>Ciro</span></button>
      <button class="nav-item ${['agenda','appointments'].includes(activeOwnerTab)?'active':''}" aria-current="${['agenda','appointments'].includes(activeOwnerTab)?'page':'false'}" onclick="window.switchOwnerTab('agenda')"><span class="icon">${uiIcon('calendar')}</span><span>Randevular</span></button>
      <button class="nav-item ${activeOwnerTab==='management'?'active':''}" aria-current="${activeOwnerTab==='management'?'page':'false'}" onclick="window.switchOwnerTab('management')"><span class="icon">${uiIcon('grid')}</span><span>Menüler</span></button>
      <button class="nav-item ${activeOwnerTab==='profile'?'active':''}" aria-current="${activeOwnerTab==='profile'?'page':'false'}" onclick="window.switchOwnerTab('profile')"><span class="icon">${uiIcon('user')}</span><span>Profil</span></button>
    </nav>
    </section>
  `;

  // GLOBAL STATE BINDINGS
  window.openOwnerAppearanceSettings=()=>{
    const root=document.getElementById('modal-root');if(!root)return;
    const selected=getOwnerAppearance(user.uid,businessId);
    root.innerHTML=`<div class="modal-overlay" onclick="window.closeModal()"><section class="modal-card owner-modal-card" onclick="event.stopPropagation()"><div class="owner-modal-header"><h3>Tema ve Salon Görünümü</h3><button class="btn btn-secondary" onclick="window.closeModal()" aria-label="Kapat">×</button></div><p>Bu seçim yalnız senin patron panelin içindir. Diğer kullanıcıların tema tercihi değişmez.</p><button class="btn btn-secondary" style="width:100%;margin:8px 0" aria-pressed="${selected==='user'}" onclick="window.setOwnerAppearance('user')">${selected==='user'?'✓ ':''}Uygulama temamı kullan</button><button class="btn btn-secondary" style="width:100%;margin:8px 0" aria-pressed="${selected==='salon'}" ${bizRecord.branding?'':'disabled'} onclick="window.setOwnerAppearance('salon')">${selected==='salon'?'✓ ':''}Salonumun renklerini kullan</button>${bizRecord.branding?'':'<p>Önce Salon Marka Kiti içinden renklerini kaydet.</p>'}<button class="btn btn-gold" style="width:100%;margin:8px 0" onclick="window.closeModal();window.openSalonBrandKit()">Logo ve salon renklerini düzenle</button><button class="btn btn-secondary" style="width:100%;margin:8px 0" onclick="window.closeModal();window.openAppSettings()">Uygulama tema seçenekleri</button><p>Salon Marka Kiti: logo/kapak yükleme, logodan renk önerisi, HEX renk ve açık/koyu görünüm.</p></section></div>`;
  };
  window.setOwnerAppearance=mode=>{if(!setOwnerAppearance(user.uid,businessId,mode))return showErrorModal(t('errorTitle'),'Görünüm tercihi bu cihazda kaydedilemedi.');window.closeModal();return renderOwnerScreen(user,onTabChange);};

  window.openOwnerNotificationCenter = () => {
    const root = document.getElementById('modal-root'); if (!root) return;
    const rows = ownerNotifications.map(notification => `<button type="button" onclick="window.openOwnerNotificationTarget('${escapeOwnerText(notification.notificationId || '')}')" class="card" style="display:block;width:100%;text-align:left;padding:10px;margin-bottom:7px;border-color:${notification.read ? 'var(--border-color)' : 'var(--gold-primary)'};cursor:pointer;"><div style="font-size:12px;font-weight:800;color:var(--theme-ink-ffffff, #fff);">${escapeOwnerText(notification.title || t('staffUi_51'))}</div><div style="font-size:10px;color:var(--text-muted);margin-top:3px;">${escapeOwnerText(notification.message || '')}</div></button>`).join('');
    root.innerHTML = `<div class="modal-overlay" onclick="window.closeModal()"><div class="modal-card owner-modal-card animate-fade" onclick="event.stopPropagation()"><div class="owner-modal-header"><h3 style="font-size:15px;color:var(--gold-primary);margin:0;"> ${t('ownerUi_098')}</h3><button aria-label="${t('ownerUi_099')}" onclick="window.closeModal()" class="btn btn-secondary">${uiIcon('x')}</button></div>${rows || `<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:11px;">${t('ownerUi_101')}</div>`}<button onclick="window.markOwnerNotificationsRead()" class="btn btn-gold" style="width:100%;margin-top:8px;">${t('ownerUi_100')}</button></div></div>`;
  };
  window.markOwnerNotificationsRead = async () => {
    await Promise.all(ownerNotifications.filter(notification => !notification.read).map(notification => saveRecord(`notifications/${user.uid}/${notification.notificationId}/read`, true, 'PUT')));
    window.closeModal(); renderOwnerScreen(user, onTabChange);
  };
  window.openOwnerNotificationTarget = async (notificationId) => {
    const notification = ownerNotifications.find(item => item.notificationId === notificationId);
    if (!notification) {
      window.closeModal();
      activeOwnerTab = 'appointments'; activeOwnerAptCategory = 'all';
      return renderOwnerScreen(user, onTabChange);
    }
    if (!notification.read) await saveRecord(`notifications/${user.uid}/${notification.notificationId}/read`, true, 'PUT');
    const type = String(notification.type || '');
    let section = notification.targetSection;
    if (!section && type.startsWith('reschedule_request')) section = 'reschedule_requests';
    if (!section && (type.startsWith('cancel_request') || type.startsWith('customer_cancel_request'))) section = 'cancel_requests';
    if (!section && (type.startsWith('new_booking') || type.startsWith('apt_'))) section = 'pending';
    activeOwnerTab = notification.targetTab === 'dashboard' ? 'dashboard' : 'appointments';
    activeOwnerAptCategory = ['pending', 'cancel_requests', 'reschedule_requests', 'approved', 'no_show', 'cancelled'].includes(section) ? section : 'all';
    const targetAppointment = notification.appointmentId ? allApts.find(appointment => (appointment.aptId || appointment.appointmentId) === notification.appointmentId) : null;
    selectedOwnerAptDate = (targetAppointment && targetAppointment.date) || todayStr;
    window.closeModal();
    renderOwnerScreen(user, onTabChange);
    if (notification.appointmentId) {
      requestAnimationFrame(() => Array.from(document.querySelectorAll('[data-appointment-id]')).find(element => element.dataset.appointmentId === notification.appointmentId)?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
    }
  };

  window.openOwnerLegacyManagement=()=>{legacyOwnerMenu=true;activeOwnerTab='management';return renderOwnerScreen(user,onTabChange)};
  window.setAgendaMode=mode=>{agendaMode=['day','week','month'].includes(mode)?mode:'day';return renderOwnerScreen(user,onTabChange)};
  window.setAgendaDate=date=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return;agendaDate=date;return renderOwnerScreen(user,onTabChange)};
  window.selectAgendaDay=date=>{agendaMode='day';return window.setAgendaDate(date)};
  window.selectAgendaToday=()=>window.setAgendaDate(todayStr);
  window.shiftAgenda=delta=>window.setAgendaDate(agendaShift(agendaDate||todayStr,agendaMode,Number(delta)));
  window.setAgendaStaff=id=>{agendaStaff=id;return renderOwnerScreen(user,onTabChange)};
  window.setAgendaService=id=>{agendaService=id;return renderOwnerScreen(user,onTabChange)};
  window.openAgendaAppointment=id=>{
    const appointment=allApts.find(a=>(a.aptId||a.appointmentId)===id);if(!appointment)return;
    selectedOwnerAptDate=appointment.date;selectedOwnerStaffFilter=appointment.staffId;activeOwnerAptCategory='all';activeAptView='menu';activeOwnerTab='appointments';return renderOwnerScreen(user,onTabChange);
  };
  window.bookAgendaSlot=(id,time)=>{
    const service=services.find(s=>s.id===agendaService),staff=staffList.find(s=>s.id===id);if(!service||!staff||!canCreateManualBooking)return;
    manualBookingDraft={customerName:'',customerPhone:'',serviceId:service.id,serviceName:service.name,servicePrice:service.price,serviceDuration:service.durationMinutes||service.duration||30,staffId:id,staffName:staff.displayName||staff.name,date:agendaDate||todayStr,time};return window.openManualBookingModal();
  };

  window.switchOwnerTab = async (tab, subView = null, animateTouchNav = false) => {
    if (tab === 'ciro' && !canViewCiro) tab = 'dashboard';
    if (tab === 'management' && !canManageSalon) tab = 'dashboard';
    ownerManagementView = ''; ownerCustomerExpanded = '';
    legacyOwnerMenu=false;
    activeOwnerTab = tab;
    if (subView) {
      if (tab === 'appointments') {
        activeAptView = subView;
        activeOwnerAptCategory = ['pending', 'approved', 'completed', 'cancel_requests', 'reschedule_requests', 'no_show', 'cancelled'].includes(subView) ? subView : 'all';
        if (subView === 'bugun' || subView === 'menu') selectedOwnerAptDate = todayStr;
      }
      if (tab === 'ciro') ciroTimeframe = subView;
    }
    await renderOwnerScreen(user, onTabChange);
    triggerTouchNavIconBounce(tab, animateTouchNav);
  };

  window.openOwnerManagementView = async view => {
    if (!ownerSessionValid()) return;
    ownerManagementView = view === 'customers' ? view : '';
    activeOwnerTab = 'management';
    await renderOwnerScreen(user, onTabChange);
  };
  window.searchOwnerCustomers = value => {
    if (!ownerSessionValid()) return;
    ownerCustomerQuery = String(value || '');
    const target = document.getElementById('owner-customer-results');
    if (target) target.innerHTML = renderCustomerRows();
  };
  window.toggleOwnerCustomer = index => {
    if (!ownerSessionValid() || !ownerCustomers[index]) return;
    const key = ownerCustomers[index].key;
    ownerCustomerExpanded = ownerCustomerExpanded === key ? '' : key;
    const target = document.getElementById('owner-customer-results');
    if (target) target.innerHTML = renderCustomerRows();
  };
  window.openOwnerSocialSection = async () => {
    if (!ownerSessionValid()) return;
    await window.openOwnerSalonDetailsModal();
    if (ownerSessionValid()) document.getElementById('owner-social-instagram')?.scrollIntoView({block:'center'});
  };
  window.openOwnerReviews = async () => {
    if (!ownerSessionValid()) return;
    const root = document.getElementById('modal-root');
    if (!root) return;
    root.innerHTML = `<div class="modal-overlay" onclick="window.closeModal()"><section class="modal-card owner-modal-card" onclick="event.stopPropagation()"><div class="owner-modal-header"><h3>${t('uiRemaining_302')}</h3><button class="btn btn-secondary" aria-label="${t('ownerUi_099')}" onclick="window.closeModal()">${uiIcon('x')}</button></div>${hasOwnerRating ? `<div class="owner-review-rating"><strong>${ownerRating.toFixed(1)}</strong><span>★★★★★<small>${ownerRatingCount} ${t('uiRemaining_302')}</small></span></div>` : ''}<div id="owner-reviews-list" role="status">${t('ownerReviewsLoading')}</div></section></div>`;
    const target = document.getElementById('owner-reviews-list');
    let reviews = [], offset = 0, hasMore = true, busy = false, ratingFilter = 0;
    const renderReviews = () => {
      if (!ownerSessionValid() || !target.isConnected) return;
      target.innerHTML = `<p class="owner-customer-note">${t('ownerLoadedReviewsFilter')}</p><div class="owner-review-filters"></div><div class="owner-filtered-reviews"></div>`;
      const filters = target.querySelector('.owner-review-filters');
      for (const rating of [0,5,4,3,2,1]) {
        const button = document.createElement('button'); button.className = 'btn ' + (rating === ratingFilter ? 'btn-gold' : 'btn-secondary');
        button.textContent = rating ? rating + ' ★' : t('ownerReviewsAll'); button.setAttribute('aria-pressed', String(rating === ratingFilter));
        button.onclick = () => { ratingFilter = rating; renderReviews(); }; filters.append(button);
      }
      const visible = reviews.filter(review => !ratingFilter || Number(review.rating) === ratingFilter);
      target.querySelector('.owner-filtered-reviews').innerHTML = visible.map(review => `<article class="owner-review-row"><strong>${escapeOwnerText(review.customerName)}</strong><span>★ ${escapeOwnerText(review.rating)}</span><p>${escapeOwnerText(review.comment)}</p><small>${escapeOwnerText(String(review.createdAt || '').slice(0,10))}</small></article>`).join('') || `<p class="owner-customer-note">${t('uiRemaining_011')}</p>`;
      if (hasMore) { const button = document.createElement('button'); button.className = 'btn btn-secondary'; button.textContent = t('uiRemaining_012'); button.onclick = load; target.append(button); }
    };
    const load = async () => {
      if (busy || !hasMore || !ownerSessionValid() || !target.isConnected) return;
      busy = true;
      try {
        const response = await authenticatedFetch('/api/reviews/public-list', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({businessId, offset, limit:20})});
        if (!response.ok) throw new Error('reviews unavailable');
        const data = await response.json();
        if (!ownerSessionValid() || !target.isConnected) return;
        const page = Array.isArray(data.reviews) ? data.reviews : [];
        reviews.push(...page); offset += page.length; hasMore = data.hasMore === true && page.length > 0;
        renderReviews();
      } catch {
        if (ownerSessionValid() && target.isConnected) {
          const notice = document.createElement('p'); notice.textContent = t('ownerReviewsUnavailable'); target.replaceChildren(notice);
          const retry = document.createElement('button'); retry.className = 'btn btn-secondary'; retry.textContent = t('ownerUi_329'); retry.onclick = load; target.append(retry);
        }
      } finally { busy = false; }
    };
    await load();
  };

  // Dashboard rows always open today's category, independent of the last date filter.
  window.openOwnerUpcomingCategory = async category => {
    selectedOwnerAptDate = todayStr;
    selectedOwnerStaffFilter = 'all';
    await window.switchOwnerTab('appointments', category);
  };

  window.toggleBookingSystemEnabled = async (newStatus) => {
    if (isSavingBookingToggle) return;
    isSavingBookingToggle = true;

    try {
      const ok = await saveRecord(`businesses/${businessId}/bookingEnabled`, newStatus, 'PUT');
      if (!ok) throw new Error(t('ownerUi_102'));
      await syncOwnerPublicBusiness(businessId);
      bizRecord.bookingEnabled = newStatus;
      showSuccessModal(t('successTitle'), newStatus ? t('ownerUi_103') : t('ownerUi_104'));
    } catch (err) {
      console.error(err);
      showErrorModal(t('errorTitle'), err.message || t('ownerUi_105'));
    } finally {
      isSavingBookingToggle = false;
      renderOwnerScreen(user, onTabChange);
    }
  };

  // STEP-BY-STEP MANUAL BOOKING ENGINE (REQ 2, 3, 4)
  window.openManualBookingModal = () => {
    if (!canCreateManualBooking) {
      showErrorModal(t('errorTitle'), t('ownerUi_106'));
      return;
    }
    if (!manualBookingDraft.date) {
      manualBookingDraft.date = todayStr;
    }
    window.renderManualBookingModalContent();
  };

  window.renderManualBookingModalContent = async () => {
    const root = document.getElementById('modal-root');
    if (!root) return;
    const requestId = ++manualAvailabilityRequestId;

    const todayDate = getIstanbulDateKey();
    const tomorrow = new Date(todayDate+'T12:00:00Z');
    tomorrow.setUTCDate(tomorrow.getUTCDate()+1);
    const tomorrowDate = tomorrow.toISOString().slice(0,10);

    let availability = { isClosed: false, slots: [], pastSlots: [], busySlots: [], openingTime: '', closingTime: '' };
    let availabilityError = '';
    if (manualBookingDraft.serviceId && manualBookingDraft.staffId && manualBookingDraft.date) {
      root.innerHTML = `<div class="modal-overlay"><div class="modal-card animate-fade" style="text-align:center;"> ${t('ownerUi_107')}</div></div>`;
      try {
        const response = await authenticatedFetch('/api/booking/availability', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ businessId, staffId: manualBookingDraft.staffId, serviceId: manualBookingDraft.serviceId, date: manualBookingDraft.date, durationMinutes: manualBookingDraft.serviceDuration || 30, customerPhone: manualBookingDraft.customerPhone, isManual: true })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || t('ownerUi_108'));
        if (requestId !== manualAvailabilityRequestId) return;
        availability = data;
      } catch (error) {
        if (requestId !== manualAvailabilityRequestId) return;
        availabilityError = error.message || t('ownerUi_108');
      }
    }
    const availableSlots = Array.isArray(availability.slots) ? availability.slots : [];
    if(manualBookingDraft.time && !availableSlots.includes(manualBookingDraft.time))manualBookingDraft.time=null;
    const pastSlots = Array.isArray(availability.pastSlots) ? availability.pastSlots : [];
    const busySlots = Array.isArray(availability.busySlots) ? availability.busySlots : [];
    const nextAvailableTime = availability.nextAvailableTime || availableSlots[0] || '';
    const serviceSlotInterval = Number(availability.slotIntervalMinutes) || Number(manualBookingDraft.serviceDuration) || 30;
    const allHours = [...busySlots, ...availableSlots].sort();
    const slotsHtml = allHours.map(h => {
      const isBusy = busySlots.includes(h);
      const isUnavailable = isBusy;
      const isSelected = manualBookingDraft.time === h;

      let style = 'padding: 6px; font-size: 11px; font-weight: 700; border-radius: 8px; text-align: center; ';
      let icon = '';

      if (isSelected) {
        style += 'background: #eab308; color: #000; border: 1px solid #eab308; cursor: pointer;';
        icon = ' ';
      } else if (isUnavailable) {
        style += 'background: #ef4444; color: var(--theme-ink-ffffff, #fff); border: 1px solid #ef4444; opacity: 0.55; cursor: not-allowed;';
        icon = t('uiRemaining_303');
      } else {
        style += 'background: #22c55e; color: var(--theme-ink-ffffff, #fff); border: 1px solid #22c55e; cursor: pointer;';
      }

      return `
        <button onclick="${isUnavailable ? '' : `window.selectManualBookingTime('${h}')`}" class="btn" style="${style}" ${isUnavailable ? 'disabled' : ''}>
          ${h}${icon}<small style="display:block;font-size:9px;">${isBusy ? 'Dolu' : 'Müsait'}</small>
        </button>
      `;
    }).join('');

    const servicesHtml = services.map(s => `
      <div onclick="window.selectManualBookingService('${s.id}', '${s.name}', ${s.price}, ${s.duration || 30})" class="card" style="padding: 10px; margin-bottom: 6px; cursor: pointer; border-color: ${manualBookingDraft.serviceId === s.id ? 'var(--gold-primary)' : 'var(--border-color)'}; background: ${manualBookingDraft.serviceId === s.id ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.03)'}; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div style="font-size: 13px; font-weight: 800; color: var(--theme-ink-ffffff, #fff);"> ${s.name} (${s.duration || 30} ${t('ownerUi_109')})</div>
        </div>
        <div style="font-size: 13px; font-weight: 900; color: var(--gold-primary);">${s.price} TL</div>
      </div>
    `).join('');

    root.innerHTML = `
      <div class="modal-overlay" onclick="window.closeManualBookingModal()">
        <div class="modal-card owner-modal-card animate-fade" onclick="event.stopPropagation()">
          <div class="owner-modal-header">
            <h3 style="font-size: 15px; font-weight: 800; color: var(--gold-primary); margin: 0;"> ${t('ownerUi_110')}</h3>
            <button aria-label="${t('ownerUi_099')}" onclick="window.closeManualBookingModal()" class="btn btn-secondary" style="padding: 4px 10px;">${uiIcon('x')}</button>
          </div>

          <label style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">${t('ownerUi_111')}</label>
          <input type="text" id="manual-cust-name-input" value="${manualBookingDraft.customerName || ''}" oninput="window.updateManualDraftName(this.value)" class="input-field" placeholder="${t('ownerUi_112')}">
          <input type="tel" id="manual-cust-phone-input" value="${manualBookingDraft.customerPhone || ''}" oninput="window.updateManualDraftPhone(this.value)" onchange="window.refreshManualAvailability()" class="input-field" placeholder="${t('ownerUi_113')}">

          <label style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">${t('ownerUi_114')}</label>
          <div style="margin-top: 4px; margin-bottom: 12px;">
            ${services.length === 0 ? `<div style="font-size: 11px; color: var(--text-muted);">${t('ownerUi_119')}</div>` : servicesHtml}
          </div>

          <label style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">${t('ownerUi_115')}</label>
          <div style="display: flex; gap: 6px; margin-bottom: 12px; margin-top: 4px; overflow-x: auto;">
            <button ${!manualBookingDraft.serviceId ? 'disabled' : ''} onclick="window.selectManualBookingStaff('staff-any', 'Fark Etmez')" class="btn ${manualBookingDraft.staffId === 'staff-any' ? 'btn-gold' : 'btn-secondary'}" style="padding: 6px 12px; font-size: 11px;">
              ${t('ownerUi_002')}
            </button>
            ${staffList.filter(st=>st.active!==false && staffCanProvideService(st,manualBookingDraft.serviceId,{services})).map(st => `
              <button ${!manualBookingDraft.serviceId ? 'disabled' : ''} onclick="window.selectManualBookingStaff('${st.id}', '${st.displayName}')" class="btn ${manualBookingDraft.staffId === st.id ? 'btn-gold' : 'btn-secondary'}" style="padding: 6px 12px; font-size: 11px;">
                 ${st.displayName}
              </button>
            `).join('')}
          </div>

          <label style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">${t('ownerUi_116')}</label>
          <div style="display: flex; gap: 6px; margin-top: 4px; margin-bottom: 10px;">
            <button ${!manualBookingDraft.staffId ? 'disabled' : ''} onclick="window.selectManualBookingDate('${todayDate}')" class="btn ${manualBookingDraft.date === todayDate ? 'btn-gold' : 'btn-secondary'}" style="flex: 1; font-size: 11px; padding: 6px;">
              ${t('ownerUi_038')}
            </button>
            <button ${!manualBookingDraft.staffId ? 'disabled' : ''} onclick="window.selectManualBookingDate('${tomorrowDate}')" class="btn ${manualBookingDraft.date === tomorrowDate ? 'btn-gold' : 'btn-secondary'}" style="flex: 1; font-size: 11px; padding: 6px;">
              ${t('ownerUi_117')}
            </button>
            <input ${!manualBookingDraft.staffId ? 'disabled' : ''} min="${todayDate}" type="date" value="${manualBookingDraft.date}" onchange="window.selectManualBookingDate(this.value)" class="input-field" style="flex: 1; margin: 0; font-size: 11px; padding: 4px;">
          </div>

          ${availabilityError ? `
            <div style="font-size:12px;color:var(--theme-copy-ef4444, #ef4444);background:rgba(239,68,68,.15);padding:12px;border-radius:8px;margin-bottom:16px;"> ${escapeOwnerText(availabilityError)}</div>
          ` : availability.isClosed ? `
            <div style="font-size: 13px; font-weight: 800; color:var(--theme-copy-ef4444, #ef4444); background: rgba(239,68,68,0.15); padding: 12px; border-radius: 8px; text-align: center; margin-bottom: 16px;">
               ${t('ownerUi_120')}${manualBookingDraft.date}${t('ownerUi_121')}
            </div>${renderAvailabilityHints(availability)}
          ` : `
            <div style="font-size:10px;color:var(--text-muted);margin-bottom:7px;">${t('ownerUi_122')} ${availability.openingTime || '-'}–${availability.closingTime || '-'} • Hizmet/saat aralığı: ${serviceSlotInterval} ${t('ownerUi_124')}</div>
            ${nextAvailableTime ? `<div style="font-size:11px;color:var(--theme-copy-22c55e, #22c55e);font-weight:800;margin-bottom:8px;"> ${t('ownerUi_125')} ${nextAvailableTime}</div>` : `<div style="font-size:11px;color:var(--text-muted);margin-bottom:8px;">${t('ownerUi_126')}</div>`}
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-bottom: 16px;">
              ${slotsHtml || `<div style="grid-column:1/-1;font-size:12px;color:var(--text-muted);padding:12px;text-align:center;">${t('ownerUi_127')}</div>`}
            </div>
            ${renderAvailabilityHints(availability)}
            ${availableSlots.length === 0 ? `<button ${!manualBookingDraft.staffId ? 'disabled' : ''} onclick="window.selectManualBookingDate('${tomorrowDate}')" class="btn btn-gold" style="width:100%;margin-bottom:12px;"> ${t('ownerUi_128')}</button>` : ''}
          `}

          <button id="btn-submit-manual-booking" onclick="window.submitManualBooking()" class="btn btn-gold" style="width: 100%; min-height: 44px;" ${(!manualBookingDraft.serviceId || !manualBookingDraft.time) ? 'disabled' : ''}>
             ${t('ownerUi_118')}
          </button>
        </div>
      </div>
    `;
  };

  window.updateManualDraftName = (val) => { manualBookingDraft.customerName = val; };
  window.updateManualDraftPhone = (val) => { manualBookingDraft.customerPhone = val; };
  window.refreshManualAvailability = () => {
    manualBookingDraft.time = null;
    window.renderManualBookingModalContent();
  };
  window.selectManualBookingService = (svcId, svcName, svcPrice, svcDur) => {
    manualBookingDraft.serviceId = svcId;
    manualBookingDraft.serviceName = svcName;
    manualBookingDraft.servicePrice = svcPrice;
    manualBookingDraft.serviceDuration = svcDur;
    manualBookingDraft.staffId=null;manualBookingDraft.staffName=null;manualBookingDraft.time=null;
    window.renderManualBookingModalContent();
  };
  window.selectManualBookingStaff = (stfId, stfName) => {
    if(!manualBookingDraft.serviceId)return;
    manualBookingDraft.staffId = stfId;
    manualBookingDraft.staffName = stfName;
    manualBookingDraft.time = null;
    window.renderManualBookingModalContent();
  };
  window.selectManualBookingDate = (d) => {
    manualBookingDraft.date = d;
    manualBookingDraft.time = null;
    window.renderManualBookingModalContent();
  };
  window.selectManualBookingTime = (h) => {
    manualBookingDraft.time = h;
    window.renderManualBookingModalContent();
  };
  window.closeManualBookingModal = () => {
    manualAvailabilityRequestId += 1;
    manualBookingDraft = {
      customerName: '',
      customerPhone: '',
      serviceId: null,
      serviceName: null,
      servicePrice: 0,
      serviceDuration: 30,
      staffId: null,
      staffName: 'Fark Etmez',
      date: todayStr,
      time: null
    };
    window.closeModal();
  };

  window.submitManualBooking = async () => {
    if (!canCreateManualBooking) {
      showErrorModal(t('errorTitle'), t('ownerUi_106'));
      return;
    }
    const name = (manualBookingDraft.customerName || '').trim();
    const phone = (manualBookingDraft.customerPhone || '').trim();
    const phoneDigits = phone.replace(/\D/g, '').replace(/^90(?=5\d{9}$)/, '').replace(/^0(?=5\d{9}$)/, '');

    if (name.length < 2 || !/^5\d{9}$/.test(phoneDigits) || !manualBookingDraft.serviceId || !manualBookingDraft.staffId || !manualBookingDraft.date || !manualBookingDraft.time) {
      showErrorModal(t('errorTitle'), t('ownerUi_129'), () => window.renderManualBookingModalContent());
      return;
    }

    const btn = document.getElementById('btn-submit-manual-booking');
    if (btn && btn.disabled) return;
    if (btn) { btn.disabled = true; btn.textContent = t('ownerUi_130'); }
    const selectedDate = manualBookingDraft.date;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await authenticatedFetch('/api/booking/create', {
        method: 'POST', signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId, businessNameSnapshot: bizRecord.name,
          customerUid: 'usr_manual_' + Date.now(), customerName: name, customerPhone: phone,
          staffId: manualBookingDraft.staffId, staffName: manualBookingDraft.staffName,
          serviceId: manualBookingDraft.serviceId, serviceName: manualBookingDraft.serviceName,
          servicePrice: manualBookingDraft.servicePrice, serviceDuration: manualBookingDraft.serviceDuration,
          date: selectedDate, time: manualBookingDraft.time, isManual: true, source: 'manual', initialStatus: 'approved'
        })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data || !data.success) throw new Error((data && data.error) || t('ownerUi_131'));
      invalidateDbCache('appointments');
      if (data.data) {
        allApts.unshift(data.data);
        recentlyCreatedOwnerAppointments.set(data.appointmentId || data.aptId, data.data);
      }
      manualBookingDraft = {
        customerName: '',
        customerPhone: '',
        serviceId: null,
        serviceName: null,
        servicePrice: 0,
        serviceDuration: 30,
        staffId: null,
        staffName: 'Fark Etmez',
        date: todayStr,
        time: null
      };
      activeOwnerTab = 'appointments';
      activeOwnerAptCategory = 'approved';
      selectedOwnerAptDate = selectedDate;
      window.closeModal();
      showSuccessModal(t('successTitle'), t('ownerUi_132'));
      renderOwnerScreen(user, onTabChange);
    } catch (error) {
      const message = error && error.name === 'AbortError' ? t('ownerUi_133') : (error.message || t('ownerUi_131'));
      showErrorModal(t('errorTitle'), message, () => window.renderManualBookingModalContent());
    } finally {
      clearTimeout(timeoutId);
      if (btn && document.body.contains(btn)) { btn.disabled = false; btn.textContent = t('ownerUi_118'); }
    }
  };

  window.openServicesManagementModal = () => {
    const root = document.getElementById('modal-root');
    if (!root) return;
    root.innerHTML = `
      <div class="modal-overlay" onclick="window.closeModal()"><div class="modal-card animate-fade" onclick="event.stopPropagation()" style="max-height:88vh;overflow-y:auto;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;"><h3 style="color:var(--gold-primary);font-size:15px;margin:0;"> ${t('ownerUi_087')}</h3><button aria-label="${t('ownerUi_099')}" onclick="window.closeModal()" class="btn btn-secondary">${uiIcon('x')}</button></div>
        <div style="display:flex;flex-direction:column;gap:7px;margin-bottom:14px;">${services.length ? services.map(service => `
          <div class="card" style="padding:10px;display:flex;justify-content:space-between;align-items:center;gap:8px;">
            <div><div style="font-size:12px;font-weight:800;color:var(--theme-ink-ffffff, #fff);">${escapeOwnerText(service.name)}</div><div style="font-size:10px;color:var(--gold-primary);">${Number(service.price || 0)} TL • ${Number(service.duration || 30)} ${t('ownerUi_139')}</div></div>
            <button onclick="window.toggleOwnerService('${service.id}', ${service.active === false})" class="btn btn-secondary" style="font-size:10px;color: ${service.active === false ? 'var(--theme-copy-22c55e, #22c55e)' : 'var(--theme-copy-ef4444, #ef4444)'};">${service.active === false ? t('ownerUi_140') : t('ownerUi_141')}</button>
          </div>`).join('') : `<div style="font-size:11px;color:var(--text-muted);">${t('ownerUi_142')}</div>`}</div>
        <input id="owner-service-name" class="input-field" placeholder="${t('ownerUi_134')}">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;"><input id="owner-service-price" type="number" min="0" class="input-field" placeholder="${t('ownerUi_135')}"><input id="owner-service-duration" type="number" min="5" step="5" class="input-field" placeholder="${t('ownerUi_136')}"></div>
        <button onclick="window.addOwnerService()" class="btn btn-gold" style="width:100%;">${t('ownerUi_137')}</button>
      </div></div>`;
  };

  window.addOwnerService = async () => {
    const name = document.getElementById('owner-service-name').value.trim();
    const price = Number(document.getElementById('owner-service-price').value);
    const duration = Number(document.getElementById('owner-service-duration').value);
    if (name.length < 2 || price < 0 || duration < 5) return showErrorModal(t('errorTitle'), t('ownerUi_143'));
    const saved = await saveService(businessId, { name, price, duration, active: true });
    if (!saved) return showErrorModal(t('errorTitle'), t('ownerUi_144'));
    await syncOwnerPublicBusiness(businessId);
    services.push(saved); window.openServicesManagementModal();
  };

  window.toggleOwnerService = async (serviceId, active) => {
    const ok = await saveRecord(`businesses/${businessId}/services/${serviceId}/active`, active, 'PUT');
    if (!ok) return showErrorModal(t('errorTitle'), t('ownerUi_145'));
    await syncOwnerPublicBusiness(businessId);
    const item = services.find(service => service.id === serviceId); if (item) item.active = active;
    window.openServicesManagementModal();
  };

  window.openStaffManagementModal = () => {
    const root = document.getElementById('modal-root'); if (!root) return;
    root.innerHTML = `<div class="modal-overlay" onclick="window.closeModal()"><div class="modal-card animate-fade" onclick="event.stopPropagation()" style="max-height:88vh;overflow-y:auto;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;"><h3 style="color:var(--gold-primary);font-size:15px;margin:0;"> ${t('ownerUi_146')}</h3><button aria-label="${t('ownerUi_099')}" onclick="window.closeModal()" class="btn btn-secondary">${uiIcon('x')}</button></div>
      <h4 style="font-size:12px;color:var(--gold-primary);margin:0 0 7px;"> ${t('ownerUi_147')}${pendingStaffInvites.length})</h4>
      <div style="display:flex;flex-direction:column;gap:7px;margin-bottom:14px;">${pendingStaffInvites.length ? pendingStaffInvites.map(invite => `<div class="card" style="padding:10px;"><div style="font-size:12px;font-weight:800;color:var(--theme-ink-ffffff, #fff);">${escapeOwnerText(invite.displayName || t('staffUi_18'))}</div><div style="font-size:10px;color:var(--text-muted);">${escapeOwnerText(invite.phone || t('ownerUi_075'))} • ${escapeOwnerText(invite.role || 'barber')} ${t('ownerUi_155')}</div><button onclick="window.cancelOwnerStaffInvite('${escapeOwnerText(invite.inviteId)}')" class="btn btn-secondary" style="width:100%;margin-top:7px;color:var(--theme-copy-ef4444, #ef4444);border-color:#ef4444;font-size:10px;">${t('ownerUi_156')}</button></div>`).join('') : `<div style="font-size:11px;color:var(--text-muted);padding:4px 0 10px;">${t('ownerUi_158')}</div>`}</div>
      <h4 style="font-size:12px;color:var(--gold-primary);margin:0 0 7px;"> ${t('ownerUi_148')}${staffList.filter(staff => staff.active !== false).length})</h4>
      <div style="display:flex;flex-direction:column;gap:7px;margin-bottom:14px;">${staffList.length ? staffList.map(staff => `<div class="card" style="padding:10px;"><div style="display:flex;justify-content:space-between;align-items:center;"><div><div style="font-size:12px;font-weight:800;color:var(--theme-ink-ffffff, #fff);">${escapeOwnerText(staff.displayName || staff.name)}</div><div style="font-size:10px;color:var(--gold-primary);">${escapeOwnerText(staff.phone || '')} • ${escapeOwnerText(staff.role || 'barber')} • ${staff.active === false ? t('ownerUi_162') : t('ownerUi_163')} • Prim %${Number(staff.commissionPercent || 0)}</div></div><button onclick="window.toggleOwnerStaff('${staff.id}', ${staff.active === false})" class="btn btn-secondary" style="font-size:10px;">${staff.active === false ? t('ownerUi_140') : t('ownerUi_141')}</button></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:8px;"><button onclick="window.openStaffPermissionsModal('${staff.id}')" class="btn btn-outline-gold" style="font-size:10px;"> ${t('ownerUi_160')}</button><button onclick="window.openStaffCommissionModal('${staff.id}')" class="btn btn-outline-gold" style="font-size:10px;"> ${t('ownerUi_161')}</button></div></div>`).join('') : `<div style="font-size:11px;color:var(--text-muted);">${t('ownerUi_164')}</div>`}</div>
      <input id="owner-staff-name" class="input-field" placeholder="${t('ownerUi_149')}"><input id="owner-staff-phone" type="tel" class="input-field" placeholder="05XXXXXXXXX"><select id="owner-staff-role" onchange="window.refreshOwnerInvitePermissions(this.value)" class="input-field"><option value="barber">${t('ownerUi_150')}</option><option value="receptionist">${t('ownerUi_151')}</option><option value="manager">${t('ownerUi_152')}</option></select><h4 style="font-size:12px;color:var(--gold-primary);">${t('ownerUi_153')}</h4><div id="owner-invite-permissions">${permissionCheckboxes('barber', staffPermissionPreset('barber'), 'invite-perm')}</div>
      <button onclick="window.createOwnerStaffInvite(this)" class="btn btn-gold" style="width:100%;"> ${t('ownerUi_154')}</button>
    </div></div>`;
  };

  window.createOwnerStaffInvite = async (button) => {
    const displayName = document.getElementById('owner-staff-name').value.trim();
    const phone = document.getElementById('owner-staff-phone').value.trim();
    const role = document.getElementById('owner-staff-role').value;
    const permissions = collectPermissionCheckboxes('invite-perm');
    let normalizedPhone;
    try { normalizedPhone = normalizeTurkishInvitePhone(phone); }
    catch (error) { return showErrorModal(t('staffUi_77'), error.message, null, t('ownerUi_166')); }
    if (displayName.length < 2) return showErrorModal(t('staffUi_77'), t('ownerUi_167'), null, t('ownerUi_166'));
    if (button) button.disabled = true;
    try {
      const response = await authenticatedFetch('/api/staff/create-invite', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerUid: user.uid, displayName, phone: normalizedPhone, role, services: ['all'], permissions })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.token) throw new Error(data.error || t('ownerUi_168'));
      const share = buildStaffInviteShareLinks(data.phone || normalizedPhone, data.token);
      const root = document.getElementById('modal-root');
      if (!root) return;
      root.innerHTML = `<div class="modal-overlay" onclick="window.closeModal()"><div class="modal-card animate-fade" onclick="event.stopPropagation()" style="max-height:88vh;overflow-y:auto;padding-bottom:max(18px,env(safe-area-inset-bottom));"><h3 style="color:var(--gold-primary);font-size:15px;"> ${t('ownerUi_169')}</h3>${data.alreadyPending ? `<p style="font-size:12px;color:var(--theme-copy-f59e0b, #f59e0b);font-weight:800;">${t('ownerUi_177')}</p>` : ''}<p style="font-size:11px;color:var(--text-muted);">${t('ownerUi_170')} ${escapeOwnerText(displayName)} ve ${escapeOwnerText(share.phone)} ${t('ownerUi_172')}</p><div style="padding:12px;border:1px solid var(--gold-primary);border-radius:10px;color:var(--theme-ink-ffffff, #fff);font-family:monospace;font-size:12px;word-break:break-all;margin:12px 0;">${escapeOwnerText(data.token)}</div><div style="display:flex;flex-direction:column;gap:7px;"><button onclick="window.copyStaffInviteCode('${escapeOwnerText(data.token)}', this)" class="btn btn-gold" style="width:100%;">${t('ownerUi_173')}</button><a href="${escapeOwnerText(share.whatsappUrl)}" target="_blank" rel="noopener" class="btn btn-outline-gold" style="width:100%;text-align:center;text-decoration:none;"> ${t('ownerUi_174')}</a><a href="${escapeOwnerText(share.smsUrl)}" class="btn btn-secondary" style="width:100%;text-align:center;text-decoration:none;"> ${t('ownerUi_175')}</a><button onclick="window.closeModal()" class="btn btn-secondary" style="width:100%;">${t('ownerUi_176')}</button></div></div></div>`;
    } catch (error) {
      showErrorModal(t('staffUi_77'), error.message || t('ownerUi_168'), null, t('ownerUi_166'));
    } finally {
      if (button) button.disabled = false;
    }
  };

  window.refreshOwnerInvitePermissions = role => { const target = document.getElementById('owner-invite-permissions'); if (target) target.innerHTML = permissionCheckboxes(role, staffPermissionPreset(role), 'invite-perm'); };

  window.cancelOwnerStaffInvite = inviteId => showConfirmModal(t('ownerUi_156'), t('ownerUi_178'), async () => {
    const response = await authenticatedFetch('/api/staff/cancel-invite', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ inviteId }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.deleted !== true) return showErrorModal(t('staffUi_77'), data.error || t('ownerUi_179'), null, t('ownerUi_166'));
    const refreshed = await authenticatedFetch('/api/staff/list-invites', { method:'POST', headers:{'Content-Type':'application/json'}, body:'{}' });
    const refreshedData = await refreshed.json().catch(() => ({}));
    if (!refreshed.ok) return showErrorModal(t('staffUi_77'), refreshedData.error || t('ownerUi_180'), null, t('ownerUi_166'));
    pendingStaffInvites = Array.isArray(refreshedData.invitations) ? refreshedData.invitations : []; window.openStaffManagementModal();
  });

  window.openStaffPermissionsModal = staffId => {
    const staff = staffList.find(item => item.id === staffId); const root = document.getElementById('modal-root'); if (!staff || !root) return;
    root.innerHTML = `<div class="modal-overlay" onclick="window.closeModal()"><div class="modal-card owner-modal-card animate-fade" onclick="event.stopPropagation()"><div class="owner-modal-header"><h3 style="color:var(--gold-primary);font-size:15px;margin:0;">${escapeOwnerText(staff.displayName || staff.name)} ${t('ownerUi_181')}</h3><button aria-label="${t('ownerUi_099')}" onclick="window.closeModal()" class="btn btn-secondary">${uiIcon('x')}</button></div><p style="font-size:10px;color:var(--text-muted);">${t('ownerUi_182')}</p><select id="edit-staff-role" onchange="window.refreshEditStaffPermissions(this.value)" class="input-field"><option value="barber" ${staff.role==='barber'?'selected':''}>${t('ownerUi_150')}</option><option value="receptionist" ${staff.role==='receptionist'?'selected':''}>${t('ownerUi_151')}</option><option value="manager" ${staff.role==='manager'?'selected':''}>${t('ownerUi_152')}</option></select><h4 style="font-size:11px;color:var(--gold-primary);">${t('ownerUi_183')}</h4><div id="edit-staff-permissions">${permissionCheckboxes(staff.role || 'barber', staff.permissions || {}, 'edit-perm')}</div><button onclick="window.saveStaffPermissions('${staff.id}')" class="btn btn-gold" style="width:100%;">${t('ownerUi_184')}</button><button onclick="window.openStaffManagementModal()" class="btn btn-secondary" style="width:100%;margin-top:7px;">${t('ownerUi_185')}</button></div></div>`;
  };
  window.refreshEditStaffPermissions = role => { const target=document.getElementById('edit-staff-permissions'); if(target) target.innerHTML=permissionCheckboxes(role,staffPermissionPreset(role),'edit-perm'); };
  window.saveStaffPermissions = async staffId => {
    const role=document.getElementById('edit-staff-role').value; const permissions=collectPermissionCheckboxes('edit-perm');
    const response=await authenticatedFetch('/api/staff/update',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({staffId,role,permissions})}); const data=await response.json().catch(()=>({}));
    if(!response.ok)return showErrorModal(t('staffUi_77'),data.error||t('ownerUi_186')); const index=staffList.findIndex(item=>item.id===staffId); if(index>=0)staffList[index]=data.staff; window.openStaffManagementModal();
  };

  window.copyStaffInviteCode = async (token, button) => {
    try { await navigator.clipboard.writeText(token); if (button) button.textContent = t('ownerUi_187'); }
    catch { showErrorModal(t('errorTitle'), t('ownerUi_188')); }
  };

  window.toggleOwnerStaff = async (staffId, active) => {
    const response = await authenticatedFetch('/api/staff/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ staffId, active }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return showErrorModal(t('errorTitle'), data.error || t('ownerUi_189'));
    const itemIndex = staffList.findIndex(staff => staff.id === staffId); if (itemIndex >= 0) staffList[itemIndex] = data.staff;
    window.openStaffManagementModal();
  };

  window.openStaffCommissionModal = (staffId) => {
    const staff = staffList.find(member => member.id === staffId);
    const root = document.getElementById('modal-root');
    if (!staff || !root) return;
    root.innerHTML = `<div class="modal-overlay" onclick="window.closeModal()"><div class="modal-card animate-fade" onclick="event.stopPropagation()"><h3 style="font-size:15px;color:var(--gold-primary);"> ${escapeOwnerText(staff.displayName || staff.name)} ${t('ownerUi_190')}</h3><p style="font-size:11px;color:var(--text-muted);">${t('ownerUi_191')}</p><input id="staff-commission-percent" type="number" min="0" max="100" step="0.5" value="${Number(staff.commissionPercent || 0)}" class="input-field" placeholder="${t('ownerUi_192')}"><button onclick="window.saveStaffCommission('${staff.id}')" class="btn btn-gold" style="width:100%;"> ${t('ownerUi_193')}</button><button onclick="window.openStaffManagementModal()" class="btn btn-secondary" style="width:100%;margin-top:7px;">${t('ownerUi_185')}</button></div></div>`;
  };

  window.saveStaffCommission = async (staffId) => {
    const input = document.getElementById('staff-commission-percent');
    const percent = Number(input && input.value);
    if (!Number.isFinite(percent) || percent < 0 || percent > 100) return showErrorModal(t('errorTitle'), t('ownerUi_194'));
    const rounded = Math.round(percent * 10) / 10;
    const response = await authenticatedFetch('/api/staff/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ staffId, commissionPercent: rounded }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return showErrorModal(t('errorTitle'), data.error || t('ownerUi_195'));
    const itemIndex = staffList.findIndex(member => member.id === staffId); if (itemIndex >= 0) staffList[itemIndex] = data.staff;
    window.openStaffManagementModal();
  };

  window.openWeeklyScheduleModal = () => {
    const root = document.getElementById('modal-root'); if (!root) return;
    const days = [['monday',t('staffUi_9')],['tuesday',t('staffUi_10')],['wednesday',t('staffUi_11')],['thursday',t('staffUi_12')],['friday',t('staffUi_13')],['saturday',t('staffUi_14')],['sunday',t('staffUi_15')]];
    const schedule = bizRecord.weeklySchedule || {};
    root.innerHTML = `<div class="modal-overlay" onclick="window.closeModal()"><div class="modal-card animate-fade" onclick="event.stopPropagation()" style="max-height:88vh;overflow-y:auto;"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;"><h3 style="color:var(--gold-primary);font-size:15px;margin:0;"> ${t('ownerUi_088')}</h3><button aria-label="${t('ownerUi_099')}" onclick="window.closeModal()" class="btn btn-secondary">${uiIcon('x')}</button></div>${days.map(([key,label]) => { const day=schedule[key] || {isOpen:key!=='sunday',start:'09:00',end:'19:00'}; return `<div class="card" style="padding:9px;margin-bottom:7px;"><label style="display:flex;justify-content:space-between;color:var(--theme-ink-ffffff, #fff);font-size:12px;font-weight:800;"><span>${label}</span><input id="schedule-${key}-open" type="checkbox" ${day.isOpen !== false ? 'checked' : ''}></label><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:7px;"><input id="schedule-${key}-start" type="time" value="${day.start || '09:00'}" class="input-field" style="margin:0;"><input id="schedule-${key}-end" type="time" value="${day.end || '19:00'}" class="input-field" style="margin:0;"></div></div>`; }).join('')}<button onclick="window.saveOwnerWeeklySchedule()" class="btn btn-gold" style="width:100%;"> ${t('ownerUi_203')}</button></div></div>`;
  };

  window.saveOwnerWeeklySchedule = async () => {
    const days = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday']; const schedule = {};
    for (const key of days) { const isOpen=document.getElementById(`schedule-${key}-open`).checked; const start=document.getElementById(`schedule-${key}-start`).value; const end=document.getElementById(`schedule-${key}-end`).value; if (isOpen && (!start || !end || start >= end)) return showErrorModal(t('errorTitle'), t('ownerUi_204')); schedule[key]={isOpen,start,end}; }
    const ok = await saveRecord(`businesses/${businessId}/weeklySchedule`, schedule, 'PUT'); if (!ok) return showErrorModal(t('errorTitle'), t('ownerUi_205'));
    await syncOwnerPublicBusiness(businessId);
    bizRecord.weeklySchedule=schedule; window.closeModal(); showSuccessModal(t('successTitle'), t('ownerUi_206'));
  };

  window.openSalonContactModal = () => {
    const root=document.getElementById('modal-root'); if(!root)return;
    root.innerHTML=`<div class="modal-overlay" onclick="window.closeModal()"><div class="modal-card animate-fade" onclick="event.stopPropagation()"><div style="display:flex;justify-content:space-between;align-items:center;"><h3 style="color:var(--gold-primary);font-size:15px;"> ${t('ownerUi_207')}</h3><button aria-label="${t('ownerUi_099')}" onclick="window.closeModal()" class="btn btn-secondary">${uiIcon('x')}</button></div><input id="owner-contact-phone" class="input-field" value="${escapeOwnerText(bizRecord.phone || '')}" placeholder="${t('ownerUi_208')}"><input id="owner-contact-whatsapp" class="input-field" value="${escapeOwnerText(bizRecord.whatsappPhone || '')}" placeholder="${t('ownerUi_209')}"><input id="owner-contact-address" class="input-field" value="${escapeOwnerText(bizRecord.address || '')}" placeholder="${t('ownerUi_210')}"><button onclick="window.saveOwnerSalonContact()" class="btn btn-gold" style="width:100%;"> ${t('ownerUi_184')}</button></div></div>`;
  };

  window.saveOwnerSalonContact = async () => {
    const phone=document.getElementById('owner-contact-phone').value.trim(); const whatsappPhone=document.getElementById('owner-contact-whatsapp').value.trim(); const address=document.getElementById('owner-contact-address').value.trim();
    if (!phone || address.length < 5) return showErrorModal(t('errorTitle'), t('ownerUi_211'));
    const currentSocials = bizRecord.socials || {};
    const socials = { ...currentSocials, whatsapp: { value: whatsappPhone, active: Boolean(whatsappPhone) } };
    const response = await authenticatedFetch('/api/salon/update-profile', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ phone, address, socials }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return showErrorModal(t('errorTitle'), data.error || t('ownerUi_212'));
    invalidateDbCache('businesses'); invalidateDbCache('public_businesses'); Object.assign(bizRecord, data.business || {phone,address,socials}); window.closeModal(); showSuccessModal(t('successTitle'),t('ownerUi_213'));
  };

  // SALON IMAGE CROP EDITOR MODAL (REQUIREMENT 8 & 9)
  window.openSalonImageCropModal = (type) => {
    const inputId = type === 'profile' ? 'media-profile-input' : (type === 'cover' ? 'media-cover-input' : 'media-gallery-input');
    const input = document.getElementById(inputId);
    if (input) input.click();
  };

  window.handleImageCropSelected = (event, type) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      showErrorModal(t('errorTitle'), t('ownerUi_214'), () => window.openOwnerSalonDetailsModal());
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        imageEditorState = {
          file,
          imgObj: img,
          type,
          scale: 1.0,
          offsetX: 0,
          offsetY: 0
        };
        window.renderImageCropEditorModal();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  window.renderImageCropEditorModal = () => {
    const root = document.getElementById('modal-root');
    if (!root || !imageEditorState.imgObj) return;

    root.innerHTML = `
      <div class="modal-overlay" onclick="window.closeModal()">
        <div class="modal-card animate-fade" onclick="event.stopPropagation()" style="max-width: 440px; text-align: center;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <h3 style="font-size: 15px; font-weight: 800; color: var(--gold-primary); margin: 0;">${t('imageEditorTitle', currentLang)}</h3>
            <button aria-label="${t('ownerUi_099')}" onclick="window.closeModal()" class="btn btn-secondary" style="padding: 4px 10px;">${uiIcon('x')}</button>
          </div>

          <!-- EDITOR CANVAS PREVIEW -->
          <div style="position: relative; width: 100%; height: 200px; background: var(--theme-panel-111111, #111); overflow: hidden; border-radius: 8px; border: 2px dashed var(--gold-primary); margin-bottom: 12px;">
            <canvas id="crop-canvas" width="400" height="200" style="width: 100%; height: 100%; object-fit: contain; cursor: move;"></canvas>
          </div>

          <!-- CONTROLS -->
          <div style="display: flex; gap: 8px; justify-content: center; align-items: center; margin-bottom: 14px;">
            <button onclick="window.adjustCropScale(-0.1)" class="btn btn-secondary" style="font-size: 12px; padding: 6px 14px;"> -</button>
            <span style="font-size: 11px; color: var(--gold-primary); font-weight: 800;">${t('ownerUi_215')}</span>
            <button onclick="window.adjustCropScale(0.1)" class="btn btn-secondary" style="font-size: 12px; padding: 6px 14px;"> +</button>
            <button onclick="window.resetCropEditor()" class="btn btn-secondary" style="font-size: 11px; padding: 6px 10px;"> ${t('ownerUi_216')}</button>
          </div>
          <div class="owner-crop-position" aria-label="${t('ownerUi_217')}"><button class="btn btn-secondary" onclick="window.adjustCropPosition(0,-18)">${t('ownerUi_218')}</button><button class="btn btn-secondary" onclick="window.adjustCropPosition(-18,0)">${t('ownerUi_219')}</button><button class="btn btn-secondary" onclick="window.adjustCropPosition(18,0)">${t('ownerUi_220')}</button><button class="btn btn-secondary" onclick="window.adjustCropPosition(0,18)">${t('ownerUi_221')}</button></div>

          <!-- PREVIEW CAROUSEL -->
          <div style="font-size: 10px; color: var(--text-muted); margin-bottom: 8px;">${t('previewKesfet', currentLang)}</div>

          <div style="display: flex; gap: 8px;">
            <button onclick="window.closeModal()" class="btn btn-secondary" style="flex: 1;">${t('ownerUi_054')}</button>
            <button onclick="window.saveCroppedImage()" class="btn btn-gold" style="flex: 2;"> ${t('ownerUi_222')}</button>
          </div>
        </div>
      </div>
    `;

    setTimeout(window.drawCropCanvas, 50);
  };

  window.drawCropCanvas = () => {
    const canvas = document.getElementById('crop-canvas');
    if (!canvas || !imageEditorState.imgObj) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const img = imageEditorState.imgObj;
    const w = img.width * imageEditorState.scale;
    const h = img.height * imageEditorState.scale;
    const x = (canvas.width - w) / 2 + imageEditorState.offsetX;
    const y = (canvas.height - h) / 2 + imageEditorState.offsetY;

    ctx.drawImage(img, x, y, w, h);
  };

  window.adjustCropScale = (delta) => {
    imageEditorState.scale = Math.max(0.3, Math.min(3.0, imageEditorState.scale + delta));
    window.drawCropCanvas();
  };

  window.adjustCropPosition = (deltaX, deltaY) => {
    imageEditorState.offsetX += Number(deltaX) || 0;
    imageEditorState.offsetY += Number(deltaY) || 0;
    window.drawCropCanvas();
  };

  window.resetCropEditor = () => {
    imageEditorState.scale = 1.0;
    imageEditorState.offsetX = 0;
    imageEditorState.offsetY = 0;
    window.drawCropCanvas();
  };

  window.saveCroppedImage = async () => {
    const canvas = document.getElementById('crop-canvas');
    if (!canvas) return;

    const base64Url = canvas.toDataURL('image/jpeg', 0.82);
    if (!bizRecord.media) bizRecord.media = { gallery: [] };

    const type = imageEditorState.type;
    let saved = false;
    if (type === 'profile') {
      bizRecord.media.profileImageUrl = base64Url;
      bizRecord.profileImageUrl = base64Url;
    } else if (type === 'cover') {
      bizRecord.media.coverImageUrl = base64Url;
      bizRecord.coverImageUrl = base64Url;
    } else if (type === 'gallery') {
      if (!bizRecord.media.gallery) bizRecord.media.gallery = [];
      bizRecord.media.gallery.push(base64Url);
    }
    const response = await authenticatedFetch('/api/salon/update-profile', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ media:bizRecord.media }) });
    saved = response.ok;
    if (!saved) return showErrorModal(t('errorTitle'), t('ownerUi_223'), () => window.openOwnerSalonDetailsModal());
    await syncOwnerPublicBusiness(businessId);
    window.closeModal();
    showSuccessModal(t('successTitle'), t('ownerUi_224'));
  };

  // PRIVACY / ACCOUNT MENU
  window.openPrivacyAccountModal = () => {
    const root = document.getElementById('modal-root');
    if (!root) return;
    root.innerHTML = `
      <div class="modal-overlay" onclick="window.closeModal()">
        <div class="modal-card owner-modal-card animate-fade" onclick="event.stopPropagation()">
          <div class="owner-modal-header">
            <h3 style="font-size: 15px; font-weight: 800; color: var(--gold-primary); margin: 0;"> ${t('ownerUi_225')}</h3>
            <button aria-label="${t('ownerUi_099')}" onclick="window.closeModal()" class="btn btn-secondary" style="padding: 4px 10px;">${uiIcon('x')}</button>
          </div>
          <button onclick="window.openPersonalDetailsModal()" class="btn btn-secondary" style="width:100%;margin-bottom:10px;text-align:left;padding:14px;"> ${t('ownerUi_226')} <span style="float:right;color:var(--gold-primary);">${t('ownerUi_089')}</span></button>
          ${canManageSalon ? `<button onclick="window.openOwnerSalonDetailsModal()" class="btn btn-secondary" style="width:100%;margin-bottom:14px;text-align:left;padding:14px;"> ${t('ownerUi_227')} <span style="float:right;color:var(--gold-primary);">${t('ownerUi_089')}</span></button>` : ''}
          <button onclick="window.closeModal()" class="btn btn-gold" style="width: 100%;">${t('ownerUi_166')}</button>
        </div>
      </div>
    `;
  };

  // PACKAGE UPGRADE COMPARISON MODAL (REQ 13)
  window.openPackageUpgradeModal = () => {
    const root = document.getElementById('modal-root');
    if (!root) return;

    root.innerHTML = `
      <div class="modal-overlay" onclick="window.closeModal()">
        <div class="modal-card animate-fade" onclick="event.stopPropagation()" style="max-height: 90vh; overflow-y: auto;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
            <h3 style="font-size: 15px; font-weight: 800; color: var(--gold-primary); margin: 0;"> ${t('ownerUi_228')}</h3>
            <button aria-label="${t('ownerUi_099')}" onclick="window.closeModal()" class="btn btn-secondary" style="padding: 4px 10px;">${uiIcon('x')}</button>
          </div>

          <div style="font-size: 11px; color:var(--theme-copy-eab308, #eab308); background: rgba(234,179,8,0.1); padding: 8px; border-radius: 6px; margin-bottom: 12px;">
            ${t('sandboxPaymentNotice', currentLang)}
          </div>

          <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 14px;">
            <div class="card" style="padding: 12px; border-color: var(--border-color);">
              <div style="font-size: 14px; font-weight: 800; color: var(--theme-ink-ffffff, #fff);">${t('ownerUi_229')}</div>
              <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">${t('ownerUi_230')}</div>
            </div>

            <div class="card card-gold" style="padding: 12px;">
              <div style="font-size: 14px; font-weight: 800; color: var(--gold-primary);">${t('ownerUi_231')}</div>
              <div style="font-size: 11px; color: var(--theme-ink-ffffff, #fff); margin-top: 4px;">${t('ownerUi_232')}</div>
              <button type="button" onclick="event.stopPropagation();window.requestOwnerPackageUpgrade('PRO')" class="btn btn-gold" style="width:100%;margin-top:10px;">${t('ownerUi_233')}</button>
            </div>

            <div class="card" style="padding: 12px; border-color: #22c55e;">
              <div style="font-size: 14px; font-weight: 800; color:var(--theme-copy-22c55e, #22c55e);">${t('ownerUi_234')}</div>
              <div style="font-size: 11px; color: var(--theme-ink-ffffff, #fff); margin-top: 4px;">${t('ownerUi_235')}</div>
              <button type="button" onclick="event.stopPropagation();window.requestOwnerPackageUpgrade('PREMIUM')" class="btn btn-gold" style="width:100%;margin-top:10px;">${t('ownerUi_236')}</button>
            </div>
          </div>

          <button onclick="window.closeModal()" class="btn btn-gold" style="width: 100%;">${t('ownerUi_099')}</button>
        </div>
      </div>
    `;
  };

  // MASTER TOGGLE NOTIFICATION SETTINGS MODAL (REQ 5 & 7)
  window.openNotificationSettingsModal = async () => {
    const root = document.getElementById('modal-root');
    if (!root) return;

    const prefs = await fetchRecord(`users/${user.uid}/notificationPreferences`) || {
      inApp: true,
      sound: true,
      newBooking: true,
      statusUpdate: true,
      cancelRequest: true,
      rescheduleRequest: true,
      upcomingReminder: true,
      noShow: true,
      completed: true,
      staffInvite: true,
      staffRoleUpdate: true,
      packagePremium: true,
      billing: true,
      campaigns: false
    };

    root.innerHTML = `
      <div class="modal-overlay" onclick="window.closeModal()">
        <div class="modal-card owner-modal-card animate-fade" onclick="event.stopPropagation()">
          <div class="owner-modal-header">
            <h3 style="font-size: 15px; font-weight: 800; color: var(--gold-primary); margin: 0;"> ${t('ownerUi_237')}</h3>
            <button aria-label="${t('ownerUi_099')}" onclick="window.closeModal()" class="btn btn-secondary" style="padding: 4px 10px;">${uiIcon('x')}</button>
          </div>

          <!-- MASTER TOGGLE (REQS 5 & 7) -->
          <label style="display: flex; justify-content: space-between; align-items: center; font-size: 13px; font-weight: 800; color: var(--theme-ink-ffffff, #fff); background: rgba(245,158,11,0.2); padding: 10px; border-radius: 8px; border: 1px solid var(--gold-primary); margin-bottom: 12px;">
            <div>
              <div>${t('masterNotifLabel', currentLang)}</div>
              <div style="font-size: 10px; color: var(--text-muted); font-weight: 400;">${t('masterNotifSub', currentLang)}</div>
            </div>
            <input type="checkbox" id="pref-inapp" onchange="window.toggleMasterNotificationOwner(this.checked)" ${prefs.inApp !== false ? 'checked' : ''}>
          </label>

          <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px;">
            <label style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: var(--theme-ink-ffffff, #fff);">
              <span> ${t('soundNotifs')}</span>
              <input class="sub-notif-pref" type="checkbox" id="pref-sound" ${prefs.sound !== false ? 'checked' : ''} ${prefs.inApp === false ? 'disabled' : ''}>
            </label>
            <label style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: var(--theme-ink-ffffff, #fff);">
              <span> ${t('newBookingNotifs')}</span>
              <input class="sub-notif-pref" type="checkbox" id="pref-newbook" ${prefs.newBooking !== false ? 'checked' : ''} ${prefs.inApp === false ? 'disabled' : ''}>
            </label>
            <label style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: var(--theme-ink-ffffff, #fff);">
              <span> ${t('cancelReqNotifs')}</span>
              <input class="sub-notif-pref" type="checkbox" id="pref-cancelreq" ${prefs.cancelRequest !== false ? 'checked' : ''} ${prefs.inApp === false ? 'disabled' : ''}>
            </label>
            <label style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: var(--theme-ink-ffffff, #fff);">
              <span> ${t('reschedReqNotifs')}</span>
              <input class="sub-notif-pref" type="checkbox" id="pref-reschedreq" ${prefs.rescheduleRequest !== false ? 'checked' : ''} ${prefs.inApp === false ? 'disabled' : ''}>
            </label>
            <label style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: var(--theme-ink-ffffff, #fff);">
              <span> ${t('upcomingReminderNotifs')}</span>
              <input class="sub-notif-pref" type="checkbox" id="pref-reminder" ${prefs.upcomingReminder !== false ? 'checked' : ''} ${prefs.inApp === false ? 'disabled' : ''}>
            </label>
            <label style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: var(--theme-ink-ffffff, #fff);">
              <span> ${t('ownerUi_243')}</span>
              <input class="sub-notif-pref" type="checkbox" id="pref-noshow" ${prefs.noShow !== false ? 'checked' : ''} ${prefs.inApp === false ? 'disabled' : ''}>
            </label>
            <label style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: var(--theme-ink-ffffff, #fff);">
              <span> ${t('completedNotifs')}</span>
              <input class="sub-notif-pref" type="checkbox" id="pref-completed" ${prefs.completed !== false ? 'checked' : ''} ${prefs.inApp === false ? 'disabled' : ''}>
            </label>
          </div>

          <button onclick="window.enableAllOwnerNotifications()" class="btn btn-secondary" style="width:100%;margin-bottom:8px;">${t('ownerUi_245')}</button>
          <button type="button" onclick="window.toggleOwnerPush()" class="btn btn-secondary" style="width:100%;margin-bottom:8px;">${t('ownerUi_246')}</button>
          <div id="owner-push-state" style="font-size:10px;color:var(--text-muted);margin-bottom:8px;"></div>
          <button onclick="window.saveOwnerNotificationPrefs()" class="btn btn-gold" style="width: 100%; min-height: 42px;">
             ${t('ownerUi_184')}
          </button>
        </div>
      </div>
    `;
  };

  window.toggleOwnerPush = async () => {
    const state = await getPushPermissionState();
    const next = state === 'granted' ? await disablePushNotifications() : await enablePushNotifications();
    const label = document.getElementById('owner-push-state');
    if (label) label.textContent = next.state === 'granted' ? t('ownerUi_247') : next.state === 'unsupported' ? t('ownerUi_248') : next.state === 'denied' ? t('ownerUi_249') : t('ownerUi_250');
    const prefs = await fetchRecord(`users/${user.uid}/notificationPreferences`) || {};
    await saveRecord(`users/${user.uid}/notificationPreferences`, { ...prefs, push:next.state === 'granted', updatedAt:new Date().toISOString() });
  };

  window.saveOwnerNotificationPrefs = async () => {
    const existingPrefs = await fetchRecord(`users/${user.uid}/notificationPreferences`) || {};
    const prefs = {
      ...existingPrefs,
      inApp: document.getElementById('pref-inapp').checked,
      sound: document.getElementById('pref-sound').checked,
      newBooking: document.getElementById('pref-newbook').checked,
      cancelRequest: document.getElementById('pref-cancelreq').checked,
      rescheduleRequest: document.getElementById('pref-reschedreq').checked,
      upcomingReminder: document.getElementById('pref-reminder').checked,
      noShow: document.getElementById('pref-noshow').checked,
      completed: document.getElementById('pref-completed').checked,
      updatedAt: new Date().toISOString()
    };
    const ok = await saveRecord(`users/${user.uid}/notificationPreferences`, prefs, 'PUT');
    if (!ok) return showErrorModal(t('errorTitle'), t('ownerUi_251'));
    window.closeModal();
    showSuccessModal(t('successTitle'), t('ownerUi_252'));
  };

  // OTHER HELPER MODALS
  window.openPersonalDetailsModal = () => {
    const root = document.getElementById('modal-root');
    if (!root) return;
    root.innerHTML = `
      <div class="modal-overlay" onclick="window.closeModal()">
        <div class="modal-card animate-fade" onclick="event.stopPropagation()">
          <div style="display:flex;justify-content:space-between;align-items:center;"><h3 style="font-size: 15px; font-weight: 800; color: var(--gold-primary); margin-bottom: 12px;"> ${t('ownerUi_226')}</h3><button aria-label="${t('ownerUi_099')}" onclick="window.closeModal()" class="btn btn-secondary">${uiIcon('x')}</button></div>
          <input type="text" id="edit-owner-displayname-input" value="${escapeOwnerText(displayName)}" class="input-field" placeholder="${t('ownerUi_253')}">
          <input type="tel" id="edit-owner-phone-input" value="${escapeOwnerText(user.phone || '')}" class="input-field" placeholder="${t('ownerUi_254')}">
          <button onclick="window.submitEditOwnerDisplayName()" class="btn btn-gold" style="width: 100%;"> ${t('ownerUi_255')}</button>
        </div>
      </div>
    `;
  };

  window.submitEditOwnerDisplayName = async () => {
    const input = document.getElementById('edit-owner-displayname-input');
    const phoneInput = document.getElementById('edit-owner-phone-input');
    const newName = input ? input.value.trim() : '';
    const newPhone = phoneInput ? phoneInput.value.trim() : '';
    const phoneDigits = newPhone.replace(/\D/g, '').replace(/^90(?=5\d{9}$)/, '').replace(/^0(?=5\d{9}$)/, '');
    if (newName.length < 2 || !/^5\d{9}$/.test(phoneDigits)) return showErrorModal(t('errorTitle'), t('ownerUi_256'));
    user.displayName = newName;
    user.phone = newPhone;
    const ok = await saveRecord(`users/${user.uid}`, { displayName: newName, name: newName, phone: newPhone, updatedAt: new Date().toISOString() }, 'PATCH');
    if (!ok) return showErrorModal(t('errorTitle'), t('ownerUi_257'));
    window.closeModal();
    renderOwnerScreen(user, onTabChange);
  };

  window.switchOwnerAptCategory = (cat) => {
    activeOwnerAptCategory = cat;
    renderOwnerScreen(user, onTabChange);
  };

  window.setOwnerStaffFilter = (staffId) => {
    selectedOwnerStaffFilter = staffId || 'all';
    renderOwnerScreen(user, onTabChange);
  };

  window.toggleRevenueStaffDetails = (staffId) => {
    expandedRevenueStaffId = expandedRevenueStaffId === staffId ? null : staffId;
    renderOwnerScreen(user, onTabChange);
  };

  window.toggleOwnerRevenueDetails = () => {
    ownerRevenueDetailsExpanded = !ownerRevenueDetailsExpanded;
    renderOwnerScreen(user, onTabChange);
  };

  window.openOwnerRevenuePeriod = timeframe => {
    ciroTimeframe = ['day', 'week', 'month'].includes(timeframe) ? timeframe : 'day';
    ownerRevenueDetailsExpanded = true;
    renderOwnerScreen(user, onTabChange);
  };

  window.toggleOwnerStaffAccordion = () => {
    ownerStaffAccordionOpen = !ownerStaffAccordionOpen;
    renderOwnerScreen(user, onTabChange);
  };

  window.setOwnerAppointmentDate = (date) => {
    selectedOwnerAptDate = date || '';
    renderOwnerScreen(user, onTabChange);
  };

  window.setSelectedCiroDate = (date) => {
    selectedCiroDate = date || todayStr;
    renderOwnerScreen(user, onTabChange);
  };

  window.setCiroWeekOffset = (offset) => {
    selectedWeekOffset = Number(offset) === -1 ? -1 : 0;
    renderOwnerScreen(user, onTabChange);
  };

  window.setCiroMonthOffset = (offset) => {
    const requested = Number(offset);
    selectedMonthOffset = hasThreeMonthHistory && [-2, -1, 0].includes(requested) ? requested : 0;
    renderOwnerScreen(user, onTabChange);
  };

  window.requestOwnerPackageUpgrade = async (requestedPlan) => {
    const requestId = `upgrade_${businessId}_${Date.now()}`;
    const ok = await saveRecord(`businesses/${businessId}/packageUpgradeRequests/${requestId}`, {
      requestId, businessId, ownerUid: user.uid, currentPlan: bizRecord.plan || 'FREE', requestedPlan,
      status: 'pending', createdAt: new Date().toISOString()
    }, 'PUT');
    if (!ok) return showErrorModal(t('errorTitle'), t('ownerUi_258'));
    window.closeModal();
    showSuccessModal(t('successTitle'), t('uiRemaining_318', null, {plan: requestedPlan}));
  };

  window.openOwnerSalonDetailsModal = async () => {
    const root = document.getElementById('modal-root'); if (!root) return;
    let publicSalonRecord = null;
    if (!normalizePublicSalonSlug(bizRecord.publicSlug)) {
      const synced = await syncOwnerPublicBusiness(businessId);
      if (synced) publicSalonRecord = await fetchRecord(`public_businesses/${businessId}`, true);
    }
    let provinces = [], provinceData = null;
    try {
      provinces = await loadTurkeyProvinces();
      const selectedProvince = findTurkeyLocation(provinces, bizRecord.city);
      if (selectedProvince) provinceData = await loadTurkeyProvince(selectedProvince);
    } catch (error) {
      console.warn('Türkiye adres verisi yüklenemedi:', error && error.message);
    }
    const districts = provinceData && Array.isArray(provinceData.districts) ? provinceData.districts : [];
    const selectedDistrict = findTurkeyLocation(districts, bizRecord.district);
    const neighborhoods = selectedDistrict ? selectedDistrict.neighborhoods || [] : [];
    const salonSlug = createPublicSalonSlug(bizRecord.name, businessId, bizRecord.publicSlug || (publicSalonRecord && publicSalonRecord.publicSlug));
    const salonLink = `${window.location.origin}${publicSalonPath(salonSlug)}`;
    root.innerHTML = `<div class="modal-overlay" onclick="window.closeModal()"><div class="modal-card owner-modal-card animate-fade" onclick="event.stopPropagation()">
      <div class="owner-modal-header"><h3 style="color:var(--gold-primary);font-size:15px;margin:0;">${t('ownerUi_260')}</h3><button aria-label="${t('ownerUi_099')}" onclick="window.closeModal()" class="btn btn-secondary">${uiIcon('x')}</button></div>
      <input type="file" id="media-profile-input" accept="image/jpeg,image/png,image/webp" style="display:none;" onchange="window.handleImageCropSelected(event, 'profile')"><input type="file" id="media-cover-input" accept="image/jpeg,image/png,image/webp" style="display:none;" onchange="window.handleImageCropSelected(event, 'cover')"><input type="file" id="media-gallery-input" accept="image/jpeg,image/png,image/webp" style="display:none;" onchange="window.handleImageCropSelected(event, 'gallery')">
      ${renderSalonTypeFields('owner-types',salonTypes(bizRecord))}<input id="owner-salon-name" class="input-field" value="${escapeOwnerText(bizRecord.name || '')}" placeholder="${t('ownerUi_261')}"><input id="owner-salon-category" class="input-field" value="${escapeOwnerText(bizRecord.category || '')}" placeholder="${t('ownerUi_262')}"><input id="owner-salon-phone" class="input-field" value="${escapeOwnerText(bizRecord.phone || '')}" placeholder="${t('ownerUi_208')}"><textarea id="owner-salon-description" class="input-field" placeholder="${t('ownerUi_263')}">${escapeOwnerText(bizRecord.publicDescription || bizRecord.description || '')}</textarea><h4 style="color:var(--gold-primary);margin:10px 0 4px;">${t('ownerUi_264')}</h4><div class="owner-address-selects"><label>${t('ownerUi_265')}<select id="owner-salon-city" class="input-field" onchange="window.changeOwnerSalonProvince(this.value)">${renderTurkeyLocationOptions(provinces,bizRecord.city,t('ownerUi_280'))}</select></label><label>${t('ownerUi_266')}<select id="owner-salon-district" class="input-field" onchange="window.changeOwnerSalonDistrict(this.value)" ${!bizRecord.city ? 'disabled' : ''}>${renderTurkeyLocationOptions(districts,bizRecord.district,t('ownerUi_281'))}</select></label><label>${t('ownerUi_267')}<select id="owner-salon-neighborhood" class="input-field" ${!bizRecord.district ? 'disabled' : ''}>${renderTurkeyLocationOptions(neighborhoods,bizRecord.neighborhood,t('ownerUi_282'))}</select></label></div><textarea id="owner-salon-address" class="input-field" placeholder="${t('ownerUi_268')}">${escapeOwnerText(bizRecord.address || '')}</textarea><div id="owner-coordinate-fields" hidden><input id="owner-salon-latitude" type="hidden" value="${escapeOwnerText(bizRecord.latitude ?? '')}"><input id="owner-salon-longitude" type="hidden" value="${escapeOwnerText(bizRecord.longitude ?? '')}"></div><div class="owner-location-actions"><button type="button" class="btn btn-secondary" onclick="window.useOwnerCurrentLocation()">${uiIcon('mapPin')} ${t('ownerUi_269')}</button><button type="button" class="btn btn-secondary" onclick="window.openOwnerMapPicker()">${uiIcon('mapPin')} ${t('ownerUi_270')}</button></div><div id="owner-location-status" style="font-size:10px;color:var(--text-muted);margin-bottom:10px;">${isValidOwnerMapPoint(bizRecord.latitude, bizRecord.longitude) ? t('ownerUi_283') : t('ownerUi_284')}</div>
      <h4 style="color:var(--gold-primary);margin:10px 0 4px;">${t('ownerUi_271')}</h4>${[['instagram',t('ownerUi_285')],['whatsapp',t('ownerUi_209')],['tiktok',t('ownerUi_286')],['website',t('ownerUi_287')]].map(([key,label])=>{const item=(bizRecord.socials&&bizRecord.socials[key])||{};return `<div style="display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center;"><input id="owner-social-${key}" class="input-field" value="${escapeOwnerText(item.value || (key==='whatsapp'?bizRecord.whatsappPhone:'') || '')}" placeholder="${label}"><label style="font-size:11px;color:var(--text-muted);"><input id="owner-social-${key}-active" type="checkbox" ${item.active===true?'checked':''}> ${t('ownerUi_163')}</label></div>`;}).join('')}
      <div style="display:flex;gap:6px;margin:8px 0 14px;"><button onclick="window.openSalonImageCropModal('profile')" class="btn btn-secondary" style="flex:1;font-size:10px;"> ${t('ownerUi_272')}</button><button onclick="window.openSalonImageCropModal('cover')" class="btn btn-secondary" style="flex:1;font-size:10px;"> ${t('ownerUi_273')}</button><button onclick="window.openSalonImageCropModal('gallery')" class="btn btn-secondary" style="flex:1;font-size:10px;"> ${t('ownerUi_274')}</button></div>
      <button type="button" onclick="window.openSalonBrandKit()" class="btn btn-secondary" style="width:100%;margin:12px 0">Salon Marka Kiti</button><div class="owner-public-link"><label for="owner-public-salon-link">${t('ownerUi_275')}</label><div><input id="owner-public-salon-link" class="input-field" readonly value="${escapeOwnerText(salonLink)}"><button type="button" class="btn btn-secondary" onclick="window.copyOwnerSalonLink()">${t('ownerUi_276')}</button><button type="button" class="btn btn-secondary" onclick="window.shareOwnerSalonLink()">${t('ownerUi_277')}</button></div><small>${t('ownerUi_278')}</small></div>
      <button onclick="window.saveOwnerSalonDetails()" class="btn btn-gold" style="width:100%;"> ${t('ownerUi_279')}</button></div></div>`;
  };

  window.copyOwnerSalonLink = async () => {
    const input = document.getElementById('owner-public-salon-link');
    if (!input) return;
    try {
      if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(input.value);
      else { input.focus(); input.select(); document.execCommand('copy'); }
      showSuccessModal(t('successTitle'), t('ownerUi_288'), () => window.openOwnerSalonDetailsModal());
    } catch { showErrorModal(t('errorTitle'), t('ownerUi_289'), () => window.openOwnerSalonDetailsModal()); }
  };

  window.shareOwnerSalonLink = async () => {
    const input = document.getElementById('owner-public-salon-link');
    if (!input) return;
    if (navigator.share) {
      try { await navigator.share({ title:bizRecord.name || t('staffUi_59'), text:`${bizRecord.name || t('staffUi_59')} ${t('uiRemaining_319', null, {salon: ''}).trim()}`, url:input.value }); return; }
      catch (error) { if (error && error.name === 'AbortError') return; }
    }
    await window.copyOwnerSalonLink();
  };

  window.changeOwnerSalonProvince = async city => {
    const districtSelect = document.getElementById('owner-salon-district');
    const neighborhoodSelect = document.getElementById('owner-salon-neighborhood');
    if (!districtSelect || !neighborhoodSelect) return;
    districtSelect.innerHTML = `<option value="">${t('ownerUi_292')}</option>`;
    districtSelect.disabled = true;
    neighborhoodSelect.innerHTML = `<option value="">${t('ownerUi_282')}</option>`;
    neighborhoodSelect.disabled = true;
    if (!city) { districtSelect.innerHTML = `<option value="">${t('ownerUi_293')}</option>`; return; }
    try {
      const data = await loadTurkeyProvince(city);
      districtSelect.innerHTML = renderTurkeyLocationOptions(data && data.districts, '', t('ownerUi_281'));
      districtSelect.disabled = false;
    } catch (error) {
      districtSelect.innerHTML = `<option value="">${t('ownerUi_294')}</option>`;
      showErrorModal(t('errorTitle'), t('ownerUi_295'));
    }
  };

  window.changeOwnerSalonDistrict = async districtName => {
    const city = document.getElementById('owner-salon-city')?.value;
    const neighborhoodSelect = document.getElementById('owner-salon-neighborhood');
    if (!neighborhoodSelect) return;
    neighborhoodSelect.innerHTML = `<option value="">${t('ownerUi_282')}</option>`;
    neighborhoodSelect.disabled = true;
    if (!city || !districtName) return;
    try {
      const data = await loadTurkeyProvince(city);
      const district = findTurkeyLocation((data && data.districts) || [], districtName);
      neighborhoodSelect.innerHTML = renderTurkeyLocationOptions(district && district.neighborhoods, '', t('ownerUi_282'));
      neighborhoodSelect.disabled = false;
    } catch (error) {
      neighborhoodSelect.innerHTML = `<option value="">${t('ownerUi_296')}</option>`;
      showErrorModal(t('errorTitle'), t('ownerUi_297'));
    }
  };

  window.openSalonBrandKit = () => openSalonBrandKit(bizRecord, async patch => {
    const response = await authenticatedFetch('/api/salon/update-profile', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(patch)});
    const data = await response.json();if(!response.ok)throw new Error(data.error || 'Marka kiti kaydedilemedi.');
    invalidateDbCache('businesses');invalidateDbCache('public_businesses');Object.assign(bizRecord,data.business);await renderOwnerScreen(user,onTabChange);return data.business;
  });
  window.saveOwnerSalonDetails = async () => {
    const selectedTypes=[...document.querySelectorAll('input[name="owner-types"]:checked')].map(el=>el.value);
    if(!selectedTypes.length)return showErrorModal(t('errorTitle'),'En az bir işletme türü seçin.');
    const name=document.getElementById('owner-salon-name').value.trim(), category=document.getElementById('owner-salon-category').value.trim(), phone=document.getElementById('owner-salon-phone').value.trim(), address=document.getElementById('owner-salon-address').value.trim(), city=document.getElementById('owner-salon-city').value.trim(), district=document.getElementById('owner-salon-district').value.trim(), neighborhood=document.getElementById('owner-salon-neighborhood').value.trim(), publicDescription=document.getElementById('owner-salon-description').value.trim(), rawLatitude=document.getElementById('owner-salon-latitude').value, rawLongitude=document.getElementById('owner-salon-longitude').value;
    const hasCoordinateInput = Boolean(String(rawLatitude).trim() || String(rawLongitude).trim());
    const latitude = hasCoordinateInput ? normalizeOwnerMapCoordinate(rawLatitude, -90, 90) : '';
    const longitude = hasCoordinateInput ? normalizeOwnerMapCoordinate(rawLongitude, -180, 180) : '';
    const socials=Object.fromEntries(['instagram','whatsapp','tiktok','website'].map(key=>[key,{value:document.getElementById(`owner-social-${key}`).value.trim(),active:document.getElementById(`owner-social-${key}-active`).checked}]));
    for (const key of ['instagram','tiktok','website']) {
      if (socials[key].value && !/^https?:\/\/[^\s]+$/i.test(socials[key].value)) return showErrorModal(t('errorTitle'),t('ownerUi_298'));
    }
    if (socials.whatsapp.value && !/^(?:\+?90)?5\d{9}$/.test(socials.whatsapp.value.replace(/[\s()-]/g,''))) return showErrorModal(t('errorTitle'),t('ownerUi_299'));
    if (name.length < 2 || !phone || address.length < 5) return showErrorModal(t('errorTitle'), t('ownerUi_300'));
    if (hasCoordinateInput && !isValidOwnerMapPoint(latitude, longitude)) return showErrorModal(t('errorTitle'), t('ownerUi_301'));
    const response=await authenticatedFetch('/api/salon/update-profile',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,category,salonTypes:selectedTypes,phone,address,city,district,neighborhood,publicDescription,latitude,longitude,socials})});
    const data=await response.json().catch(()=>({})); if(!response.ok) return showErrorModal(t('errorTitle'),data.error||t('ownerUi_302'));
    invalidateDbCache('businesses');
    invalidateDbCache('businesses'); invalidateDbCache('public_businesses'); Object.assign(bizRecord,data.business||{name,category,phone,address,city,district,neighborhood,publicDescription,latitude,longitude,socials}); window.closeModal(); renderOwnerScreen(user,onTabChange); showSuccessModal(t('successTitle'),t('ownerUi_303'));
  };

  window.useOwnerCurrentLocation = () => {
    const status = document.getElementById('owner-location-status');
    if (!navigator.geolocation) { if (status) status.textContent = t('ownerUi_304'); return; }
    if (status) status.textContent = t('ownerUi_305');
    navigator.geolocation.getCurrentPosition(position => {
      const latitude = normalizeOwnerMapCoordinate(position.coords.latitude, -90, 90);
      const longitude = normalizeOwnerMapCoordinate(position.coords.longitude, -180, 180);
      if (!isValidOwnerMapPoint(latitude, longitude)) { if (status) status.textContent = t('ownerUi_306'); return; }
      document.getElementById('owner-salon-latitude').value = String(latitude);
      document.getElementById('owner-salon-longitude').value = String(longitude);
      if (status) status.textContent = t('ownerUi_307');
    }, () => { if (status) status.textContent = t('ownerUi_308'); }, { enableHighAccuracy:true, timeout:10000, maximumAge:60000 });
  };

  window.openOwnerMapPicker = async () => {
    cleanupOwnerLocationMap();
    const root = document.getElementById('modal-root');
    const latitudeInput = document.getElementById('owner-salon-latitude');
    const longitudeInput = document.getElementById('owner-salon-longitude');
    if (!root || !latitudeInput || !longitudeInput) return;
    const currentLat = normalizeOwnerMapCoordinate(latitudeInput.value, -90, 90);
    const currentLng = normalizeOwnerMapCoordinate(longitudeInput.value, -180, 180);
    const hasCurrentPoint = isValidOwnerMapPoint(currentLat, currentLng);
    const startPoint = hasCurrentPoint ? [currentLat, currentLng] : [39, 35];
    ownerLocationDraft = hasCurrentPoint ? { latitude:currentLat, longitude:currentLng } : null;
    root.insertAdjacentHTML('beforeend', `<div id="owner-map-picker-layer" class="owner-map-picker-layer" onclick="window.cancelOwnerMapPicker()"><section class="modal-card owner-map-picker-card" role="dialog" aria-modal="true" aria-labelledby="owner-map-picker-title" onclick="event.stopPropagation()"><div class="owner-modal-header"><h3 id="owner-map-picker-title">${t('ownerUi_270')}</h3><button type="button" class="btn btn-secondary" aria-label="${t('ownerUi_099')}" onclick="window.cancelOwnerMapPicker()">${uiIcon('x')}</button></div><p class="owner-map-help">${t('ownerUi_309')}</p><div id="owner-location-map" aria-label="${t('ownerUi_310')}"></div><div id="owner-map-coordinate-status" class="owner-map-coordinate-status">${hasCurrentPoint ? `${currentLat.toFixed(6)}, ${currentLng.toFixed(6)}` : t('ownerUi_312')}</div><div class="owner-map-picker-actions"><button type="button" class="btn btn-secondary" onclick="window.cancelOwnerMapPicker()">${t('ownerUi_054')}</button><button id="owner-use-map-location" type="button" class="btn btn-gold" onclick="window.confirmOwnerMapPicker()" ${hasCurrentPoint ? '' : 'disabled'}>${t('ownerUi_311')}</button></div></section></div>`);
    try {
      const L = await ensureLeafletLoaded();
      if (!document.getElementById('owner-location-map')) return;
      ownerLocationMap = L.map('owner-location-map', { scrollWheelZoom:true }).setView(startPoint, hasCurrentPoint ? 16 : 6);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom:19, attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }).addTo(ownerLocationMap);
      const placeMarker = point => {
        const latitude = normalizeOwnerMapCoordinate(point.lat, -90, 90);
        const longitude = normalizeOwnerMapCoordinate(point.lng, -180, 180);
        if (!isValidOwnerMapPoint(latitude, longitude)) return;
        ownerLocationDraft = { latitude, longitude };
        if (ownerLocationMarker) ownerLocationMarker.setLatLng([latitude, longitude]);
        else ownerLocationMarker = L.marker([latitude, longitude]).addTo(ownerLocationMap);
        const coordinateStatus = document.getElementById('owner-map-coordinate-status');
        const useButton = document.getElementById('owner-use-map-location');
        if (coordinateStatus) coordinateStatus.textContent = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
        if (useButton) useButton.disabled = false;
      };
      if (hasCurrentPoint) placeMarker({ lat:currentLat, lng:currentLng });
      ownerLocationMap.on('click', event => placeMarker(event.latlng));
      requestAnimationFrame(() => ownerLocationMap?.invalidateSize());
    } catch (error) {
      const status = document.getElementById('owner-map-coordinate-status');
      if (status) status.textContent = t('ownerUi_314');
    }
  };

  window.confirmOwnerMapPicker = () => {
    if (!ownerLocationDraft || !isValidOwnerMapPoint(ownerLocationDraft.latitude, ownerLocationDraft.longitude)) return;
    const latitudeInput = document.getElementById('owner-salon-latitude');
    const longitudeInput = document.getElementById('owner-salon-longitude');
    if (!latitudeInput || !longitudeInput) return;
    latitudeInput.value = String(ownerLocationDraft.latitude);
    longitudeInput.value = String(ownerLocationDraft.longitude);
    const status = document.getElementById('owner-location-status');
    if (status) status.textContent = t('ownerUi_315');
    cleanupOwnerLocationMap();
  };

  window.cancelOwnerMapPicker = () => cleanupOwnerLocationMap();

  window.openLanguageModalOwner = () => {
    const root = document.getElementById('modal-root');
    if (!root) return;
    const langs = SUPPORTED_LANGUAGES;
    root.innerHTML = `
      <div class="modal-overlay" onclick="window.closeModal()">
        <div class="modal-card animate-fade" onclick="event.stopPropagation()">
          <div style="display:flex;justify-content:space-between;align-items:center;"><h3 style="font-size: 15px; font-weight: 800; color: var(--gold-primary); margin-bottom: 12px;"> ${t('language', currentLang)}</h3><button aria-label="${t('closeBtn', currentLang)}" onclick="window.closeModal()" class="btn btn-secondary">${uiIcon('x')}</button></div>
          ${langs.map(l => `<button onclick="window.selectOwnerLanguage('${l.code}')" class="btn ${currentLang === l.code ? 'btn-gold' : 'btn-secondary'}" style="width:100%; margin-bottom:6px;">${l.flag} ${t('languageName_' + l.code, currentLang)}</button>`).join('')}
        </div>
      </div>
    `;
  };

  window.selectOwnerLanguage = async (code) => {
    user.language = code;
    await saveRecord(`users/${user.uid}/language`, code);
    window.closeModal();
    renderOwnerScreen(user, onTabChange);
  };

  window.openHelpSupportModal = () => {
    const root = document.getElementById('modal-root');
    if (!root) return;
    root.innerHTML = `
      <div class="modal-overlay" onclick="window.closeModal()">
        <div class="modal-card animate-fade" onclick="event.stopPropagation()">
          <div style="display:flex;justify-content:space-between;align-items:center;"><h3 style="font-size: 15px; font-weight: 800; color: var(--gold-primary); margin-bottom: 12px;"> ${t('ownerUi_316')}</h3><button aria-label="${t('ownerUi_099')}" onclick="window.closeModal()" class="btn btn-secondary">${uiIcon('x')}</button></div>
          <textarea id="owner-support-msg" class="input-field" rows="3" placeholder="${t('ownerUi_317')}"></textarea>
          <button onclick="window.submitOwnerSupportTicket()" class="btn btn-gold" style="width: 100%;">${t('ownerUi_318')}</button>
        </div>
      </div>
    `;
  };

  window.submitOwnerSupportTicket = async () => {
    const msg = document.getElementById('owner-support-msg').value;
    if (!msg) return;
    const ticketId = `tkt_${Date.now()}`;
    const ok = await saveRecord(`businesses/${businessId}/supportTickets/${ticketId}`, { ticketId, userUid: user.uid, businessId, message: msg, status: 'open', createdAt: new Date().toISOString() });
    if (!ok) return showErrorModal(t('errorTitle'), t('ownerUi_319'));
    window.closeModal();
    showSuccessModal(t('successTitle'), t('ownerUi_320'));
  };

  window.promptOwnerLogout = () => {
    showConfirmModal(t('staffUi_57'), t('ownerUi_322'), () => {
      window.completeExplicitLogout(onTabChange);
    });
  };

    window.reviewOwnerReschedule = async (aptId, action, requestedDate = '', requestedTime = '') => {
      try {
        const response = await authenticatedFetch('/api/booking/reschedule-approve', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ aptId, action, newDate: requestedDate || undefined, newTime: requestedTime || undefined, userUid: user.uid })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || t('ownerUi_323'));
        showSuccessModal(t('successTitle'), action === 'approve' ? t('ownerUi_324') : t('ownerUi_325'));
        renderOwnerScreen(user, onTabChange);
      } catch (error) {
        showErrorModal(t('errorTitle'), error.message || t('staffUi_81'));
      }
    };

    window.updateAppointmentStatusOwner = async (aptId, newStatus, btnEl) => {
    if (!aptId || !newStatus) return;

    if (btnEl) {
      btnEl.disabled = true;
      btnEl.dataset.origText = btnEl.innerHTML;
      btnEl.innerHTML = t('ownerUi_327');
    }

    try {
      const res = await authenticatedFetch('/api/booking/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aptId, newStatus, userUid: user.uid })
      });

      const data = res.ok ? await res.json().catch(() => null) : null;

      if (res.ok && data && data.success) {
        // Instantly update local appointment object status
        const targetApt = allApts.find(a => a && a.aptId === aptId);
        if (targetApt) targetApt.status = newStatus;

        // Instantly re-render Patron screen without requiring F5
        renderOwnerScreen(user, onTabChange);
      } else {
        showErrorModal(t('errorTitle'), (data && data.error) ? data.error : t('ownerUi_328'));
        if (btnEl) {
          btnEl.disabled = false;
          btnEl.innerHTML = btnEl.dataset.origText || t('ownerUi_329');
        }
      }
    } catch (err) {
      showErrorModal(t('errorTitle'), t('ownerUi_330'));
      if (btnEl) {
        btnEl.disabled = false;
        btnEl.innerHTML = btnEl.dataset.origText || t('ownerUi_329');
      }
    }
  };
  window.toggleMasterNotificationOwner = (enabled) => {
    const subCheckboxes = document.querySelectorAll('.sub-notif-pref');
    subCheckboxes.forEach(cb => {
      cb.disabled = !enabled;
    });
  };
  window.enableAllOwnerNotifications = () => {
    const master = document.getElementById('pref-inapp');
    if (master) master.checked = true;
    document.querySelectorAll('.sub-notif-pref').forEach(checkbox => { checkbox.disabled = false; checkbox.checked = true; });
  };


}
