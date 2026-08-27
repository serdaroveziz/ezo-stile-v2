/* EZO STİLE v2 - Salon Owner Panel (Ana Sayfa, Dedicated Ciro Engine, 5 Big Booking Menus, Manuel Randevu, Randevu Toggle, Çalışma Saatleri, VIP Profile) */
import { getAppointmentsForBusiness, fetchRecord, saveRecord, getServices, saveService, getStaffList, saveStaff } from '../db.js';
import { canAccessStaffRevenueAnalytics } from '../permissions.js';
import { isRtl, t } from '../config.js';
import { showSuccessModal, showErrorModal, showConfirmModal } from './portal.js';
import { logoutUserSession } from '../auth.js';

let activeOwnerTab = 'dashboard'; // 'dashboard' (Ana Sayfa), 'ciro', 'appointments', 'management', 'profile'
let activeAptView = 'menu'; // 'menu', 'pending', 'approved', 'completed', 'requests', 'cancelled_rejected', 'bugun'
let ciroTimeframe = 'day'; // 'day', 'week', 'month', 'history'
let selectedCiroDate = new Date().toISOString().split('T')[0];
let selectedCiroYear = new Date().getFullYear();
let selectedCiroMonth = new Date().getMonth() + 1;

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
  const todayRevenue = todayCompleted.reduce((sum, a) => sum + (parseInt(a.servicePrice) || 350), 0);

  // USER AVATAR & INITIALS
  const displayName = user.displayName || user.name || 'Patron';
  const nameParts = displayName.trim().split(' ');
  const initials = nameParts.length >= 2
    ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
    : displayName.substring(0, 2).toUpperCase();

  let mainHtml = '';

  // ==========================================
  // 1. PATRON ANA SAYFA (REQUIREMENT 1, 2, 7, 8)
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
          <span class="badge ${isBookingOpen ? 'badge-approved' : 'badge-pending'}" style="font-size: 10px;">
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

      <!-- QUICK ACTIONS: MANUEL RANDEVU & BOOKING TOGGLE (REQUIREMENT 2, 7, 8) -->
      <div class="card animate-fade" style="padding: 16px; margin-bottom: 14px;">
        <h4 style="font-size: 13px; font-weight: 800; color: var(--gold-primary); margin-bottom: 10px;">🚀 Hızlı İşlemler</h4>
        
        <div style="display: flex; flex-direction: column; gap: 10px;">
          <button onclick="window.openManualBookingModal()" class="btn btn-gold" style="width: 100%; min-height: 42px; font-size: 13px; font-weight: 800;">
            ➕ Manuel Randevu Ekle
          </button>

          <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: rgba(255,255,255,0.05); border-radius: 8px;">
            <div>
              <div style="font-size: 12px; font-weight: 800; color: #fff;">Online Randevu Sistemi</div>
              <div style="font-size: 10px; color: var(--text-muted);">${isBookingOpen ? 'Müşteriler online randevu alabilir' : 'Online randevu alımı kapalıdır'}</div>
            </div>
            <button onclick="window.toggleBookingSystemEnabled(${!isBookingOpen})" class="btn ${isBookingOpen ? 'btn-secondary' : 'btn-gold'}" style="padding: 6px 12px; font-size: 11px;">
              ${isBookingOpen ? '🔴 Randevuyu Kapat' : '🟢 Randevuyu Aç'}
            </button>
          </div>
        </div>
      </div>
    `;
  }
  // ==========================================
  // 2. AYRI CİRO EKRANI (REQUIREMENT 3, 4, 5, 6, 7, 8)
  // ==========================================
  else if (activeOwnerTab === 'ciro') {
    const isPremium = canAccessStaffRevenueAnalytics(bizRecord);
    let ciroBodyHtml = '';

    if (ciroTimeframe === 'day') {
      const dayApts = allApts.filter(a => a && a.date === selectedCiroDate);
      const dayCompleted = dayApts.filter(a => a && a.status === 'completed');
      const dayCancelled = dayApts.filter(a => a && (a.status === 'cancelled' || a.status === 'rejected'));
      const dayNoShow = dayApts.filter(a => a && a.status === 'no_show');

      const totalRevenue = dayCompleted.reduce((sum, a) => sum + (parseInt(a.servicePrice) || 350), 0);
      const completedCount = dayCompleted.length;
      const uniqueCustomers = new Set(dayCompleted.map(a => a.customerPhone || a.customerUid)).size;
      const avgOrder = completedCount > 0 ? Math.round(totalRevenue / completedCount) : 0;

      const transactionsHtml = dayCompleted.map(a => `
        <div class="card" style="padding: 10px; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-size: 12px; font-weight: 800; color: #fff;">⏰ ${a.time} • 👤 ${a.customerName}</div>
            <div style="font-size: 10px; color: var(--text-muted);">✂️ ${a.serviceName} • 💈 ${a.staffName || 'Mustafa Usta'}</div>
          </div>
          <div style="font-size: 13px; font-weight: 900; color: #22c55e;">+${a.servicePrice || 350} TL</div>
        </div>
      `).join('');

      ciroBodyHtml = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <input type="date" value="${selectedCiroDate}" onchange="window.setSelectedCiroDate(this.value)" class="input-field" style="margin: 0; font-size: 11px; padding: 4px 8px; width: 140px;">
          <span style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">📅 Günlük Ciro Özeti</span>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 14px;">
          <div class="card" style="padding: 10px; text-align: center;">
            <div style="font-size: 10px; color: var(--text-muted);">${t('totalRevenue', currentLang)}</div>
            <div style="font-size: 20px; font-weight: 900; color: #22c55e;">${totalRevenue} TL</div>
          </div>
          <div class="card" style="padding: 10px; text-align: center;">
            <div style="font-size: 10px; color: var(--text-muted);">${t('completedCount', currentLang)}</div>
            <div style="font-size: 20px; font-weight: 900; color: #fff;">${completedCount}</div>
          </div>
          <div class="card" style="padding: 10px; text-align: center;">
            <div style="font-size: 10px; color: var(--text-muted);">${t('customerCount', currentLang)}</div>
            <div style="font-size: 18px; font-weight: 800; color: #fff;">${uniqueCustomers}</div>
          </div>
          <div class="card" style="padding: 10px; text-align: center;">
            <div style="font-size: 10px; color: var(--text-muted);">${t('avgTransaction', currentLang)}</div>
            <div style="font-size: 18px; font-weight: 800; color: var(--gold-primary);">${avgOrder} TL</div>
          </div>
          <div class="card" style="padding: 10px; text-align: center;">
            <div style="font-size: 10px; color: var(--text-muted);">${t('cancelCount', currentLang)}</div>
            <div style="font-size: 16px; font-weight: 800; color: #ef4444;">${dayCancelled.length}</div>
          </div>
          <div class="card" style="padding: 10px; text-align: center;">
            <div style="font-size: 10px; color: var(--text-muted);">${t('noShowCount', currentLang)}</div>
            <div style="font-size: 16px; font-weight: 800; color: #ef4444;">${dayNoShow.length}</div>
          </div>
        </div>

        <h4 style="font-size: 12px; font-weight: 800; color: var(--gold-primary); margin-bottom: 8px;">📜 Tamamlanan İşlem Detayları (${completedCount})</h4>
        ${completedCount === 0 ? '<div style="font-size: 11px; color: var(--text-muted); text-align: center; padding: 14px;">Bu tarihte tamamlanmış işlem bulunmamaktadır.</div>' : transactionsHtml}
      `;
    } else if (ciroTimeframe === 'week') {
      const now = new Date(selectedCiroDate);
      const dayOfWeek = (now.getDay() + 6) % 7;
      const monday = new Date(now);
      monday.setDate(now.getDate() - dayOfWeek);

      const dayNames = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
      let weeklyTotal = 0;
      let weeklyCompleted = 0;
      const weeklyCustomers = new Set();
      const dayStats = [];

      for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        
        const dayApts = allApts.filter(a => a && a.date === dateStr && a.status === 'completed');
        const dayRev = dayApts.reduce((sum, a) => sum + (parseInt(a.servicePrice) || 350), 0);
        
        weeklyTotal += dayRev;
        weeklyCompleted += dayApts.length;
        dayApts.forEach(a => weeklyCustomers.add(a.customerPhone || a.customerUid));

        dayStats.push({ dateStr, dayName: dayNames[i], revenue: dayRev, count: dayApts.length });
      }

      const dailyBreakdownHtml = dayStats.map(d => `
        <div onclick="window.setSelectedCiroDate('${d.dateStr}', 'day')" class="card" style="padding: 10px; margin-bottom: 6px; cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-size: 12px; font-weight: 800; color: #fff;">📅 ${d.dayName} (${d.dateStr})</div>
            <div style="font-size: 10px; color: var(--text-muted);">${d.count} Tamamlanan İşlem</div>
          </div>
          <div style="font-size: 13px; font-weight: 900; color: var(--gold-primary);">${d.revenue} TL →</div>
        </div>
      `).join('');

      ciroBodyHtml = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 14px;">
          <div class="card" style="padding: 10px; text-align: center;">
            <div style="font-size: 10px; color: var(--text-muted);">${t('weeklyTotal', currentLang)}</div>
            <div style="font-size: 20px; font-weight: 900; color: #22c55e;">${weeklyTotal} TL</div>
          </div>
          <div class="card" style="padding: 10px; text-align: center;">
            <div style="font-size: 10px; color: var(--text-muted);">${t('dailyAverage', currentLang)}</div>
            <div style="font-size: 20px; font-weight: 900; color: #fff;">${Math.round(weeklyTotal / 7)} TL</div>
          </div>
        </div>

        <h4 style="font-size: 12px; font-weight: 800; color: var(--gold-primary); margin-bottom: 8px;">📆 Günlük Ciro Dağılımı</h4>
        ${dailyBreakdownHtml}
      `;
    } else if (ciroTimeframe === 'month') {
      const currentYearMonth = selectedCiroDate.substring(0, 7);
      const monthApts = allApts.filter(a => a && a.status === 'completed' && String(a.date).startsWith(currentYearMonth));
      const monthlyTotal = monthApts.reduce((sum, a) => sum + (parseInt(a.servicePrice) || 350), 0);

      ciroBodyHtml = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 14px;">
          <div class="card" style="padding: 10px; text-align: center;">
            <div style="font-size: 10px; color: var(--text-muted);">${t('monthlyTotal', currentLang)}</div>
            <div style="font-size: 20px; font-weight: 900; color: #22c55e;">${monthlyTotal} TL</div>
          </div>
          <div class="card" style="padding: 10px; text-align: center;">
            <div style="font-size: 10px; color: var(--text-muted);">${t('completedCount', currentLang)}</div>
            <div style="font-size: 20px; font-weight: 900; color: #fff;">${monthApts.length}</div>
          </div>
        </div>
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
            <h4 style="font-size: 13px; font-weight: 800; color: var(--gold-primary);">📊 2 Yıllık Ciro Geçmişi</h4>
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
                  ✂️ ${apt.serviceName} • 💈 ${apt.staffName || 'Mustafa Usta'} • 💰 ${apt.servicePrice || 350} TL
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
  // 4. YÖNETİM ANA MENÜSÜ & CLOSED CARDS (REQUIREMENT 5 & 11)
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
          <!-- CARD 1: PERSONEL (CLOSED BY DEFAULT - REQUIREMENT 5) -->
          <div onclick="window.openStaffManagementModal()" class="card animate-fade" style="padding: 16px; cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <h4 style="font-size: 15px; font-weight: 800; color: #fff;">👥 Personel Kadrosu & İzinleri</h4>
              <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">${staffList.length} kayıtlı çalışan ve rol yetkileri</div>
            </div>
            <span class="badge badge-approved" style="font-size: 12px;">Yönet →</span>
          </div>

          <!-- CARD 2: HİZMETLER -->
          <div onclick="window.openServicesManagementModal()" class="card animate-fade" style="padding: 16px; cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <h4 style="font-size: 15px; font-weight: 800; color: #fff;">✂️ Hizmetler & Fiyatlar</h4>
              <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">${services.length} hizmet, fiyat ve süre ayarları</div>
            </div>
            <span class="badge badge-approved" style="font-size: 12px;">Yönet →</span>
          </div>

          <!-- CARD 3: ÇALIŞMA GÜNLERİ & SAATLERİ (REQUIREMENT 9) -->
          <div onclick="window.openWeeklyScheduleModal()" class="card animate-fade" style="padding: 16px; cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <h4 style="font-size: 15px; font-weight: 800; color: #fff;">⏰ Çalışma Günleri & Saatleri</h4>
              <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">Haftalık 7 gün mesai ve kapalı gün ayarları</div>
            </div>
            <span class="badge badge-approved" style="font-size: 12px;">Düzenle →</span>
          </div>

          <!-- CARD 4: İLETİŞİM -->
          <div onclick="window.openSalonContactModal()" class="card animate-fade" style="padding: 16px; cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <h4 style="font-size: 15px; font-weight: 800; color: #fff;">💬 Salon İletişim Numaraları</h4>
              <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">WhatsApp ve SMS bildirim numaraları</div>
            </div>
            <span class="badge badge-approved" style="font-size: 12px;">Ayarla →</span>
          </div>

          <!-- CARD 5: PAKETİM -->
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
  // 5. PATRON PROFİLİ & VIP MODALLARI (REQUIREMENT 4)
  // ==========================================
  else if (activeOwnerTab === 'profile') {
    const currentLangObj = SUPPORTED_LANGUAGES.find(l => l.code === currentLang) || SUPPORTED_LANGUAGES[0];

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
          <button onclick="window.openLanguageModal()" class="btn btn-secondary" style="width: 100%; text-align: left; padding: 12px; display: flex; justify-content: space-between; align-items: center;">
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

  // HEADER & FINAL BOTTOM NAV (REQUIREMENT 1: Ana Sayfa | Ciro | Randevular | Yönetim | Profil)
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

  // RANDEVU SİSTEMİ AÇ/KAPAT TOGGLE (REQUIREMENT 8)
  window.toggleBookingSystemEnabled = async (newStatus) => {
    bizRecord.bookingEnabled = newStatus;
    await saveRecord(`businesses/${businessId}/bookingEnabled`, newStatus, 'PUT');
    showSuccessModal(t('successTitle'), newStatus ? '🟢 Online randevu alımı başarıyla açıldı.' : '🔴 Online randevu alımı geçici olarak kapatıldı.');
    renderOwnerScreen(user, onTabChange);
  };

  // MANUEL RANDEVU MODALI (REQUIREMENT 7)
  window.openManualBookingModal = () => {
    const root = document.getElementById('modal-root');
    if (!root) return;

    const serviceOptionsHtml = services.map(s => `<option value="${s.id}" data-name="${s.name}" data-price="${s.price}" data-dur="${s.duration || 30}">✂️ ${s.name} (${s.duration || 30} dk) - ${s.price} TL</option>`).join('');
    const staffOptionsHtml = staffList.map(st => `<option value="${st.id}" data-name="${st.displayName}">💈 ${st.displayName}</option>`).join('');

    root.innerHTML = `
      <div class="modal-overlay" onclick="window.closeModal()">
        <div class="modal-card animate-fade" onclick="event.stopPropagation()">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
            <h3 style="font-size: 15px; font-weight: 800; color: var(--gold-primary); margin: 0;">➕ Manuel Randevu Ekle</h3>
            <button onclick="window.closeModal()" class="btn btn-secondary" style="padding: 4px 10px;">✕</button>
          </div>

          <label style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">Müşteri Adı Soyadı *</label>
          <input type="text" id="manual-cust-name" class="input-field" placeholder="Örn: Serdar Bey">

          <label style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">Müşteri Telefonu *</label>
          <input type="tel" id="manual-cust-phone" class="input-field" placeholder="05XXXXXXXXX" value="05550000000">

          <label style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">Hizmet Seç *</label>
          <select id="manual-service-select" class="input-field" style="background-color: #1e1e1e; color: #fff; border: 1px solid var(--gold-primary);">
            ${serviceOptionsHtml}
          </select>

          <label style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">Personel Seç *</label>
          <select id="manual-staff-select" class="input-field" style="background-color: #1e1e1e; color: #fff; border: 1px solid var(--gold-primary);">
            <option value="staff-any">Fark Etmez</option>
            ${staffOptionsHtml}
          </select>

          <div style="display: flex; gap: 8px;">
            <div style="flex: 1;">
              <label style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">Tarih *</label>
              <input type="date" id="manual-date" value="${todayStr}" class="input-field">
            </div>
            <div style="flex: 1;">
              <label style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">Saat *</label>
              <input type="text" id="manual-time" value="14:00" class="input-field" placeholder="14:00">
            </div>
          </div>

          <button onclick="window.submitManualBooking()" class="btn btn-gold" style="width: 100%; margin-top: 8px;">
            ⚡ Manuel Randevuyu Kaydet
          </button>
        </div>
      </div>
    `;
  };

  window.submitManualBooking = async () => {
    const custName = document.getElementById('manual-cust-name').value;
    const custPhone = document.getElementById('manual-cust-phone').value;
    const svcEl = document.getElementById('manual-service-select');
    const stfEl = document.getElementById('manual-staff-select');
    const date = document.getElementById('manual-date').value;
    const time = document.getElementById('manual-time').value;

    if (!custName || !date || !time || !svcEl) {
      showErrorModal(t('errorTitle'), 'Lütfen müşteri adı, tarih ve saat alanlarını doldurunuz.');
      return;
    }

    const selectedOption = svcEl.options[svcEl.selectedIndex];
    const serviceId = svcEl.value;
    const serviceName = selectedOption.getAttribute('data-name') || 'Hizmet';
    const servicePrice = parseInt(selectedOption.getAttribute('data-price')) || 350;
    const serviceDuration = parseInt(selectedOption.getAttribute('data-dur')) || 30;

    const staffId = stfEl ? stfEl.value : 'staff-any';

    const res = await fetch('/api/booking/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessId,
        customerUid: 'usr_manual_' + Date.now(),
        customerName: custName,
        customerPhone: custPhone || '05550000000',
        staffId,
        serviceId,
        serviceName,
        servicePrice,
        serviceDuration,
        date,
        time,
        isManual: true,
        initialStatus: 'approved'
      })
    }).catch(() => null);

    const data = res ? await res.json().catch(() => null) : null;
    window.closeModal();

    if (res && res.ok && data && data.success) {
      showSuccessModal(t('successTitle'), '✅ Manuel randevu onaylı olarak kaydedildi.');
      renderOwnerScreen(user, onTabChange);
    } else {
      showErrorModal(t('errorTitle'), (data && data.error) ? data.error : 'Manuel randevu kaydedilemedi.');
    }
  };

  // ÇALIŞMA GÜNLERİ & SAATLERİ MODALI (REQUIREMENT 9)
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
    showSuccessModal(t('successTitle'), 'Haftalık çalışma saatleriniz kaydedildi ve müşteri randevu takvimine bağlandı.');
    renderOwnerScreen(user, onTabChange);
  };

  // PERSONEL EKLEME MODAL (REQUIREMENT 15, 16, 17 - WITH THEME READABILITY FIX)
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

          <!-- READABLE DARK THEMED SELECT DROPDOWN (REQUIREMENT 6) -->
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
      showErrorModal(t('errorTitle'), 'Lütfen ad soyad ve rol seçimini eksiksiz yapınız.');
      return;
    }

    if (!['manager', 'barber', 'receptionist'].includes(role)) {
      showErrorModal(t('errorTitle'), 'Owner veya Super Admin rolü atanamaz.');
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
      body: JSON.stringify({
        ownerUid: user.uid,
        displayName: name,
        phone,
        role,
        permissions
      })
    }).catch(() => null);

    const data = res ? await res.json().catch(() => null) : null;
    window.closeModal();

    if (res && res.ok && data && data.success) {
      showSuccessModal(t('successTitle'), `✅ Personel davet tokenı oluşturuldu! Davet Kodu: ${data.token}`);
      renderOwnerScreen(user, onTabChange);
    } else {
      showErrorModal(t('errorTitle'), (data && data.error) ? data.error : 'Davet oluşturulamadı.');
    }
  };

  // PERSONEL DÜZENLE MODAL (REQUIREMENT 6 & 20 - READABLE SELECTORS)
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
            <option value="barber" ${st.role === 'barber' ? 'selected' : ''} style="background-color: #1e1e1e; color: #ffffff;">💈 Berber</option>
            <option value="manager" ${st.role === 'manager' ? 'selected' : ''} style="background-color: #1e1e1e; color: #ffffff;">👔 Yönetici</option>
            <option value="receptionist" ${st.role === 'receptionist' ? 'selected' : ''} style="background-color: #1e1e1e; color: #ffffff;">🧾 Resepsiyon</option>
          </select>

          <label style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">Durum</label>
          <select id="edit-st-active" class="input-field" style="background-color: #1e1e1e; color: #ffffff; border: 1px solid var(--gold-primary);">
            <option value="true" ${st.active !== false ? 'selected' : ''} style="background-color: #1e1e1e; color: #22c55e;">🟢 Aktif</option>
            <option value="false" ${st.active === false ? 'selected' : ''} style="background-color: #1e1e1e; color: #ef4444;">⚫ Pasif</option>
          </select>

          <button onclick="window.saveEditedStaff('${st.id}')" class="btn btn-gold" style="width: 100%; margin-top: 10px;">
            💾 Değişiklikleri Kaydet
          </button>
        </div>
      </div>
    `;
  };

  window.saveEditedStaff = async (staffId) => {
    const name = document.getElementById('edit-st-name').value;
    const role = document.getElementById('edit-st-role').value;
    const active = document.getElementById('edit-st-active').value === 'true';

    if (!name || !role) {
      showErrorModal(t('errorTitle'), 'Lütfen isim ve rol alanlarını doldurunuz.');
      return;
    }

    await saveRecord(`businesses/${businessId}/staff/${staffId}/displayName`, name, 'PUT');
    await saveRecord(`businesses/${businessId}/staff/${staffId}/role`, role, 'PUT');
    await saveRecord(`businesses/${businessId}/staff/${staffId}/active`, active, 'PUT');

    await fetch('/api/audit/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        actorUid: user.uid,
        action: 'STAFF_ROLE_UPDATE',
        targetId: staffId,
        details: { newRole: role, newName: name }
      })
    }).catch(() => null);

    window.closeModal();
    showSuccessModal(t('successTitle'), 'Personel bilgileri güncellendi.');
    renderOwnerScreen(user, onTabChange);
  };

  // PATRON PROFİL MODALLARI
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
              📤 Fotoğraf Yükle / Değiştir
            </button>
            ${user.photoUrl ? `
              <button onclick="window.removeOwnerPhoto()" class="btn btn-secondary" style="border-color: #ef4444; color: #ef4444;">
                🗑️ Fotoğrafı Kaldır
              </button>
            ` : ''}
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

  window.openNotificationSettingsModal = async () => {
    const root = document.getElementById('modal-root');
    if (!root) return;

    const prefs = await fetchRecord(`users/${user.uid}/notificationPreferences`) || {
      newBooking: true,
      cancelRequest: true,
      rescheduleRequest: true,
      reminders: true,
      inApp: true,
      sound: true
    };

    root.innerHTML = `
      <div class="modal-overlay" onclick="window.closeModal()">
        <div class="modal-card animate-fade" onclick="event.stopPropagation()">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
            <h3 style="font-size: 15px; font-weight: 800; color: var(--gold-primary); margin: 0;">${t('notificationSettings', currentLang)}</h3>
            <button onclick="window.closeModal()" class="btn btn-secondary" style="padding: 4px 10px;">✕</button>
          </div>

          <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px;">
            <label style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #fff;">
              <span>📩 Yeni Randevu Bildirimleri</span>
              <input type="checkbox" id="pref-newbook" ${prefs.newBooking !== false ? 'checked' : ''}>
            </label>
            <label style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #fff;">
              <span>❌ İptal Talebi Bildirimleri</span>
              <input type="checkbox" id="pref-cancelreq" ${prefs.cancelRequest !== false ? 'checked' : ''}>
            </label>
            <label style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #fff;">
              <span>🔄 Değişiklik Talebi Bildirimleri</span>
              <input type="checkbox" id="pref-reschedreq" ${prefs.rescheduleRequest !== false ? 'checked' : ''}>
            </label>
            <label style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #fff;">
              <span>🔔 Uygulama İçi Bildirimler</span>
              <input type="checkbox" id="pref-inapp" ${prefs.inApp !== false ? 'checked' : ''}>
            </label>
            <label style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #fff;">
              <span>🔊 Sesli Bildirimler</span>
              <input type="checkbox" id="pref-sound" ${prefs.sound !== false ? 'checked' : ''}>
            </label>
          </div>

          <button onclick="window.saveOwnerNotificationPrefs()" class="btn btn-gold" style="width: 100%;">
            💾 Kaydet
          </button>
        </div>
      </div>
    `;
  };

  window.saveOwnerNotificationPrefs = async () => {
    const prefs = {
      newBooking: document.getElementById('pref-newbook').checked,
      cancelRequest: document.getElementById('pref-cancelreq').checked,
      rescheduleRequest: document.getElementById('pref-reschedreq').checked,
      inApp: document.getElementById('pref-inapp').checked,
      sound: document.getElementById('pref-sound').checked,
      updatedAt: new Date().toISOString()
    };
    await saveRecord(`users/${user.uid}/notificationPreferences`, prefs);
    window.closeModal();
    showSuccessModal(t('successTitle'), 'Bildirim tercihleriniz kaydedildi.');
  };

  window.openPrivacyAccountModal = () => {
    const root = document.getElementById('modal-root');
    if (!root) return;

    root.innerHTML = `
      <div class="modal-overlay" onclick="window.closeModal()">
        <div class="modal-card animate-fade" onclick="event.stopPropagation()">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
            <h3 style="font-size: 15px; font-weight: 800; color: var(--gold-primary); margin: 0;">${t('privacyAccount', currentLang)}</h3>
            <button onclick="window.closeModal()" class="btn btn-secondary" style="padding: 4px 10px;">✕</button>
          </div>

          <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px; font-size: 12px; color: #fff;">
            <div><strong>Ad Soyad:</strong> ${displayName}</div>
            <div><strong>Telefon:</strong> ${user.phone}</div>
            <div><strong>Salon:</strong> ${bizRecord.name} (${bizRecord.businessId})</div>
            <div><strong>Oturum Durumu:</strong> 🟢 Aktif (Güvenli)</div>

            <button onclick="window.openChangePasswordModal()" class="btn btn-outline-gold" style="margin-top: 6px;">
              🔒 Şifre Değiştir
            </button>
          </div>

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
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
            <h3 style="font-size: 15px; font-weight: 800; color: var(--gold-primary); margin: 0;">🔒 Şifre Değiştir</h3>
            <button onclick="window.closeModal()" class="btn btn-secondary" style="padding: 4px 10px;">✕</button>
          </div>

          <label style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">Mevcut Şifre</label>
          <input type="password" id="owner-pwd-curr" class="input-field" placeholder="••••••••">

          <label style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">Yeni Şifre</label>
          <input type="password" id="owner-pwd-new" class="input-field" placeholder="••••••••">

          <label style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">Yeni Şifre Tekrar</label>
          <input type="password" id="owner-pwd-conf" class="input-field" placeholder="••••••••">

          <button onclick="window.submitOwnerPasswordChange()" class="btn btn-gold" style="width: 100%; margin-top: 8px;">
            💾 Şifreyi Güncelle
          </button>
        </div>
      </div>
    `;
  };

  window.submitOwnerPasswordChange = async () => {
    const curr = document.getElementById('owner-pwd-curr').value;
    const next = document.getElementById('owner-pwd-new').value;
    const conf = document.getElementById('owner-pwd-conf').value;

    const dbUser = await fetchRecord(`users/${user.uid}`) || {};
    const actualCurrentPwd = dbUser.password || '123456';

    if (curr !== actualCurrentPwd) {
      showErrorModal(t('errorTitle'), 'Mevcut şifreniz hatalıdır.');
      return;
    }
    if (!next || next.length < 4) {
      showErrorModal(t('errorTitle'), 'Yeni şifre en az 4 karakter olmalıdır.');
      return;
    }
    if (next !== conf) {
      showErrorModal(t('errorTitle'), 'Şifreler birbiriyle eşleşmiyor.');
      return;
    }

    await saveRecord(`users/${user.uid}/password`, next);
    window.closeModal();
    showSuccessModal(t('successTitle'), 'Şifreniz başarıyla güncellendi.');
  };

  window.openHelpSupportModal = () => {
    const root = document.getElementById('modal-root');
    if (!root) return;

    root.innerHTML = `
      <div class="modal-overlay" onclick="window.closeModal()">
        <div class="modal-card animate-fade" onclick="event.stopPropagation()">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
            <h3 style="font-size: 15px; font-weight: 800; color: var(--gold-primary); margin: 0;">${t('helpSupport', currentLang)}</h3>
            <button onclick="window.closeModal()" class="btn btn-secondary" style="padding: 4px 10px;">✕</button>
          </div>

          <p style="font-size: 11px; color: var(--text-muted); margin-bottom: 12px;">
            EZO STİLE Salon Destek Ekibi 7/24 hizmetinizdedir.
          </p>

          <textarea id="owner-support-msg" class="input-field" rows="3" placeholder="Sorunuz veya teknik talebiniz..."></textarea>

          <button onclick="window.submitOwnerSupportTicket()" class="btn btn-gold" style="width: 100%;">
            🚀 Destek Talebi Gönder
          </button>
        </div>
      </div>
    `;
  };

  window.submitOwnerSupportTicket = async () => {
    const msg = document.getElementById('owner-support-msg').value;
    if (!msg) {
      showErrorModal(t('errorTitle'), 'Lütfen mesajınızı yazınız.');
      return;
    }
    const tktId = 'tkt_' + Date.now();
    await saveRecord(`support_tickets/${tktId}`, { tktId, userUid: user.uid, message: msg, createdAt: new Date().toISOString() });
    window.closeModal();
    showSuccessModal(t('successTitle'), 'Destek talebiniz alındı.');
  };

  // LOGOUT CONFIRM MODAL (REQUIREMENT 4 - ZERO NATIVE CONFIRM)
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
          <h3 style="font-size: 15px; font-weight: 800; color: var(--gold-primary); margin-bottom: 12px;">
            ✂️ Hizmetler & Fiyatlar
          </h3>

          <div style="margin-bottom: 14px;">
            ${services.map(s => `
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; background: rgba(255,255,255,0.05); border-radius: 8px; margin-bottom: 6px;">
                <span style="font-size: 12px; color: #fff; font-weight: 700;">${s.name} (${s.duration || 30} dk)</span>
                <span style="font-size: 12px; color: var(--gold-primary); font-weight: 800;">${s.price} TL</span>
              </div>
            `).join('')}
          </div>

          <h4 style="font-size: 13px; font-weight: 800; color: var(--gold-primary); margin-bottom: 8px;">Yeni Hizmet Ekle</h4>
          <input type="text" id="add-svc-name" class="input-field" placeholder="Hizmet Adı (Örn: Sakal Tıraşı)">
          <input type="number" id="add-svc-price" class="input-field" placeholder="Fiyat (TL)">
          <input type="number" id="add-svc-dur" class="input-field" placeholder="Süre (Dakika)" value="30">

          <button onclick="window.submitAddNewService()" class="btn btn-gold" style="width: 100%; margin-top: 4px;">
            ➕ Hizmeti Kaydet
          </button>
        </div>
      </div>
    `;
  };

  window.submitAddNewService = async () => {
    const name = document.getElementById('add-svc-name').value;
    const price = parseInt(document.getElementById('add-svc-price').value) || 0;
    const duration = parseInt(document.getElementById('add-svc-dur').value) || 30;

    if (!name || !price) {
      showErrorModal(t('errorTitle'), 'Lütfen hizmet adı ve fiyat giriniz.');
      return;
    }

    await saveService(businessId, { name, price, duration });
    window.closeModal();
    showSuccessModal(t('successTitle'), 'Yeni hizmet eklendi (5 dilde otomatik çeviri aktiftir).');
    renderOwnerScreen(user, onTabChange);
  };

  window.openSalonContactModal = () => {
    const root = document.getElementById('modal-root');
    if (!root) return;

    root.innerHTML = `
      <div class="modal-overlay" onclick="window.closeModal()">
        <div class="modal-card animate-fade" onclick="event.stopPropagation()">
          <h3 style="font-size: 15px; font-weight: 800; color: var(--gold-primary); margin-bottom: 12px;">
            💬 WhatsApp & SMS İletişim Ayarları
          </h3>
          <p style="font-size: 11px; color: var(--text-muted); margin-bottom: 12px;">
            Müşterilerin randevu bildirimi göndereceği iletişim numaralarınızı giriniz.
          </p>

          <label style="font-size: 11px; color: var(--gold-primary);">WhatsApp Numarası</label>
          <input type="tel" id="set-wa-num" class="input-field" value="${bizRecord.businessWhatsAppNumber || bizRecord.phone || ''}" placeholder="05XXXXXXXXX">

          <label style="font-size: 11px; color: var(--gold-primary);">SMS Numarası</label>
          <input type="tel" id="set-sms-num" class="input-field" value="${bizRecord.businessSmsNumber || bizRecord.phone || ''}" placeholder="05XXXXXXXXX">

          <button onclick="window.saveSalonContactSettings()" class="btn btn-gold" style="width: 100%; margin-top: 8px;">
            💾 Ayarları Kaydet
          </button>
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
    showSuccessModal(t('successTitle'), 'İletişim ayarları başarıyla kaydedildi.');
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
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
            <h3 style="font-size: 15px; font-weight: 800; color: var(--gold-primary); margin: 0;">📋 Randevu Detayı</h3>
            <button onclick="window.closeModal()" class="btn btn-secondary" style="padding: 4px 10px;">✕</button>
          </div>

          <div style="display: flex; flex-direction: column; gap: 8px; font-size: 12px; color: #fff; margin-bottom: 16px;">
            <div><strong>Müşteri:</strong> ${apt.customerName} (${apt.customerPhone})</div>
            <div><strong>Hizmet:</strong> ${apt.serviceName} (${apt.serviceDuration || 30} dk) - ${apt.servicePrice || 350} TL</div>
            <div><strong>Berber:</strong> ${apt.staffName || 'Mustafa Usta'}</div>
            <div><strong>Tarih & Saat:</strong> 📅 ${apt.date} @ ${apt.time}</div>
            <div><strong>Durum:</strong> ${apt.status}</div>
            ${apt.completedAt ? `<div><strong>Tamamlanma Zamanı:</strong> ${new Date(apt.completedAt).toLocaleString()}</div>` : ''}
            ${apt.aiRecipe ? `<div style="color: var(--gold-primary);"><strong>AI Saç Reçetesi:</strong> ${apt.aiRecipe}</div>` : ''}
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
      showSuccessModal(t('successTitle'), `Randevu durumu '${newStatus.toUpperCase()}' olarak güncellendi.`);
      renderOwnerScreen(user, onTabChange);
    } else {
      showErrorModal(t('errorTitle'), (data && data.error) ? data.error : 'Durum güncellenemedi.');
    }
  };

  window.ownerApproveCancel = async (aptId) => {
    await window.updateAppointmentStatusOwner(aptId, 'cancelled');
  };

  window.ownerRejectCancel = async (aptId) => {
    await window.updateAppointmentStatusOwner(aptId, 'approved');
  };

  window.ownerApproveReschedule = async (aptId, newDate, newTime) => {
    const res = await fetch('/api/booking/reschedule-approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aptId, newDate, newTime, userUid: user.uid })
    }).catch(() => null);

    const data = res ? await res.json().catch(() => null) : null;
    if (res && res.ok && data && data.success) {
      showSuccessModal(t('successTitle'), '✅ Tarih/Saat değişikliği onaylandı.');
      renderOwnerScreen(user, onTabChange);
    } else {
      showErrorModal(t('errorTitle'), (data && data.error) ? data.error : 'Değişiklik onaylanamadı.');
    }
  };

  window.ownerRejectReschedule = async (aptId) => {
    await window.updateAppointmentStatusOwner(aptId, 'approved');
  };
}
