/* EZO STİLE v2 - Salon Owner Panel (Ana Sayfa, Advanced Ciro Analytics, Persistent Manual Draft, Freeze-Free Toggle, Salon Media, Rich Notifications, VIP Profile) */
import { getAppointmentsForBusiness, fetchRecord, saveRecord, getServices, saveService, getStaffList, saveStaff } from '../db.js';
import { canAccessStaffRevenueAnalytics } from '../permissions.js';
import { SUPPORTED_LANGUAGES, isRtl, t } from '../config.js';
import { showSuccessModal, showErrorModal, showConfirmModal } from './portal.js';
import { logoutUserSession } from '../auth.js';

let activeOwnerTab = 'dashboard'; // 'dashboard', 'ciro', 'appointments', 'management', 'profile'
let activeAptView = 'menu'; // 'menu', 'pending', 'approved', 'completed', 'requests', 'cancelled_rejected', 'bugun'
let ciroTimeframe = 'day'; // 'day', 'week', 'month', 'history'
let selectedCiroDate = new Date().toISOString().split('T')[0];
let selectedCiroYear = new Date().getFullYear();
let selectedCiroMonth = new Date().getMonth() + 1;

let isSavingBookingToggle = false; // Freeze-free async lock guard (Requirement 2)

// MODULE-LEVEL SINGLE SOURCE OF TRUTH STATE FOR MANUAL BOOKING DRAFT (Requirement 1 P0 Fix)
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
    const isPremium = canAccessStaffRevenueAnalytics(bizRecord);
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
      const avgOrder = completedCount > 0 ? Math.round(totalRevenue / completedCount) : 0;

      const completedRowsHtml = dayCompleted.map(a => `
        <div class="card" style="padding: 10px; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-size: 12px; font-weight: 800; color: #fff;">⏰ ${a.time} • 👤 ${a.customerName} (${a.customerPhone || ''})</div>
            <div style="font-size: 10px; color: var(--text-muted);">✂️ ${getAptServiceName(a)} • 💈 ${a.staffName || 'Mustafa Usta'}</div>
          </div>
          <div style="font-size: 13px; font-weight: 900; color: #22c55e;">+${getAptPrice(a)} TL</div>
        </div>
      `).join('');

      const cancelledRowsHtml = dayCancelled.map(a => `
        <div class="card" style="padding: 10px; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center; border-color: #ef4444;">
          <div>
            <div style="font-size: 12px; font-weight: 800; color: #fff;">⏰ ${a.time} • 👤 ${a.customerName}</div>
            <div style="font-size: 10px; color: var(--text-muted);">✂️ ${getAptServiceName(a)} • 💈 ${a.staffName || 'Mustafa Usta'}</div>
          </div>
          <div style="font-size: 12px; font-weight: 800; color: #ef4444;">-${getAptPrice(a)} TL (Kaçırılan)</div>
        </div>
      `).join('');

      const noShowRowsHtml = dayNoShow.map(a => `
        <div class="card" style="padding: 10px; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center; border-color: #ef4444;">
          <div>
            <div style="font-size: 12px; font-weight: 800; color: #fff;">⏰ ${a.time} • 👤 ${a.customerName}</div>
            <div style="font-size: 10px; color: var(--text-muted);">✂️ ${getAptServiceName(a)} • 💈 ${a.staffName || 'Mustafa Usta'}</div>
          </div>
          <div style="font-size: 12px; font-weight: 800; color: #ef4444;">-${getAptPrice(a)} TL (No-Show)</div>
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
          <div class="card" style="padding: 10px; text-align: center;">
            <div style="font-size: 10px; color: var(--text-muted);">${t('completedCount', currentLang)}</div>
            <div style="font-size: 18px; font-weight: 800; color: #fff;">${completedCount}</div>
          </div>
          <div class="card" style="padding: 10px; text-align: center;">
            <div style="font-size: 10px; color: var(--text-muted);">${t('customerCount', currentLang)}</div>
            <div style="font-size: 18px; font-weight: 800; color: #fff;">${uniqueCustomers}</div>
          </div>
        </div>

        <h4 style="font-size: 12px; font-weight: 800; color: #22c55e; margin-bottom: 6px;">✅ Tamamlanan İşlemler (${completedCount}) - Toplam: ${totalRevenue} TL</h4>
        ${completedCount === 0 ? '<div style="font-size: 11px; color: var(--text-muted); padding: 8px;">Tamamlanmış işlem bulunmuyor.</div>' : completedRowsHtml}

        <h4 style="font-size: 12px; font-weight: 800; color: #ef4444; margin-top: 14px; margin-bottom: 4px;">❌ İptal Edilenler (${dayCancelled.length}) - İptal Nedeniyle Kaçırılan: ${cancelledLostRevenue} TL</h4>
        ${dayCancelled.length === 0 ? '<div style="font-size: 11px; color: var(--text-muted); padding: 8px;">İptal edilen işlem yok.</div>' : cancelledRowsHtml}

        <h4 style="font-size: 12px; font-weight: 800; color: #ef4444; margin-top: 14px; margin-bottom: 4px;">🚫 Gelmeyenler / No-Show (${dayNoShow.length}) - No-Show Nedeniyle Kaçırılan: ${noShowLostRevenue} TL</h4>
        ${dayNoShow.length === 0 ? '<div style="font-size: 11px; color: var(--text-muted); padding: 8px;">No-show kaydı yok.</div>' : noShowRowsHtml}
      `;
    } else if (ciroTimeframe === 'week') {
      const now = new Date(selectedCiroDate);
      const dayOfWeek = (now.getDay() + 6) % 7;
      const monday = new Date(now);
      monday.setDate(now.getDate() - dayOfWeek);

      const dayNames = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
      let weeklyRealTotal = 0;
      let weeklyLostTotal = 0;
      let weeklyCompleted = 0;
      const dayStats = [];

      for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        
        const dayAllApts = allApts.filter(a => a && a.date === dateStr);
        const dayCompletedApts = dayAllApts.filter(a => a.status === 'completed');
        const dayCancelledApts = dayAllApts.filter(a => a.status === 'cancelled' || a.status === 'rejected');
        const dayNoShowApts = dayAllApts.filter(a => a.status === 'no_show');

        const dayRealRev = dayCompletedApts.reduce((sum, a) => sum + getAptPrice(a), 0);
        const dayLostRev = [...dayCancelledApts, ...dayNoShowApts].reduce((sum, a) => sum + getAptPrice(a), 0);
        
        weeklyRealTotal += dayRealRev;
        weeklyLostTotal += dayLostRev;
        weeklyCompleted += dayCompletedApts.length;

        dayStats.push({
          dateStr,
          dayName: dayNames[i],
          realRev: dayRealRev,
          lostRev: dayLostRev,
          completedCount: dayCompletedApts.length,
          cancelledCount: dayCancelledApts.length,
          noShowCount: dayNoShowApts.length
        });
      }

      const dailyBreakdownHtml = dayStats.map(d => `
        <div onclick="window.setSelectedCiroDate('${d.dateStr}', 'day')" class="card" style="padding: 10px; margin-bottom: 6px; cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-size: 12px; font-weight: 800; color: #fff;">📅 ${d.dayName} (${d.dateStr})</div>
            <div style="font-size: 10px; color: var(--text-muted);">
              ✅ ${d.completedCount} Tamamlanan | ❌ ${d.cancelledCount} İptal | 🚫 ${d.noShowCount} No-show
            </div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 13px; font-weight: 900; color: #22c55e;">+${d.realRev} TL</div>
            ${d.lostRev > 0 ? `<div style="font-size: 10px; color: #ef4444; font-weight: 700;">-${d.lostRev} TL Kaçırılan</div>` : ''}
          </div>
        </div>
      `).join('');

      ciroBodyHtml = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 14px;">
          <div class="card" style="padding: 10px; text-align: center; border-color: #22c55e;">
            <div style="font-size: 10px; color: var(--text-muted);">💰 Gerçek Haftalık Ciro</div>
            <div style="font-size: 20px; font-weight: 900; color: #22c55e;">${weeklyRealTotal} TL</div>
          </div>
          <div class="card" style="padding: 10px; text-align: center; border-color: #ef4444;">
            <div style="font-size: 10px; color: var(--text-muted);">📉 Kaçırılan Potansiyel</div>
            <div style="font-size: 20px; font-weight: 900; color: #ef4444;">${weeklyLostTotal} TL</div>
          </div>
        </div>

        <h4 style="font-size: 12px; font-weight: 800; color: var(--gold-primary); margin-bottom: 8px;">📆 Haftalık Gün Dağılımı (Detay için güne tıklayın)</h4>
        ${dailyBreakdownHtml}
      `;
    } else if (ciroTimeframe === 'month') {
      const currentYearMonth = selectedCiroDate.substring(0, 7);
      const monthAllApts = allApts.filter(a => a && String(a.date).startsWith(currentYearMonth));

      const monthCompleted = monthAllApts.filter(a => a.status === 'completed');
      const monthCancelled = monthAllApts.filter(a => a.status === 'cancelled' || a.status === 'rejected');
      const monthNoShow = monthAllApts.filter(a => a.status === 'no_show');

      const monthlyRealTotal = monthCompleted.reduce((sum, a) => sum + getAptPrice(a), 0);
      const monthlyLostTotal = [...monthCancelled, ...monthNoShow].reduce((sum, a) => sum + getAptPrice(a), 0);

      ciroBodyHtml = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 14px;">
          <div class="card" style="padding: 10px; text-align: center; border-color: #22c55e;">
            <div style="font-size: 10px; color: var(--text-muted);">💰 Gerçek Aylık Ciro</div>
            <div style="font-size: 20px; font-weight: 900; color: #22c55e;">${monthlyRealTotal} TL</div>
          </div>
          <div class="card" style="padding: 10px; text-align: center; border-color: #ef4444;">
            <div style="font-size: 10px; color: var(--text-muted);">📉 Kaçırılan Potansiyel</div>
            <div style="font-size: 20px; font-weight: 900; color: #ef4444;">${monthlyLostTotal} TL</div>
          </div>
        </div>
      `;
    }

    mainHtml = `
      <div class="card animate-fade">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <h3 style="font-size: 16px; font-weight: 800; color: var(--gold-primary); margin: 0;">💰 ${t('ciroTab', currentLang)} Raporu</h3>
          <button onclick="window.switchOwnerTab('dashboard')" class="btn btn-secondary" style="padding: 4px 8px; font-size: 10px;">${t('backBtn', currentLang)}</button>
        </div>

        <div style="display: flex; gap: 4px; margin-bottom: 12px;">
          <button onclick="window.setCiroTimeframe('day')" class="btn ${ciroTimeframe === 'day' ? 'btn-gold' : 'btn-secondary'}" style="flex: 1; font-size: 11px; padding: 6px;">${t('day', currentLang)}</button>
          <button onclick="window.setCiroTimeframe('week')" class="btn ${ciroTimeframe === 'week' ? 'btn-gold' : 'btn-secondary'}" style="flex: 1; font-size: 11px; padding: 6px;">${t('week', currentLang)}</button>
          <button onclick="window.setCiroTimeframe('month')" class="btn ${ciroTimeframe === 'month' ? 'btn-gold' : 'btn-secondary'}" style="flex: 1; font-size: 11px; padding: 6px;">${t('month', currentLang)}</button>
        </div>

        ${ciroBodyHtml}
      </div>
    `;
  }
  // ==========================================
  // 3. RANDEVULAR EKRANI
  // ==========================================
  else if (activeOwnerTab === 'appointments') {
    if (activeAptView === 'menu') {
      const approvedCount = allApts.filter(a => a && a.status === 'approved').length;
      const requestsCount = allApts.filter(a => a && (a.status === 'cancel_requested' || a.status === 'reschedule_requested')).length;
      const cancelledCount = allApts.filter(a => a && (a.status === 'cancelled' || a.status === 'rejected' || a.status === 'no_show')).length;

      mainHtml = `
        <div class="card animate-fade">
          <h3 style="font-size: 16px; font-weight: 800; color: var(--gold-primary); margin-bottom: 12px;">📅 ${t('appointmentsTab', currentLang)}</h3>
          
          <div style="display: flex; flex-direction: column; gap: 10px;">
            <div onclick="window.setAppointmentView('pending')" class="card card-gold animate-fade" style="padding: 16px; cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <h4 style="font-size: 15px; font-weight: 800; color: #fff;">⏳ Bekleyen Randevular</h4>
                <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">Onay bekleyen yeni randevu talepleri</div>
              </div>
              <span class="badge badge-pending" style="font-size: 14px; font-weight: 900; padding: 6px 12px;">${pendingRequests.length}</span>
            </div>

            <div onclick="window.setAppointmentView('approved')" class="card animate-fade" style="padding: 16px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; border-color: var(--gold-primary);">
              <div>
                <h4 style="font-size: 15px; font-weight: 800; color: #fff;">📅 Gelecek Randevular</h4>
                <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">Onaylanmış randevular</div>
              </div>
              <span class="badge badge-approved" style="font-size: 14px; font-weight: 900; padding: 6px 12px;">${approvedCount}</span>
            </div>

            <div onclick="window.setAppointmentView('completed')" class="card animate-fade" style="padding: 16px; cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <h4 style="font-size: 15px; font-weight: 800; color: #22c55e;">✅ Tamamlanan Randevular</h4>
                <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">Tamamlanıp ciroya işlenen randevular</div>
              </div>
              <span class="badge badge-approved" style="font-size: 14px; font-weight: 900; padding: 6px 12px; background: #22c55e; color: #000;">${completedApts.length}</span>
            </div>
          </div>
        </div>
      `;
    } else {
      mainHtml = `<div class="card"><button onclick="window.setAppointmentView('menu')" class="btn btn-secondary">Geri</button></div>`;
    }
  }
  // ==========================================
  // 4. YÖNETİM ANA MENÜSÜ & SALON GÖRSELLERİ (REQUIREMENT 7 & 8)
  // ==========================================
  else if (activeOwnerTab === 'management') {
    const isPremium = canAccessStaffRevenueAnalytics(bizRecord);

    mainHtml = `
      <div class="card animate-fade">
        <h3 style="font-size: 16px; font-weight: 800; color: var(--gold-primary); margin-bottom: 12px;">⚙️ ${t('managementTab', currentLang)}</h3>
        
        <div style="display: flex; flex-direction: column; gap: 10px;">
          <div onclick="window.openStaffManagementModal()" class="card animate-fade" style="padding: 16px; cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <h4 style="font-size: 15px; font-weight: 800; color: #fff;">👥 Personel Kadrosu & İzinleri</h4>
            </div>
            <span class="badge badge-approved" style="font-size: 12px;">Yönet →</span>
          </div>

          <div onclick="window.openServicesManagementModal()" class="card animate-fade" style="padding: 16px; cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <h4 style="font-size: 15px; font-weight: 800; color: #fff;">✂️ Hizmetler & Fiyatlar</h4>
            </div>
            <span class="badge badge-approved" style="font-size: 12px;">Yönet →</span>
          </div>

          <div onclick="window.openWeeklyScheduleModal()" class="card animate-fade" style="padding: 16px; cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <h4 style="font-size: 15px; font-weight: 800; color: #fff;">⏰ Çalışma Günleri & Saatleri</h4>
            </div>
            <span class="badge badge-approved" style="font-size: 12px;">Düzenle →</span>
          </div>

          <div onclick="window.openSalonMediaManagementModal()" class="card animate-fade" style="padding: 16px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; border-color: var(--gold-primary);">
            <div>
              <h4 style="font-size: 15px; font-weight: 800; color: #fff;">🖼️ Salon Görselleri & Galerisi</h4>
              <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">Logo, Kapak resmi ve Galeri fotoğrafları</div>
            </div>
            <span class="badge badge-approved" style="font-size: 12px;">Düzenle →</span>
          </div>
        </div>
      </div>
    `;
  }
  // ==========================================
  // 5. PATRON PROFİLİ (REQUIREMENTS 2, 3, 4, 11)
  // ==========================================
  else if (activeOwnerTab === 'profile') {
    const currentLangObj = (SUPPORTED_LANGUAGES && SUPPORTED_LANGUAGES.find(l => l.code === currentLang)) || { code: 'tr', name: 'Türkçe', flag: '🇹🇷' };

    mainHtml = `
      <div class="card animate-fade" style="padding: 20px;">
        <div style="text-align: center; margin-bottom: 16px;">
          <div style="position: relative; display: inline-block;">
            ${user.photoUrl ? `
              <img src="${user.photoUrl}" style="width: 72px; height: 72px; border-radius: 50%; object-fit: cover; border: 2px solid var(--gold-primary);" alt="Avatar">
            ` : `
              <div style="width: 72px; height: 72px; border-radius: 50%; background: var(--gold-gradient); display: flex; align-items: center; justify-content: center; font-size: 26px; font-weight: 900; color: #000;">
                ${initials}
              </div>
            `}
            <button onclick="window.openProfilePhotoModal()" style="position: absolute; bottom: 0; right: 0; width: 26px; height: 26px; border-radius: 50%; background: #000; border: 1px solid var(--gold-primary); color: var(--gold-primary); font-size: 12px; cursor: pointer;">
              📷
            </button>
          </div>
          <h3 id="owner-profile-display-name" style="font-size: 16px; font-weight: 800; color: #fff; margin-top: 8px;">${displayName}</h3>
          <div style="font-size: 12px; color: var(--gold-primary); font-weight: 700;">💈 ${bizRecord.name} • ${user.phone}</div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 8px;">
          <button onclick="window.openPersonalDetailsModal()" class="btn btn-secondary" style="width: 100%; text-align: left; padding: 12px; display: flex; justify-content: space-between; align-items: center;">
            <span>👤 ${t('personalDetails', currentLang)}</span>
            <span style="font-size: 12px; color: var(--gold-primary);">Ad / Tel Düzenle →</span>
          </button>

          <button onclick="window.openSalonMediaManagementModal()" class="btn btn-secondary" style="width: 100%; text-align: left; padding: 12px; display: flex; justify-content: space-between; align-items: center;">
            <span>🖼️ ${t('salonMedia', currentLang)}</span>
            <span style="font-size: 12px; color: var(--gold-primary);">Galeri / Logo →</span>
          </button>

          <button onclick="window.openLanguageModalOwner()" class="btn btn-secondary" style="width: 100%; text-align: left; padding: 12px; display: flex; justify-content: space-between; align-items: center;">
            <span>🌐 ${t('language', currentLang)}</span>
            <span style="font-size: 12px; color: var(--gold-primary);">${currentLangObj.flag} ${currentLangObj.name}</span>
          </button>

          <button onclick="window.openNotificationSettingsModal()" class="btn btn-secondary" style="width: 100%; text-align: left; padding: 12px;">
            🔔 ${t('notificationSettings', currentLang)} (14 Kategori)
          </button>

          <button onclick="window.openPrivacyAccountModal()" class="btn btn-secondary" style="width: 100%; text-align: left; padding: 12px;">
            🔒 ${t('privacyAccount', currentLang)}
          </button>

          <button onclick="window.openChangePasswordModal()" class="btn btn-secondary" style="width: 100%; text-align: left; padding: 12px;">
            🔑 Şifre Değiştir
          </button>

          <button onclick="window.openHelpSupportModal()" class="btn btn-secondary" style="width: 100%; text-align: left; padding: 12px;">
            💬 ${t('helpSupport', currentLang)}
          </button>

          <button onclick="window.promptOwnerLogout()" class="btn btn-secondary" style="width: 100%; margin-top: 10px; min-height: 42px; border-color: #ef4444; color: #ef4444;">
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
      <div style="font-size: 11px; color: var(--text-muted);"><span id="owner-header-name">${displayName}</span> (👑 Patron)</div>
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

  window.setAppointmentView = (view) => {
    activeAptView = view;
    renderOwnerScreen(user, onTabChange);
  };

  window.setCiroTimeframe = (tf) => {
    ciroTimeframe = tf;
    renderOwnerScreen(user, onTabChange);
  };

  window.setSelectedCiroDate = (d, tf = 'day') => {
    selectedCiroDate = d;
    ciroTimeframe = tf;
    renderOwnerScreen(user, onTabChange);
  };

  // FREEZE-FREE BOOKING TOGGLE WITH ASYNC LOCK
  window.toggleBookingSystemEnabled = async (newStatus) => {
    if (isSavingBookingToggle) return;
    isSavingBookingToggle = true;

    const btn = document.getElementById('btn-toggle-booking-system');
    if (btn) {
      btn.disabled = true;
      btn.innerText = '⏳ Kaydediliyor...';
    }

    try {
      bizRecord.bookingEnabled = newStatus;
      await saveRecord(`businesses/${businessId}/bookingEnabled`, newStatus, 'PUT');
      showSuccessModal(t('successTitle'), newStatus ? '🟢 Online randevu alımı başarıyla açıldı.' : '🔴 Online randevu alımı geçici olarak kapatıldı.');
    } catch (err) {
      console.error('Booking toggle save error:', err);
      showErrorModal(t('errorTitle'), 'Ayar kaydedilirken bir hata oluştu.');
      bizRecord.bookingEnabled = !newStatus;
    } finally {
      isSavingBookingToggle = false;
      renderOwnerScreen(user, onTabChange);
    }
  };

  // STEP-BY-STEP MANUAL BOOKING WITH PERSISTENT DRAFT STATE (REQUIREMENT 1 P0 FIX)
  window.openManualBookingModal = () => {
    const root = document.getElementById('modal-root');
    if (!root) return;

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
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();

    const visibleHours = allHours.filter(hStr => {
      if (manualBookingDraft.date !== todayDate) return true;
      const [h, m] = hStr.split(':').map(Number);
      return (h * 60 + m) > currentMins;
    });

    const slotsHtml = visibleHours.map(h => {
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
            <h3 style="font-size: 15px; font-weight: 800; color: var(--gold-primary); margin: 0;">➕ Manuel Randevu Ekle (Müşteri UX)</h3>
            <button onclick="window.closeManualBookingModal()" class="btn btn-secondary" style="padding: 4px 10px;">✕</button>
          </div>

          <!-- STEP 1: MÜŞTERİ BİLGİSİ (READS & WRITES SINGLE TRUTH DRAFT STATE) -->
          <label style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">1. Müşteri Ad Soyad & Telefon *</label>
          <input type="text" id="manual-cust-name-input" value="${manualBookingDraft.customerName || ''}" oninput="window.updateManualDraftName(this.value)" class="input-field" placeholder="Ad Soyad (Örn: Ahmet Bey)">
          <input type="tel" id="manual-cust-phone-input" value="${manualBookingDraft.customerPhone || ''}" oninput="window.updateManualDraftPhone(this.value)" class="input-field" placeholder="Telefon (05XXXXXXXXX)">

          <!-- STEP 2: HİZMET SEÇİMİ -->
          <label style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">2. Hizmet Seçimi *</label>
          <div style="margin-top: 4px; margin-bottom: 12px;">
            ${services.length === 0 ? '<div style="font-size: 11px; color: var(--text-muted);">Henüz eklenmiş hizmet yok.</div>' : servicesHtml}
          </div>

          <!-- STEP 3: PERSONEL SEÇİMİ -->
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

          <!-- STEP 4: TARİH & SAAT SEÇİMİ -->
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

          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-bottom: 16px;">
            ${slotsHtml}
          </div>

          <button id="btn-submit-manual-booking" onclick="window.submitManualBooking()" class="btn btn-gold" style="width: 100%; min-height: 44px;" ${(!manualBookingDraft.serviceId || !manualBookingDraft.time) ? 'disabled' : ''}>
            ⚡ Manuel Randevuyu Onayla & Kaydet
          </button>
        </div>
      </div>
    `;
  };

  window.updateManualDraftName = (val) => {
    manualBookingDraft.customerName = val;
  };

  window.updateManualDraftPhone = (val) => {
    manualBookingDraft.customerPhone = val;
  };

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
    if (!manualBookingDraft.serviceId || !manualBookingDraft.time) {
      showErrorModal(t('errorTitle'), 'Lütfen hizmet ve saat seçiniz.');
      return;
    }

    const res = await fetch('/api/booking/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessId,
        customerUid: 'usr_manual_' + Date.now(),
        customerName: name,
        customerPhone: phone || '05550000000',
        staffId: manualBookingDraft.staffId,
        serviceId: manualBookingDraft.serviceId,
        serviceName: manualBookingDraft.serviceName,
        servicePrice: manualBookingDraft.servicePrice,
        serviceDuration: manualBookingDraft.serviceDuration,
        date: manualBookingDraft.date,
        time: manualBookingDraft.time,
        isManual: true,
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

  // PATRON KİŞİSEL BİLGİLER & AD SOYAD / TELEFON DEĞİŞTİR (REQUIREMENTS 2 & 3)
  window.openPersonalDetailsModal = () => {
    const root = document.getElementById('modal-root');
    if (!root) return;

    root.innerHTML = `
      <div class="modal-overlay" onclick="window.closeModal()">
        <div class="modal-card animate-fade" onclick="event.stopPropagation()">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
            <h3 style="font-size: 15px; font-weight: 800; color: var(--gold-primary); margin: 0;">👤 Kişisel Bilgiler & Profil</h3>
            <button onclick="window.closeModal()" class="btn btn-secondary" style="padding: 4px 10px;">✕</button>
          </div>

          <!-- AD SOYAD DÜZENLE (REQUIREMENT 2) -->
          <label style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">Ad Soyad</label>
          <div style="display: flex; gap: 6px; margin-bottom: 14px;">
            <input type="text" id="edit-owner-displayname-input" value="${displayName}" class="input-field" style="margin: 0; flex: 1;">
            <button onclick="window.submitEditOwnerDisplayName()" class="btn btn-gold" style="font-size: 11px; padding: 6px 12px;">💾 Güncelle</button>
          </div>

          <!-- TELEFON NUMARASI DEĞİŞTİR WITH RE-AUTH (REQUIREMENT 3) -->
          <h4 style="font-size: 12px; font-weight: 800; color: var(--gold-primary); margin-top: 10px; margin-bottom: 6px;">📱 Telefon Numarası Değiştir</h4>
          <label style="font-size: 10px; color: var(--text-muted);">Güvenlik gereği mevcut şifrenizi girmeniz zorunludur.</label>
          <input type="password" id="phone-change-pwd-input" class="input-field" placeholder="Mevcut Şifreniz">
          <input type="tel" id="phone-change-new-input" value="${user.phone}" class="input-field" placeholder="Yeni Telefon Numarası (05XXXXXXXXX)">

          <button onclick="window.submitEditOwnerPhone()" class="btn btn-outline-gold" style="width: 100%; margin-top: 4px;">
            📱 Numarayı Güvenli Değiştir
          </button>
        </div>
      </div>
    `;
  };

  window.submitEditOwnerDisplayName = async () => {
    const input = document.getElementById('edit-owner-displayname-input');
    const newName = input ? input.value.trim() : '';

    if (!newName) {
      showErrorModal(t('errorTitle'), 'Lütfen geçerli bir isim giriniz.');
      return;
    }

    user.displayName = newName;
    user.name = newName;
    await saveRecord(`users/${user.uid}/displayName`, newName, 'PUT');
    await saveRecord(`users/${user.uid}/name`, newName, 'PUT');

    await fetch('/api/audit/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actorUid: user.uid, action: 'user.profile_updated', targetId: user.uid, details: { newName } })
    }).catch(() => null);

    window.closeModal();
    showSuccessModal(t('successTitle'), 'Ad soyadınız güncellendi.');
    renderOwnerScreen(user, onTabChange);
  };

  window.submitEditOwnerPhone = async () => {
    const pwdInput = document.getElementById('phone-change-pwd-input');
    const phoneInput = document.getElementById('phone-change-new-input');

    const pwd = pwdInput ? pwdInput.value.trim() : '';
    const newPhone = phoneInput ? phoneInput.value.trim() : '';

    const dbUser = await fetchRecord(`users/${user.uid}`) || {};
    const actualPwd = dbUser.password || '123456';

    if (pwd !== actualPwd) {
      showErrorModal(t('errorTitle'), 'Mevcut şifreniz hatalıdır.');
      return;
    }

    if (!newPhone || newPhone.length < 10) {
      showErrorModal(t('errorTitle'), 'Lütfen geçerli bir telefon numarası giriniz.');
      return;
    }

    // CHECK IF PHONE ALREADY TAKEN BY ANOTHER USER
    const allUsersData = await fetchRecord('users') || {};
    const existingOtherUser = Object.values(allUsersData).find(u => u && u.uid !== user.uid && u.phone === newPhone);

    if (existingOtherUser) {
      showErrorModal(t('errorTitle'), 'Bu telefon numarası başka bir kullanıcı tarafından kullanılmaktadır.');
      return;
    }

    user.phone = newPhone;
    await saveRecord(`users/${user.uid}/phone`, newPhone, 'PUT');
    window.closeModal();
    showSuccessModal(t('successTitle'), 'Telefon numaranız başarıyla güncellendi.');
    renderOwnerScreen(user, onTabChange);
  };

  // SALON GÖRSELLERİ & GALERİSİ MODALI (REQUIREMENTS 7 & 8)
  window.openSalonMediaManagementModal = () => {
    const root = document.getElementById('modal-root');
    if (!root) return;

    const media = bizRecord.media || {
      profileImageUrl: bizRecord.profileImageUrl || null,
      coverImageUrl: bizRecord.coverImageUrl || null,
      gallery: bizRecord.gallery || []
    };

    root.innerHTML = `
      <div class="modal-overlay" onclick="window.closeModal()">
        <div class="modal-card animate-fade" onclick="event.stopPropagation()" style="max-height: 90vh; overflow-y: auto;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
            <h3 style="font-size: 15px; font-weight: 800; color: var(--gold-primary); margin: 0;">🖼️ Salon Görselleri & Galerisi</h3>
            <button onclick="window.closeModal()" class="btn btn-secondary" style="padding: 4px 10px;">✕</button>
          </div>

          <input type="file" id="media-profile-input" accept="image/jpeg,image/png,image/webp" style="display:none;" onchange="window.handleMediaUpload(event, 'profile')">
          <input type="file" id="media-cover-input" accept="image/jpeg,image/png,image/webp" style="display:none;" onchange="window.handleMediaUpload(event, 'cover')">
          <input type="file" id="media-gallery-input" accept="image/jpeg,image/png,image/webp" style="display:none;" onchange="window.handleMediaUpload(event, 'gallery')">

          <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px;">
            <!-- SALON LOGO / PROFİL GÖRSELİ -->
            <div class="card" style="padding: 12px;">
              <div style="font-size: 12px; font-weight: 800; color: #fff; margin-bottom: 6px;">📷 Salon Profil Fotoğrafı / Logo</div>
              ${media.profileImageUrl ? `<img src="${media.profileImageUrl}" style="width: 100%; height: 100px; object-fit: cover; border-radius: 6px; margin-bottom: 8px;">` : ''}
              <button onclick="document.getElementById('media-profile-input').click()" class="btn btn-gold" style="width: 100%; font-size: 11px;">
                ${media.profileImageUrl ? '🔄 Logoyu Değiştir' : '📤 Logo Yükle'}
              </button>
            </div>

            <!-- KAPAK FOTOĞRAFI -->
            <div class="card" style="padding: 12px;">
              <div style="font-size: 12px; font-weight: 800; color: #fff; margin-bottom: 6px;">🖼️ Salon Kapak Görseli (Keşfet Kartı)</div>
              ${media.coverImageUrl ? `<img src="${media.coverImageUrl}" style="width: 100%; height: 120px; object-fit: cover; border-radius: 6px; margin-bottom: 8px;">` : ''}
              <button onclick="document.getElementById('media-cover-input').click()" class="btn btn-gold" style="width: 100%; font-size: 11px;">
                ${media.coverImageUrl ? '🔄 Kapak Resmini Değiştir' : '📤 Kapak Resmi Yükle'}
              </button>
            </div>

            <!-- GALERİ FOTOĞRAFLARI -->
            <div class="card" style="padding: 12px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <div style="font-size: 12px; font-weight: 800; color: #fff;">📸 Galeri Fotoğrafları (${(media.gallery || []).length})</div>
                <button onclick="document.getElementById('media-gallery-input').click()" class="btn btn-outline-gold" style="font-size: 10px; padding: 4px 8px;">
                  ➕ Fotoğraf Ekle
                </button>
              </div>
              <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px;">
                ${(media.gallery || []).map((imgUrl, idx) => `
                  <div style="position: relative;">
                    <img src="${imgUrl}" style="width: 100%; height: 70px; object-fit: cover; border-radius: 4px;">
                    <button onclick="window.removeGalleryMedia(${idx})" style="position: absolute; top: 2px; right: 2px; background: rgba(0,0,0,0.8); color: #ef4444; border: none; border-radius: 50%; width: 18px; height: 18px; font-size: 10px; cursor: pointer;">✕</button>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>

          <button onclick="window.closeModal()" class="btn btn-gold" style="width: 100%;">Tamam</button>
        </div>
      </div>
    `;
  };

  window.handleMediaUpload = (event, type) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const maxDim = type === 'cover' ? 800 : 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const base64Url = canvas.toDataURL('image/jpeg', 0.8);
        if (!bizRecord.media) bizRecord.media = { gallery: [] };

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

        showSuccessModal(t('successTitle'), 'Görsel kaydedildi.');
        window.openSalonMediaManagementModal();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  window.removeGalleryMedia = async (idx) => {
    if (bizRecord.media && bizRecord.media.gallery) {
      bizRecord.media.gallery.splice(idx, 1);
      await saveRecord(`businesses/${businessId}/media/gallery`, bizRecord.media.gallery, 'PUT');
      window.openSalonMediaManagementModal();
    }
  };

  // RICH 14-CATEGORY NOTIFICATION PREFERENCES (REQUIREMENT 4)
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
            <h3 style="font-size: 15px; font-weight: 800; color: var(--gold-primary); margin: 0;">🔔 Bildirim Ayarları (14 Kategori)</h3>
            <button onclick="window.closeModal()" class="btn btn-secondary" style="padding: 4px 10px;">✕</button>
          </div>

          <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px;">
            <label style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #fff; background: rgba(245,158,11,0.1); padding: 8px; border-radius: 6px;">
              <span>🔔 Master Uygulama İçi Bildirimler</span>
              <input type="checkbox" id="pref-inapp" ${prefs.inApp !== false ? 'checked' : ''}>
            </label>
            <label style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #fff;">
              <span>🔊 Sesli Bildirimler</span>
              <input type="checkbox" id="pref-sound" ${prefs.sound !== false ? 'checked' : ''}>
            </label>
            <label style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #fff;">
              <span>🆕 Yeni Randevu Bildirimleri</span>
              <input type="checkbox" id="pref-newbook" ${prefs.newBooking !== false ? 'checked' : ''}>
            </label>
            <label style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #fff;">
              <span>✅ Randevu Onay & Durum Güncellemesi</span>
              <input type="checkbox" id="pref-statusupd" ${prefs.statusUpdate !== false ? 'checked' : ''}>
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
            <label style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #fff;">
              <span>👥 Personel Daveti Bildirimleri</span>
              <input type="checkbox" id="pref-invite" ${prefs.staffInvite !== false ? 'checked' : ''}>
            </label>
            <label style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #fff;">
              <span>🛡️ Personel Rol / Yetki Değişikliği</span>
              <input type="checkbox" id="pref-roleupd" ${prefs.staffRoleUpdate !== false ? 'checked' : ''}>
            </label>
            <label style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #fff;">
              <span>📦 Paket / Premium Bildirimleri</span>
              <input type="checkbox" id="pref-pkg" ${prefs.packagePremium !== false ? 'checked' : ''}>
            </label>
            <label style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #fff;">
              <span>💳 Ödeme / Abonelik Bildirimleri</span>
              <input type="checkbox" id="pref-billing" ${prefs.billing !== false ? 'checked' : ''}>
            </label>
            <label style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #fff;">
              <span>📣 EZO STİLE Kampanya & Duyurular</span>
              <input type="checkbox" id="pref-campaigns" ${prefs.campaigns ? 'checked' : ''}>
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
      statusUpdate: document.getElementById('pref-statusupd').checked,
      cancelRequest: document.getElementById('pref-cancelreq').checked,
      rescheduleRequest: document.getElementById('pref-reschedreq').checked,
      upcomingReminder: document.getElementById('pref-reminder').checked,
      noShow: document.getElementById('pref-noshow').checked,
      completed: document.getElementById('pref-completed').checked,
      staffInvite: document.getElementById('pref-invite').checked,
      staffRoleUpdate: document.getElementById('pref-roleupd').checked,
      packagePremium: document.getElementById('pref-pkg').checked,
      billing: document.getElementById('pref-billing').checked,
      campaigns: document.getElementById('pref-campaigns').checked,
      updatedAt: new Date().toISOString()
    };

    await saveRecord(`users/${user.uid}/notificationPreferences`, prefs, 'PUT');
    window.closeModal();
    showSuccessModal(t('successTitle'), '14 kategori bildirim ayarlarınız kaydedildi.');
  };

  // OTHER MODALS (Weekly Schedule, Staff, Services, Password, Contact)
  window.openWeeklyScheduleModal = async () => {
    const root = document.getElementById('modal-root');
    if (!root) return;

    const defaultSchedule = {
      monday: { isOpen: true, start: '09:00', end: '20:30' },
      tuesday: { isOpen: true, start: '09:00', end: '20:30' },
      wednesday: { isOpen: true, start: '09:00', end: '20:30' },
      thursday: { isOpen: true, start: '09:00', end: '20:30' },
      friday: { isOpen: true, start: '09:00', end: '20:30' },
      saturday: { isOpen: true, start: '09:00', end: '20:30' },
      sunday: { isOpen: false, start: '09:00', end: '18:00' }
    };

    const savedSchedule = await fetchRecord(`businesses/${businessId}/weeklySchedule`) || defaultSchedule;
    const daysConfig = [
      { key: 'monday', label: 'Pazartesi' },
      { key: 'tuesday', label: 'Salı' },
      { key: 'wednesday', label: 'Çarşamba' },
      { key: 'thursday', label: 'Perşembe' },
      { key: 'friday', label: 'Cuma' },
      { key: 'saturday', label: 'Cumartesi' },
      { key: 'sunday', label: 'Pazar' }
    ];

    const daysRowsHtml = daysConfig.map(d => {
      const sched = savedSchedule[d.key] || { isOpen: true, start: '09:00', end: '20:30' };
      return `
        <div style="padding: 8px; background: rgba(255,255,255,0.04); border-radius: 8px; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <input type="checkbox" id="sched-open-${d.key}" ${sched.isOpen !== false ? 'checked' : ''}>
            <span style="font-size: 12px; font-weight: 800; color: #fff;">${d.label}</span>
          </div>
          <div style="display: flex; gap: 4px; align-items: center;">
            <input type="text" id="sched-start-${d.key}" value="${sched.start || '09:00'}" class="input-field" style="margin:0; width: 60px; padding: 2px 4px; text-align: center; font-size: 11px;">
            <span style="font-size: 11px; color: var(--gold-primary);">-</span>
            <input type="text" id="sched-end-${d.key}" value="${sched.end || '20:30'}" class="input-field" style="margin:0; width: 60px; padding: 2px 4px; text-align: center; font-size: 11px;">
          </div>
        </div>
      `;
    }).join('');

    root.innerHTML = `
      <div class="modal-overlay" onclick="window.closeModal()">
        <div class="modal-card animate-fade" onclick="event.stopPropagation()">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
            <h3 style="font-size: 15px; font-weight: 800; color: var(--gold-primary); margin: 0;">⏰ Çalışma Günleri & Saatleri</h3>
            <button onclick="window.closeModal()" class="btn btn-secondary" style="padding: 4px 10px;">✕</button>
          </div>
          <div style="max-height: 320px; overflow-y: auto; margin-bottom: 14px;">
            ${daysRowsHtml}
          </div>
          <button onclick="window.saveWeeklySchedule()" class="btn btn-gold" style="width: 100%;">💾 Saatleri Kaydet</button>
        </div>
      </div>
    `;
  };

  window.saveWeeklySchedule = async () => {
    const daysKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const updatedSchedule = {};
    daysKeys.forEach(k => {
      const openEl = document.getElementById(`sched-open-${k}`);
      const startEl = document.getElementById(`sched-start-${k}`);
      const endEl = document.getElementById(`sched-end-${k}`);
      updatedSchedule[k] = { isOpen: openEl ? openEl.checked : true, start: startEl ? startEl.value : '09:00', end: endEl ? endEl.value : '20:30' };
    });
    await saveRecord(`businesses/${businessId}/weeklySchedule`, updatedSchedule, 'PUT');
    window.closeModal();
    renderOwnerScreen(user, onTabChange);
  };

  window.openStaffManagementModal = () => {
    const root = document.getElementById('modal-root');
    if (!root) return;
    const staffRowsHtml = staffList.map(st => `
      <div class="card" style="padding: 10px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
        <div style="font-size: 13px; font-weight: 800; color: #fff;">${st.displayName} (${st.role})</div>
        <button onclick="window.openEditStaffModal('${st.id}')" class="btn btn-outline-gold" style="padding: 4px 8px; font-size: 10px;">Düzenle</button>
      </div>
    `).join('');

    root.innerHTML = `
      <div class="modal-overlay" onclick="window.closeModal()">
        <div class="modal-card animate-fade" onclick="event.stopPropagation()">
          <h3 style="font-size: 15px; font-weight: 800; color: var(--gold-primary); margin-bottom: 14px;">👥 Personel Yönetimi</h3>
          ${staffRowsHtml}
          <button onclick="window.closeModal()" class="btn btn-gold" style="width: 100%; margin-top: 10px;">Kapat</button>
        </div>
      </div>
    `;
  };

  window.openServicesManagementModal = () => {
    const root = document.getElementById('modal-root');
    if (!root) return;
    root.innerHTML = `
      <div class="modal-overlay" onclick="window.closeModal()">
        <div class="modal-card animate-fade" onclick="event.stopPropagation()">
          <h3 style="font-size: 15px; font-weight: 800; color: var(--gold-primary); margin-bottom: 12px;">✂️ Hizmetler & Fiyatlar</h3>
          <div style="margin-bottom: 12px;">
            ${services.map(s => `<div style="display:flex; justify-content:space-between; padding:4px 0; font-size:12px; color:#fff;"><span>${s.name} (${s.duration || 30} dk)</span><span style="color:var(--gold-primary); font-weight:800;">${s.price} TL</span></div>`).join('')}
          </div>
          <button onclick="window.closeModal()" class="btn btn-gold" style="width: 100%;">Kapat</button>
        </div>
      </div>
    `;
  };

  window.openPrivacyAccountModal = () => {
    const root = document.getElementById('modal-root');
    if (!root) return;
    root.innerHTML = `
      <div class="modal-overlay" onclick="window.closeModal()">
        <div class="modal-card animate-fade" onclick="event.stopPropagation()">
          <h3 style="font-size: 15px; font-weight: 800; color: var(--gold-primary); margin-bottom: 12px;">🔒 Gizlilik & Hesap</h3>
          <div style="font-size: 12px; color: #fff; margin-bottom: 12px;">
            <div><strong>Ad Soyad:</strong> ${displayName}</div>
            <div><strong>Telefon:</strong> ${user.phone}</div>
          </div>
          <button onclick="window.openPersonalDetailsModal()" class="btn btn-outline-gold" style="width:100%; margin-bottom:6px;">👤 Bilgileri Düzenle</button>
          <button onclick="window.openChangePasswordModal()" class="btn btn-outline-gold" style="width:100%; margin-bottom:8px;">🔑 Şifre Değiştir</button>
          <button onclick="window.closeModal()" class="btn btn-gold" style="width: 100%;">Kapat</button>
        </div>
      </div>
    `;
  };

  window.openChangePasswordModal = () => {
    const root = document.getElementById('modal-root');
    if (!root) return;
    root.innerHTML = `
      <div class="modal-overlay" onclick="window.closeModal()">
        <div class="modal-card animate-fade" onclick="event.stopPropagation()">
          <h3 style="font-size: 15px; font-weight: 800; color: var(--gold-primary); margin-bottom: 12px;">🔑 Şifre Değiştir</h3>
          <input type="password" id="owner-pwd-curr" class="input-field" placeholder="Mevcut Şifre">
          <input type="password" id="owner-pwd-new" class="input-field" placeholder="Yeni Şifre">
          <button onclick="window.submitOwnerPasswordChange()" class="btn btn-gold" style="width: 100%;">Kaydet</button>
        </div>
      </div>
    `;
  };

  window.submitOwnerPasswordChange = async () => {
    const curr = document.getElementById('owner-pwd-curr').value;
    const next = document.getElementById('owner-pwd-new').value;
    const dbUser = await fetchRecord(`users/${user.uid}`) || {};
    if (curr !== (dbUser.password || '123456')) {
      showErrorModal(t('errorTitle'), 'Mevcut şifre hatalı.');
      return;
    }
    await saveRecord(`users/${user.uid}/password`, next);
    window.closeModal();
    showSuccessModal(t('successTitle'), 'Şifreniz güncellendi.');
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
    showConfirmModal('Oturumu Kapat', 'Oturumunuzu kapatmak istediğinize emin misiniz?', () => {
      logoutUserSession();
      if (typeof onTabChange === 'function') onTabChange(null);
    });
  };

  window.openAppointmentDetailModal = (aptId) => {
    const apt = allApts.find(a => a.aptId === aptId);
    if (!apt) return;
    const root = document.getElementById('modal-root');
    if (!root) return;
    root.innerHTML = `
      <div class="modal-overlay" onclick="window.closeModal()">
        <div class="modal-card animate-fade" onclick="event.stopPropagation()">
          <h3 style="font-size: 15px; font-weight: 800; color: var(--gold-primary); margin-bottom: 12px;">📋 Randevu Detayı</h3>
          <div style="font-size: 12px; color: #fff; margin-bottom: 14px;">
            <div><strong>Müşteri:</strong> ${apt.customerName} (${apt.customerPhone})</div>
            <div><strong>Hizmet:</strong> ${getAptServiceName(apt)} (${apt.serviceDuration || 30} dk) - ${getAptPrice(apt)} TL</div>
            <div><strong>Berber:</strong> ${apt.staffName || 'Mustafa Usta'}</div>
            <div><strong>Tarih:</strong> ${apt.date} @ ${apt.time}</div>
          </div>
          <button onclick="window.closeModal()" class="btn btn-gold" style="width: 100%;">Kapat</button>
        </div>
      </div>
    `;
  };

  window.updateAppointmentStatusOwner = async (aptId, newStatus) => {
    const res = await fetch('/api/booking/update-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aptId, newStatus, userUid: user.uid })
    }).catch(() => null);
    window.renderOwnerScreen(user, onTabChange);
  };
}
