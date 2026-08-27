/* EZO STİLE v2 - Salon Owner Panel (Ana Sayfa, Advanced Ciro Analytics, Customer-Identical Manual Booking, Freeze-Free Toggle, VIP Profile) */
import { getAppointmentsForBusiness, fetchRecord, saveRecord, getServices, saveService, getStaffList, saveStaff } from '../db.js';
import { canAccessStaffRevenueAnalytics } from '../permissions.js';
import { SUPPORTED_LANGUAGES, isRtl, t } from '../config.js';
import { showSuccessModal, showErrorModal, showConfirmModal } from './portal.js';
import { logoutUserSession } from '../auth.js';

let activeOwnerTab = 'dashboard'; // 'dashboard' (Ana Sayfa), 'ciro', 'appointments', 'management', 'profile'
let activeAptView = 'menu'; // 'menu', 'pending', 'approved', 'completed', 'requests', 'cancelled_rejected', 'bugun'
let ciroTimeframe = 'day'; // 'day', 'week', 'month', 'history'
let selectedCiroDate = new Date().toISOString().split('T')[0];
let selectedCiroYear = new Date().getFullYear();
let selectedCiroMonth = new Date().getMonth() + 1;

let isSavingBookingToggle = false; // Freeze-free async lock guard (Requirement 2)

// STATE FOR CUSTOMER-IDENTICAL MANUAL BOOKING MODAL (Requirement 1)
let manualBookingState = {
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
  // 1. PATRON ANA SAYFA (REQUIREMENTS 1 & 2)
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

      <!-- QUICK ACTIONS: MANUEL RANDEVU & FREEZE-FREE BOOKING TOGGLE -->
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
  // 2. ADVANCED CİRO EKRANI (REQUIREMENTS 4, 5, 6, 7, 8, 9, 10, 11)
  // ==========================================
  else if (activeOwnerTab === 'ciro') {
    const isPremium = canAccessStaffRevenueAnalytics(bizRecord);
    let ciroBodyHtml = '';

    if (ciroTimeframe === 'day') {
      // GÜNLÜK CİRO (REQUIREMENT 5)
      const dayApts = allApts.filter(a => a && a.date === selectedCiroDate);
      const dayCompleted = dayApts.filter(a => a && a.status === 'completed');
      const dayCancelled = dayApts.filter(a => a && (a.status === 'cancelled' || a.status === 'rejected'));
      const dayNoShow = dayApts.filter(a => a && a.status === 'no_show');

      // SEPARATE REAL REVENUE & LOST POTENTIAL REVENUE
      const totalRevenue = dayCompleted.reduce((sum, a) => sum + getAptPrice(a), 0);
      const cancelledLostRevenue = dayCancelled.reduce((sum, a) => sum + getAptPrice(a), 0);
      const noShowLostRevenue = dayNoShow.reduce((sum, a) => sum + getAptPrice(a), 0);
      const totalLostRevenue = cancelledLostRevenue + noShowLostRevenue;

      const completedCount = dayCompleted.length;
      const uniqueCustomers = new Set(dayCompleted.map(a => a.customerPhone || a.customerUid)).size;
      const avgOrder = completedCount > 0 ? Math.round(totalRevenue / completedCount) : 0;

      // DETAILED LISTS FOR DAY
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
          <div class="card" style="padding: 10px; text-align: center;">
            <div style="font-size: 10px; color: var(--text-muted);">${t('avgTransaction', currentLang)}</div>
            <div style="font-size: 16px; font-weight: 800; color: var(--gold-primary);">${avgOrder} TL</div>
          </div>
          <div class="card" style="padding: 10px; text-align: center;">
            <div style="font-size: 10px; color: var(--text-muted);">İptal / No-Show</div>
            <div style="font-size: 16px; font-weight: 800; color: #ef4444;">${dayCancelled.length} / ${dayNoShow.length}</div>
          </div>
        </div>

        <!-- 3 DETAILED SECTIONS -->
        <h4 style="font-size: 12px; font-weight: 800; color: #22c55e; margin-bottom: 6px;">✅ Tamamlanan İşlemler (${completedCount}) - Toplam: ${totalRevenue} TL</h4>
        ${completedCount === 0 ? '<div style="font-size: 11px; color: var(--text-muted); padding: 8px;">Tamamlanmış işlem bulunmuyor.</div>' : completedRowsHtml}

        <h4 style="font-size: 12px; font-weight: 800; color: #ef4444; margin-top: 14px; margin-bottom: 4px;">❌ İptal Edilenler (${dayCancelled.length}) - İptal Nedeniyle Kaçırılan: ${cancelledLostRevenue} TL</h4>
        ${dayCancelled.length === 0 ? '<div style="font-size: 11px; color: var(--text-muted); padding: 8px;">İptal edilen işlem yok.</div>' : cancelledRowsHtml}

        <h4 style="font-size: 12px; font-weight: 800; color: #ef4444; margin-top: 14px; margin-bottom: 4px;">🚫 Gelmeyenler / No-Show (${dayNoShow.length}) - No-Show Nedeniyle Kaçırılan: ${noShowLostRevenue} TL</h4>
        ${dayNoShow.length === 0 ? '<div style="font-size: 11px; color: var(--text-muted); padding: 8px;">No-show kaydı yok.</div>' : noShowRowsHtml}
      `;
    } else if (ciroTimeframe === 'week') {
      // HAFTALIK CİRO WITH DRILL-DOWN (REQUIREMENTS 6 & 10)
      const now = new Date(selectedCiroDate);
      const dayOfWeek = (now.getDay() + 6) % 7;
      const monday = new Date(now);
      monday.setDate(now.getDate() - dayOfWeek);

      const dayNames = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
      let weeklyRealTotal = 0;
      let weeklyLostTotal = 0;
      let weeklyCompleted = 0;
      let weeklyCancelled = 0;
      let weeklyNoShow = 0;
      const weeklyCustomers = new Set();
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
        weeklyCancelled += dayCancelledApts.length;
        weeklyNoShow += dayNoShowApts.length;
        dayCompletedApts.forEach(a => weeklyCustomers.add(a.customerPhone || a.customerUid));

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
          <div class="card" style="padding: 10px; text-align: center;">
            <div style="font-size: 10px; color: var(--text-muted);">Tamamlanan İşlem</div>
            <div style="font-size: 16px; font-weight: 800; color: #fff;">${weeklyCompleted}</div>
          </div>
          <div class="card" style="padding: 10px; text-align: center;">
            <div style="font-size: 10px; color: var(--text-muted);">Müşteri Sayısı</div>
            <div style="font-size: 16px; font-weight: 800; color: #fff;">${weeklyCustomers.size}</div>
          </div>
        </div>

        <h4 style="font-size: 12px; font-weight: 800; color: var(--gold-primary); margin-bottom: 8px;">📆 Haftalık Gün Dağılımı (Detay için güne tıklayın)</h4>
        ${dailyBreakdownHtml}
      `;
    } else if (ciroTimeframe === 'month') {
      // AYLIK CİRO WITH FULL CUSTOMER & PRICE DETAILS (REQUIREMENTS 7 & 10)
      const currentYearMonth = selectedCiroDate.substring(0, 7);
      const monthAllApts = allApts.filter(a => a && String(a.date).startsWith(currentYearMonth));

      const monthCompleted = monthAllApts.filter(a => a.status === 'completed');
      const monthCancelled = monthAllApts.filter(a => a.status === 'cancelled' || a.status === 'rejected');
      const monthNoShow = monthAllApts.filter(a => a.status === 'no_show');

      const monthlyRealTotal = monthCompleted.reduce((sum, a) => sum + getAptPrice(a), 0);
      const monthlyLostTotal = [...monthCancelled, ...monthNoShow].reduce((sum, a) => sum + getAptPrice(a), 0);
      const monthlyCustomers = new Set(monthCompleted.map(a => a.customerPhone || a.customerUid)).size;
      const avgOrder = monthCompleted.length > 0 ? Math.round(monthlyRealTotal / monthCompleted.length) : 0;

      const serviceRevenues = {};
      const staffRevenues = {};

      monthCompleted.forEach(a => {
        const price = getAptPrice(a);
        const svcName = getAptServiceName(a);
        serviceRevenues[svcName] = (serviceRevenues[svcName] || 0) + price;
        const staff = a.staffName || 'Mustafa Usta';
        staffRevenues[staff] = (staffRevenues[staff] || 0) + price;
      });

      const topService = Object.entries(serviceRevenues).sort((a, b) => b[1] - a[1])[0];
      const topStaff = Object.entries(staffRevenues).sort((a, b) => b[1] - a[1])[0];

      // DETAILED MONTHLY LISTS
      const completedListHtml = monthCompleted.map(a => `
        <div class="card" style="padding: 8px 10px; margin-bottom: 4px; display: flex; justify-content: space-between; align-items: center; font-size: 11px;">
          <div>
            <span style="color: var(--gold-primary); font-weight: 700;">📅 ${a.date} @ ${a.time}</span> • 
            <span style="color: #fff; font-weight: 800;">👤 ${a.customerName}</span> • 
            <span style="color: var(--text-muted);">✂️ ${getAptServiceName(a)} (${a.staffName || 'Mustafa Usta'})</span>
          </div>
          <span style="color: #22c55e; font-weight: 900;">+${getAptPrice(a)} TL</span>
        </div>
      `).join('');

      const cancelledListHtml = monthCancelled.map(a => `
        <div class="card" style="padding: 8px 10px; margin-bottom: 4px; display: flex; justify-content: space-between; align-items: center; font-size: 11px; border-color: #ef4444;">
          <div>
            <span style="color: #ef4444; font-weight: 700;">📅 ${a.date}</span> • 
            <span style="color: #fff; font-weight: 800;">👤 ${a.customerName}</span> • 
            <span style="color: var(--text-muted);">✂️ ${getAptServiceName(a)}</span>
          </div>
          <span style="color: #ef4444; font-weight: 800;">-${getAptPrice(a)} TL</span>
        </div>
      `).join('');

      const noShowListHtml = monthNoShow.map(a => `
        <div class="card" style="padding: 8px 10px; margin-bottom: 4px; display: flex; justify-content: space-between; align-items: center; font-size: 11px; border-color: #ef4444;">
          <div>
            <span style="color: #ef4444; font-weight: 700;">📅 ${a.date}</span> • 
            <span style="color: #fff; font-weight: 800;">👤 ${a.customerName}</span> • 
            <span style="color: var(--text-muted);">✂️ ${getAptServiceName(a)}</span>
          </div>
          <span style="color: #ef4444; font-weight: 800;">-${getAptPrice(a)} TL</span>
        </div>
      `).join('');

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
          <div class="card" style="padding: 10px; text-align: center;">
            <div style="font-size: 10px; color: var(--text-muted);">Tamamlanan</div>
            <div style="font-size: 16px; font-weight: 800; color: #fff;">${monthCompleted.length}</div>
          </div>
          <div class="card" style="padding: 10px; text-align: center;">
            <div style="font-size: 10px; color: var(--text-muted);">Toplam Müşteri</div>
            <div style="font-size: 16px; font-weight: 800; color: #fff;">${monthlyCustomers}</div>
          </div>
          <div class="card" style="padding: 10px; text-align: center;">
            <div style="font-size: 10px; color: var(--text-muted);">En Çok Kazandıran Hizmet</div>
            <div style="font-size: 12px; font-weight: 800; color: var(--gold-primary);">${topService ? `${topService[0]} (${topService[1]} TL)` : '-'}</div>
          </div>
          <div class="card" style="padding: 10px; text-align: center;">
            <div style="font-size: 10px; color: var(--text-muted);">En Çok Kazandıran Çalışan</div>
            <div style="font-size: 12px; font-weight: 800; color: var(--gold-primary);">${topStaff ? `${topStaff[0]} (${topStaff[1]} TL)` : '-'}</div>
          </div>
        </div>

        <h4 style="font-size: 12px; font-weight: 800; color: #22c55e; margin-bottom: 6px;">✅ Aylık Tamamlananlar (${monthCompleted.length}) - Toplam: ${monthlyRealTotal} TL</h4>
        ${monthCompleted.length === 0 ? '<div style="font-size: 11px; color: var(--text-muted); padding: 8px;">Kayıt yok.</div>' : completedListHtml}

        <h4 style="font-size: 12px; font-weight: 800; color: #ef4444; margin-top: 14px; margin-bottom: 4px;">❌ Aylık İptaller (${monthCancelled.length})</h4>
        ${monthCancelled.length === 0 ? '<div style="font-size: 11px; color: var(--text-muted); padding: 8px;">İptal yok.</div>' : cancelledListHtml}

        <h4 style="font-size: 12px; font-weight: 800; color: #ef4444; margin-top: 14px; margin-bottom: 4px;">🚫 Aylık No-Show (${monthNoShow.length})</h4>
        ${monthNoShow.length === 0 ? '<div style="font-size: 11px; color: var(--text-muted); padding: 8px;">No-show yok.</div>' : noShowListHtml}
      `;
    } else if (ciroTimeframe === 'history') {
      if (!isPremium) {
        ciroBodyHtml = `
          <div class="card card-gold animate-fade" style="padding: 24px; text-align: center; margin-top: 10px;">
            <div style="font-size: 40px; margin-bottom: 8px;">🔒</div>
            <h3 style="font-size: 16px; font-weight: 800; color: #fff; margin-bottom: 6px;">${t('historicalLocked', currentLang)}</h3>
            <p style="font-size: 11px; color: var(--text-muted); margin-bottom: 16px;">Son 2 yıla ait Ciro Geçmişine erişmek için Premium pakete geçin.</p>
          </div>
        `;
      } else {
        ciroBodyHtml = `
          <div class="card animate-fade" style="padding: 14px; text-align: center;">
            <h4 style="font-size: 13px; font-weight: 800; color: var(--gold-primary);">📊 2 Yıllık Ciro Geçmişi (Yıl → Ay Seçimi)</h4>
            <div style="font-size: 12px; color: #fff; margin-top: 8px;">Aktif Yıl: ${selectedCiroYear} • Seçili Ay: ${selectedCiroMonth}</div>
          </div>
        `;
      }
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
          <button onclick="window.setCiroTimeframe('history')" class="btn ${ciroTimeframe === 'history' ? 'btn-gold' : 'btn-secondary'}" style="flex: 1; font-size: 11px; padding: 6px;">${t('history', currentLang)}</button>
        </div>

        ${ciroBodyHtml}
      </div>
    `;
  }
  // ==========================================
  // 3. RANDEVULAR EKRANI (5 BÜYÜK MENÜ KARTI)
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

            <div onclick="window.setAppointmentView('requests')" class="card animate-fade" style="padding: 16px; cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <h4 style="font-size: 15px; font-weight: 800; color: #eab308;">🔄 İptal / Değişiklik Talepleri</h4>
                <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">Müşteriden gelen iptal ve saat talepleri</div>
              </div>
              <span class="badge badge-pending" style="font-size: 14px; font-weight: 900; padding: 6px 12px; background: #eab308; color: #000;">${requestsCount}</span>
            </div>

            <div onclick="window.setAppointmentView('cancelled_rejected')" class="card animate-fade" style="padding: 16px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; opacity: 0.85;">
              <div>
                <h4 style="font-size: 15px; font-weight: 800; color: #ef4444;">🚫 İptal / Ret / Gelmedi</h4>
                <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">Geçmiş iptal, ret ve no-show kayıtları</div>
              </div>
              <span class="badge badge-secondary" style="font-size: 14px; font-weight: 900; padding: 6px 12px; border-color: #ef4444; color: #ef4444;">${cancelledCount}</span>
            </div>
          </div>
        </div>
      `;
    } else {
      let targetApts = [];
      let viewTitle = '';

      if (activeAptView === 'bugun') {
        targetApts = todayApts.filter(a => a && (a.status === 'approved' || a.status === 'completed')).sort((a,b) => (a.time||'').localeCompare(b.time||''));
        viewTitle = '📅 Bugünkü Randevular';
      } else if (activeAptView === 'pending') {
        targetApts = allApts.filter(a => a && a.status === 'pending');
        viewTitle = '⏳ Bekleyen Randevular';
      } else if (activeAptView === 'approved') {
        targetApts = allApts.filter(a => a && a.status === 'approved').sort((a,b) => (a.date + a.time).localeCompare(b.date + b.time));
        viewTitle = '📅 Gelecek Randevular';
      } else if (activeAptView === 'completed') {
        targetApts = allApts.filter(a => a && a.status === 'completed');
        viewTitle = '✅ Tamamlanan Randevular';
      } else if (activeAptView === 'requests') {
        targetApts = allApts.filter(a => a && (a.status === 'cancel_requested' || a.status === 'reschedule_requested'));
        viewTitle = '🔄 İptal & Değişiklik Talepleri';
      } else if (activeAptView === 'cancelled_rejected') {
        targetApts = allApts.filter(a => a && (a.status === 'cancelled' || a.status === 'rejected' || a.status === 'no_show'));
        viewTitle = '🚫 İptal / Ret / Gelmedi Geçmişi';
      }

      const listCardsHtml = targetApts.map(apt => {
        const isCancelReq = apt.status === 'cancel_requested';
        const isReschedReq = apt.status === 'reschedule_requested';
        const isPending = apt.status === 'pending';
        const isApproved = apt.status === 'approved';

        return `
          <div class="card card-gold animate-fade" style="padding: 12px; margin-bottom: 10px; cursor: pointer;" onclick="window.openAppointmentDetailModal('${apt.aptId}')">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <div>
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span style="font-size: 13px; font-weight: 900; color: var(--gold-primary);">📅 ${apt.date} @ ${apt.time}</span>
                  <span style="font-size: 13px; font-weight: 800; color: #fff;">👤 ${apt.customerName}</span>
                </div>
                <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">
                  ✂️ ${getAptServiceName(apt)} • 💈 ${apt.staffName || 'Mustafa Usta'} • 💰 ${getAptPrice(apt)} TL
                </div>
              </div>
              <span class="badge ${apt.status === 'completed' ? 'badge-approved' : (isCancelReq || isReschedReq || isPending ? 'badge-pending' : 'badge-approved')}" style="font-size: 9px;">${t(apt.status, currentLang)}</span>
            </div>

            <div style="display: flex; gap: 6px; margin-top: 8px; flex-wrap: wrap;" onclick="event.stopPropagation()">
              ${isPending ? `
                <button onclick="window.updateAppointmentStatusOwner('${apt.aptId}', 'approved')" class="btn btn-gold" style="flex: 1; padding: 6px; font-size: 11px;">✅ Onayla</button>
                <button onclick="window.updateAppointmentStatusOwner('${apt.aptId}', 'rejected')" class="btn btn-secondary" style="flex: 1; padding: 6px; font-size: 11px; border-color: #ef4444; color: #ef4444;">❌ Reddet</button>
              ` : isApproved ? `
                <button onclick="window.updateAppointmentStatusOwner('${apt.aptId}', 'completed')" class="btn btn-gold" style="flex: 1; padding: 6px; font-size: 11px;">${t('arrived', currentLang)} (Tamamlandı)</button>
                <button onclick="window.updateAppointmentStatusOwner('${apt.aptId}', 'no_show')" class="btn btn-secondary" style="flex: 1; padding: 6px; font-size: 11px; border-color: #ef4444; color: #ef4444;">${t('notArrived', currentLang)}</button>
              ` : isCancelReq ? `
                <button onclick="window.ownerApproveCancel('${apt.aptId}')" class="btn btn-secondary" style="flex: 1; padding: 6px; font-size: 11px; border-color: #ef4444; color: #ef4444;">✅ İptali Onayla</button>
                <button onclick="window.ownerRejectCancel('${apt.aptId}')" class="btn btn-gold" style="flex: 1; padding: 6px; font-size: 11px;">❌ İptali Reddet</button>
              ` : isReschedReq ? `
                <button onclick="window.ownerApproveReschedule('${apt.aptId}', '${apt.requestedDate || apt.date}', '${apt.requestedTime || '14:00'}')" class="btn btn-gold" style="flex: 1; padding: 6px; font-size: 11px;">✅ Değişikliği Onayla</button>
                <button onclick="window.ownerRejectReschedule('${apt.aptId}')" class="btn btn-secondary" style="flex: 1; padding: 6px; font-size: 11px;">❌ Talebi Reddet</button>
              ` : ''}
            </div>
          </div>
        `;
      }).join('');

      mainHtml = `
        <div class="card animate-fade">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <h3 style="font-size: 15px; font-weight: 800; color: var(--gold-primary); margin: 0;">${viewTitle}</h3>
            <button onclick="window.setAppointmentView('menu')" class="btn btn-secondary" style="padding: 4px 8px; font-size: 10px;">${t('backBtn', currentLang)}</button>
          </div>

          ${targetApts.length === 0 ? '<div style="font-size: 12px; color: var(--text-muted); text-align: center; padding: 20px;">Bu kategoride randevu kaydı bulunmamaktadır.</div>' : listCardsHtml}
        </div>
      `;
    }
  }
  // ==========================================
  // 4. YÖNETİM ANA MENÜSÜ & CLOSED CARDS
  // ==========================================
  else if (activeOwnerTab === 'management') {
    const isPremium = canAccessStaffRevenueAnalytics(bizRecord);

    mainHtml = `
      <div class="card animate-fade">
        <h3 style="font-size: 16px; font-weight: 800; color: var(--gold-primary); margin-bottom: 12px;">⚙️ ${t('managementTab', currentLang)}</h3>
        <p style="font-size: 11px; color: var(--text-muted); margin-bottom: 14px;">
          Lütfen düzenlemek istediğiniz salon yönetim alanını seçiniz:
        </p>

        <div style="display: flex; flex-direction: column; gap: 10px;">
          <div onclick="window.openStaffManagementModal()" class="card animate-fade" style="padding: 16px; cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <h4 style="font-size: 15px; font-weight: 800; color: #fff;">👥 Personel Kadrosu & İzinleri</h4>
              <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">${staffList.length} kayıtlı çalışan ve rol yetkileri</div>
            </div>
            <span class="badge badge-approved" style="font-size: 12px;">Yönet →</span>
          </div>

          <div onclick="window.openServicesManagementModal()" class="card animate-fade" style="padding: 16px; cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <h4 style="font-size: 15px; font-weight: 800; color: #fff;">✂️ Hizmetler & Fiyatlar</h4>
              <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">${services.length} hizmet, fiyat ve süre ayarları</div>
            </div>
            <span class="badge badge-approved" style="font-size: 12px;">Yönet →</span>
          </div>

          <div onclick="window.openWeeklyScheduleModal()" class="card animate-fade" style="padding: 16px; cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <h4 style="font-size: 15px; font-weight: 800; color: #fff;">⏰ Çalışma Günleri & Saatleri</h4>
              <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">Haftalık 7 gün mesai ve kapalı gün ayarları</div>
            </div>
            <span class="badge badge-approved" style="font-size: 12px;">Düzenle →</span>
          </div>

          <div onclick="window.openSalonContactModal()" class="card animate-fade" style="padding: 16px; cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <h4 style="font-size: 15px; font-weight: 800; color: #fff;">💬 Salon İletişim Numaraları</h4>
              <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">WhatsApp ve SMS bildirim numaraları</div>
            </div>
            <span class="badge badge-approved" style="font-size: 12px;">Ayarla →</span>
          </div>

          <div class="card" style="padding: 14px; border-color: ${isPremium ? 'var(--gold-primary)' : 'var(--border-color)'}; opacity: ${isPremium ? '1' : '0.85'};">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <h4 style="font-size: 13px; font-weight: 800; color: #fff;">📦 Paket & Lisans Durumu</h4>
                <div style="font-size: 10px; color: var(--text-muted);">Paket: ${bizRecord.plan || 'FREE'} ${bizRecord.premiumSource === 'super_admin_grant' ? '(⚡ Premium Grant)' : ''}</div>
              </div>
              <span class="badge ${isPremium ? 'badge-approved' : 'badge-pending'}">${isPremium ? '✨ PREMIUM' : 'FREE'}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }
  // ==========================================
  // 5. PATRON PROFİLİ (REQUIREMENT 3 FIX - FULLY WORKING VIEW)
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
          <h3 style="font-size: 16px; font-weight: 800; color: #fff; margin-top: 8px;">${displayName}</h3>
          <div style="font-size: 12px; color: var(--gold-primary); font-weight: 700;">💈 ${bizRecord.name} • ${user.phone}</div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 8px;">
          <button onclick="window.openLanguageModalOwner()" class="btn btn-secondary" style="width: 100%; text-align: left; padding: 12px; display: flex; justify-content: space-between; align-items: center;">
            <span>🌐 ${t('language', currentLang)}</span>
            <span style="font-size: 12px; color: var(--gold-primary);">${currentLangObj.flag} ${currentLangObj.name}</span>
          </button>

          <button onclick="window.openNotificationSettingsModal()" class="btn btn-secondary" style="width: 100%; text-align: left; padding: 12px;">
            ${t('notificationSettings', currentLang)}
          </button>

          <button onclick="window.openPrivacyAccountModal()" class="btn btn-secondary" style="width: 100%; text-align: left; padding: 12px;">
            ${t('privacyAccount', currentLang)}
          </button>

          <button onclick="window.openHelpSupportModal()" class="btn btn-secondary" style="width: 100%; text-align: left; padding: 12px;">
            ${t('helpSupport', currentLang)}
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

  // GLOBAL STATE MUTATION BINDINGS
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

  // FREEZE-FREE ONLINE BOOKING TOGGLE WITH ASYNC LOCK (REQUIREMENT 2 P0 FIX)
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

  // CUSTOMER-IDENTICAL STEP-BY-STEP MANUAL BOOKING MODAL (REQUIREMENT 1)
  window.openManualBookingModal = () => {
    const root = document.getElementById('modal-root');
    if (!root) return;

    manualBookingState = {
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

    window.renderManualBookingModalContent();
  };

  window.renderManualBookingModalContent = () => {
    const root = document.getElementById('modal-root');
    if (!root) return;

    const todayDate = new Date().toISOString().split('T')[0];
    const tomorrowDate = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    // CALCULATE OCCUPIED SLOTS FOR SELECTED DATE & STAFF
    const occupiedSlots = new Set();
    allApts.forEach(apt => {
      if (apt && apt.businessId === businessId &&
          (apt.staffId === manualBookingState.staffId || manualBookingState.staffId === 'staff-any') &&
          apt.date === manualBookingState.date &&
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
      if (manualBookingState.date !== todayDate) return true;
      const [h, m] = hStr.split(':').map(Number);
      return (h * 60 + m) > currentMins;
    });

    const slotsHtml = visibleHours.map(h => {
      const isOccupied = occupiedSlots.has(h);
      const isSelected = manualBookingState.time === h;

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
      <div onclick="window.selectManualBookingService('${s.id}', '${s.name}', ${s.price}, ${s.duration || 30})" class="card" style="padding: 10px; margin-bottom: 6px; cursor: pointer; border-color: ${manualBookingState.serviceId === s.id ? 'var(--gold-primary)' : 'var(--border-color)'}; background: ${manualBookingState.serviceId === s.id ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.03)'}; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div style="font-size: 13px; font-weight: 800; color: #fff;">✂️ ${s.name} (${s.duration || 30} dk)</div>
        </div>
        <div style="font-size: 13px; font-weight: 900; color: var(--gold-primary);">${s.price} TL</div>
      </div>
    `).join('');

    root.innerHTML = `
      <div class="modal-overlay" onclick="window.closeModal()">
        <div class="modal-card animate-fade" onclick="event.stopPropagation()" style="max-height: 90vh; overflow-y: auto;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
            <h3 style="font-size: 15px; font-weight: 800; color: var(--gold-primary); margin: 0;">➕ Manuel Randevu Ekle (Müşteri UX)</h3>
            <button onclick="window.closeModal()" class="btn btn-secondary" style="padding: 4px 10px;">✕</button>
          </div>

          <!-- STEP 1: MÜŞTERİ BİLGİSİ -->
          <label style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">1. Müşteri Ad Soyad & Telefon *</label>
          <input type="text" id="manual-cust-name-input" value="${manualBookingState.customerName}" oninput="manualBookingState.customerName = this.value" class="input-field" placeholder="Ad Soyad (Örn: Ahmet Bey)">
          <input type="tel" id="manual-cust-phone-input" value="${manualBookingState.customerPhone}" oninput="manualBookingState.customerPhone = this.value" class="input-field" placeholder="Telefon (05XXXXXXXXX)">

          <!-- STEP 2: HİZMET SEÇİMİ (CUSTOMER IDENTICAL) -->
          <label style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">2. Hizmet Seçimi *</label>
          <div style="margin-top: 4px; margin-bottom: 12px;">
            ${services.length === 0 ? '<div style="font-size: 11px; color: var(--text-muted);">Henüz eklenmiş hizmet yok.</div>' : servicesHtml}
          </div>

          <!-- STEP 3: PERSONEL SEÇİMİ -->
          <label style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">3. Berber / Personel Seçimi</label>
          <div style="display: flex; gap: 6px; margin-bottom: 12px; margin-top: 4px; overflow-x: auto;">
            <button onclick="window.selectManualBookingStaff('staff-any', 'Fark Etmez')" class="btn ${manualBookingState.staffId === 'staff-any' ? 'btn-gold' : 'btn-secondary'}" style="padding: 6px 12px; font-size: 11px;">
              Fark Etmez
            </button>
            ${staffList.map(st => `
              <button onclick="window.selectManualBookingStaff('${st.id}', '${st.displayName}')" class="btn ${manualBookingState.staffId === st.id ? 'btn-gold' : 'btn-secondary'}" style="padding: 6px 12px; font-size: 11px;">
                💈 ${st.displayName}
              </button>
            `).join('')}
          </div>

          <!-- STEP 4: TARİH VE SAAT (SLOT GRID) -->
          <label style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">4. Tarih & Müsait Saat Seçimi *</label>
          <div style="display: flex; gap: 6px; margin-top: 4px; margin-bottom: 10px;">
            <button onclick="window.selectManualBookingDate('${todayDate}')" class="btn ${manualBookingState.date === todayDate ? 'btn-gold' : 'btn-secondary'}" style="flex: 1; font-size: 11px; padding: 6px;">
              Bugün
            </button>
            <button onclick="window.selectManualBookingDate('${tomorrowDate}')" class="btn ${manualBookingState.date === tomorrowDate ? 'btn-gold' : 'btn-secondary'}" style="flex: 1; font-size: 11px; padding: 6px;">
              Yarın
            </button>
            <input type="date" value="${manualBookingState.date}" onchange="window.selectManualBookingDate(this.value)" class="input-field" style="flex: 1; margin: 0; font-size: 11px; padding: 4px;">
          </div>

          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-bottom: 16px;">
            ${slotsHtml}
          </div>

          <button id="btn-submit-manual-booking" onclick="window.submitManualBooking()" class="btn btn-gold" style="width: 100%; min-height: 44px;" ${(!manualBookingState.serviceId || !manualBookingState.time) ? 'disabled' : ''}>
            ⚡ Manuel Randevuyu Onayla & Kaydet
          </button>
        </div>
      </div>
    `;
  };

  window.selectManualBookingService = (svcId, svcName, svcPrice, svcDur) => {
    manualBookingState.serviceId = svcId;
    manualBookingState.serviceName = svcName;
    manualBookingState.servicePrice = svcPrice;
    manualBookingState.serviceDuration = svcDur;
    window.renderManualBookingModalContent();
  };

  window.selectManualBookingStaff = (stfId, stfName) => {
    manualBookingState.staffId = stfId;
    manualBookingState.staffName = stfName;
    manualBookingState.time = null;
    window.renderManualBookingModalContent();
  };

  window.selectManualBookingDate = (d) => {
    manualBookingState.date = d;
    manualBookingState.time = null;
    window.renderManualBookingModalContent();
  };

  window.selectManualBookingTime = (h) => {
    manualBookingState.time = h;
    window.renderManualBookingModalContent();
  };

  window.submitManualBooking = async () => {
    const nameInput = document.getElementById('manual-cust-name-input');
    const phoneInput = document.getElementById('manual-cust-phone-input');

    const name = nameInput ? nameInput.value.trim() : manualBookingState.customerName;
    const phone = phoneInput ? phoneInput.value.trim() : manualBookingState.customerPhone;

    if (!name) {
      showErrorModal(t('errorTitle'), 'Lütfen müşteri ad soyad giriniz.');
      return;
    }
    if (!manualBookingState.serviceId || !manualBookingState.time) {
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
        staffId: manualBookingState.staffId,
        serviceId: manualBookingState.serviceId,
        serviceName: manualBookingState.serviceName,
        servicePrice: manualBookingState.servicePrice,
        serviceDuration: manualBookingState.serviceDuration,
        date: manualBookingState.date,
        time: manualBookingState.time,
        isManual: true,
        initialStatus: 'approved'
      })
    }).catch(() => null);

    const data = res ? await res.json().catch(() => null) : null;
    window.closeModal();

    if (res && res.ok && data && data.success) {
      showSuccessModal(t('successTitle'), '✅ Manuel randevu müşteri UX ile onaylı olarak kaydedildi.');
      renderOwnerScreen(user, onTabChange);
    } else {
      showErrorModal(t('errorTitle'), (data && data.error) ? data.error : 'Manuel randevu kaydedilemedi.');
    }
  };

  // ÇALIŞMA GÜNLERİ MODALI
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

          <button onclick="window.saveWeeklySchedule()" class="btn btn-gold" style="width: 100%;">
            💾 Saatleri Kaydet
          </button>
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

      updatedSchedule[k] = {
        isOpen: openEl ? openEl.checked : true,
        start: startEl ? startEl.value : '09:00',
        end: endEl ? endEl.value : '20:30'
      };
    });

    await saveRecord(`businesses/${businessId}/weeklySchedule`, updatedSchedule, 'PUT');
    window.closeModal();
    showSuccessModal(t('successTitle'), 'Haftalık çalışma saatleriniz kaydedildi.');
    renderOwnerScreen(user, onTabChange);
  };

  // PERSONEL EKLEME MODAL
  window.openStaffManagementModal = () => {
    const root = document.getElementById('modal-root');
    if (!root) return;

    const staffRowsHtml = staffList.map(st => `
      <div class="card" style="padding: 10px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div style="font-size: 13px; font-weight: 800; color: #fff;">
            ${st.role === 'manager' ? '👔' : (st.role === 'receptionist' ? '🧾' : '💈')} ${st.displayName}
          </div>
          <div style="font-size: 10px; color: var(--text-muted);">
            Rol: <span style="color: var(--gold-primary); font-weight: 700;">${st.role || 'barber'}</span> • ${st.active !== false ? '🟢 Aktif' : '⚫ Pasif'}
          </div>
        </div>
        <button onclick="window.openEditStaffModal('${st.id}')" class="btn btn-outline-gold" style="padding: 4px 8px; font-size: 10px;">
          ⚙️ Düzenle
        </button>
      </div>
    `).join('');

    root.innerHTML = `
      <div class="modal-overlay" onclick="window.closeModal()">
        <div class="modal-card animate-fade" onclick="event.stopPropagation()">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
            <h3 style="font-size: 15px; font-weight: 800; color: var(--gold-primary); margin: 0;">👥 Personel Yönetimi</h3>
            <button onclick="window.closeModal()" class="btn btn-secondary" style="padding: 4px 10px;">✕</button>
          </div>

          <div style="max-height: 200px; overflow-y: auto; margin-bottom: 14px;">
            ${staffList.length === 0 ? '<div style="font-size: 11px; color: var(--text-muted);">Henüz personel yok.</div>' : staffRowsHtml}
          </div>

          <h4 style="font-size: 13px; font-weight: 800; color: var(--gold-primary); margin-bottom: 8px;">➕ Yeni Personel Daveti</h4>
          <input type="text" id="add-staff-name-input" class="input-field" placeholder="Çalışan Adı Soyadı">
          <input type="tel" id="add-staff-phone-input" class="input-field" placeholder="05XXXXXXXXX">

          <label style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">Rol Seç *</label>
          <select id="add-staff-role-select" onchange="window.handleStaffRoleChange(this.value)" class="input-field" style="background-color: #1e1e1e; color: #ffffff; border: 1px solid var(--gold-primary); font-size: 12px; margin-bottom: 12px;">
            <option value="" style="background-color: #1e1e1e; color: #888888;">-- Rol Seçiniz --</option>
            <option value="manager" style="background-color: #1e1e1e; color: #ffffff;">👔 Yönetici</option>
            <option value="barber" style="background-color: #1e1e1e; color: #ffffff;">💈 Berber</option>
            <option value="receptionist" style="background-color: #1e1e1e; color: #ffffff;">🧾 Resepsiyon</option>
          </select>

          <div id="manager-permissions-box" style="display: none; padding: 10px; background: rgba(245,158,11,0.1); border: 1px dashed var(--gold-primary); border-radius: 8px; margin-bottom: 12px;">
            <div style="font-size: 11px; font-weight: 800; color: #fff; margin-bottom: 6px;">👔 Yönetici İzin Yetkileri</div>
            <label style="display: flex; align-items: center; gap: 6px; font-size: 11px; color: #fff; margin-bottom: 4px;">
              <input type="checkbox" id="perm-apt" checked> <span>Randevuları yönet</span>
            </label>
            <label style="display: flex; align-items: center; gap: 6px; font-size: 11px; color: #fff; margin-bottom: 4px;">
              <input type="checkbox" id="perm-cust" checked> <span>Müşteri bilgilerini gör</span>
            </label>
            <label style="display: flex; align-items: center; gap: 6px; font-size: 11px; color: #fff; margin-bottom: 4px;">
              <input type="checkbox" id="perm-sched" checked> <span>Personel takvimini gör</span>
            </label>
            <label style="display: flex; align-items: center; gap: 6px; font-size: 11px; color: #fff; margin-bottom: 4px;">
              <input type="checkbox" id="perm-hours" checked> <span>Çalışma saatlerini yönet</span>
            </label>
            <label style="display: flex; align-items: center; gap: 6px; font-size: 11px; color: #fff; margin-bottom: 4px;">
              <input type="checkbox" id="perm-svc" checked> <span>Hizmetleri yönet</span>
            </label>
            <label style="display: flex; align-items: center; gap: 6px; font-size: 11px; color: #fff;">
              <input type="checkbox" id="perm-fin"> <span>Ciroyu gör</span>
            </label>
          </div>

          <button id="btn-create-invite" onclick="window.submitCreateStaffInvite()" class="btn btn-gold" style="width: 100%; min-height: 42px;" disabled>
            🎟️ Davet Oluştur
          </button>
        </div>
      </div>
    `;
  };

  window.handleStaffRoleChange = (role) => {
    const btn = document.getElementById('btn-create-invite');
    const permBox = document.getElementById('manager-permissions-box');

    if (btn) btn.disabled = !role;
    if (permBox) permBox.style.display = role === 'manager' ? 'block' : 'none';
  };

  window.submitCreateStaffInvite = async () => {
    const name = document.getElementById('add-staff-name-input').value;
    const phone = document.getElementById('add-staff-phone-input').value;
    const role = document.getElementById('add-staff-role-select').value;

    if (!name || !role) {
      showErrorModal(t('errorTitle'), 'Lütfen ad soyad ve rol seçimini yapınız.');
      return;
    }

    const permissions = role === 'manager' ? {
      'appointments.manage': document.getElementById('perm-apt').checked,
      'customer.view': document.getElementById('perm-cust').checked,
      'schedule.view': document.getElementById('perm-sched').checked,
      'schedule.manage': document.getElementById('perm-hours').checked,
      'services.manage': document.getElementById('perm-svc').checked,
      'finance.view': document.getElementById('perm-fin').checked
    } : {};

    const res = await fetch('/api/staff/create-invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ownerUid: user.uid, displayName: name, phone, role, permissions })
    }).catch(() => null);

    const data = res ? await res.json().catch(() => null) : null;
    window.closeModal();

    if (res && res.ok && data && data.success) {
      showSuccessModal(t('successTitle'), `✅ Davet Oluşturuldu: ${data.token}`);
      renderOwnerScreen(user, onTabChange);
    } else {
      showErrorModal(t('errorTitle'), (data && data.error) ? data.error : 'Davet oluşturulamadı.');
    }
  };

  // PERSONEL DÜZENLE MODAL
  window.openEditStaffModal = (staffId) => {
    const st = staffList.find(s => s.id === staffId);
    if (!st) return;

    const root = document.getElementById('modal-root');
    if (!root) return;

    root.innerHTML = `
      <div class="modal-overlay" onclick="window.closeModal()">
        <div class="modal-card animate-fade" onclick="event.stopPropagation()">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
            <h3 style="font-size: 15px; font-weight: 800; color: var(--gold-primary); margin: 0;">⚙️ Personel Düzenle</h3>
            <button onclick="window.closeModal()" class="btn btn-secondary" style="padding: 4px 10px;">✕</button>
          </div>

          <label style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">Ad Soyad</label>
          <input type="text" id="edit-st-name" value="${st.displayName}" class="input-field">

          <label style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">Rol</label>
          <select id="edit-st-role" class="input-field" style="background-color: #1e1e1e; color: #ffffff; border: 1px solid var(--gold-primary);">
            <option value="barber" ${st.role === 'barber' ? 'selected' : ''}>💈 Berber</option>
            <option value="manager" ${st.role === 'manager' ? 'selected' : ''}>👔 Yönetici</option>
            <option value="receptionist" ${st.role === 'receptionist' ? 'selected' : ''}>🧾 Resepsiyon</option>
          </select>

          <label style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">Durum</label>
          <select id="edit-st-active" class="input-field" style="background-color: #1e1e1e; color: #ffffff; border: 1px solid var(--gold-primary);">
            <option value="true" ${st.active !== false ? 'selected' : ''}>🟢 Aktif</option>
            <option value="false" ${st.active === false ? 'selected' : ''}>⚫ Pasif</option>
          </select>

          <button onclick="window.saveEditedStaff('${st.id}')" class="btn btn-gold" style="width: 100%; margin-top: 10px;">
            💾 Kaydet
          </button>
        </div>
      </div>
    `;
  };

  window.saveEditedStaff = async (staffId) => {
    const name = document.getElementById('edit-st-name').value;
    const role = document.getElementById('edit-st-role').value;
    const active = document.getElementById('edit-st-active').value === 'true';

    await saveRecord(`businesses/${businessId}/staff/${staffId}/displayName`, name, 'PUT');
    await saveRecord(`businesses/${businessId}/staff/${staffId}/role`, role, 'PUT');
    await saveRecord(`businesses/${businessId}/staff/${staffId}/active`, active, 'PUT');

    window.closeModal();
    showSuccessModal(t('successTitle'), 'Personel güncellendi.');
    renderOwnerScreen(user, onTabChange);
  };

  // PROFİL MODALLARI
  window.openProfilePhotoModal = () => {
    const root = document.getElementById('modal-root');
    if (!root) return;

    root.innerHTML = `
      <div class="modal-overlay" onclick="window.closeModal()">
        <div class="modal-card animate-fade" onclick="event.stopPropagation()">
          <h3 style="font-size: 15px; font-weight: 800; color: var(--gold-primary); margin-bottom: 12px;">📷 Profil Fotoğrafı</h3>
          <input type="file" id="owner-photo-input" accept="image/jpeg,image/png,image/webp" style="display: none;" onchange="window.handleOwnerPhotoSelect(event)">

          <div style="display: flex; flex-direction: column; gap: 8px;">
            <button onclick="document.getElementById('owner-photo-input').click()" class="btn btn-gold">
              📤 Yükle / Değiştir
            </button>
            ${user.photoUrl ? `<button onclick="window.removeOwnerPhoto()" class="btn btn-secondary" style="border-color: #ef4444; color: #ef4444;">🗑️ Kaldır</button>` : ''}
            <button onclick="window.closeModal()" class="btn btn-secondary">Vazgeç</button>
          </div>
        </div>
      </div>
    `;
  };

  window.handleOwnerPhotoSelect = (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        canvas.width = 180;
        canvas.height = 180;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, 180, 180);

        const compressed = canvas.toDataURL('image/jpeg', 0.8);
        user.photoUrl = compressed;
        await saveRecord(`users/${user.uid}/photoUrl`, compressed);
        window.closeModal();
        showSuccessModal(t('successTitle'), 'Profil fotoğrafı güncellendi.');
        renderOwnerScreen(user, onTabChange);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  window.removeOwnerPhoto = async () => {
    user.photoUrl = null;
    await saveRecord(`users/${user.uid}/photoUrl`, null);
    window.closeModal();
    showSuccessModal(t('successTitle'), 'Profil fotoğrafı kaldırıldı.');
    renderOwnerScreen(user, onTabChange);
  };

  window.openLanguageModalOwner = () => {
    const root = document.getElementById('modal-root');
    if (!root) return;

    const langs = SUPPORTED_LANGUAGES || [
      { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
      { code: 'en', name: 'English', flag: '🇬🇧' },
      { code: 'ru', name: 'Русский', flag: '🇷🇺' },
      { code: 'ar', name: 'العربية', flag: '🇸🇦' },
      { code: 'tm', name: 'Türkmençe', flag: '🇹🇲' }
    ];

    const langRows = langs.map(l => `
      <button onclick="window.selectOwnerLanguage('${l.code}')" class="btn ${currentLang === l.code ? 'btn-gold' : 'btn-secondary'}" style="width: 100%; margin-bottom: 6px; text-align: left;">
        ${l.flag} ${l.name}
      </button>
    `).join('');

    root.innerHTML = `
      <div class="modal-overlay" onclick="window.closeModal()">
        <div class="modal-card animate-fade" onclick="event.stopPropagation()">
          <h3 style="font-size: 15px; font-weight: 800; color: var(--gold-primary); margin-bottom: 12px;">🌐 Dil Seçiniz / Select Language</h3>
          ${langRows}
          <button onclick="window.closeModal()" class="btn btn-secondary" style="width: 100%; margin-top: 8px;">Kapat</button>
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

  window.openNotificationSettingsModal = async () => {
    const root = document.getElementById('modal-root');
    if (!root) return;

    const prefs = await fetchRecord(`users/${user.uid}/notificationPreferences`) || { inApp: true, sound: true };

    root.innerHTML = `
      <div class="modal-overlay" onclick="window.closeModal()">
        <div class="modal-card animate-fade" onclick="event.stopPropagation()">
          <h3 style="font-size: 15px; font-weight: 800; color: var(--gold-primary); margin-bottom: 12px;">${t('notificationSettings', currentLang)}</h3>
          <label style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #fff; margin-bottom: 10px;">
            <span>🔔 Bildirimler</span>
            <input type="checkbox" id="pref-inapp" ${prefs.inApp !== false ? 'checked' : ''}>
          </label>
          <button onclick="window.saveOwnerNotificationPrefs()" class="btn btn-gold" style="width: 100%;">Kaydet</button>
        </div>
      </div>
    `;
  };

  window.saveOwnerNotificationPrefs = async () => {
    const prefs = { inApp: document.getElementById('pref-inapp').checked, updatedAt: new Date().toISOString() };
    await saveRecord(`users/${user.uid}/notificationPreferences`, prefs);
    window.closeModal();
    showSuccessModal(t('successTitle'), 'Bildirim ayarları kaydedildi.');
  };

  window.openPrivacyAccountModal = () => {
    const root = document.getElementById('modal-root');
    if (!root) return;

    root.innerHTML = `
      <div class="modal-overlay" onclick="window.closeModal()">
        <div class="modal-card animate-fade" onclick="event.stopPropagation()">
          <h3 style="font-size: 15px; font-weight: 800; color: var(--gold-primary); margin-bottom: 12px;">${t('privacyAccount', currentLang)}</h3>
          <div style="font-size: 12px; color: #fff; margin-bottom: 12px;">
            <div><strong>Ad Soyad:</strong> ${displayName}</div>
            <div><strong>Telefon:</strong> ${user.phone}</div>
            <div><strong>Salon:</strong> ${bizRecord.name}</div>
          </div>
          <button onclick="window.openChangePasswordModal()" class="btn btn-outline-gold" style="width: 100%; margin-bottom: 8px;">🔒 Şifre Değiştir</button>
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
          <h3 style="font-size: 15px; font-weight: 800; color: var(--gold-primary); margin-bottom: 12px;">🔒 Şifre Değiştir</h3>
          <input type="password" id="owner-pwd-curr" class="input-field" placeholder="Mevcut Şifre">
          <input type="password" id="owner-pwd-new" class="input-field" placeholder="Yeni Şifre">
          <input type="password" id="owner-pwd-conf" class="input-field" placeholder="Yeni Şifre Tekrar">
          <button onclick="window.submitOwnerPasswordChange()" class="btn btn-gold" style="width: 100%;">Kaydet</button>
        </div>
      </div>
    `;
  };

  window.submitOwnerPasswordChange = async () => {
    const curr = document.getElementById('owner-pwd-curr').value;
    const next = document.getElementById('owner-pwd-new').value;
    const conf = document.getElementById('owner-pwd-conf').value;

    const dbUser = await fetchRecord(`users/${user.uid}`) || {};
    const actualPwd = dbUser.password || '123456';

    if (curr !== actualPwd) {
      showErrorModal(t('errorTitle'), 'Mevcut şifre hatalı.');
      return;
    }
    if (!next || next !== conf) {
      showErrorModal(t('errorTitle'), 'Yeni şifreler eşleşmiyor.');
      return;
    }

    await saveRecord(`users/${user.uid}/password`, next);
    window.closeModal();
    showSuccessModal(t('successTitle'), 'Şifreniz güncellendi.');
  };

  window.openHelpSupportModal = () => {
    const root = document.getElementById('modal-root');
    if (!root) return;

    root.innerHTML = `
      <div class="modal-overlay" onclick="window.closeModal()">
        <div class="modal-card animate-fade" onclick="event.stopPropagation()">
          <h3 style="font-size: 15px; font-weight: 800; color: var(--gold-primary); margin-bottom: 12px;">${t('helpSupport', currentLang)}</h3>
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
    showSuccessModal(t('successTitle'), 'Destek mesajınız alındı.');
  };

  window.promptOwnerLogout = () => {
    showConfirmModal('Oturumu Kapat', 'Oturumunuzu kapatmak istediğinize emin misiniz?', () => {
      logoutUserSession();
      if (typeof onTabChange === 'function') onTabChange(null);
    });
  };

  window.openServicesManagementModal = () => {
    const root = document.getElementById('modal-root');
    if (!root) return;

    root.innerHTML = `
      <div class="modal-overlay" onclick="window.closeModal()">
        <div class="modal-card animate-fade" onclick="event.stopPropagation()">
          <h3 style="font-size: 15px; font-weight: 800; color: var(--gold-primary); margin-bottom: 12px;">✂️ Hizmetler & Fiyatlar</h3>
          <div style="margin-bottom: 12px;">
            ${services.map(s => `
              <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 12px; color: #fff;">
                <span>${s.name} (${s.duration || 30} dk)</span>
                <span style="color: var(--gold-primary); font-weight: 800;">${s.price} TL</span>
              </div>
            `).join('')}
          </div>
          <input type="text" id="add-svc-name" class="input-field" placeholder="Hizmet Adı">
          <input type="number" id="add-svc-price" class="input-field" placeholder="Fiyat (TL)">
          <input type="number" id="add-svc-dur" class="input-field" placeholder="Süre (dk)" value="30">
          <button onclick="window.submitAddNewService()" class="btn btn-gold" style="width: 100%;">➕ Kaydet</button>
        </div>
      </div>
    `;
  };

  window.submitAddNewService = async () => {
    const name = document.getElementById('add-svc-name').value;
    const price = parseInt(document.getElementById('add-svc-price').value) || 0;
    const duration = parseInt(document.getElementById('add-svc-dur').value) || 30;

    if (!name || !price) return;
    await saveService(businessId, { name, price, duration });
    window.closeModal();
    renderOwnerScreen(user, onTabChange);
  };

  window.openSalonContactModal = () => {
    const root = document.getElementById('modal-root');
    if (!root) return;

    root.innerHTML = `
      <div class="modal-overlay" onclick="window.closeModal()">
        <div class="modal-card animate-fade" onclick="event.stopPropagation()">
          <h3 style="font-size: 15px; font-weight: 800; color: var(--gold-primary); margin-bottom: 12px;">💬 İletişim Numaraları</h3>
          <input type="tel" id="set-wa-num" class="input-field" value="${bizRecord.businessWhatsAppNumber || ''}" placeholder="WhatsApp No">
          <input type="tel" id="set-sms-num" class="input-field" value="${bizRecord.businessSmsNumber || ''}" placeholder="SMS No">
          <button onclick="window.saveSalonContactSettings()" class="btn btn-gold" style="width: 100%;">Kaydet</button>
        </div>
      </div>
    `;
  };

  window.saveSalonContactSettings = async () => {
    const wa = document.getElementById('set-wa-num').value;
    const sms = document.getElementById('set-sms-num').value;
    await saveRecord(`businesses/${businessId}/businessWhatsAppNumber`, wa, 'PUT');
    await saveRecord(`businesses/${businessId}/businessSmsNumber`, sms, 'PUT');
    window.closeModal();
    renderOwnerScreen(user, onTabChange);
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
            <div><strong>Durum:</strong> ${apt.status}</div>
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

    const data = res ? await res.json().catch(() => null) : null;
    if (res && res.ok && data && data.success) {
      showSuccessModal(t('successTitle'), `Durum güncellendi: ${newStatus}`);
      renderOwnerScreen(user, onTabChange);
    } else {
      showErrorModal(t('errorTitle'), (data && data.error) ? data.error : 'Güncellenemedi.');
    }
  };

  window.ownerApproveCancel = async (aptId) => window.updateAppointmentStatusOwner(aptId, 'cancelled');
  window.ownerRejectCancel = async (aptId) => window.updateAppointmentStatusOwner(aptId, 'approved');
  window.ownerApproveReschedule = async (aptId, newDate, newTime) => {
    const res = await fetch('/api/booking/reschedule-approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aptId, newDate, newTime, userUid: user.uid })
    }).catch(() => null);
    window.closeModal();
    renderOwnerScreen(user, onTabChange);
  };
  window.ownerRejectReschedule = async (aptId) => window.updateAppointmentStatusOwner(aptId, 'approved');
}
