/* EZO STİLE v2 - Salon Owner Panel (Ana Sayfa, Dedicated Ciro Engine, 5 Big Booking Menus, Staff Roles & Permissions, VIP Profile) */
import { getAppointmentsForBusiness, fetchRecord, saveRecord, getServices, saveService, getStaffList, saveStaff } from '../db.js';
import { canAccessStaffRevenueAnalytics } from '../permissions.js';
import { isRtl, t } from '../config.js';
import { showSuccessModal, showErrorModal, showConfirmModal } from './portal.js';
import { logoutUserSession } from '../auth.js';

let activeOwnerTab = 'dashboard'; // 'dashboard' (Ana Sayfa), 'calendar', 'appointments', 'ciro', 'management', 'profile'
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
  const bizRecord = await fetchRecord(`businesses/${businessId}`) || { name: 'EZO Salon', plan: 'FREE' };
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
  // 1. PATRON ANA SAYFA (REQUIREMENT 1 & 2)
  // ==========================================
  if (activeOwnerTab === 'dashboard') {
    mainHtml = `
      <div class="card card-gold animate-fade" style="padding: 18px; margin-bottom: 14px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <h3 style="font-size: 16px; font-weight: 800; color: #fff;">💈 ${bizRecord.name}</h3>
            <div style="font-size: 11px; color: var(--gold-primary);">👑 ${t('homeTab', currentLang)} • Paket: ${bizRecord.plan || 'FREE'} ${bizRecord.premiumSource === 'super_admin_grant' ? '(⚡ Süper Admin Grant)' : ''}</div>
          </div>
          <span class="badge badge-approved" style="font-size: 10px;">${bizRecord.bookingEnabled !== false ? '🟢 Randevuya Açık' : '🔴 Kapalı'}</span>
        </div>
      </div>

      <!-- 4 INTERACTIVE DASHBOARD KPI CARDS -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 14px;">
        <div class="card animate-fade" style="padding: 14px; text-align: center; cursor: pointer; border-color: var(--gold-primary);" onclick="window.switchOwnerTab('appointments', 'bugun')">
          <div style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">📅 ${t('todayBookings', currentLang)}</div>
          <div style="font-size: 24px; font-weight: 900; color: #fff; margin-top: 4px;">${todayApprovedUpcoming.length}</div>
          <div style="font-size: 9px; color: var(--text-muted); margin-top: 4px;">${t('todayBookings', currentLang)} Aç →</div>
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
          <div style="font-size: 9px; color: var(--text-muted); margin-top: 4px;">${t('ciroTab', currentLang)} Detayı →</div>
        </div>
      </div>

      <div class="card animate-fade" style="padding: 16px; margin-bottom: 14px;">
        <h4 style="font-size: 14px; font-weight: 800; color: var(--gold-primary); margin-bottom: 8px;">🚀 Hızlı İşlemler</h4>
        <div style="display: flex; gap: 8px;">
          <button onclick="window.switchOwnerTab('appointments', 'menu')" class="btn btn-gold" style="flex: 1; min-height: 40px; font-size: 11px;">
            📅 ${t('appointmentsTab', currentLang)}
          </button>
          <button onclick="window.switchOwnerTab('ciro', 'day')" class="btn btn-outline-gold" style="flex: 1; min-height: 40px; font-size: 11px;">
            💰 ${t('ciroTab', currentLang)} Raporu
          </button>
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
      // GÜNLÜK CİRO (REQUIREMENT 4)
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
      // HAFTALIK CİRO (REQUIREMENT 5)
      const now = new Date(selectedCiroDate);
      const dayOfWeek = (now.getDay() + 6) % 7; // Monday = 0
      const monday = new Date(now);
      monday.setDate(now.getDate() - dayOfWeek);

      const daysOfWeek = [];
      const dayNames = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
      
      let weeklyTotal = 0;
      let weeklyCompleted = 0;
      const weeklyCustomers = new Set();
      const serviceCounts = {};
      const dayStats = [];

      for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        
        const dayApts = allApts.filter(a => a && a.date === dateStr && a.status === 'completed');
        const dayRev = dayApts.reduce((sum, a) => sum + (parseInt(a.servicePrice) || 350), 0);
        
        weeklyTotal += dayRev;
        weeklyCompleted += dayApts.length;
        dayApts.forEach(a => {
          weeklyCustomers.add(a.customerPhone || a.customerUid);
          serviceCounts[a.serviceName] = (serviceCounts[a.serviceName] || 0) + 1;
        });

        dayStats.push({
          dateStr,
          dayName: dayNames[i],
          revenue: dayRev,
          count: dayApts.length
        });
      }

      let busiestDayObj = dayStats.reduce((max, d) => d.count > max.count ? d : max, { dayName: '-', count: 0 });
      let topServiceEntry = Object.entries(serviceCounts).sort((a, b) => b[1] - a[1])[0];

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
          <div class="card" style="padding: 10px; text-align: center;">
            <div style="font-size: 10px; color: var(--text-muted);">${t('completedCount', currentLang)}</div>
            <div style="font-size: 16px; font-weight: 800; color: #fff;">${weeklyCompleted}</div>
          </div>
          <div class="card" style="padding: 10px; text-align: center;">
            <div style="font-size: 10px; color: var(--text-muted);">${t('customerCount', currentLang)}</div>
            <div style="font-size: 16px; font-weight: 800; color: #fff;">${weeklyCustomers.size}</div>
          </div>
          <div class="card" style="padding: 10px; text-align: center;">
            <div style="font-size: 10px; color: var(--text-muted);">${t('busiestDay', currentLang)}</div>
            <div style="font-size: 14px; font-weight: 800; color: var(--gold-primary);">${busiestDayObj.dayName} (${busiestDayObj.count})</div>
          </div>
          <div class="card" style="padding: 10px; text-align: center;">
            <div style="font-size: 10px; color: var(--text-muted);">${t('topService', currentLang)}</div>
            <div style="font-size: 13px; font-weight: 800; color: var(--gold-primary);">${topServiceEntry ? topServiceEntry[0] : '-'}</div>
          </div>
        </div>

        <h4 style="font-size: 12px; font-weight: 800; color: var(--gold-primary); margin-bottom: 8px;">📆 Günlük Ciro Dağılımı (Detay için güne tıklayın)</h4>
        ${dailyBreakdownHtml}
      `;
    } else if (ciroTimeframe === 'month') {
      // AYLIK CİRO (REQUIREMENT 6)
      const currentYearMonth = selectedCiroDate.substring(0, 7); // "YYYY-MM"
      const monthApts = allApts.filter(a => a && a.status === 'completed' && String(a.date).startsWith(currentYearMonth));

      const monthlyTotal = monthApts.reduce((sum, a) => sum + (parseInt(a.servicePrice) || 350), 0);
      const monthlyCount = monthApts.length;
      const monthlyCustomers = new Set(monthApts.map(a => a.customerPhone || a.customerUid)).size;
      const avgOrder = monthlyCount > 0 ? Math.round(monthlyTotal / monthlyCount) : 0;

      const serviceRevenues = {};
      const staffRevenues = {};

      monthApts.forEach(a => {
        const price = parseInt(a.servicePrice) || 350;
        serviceRevenues[a.serviceName] = (serviceRevenues[a.serviceName] || 0) + price;
        const staff = a.staffName || 'Mustafa Usta';
        staffRevenues[staff] = (staffRevenues[staff] || 0) + price;
      });

      const topService = Object.entries(serviceRevenues).sort((a, b) => b[1] - a[1])[0];
      const topStaff = Object.entries(staffRevenues).sort((a, b) => b[1] - a[1])[0];

      ciroBodyHtml = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 14px;">
          <div class="card" style="padding: 10px; text-align: center;">
            <div style="font-size: 10px; color: var(--text-muted);">${t('monthlyTotal', currentLang)}</div>
            <div style="font-size: 20px; font-weight: 900; color: #22c55e;">${monthlyTotal} TL</div>
          </div>
          <div class="card" style="padding: 10px; text-align: center;">
            <div style="font-size: 10px; color: var(--text-muted);">${t('completedCount', currentLang)}</div>
            <div style="font-size: 20px; font-weight: 900; color: #fff;">${monthlyCount}</div>
          </div>
          <div class="card" style="padding: 10px; text-align: center;">
            <div style="font-size: 10px; color: var(--text-muted);">${t('customerCount', currentLang)}</div>
            <div style="font-size: 16px; font-weight: 800; color: #fff;">${monthlyCustomers}</div>
          </div>
          <div class="card" style="padding: 10px; text-align: center;">
            <div style="font-size: 10px; color: var(--text-muted);">${t('avgTransaction', currentLang)}</div>
            <div style="font-size: 16px; font-weight: 800; color: var(--gold-primary);">${avgOrder} TL</div>
          </div>
          <div class="card" style="padding: 10px; text-align: center;">
            <div style="font-size: 10px; color: var(--text-muted);">${t('topEarnerService', currentLang)}</div>
            <div style="font-size: 13px; font-weight: 800; color: var(--gold-primary);">${topService ? `${topService[0]} (${topService[1]} TL)` : '-'}</div>
          </div>
          <div class="card" style="padding: 10px; text-align: center;">
            <div style="font-size: 10px; color: var(--text-muted);">${t('topEarnerStaff', currentLang)}</div>
            <div style="font-size: 13px; font-weight: 800; color: var(--gold-primary);">${topStaff ? `${topStaff[0]} (${topStaff[1]} TL)` : '-'}</div>
          </div>
        </div>
      `;
    } else if (ciroTimeframe === 'history') {
      // 2 YILLIK CİRO GEÇMİŞİ — PREMIUM (REQUIREMENT 7)
      if (!isPremium) {
        ciroBodyHtml = `
          <div class="card card-gold animate-fade" style="padding: 24px; text-align: center; margin-top: 10px;">
            <div style="font-size: 40px; margin-bottom: 8px;">🔒</div>
            <h3 style="font-size: 16px; font-weight: 800; color: #fff; margin-bottom: 6px;">
              ${t('historicalLocked', currentLang)}
            </h3>
            <p style="font-size: 11px; color: var(--text-muted); margin-bottom: 16px;">
              Son 2 yıla ait Yıl → Ay → Gün bazlı detaylı ciro geçmişine erişmek için Premium pakete geçin.
            </p>
            <button onclick="window.switchOwnerTab('management')" class="btn btn-gold" style="width: 100%;">
              ⚡ Premium Paket Detayları
            </button>
          </div>
        `;
      } else {
        const historicalYears = [2026, 2025];
        const monthNames = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

        const yearOptionsHtml = historicalYears.map(y => `<option value="${y}" ${y === selectedCiroYear ? 'selected' : ''}>${y} Yılı</option>`).join('');
        const monthOptionsHtml = monthNames.map((m, idx) => `<option value="${idx + 1}" ${(idx + 1) === selectedCiroMonth ? 'selected' : ''}>${m}</option>`).join('');

        const targetPrefix = `${selectedCiroYear}-${String(selectedCiroMonth).padStart(2, '0')}`;
        const monthHistoryApts = allApts.filter(a => a && a.status === 'completed' && String(a.date).startsWith(targetPrefix));
        const historyTotal = monthHistoryApts.reduce((sum, a) => sum + (parseInt(a.servicePrice) || 350), 0);

        ciroBodyHtml = `
          <div class="card animate-fade" style="padding: 14px; margin-bottom: 12px;">
            <h4 style="font-size: 13px; font-weight: 800; color: var(--gold-primary); margin-bottom: 10px;">📊 2 Yıllık Ciro Geçmişi (Yıl → Ay Seçimi)</h4>
            <div style="display: flex; gap: 8px; margin-bottom: 12px;">
              <select onchange="window.setSelectedCiroYear(this.value)" class="input-field" style="flex: 1; margin: 0; font-size: 11px;">
                ${yearOptionsHtml}
              </select>
              <select onchange="window.setSelectedCiroMonth(this.value)" class="input-field" style="flex: 1; margin: 0; font-size: 11px;">
                ${monthOptionsHtml}
              </select>
            </div>

            <div style="text-align: center; padding: 12px; background: rgba(245,158,11,0.12); border-radius: 8px; border: 1px solid var(--gold-primary);">
              <div style="font-size: 11px; color: var(--text-muted);">${selectedCiroYear} / ${monthNames[selectedCiroMonth - 1]} Toplam Ciro</div>
              <div style="font-size: 24px; font-weight: 900; color: #22c55e;">${historyTotal} TL</div>
              <div style="font-size: 10px; color: var(--gold-primary); margin-top: 2px;">${monthHistoryApts.length} Tamamlanan İşlem</div>
            </div>
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

        <!-- CİRO TAB NAVIGATION -->
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
  // 3. RANDEVULAR EKRANI — 5 BÜYÜK MENÜ KARTI (REQUIREMENT 9, 10, 11, 12, 13, 14)
  // ==========================================
  else if (activeOwnerTab === 'appointments') {
    if (activeAptView === 'menu') {
      // 5 BIG MENU CARDS (REQUIREMENT 9)
      const approvedCount = allApts.filter(a => a && a.status === 'approved').length;
      const requestsCount = allApts.filter(a => a && (a.status === 'cancel_requested' || a.status === 'reschedule_requested')).length;
      const cancelledCount = allApts.filter(a => a && (a.status === 'cancelled' || a.status === 'rejected' || a.status === 'no_show')).length;

      mainHtml = `
        <div class="card animate-fade">
          <h3 style="font-size: 16px; font-weight: 800; color: var(--gold-primary); margin-bottom: 12px;">📅 ${t('appointmentsTab', currentLang)}</h3>
          <p style="font-size: 11px; color: var(--text-muted); margin-bottom: 14px;">
            Lütfen işlem yapmak istediğiniz randevu kategorisini seçiniz:
          </p>

          <div style="display: flex; flex-direction: column; gap: 10px;">
            <!-- CARD 1: BEKLEYEN -->
            <div onclick="window.setAppointmentView('pending')" class="card card-gold animate-fade" style="padding: 16px; cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <h4 style="font-size: 15px; font-weight: 800; color: #fff;">⏳ Bekleyen Randevular</h4>
                <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">Onay bekleyen yeni müşteri talepleri</div>
              </div>
              <span class="badge badge-pending" style="font-size: 14px; font-weight: 900; padding: 6px 12px;">${pendingRequests.length}</span>
            </div>

            <!-- CARD 2: GELECEK -->
            <div onclick="window.setAppointmentView('approved')" class="card animate-fade" style="padding: 16px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; border-color: var(--gold-primary);">
              <div>
                <h4 style="font-size: 15px; font-weight: 800; color: #fff;">📅 Gelecek Randevular</h4>
                <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">Onaylanmış takvim randevuları</div>
              </div>
              <span class="badge badge-approved" style="font-size: 14px; font-weight: 900; padding: 6px 12px;">${approvedCount}</span>
            </div>

            <!-- CARD 3: TAMAMLANAN -->
            <div onclick="window.setAppointmentView('completed')" class="card animate-fade" style="padding: 16px; cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <h4 style="font-size: 15px; font-weight: 800; color: #22c55e;">✅ Tamamlanan Randevular</h4>
                <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">Tamamlanıp ciroya işlenen randevular</div>
              </div>
              <span class="badge badge-approved" style="font-size: 14px; font-weight: 900; padding: 6px 12px; background: #22c55e; color: #000;">${completedApts.length}</span>
            </div>

            <!-- CARD 4: TALEPLER -->
            <div onclick="window.setAppointmentView('requests')" class="card animate-fade" style="padding: 16px; cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <h4 style="font-size: 15px; font-weight: 800; color: #eab308;">🔄 İptal / Değişiklik Talepleri</h4>
                <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">Müşteriden gelen iptal ve wagt talepleri</div>
              </div>
              <span class="badge badge-pending" style="font-size: 14px; font-weight: 900; padding: 6px 12px; background: #eab308; color: #000;">${requestsCount}</span>
            </div>

            <!-- CARD 5: İPTAL / RET / GELMEDİ -->
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
      // DEDICATED SUB-LIST FOR SELECTED MENU CARD WITH BACK BUTTON
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

        const nowHours = new Date().getHours() * 60 + new Date().getMinutes();
        const [aptH, aptM] = (apt.time || '00:00').split(':').map(Number);
        const isPastHour = apt.date === todayStr && (aptH * 60 + aptM) < nowHours && isApproved;

        return `
          <div class="card card-gold animate-fade" style="padding: 12px; margin-bottom: 10px; cursor: pointer;" onclick="window.openAppointmentDetailModal('${apt.aptId}')">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <div>
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span style="font-size: 13px; font-weight: 900; color: var(--gold-primary);">📅 ${apt.date} @ ${apt.time}</span>
                  <span style="font-size: 13px; font-weight: 800; color: #fff;">👤 ${apt.customerName}</span>
                  ${isPastHour ? '<span class="badge badge-pending" style="font-size: 9px;">⚠️ İşlem Bekliyor</span>' : ''}
                </div>
                <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">
                  ✂️ ${apt.serviceName} • 💈 ${apt.staffName || 'Mustafa Usta'} • 💰 ${apt.servicePrice || 350} TL
                </div>
                ${isReschedReq ? `
                  <div style="font-size: 10px; color: #eab308; font-weight: 800; margin-top: 2px;">
                    🔄 İstenen Saat: ${apt.requestedDate || apt.date} @ ${apt.requestedTime || '14:00'}
                  </div>
                ` : ''}
              </div>
              <span class="badge ${apt.status === 'completed' ? 'badge-approved' : (isCancelReq || isReschedReq || isPending ? 'badge-pending' : 'badge-approved')}" style="font-size: 9px;">${t(apt.status, currentLang)}</span>
            </div>

            <!-- ACTIONS FOR SPECIFIC VIEWS -->
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
  // 4. PERSONEL & SALON YÖNETİMİ (REQUIREMENT 15, 16, 17, 18, 19, 20)
  // ==========================================
  else if (activeOwnerTab === 'management') {
    const isPremium = canAccessStaffRevenueAnalytics(bizRecord);

    const staffRowsHtml = staffList.map(st => `
      <div class="card" style="padding: 10px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div style="font-size: 13px; font-weight: 800; color: #fff;">
            ${st.role === 'manager' ? '👔' : (st.role === 'receptionist' ? '🧾' : '💈')} ${st.displayName}
          </div>
          <div style="font-size: 10px; color: var(--text-muted);">
            Rol: <span style="color: var(--gold-primary); font-weight: 700;">${st.role || 'barber'}</span> • ${st.active !== false ? '🟢 Aktif' : '🔴 Pasif'}
          </div>
        </div>
        <button onclick="window.openEditStaffModal('${st.id}')" class="btn btn-outline-gold" style="padding: 4px 8px; font-size: 10px;">
          ⚙️ Düzenle
        </button>
      </div>
    `).join('');

    mainHtml = `
      <div class="card animate-fade">
        <h3 style="font-size: 16px; font-weight: 800; color: var(--gold-primary); margin-bottom: 12px;">⚙️ ${t('managementTab', currentLang)}</h3>

        <div style="display: flex; flex-direction: column; gap: 10px;">
          <div class="card" style="padding: 14px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
              <h4 style="font-size: 14px; font-weight: 800; color: #fff;">👥 Personel Kadrosu (${staffList.length})</h4>
              <button onclick="window.openAddStaffModal()" class="btn btn-gold" style="padding: 4px 8px; font-size: 11px;">
                ➕ Personel Ekle
              </button>
            </div>
            ${staffList.length === 0 ? '<div style="font-size: 11px; color: var(--text-muted);">Henüz eklenmiş personel bulunmamaktadır.</div>' : staffRowsHtml}
          </div>

          <button onclick="window.openServicesManagementModal()" class="btn btn-secondary" style="text-align: left; padding: 12px 14px; font-size: 12px;">
            ✂️ Hizmetler & Fiyatlar (${services.length} Hizmet)
          </button>
          <button onclick="window.openSalonContactModal()" class="btn btn-secondary" style="text-align: left; padding: 12px 14px; font-size: 12px;">
            💬 WhatsApp & SMS İletişim Ayarları
          </button>

          <div class="card" style="padding: 14px; border-color: ${isPremium ? 'var(--gold-primary)' : 'var(--border-color)'}; opacity: ${isPremium ? '1' : '0.85'};">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <h4 style="font-size: 13px; font-weight: 800; color: #fff;">📊 Çalışan Bazlı Ciro Analitiği</h4>
                <div style="font-size: 10px; color: var(--text-muted);">Her berberin ayrı ciro, no-show ve performans raporları</div>
              </div>
              <span class="badge ${isPremium ? 'badge-approved' : 'badge-pending'}">${isPremium ? '✨ KİLİT AÇIK' : '🔒 PREMIUM'}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }
  // ==========================================
  // 5. PATRON PROFİLİ & VIP MODALLARI (REQUIREMENT 21, 22, 23, 24, 25, 26)
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

  // HEADER & FIXED BOTTOM NAV (NO USER-FACING PANEL TEXT FOR PATRON - REQUIREMENT 1)
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
      <button onclick="window.switchOwnerTab('calendar')" class="nav-item ${activeOwnerTab === 'calendar' ? 'active' : ''}">
        <span class="icon">📅</span>
        <span>${t('calendarTab', currentLang)}</span>
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

  window.setSelectedCiroYear = (y) => {
    selectedCiroYear = parseInt(y);
    renderOwnerScreen(user, onTabChange);
  };

  window.setSelectedCiroMonth = (m) => {
    selectedCiroMonth = parseInt(m);
    renderOwnerScreen(user, onTabChange);
  };

  // APPOINTMENT DETAIL MODAL (REQUIREMENT 12)
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

  // PERSONEL EKLEME MODAL (REQUIREMENT 15, 16, 17)
  window.openAddStaffModal = () => {
    const root = document.getElementById('modal-root');
    if (!root) return;

    root.innerHTML = `
      <div class="modal-overlay" onclick="window.closeModal()">
        <div class="modal-card animate-fade" onclick="event.stopPropagation()">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
            <h3 style="font-size: 15px; font-weight: 800; color: var(--gold-primary); margin: 0;">➕ Yeni Personel Ekle</h3>
            <button onclick="window.closeModal()" class="btn btn-secondary" style="padding: 4px 10px;">✕</button>
          </div>

          <label style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">Ad Soyad *</label>
          <input type="text" id="add-staff-name-input" class="input-field" placeholder="Örn: Mehmet Berber">

          <label style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">Telefon *</label>
          <input type="tel" id="add-staff-phone-input" class="input-field" placeholder="05XXXXXXXXX">

          <!-- MANDATORY ROLE SELECTION (NO DEFAULT ROLE / OWNER/SUPER_ADMIN FORBIDDEN) -->
          <label style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">Rol Seç *</label>
          <select id="add-staff-role-select" onchange="window.handleStaffRoleChange(this.value)" class="input-field" style="margin-bottom: 12px;">
            <option value="">-- Rol Seçiniz --</option>
            <option value="manager">👔 Yönetici / Manager</option>
            <option value="barber">💈 Berber</option>
            <option value="receptionist">🧾 Resepsiyon</option>
          </select>

          <!-- GRANULAR MANAGER PERMISSIONS BOX (REQUIREMENT 17) -->
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

          <!-- SUBMIT BUTTON IS DISABLED UNTIL A ROLE IS CHOSEN -->
          <button id="btn-create-invite" onclick="window.submitCreateStaffInvite()" class="btn btn-gold" style="width: 100%; min-height: 44px;" disabled>
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

  // PERSONEL DÜZENLE MODAL (REQUIREMENT 20)
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
          <select id="edit-st-role" class="input-field">
            <option value="barber" ${st.role === 'barber' ? 'selected' : ''}>💈 Berber</option>
            <option value="manager" ${st.role === 'manager' ? 'selected' : ''}>👔 Yönetici / Manager</option>
            <option value="receptionist" ${st.role === 'receptionist' ? 'selected' : ''}>🧾 Resepsiyon</option>
          </select>

          <label style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">Durum</label>
          <select id="edit-st-active" class="input-field">
            <option value="true" ${st.active !== false ? 'selected' : ''}>🟢 Aktif</option>
            <option value="false" ${st.active === false ? 'selected' : ''}>🔴 Pasif</option>
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

    // AUDIT LOG
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

  // PATRON PROFİL MODALLARI (REQUIREMENT 22, 23, 24, 25)
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

  // LOGOUT CONFIRM MODAL (REQUIREMENT 25 - ZERO NATIVE CONFIRM)
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
}
