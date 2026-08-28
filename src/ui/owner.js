/* EZO STİLE v2 - Salon Owner Panel (Ana Sayfa, Advanced Ciro Analytics, Persistent Manual Draft, Freeze-Free Toggle, Salon Image Editor, Package UX, Master Notifications) */
import { getAppointmentsForBusiness, fetchRecord, saveRecord, getServices, saveService, getStaffList, saveStaff } from '../db.js';
import { canAccessStaffRevenueAnalytics } from '../permissions.js';
import { SUPPORTED_LANGUAGES, isRtl, t } from '../config.js';
import { showSuccessModal, showErrorModal, showConfirmModal } from './portal.js';
import { logoutUserSession } from '../auth.js';

let activeOwnerTab = 'dashboard'; // 'dashboard', 'ciro', 'appointments', 'management', 'profile'
let activeAptView = 'menu'; // 'menu', 'pending', 'approved', 'completed', 'requests', 'cancelled_rejected', 'bugun'
let ciroTimeframe = 'day'; // 'day', 'week', 'month', 'history'
let selectedCiroDate = new Date().toISOString().split('T')[0];

let isSavingBookingToggle = false; // Freeze-free async lock guard

// MODULE-LEVEL SINGLE SOURCE OF TRUTH STATE FOR MANUAL BOOKING DRAFT
let manualBookingDraft = {
  customerName: '',
  customerPhone: '',
  serviceId: null,
  serviceName: null,
  servicePrice: 0,
  serviceDuration: 30,
  staffId: 'staff-any',
  staffName: 'Fark Etmez',
  date: new Date().toISOString().split('T')[0],
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
  return parseInt(apt.servicePriceSnapshot || apt.servicePrice) || 350;
}

function getAptServiceName(apt) {
  return apt.serviceNameSnapshot || apt.serviceName || 'Hizmet';
}

export async function renderOwnerScreen(user, onTabChange) {
  const container = document.getElementById('app-container');
  if (!container) return;

  const currentLang = user.language || 'tr';
  const rtl = isRtl(currentLang);
  document.documentElement.dir = rtl ? 'rtl' : 'ltr';

  const businessId = user.businessId || 'biz_merkez_salon';
  const bizRecord = await fetchRecord(`businesses/${businessId}`) || { name: 'EZO Salon', plan: 'FREE', bookingEnabled: true };
  const allApts = await getAppointmentsForBusiness(businessId);
  const staffList = await getStaffList(businessId);
  const services = await getServices(businessId);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayApts = allApts.filter(a => a && a.date === todayStr);

  const todayApprovedUpcoming = todayApts.filter(a => a && (a.status === 'approved' || a.status === 'completed'));
  const pendingRequests = allApts.filter(a => a && a.status === 'pending');
  const completedApts = allApts.filter(a => a && a.status === 'completed');
  const todayCompleted = todayApts.filter(a => a && a.status === 'completed');

  // AUTHORITATIVE TODAY REVENUE (COMPLETED ONLY)
  const todayRevenue = todayCompleted.reduce((sum, a) => sum + getAptPrice(a), 0);

  // USER AVATAR & INITIALS
  const displayName = user.displayName || user.name || 'Patron';
  const nameParts = displayName.trim().split(' ');
  const initials = nameParts.length >= 2
    ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
    : displayName.substring(0, 2).toUpperCase();

  let mainHtml = '';

  // ==========================================
  // 1. PATRON ANA SAYFA
  // ==========================================
  if (activeOwnerTab === 'dashboard') {
    const isBookingOpen = bizRecord.bookingEnabled !== false;

    mainHtml = `
      <div class="card card-gold animate-fade" style="padding: 16px; margin-bottom: 14px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <h3 style="font-size: 16px; font-weight: 800; color: #fff;">💈 ${bizRecord.name}</h3>
            <div style="font-size: 11px; color: var(--gold-primary);">👑 ${t('homeTab', currentLang)} • Paket: ${bizRecord.plan || 'FREE'} ${bizRecord.premiumSource === 'super_admin_grant' ? '(⚡ Premium Grant)' : ''}</div>
          </div>
          <span id="booking-status-badge" class="badge ${isBookingOpen ? 'badge-approved' : 'badge-pending'}" style="font-size: 10px;">
            ${isBookingOpen ? '🟢 Randevuya Açık' : '🔴 Kapalı'}
          </span>
        </div>
      </div>

      <!-- 4 INTERACTIVE DASHBOARD KPI CARDS -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 14px;">
        <div class="card animate-fade" style="padding: 14px; text-align: center; cursor: pointer; border-color: var(--gold-primary);" onclick="window.switchOwnerTab('appointments', 'bugun')">
          <div style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">📅 ${t('todayBookings', currentLang)}</div>
          <div style="font-size: 24px; font-weight: 900; color: #fff; margin-top: 4px;">${todayApprovedUpcoming.length}</div>
          <div style="font-size: 9px; color: var(--text-muted); margin-top: 4px;">Randevuları Aç →</div>
        </div>

        <div class="card animate-fade" style="padding: 14px; text-align: center; cursor: pointer;" onclick="window.switchOwnerTab('appointments', 'pending')">
          <div style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">⏳ ${t('pendingRequests', currentLang)}</div>
          <div style="font-size: 24px; font-weight: 900; color: var(--gold-primary); margin-top: 4px;">${pendingRequests.length}</div>
          <div style="font-size: 9px; color: var(--text-muted); margin-top: 4px;">Bekleyenleri Gör →</div>
        </div>

        <div class="card animate-fade" style="padding: 14px; text-align: center; cursor: pointer;" onclick="window.switchOwnerTab('appointments', 'completed')">
          <div style="font-size: 11px; color: #22c55e; font-weight: 700;">✅ ${t('completedBookings', currentLang)}</div>
          <div style="font-size: 24px; font-weight: 900; color: #22c55e; margin-top: 4px;">${completedApts.length}</div>
          <div style="font-size: 9px; color: var(--text-muted); margin-top: 4px;">Tamamlananlar →</div>
        </div>

        <div class="card animate-fade" style="padding: 14px; text-align: center; cursor: pointer;" onclick="window.switchOwnerTab('ciro', 'day')">
          <div style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">💰 ${t('todayRevenue', currentLang)}</div>
          <div style="font-size: 22px; font-weight: 900; color: #fff; margin-top: 4px;">${todayRevenue} TL</div>
          <div style="font-size: 9px; color: var(--text-muted); margin-top: 4px;">Ciro Detayı →</div>
        </div>
      </div>

      <!-- QUICK ACTIONS -->
      <div class="card animate-fade" style="padding: 16px; margin-bottom: 14px;">
        <h4 style="font-size: 13px; font-weight: 800; color: var(--gold-primary); margin-bottom: 10px;">🚀 Hızlı İşlemler</h4>
        
        <div style="display: flex; flex-direction: column; gap: 10px;">
          <button onclick="window.openManualBookingModal()" class="btn btn-gold" style="width: 100%; min-height: 42px; font-size: 13px; font-weight: 800;">
            ➕ Manuel Randevu Ekle (Müşteri UX)
          </button>

          <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: rgba(255,255,255,0.05); border-radius: 8px;">
            <div>
              <div style="font-size: 12px; font-weight: 800; color: #fff;">Online Randevu Sistemi</div>
              <div style="font-size: 10px; color: var(--text-muted);">${isBookingOpen ? 'Müşteriler online randevu alabilir' : 'Online randevu alımı kapalıdır'}</div>
            </div>
            <button id="btn-toggle-booking-system" onclick="window.toggleBookingSystemEnabled(${!isBookingOpen})" class="btn ${isBookingOpen ? 'btn-secondary' : 'btn-gold'}" style="padding: 6px 12px; font-size: 11px;">
              ${isBookingOpen ? '🔴 Randevuyu Kapat' : '🟢 Randevuyu Aç'}
            </button>
          </div>
        </div>
      </div>
    `;
  }
  // ==========================================
  // 2. ADVANCED CİRO EKRANI
  // ==========================================
  else if (activeOwnerTab === 'ciro') {
    let ciroBodyHtml = '';

    if (ciroTimeframe === 'day') {
      const dayApts = allApts.filter(a => a && a.date === selectedCiroDate);
      const dayCompleted = dayApts.filter(a => a && a.status === 'completed');
      const dayCancelled = dayApts.filter(a => a && (a.status === 'cancelled' || a.status === 'rejected'));
      const dayNoShow = dayApts.filter(a => a && a.status === 'no_show');

      const totalRevenue = dayCompleted.reduce((sum, a) => sum + getAptPrice(a), 0);
      const cancelledLostRevenue = dayCancelled.reduce((sum, a) => sum + getAptPrice(a), 0);
      const noShowLostRevenue = dayNoShow.reduce((sum, a) => sum + getAptPrice(a), 0);
      const totalLostRevenue = cancelledLostRevenue + noShowLostRevenue;

      const completedCount = dayCompleted.length;
      const uniqueCustomers = new Set(dayCompleted.map(a => a.customerPhone || a.customerUid)).size;

      const completedRowsHtml = dayCompleted.map(a => `
        <div class="card" style="padding: 10px; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-size: 12px; font-weight: 800; color: #fff;">⏰ ${a.time} • 👤 ${a.customerName} (${a.customerPhone || ''})</div>
            <div style="font-size: 10px; color: var(--text-muted);">✂️ ${getAptServiceName(a)} • 💈 ${a.staffName || 'Mustafa Usta'}</div>
          </div>
          <div style="font-size: 13px; font-weight: 900; color: #22c55e;">+${getAptPrice(a)} TL</div>
        </div>
      `).join('');

      ciroBodyHtml = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <input type="date" value="${selectedCiroDate}" onchange="window.setSelectedCiroDate(this.value)" class="input-field" style="margin: 0; font-size: 11px; padding: 4px 8px; width: 140px;">
          <span style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">📅 Günlük Ciro Raporu</span>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 14px;">
          <div class="card" style="padding: 10px; text-align: center; border-color: #22c55e;">
            <div style="font-size: 10px; color: var(--text-muted);">💰 Gerçek Ciro</div>
            <div style="font-size: 20px; font-weight: 900; color: #22c55e;">${totalRevenue} TL</div>
          </div>
          <div class="card" style="padding: 10px; text-align: center; border-color: #ef4444;">
            <div style="font-size: 10px; color: var(--text-muted);">📉 Kaçırılan Potansiyel</div>
            <div style="font-size: 20px; font-weight: 900; color: #ef4444;">${totalLostRevenue} TL</div>
          </div>
        </div>

        <h4 style="font-size: 12px; font-weight: 800; color: #22c55e; margin-bottom: 6px;">✅ Tamamlanan İşlemler (${completedCount}) - Toplam: ${totalRevenue} TL</h4>
        ${completedCount === 0 ? '<div style="font-size: 11px; color: var(--text-muted); padding: 8px;">Tamamlanmış işlem bulunmuyor.</div>' : completedRowsHtml}
      `;
    }

    mainHtml = `
      <div class="card animate-fade">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <h3 style="font-size: 16px; font-weight: 800; color: var(--gold-primary); margin: 0;">💰 ${t('ciroTab', currentLang)} Raporu</h3>
          <button onclick="window.switchOwnerTab('dashboard')" class="btn btn-secondary" style="padding: 4px 8px; font-size: 10px;">${t('backBtn', currentLang)}</button>
        </div>
        ${ciroBodyHtml}
      </div>
    `;
  }
  // ==========================================
  // 3. RANDEVULAR EKRANI (REQS 2, 3, 4)
  // ==========================================
    else if (activeOwnerTab === 'appointments') {
    const pendingApts = allApts.filter(a => a && a.status === 'pending');
    const approvedApts = allApts.filter(a => a && a.status === 'approved');
    const completedAptsList = allApts.filter(a => a && a.status === 'completed');
    const requestApts = allApts.filter(a => a && (a.status === 'cancel_requested' || a.status === 'reschedule_requested'));
    const inactiveApts = allApts.filter(a => a && (a.status === 'cancelled' || a.status === 'rejected' || a.status === 'no_show'));

    const pendingHtml = pendingApts.map(a => `
      <div class="card card-gold" style="padding: 12px; margin-bottom: 8px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <div style="font-size: 13px; font-weight: 800; color: #fff;">⏰ ${a.date} @ ${a.time} • 👤 ${a.customerName} (${a.customerPhone || ''})</div>
            <div style="font-size: 11px; color: var(--gold-primary); margin-top: 2px;">✂️ ${getAptServiceName(a)} • 💈 ${a.staffName || 'Mustafa Usta'} (${getAptPrice(a)} TL)</div>
          </div>
          <span class="badge badge-pending">Bekliyor</span>
        </div>
        <div style="display: flex; gap: 6px; margin-top: 10px;">
          <button onclick="window.updateAppointmentStatusOwner('${a.aptId}', 'approved', this)" class="btn btn-gold" style="flex: 1; font-size: 11px; padding: 6px;">
            ✅ Onayla
          </button>
          <button onclick="window.updateAppointmentStatusOwner('${a.aptId}', 'rejected', this)" class="btn btn-secondary" style="flex: 1; font-size: 11px; padding: 6px; border-color: #ef4444; color: #ef4444;">
            ❌ Reddet
          </button>
        </div>
      </div>
    `).join('');

    const approvedHtml = approvedApts.map(a => `
      <div class="card card-gold" style="padding: 12px; margin-bottom: 8px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <div style="font-size: 13px; font-weight: 800; color: #fff;">⏰ ${a.date} @ ${a.time} • 👤 ${a.customerName} (${a.customerPhone || ''})</div>
            <div style="font-size: 11px; color: var(--gold-primary); margin-top: 2px;">✂️ ${getAptServiceName(a)} • 💈 ${a.staffName || 'Mustafa Usta'} (${getAptPrice(a)} TL)</div>
            ${a.isManual ? '<span class="badge badge-secondary" style="font-size: 9px; margin-top: 4px;">➕ Manuel Randevu</span>' : ''}
          </div>
          <span class="badge badge-approved">Onaylı</span>
        </div>
        <div style="display: flex; gap: 6px; margin-top: 10px;">
          <button onclick="window.updateAppointmentStatusOwner('${a.aptId}', 'completed', this)" class="btn btn-gold" style="flex: 1; font-size: 11px; padding: 6px;">
            ✅ Geldi (Tamamla)
          </button>
          <button onclick="window.updateAppointmentStatusOwner('${a.aptId}', 'no_show', this)" class="btn btn-secondary" style="flex: 1; font-size: 11px; padding: 6px; border-color: #ef4444; color: #ef4444;">
            🚫 Gelmedi (No-Show)
          </button>
        </div>
      </div>
    `).join('');

    const completedHtml = completedAptsList.slice(0, 10).map(a => `
      <div class="card" style="padding: 10px; margin-bottom: 6px; opacity: 0.9;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-size: 12px; font-weight: 800; color: #fff;">⏰ ${a.date} @ ${a.time} • 👤 ${a.customerName}</div>
            <div style="font-size: 10px; color: var(--text-muted);">✂️ ${getAptServiceName(a)} • 💰 ${getAptPrice(a)} TL</div>
          </div>
          <span class="badge badge-approved" style="font-size: 10px;">Tamamlandı</span>
        </div>
      </div>
    `).join('');

    const requestHtml = requestApts.map(a => `
      <div class="card" style="padding: 12px; margin-bottom: 8px; border-color: #eab308;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <div style="font-size: 13px; font-weight: 800; color: #fff;">⏰ ${a.date} @ ${a.time} • 👤 ${a.customerName}</div>
            <div style="font-size: 11px; color: var(--gold-primary); margin-top: 2px;">✂️ ${getAptServiceName(a)}</div>
          </div>
          <span class="badge badge-pending" style="font-size: 10px;">${a.status === 'cancel_requested' ? '📩 İptal Talebi' : '🔄 Değişiklik Talebi'}</span>
        </div>
        <div style="display: flex; gap: 6px; margin-top: 10px;">
          ${a.status === 'cancel_requested' ? `
            <button onclick="window.updateAppointmentStatusOwner('${a.aptId}', 'cancelled', this)" class="btn btn-secondary" style="flex: 1; font-size: 11px; padding: 4px; border-color: #ef4444; color: #ef4444;">
              ✅ İptali Onayla
            </button>
          ` : `
            <button onclick="window.openRescheduleApproveModal('${a.aptId}')" class="btn btn-gold" style="flex: 1; font-size: 11px; padding: 4px;">
              🔄 Değişiklik İncele
            </button>
          `}
        </div>
      </div>
    `).join('');

    const inactiveHtml = inactiveApts.slice(0, 10).map(a => `
      <div class="card" style="padding: 10px; margin-bottom: 6px; opacity: 0.7;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-size: 12px; font-weight: 800; color: #fff;">⏰ ${a.date} @ ${a.time} • 👤 ${a.customerName}</div>
            <div style="font-size: 10px; color: var(--text-muted);">✂️ ${getAptServiceName(a)}</div>
          </div>
          <span class="badge badge-secondary" style="font-size: 10px;">${a.status}</span>
        </div>
      </div>
    `).join('');

    mainHtml = `
      <div class="card animate-fade">
        <h3 style="font-size: 16px; font-weight: 800; color: var(--gold-primary); margin-bottom: 14px;">📅 Salon Randevu Yönetimi</h3>

        <!-- CARD 1: BEKLEYEN RANDEVULAR -->
        <details class="card animate-fade" style="margin-bottom: 10px;" ${pendingApts.length > 0 ? 'open' : ''}>
          <summary style="font-size: 14px; font-weight: 800; color: var(--gold-primary); cursor: pointer; padding: 10px; display: flex; justify-content: space-between; align-items: center;">
            <span>⏳ 1. Bekleyen Randevular</span>
            <span class="badge badge-pending">${pendingApts.length}</span>
          </summary>
          <div style="padding: 10px 0;">
            ${pendingApts.length === 0 ? '<div style="font-size: 11px; color: var(--text-muted);">Bekleyen randevu talebi yok.</div>' : pendingHtml}
          </div>
        </details>

        <!-- CARD 2: GELECEK RANDEVULAR -->
        <details class="card animate-fade" style="margin-bottom: 10px;" ${approvedApts.length > 0 ? 'open' : ''}>
          <summary style="font-size: 14px; font-weight: 800; color: #fff; cursor: pointer; padding: 10px; display: flex; justify-content: space-between; align-items: center;">
            <span>📅 2. Gelecek Randevular</span>
            <span class="badge badge-approved">${approvedApts.length}</span>
          </summary>
          <div style="padding: 10px 0;">
            ${approvedApts.length === 0 ? '<div style="font-size: 11px; color: var(--text-muted);">Gelecek onaylı randevu yok.</div>' : approvedHtml}
          </div>
        </details>

        <!-- CARD 3: TAMAMLANA RANDEVULAR -->
        <details class="card animate-fade" style="margin-bottom: 10px;">
          <summary style="font-size: 14px; font-weight: 800; color: #22c55e; cursor: pointer; padding: 10px; display: flex; justify-content: space-between; align-items: center;">
            <span>✅ 3. Tamamlanan Randevular</span>
            <span class="badge badge-approved">${completedAptsList.length}</span>
          </summary>
          <div style="padding: 10px 0;">
            ${completedAptsList.length === 0 ? '<div style="font-size: 11px; color: var(--text-muted);">Tamamlanan randevu kaydı yok.</div>' : completedHtml}
          </div>
        </details>

        <!-- CARD 4: İPTAL / DEĞİŞİKLİK TALEPLERİ -->
        <details class="card animate-fade" style="margin-bottom: 10px;" ${requestApts.length > 0 ? 'open' : ''}>
          <summary style="font-size: 14px; font-weight: 800; color: #eab308; cursor: pointer; padding: 10px; display: flex; justify-content: space-between; align-items: center;">
            <span>🔄 4. İptal / Değişiklik Talepleri</span>
            <span class="badge badge-pending">${requestApts.length}</span>
          </summary>
          <div style="padding: 10px 0;">
            ${requestApts.length === 0 ? '<div style="font-size: 11px; color: var(--text-muted);">Müşteriden gelen talep bulunmuyor.</div>' : requestHtml}
          </div>
        </details>

        <!-- CARD 5: İPTAL / RET / GELMEDİ -->
        <details class="card animate-fade" style="margin-bottom: 10px;">
          <summary style="font-size: 14px; font-weight: 800; color: var(--text-muted); cursor: pointer; padding: 10px; display: flex; justify-content: space-between; align-items: center;">
            <span>🚫 5. İptal / Ret / Gelmedi (Geçmiş)</span>
            <span class="badge badge-secondary">${inactiveApts.length}</span>
          </summary>
          <div style="padding: 10px 0;">
            ${inactiveApts.length === 0 ? '<div style="font-size: 11px; color: var(--text-muted);">Kayıt bulunmuyor.</div>' : inactiveHtml}
          </div>
        </details>
      </div>
    `;
  }
  // ==========================================
  // 4. YÖNETİM & PAKET & LİSANS DURUMU (REQUIREMENTS 12, 13, 14)
  // ==========================================
    else if (activeOwnerTab === 'management') {
    const isGrant = bizRecord.premiumSource === 'super_admin_grant';
    const planName = isGrant ? 'PREMIUM (⚡ Grant)' : (bizRecord.plan || 'FREE');

    mainHtml = `
      <div class="card animate-fade">
        <h3 style="font-size: 16px; font-weight: 800; color: var(--gold-primary); margin-bottom: 14px;">⚙️ ${t('managementTab', currentLang)}</h3>
        
        <!-- EXACT 5 WORKING MANAGEMENT CARDS IN ORDER (SECTION 14) -->
        <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 14px;">
          <!-- CARD 1: PERSONEL -->
          <div onclick="window.openStaffManagementModal()" class="card animate-fade" style="padding: 14px; cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
            <h4 style="font-size: 14px; font-weight: 800; color: #fff; margin: 0;">👥 Personel Kadrosu & İzinleri</h4>
            <span class="badge badge-approved">Yönet →</span>
          </div>

          <!-- CARD 2: HİZMETLER -->
          <div onclick="window.openServicesManagementModal()" class="card animate-fade" style="padding: 14px; cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
            <h4 style="font-size: 14px; font-weight: 800; color: #fff; margin: 0;">✂️ Hizmetler & Fiyatlar</h4>
            <span class="badge badge-approved">Yönet →</span>
          </div>

          <!-- CARD 3: SAATLER -->
          <div onclick="window.openWeeklyScheduleModal()" class="card animate-fade" style="padding: 14px; cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
            <h4 style="font-size: 14px; font-weight: 800; color: #fff; margin: 0;">⏰ Çalışma Günleri & Saatleri</h4>
            <span class="badge badge-approved">Düzenle →</span>
          </div>

          <!-- CARD 4: İLETİŞİM -->
          <div onclick="window.openSalonContactModal()" class="card animate-fade" style="padding: 14px; cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
            <h4 style="font-size: 14px; font-weight: 800; color: #fff; margin: 0;">💬 Salon İletİŞİm Numaraları</h4>
            <span class="badge badge-approved">Düzenle →</span>
          </div>

          <!-- CARD 5: PAKET & LİSANS DURUMU (ONLY ONCE AT THE VERY BOTTOM!) -->
          <div class="card card-gold animate-fade" style="padding: 16px; margin-top: 6px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <div>
                <div style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">📦 Paket & Lisans Durumu</div>
                <div style="font-size: 18px; font-weight: 900; color: #fff; margin-top: 2px;">Mevcut Paket: ${planName}</div>
                ${isGrant ? `<div style="font-size: 10px; color: #eab308; font-weight: 800; margin-top: 4px;">${t('superAdminGrantNotice', currentLang)}</div>` : ''}
              </div>
              <button onclick="window.openPackageUpgradeModal()" class="btn btn-gold" style="font-size: 11px; padding: 6px 12px;">
                ${t('upgradePackageBtn', currentLang)}
              </button>
            </div>
            <div style="font-size: 11px; color: var(--text-muted); margin-top: 10px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 8px;">
              ${bizRecord.plan === 'PREMIUM' || isGrant ? '✅ 20 Personel • Gelişmiş Ciro & Çalışan Analitiği • Sınırsız AI' : 'ℹ️ FREE Plan: 1 Personel • Temel Randevu Altyapısı'}
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
    const currentLangObj = (SUPPORTED_LANGUAGES && SUPPORTED_LANGUAGES.find(l => l.code === currentLang)) || { code: 'tr', name: 'Türkçe', flag: '🇹🇷' };

    mainHtml = `
      <div class="card animate-fade" style="padding: 20px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <div style="width: 72px; height: 72px; border-radius: 50%; background: var(--gold-gradient); display: flex; align-items: center; justify-content: center; font-size: 26px; font-weight: 900; color: #000; margin: 0 auto;">
            ${initials}
          </div>
          <h3 style="font-size: 16px; font-weight: 800; color: #fff; margin-top: 8px;">${displayName}</h3>
          <div style="font-size: 12px; color: var(--gold-primary); font-weight: 700;">💈 ${bizRecord.name} • ${user.phone}</div>
        </div>

        <!-- SADELEŞTİRİLMİŞ 5 MENÜ SEÇENEĞİ (REQS 10 & 11) -->
        <div style="display: flex; flex-direction: column; gap: 10px;">
          <button onclick="window.openPrivacyAccountModal()" class="btn btn-secondary" style="width: 100%; text-align: left; padding: 14px; display: flex; justify-content: space-between; align-items: center;">
            <span>🔒 ${t('privacyAccount', currentLang)} (Ad, Telefon, Salon Resimleri)</span>
            <span style="font-size: 12px; color: var(--gold-primary);">Yönet →</span>
          </button>

          <button onclick="window.openLanguageModalOwner()" class="btn btn-secondary" style="width: 100%; text-align: left; padding: 14px; display: flex; justify-content: space-between; align-items: center;">
            <span>🌐 ${t('language', currentLang)}</span>
            <span style="font-size: 12px; color: var(--gold-primary);">${currentLangObj.flag} ${currentLangObj.name}</span>
          </button>

          <button onclick="window.openNotificationSettingsModal()" class="btn btn-secondary" style="width: 100%; text-align: left; padding: 14px; display: flex; justify-content: space-between; align-items: center;">
            <span>🔔 ${t('notificationSettings', currentLang)}</span>
            <span style="font-size: 12px; color: var(--gold-primary);">14 Kategori →</span>
          </button>

          <button onclick="window.openHelpSupportModal()" class="btn btn-secondary" style="width: 100%; text-align: left; padding: 14px;">
            💬 ${t('helpSupport', currentLang)}
          </button>

          <button onclick="window.promptOwnerLogout()" class="btn btn-secondary" style="width: 100%; margin-top: 10px; min-height: 44px; border-color: #ef4444; color: #ef4444;">
            🚪 ${t('logout', currentLang)}
          </button>
        </div>
      </div>
    `;
  }

  // HEADER & BOTTOM NAV
  container.innerHTML = `
    <div class="header-bar">
      <div style="display: flex; align-items: center; gap: 8px;">
        <img src="./assets/images/ezo_stile_logo.png" style="height: 24px; width: auto;" alt="EZO Logo">
        <span style="font-size: 12px; font-weight: 800; color: var(--gold-primary);">${bizRecord.name}</span>
      </div>
      <div style="font-size: 11px; color: var(--text-muted);">${displayName} (👑 Patron)</div>
    </div>

    ${mainHtml}

    <nav class="bottom-nav">
      <button onclick="window.switchOwnerTab('dashboard')" class="nav-item ${activeOwnerTab === 'dashboard' ? 'active' : ''}">
        <span class="icon">🏠</span>
        <span>${t('homeTab', currentLang)}</span>
      </button>
      <button onclick="window.switchOwnerTab('ciro', 'day')" class="nav-item ${activeOwnerTab === 'ciro' ? 'active' : ''}">
        <span class="icon">💰</span>
        <span>${t('ciroTab', currentLang)}</span>
      </button>
      <button onclick="window.switchOwnerTab('appointments', 'menu')" class="nav-item ${activeOwnerTab === 'appointments' ? 'active' : ''}">
        <span class="icon">✂️</span>
        <span>${t('appointmentsTab', currentLang)}</span>
      </button>
      <button onclick="window.switchOwnerTab('management')" class="nav-item ${activeOwnerTab === 'management' ? 'active' : ''}">
        <span class="icon">⚙️</span>
        <span>${t('managementTab', currentLang)}</span>
      </button>
      <button onclick="window.switchOwnerTab('profile')" class="nav-item ${activeOwnerTab === 'profile' ? 'active' : ''}">
        <span class="icon">👤</span>
        <span>${t('profileTab', currentLang)}</span>
      </button>
    </nav>
  `;

  // GLOBAL STATE BINDINGS
  window.switchOwnerTab = (tab, subView = null) => {
    activeOwnerTab = tab;
    if (subView) {
      if (tab === 'appointments') activeAptView = subView;
      if (tab === 'ciro') ciroTimeframe = subView;
    }
    renderOwnerScreen(user, onTabChange);
  };

  window.toggleBookingSystemEnabled = async (newStatus) => {
    if (isSavingBookingToggle) return;
    isSavingBookingToggle = true;

    try {
      bizRecord.bookingEnabled = newStatus;
      await saveRecord(`businesses/${businessId}/bookingEnabled`, newStatus, 'PUT');
      showSuccessModal(t('successTitle'), newStatus ? '🟢 Online randevu alımı açıldı.' : '🔴 Online randevu alımı kapatıldı.');
    } catch (err) {
      console.error(err);
    } finally {
      isSavingBookingToggle = false;
      renderOwnerScreen(user, onTabChange);
    }
  };

  // STEP-BY-STEP MANUAL BOOKING ENGINE (REQ 2, 3, 4)
  window.openManualBookingModal = () => {
    if (!manualBookingDraft.date) {
      manualBookingDraft.date = todayStr;
    }
    window.renderManualBookingModalContent();
  };

  window.renderManualBookingModalContent = () => {
    const root = document.getElementById('modal-root');
    if (!root) return;

    const todayDate = new Date().toISOString().split('T')[0];
    const tomorrowDate = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    // REQUIREMENT 1: SINGLE AVAILABILITY MOTOR CLOSED DAY GUARD
    const selectedDateObj = new Date(manualBookingDraft.date);
    const dayIdx = (selectedDateObj.getDay() + 6) % 7; // Monday = 0, Sunday = 6
    const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const dayKey = dayKeys[dayIdx];
    const weeklySchedule = bizRecord.weeklySchedule || {};
    const daySched = weeklySchedule[dayKey];
    const isDayClosed = daySched && daySched.isOpen === false;

    const occupiedSlots = new Set();
    allApts.forEach(apt => {
      if (apt && apt.businessId === businessId &&
          (apt.staffId === manualBookingDraft.staffId || manualBookingDraft.staffId === 'staff-any') &&
          apt.date === manualBookingDraft.date &&
          apt.status !== 'cancelled' && apt.status !== 'rejected') {
        
        const aptDuration = parseInt(apt.serviceDuration) || 30;
        const [h, m] = (apt.time || '00:00').split(':').map(Number);
        const startMins = h * 60 + m;
        const endMins = startMins + aptDuration;

        for (let tM = 9 * 60; tM <= 20 * 60 + 30; tM += 30) {
          if (tM >= startMins && tM < endMins) {
            const slotHourStr = `${String(Math.floor(tM / 60)).padStart(2, '0')}:${String(tM % 60).padStart(2, '0')}`;
            occupiedSlots.add(slotHourStr);
          }
        }
      }
    });

    const allHours = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30'];

    const slotsHtml = allHours.map(h => {
      const isOccupied = occupiedSlots.has(h);
      const isSelected = manualBookingDraft.time === h;

      let style = 'padding: 6px; font-size: 11px; font-weight: 700; border-radius: 8px; text-align: center; ';
      let icon = '';

      if (isSelected) {
        style += 'background: #eab308; color: #000; border: 1px solid #eab308; cursor: pointer;';
        icon = ' ✓';
      } else if (isOccupied) {
        style += 'background: #ef4444; color: #fff; border: 1px solid #ef4444; opacity: 0.55; cursor: not-allowed;';
        icon = ' 🔒';
      } else {
        style += 'background: #22c55e; color: #fff; border: 1px solid #22c55e; cursor: pointer;';
      }

      return `
        <button onclick="${isOccupied ? '' : `window.selectManualBookingTime('${h}')`}" class="btn" style="${style}">
          ${h}${icon}
        </button>
      `;
    }).join('');

    const servicesHtml = services.map(s => `
      <div onclick="window.selectManualBookingService('${s.id}', '${s.name}', ${s.price}, ${s.duration || 30})" class="card" style="padding: 10px; margin-bottom: 6px; cursor: pointer; border-color: ${manualBookingDraft.serviceId === s.id ? 'var(--gold-primary)' : 'var(--border-color)'}; background: ${manualBookingDraft.serviceId === s.id ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.03)'}; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div style="font-size: 13px; font-weight: 800; color: #fff;">✂️ ${s.name} (${s.duration || 30} dk)</div>
        </div>
        <div style="font-size: 13px; font-weight: 900; color: var(--gold-primary);">${s.price} TL</div>
      </div>
    `).join('');

    root.innerHTML = `
      <div class="modal-overlay" onclick="window.closeManualBookingModal()">
        <div class="modal-card animate-fade" onclick="event.stopPropagation()" style="max-height: 90vh; overflow-y: auto;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
            <h3 style="font-size: 15px; font-weight: 800; color: var(--gold-primary); margin: 0;">➕ Manuel Randevu Ekle (Gerçek Booking Engine)</h3>
            <button onclick="window.closeManualBookingModal()" class="btn btn-secondary" style="padding: 4px 10px;">✕</button>
          </div>

          <label style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">1. Müşteri Ad Soyad & Telefon *</label>
          <input type="text" id="manual-cust-name-input" value="${manualBookingDraft.customerName || ''}" oninput="window.updateManualDraftName(this.value)" class="input-field" placeholder="Ad Soyad (Örn: Ahmet Bey)">
          <input type="tel" id="manual-cust-phone-input" value="${manualBookingDraft.customerPhone || ''}" oninput="window.updateManualDraftPhone(this.value)" class="input-field" placeholder="Telefon (05XXXXXXXXX)">

          <label style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">2. Hizmet Seçimi *</label>
          <div style="margin-top: 4px; margin-bottom: 12px;">
            ${services.length === 0 ? '<div style="font-size: 11px; color: var(--text-muted);">Henüz eklenmiş hizmet yok.</div>' : servicesHtml}
          </div>

          <label style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">3. Berber / Personel Seçimi</label>
          <div style="display: flex; gap: 6px; margin-bottom: 12px; margin-top: 4px; overflow-x: auto;">
            <button onclick="window.selectManualBookingStaff('staff-any', 'Fark Etmez')" class="btn ${manualBookingDraft.staffId === 'staff-any' ? 'btn-gold' : 'btn-secondary'}" style="padding: 6px 12px; font-size: 11px;">
              Fark Etmez
            </button>
            ${staffList.map(st => `
              <button onclick="window.selectManualBookingStaff('${st.id}', '${st.displayName}')" class="btn ${manualBookingDraft.staffId === st.id ? 'btn-gold' : 'btn-secondary'}" style="padding: 6px 12px; font-size: 11px;">
                💈 ${st.displayName}
              </button>
            `).join('')}
          </div>

          <label style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">4. Tarih & Müsait Saat Seçimi *</label>
          <div style="display: flex; gap: 6px; margin-top: 4px; margin-bottom: 10px;">
            <button onclick="window.selectManualBookingDate('${todayDate}')" class="btn ${manualBookingDraft.date === todayDate ? 'btn-gold' : 'btn-secondary'}" style="flex: 1; font-size: 11px; padding: 6px;">
              Bugün
            </button>
            <button onclick="window.selectManualBookingDate('${tomorrowDate}')" class="btn ${manualBookingDraft.date === tomorrowDate ? 'btn-gold' : 'btn-secondary'}" style="flex: 1; font-size: 11px; padding: 6px;">
              Yarın
            </button>
            <input type="date" value="${manualBookingDraft.date}" onchange="window.selectManualBookingDate(this.value)" class="input-field" style="flex: 1; margin: 0; font-size: 11px; padding: 4px;">
          </div>

          ${isDayClosed ? `
            <div style="font-size: 13px; font-weight: 800; color: #ef4444; background: rgba(239,68,68,0.15); padding: 12px; border-radius: 8px; text-align: center; margin-bottom: 16px;">
              🛑 Salon seçilen tarihte (${manualBookingDraft.date}) kapalıdır.
            </div>
          ` : `
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-bottom: 16px;">
              ${slotsHtml}
            </div>
          `}

          <button id="btn-submit-manual-booking" onclick="window.submitManualBooking()" class="btn btn-gold" style="width: 100%; min-height: 44px;" ${(!manualBookingDraft.serviceId || !manualBookingDraft.time) ? 'disabled' : ''}>
            ⚡ Manuel Randevuyu Onayla & Kaydet
          </button>
        </div>
      </div>
    `;
  };

  window.updateManualDraftName = (val) => { manualBookingDraft.customerName = val; };
  window.updateManualDraftPhone = (val) => { manualBookingDraft.customerPhone = val; };
  window.selectManualBookingService = (svcId, svcName, svcPrice, svcDur) => {
    manualBookingDraft.serviceId = svcId;
    manualBookingDraft.serviceName = svcName;
    manualBookingDraft.servicePrice = svcPrice;
    manualBookingDraft.serviceDuration = svcDur;
    window.renderManualBookingModalContent();
  };
  window.selectManualBookingStaff = (stfId, stfName) => {
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
    manualBookingDraft = {
      customerName: '',
      customerPhone: '',
      serviceId: null,
      serviceName: null,
      servicePrice: 0,
      serviceDuration: 30,
      staffId: 'staff-any',
      staffName: 'Fark Etmez',
      date: todayStr,
      time: null
    };
    window.closeModal();
  };

  window.submitManualBooking = async () => {
    const name = (manualBookingDraft.customerName || '').trim();
    const phone = (manualBookingDraft.customerPhone || '').trim();

    if (!name) {
      showErrorModal(t('errorTitle'), 'Lütfen müşteri ad soyad giriniz.');
      return;
    }

    const res = await fetch('/api/booking/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessId,
        businessNameSnapshot: bizRecord.name,
        customerUid: 'usr_manual_' + Date.now(),
        customerName: name,
        customerPhone: phone || '05550000000',
        staffId: manualBookingDraft.staffId,
        serviceId: manualBookingDraft.serviceId,
        serviceNameSnapshot: manualBookingDraft.serviceName,
        servicePriceSnapshot: manualBookingDraft.servicePrice,
        durationMinutes: manualBookingDraft.serviceDuration,
        date: manualBookingDraft.date,
        time: manualBookingDraft.time,
        isManual: true,
        source: 'manual',
        initialStatus: 'approved'
      })
    }).catch(() => null);

    const data = res ? await res.json().catch(() => null) : null;
    window.closeModal();

    if (res && res.ok && data && data.success) {
      manualBookingDraft = {
        customerName: '',
        customerPhone: '',
        serviceId: null,
        serviceName: null,
        servicePrice: 0,
        serviceDuration: 30,
        staffId: 'staff-any',
        staffName: 'Fark Etmez',
        date: todayStr,
        time: null
      };
      showSuccessModal(t('successTitle'), '✅ Manuel randevu onaylı olarak kaydedildi.');
      renderOwnerScreen(user, onTabChange);
    } else {
      showErrorModal(t('errorTitle'), (data && data.error) ? data.error : 'Manuel randevu kaydedilemedi.');
    }
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
            <button onclick="window.closeModal()" class="btn btn-secondary" style="padding: 4px 10px;">✕</button>
          </div>

          <!-- EDITOR CANVAS PREVIEW -->
          <div style="position: relative; width: 100%; height: 200px; background: #111; overflow: hidden; border-radius: 8px; border: 2px dashed var(--gold-primary); margin-bottom: 12px;">
            <canvas id="crop-canvas" width="400" height="200" style="width: 100%; height: 100%; object-fit: contain; cursor: move;"></canvas>
          </div>

          <!-- CONTROLS -->
          <div style="display: flex; gap: 8px; justify-content: center; align-items: center; margin-bottom: 14px;">
            <button onclick="window.adjustCropScale(-0.1)" class="btn btn-secondary" style="font-size: 12px; padding: 6px 14px;">🔍 -</button>
            <span style="font-size: 11px; color: var(--gold-primary); font-weight: 800;">Yakınlaştırma</span>
            <button onclick="window.adjustCropScale(0.1)" class="btn btn-secondary" style="font-size: 12px; padding: 6px 14px;">🔍 +</button>
            <button onclick="window.resetCropEditor()" class="btn btn-secondary" style="font-size: 11px; padding: 6px 10px;">🔄 Sıfırla</button>
          </div>

          <!-- PREVIEW CAROUSEL -->
          <div style="font-size: 10px; color: var(--text-muted); margin-bottom: 8px;">${t('previewKesfet', currentLang)}</div>

          <div style="display: flex; gap: 8px;">
            <button onclick="window.closeModal()" class="btn btn-secondary" style="flex: 1;">İptal</button>
            <button onclick="window.saveCroppedImage()" class="btn btn-gold" style="flex: 2;">💾 Kırp & Kaydet</button>
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
    if (type === 'profile') {
      bizRecord.media.profileImageUrl = base64Url;
      bizRecord.profileImageUrl = base64Url;
      await saveRecord(`businesses/${businessId}/media/profileImageUrl`, base64Url, 'PUT');
      await saveRecord(`businesses/${businessId}/profileImageUrl`, base64Url, 'PUT');
    } else if (type === 'cover') {
      bizRecord.media.coverImageUrl = base64Url;
      bizRecord.coverImageUrl = base64Url;
      await saveRecord(`businesses/${businessId}/media/coverImageUrl`, base64Url, 'PUT');
      await saveRecord(`businesses/${businessId}/coverImageUrl`, base64Url, 'PUT');
    } else if (type === 'gallery') {
      if (!bizRecord.media.gallery) bizRecord.media.gallery = [];
      bizRecord.media.gallery.push(base64Url);
      await saveRecord(`businesses/${businessId}/media/gallery`, bizRecord.media.gallery, 'PUT');
    }

    window.closeModal();
    showSuccessModal(t('successTitle'), 'Görsel başarıyla kırpıldı ve kaydedildi.');
  };

  // PRIVACY / ACCOUNT CONSOLIDATED MODAL (REQ 11)
  window.openPrivacyAccountModal = () => {
    const root = document.getElementById('modal-root');
    if (!root) return;

    const media = bizRecord.media || {};

    root.innerHTML = `
      <div class="modal-overlay" onclick="window.closeModal()">
        <div class="modal-card animate-fade" onclick="event.stopPropagation()" style="max-height: 90vh; overflow-y: auto;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
            <h3 style="font-size: 15px; font-weight: 800; color: var(--gold-primary); margin: 0;">🔒 Gizlilik, Hesap & Salon Bilgileri</h3>
            <button onclick="window.closeModal()" class="btn btn-secondary" style="padding: 4px 10px;">✕</button>
          </div>

          <!-- HIDDEN FILE INPUTS FOR CROP EDITOR -->
          <input type="file" id="media-profile-input" accept="image/*" style="display:none;" onchange="window.handleImageCropSelected(event, 'profile')">
          <input type="file" id="media-cover-input" accept="image/*" style="display:none;" onchange="window.handleImageCropSelected(event, 'cover')">
          <input type="file" id="media-gallery-input" accept="image/*" style="display:none;" onchange="window.handleImageCropSelected(event, 'gallery')">

          <!-- KİŞİSEL BİLGİLER -->
          <h4 style="font-size: 13px; font-weight: 800; color: var(--gold-primary); margin-bottom: 6px;">👤 Kişisel Bilgiler</h4>
          <div class="card" style="padding: 10px; margin-bottom: 14px;">
            <div style="font-size: 12px; color: #fff;"><strong>Ad Soyad:</strong> ${displayName}</div>
            <div style="font-size: 12px; color: #fff; margin-top: 2px;"><strong>Telefon:</strong> ${user.phone}</div>
            <button onclick="window.openPersonalDetailsModal()" class="btn btn-outline-gold" style="width: 100%; font-size: 11px; margin-top: 8px;">Ad / Telefon Düzenle →</button>
          </div>

          <!-- SALON BİLGİLERİ VE GÖRSELLERİ -->
          <h4 style="font-size: 13px; font-weight: 800; color: var(--gold-primary); margin-bottom: 6px;">💈 Salon Bilgileri & Görselleri</h4>
          <div class="card" style="padding: 10px; margin-bottom: 14px;">
            <div style="font-size: 12px; color: #fff;"><strong>Salon Adı:</strong> ${bizRecord.name}</div>
            <div style="display: flex; gap: 6px; margin-top: 8px;">
              <button onclick="window.openSalonImageCropModal('profile')" class="btn btn-secondary" style="flex: 1; font-size: 10px;">📷 Logo Düzenle</button>
              <button onclick="window.openSalonImageCropModal('cover')" class="btn btn-secondary" style="flex: 1; font-size: 10px;">🖼️ Kapak Resmini Kırp</button>
              <button onclick="window.openSalonImageCropModal('gallery')" class="btn btn-secondary" style="flex: 1; font-size: 10px;">📸 Galeriye Ekle</button>
            </div>
          </div>

          <button onclick="window.closeModal()" class="btn btn-gold" style="width: 100%;">Tamam</button>
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
            <h3 style="font-size: 15px; font-weight: 800; color: var(--gold-primary); margin: 0;">📦 Paket Karşılaştırma & Yükseltme</h3>
            <button onclick="window.closeModal()" class="btn btn-secondary" style="padding: 4px 10px;">✕</button>
          </div>

          <div style="font-size: 11px; color: #eab308; background: rgba(234,179,8,0.1); padding: 8px; border-radius: 6px; margin-bottom: 12px;">
            ${t('sandboxPaymentNotice', currentLang)}
          </div>

          <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 14px;">
            <div class="card" style="padding: 12px; border-color: var(--border-color);">
              <div style="font-size: 14px; font-weight: 800; color: #fff;">FREE Paket - 0 TL</div>
              <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">• 1 Personel • Temel Randevu Yönetimi</div>
            </div>

            <div class="card card-gold" style="padding: 12px;">
              <div style="font-size: 14px; font-weight: 800; color: var(--gold-primary);">PRO Paket - 299 TL / ay</div>
              <div style="font-size: 11px; color: #fff; margin-top: 4px;">• 5 Personel • Gelişmiş Takvim • SMS Hatırlatma</div>
            </div>

            <div class="card" style="padding: 12px; border-color: #22c55e;">
              <div style="font-size: 14px; font-weight: 800; color: #22c55e;">PREMIUM Paket - 599 TL / ay</div>
              <div style="font-size: 11px; color: #fff; margin-top: 4px;">• 20 Personel • Gelişmiş Ciro & Çalışan Analitiği • Sınırsız AI • 2 Yıl Geçmiş</div>
            </div>
          </div>

          <button onclick="window.closeModal()" class="btn btn-gold" style="width: 100%;">Kapat</button>
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
        <div class="modal-card animate-fade" onclick="event.stopPropagation()" style="max-height: 85vh; overflow-y: auto;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
            <h3 style="font-size: 15px; font-weight: 800; color: var(--gold-primary); margin: 0;">🔔 Bildirim Ayarları</h3>
            <button onclick="window.closeModal()" class="btn btn-secondary" style="padding: 4px 10px;">✕</button>
          </div>

          <!-- MASTER TOGGLE (REQS 5 & 7) -->
          <label style="display: flex; justify-content: space-between; align-items: center; font-size: 13px; font-weight: 800; color: #fff; background: rgba(245,158,11,0.2); padding: 10px; border-radius: 8px; border: 1px solid var(--gold-primary); margin-bottom: 12px;">
            <div>
              <div>${t('masterNotifLabel', currentLang)}</div>
              <div style="font-size: 10px; color: var(--text-muted); font-weight: 400;">${t('masterNotifSub', currentLang)}</div>
            </div>
            <input type="checkbox" id="pref-inapp" ${prefs.inApp !== false ? 'checked' : ''}>
          </label>

          <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px;">
            <label style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #fff;">
              <span>🔊 Sesli Bildirimler</span>
              <input type="checkbox" id="pref-sound" ${prefs.sound !== false ? 'checked' : ''}>
            </label>
            <label style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #fff;">
              <span>🆕 Yeni Randevu Bildirimleri</span>
              <input type="checkbox" id="pref-newbook" ${prefs.newBooking !== false ? 'checked' : ''}>
            </label>
            <label style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #fff;">
              <span>❌ İptal Talebi Bildirimleri</span>
              <input type="checkbox" id="pref-cancelreq" ${prefs.cancelRequest !== false ? 'checked' : ''}>
            </label>
            <label style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #fff;">
              <span>🔄 Tarih/Saat Değişiklik Talebi</span>
              <input type="checkbox" id="pref-reschedreq" ${prefs.rescheduleRequest !== false ? 'checked' : ''}>
            </label>
            <label style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #fff;">
              <span>⏰ Yaklaşan Randevu Hatırlatması</span>
              <input type="checkbox" id="pref-reminder" ${prefs.upcomingReminder !== false ? 'checked' : ''}>
            </label>
            <label style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #fff;">
              <span>🚫 No-show Bildirimi</span>
              <input type="checkbox" id="pref-noshow" ${prefs.noShow !== false ? 'checked' : ''}>
            </label>
            <label style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #fff;">
              <span>🎉 Tamamlanan Randevu Bildirimi</span>
              <input type="checkbox" id="pref-completed" ${prefs.completed !== false ? 'checked' : ''}>
            </label>
          </div>

          <button onclick="window.saveOwnerNotificationPrefs()" class="btn btn-gold" style="width: 100%; min-height: 42px;">
            💾 Kaydet
          </button>
        </div>
      </div>
    `;
  };

  window.saveOwnerNotificationPrefs = async () => {
    const prefs = {
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
    await saveRecord(`users/${user.uid}/notificationPreferences`, prefs, 'PUT');
    window.closeModal();
    showSuccessModal(t('successTitle'), 'Bildirim ayarlarınız kaydedildi.');
  };

  // OTHER HELPER MODALS
  window.openPersonalDetailsModal = () => {
    const root = document.getElementById('modal-root');
    if (!root) return;
    root.innerHTML = `
      <div class="modal-overlay" onclick="window.closeModal()">
        <div class="modal-card animate-fade" onclick="event.stopPropagation()">
          <h3 style="font-size: 15px; font-weight: 800; color: var(--gold-primary); margin-bottom: 12px;">👤 Ad Soyad Düzenle</h3>
          <input type="text" id="edit-owner-displayname-input" value="${displayName}" class="input-field">
          <button onclick="window.submitEditOwnerDisplayName()" class="btn btn-gold" style="width: 100%;">💾 Güncelle</button>
        </div>
      </div>
    `;
  };

  window.submitEditOwnerDisplayName = async () => {
    const input = document.getElementById('edit-owner-displayname-input');
    const newName = input ? input.value.trim() : '';
    if (!newName) return;
    user.displayName = newName;
    await saveRecord(`users/${user.uid}/displayName`, newName, 'PUT');
    window.closeModal();
    renderOwnerScreen(user, onTabChange);
  };

  window.openLanguageModalOwner = () => {
    const root = document.getElementById('modal-root');
    if (!root) return;
    const langs = SUPPORTED_LANGUAGES || [{ code: 'tr', name: 'Türkçe', flag: '🇹🇷' }];
    root.innerHTML = `
      <div class="modal-overlay" onclick="window.closeModal()">
        <div class="modal-card animate-fade" onclick="event.stopPropagation()">
          <h3 style="font-size: 15px; font-weight: 800; color: var(--gold-primary); margin-bottom: 12px;">🌐 Dil Seçiniz</h3>
          ${langs.map(l => `<button onclick="window.selectOwnerLanguage('${l.code}')" class="btn ${currentLang === l.code ? 'btn-gold' : 'btn-secondary'}" style="width:100%; margin-bottom:6px;">${l.flag} ${l.name}</button>`).join('')}
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
          <h3 style="font-size: 15px; font-weight: 800; color: var(--gold-primary); margin-bottom: 12px;">💬 Yardım & Destek</h3>
          <textarea id="owner-support-msg" class="input-field" rows="3" placeholder="Mesajınız..."></textarea>
          <button onclick="window.submitOwnerSupportTicket()" class="btn btn-gold" style="width: 100%;">Gönder</button>
        </div>
      </div>
    `;
  };

  window.submitOwnerSupportTicket = async () => {
    const msg = document.getElementById('owner-support-msg').value;
    if (!msg) return;
    await saveRecord(`support_tickets/tkt_${Date.now()}`, { userUid: user.uid, message: msg, createdAt: new Date().toISOString() });
    window.closeModal();
    showSuccessModal(t('successTitle'), 'Destek talebiniz alındı.');
  };

  window.promptOwnerLogout = () => {
    showConfirmModal('Çıkış Yap', 'Çıkış yapmak istediğinize emin misiniz?', () => {
      window.completeExplicitLogout(onTabChange);
    });
  };

    window.updateAppointmentStatusOwner = async (aptId, newStatus, btnEl) => {
    if (!aptId || !newStatus) return;

    if (btnEl) {
      btnEl.disabled = true;
      btnEl.dataset.origText = btnEl.innerHTML;
      btnEl.innerHTML = '⏳ İşleniyor...';
    }

    try {
      const res = await fetch('/api/booking/update-status', {
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
        showErrorModal(t('errorTitle'), (data && data.error) ? data.error : 'İşlem gerçekleştirilemedi.');
        if (btnEl) {
          btnEl.disabled = false;
          btnEl.innerHTML = btnEl.dataset.origText || 'Dene';
        }
      }
    } catch (err) {
      showErrorModal(t('errorTitle'), 'Sunucu bağlantı hatası.');
      if (btnEl) {
        btnEl.disabled = false;
        btnEl.innerHTML = btnEl.dataset.origText || 'Dene';
      }
    }
  };
}

  window.toggleMasterNotificationOwner = (enabled) => {
    const subCheckboxes = document.querySelectorAll('.sub-notif-pref');
    subCheckboxes.forEach(cb => {
      cb.disabled = !enabled;
      if (!enabled) cb.checked = false;
    });
  };
