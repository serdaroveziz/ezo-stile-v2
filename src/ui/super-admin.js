/* UNELIVO - Super Admin Command Center (Final Governance, Max 2 Free Premium Grants, Support Viewing Mode, Audit Log, AI Telemetry, Master Notifications) */
import { invalidateDbCache, getSalonApplications, approveSalonApplication, fetchRecord, saveRecord, getAppointmentsForBusiness } from '../db.js';
import { SUPPORTED_LANGUAGES, applyDocumentLanguage, t } from '../config.js';
import { showSuccessToast, showSuccessModal, showErrorModal, showConfirmModal } from './portal.js';
import { getSessionGeneration, isSessionCurrent, logoutUserSession } from '../auth.js';
import { authenticatedFetch } from '../firebase.js';
import { uiIcon } from './icons.js';
import { triggerTouchNavIconBounce } from './nav-bounce.js';

let activeAdminTab = 'dashboard'; // 'dashboard', 'salons', 'applications', 'users', 'management', 'profile'
let salonFilterState = 'all'; // 'all', 'active', 'suspended'
let salonSearchQuery = '';
let salonCityFilter = 'all';
let expandedAdminSalonId = null;
let applicationFilterState = 'pending'; // 'pending', 'approved', 'rejected'
let userSearchQuery = '';
let userRoleFilter = 'owner'; // 'owner', 'staff', 'customer'
let auditFilterAction = 'all';
let supportViewBusinessId = null; // Support viewing mode state
let adminSearchRenderTimer = null;
let adminRenderSequence = 0;
let adminSessionGeneration = null;

function scheduleAdminSearchRender(user, onTabChange) {
  if (adminSearchRenderTimer) clearTimeout(adminSearchRenderTimer);
  adminSearchRenderTimer = setTimeout(() => {
    adminSearchRenderTimer = null;
    renderSuperAdminScreen(user, onTabChange);
  }, 180);
}

function escapeAdminText(value) {
  return String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}


// Local copy is scoped to this panel; shared role dictionaries remain unchanged.
function adminLabel(key) {
  const labels = {
    before: ['Önce', 'Before', 'До', 'قبل', 'Öň', 'قبل'],
    after: ['Sonra', 'After', 'После', 'بعد', 'Soň', 'بعد'],
    plan: ['Paket', 'Plan', 'Тариф', 'الخطة', 'Meýilnama', 'طرح'],
    address: ['Adres', 'Address', 'Адрес', 'العنوان', 'Salgysy', 'نشانی'],
    phone: ['Telefon', 'Phone', 'Телефон', 'الهاتف', 'Telefon', 'تلفن'],
    status: ['Durum', 'Status', 'Статус', 'الحالة', 'Ýagdaý', 'وضعیت'],
    salon: ['Salon', 'Salon', 'Салон', 'الصالون', 'Salon', 'سالن']
  };
  const index = ['tr', 'en', 'ru', 'ar', 'tk', 'fa'].indexOf(document.documentElement.lang);
  return labels[key][index < 0 ? 0 : index];
}

function normalizeAdminSearch(value) {
  return String(value || '').toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

export function filterAdminSalons(salons, query, state = 'all', city = 'all') {
  const normalized = normalizeAdminSearch(query);
  return (salons || []).filter(business => {
    if (!business) return false;
    if (state === 'active' && business.status !== 'active') return false;
    if (state === 'suspended' && business.status !== 'suspended') return false;
    if (city !== 'all' && business.city !== city) return false;
    if (normalized.length < 2) return true;
    return normalizeAdminSearch([business.name, business.phone, business.whatsappPhone, business.city, business.district].join(' ')).includes(normalized);
  });
}

const AUDIT_ACTION_LABELS = {
  'salon.suspended': 'uiRemaining_175',
  'salon.activated': 'uiRemaining_176',
  'salon.reactivated': 'uiRemaining_176',
  'salon.hidden_from_discovery': 'uiRemaining_177',
  'salon.shown_in_discovery': 'uiRemaining_178',
  'salon.restored_to_discovery': 'uiRemaining_178',
  'salon.discovery_enabled': 'uiRemaining_178',
  'salon.discovery_disabled': 'uiRemaining_177'
};

function formatAdminDate(value) {
  if (!value) return t('uiRemaining_179');
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? t('uiRemaining_180') : date.toLocaleString('tr-TR');
}

export async function renderSuperAdminScreen(user, onTabChange) {
  const renderGeneration = getSessionGeneration();
  const renderSequence = ++adminRenderSequence;
  if (adminSessionGeneration !== renderGeneration) {
    adminSessionGeneration = renderGeneration;
    activeAdminTab='dashboard';supportViewBusinessId=null;expandedAdminSalonId=null;
    if(adminSearchRenderTimer)clearTimeout(adminSearchRenderTimer);
    adminSearchRenderTimer=null;
  }
  if (!user || user.role !== 'super_admin') throw new Error(t('uiRemaining_181'));
  window.closeModal = () => {
    const root = document.getElementById('modal-root');
    if (root) root.innerHTML = '';
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
  };
  // 1. SUPPORT VIEWING MODE GUARD (REQUIREMENT 29 & 30)
  if (supportViewBusinessId) {
    const appContainer = document.getElementById('app-container');
    if (appContainer) {
      const business = await fetchRecord(`businesses/${supportViewBusinessId}`, true) || {};
      const appointments = await getAppointmentsForBusiness(supportViewBusinessId);
      if (renderSequence !== adminRenderSequence || !isSessionCurrent(user.uid, renderGeneration)) return;
      const services = Object.values(business.services || {}).filter(Boolean);
      const staff = Object.values(business.staff || {}).filter(Boolean);
      const pendingCount = appointments.filter(appointment => appointment.status === 'pending').length;
      const approvedCount = appointments.filter(appointment => appointment.status === 'approved').length;
      const completedCount = appointments.filter(appointment => appointment.status === 'completed').length;
      appContainer.innerHTML = `
        <div style="background:#eab308;color:#000;padding:10px 16px;font-weight:800;font-size:12px;display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;z-index:9999;"><span> ${t('uiRemaining_182')}</span><button onclick="window.exitSupportViewingMode()" class="btn btn-secondary" style="background:var(--theme-panel-000000, #000);color:var(--theme-ink-ffffff, #fff);border:none;padding:5px 10px;">${t('uiRemaining_183')}</button></div>
        <div class="card card-gold animate-fade" style="margin:14px;padding:16px;"><h3 style="font-size:17px;color:var(--theme-ink-ffffff, #fff);"> ${escapeAdminText(business.name || t('staffUi_59'))}</h3><div style="font-size:11px;color:var(--gold-primary);"> ${t('uiRemaining_184')} ${escapeAdminText(business.plan || 'FREE')}</div><div style="font-size:10px;color:var(--text-muted);margin-top:4px;"> ${escapeAdminText(business.district || '')} / ${escapeAdminText(business.city || '')} •  ${escapeAdminText(business.phone || t('uiRemaining_187'))}</div></div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:0 14px 12px;"><div class="card" style="padding:12px;text-align:center;"><div style="font-size:10px;color:var(--text-muted);">${t('ownerUi_055')}</div><strong style="color:var(--theme-copy-f59e0b, #f59e0b);font-size:21px;">${pendingCount}</strong></div><div class="card" style="padding:12px;text-align:center;"><div style="font-size:10px;color:var(--text-muted);">${t('ownerUi_163')}</div><strong style="color:var(--theme-copy-22c55e, #22c55e);font-size:21px;">${approvedCount}</strong></div><div class="card" style="padding:12px;text-align:center;"><div style="font-size:10px;color:var(--text-muted);">${t('ownerUi_052')}</div><strong style="color:var(--theme-copy-60a5fa, #60a5fa);font-size:21px;">${completedCount}</strong></div></div>
        <div class="card animate-fade" style="margin:0 14px 12px;padding:14px;"><h4 style="font-size:13px;color:var(--gold-primary);margin-bottom:8px;"> ${t('uiRemaining_185')}${services.length})</h4>${services.map(service => `<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid rgba(255,255,255,.08);font-size:11px;color:var(--theme-ink-ffffff, #fff);"><span>${escapeAdminText(service.name || t('staffUi_7'))} • ${Number(service.duration || 30)} ${t('ownerUi_139')}</span><strong style="color:var(--gold-primary);">${Number(service.price || 0)} TL</strong></div>`).join('') || `<div style="font-size:11px;color:var(--text-muted);">${t('uiRemaining_008')}</div>`}</div>
        <div class="card animate-fade" style="margin:0 14px 80px;padding:14px;"><h4 style="font-size:13px;color:var(--gold-primary);margin-bottom:8px;"> ${t('uiRemaining_186')}${staff.length})</h4>${staff.map(member => `<span class="badge badge-secondary" style="margin:3px;">${escapeAdminText(member.displayName || member.name || t('uiRemaining_309'))}</span>`).join('') || `<div style="font-size:11px;color:var(--text-muted);">${t('uiRemaining_188')}</div>`}</div>
      `;

      window.exitSupportViewingMode = () => {
        supportViewBusinessId = null;
        renderSuperAdminScreen(user, onTabChange);
      };

      return;
    }
  }

  const container = document.getElementById('app-container');
  if (!container) return;

  const currentLang = user.language || 'tr';
  applyDocumentLanguage(currentLang);

  const applications = await getSalonApplications();
  const pendingApps = applications.filter(a => a && a.status === 'pending');
  const approvedApps = applications.filter(a => a && a.status === 'approved');
  const rejectedApps = applications.filter(a => a && a.status === 'rejected');

  const allBusinessesData = await fetchRecord('businesses') || {};
  const allBusinesses = Object.entries(allBusinessesData)
    .filter(([, business]) => business && typeof business === 'object')
    .map(([businessKey, business]) => ({
      ...business,
      businessId: business.businessId || businessKey
    }));
  const manageableBusinesses = allBusinesses;
  const activeBusinesses = manageableBusinesses.filter(b => b && b.status === 'active');
  const suspendedBusinesses = manageableBusinesses.filter(b => b && b.status === 'suspended');

  const grantedSalons = allBusinesses.filter(b => b && b.premiumSource === 'super_admin_grant');

  const allUsersData = await fetchRecord('users') || {};
  const allUsers = Object.entries(allUsersData)
    .filter(([, account]) => account && typeof account === 'object')
    .map(([uid, account]) => ({ ...account, uid: account.uid || uid }));

  const allAptsData = await fetchRecord('appointments') || {};
  if (renderSequence !== adminRenderSequence || !isSessionCurrent(user.uid, renderGeneration)) return;
  const allApts = Object.values(allAptsData);

  // Appointment dates are Istanbul calendar days; toISOString() is UTC and shows yesterday until 03:00.
  const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(new Date());
  const todayApts = allApts.filter(a => a && a.date === todayStr);

  const displayName = escapeAdminText(user.displayName || user.name || t('superAdminTitle'));

  let mainHtml = '';

  // ==========================================
  // 1. ANA SAYFA / KOMUTA MERKEZİ (REQS 3-9)
  // ==========================================
  if (activeAdminTab === 'dashboard') {
    mainHtml = `
      <!-- The header bar already shows the panel title; salons/applications are in the bottom nav
           and the KPI cards below, and the audit log lives under Yönetim. -->
      <div class="animate-fade admin-welcome" style="margin: 2px 2px 14px;">
        <h3 style="font-size: 16px; font-weight: 800; color: var(--text-main);">${t('uiRemaining_189')} ${displayName}</h3>
        <button type="button" class="btn btn-gold" style="width:100%;margin-top:12px" onclick="window.openInsightsAssistant()">UNELIVO AI · Platformu sor</button>
      </div>
      <!-- 6 INTERACTIVE KPI CARDS (REQS 3-9) -->
      <div class="admin-metrics" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 14px;">
        <!-- 1. TOPLAM SALON -->
        <div class="card animate-fade" style="padding: 14px; text-align: center; cursor: pointer; border-color: var(--gold-primary);" onclick="window.switchAdminTab('salons', 'all')">
          <div style="font-size: 11px; color: var(--gold-primary); font-weight: 700;"> ${uiIcon('store')} ${t('totalSalons')}</div>
          <div style="font-size: 24px; font-weight: 900; color: var(--theme-ink-ffffff, #fff); margin-top: 4px;">${manageableBusinesses.length}</div>
          <div style="font-size: 9px; color: var(--text-muted); margin-top: 4px;">${t('uiRemaining_191')}</div>
        </div>

        <!-- 2. AKTİF SALON -->
        <div class="card animate-fade" style="padding: 14px; text-align: center; cursor: pointer;" onclick="window.switchAdminTab('salons', 'active')">
          <div style="font-size: 11px; color:var(--theme-copy-22c55e, #22c55e); font-weight: 700;"> ${uiIcon('check')} ${t('activeSalons')}</div>
          <div style="font-size: 24px; font-weight: 900; color:var(--theme-copy-22c55e, #22c55e); margin-top: 4px;">${activeBusinesses.length}</div>
          <div style="font-size: 9px; color: var(--text-muted); margin-top: 4px;">${t('uiRemaining_192')}</div>
        </div>

        <!-- 3. BEKLEYEN BAŞVURU -->
        <div class="card animate-fade" style="padding: 14px; text-align: center; cursor: pointer;" onclick="window.switchAdminTab('applications', 'pending')">
          <div style="font-size: 11px; color: var(--gold-primary); font-weight: 700;"> ${uiIcon('inbox')} ${t('pendingApps')}</div>
          <div style="font-size: 24px; font-weight: 900; color: var(--gold-primary); margin-top: 4px;">${pendingApps.length}</div>
          <div style="font-size: 9px; color: var(--text-muted); margin-top: 4px;">${t('uiRemaining_193')}</div>
        </div>

        <!-- 4. TOPLAM KULLANICI -->
        <div class="card animate-fade" style="padding: 14px; text-align: center; cursor: pointer;" onclick="window.switchAdminTab('users')">
          <div style="font-size: 11px; color: var(--gold-primary); font-weight: 700;"> ${uiIcon('users')} ${t('totalUsers')}</div>
          <div style="font-size: 24px; font-weight: 900; color: var(--theme-ink-ffffff, #fff); margin-top: 4px;">${allUsers.length}</div>
          <div style="font-size: 9px; color: var(--text-muted); margin-top: 4px;">${t('uiRemaining_194')}</div>
        </div>

        <!-- 5. BUGÜNKÜ RANDEVU -->
        <div class="card animate-fade" style="padding: 14px; text-align: center; cursor: pointer;" onclick="window.openPlatformTodayAptsModal()">
          <div style="font-size: 11px; color: var(--gold-primary); font-weight: 700;"> ${uiIcon('calendar')} ${t('todayPlatformApts')}</div>
          <div style="font-size: 24px; font-weight: 900; color: var(--theme-ink-ffffff, #fff); margin-top: 4px;">${todayApts.length}</div>
          <div style="font-size: 9px; color: var(--text-muted); margin-top: 4px;">${t('uiRemaining_195')}</div>
        </div>

        <!-- 6. PLATFORM GELİRİ -->
        <div class="card animate-fade" style="padding: 14px; text-align: center; cursor: pointer;" onclick="window.openPlatformRevenueModal()">
          <div style="font-size: 11px; color:var(--theme-copy-22c55e, #22c55e); font-weight: 700;"> ${uiIcon('wallet')} ${t('platformRevenue')}</div>
          <div style="font-size: 18px; font-weight: 900; color:var(--theme-copy-22c55e, #22c55e); margin-top: 4px;">—</div>
          <div style="font-size: 9px; color: var(--text-muted); margin-top: 4px;">${t('uiRemaining_196')}</div>
        </div>
      </div>
    `;
  }
  // ==========================================
  // 2. SALONLAR EKRANI (REQS 10-14)
  // ==========================================
  else if (activeAdminTab === 'salons') {
    const filteredSalons = filterAdminSalons(manageableBusinesses, salonSearchQuery, salonFilterState, salonCityFilter);
    const adminCities = [...new Set(manageableBusinesses.map(b => b.city).filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),'tr'));

    const salonsHtml = filteredSalons.map(b => {
      const isGranted = b.premiumSource === 'super_admin_grant';
      const isSuspended = b.status === 'suspended';
      const isDiscoveryHidden = b.discoveryEnabled === false || b.hiddenFromDiscovery === true;
      const isExpanded = expandedAdminSalonId === b.businessId;

      return `
        <div class="card animate-fade admin-salon-card" style="padding: 14px; margin-bottom: 10px; border-color: ${isSuspended ? '#ef4444' : 'var(--border-color)'};">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <div style="font-size: 14px; font-weight: 800; color: var(--theme-ink-ffffff, #fff);"> ${uiIcon('store')} ${escapeAdminText(b.name || t('uiRemaining_198'))}</div>
              <div style="font-size: 11px; color: var(--gold-primary); margin-top: 2px;">
                 ${escapeAdminText([b.district, b.city].filter(Boolean).join(' / ') || t('ownerUi_075'))}${b.phone ? ' • ' + escapeAdminText(b.phone) : ''}
              </div>
              <div style="font-size: 10px; color: var(--text-muted); margin-top: 2px;">
                ${adminLabel('plan')}: ${escapeAdminText(b.plan || 'FREE')} ${isGranted ? t('uiRemaining_199') : ''} • ${t('uiRemaining_286')} ${isDiscoveryHidden ? t('staffUi_16') : t('staffUi_63')}
              </div>
            </div>
            <span class="badge ${isSuspended ? 'badge-pending' : 'badge-approved'}">${isSuspended ? t('uiRemaining_200') : t('ownerUi_163')}</span>
          </div>

          <button type="button" aria-expanded="${isExpanded}" class="btn btn-secondary admin-expand" style="width:100%;margin-top:10px;" onclick="window.toggleAdminSalonDetails('${b.businessId}')">${isExpanded ? t('uiRemaining_201') : t('uiRemaining_202')}</button>
          ${isExpanded ? `<div class="admin-salon-actions" style="display: flex; gap: 6px; margin-top: 10px; flex-wrap: wrap;">
            <button onclick="window.openSalonDetailsModalAdmin('${b.businessId}')" class="btn btn-gold" style="flex: 1; font-size: 10px; padding: 4px 8px;">
               ${t('uiRemaining_203')}
            </button>
            <button onclick="window.enterSupportViewingMode('${b.businessId}')" class="btn btn-outline-gold" style="flex: 1; font-size: 10px; padding: 4px 8px;">
               ${t('uiRemaining_204')}
            </button>
            <button onclick="window.toggleSalonSuspensionAdmin('${b.businessId}', ${!isSuspended})" class="btn btn-secondary" style="flex: 1; font-size: 10px; padding: 4px 8px; border-color: ${isSuspended ? '#22c55e' : '#ef4444'}; color: ${isSuspended ? 'var(--theme-copy-22c55e, #22c55e)' : 'var(--theme-copy-ef4444, #ef4444)'};">
              ${isSuspended ? t('ownerUi_140') : t('uiRemaining_205')}
            </button>
            <button onclick="window.toggleSalonDiscoveryAdmin('${b.businessId}', ${isDiscoveryHidden})" class="btn btn-secondary" style="flex: 1; font-size: 10px; padding: 4px 8px;">
              ${isDiscoveryHidden ? t('uiRemaining_206') : t('uiRemaining_207')}
            </button>
          </div>` : ''}
        </div>
      `;
    }).join('');

    mainHtml = `
      <div class="card animate-fade">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <h3 style="font-size: 16px; font-weight: 800; color: var(--gold-primary); margin: 0;"> ${t('uiRemaining_208')}${filteredSalons.length})</h3>
        </div>

        <div style="display: flex; gap: 4px; margin-bottom: 12px;">
          <button onclick="window.setSalonFilter('all')" class="btn ${salonFilterState === 'all' ? 'btn-gold' : 'btn-secondary'}" style="flex: 1; font-size: 11px; padding: 6px;">${t('uiRemaining_209')}${manageableBusinesses.length})</button>
          <button onclick="window.setSalonFilter('active')" class="btn ${salonFilterState === 'active' ? 'btn-gold' : 'btn-secondary'}" style="flex: 1; font-size: 11px; padding: 6px;">${t('uiRemaining_210')}${activeBusinesses.length})</button>
          <button onclick="window.setSalonFilter('suspended')" class="btn ${salonFilterState === 'suspended' ? 'btn-gold' : 'btn-secondary'}" style="flex: 1; font-size: 11px; padding: 6px;">${t('uiRemaining_211')}${suspendedBusinesses.length})</button>
        </div>

        <form class="admin-search" onsubmit="event.preventDefault(); window.searchAdminSalons(this.elements.salonSearch.value)" style="display:flex;gap:7px;margin-bottom:12px;">
          <input aria-label="${t('uiRemaining_212')}" name="salonSearch" value="${escapeAdminText(salonSearchQuery)}" placeholder="${t('uiRemaining_212')}" autocomplete="off" style="flex:1;min-width:0;background:var(--bg-input,var(--theme-panel-0b1020, #0b1020));border:1px solid var(--border-color);border-radius:12px;color:var(--theme-ink-ffffff, #fff);padding:10px 12px;font-size:11px;">
          <button type="submit" class="btn btn-gold" style="padding:8px 12px;font-size:11px;"> ${t('uiRemaining_311')}</button>
          ${salonSearchQuery ? `<button type="button" onclick="window.clearAdminSalonSearch()" class="btn btn-secondary" style="padding:8px 10px;font-size:11px;">${t('uiRemaining_312')}</button>` : ''}
        </form>

        <select aria-label="${t('uiRemaining_213')}" class="input-field" onchange="window.setAdminSalonCity(this.value)" style="margin-bottom:12px;">
          <option value="all">${t('uiRemaining_213')}</option>
          ${adminCities.map(city => `<option value="${escapeAdminText(city)}" ${salonCityFilter === city ? 'selected' : ''}>${escapeAdminText(city)}</option>`).join('')}
        </select>
        ${salonSearchQuery && normalizeAdminSearch(salonSearchQuery).length < 2 ? `<div style="font-size:10px;color:var(--gold-primary);margin-bottom:10px;">${t('uiRemaining_215')}</div>` : ''}



        ${filteredSalons.length === 0 ? `<div style="font-size: 11px; color: var(--text-muted);">${t('uiRemaining_022')}</div>` : salonsHtml}
      </div>
    `;
  }
  // ==========================================
  // 3. BAŞVURULAR EKRANI (REQS 15-17)
  // ==========================================
  else if (activeAdminTab === 'applications') {
    let filteredApps = pendingApps;
    if (applicationFilterState === 'approved') filteredApps = approvedApps;
    if (applicationFilterState === 'rejected') filteredApps = rejectedApps;

    const appsHtml = filteredApps.map(a => `
      <div class="card card-gold animate-fade" style="padding: 14px; margin-bottom: 10px;">
        <div style="font-size: 14px; font-weight: 800; color: var(--theme-ink-ffffff, #fff);"> ${escapeAdminText(a.salonName)}</div>
        <div style="font-size: 11px; color: var(--gold-primary); margin-top: 2px;">
           Yetkili: ${escapeAdminText(a.ownerName || a.applicantName || a.displayName || t('ownerUi_075'))} •  ${escapeAdminText(a.phone || t('ownerUi_075'))} •  ${escapeAdminText([a.city, a.district].filter(value => value && value !== 'undefined').join(' / ') || t('ownerUi_075'))}
        </div>
        <div style="font-size: 10px; color: var(--text-muted); margin-top: 2px;">Tarih: ${escapeAdminText(a.createdAt ? String(a.createdAt).split('T')[0] : t('ownerUi_075'))}</div>

        ${a.status === 'pending' ? `
          <div style="display: flex; gap: 8px; margin-top: 10px;">
            <button onclick="window.approveSalonAppAdmin('${a.appId}')" class="btn btn-gold" style="flex: 1; font-size: 11px;">
               ${t('uiRemaining_216')}
            </button>
            <button onclick="window.rejectSalonAppAdmin('${a.appId}')" class="btn btn-secondary" style="flex: 1; font-size: 11px; border-color: #ef4444; color:var(--theme-copy-ef4444, #ef4444);">
               ${t('ownerUi_079')}
            </button>
          </div>
        ` : `<span class="badge ${a.status === 'approved' ? 'badge-approved' : 'badge-pending'}" style="margin-top: 8px;">${escapeAdminText(a.status === 'approved' ? t('approved') : a.status === 'rejected' ? t('rejected') : a.status)}</span>`}
      </div>
    `).join('');

    mainHtml = `
      <div class="card animate-fade">
        <h3 style="font-size: 16px; font-weight: 800; color: var(--gold-primary); margin-bottom: 12px;"> ${t('uiRemaining_217')}</h3>
        
        <div style="display: flex; gap: 4px; margin-bottom: 12px;">
          <button onclick="window.setAppFilter('pending')" class="btn ${applicationFilterState === 'pending' ? 'btn-gold' : 'btn-secondary'}" style="flex: 1; font-size: 11px; padding: 6px;">${t('uiRemaining_218')}${pendingApps.length})</button>
          <button onclick="window.setAppFilter('approved')" class="btn ${applicationFilterState === 'approved' ? 'btn-gold' : 'btn-secondary'}" style="flex: 1; font-size: 11px; padding: 6px;">${t('uiRemaining_219')}${approvedApps.length})</button>
          <button onclick="window.setAppFilter('rejected')" class="btn ${applicationFilterState === 'rejected' ? 'btn-gold' : 'btn-secondary'}" style="flex: 1; font-size: 11px; padding: 6px;">${t('uiRemaining_220')}${rejectedApps.length})</button>
        </div>

        ${filteredApps.length === 0 ? `<div class="admin-empty" style="display:flex;flex-direction:column;align-items:center;gap:8px;padding:28px 12px;text-align:center;color:var(--text-muted);font-size:12px;">${uiIcon('inbox')}<span>${t('uiRemaining_221')}</span></div>` : appsHtml}
      </div>
    `;
  }
  // ==========================================
  // 4. KULLANICILAR EKRANI (REQS 18-20)
  // ==========================================
  else if (activeAdminTab === 'users') {
    const ownerUsers = allUsers.filter(u => u && u.role === 'owner');
    const staffUsers = allUsers.filter(u => u && ['manager', 'barber', 'receptionist'].includes(u.role));
    const customerUsers = allUsers.filter(u => u && (!u.role || u.role === 'customer'));
    const roleGroups = { owner: ownerUsers, staff: staffUsers, customer: customerUsers };
    let filteredUsers = roleGroups[userRoleFilter] || ownerUsers;
    if (userSearchQuery) {
      const q = userSearchQuery.toLowerCase();
      filteredUsers = filteredUsers.filter(u => ((u.displayName || u.name || '').toLowerCase().includes(q) || (u.phone || '').includes(q)));
    }

    const usersHtml = filteredUsers.map(u => {
      const isDisabled = u.disabled === true;
      return `
        <div data-user-uid="${escapeAdminText(u.uid)}" class="card animate-fade" style="padding: 12px; margin-bottom: 8px; border-color: ${isDisabled ? '#ef4444' : 'var(--border-color)'};">
          <div style="min-width: 0;">
            <div style="font-size: 13px; font-weight: 800; color: var(--theme-ink-ffffff, #fff); overflow-wrap: anywhere;"> ${escapeAdminText(u.displayName || u.name || t('uiRemaining_222'))}</div>
            <div style="font-size: 11px; color: var(--gold-primary);"> ${escapeAdminText(u.phone || t('uiRemaining_187'))} • ${userRoleFilter === 'owner' ? t('ownerUi_011') : userRoleFilter === 'staff' ? t('staffUi_18') : t('staffUi_6')}</div>
          </div>
          <div class="admin-user-actions" style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 10px;">
            <button onclick="window.toggleUserDisableAdmin('${escapeAdminText(u.uid)}', ${!isDisabled})" class="btn btn-secondary" style="font-size: 11px; padding: 6px 8px; white-space: nowrap; border-color: ${isDisabled ? '#22c55e' : '#ef4444'}; color: ${isDisabled ? 'var(--theme-copy-22c55e, #22c55e)' : 'var(--theme-copy-ef4444, #ef4444)'};">
              ${isDisabled ? t('ownerUi_140') : t('uiRemaining_223')}
            </button>
            <button onclick="window.deleteUserAdmin('${escapeAdminText(u.uid)}')" class="btn btn-secondary" style="font-size: 11px; padding: 6px 8px; white-space: nowrap; border-color: #ef4444; color:var(--theme-copy-ef4444, #ef4444);">
              ${t('superAdminDeleteUser')}
            </button>
          </div>
        </div>
      `;
    }).join('');

    mainHtml = `
      <div class="card animate-fade">
        <h3 style="font-size: 16px; font-weight: 800; color: var(--gold-primary); margin-bottom: 12px;"> ${t('uiRemaining_224')}</h3>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-bottom: 12px;">
          <button onclick="window.setUserRoleFilter('owner')" class="btn ${userRoleFilter === 'owner' ? 'btn-gold' : 'btn-secondary'}" style="padding: 8px 4px; font-size: 10px;"> ${t('ownerUi_011')}<br>${ownerUsers.length}</button>
          <button onclick="window.setUserRoleFilter('staff')" class="btn ${userRoleFilter === 'staff' ? 'btn-gold' : 'btn-secondary'}" style="padding: 8px 4px; font-size: 10px;"> ${t('ownerUi_157')}<br>${staffUsers.length}</button>
          <button onclick="window.setUserRoleFilter('customer')" class="btn ${userRoleFilter === 'customer' ? 'btn-gold' : 'btn-secondary'}" style="padding: 8px 4px; font-size: 10px;"> ${t('ownerUi_008')}<br>${customerUsers.length}</button>
        </div>
        <input type="text" value="${userSearchQuery}" oninput="window.setUserSearchQuery(this.value)" class="input-field" placeholder="${t('uiRemaining_225')}" style="margin-bottom: 12px;">
        <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 8px;">${t('uiRemaining_226')} ${filteredUsers.length} ${t('uiRemaining_227')}</div>
        ${filteredUsers.length === 0 ? `<div style="font-size: 11px; color: var(--text-muted);">${t('uiRemaining_228')}</div>` : usersHtml}
      </div>
    `;
  }
  // ==========================================
  // 5. YÖNETİM MENÜSÜ & 6 KAPALI KART (REQS 21-28)
  // ==========================================
  else if (activeAdminTab === 'management') {
    mainHtml = `
      <div class="card animate-fade">
        <h3 style="font-size: 16px; font-weight: 800; color: var(--gold-primary); margin-bottom: 12px;"> ${t('uiRemaining_229')}</h3>
        
        <div style="display: flex; flex-direction: column; gap: 10px;">
          <div onclick="window.openPlatformRevenueModal()" class="card animate-fade" style="padding: 14px; cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
            <h4 style="font-size: 14px; font-weight: 800; color: var(--theme-ink-ffffff, #fff); margin: 0;"> ${t('uiRemaining_230')}</h4>
            <span class="badge badge-approved">${t('uiRemaining_231')}</span>
          </div>

          <div onclick="window.openGrantManagementModal()" class="card animate-fade" style="padding: 14px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; border-color: var(--gold-primary);">
            <div>
              <h4 style="font-size: 14px; font-weight: 800; color: var(--theme-ink-ffffff, #fff); margin: 0;"> ${t('uiRemaining_232')}</h4>
              <div style="font-size: 10px; color: var(--gold-primary); margin-top: 2px;">${t('uiRemaining_233')} ${grantedSalons.length} ${t('uiRemaining_234')}</div>
            </div>
            <span class="badge badge-approved">${t('uiRemaining_235')}</span>
          </div>

          <div onclick="window.openAiTelemetryModal()" class="card animate-fade" style="padding: 14px; cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
            <h4 style="font-size: 14px; font-weight: 800; color: var(--theme-ink-ffffff, #fff); margin: 0;"> ${t('uiRemaining_236')}</h4>
            <span class="badge badge-approved">${t('uiRemaining_237')}</span>
          </div>

          <div onclick="window.openAuditLogModal()" class="card animate-fade" style="padding: 14px; cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
            <h4 style="font-size: 14px; font-weight: 800; color: var(--theme-ink-ffffff, #fff); margin: 0;"> ${t('uiRemaining_238')}</h4>
            <span class="badge badge-approved">${t('uiRemaining_239')}</span>
          </div>

          <div onclick="window.switchAdminTab('salons')" class="card animate-fade" style="padding: 14px; cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
            <h4 style="font-size: 14px; font-weight: 800; color: var(--theme-ink-ffffff, #fff); margin: 0;"> ${t('uiRemaining_240')}</h4>
            <span class="badge badge-approved">${t('uiRemaining_241')}</span>
          </div>

          <button onclick="window.promptAdminLogout()" class="btn btn-secondary" style="width: 100%; min-height: 46px; border-color: #ef4444; color:var(--theme-copy-ef4444, #ef4444); font-weight: 800;">
             ${t('ownerUi_321')}
          </button>
        </div>
      </div>
    `;
  }
  // ==========================================
  // 6. SÜPER ADMIN PROFİLİ (REQS 31-32)
  // ==========================================
  else if (activeAdminTab === 'profile') {
    mainHtml = `
      <div class="card animate-fade" style="padding: 20px;">
        <div style="text-align: center; margin-bottom: 16px;">
          <div style="width: 72px; height: 72px; border-radius: 50%; background: var(--gold-gradient); display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: 900; color: var(--theme-on-accent, #000); margin: 0 auto;">
            ${uiIcon('shield', 'ui-icon--large', t('uiRemaining_245'))}
          </div>
          <h3 style="font-size: 16px; font-weight: 800; color: var(--theme-ink-ffffff, #fff); margin-top: 8px;">${displayName}</h3>
          <div style="font-size: 12px; color: var(--gold-primary); font-weight: 700;"> ${t('uiRemaining_242')} ${user.phone}</div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 8px;">
          <button onclick="window.openAppSettings()" class="btn btn-secondary app-settings-entry" style="width:100%;text-align:left;min-height:44px;">Ayarlar · Tema ve görünüm</button>
          <button onclick="window.openSuperAdminNotificationSettingsModal()" class="btn btn-secondary" style="width: 100%; text-align: left; padding: 12px;">
             ${t('uiRemaining_243')}
          </button>
          <button onclick="window.promptAdminLogout()" class="btn btn-secondary" style="width: 100%; margin-top: 10px; min-height: 42px; border-color: #ef4444; color:var(--theme-copy-ef4444, #ef4444);">
             ${t('uiRemaining_244')}
          </button>
        </div>
      </div>
    `;
  }

  // CONTAINER & BOTTOM NAV (REQ 2)
  container.innerHTML = `
    <section class="super-admin-shell"><div class="header-bar">
      <div style="display: flex; align-items: center; gap: 8px;">
        <img src="./assets/images/unelivo-placeholder.svg" style="height: 24px; width: auto;" alt="${t('ownerUi_095')}">
        <span style="font-size: 12px; font-weight: 800; color: var(--gold-primary);">${t('superAdminTitle')}</span>
      </div>
      <button type="button" class="btn btn-secondary admin-profile" aria-label="${t('superAdminTitle')}" onclick="window.switchAdminTab('profile')">${uiIcon('user')}</button>
    </div>

    <main class="admin-content" data-admin-tab="${activeAdminTab}">${mainHtml}</main>

    <nav class="bottom-nav">
      <button onclick="window.switchAdminTab('dashboard', null, true)" class="nav-item ${activeAdminTab === 'dashboard' ? 'active' : ''}" data-nav-bounce-tab="dashboard">
        <span class="icon nav-bounce-icon">${uiIcon('home')}</span>
        <span>${t('staffUi_64')}</span>
      </button>
      <button onclick="window.switchAdminTab('salons', null, true)" class="nav-item ${activeAdminTab === 'salons' ? 'active' : ''}" data-nav-bounce-tab="salons">
        <span class="icon nav-bounce-icon">${uiIcon('store')}</span>
        <span>${t('salonsTabAdmin')}</span>
      </button>
      <button onclick="window.switchAdminTab('applications', null, true)" class="nav-item ${activeAdminTab === 'applications' ? 'active' : ''}" data-nav-bounce-tab="applications">
        <span class="icon nav-bounce-icon">${uiIcon('file')}</span>
        <span>${t('applicationsTabAdmin')}</span>
      </button>
      <button onclick="window.switchAdminTab('users', null, true)" class="nav-item ${activeAdminTab === 'users' ? 'active' : ''}" data-nav-bounce-tab="users">
        <span class="icon nav-bounce-icon">${uiIcon('users')}</span>
        <span>${t('usersTabAdmin')}</span>
      </button>
      <button onclick="window.switchAdminTab('management', null, true)" class="nav-item ${activeAdminTab === 'management' ? 'active' : ''}" data-nav-bounce-tab="management">
        <span class="icon nav-bounce-icon">${uiIcon('settings')}</span>
        <span>${t('managementTabAdmin')}</span>
      </button>
    </nav></section>
  `;

  container.querySelectorAll('.super-admin-shell .card[onclick]').forEach(card => {
    card.setAttribute('role', 'button');
    card.tabIndex = 0;
    card.addEventListener('keydown', event => {
      if (event.target === card && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        card.click();
      }
    });
  });

  // GLOBAL STATE HANDLERS
  window.switchAdminTab = async (tab, filter = null, animateTouchNav = false) => {
    activeAdminTab = tab;
    if (tab === 'salons' && filter) salonFilterState = filter;
    if (tab === 'applications' && filter) applicationFilterState = filter;
    await renderSuperAdminScreen(user, onTabChange);
    triggerTouchNavIconBounce(tab, animateTouchNav);
  };

  window.setSalonFilter = (filter) => {
    salonFilterState = filter;
    renderSuperAdminScreen(user, onTabChange);
  };

  window.setAppFilter = (filter) => {
    applicationFilterState = filter;
    renderSuperAdminScreen(user, onTabChange);
  };

  window.setUserSearchQuery = (q) => {
    userSearchQuery = q;
    scheduleAdminSearchRender(user, onTabChange);
  };

  window.enterSupportViewingMode = (businessId) => {
    supportViewBusinessId = businessId;
    renderSuperAdminScreen(user, onTabChange);
  };

  // SALON SUSPENSION WITH VIP CONFIRMATION (REQS 12 & 13)
  window.toggleSalonSuspensionAdmin = async (businessId, suspend) => {
    showConfirmModal(t('uiRemaining_246'), suspend ? t('uiRemaining_247') : t('uiRemaining_248'), async () => {
      try {
        const response = await authenticatedFetch('/api/salon/toggle-status', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ businessId, action: suspend ? 'suspend' : 'reactivate', superAdminUid: user.uid }) });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || t('uiRemaining_249'));
        showSuccessModal(t('successTitle'), suspend ? t('uiRemaining_250') : t('uiRemaining_251'));
        renderSuperAdminScreen(user, onTabChange);
      } catch (error) { showErrorModal(t('errorTitle'), error.message || t('uiRemaining_249')); }
    });
  };

  window.searchAdminSalons = (query) => {
    salonSearchQuery = String(query || '').trim();
    scheduleAdminSearchRender(user, onTabChange);
  };

  window.clearAdminSalonSearch = () => {
    salonSearchQuery = '';
    if (adminSearchRenderTimer) clearTimeout(adminSearchRenderTimer);
    renderSuperAdminScreen(user, onTabChange);
  };

  window.setAdminSalonCity = city => {
    salonCityFilter = city || 'all';
    renderSuperAdminScreen(user, onTabChange);
  };

  window.toggleAdminSalonDetails = businessId => {
    expandedAdminSalonId = expandedAdminSalonId === businessId ? null : businessId;
    renderSuperAdminScreen(user, onTabChange);
  };

  // SALON DISCOVERY TOGGLE (REQ 14)
  window.toggleSalonDiscoveryAdmin = async (businessId, enabled) => {
    try {
      const response = await authenticatedFetch('/api/salon/toggle-discovery', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ businessId, hiddenFromDiscovery: !enabled, superAdminUid: user.uid }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || t('uiRemaining_252'));
      showSuccessModal(t('successTitle'), enabled ? t('uiRemaining_253') : t('uiRemaining_254'));
      renderSuperAdminScreen(user, onTabChange);
    } catch (error) { showErrorModal(t('errorTitle'), error.message || t('uiRemaining_252')); }
  };

  // SALON APPROVAL & REJECTION (REQS 16 & 17)
  window.approveSalonAppAdmin = async (appId) => {
    const res = await approveSalonApplication(appId);
    if (res && res.success) {
      showSuccessModal(t('successTitle'), t('uiRemaining_255'));
      renderSuperAdminScreen(user, onTabChange);
    } else {
      showErrorModal(t('errorTitle'), (res && res.error) ? res.error : t('uiRemaining_256'));
    }
  };

  window.rejectSalonAppAdmin = async (appId) => {
    showConfirmModal(t('uiRemaining_257'), t('uiRemaining_258'), async () => {
      await saveRecord(`salon_applications/${appId}/status`, 'rejected', 'PUT');
      showSuccessModal(t('successTitle'), t('uiRemaining_259'));
      renderSuperAdminScreen(user, onTabChange);
    });
  };

  // USER DISABLE / ENABLE (REQ 19)
  window.toggleUserDisableAdmin = async (targetUid, disable) => {
    showConfirmModal(t('uiRemaining_260'), disable ? t('uiRemaining_261') : t('uiRemaining_262'), async () => {
      const response = await authenticatedFetch('/api/user/toggle-status', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targetUid, action: disable ? 'disable' : 'enable', superAdminUid: user.uid }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || t('uiRemaining_313'));
      showSuccessModal(t('successTitle'), disable ? t('uiRemaining_263') : t('uiRemaining_264'));
      await renderSuperAdminScreen(user, onTabChange);
    });
  };

  // Explicit confirmation for permanent Auth/profile erasure.
  window.deleteUserAdmin = async targetUid => {
    if (!targetUid || targetUid === user.uid) {
      showErrorModal(t('errorTitle'), t('superAdminDeleteOwnAccountDenied'));
      return;
    }
    showConfirmModal(t('superAdminDeleteUser'), t('superAdminDeleteUserConfirm'), async () => {
      const response = await authenticatedFetch('/api/user/toggle-status', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targetUid, action: 'delete', superAdminUid: user.uid }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.success !== true || data.hardDeleted !== true) throw new Error(data.error || t('superAdminDeleteUserFailed'));
      invalidateDbCache();
      document.querySelectorAll('[data-user-uid]').forEach(row => { if (row.dataset.userUid === targetUid) row.remove(); });
      showSuccessToast(t('superAdminDeleteUserSuccess'));
    });
  };

  // MAX 2 FREE PREMIUM GRANT MANAGEMENT (REQS 22-24)
  window.openGrantManagementModal = () => {
    const root = document.getElementById('modal-root');
    if (!root) return;

    const availableSalons = allBusinesses.filter(b => b && b.premiumSource !== 'super_admin_grant');

    root.innerHTML = `
      <div class="modal-overlay" onclick="window.closeModal()">
        <div class="modal-card animate-fade admin-modal" onclick="event.stopPropagation()">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
            <h3 style="font-size: 15px; font-weight: 800; color: var(--gold-primary); margin: 0;"> ${t('uiRemaining_232')}</h3>
            <button aria-label="${t('ownerUi_099')}" onclick="window.closeModal()" class="btn btn-secondary" style="padding: 4px 10px;">${uiIcon('x')}</button>
          </div>

          <div style="font-size: 13px; font-weight: 800; color: var(--theme-ink-ffffff, #fff); background: rgba(245,158,11,0.1); padding: 10px; border-radius: 8px; text-align: center; margin-bottom: 12px;">
            ${t('uiRemaining_265')} ${grantedSalons.length} ${t('uiRemaining_234')}
          </div>

          <div style="margin-bottom: 14px;">
            <h4 style="font-size: 12px; font-weight: 800; color: var(--gold-primary); margin-bottom: 6px;">${t('uiRemaining_266')}</h4>
            ${grantedSalons.length === 0 ? `<div style="font-size: 11px; color: var(--text-muted);">${t('uiRemaining_267')}</div>` : grantedSalons.map(b => `
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px dashed rgba(255,255,255,0.1);">
                <span style="font-size: 12px; color: var(--theme-ink-ffffff, #fff);"> ${b.name}</span>
                <button onclick="window.revokeGrantAdmin('${b.businessId}')" class="btn btn-secondary" style="font-size: 10px; padding: 4px 8px; color:var(--theme-copy-ef4444, #ef4444); border-color: #ef4444;">${t('uiRemaining_268')}</button>
              </div>
            `).join('')}
          </div>

          ${grantedSalons.length < 2 ? `
            <label style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">${t('uiRemaining_269')}</label>
            <select id="grant-salon-select" class="input-field" style="margin-top: 4px; margin-bottom: 12px;">
              ${availableSalons.map(b => `<option value="${b.businessId}"> ${b.name} (${b.city})</option>`).join('')}
            </select>
            <button onclick="window.applyGrantAdmin()" class="btn btn-gold" style="width: 100%;"> ${t('uiRemaining_270')}</button>
          ` : `
            <div style="font-size: 11px; color:var(--theme-copy-ef4444, #ef4444); text-align: center; font-weight: 700;"> ${t('uiRemaining_271')}</div>
          `}
        </div>
      </div>
    `;
  };

  window.applyGrantAdmin = async () => {
    if (grantedSalons.length >= 2) {
      showErrorModal(t('errorTitle'), t('uiRemaining_272'));
      return;
    }

    const select = document.getElementById('grant-salon-select');
    const targetBizId = select ? select.value : null;
    if (!targetBizId) return;

    await saveRecord(`businesses/${targetBizId}/plan`, 'PREMIUM', 'PUT');
    await saveRecord(`businesses/${targetBizId}/premiumSource`, 'super_admin_grant', 'PUT');

    window.closeModal();
    showSuccessModal(t('successTitle'), t('uiRemaining_273'));
    renderSuperAdminScreen(user, onTabChange);
  };

  window.revokeGrantAdmin = async (targetBizId) => {
    await saveRecord(`businesses/${targetBizId}/plan`, 'FREE', 'PUT');
    await saveRecord(`businesses/${targetBizId}/premiumSource`, null, 'PUT');

    window.closeModal();
    showSuccessModal(t('successTitle'), t('uiRemaining_274'));
    renderSuperAdminScreen(user, onTabChange);
  };

  // AUDIT LOG MODAL (REQ 28)
  window.openAuditLogModal = async () => {
    const root = document.getElementById('modal-root');
    if (!root) return;

    const logsData = await fetchRecord('audit_logs') || {};
    const logs = Object.values(logsData).filter(Boolean).sort((a, b) => String(b.createdAt || b.timestamp || '').localeCompare(String(a.createdAt || a.timestamp || '')));
    const businessNames = new Map(allBusinesses.map(business => [business.businessId, business.name || t('uiRemaining_198')]));
    const userNames = new Map(allUsers.map(account => [account.uid, account.displayName || account.name || account.phone || t('uiRemaining_275')]));

    root.innerHTML = `
      <div class="modal-overlay" onclick="window.closeModal()">
        <div class="modal-card animate-fade admin-modal" onclick="event.stopPropagation()" style="max-height: 85vh; overflow-y: auto;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
            <h3 style="font-size: 15px; font-weight: 800; color: var(--gold-primary); margin: 0;"> ${t('uiRemaining_276')}</h3>
            <button aria-label="${t('ownerUi_099')}" onclick="window.closeModal()" class="btn btn-secondary" style="padding: 4px 10px;">${uiIcon('x')}</button>
          </div>

          <div>
            ${logs.length === 0 ? `<div style="font-size: 11px; color: var(--text-muted);">${t('uiRemaining_277')}</div>` : logs.map(l => `
              <details class="card admin-audit-row" style="font-size:11px;color:var(--theme-ink-ffffff, #fff);padding:10px;margin-bottom:7px;">
                <summary><strong>${escapeAdminText(t(AUDIT_ACTION_LABELS[l.action] || 'uiRemaining_279'))}</strong><span>${escapeAdminText(formatAdminDate(l.createdAt || l.timestamp))}</span></summary>
                <div style="margin-top:7px;">${adminLabel('salon')}: ${escapeAdminText(businessNames.get(l.targetId || l.businessId) || t('uiRemaining_280'))}</div>
                <div style="font-size:9px;color:var(--text-muted);margin-top:3px;">${t('uiRemaining_278')} ${escapeAdminText(userNames.get(l.actorUid) || t('uiRemaining_275'))}</div>
                ${l.metadata && (l.metadata.before || l.metadata.after) ? `<div class="admin-audit-changes"><div><strong>${adminLabel('before')}</strong><pre>${escapeAdminText(JSON.stringify(l.metadata.before ?? null, null, 2))}</pre></div><div><strong>${adminLabel('after')}</strong><pre>${escapeAdminText(JSON.stringify(l.metadata.after ?? null, null, 2))}</pre></div></div>` : ''}
              </details>
            `).join('')}
          </div>

          <button onclick="window.closeModal()" class="btn btn-gold" style="width: 100%; margin-top: 10px;">${t('ownerUi_099')}</button>
        </div>
      </div>
    `;
  };

  // PLATFORM REVENUE MODAL (REQ 9)
  window.openPlatformRevenueModal = () => {
    const root = document.getElementById('modal-root');
    if (!root) return;

    root.innerHTML = `
      <div class="modal-overlay" onclick="window.closeModal()">
        <div class="modal-card animate-fade admin-modal" onclick="event.stopPropagation()">
          <h3 style="font-size: 15px; font-weight: 800; color: var(--gold-primary); margin-bottom: 12px;"> ${t('uiRemaining_281')}</h3>
          <div style="font-size: 22px; font-weight: 900; color:var(--theme-copy-22c55e, #22c55e); text-align: center; margin-bottom: 8px;">—</div>
          <div style="font-size: 11px; color:var(--theme-copy-eab308, #eab308); text-align: center; background: rgba(234,179,8,0.1); padding: 8px; border-radius: 6px; margin-bottom: 14px;">
             ${t('uiRemaining_282')}
          </div>
          <button onclick="window.closeModal()" class="btn btn-gold" style="width: 100%;">${t('ownerUi_099')}</button>
        </div>
      </div>
    `;
  };

  // SALON DETAILS MODAL ADMIN (REQ 11)
  window.openSalonDetailsModalAdmin = (bizId) => {
    const b = allBusinesses.find(business => business.businessId === bizId);
    if (!b) return;
    const root = document.getElementById('modal-root');
    if (!root) return;

    root.innerHTML = `
      <div class="modal-overlay" onclick="window.closeModal()">
        <div class="modal-card animate-fade admin-modal" onclick="event.stopPropagation()" style="max-height:88vh;overflow-y:auto;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;"><h3 style="font-size:15px;font-weight:800;color:var(--gold-primary);margin:0;"> ${escapeAdminText(b.name)} ${t('uiRemaining_283')}</h3><button aria-label="${t('ownerUi_099')}" onclick="window.closeModal()" class="btn btn-secondary">${uiIcon('x')}</button></div>
          <div class="card" style="font-size:12px;color:var(--theme-ink-ffffff, #fff);margin-bottom:12px;padding:12px;line-height:1.8;">
            <div><strong>ID:</strong> ${escapeAdminText(b.businessId)}</div><div><strong>${t('uiRemaining_284')}</strong> ${escapeAdminText(b.ownerUid || t('uiRemaining_289'))}</div>
            <div><strong>${t('uiRemaining_285')}</strong> ${escapeAdminText(b.city || '')} / ${escapeAdminText(b.district || '')}</div><div><strong>${adminLabel('address')}:</strong> ${escapeAdminText(b.address || t('uiRemaining_289'))}</div>
            <div><strong>${adminLabel('phone')}:</strong> ${escapeAdminText(b.phone || t('uiRemaining_289'))}</div><div><strong>WhatsApp:</strong> ${escapeAdminText(b.whatsappPhone || t('uiRemaining_289'))}</div>
            <div><strong>${adminLabel('plan')}:</strong> ${escapeAdminText(b.plan || 'FREE')}</div><div><strong>${adminLabel('status')}:</strong> ${b.status === 'suspended' ? t('uiRemaining_200') : t('ownerUi_163')}</div><div><strong>${t('uiRemaining_286')}</strong> ${b.discoveryEnabled === false || b.hiddenFromDiscovery === true ? t('staffUi_16') : t('uiRemaining_290')}</div>
            <div><strong>${t('uiRemaining_287')}</strong> ${b.bookingEnabled === false ? t('staffUi_16') : t('staffUi_63')}</div><div><strong>${t('uiRemaining_288')}</strong> ${Object.keys(b.services || {}).length} / ${Object.keys(b.staff || {}).length}</div>
          </div>
          <button onclick="window.closeModal()" class="btn btn-gold" style="width: 100%;">${t('ownerUi_099')}</button>
        </div>
      </div>
    `;
  };

  window.promptAdminLogout = () => {
    const root = document.getElementById('modal-root');
    if (!root) return;

    root.innerHTML = `
      <div class="modal-overlay" onclick="window.closeModal()">
        <div class="modal-card animate-fade admin-modal" onclick="event.stopPropagation()" style="border-color: var(--gold-primary); text-align: center; padding: 24px;">
          <div style="font-size: 40px; margin-bottom: 8px;"></div>
          <h3 style="font-size: 16px; font-weight: 800; color: var(--theme-ink-ffffff, #fff); margin-bottom: 6px;">${t('ownerUi_321')}</h3>
          <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 18px;">${t('uiRemaining_291')}</p>
          <div style="display: flex; gap: 10px;">
            <button onclick="window.confirmAdminLogout(this)" class="btn btn-gold" style="flex: 1; min-height: 42px;">${t('uiRemaining_313')}</button>
            <button onclick="window.closeModal()" class="btn btn-secondary" style="flex: 1; min-height: 42px;">${t('uiRemaining_292')}</button>
          </div>
        </div>
      </div>
    `;
  };

  window.setUserRoleFilter = (filter) => {
    userRoleFilter = filter;
    userSearchQuery = '';
    renderSuperAdminScreen(user, onTabChange);
  };

  window.confirmAdminLogout = async (button) => {
    if (button) button.disabled = true;
    ++adminRenderSequence;
    if(adminSearchRenderTimer)clearTimeout(adminSearchRenderTimer);
    adminSearchRenderTimer=null;
    await logoutUserSession();
    supportViewBusinessId = null;
    activeAdminTab = 'dashboard';
    window.closeModal();
    if (typeof onTabChange === 'function') onTabChange(null);
  };
}
