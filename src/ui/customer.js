
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
/* EZO STİLE v2 - Customer Final Panel (Notification Center, Photo Upload, Password Change, Cancel & 6-Hour Reschedule Requests, VIP Modals) */
import { getAppointmentsForCustomer, fetchRecord, saveRecord, getServices, getStaffList } from '../db.js';
import { updateUserLanguage, logoutUserSession } from '../auth.js';
import { SUPPORTED_LANGUAGES, isRtl, t, autoTranslateCustomContent } from '../config.js';
import { showSuccessModal, showErrorModal, showConfirmModal } from './portal.js';
import { renderAiConsultantScreen } from './ai-consultant.js';

let activeCustomerTab = 'home';
let bookingState = {
  businessId: 'biz_merkez_salon',
  serviceId: null,
  serviceName: null,
  servicePrice: 0,
  serviceDuration: 30,
  staffId: 'staff-any',
  staffName: 'Fark Etmez',
  date: new Date().toISOString().split('T')[0],
  time: null
};

let searchQuery = '';

export async function renderCustomerScreen(user, onTabChange) {
  const container = document.getElementById('app-container');
  if (!container) return;

  const currentLang = user.language || 'tr';
  const rtl = isRtl(currentLang);
  document.documentElement.dir = rtl ? 'rtl' : 'ltr';

  // Fetch In-App Notifications
  const notifsData = await fetchRecord('notifications/' + user.uid) || {};
  const notifList = Object.values(notifsData).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 20);
  const unreadCount = notifList.filter(n => n && !n.read).length;

  // Calculate User Initials
  const displayName = user.displayName || user.name || 'Müşteri';
  const nameParts = displayName.trim().split(' ');
  const initials = nameParts.length >= 2
    ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
    : displayName.substring(0, 2).toUpperCase();

  let mainHtml = '';

  if (activeCustomerTab === 'home') {
    mainHtml = `
      <div class="card card-gold animate-fade" style="padding: 20px; margin-bottom: 16px;">
        <h3 style="font-size: 18px; font-weight: 800; color: #fff; margin-bottom: 4px;">
          👋 Merhaba, ${displayName}
        </h3>
        <p style="font-size: 12px; color: var(--text-muted);">
          VIP Kuaför & Berber randevunuzu saniyeler içinde planlayın.
        </p>
      </div>

      <!-- 4 CLEAN MAIN ACTION BUTTONS -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
        <div class="card animate-fade" style="padding: 16px; cursor: pointer; text-align: center; border-color: var(--gold-primary);" onclick="window.switchCustomerTab('booking')">
          <div style="font-size: 32px; margin-bottom: 6px;">✂️</div>
          <div style="font-size: 13px; font-weight: 800; color: #fff;">${t('bookAppointment', currentLang)}</div>
        </div>

        <div class="card animate-fade" style="padding: 16px; cursor: pointer; text-align: center;" onclick="window.switchCustomerTab('salons')">
          <div style="font-size: 32px; margin-bottom: 6px;">💈</div>
          <div style="font-size: 13px; font-weight: 800; color: #fff;">${t('discoverSalons', currentLang)}</div>
        </div>

        <div class="card animate-fade" style="padding: 16px; cursor: pointer; text-align: center;" onclick="window.switchCustomerTab('ai')">
          <div style="font-size: 32px; margin-bottom: 6px;">🤖</div>
          <div style="font-size: 13px; font-weight: 800; color: #fff;">${t('aiConsultant', currentLang)}</div>
        </div>

        <div class="card animate-fade" style="padding: 16px; cursor: pointer; text-align: center;" onclick="window.switchCustomerTab('appointments')">
          <div style="font-size: 32px; margin-bottom: 6px;">📅</div>
          <div style="font-size: 13px; font-weight: 800; color: #fff;">${t('myAppointments', currentLang)}</div>
        </div>
      </div>
    `;
  } else if (activeCustomerTab === 'salons') {
    const allBusinessesData = await fetchRecord('businesses') || {};
    let salons = Object.values(allBusinessesData).filter(b => 
      b && 
      b.status !== 'suspended' && 
      b.bookingEnabled !== false &&
      !String(b.name || '').toLowerCase().includes('router') &&
      !String(b.name || '').toLowerCase().includes('test')
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

    const salonCardsHtml = salons.map(b => `
      <div class="card card-gold animate-fade" style="padding: 12px; margin-bottom: 12px; cursor: pointer;" onclick="window.openSalonDetailsModal('${b.businessId}')">
        <img src="${(b.media && (b.media.coverImageUrl || b.media.profileImageUrl)) || b.coverImageUrl || b.profileImageUrl || './assets/images/ezo_stile_logo.png'}" style="width: 100%; height: 110px; object-fit: cover; border-radius: 8px; margin-bottom: 10px;" alt="Cover">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <h4 style="font-size: 15px; font-weight: 800; color: #fff;">💈 ${b.name}</h4>
            <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">
              📍 ${b.district || 'Şişli'} / ${b.city || 'İstanbul'}
            </div>
          </div>
          <span class="badge badge-approved">⭐ ${b.averageRating || '4.9'}</span>
        </div>
        <button class="btn btn-gold" style="width: 100%; margin-top: 10px; min-height: 36px; font-size: 11px;">
          ✂️ ${t('bookAppointment', currentLang)} →
        </button>
      </div>
    `).join('');

    mainHtml = `
      <div class="card animate-fade">
        <h3 style="font-size: 16px; font-weight: 800; color: var(--gold-primary); margin-bottom: 12px;">💈 ${t('discoverSalons', currentLang)}</h3>
        <input type="text" placeholder="Salon adı veya semt ara..." value="${searchQuery}" oninput="window.setDiscoverySearch(this.value)" class="input-field">
        ${salons.length === 0 ? '<div style="font-size: 12px; color: var(--text-muted); text-align: center; padding: 20px;">Salon bulunamadı.</div>' : salonCardsHtml}
      </div>
    `;
  } else if (activeCustomerTab === 'booking') {
    const bizRecord = await fetchRecord('businesses/' + bookingState.businessId) || {};
    const isOnlineBookingClosed = bizRecord.bookingEnabled === false;

    // WEEKLY SCHEDULE SLOT GENERATION (REQUIREMENT 10)
    const aptDateObj = new Date(bookingState.date);
    const dayIdx = (aptDateObj.getDay() + 6) % 7; // Monday = 0, Sunday = 6
    const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const dayKey = dayKeys[dayIdx];
    const weeklySchedule = bizRecord.weeklySchedule || {
      monday: { isOpen: true, start: '09:00', end: '20:30' },
      tuesday: { isOpen: true, start: '09:00', end: '20:30' },
      wednesday: { isOpen: true, start: '09:00', end: '20:30' },
      thursday: { isOpen: true, start: '09:00', end: '20:30' },
      friday: { isOpen: true, start: '09:00', end: '20:30' },
      saturday: { isOpen: true, start: '09:00', end: '20:30' },
      sunday: { isOpen: false, start: '09:00', end: '18:00' }
    };
    const daySched = weeklySchedule[dayKey] || { isOpen: true, start: '09:00', end: '20:30' };
    const services = await getServices(bookingState.businessId);
    const staffList = await getStaffList(bookingState.businessId);
    const allAptsData = await fetchRecord('appointments') || {};
    const allApts = Object.values(allAptsData);

    const occupiedSlots = new Set();
    allApts.forEach(apt => {
      if (apt && apt.businessId === bookingState.businessId &&
          (apt.staffId === bookingState.staffId || bookingState.staffId === 'staff-any') &&
          apt.date === bookingState.date &&
          apt.status !== 'cancelled' && apt.status !== 'rejected') {
        
        const aptDuration = parseInt(apt.serviceDuration) || 30;
        const [h, m] = (apt.time || '00:00').split(':').map(Number);
        const startMins = h * 60 + m;
        const endMins = startMins + aptDuration;

        for (let t = 9 * 60; t <= 20 * 60 + 30; t += 30) {
          if (t >= startMins && t < endMins) {
            const slotHourStr = `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
            occupiedSlots.add(slotHourStr);
          }
        }
      }
    });

    let allHours = [];
    if (daySched && daySched.isOpen !== false) {
      const [sH, sM] = (daySched.start || '09:00').split(':').map(Number);
      const [eH, eM] = (daySched.end || '20:30').split(':').map(Number);
      const startTotal = sH * 60 + sM;
      const endTotal = eH * 60 + eM;
      for (let tM = startTotal; tM <= endTotal; tM += 30) {
        const hStr = String(Math.floor(tM / 60)).padStart(2, '0');
        const mStr = String(tM % 60).padStart(2, '0');
        allHours.push(`${hStr}:${mStr}`);
      }
    }

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const currentMins = now.getHours() * 60 + now.getMinutes();

    const visibleHours = allHours.filter(hStr => {
      if (bookingState.date !== todayStr) return true;
      const [h, m] = hStr.split(':').map(Number);
      return (h * 60 + m) > currentMins;
    });

    const slotsHtml = visibleHours.map(h => {
      const isOccupied = occupiedSlots.has(h);
      const isSelected = bookingState.time === h;

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
        <button onclick="${isOccupied ? '' : `window.selectBookingTime('${h}')`}" class="btn" style="${style}">
          ${h}${icon}
        </button>
      `;
    }).join('');

    const todayDate = new Date().toISOString().split('T')[0];
    const tomorrowDate = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    mainHtml = `
      <div class="card card-gold animate-fade" style="padding: 18px;">
        ${isOnlineBookingClosed ? `
          <div class="card" style="padding: 16px; text-align: center; color: #ef4444; border-color: #ef4444; margin-bottom: 14px;">
            <div style="font-size: 28px; margin-bottom: 4px;">🔴</div>
            <h4 style="font-size: 14px; font-weight: 800; color: #fff;">Online Randevu Kabul Edilmiyor</h4>
            <p style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">Bu salon şu anda online randevu kabul etmiyor.</p>
          </div>
        ` : ''}
        <h3 style="font-size: 16px; font-weight: 800; color: var(--gold-primary); margin-bottom: 12px;">✂️ ${t('bookAppointment', currentLang)}</h3>

        <!-- STEP 1: INITIALLY CLOSED SERVICE SELECTOR -->
        <label style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">1. Hizmet Seçimi</label>
        <div style="margin-top: 4px; margin-bottom: 14px;">
          ${bookingState.serviceId ? `
            <div class="card" style="padding: 12px; margin: 0; border-color: var(--gold-primary); background: rgba(245,158,11,0.12); display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div style="font-size: 13px; font-weight: 800; color: #fff;">✂️ ${bookingState.serviceName} (${bookingState.serviceDuration} dk)</div>
                <div style="font-size: 12px; color: var(--gold-primary); font-weight: 700; margin-top: 2px;">${bookingState.servicePrice} TL</div>
              </div>
              <button onclick="window.openServiceSelectionModal()" class="btn btn-outline-gold" style="padding: 4px 8px; font-size: 10px;">Değiştir</button>
            </div>
          ` : `
            <button onclick="window.openServiceSelectionModal()" class="btn btn-outline-gold" style="width: 100%; min-height: 44px; font-size: 13px; font-weight: 800;">
              ${t('selectServiceBtn', currentLang)}
            </button>
          `}
        </div>

        <!-- STEP 2: STAFF SELECT -->
        <label style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">2. ${t('selectStaff', currentLang)}</label>
        <div style="display: flex; gap: 6px; margin-bottom: 14px; margin-top: 4px; overflow-x: auto;">
          <button onclick="window.selectBookingStaff('staff-any', 'Fark Etmez')" class="btn ${bookingState.staffId === 'staff-any' ? 'btn-gold' : 'btn-secondary'}" style="padding: 6px 12px; font-size: 11px;">
            Fark Etmez
          </button>
          ${(staffList.length > 0 ? staffList : [{ id: 'stf_1', displayName: 'Mustafa Usta' }]).map(st => `
            <button onclick="window.selectBookingStaff('${st.id}', '${st.displayName}')" class="btn ${bookingState.staffId === st.id ? 'btn-gold' : 'btn-secondary'}" style="padding: 6px 12px; font-size: 11px;">
              💈 ${st.displayName}
            </button>
          `).join('')}
        </div>

        <!-- STEP 3: DATE & TIME SELECT -->
        <label style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">3. ${t('selectDateTime', currentLang)}</label>
        <div style="display: flex; gap: 6px; margin-top: 4px; margin-bottom: 10px;">
          <button onclick="window.selectBookingDate('${todayDate}')" class="btn ${bookingState.date === todayDate ? 'btn-gold' : 'btn-secondary'}" style="flex: 1; font-size: 11px; padding: 6px;">
            ${t('today', currentLang)}
          </button>
          <button onclick="window.selectBookingDate('${tomorrowDate}')" class="btn ${bookingState.date === tomorrowDate ? 'btn-gold' : 'btn-secondary'}" style="flex: 1; font-size: 11px; padding: 6px;">
            ${t('tomorrow', currentLang)}
          </button>
          <input type="date" value="${bookingState.date}" onchange="window.selectBookingDate(this.value)" class="input-field" style="flex: 1; margin: 0; font-size: 11px; padding: 4px;">
        </div>

        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-bottom: 16px;">
          ${slotsHtml}
        </div>

        <button id="btn-submit-booking" onclick="window.submitCustomerBooking()" class="btn btn-gold" style="width: 100%; min-height: 44px;" ${(!bookingState.serviceId || !bookingState.time || isOnlineBookingClosed || (daySched && daySched.isOpen === false)) ? 'disabled' : ''}>
          ⚡ ${t('confirmBooking', currentLang)}
        </button>
      </div>
    `;
  } else if (activeCustomerTab === 'appointments') {
    const userApts = await getAppointmentsForCustomer(user.uid, user.phone);
    const allBusinessesData = await fetchRecord('businesses') || {};

    // 1. ALL ACTIVE APPOINTMENTS (UNLIMITED VISIBILITY - REQUIREMENT 3)
    const activeApts = userApts.filter(apt => apt && (apt.status === 'pending' || apt.status === 'approved' || apt.status === 'cancel_requested' || apt.status === 'reschedule_requested'));

    // 2. PAST APPOINTMENTS (LIMITED TO LATEST 5 IN UI - REQUIREMENT 4)
    const pastAptsAll = userApts.filter(apt => apt && (apt.status === 'completed' || apt.status === 'cancelled' || apt.status === 'rejected' || apt.status === 'no_show'));
    pastAptsAll.sort((a, b) => (b.date + (b.time || '')).localeCompare(a.date + (a.time || '')));
    const pastAptsVisible = pastAptsAll.slice(0, 5);

    const activeHtml = activeApts.map(apt => {
      const bizObj = allBusinessesData[apt.businessId];
      const salonName = apt.businessNameSnapshot || (bizObj ? bizObj.name : 'EZO Salon');
      const aptTimeMs = new Date(`${apt.date}T${apt.time || '00:00'}:00`).getTime();
      const hoursUntilApt = (aptTimeMs - Date.now()) / (1000 * 3600);
      const is6HoursOrMore = hoursUntilApt >= 6;

      return `
        <div class="card card-gold animate-fade" style="padding: 14px; margin-bottom: 10px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <div style="font-size: 11px; color: var(--gold-primary); font-weight: 800; margin-bottom: 2px;">💈 ${t('salonLabel', currentLang)}: ${salonName}</div>
              <div style="font-size: 14px; font-weight: 800; color: #fff;">✂️ ${apt.serviceNameSnapshot || apt.serviceName}</div>
              <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">
                💈 ${t('barberLabel', currentLang)}: ${apt.staffName || 'Mustafa Usta'} • 💰 ${apt.servicePriceSnapshot || apt.servicePrice || 350} TL
              </div>
              <div style="font-size: 12px; color: var(--gold-primary); font-weight: 700; margin-top: 2px;">📅 ${apt.date} @ ${apt.time} (${apt.serviceDuration || 30} dk)</div>
            </div>
            <span class="badge ${apt.status === 'approved' ? 'badge-approved' : 'badge-pending'}">${t(apt.status, currentLang)}</span>
          </div>

          <div style="display: flex; gap: 8px; margin-top: 10px;">
            <button onclick="window.requestRescheduleCustomer('${apt.aptId}', ${is6HoursOrMore})" class="btn btn-secondary" style="flex: 1; font-size: 11px; padding: 6px;">
              ${t('rescheduleRequestBtn', currentLang)}
            </button>
            <button onclick="window.requestCancelCustomer('${apt.aptId}')" class="btn btn-secondary" style="flex: 1; font-size: 11px; padding: 6px; border-color: #ef4444; color: #ef4444;" ${apt.status === 'cancel_requested' ? 'disabled' : ''}>
              ${apt.status === 'cancel_requested' ? '⏳ İptal Talebi Alındı' : t('cancelRequestBtn', currentLang)}
            </button>
          </div>
        </div>
      `;
    }).join('');

    const pastHtml = pastAptsVisible.map(apt => {
      const bizObj = allBusinessesData[apt.businessId];
      const salonName = apt.businessNameSnapshot || (bizObj ? bizObj.name : 'EZO Salon');

      return `
        <div class="card animate-fade" style="padding: 12px; margin-bottom: 8px; opacity: 0.85;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <div style="font-size: 10px; color: var(--gold-primary); font-weight: 700;">💈 ${t('salonLabel', currentLang)}: ${salonName}</div>
              <div style="font-size: 13px; font-weight: 800; color: #fff;">✂️ ${apt.serviceNameSnapshot || apt.serviceName} • ${apt.staffName || 'Mustafa Usta'}</div>
              <div style="font-size: 11px; color: var(--text-muted);">📅 ${apt.date} @ ${apt.time} • 💰 ${apt.servicePriceSnapshot || apt.servicePrice || 350} TL</div>
            </div>
            <span class="badge badge-secondary" style="font-size: 10px;">${t(apt.status, currentLang)}</span>
          </div>
        </div>
      `;
    }).join('');

    mainHtml = `
      <div class="card animate-fade">
        <h3 style="font-size: 16px; font-weight: 800; color: var(--gold-primary); margin-bottom: 12px;">📅 ${t('myAppointments', currentLang)}</h3>
        
        <h4 style="font-size: 13px; font-weight: 800; color: var(--gold-primary); margin-bottom: 8px;">${t('activeUpcomingAppointments', currentLang)} (${activeApts.length})</h4>
        ${activeApts.length === 0 ? `<div style="font-size: 11px; color: var(--text-muted); margin-bottom: 14px;">${t('noActiveAppointments', currentLang)}</div>` : activeHtml}

        <h4 style="font-size: 13px; font-weight: 800; color: var(--gold-primary); margin-top: 16px; margin-bottom: 8px;">${t('pastAppointmentsLimit', currentLang)}</h4>
        ${pastAptsVisible.length === 0 ? `<div style="font-size: 11px; color: var(--text-muted);">${t('noPastAppointments', currentLang)}</div>` : pastHtml}
      </div>
    `;
  } else if (activeCustomerTab === 'ai') {
    renderAiConsultantScreen(user, onTabChange);
    return;
  } else if (activeCustomerTab === 'profile') {
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
          <div style="font-size: 12px; color: var(--gold-primary); font-weight: 700;">${user.phone}</div>
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

          <button onclick="window.promptUserLogout()" class="btn btn-secondary" style="width: 100%; margin-top: 10px; min-height: 42px; border-color: #ef4444; color: #ef4444;">
            🚪 ${t('logout', currentLang)}
          </button>
        </div>
      </div>
    `;
  }

  // TOP BAR HEADER WITH NOTIFICATION BELL (REQUIREMENT 9)
  container.innerHTML = `
    <div class="header-bar">
      <div style="display: flex; align-items: center; gap: 8px;">
        <img src="./assets/images/ezo_stile_logo.png" style="height: 24px; width: auto;" alt="EZO Logo">
        <span style="font-size: 12px; font-weight: 800; color: var(--gold-primary);">${displayName}</span>
      </div>

      <div style="display: flex; align-items: center; gap: 10px;">
        <button onclick="window.openNotificationCenterModal()" style="position: relative; background: transparent; border: none; font-size: 20px; cursor: pointer; color: var(--gold-primary);">
          🔔
          ${unreadCount > 0 ? `<span style="position: absolute; top: -4px; right: -4px; width: 16px; height: 16px; border-radius: 50%; background: #ef4444; color: #fff; font-size: 10px; font-weight: 900; display: flex; align-items: center; justify-content: center;">${unreadCount}</span>` : ''}
        </button>
        <span style="font-size: 11px; color: var(--text-muted);">${user.phone}</span>
      </div>
    </div>

    ${mainHtml}

    <nav class="bottom-nav">
      <button onclick="window.switchCustomerTab('home')" class="nav-item ${activeCustomerTab === 'home' ? 'active' : ''}">
        <span class="icon">🏠</span>
        <span>${t('homeTab', currentLang)}</span>
      </button>
      <button onclick="window.switchCustomerTab('salons')" class="nav-item ${activeCustomerTab === 'salons' ? 'active' : ''}">
        <span class="icon">💈</span>
        <span>${t('salonsTab', currentLang)}</span>
      </button>
      <button onclick="window.switchCustomerTab('booking')" class="nav-item ${activeCustomerTab === 'booking' ? 'active' : ''}">
        <span class="icon">✂️</span>
        <span>${t('bookingTab', currentLang)}</span>
      </button>
      <button onclick="window.switchCustomerTab('ai')" class="nav-item ${activeCustomerTab === 'ai' ? 'active' : ''}">
        <span class="icon">🤖</span>
        <span>${t('aiTab', currentLang)}</span>
      </button>
      <button onclick="window.switchCustomerTab('profile')" class="nav-item ${activeCustomerTab === 'profile' ? 'active' : ''}">
        <span class="icon">👤</span>
        <span>${t('profileTab', currentLang)}</span>
      </button>
    </nav>
  `;

  // NOTIFICATION CENTER MODAL (REQUIREMENT 9)
  window.openNotificationCenterModal = () => {
    const root = document.getElementById('modal-root');
    if (!root) return;

    const notifRows = notifList.map(n => `
      <div class="card" style="padding: 10px; margin-bottom: 6px; background: ${n.read ? 'rgba(255,255,255,0.03)' : 'rgba(245,158,11,0.12)'}; border-color: ${n.read ? 'var(--border-color)' : 'var(--gold-primary)'};">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div style="font-size: 12px; font-weight: 800; color: #fff;">${n.title}</div>
          <div style="font-size: 9px; color: var(--text-muted);">${new Date(n.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
        </div>
        <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">${n.message}</div>
      </div>
    `).join('');

    root.innerHTML = `
      <div class="modal-overlay" onclick="window.closeModal()">
        <div class="modal-card animate-fade" onclick="event.stopPropagation()">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
            <h3 style="font-size: 15px; font-weight: 800; color: var(--gold-primary); margin: 0;">🔔 Bildirim Merkezi</h3>
            <button onclick="window.closeModal()" class="btn btn-secondary" style="padding: 4px 10px;">✕</button>
          </div>

          <div style="max-height: 300px; overflow-y: auto; margin-bottom: 12px;">
            ${notifList.length === 0 ? '<div style="font-size: 12px; color: var(--text-muted); text-align: center; padding: 20px;">Bildiriminiz bulunmamaktadır.</div>' : notifRows}
          </div>

          <button onclick="window.markAllNotificationsRead()" class="btn btn-gold" style="width: 100%;">
            Tümünü Okundu İşaretle
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
    renderCustomerScreen(user, onTabChange);
  };

  // PROFILE PHOTO UPLOAD & REMOVE MODAL (REQUIREMENT 4)
  window.openProfilePhotoModal = () => {
    const root = document.getElementById('modal-root');
    if (!root) return;

    root.innerHTML = `
      <div class="modal-overlay" onclick="window.closeModal()">
        <div class="modal-card animate-fade" onclick="event.stopPropagation()">
          <h3 style="font-size: 15px; font-weight: 800; color: var(--gold-primary); margin-bottom: 12px;">📷 Profil Fotoğrafı</h3>

          <input type="file" id="profile-photo-input" accept="image/jpeg,image/png,image/webp" style="display: none;" onchange="window.handleProfilePhotoSelect(event)">

          <div style="display: flex; flex-direction: column; gap: 8px;">
            <button onclick="document.getElementById('profile-photo-input').click()" class="btn btn-gold">
              📤 Fotoğraf Yükle / Değiştir
            </button>
            ${user.photoUrl ? `
              <button onclick="window.removeProfilePhoto()" class="btn btn-secondary" style="border-color: #ef4444; color: #ef4444;">
                🗑️ Fotoğrafı Kaldır
              </button>
            ` : ''}
            <button onclick="window.closeModal()" class="btn btn-secondary">
              Vazgeç
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
      showErrorModal(t('errorTitle'), 'Lütfen geçerli bir JPEG veya PNG resim dosyası seçiniz.');
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
        user.photoUrl = compressedBase64;
        await saveRecord(`users/${user.uid}/photoUrl`, compressedBase64);
        window.closeModal();
        showSuccessModal(t('successTitle'), 'Profil fotoğrafınız başarıyla güncellendi.');
        renderCustomerScreen(user, onTabChange);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  window.removeProfilePhoto = async () => {
    user.photoUrl = null;
    await saveRecord(`users/${user.uid}/photoUrl`, null);
    window.closeModal();
    showSuccessModal(t('successTitle'), 'Profil fotoğrafınız kaldırıldı.');
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
            <h3 style="font-size: 15px; font-weight: 800; color: var(--gold-primary); margin: 0;">🔒 Şifre Değiştir</h3>
            <button onclick="window.closeModal()" class="btn btn-secondary" style="padding: 4px 10px;">✕</button>
          </div>

          <label style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">Mevcut Şifre</label>
          <input type="password" id="pwd-current" class="input-field" placeholder="••••••••">

          <label style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">Yeni Şifre</label>
          <input type="password" id="pwd-new" class="input-field" placeholder="••••••••">

          <label style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">Yeni Şifre Tekrar</label>
          <input type="password" id="pwd-confirm" class="input-field" placeholder="••••••••">

          <button onclick="window.submitChangePassword()" class="btn btn-gold" style="width: 100%; margin-top: 8px;">
            💾 Şifreyi Kaydet
          </button>
        </div>
      </div>
    `;
  };

  window.submitChangePassword = async () => {
    const currentPwd = document.getElementById('pwd-current').value;
    const newPwd = document.getElementById('pwd-new').value;
    const confirmPwd = document.getElementById('pwd-confirm').value;

    const dbUser = await fetchRecord(`users/${user.uid}`) || {};
    const actualCurrentPwd = dbUser.password || '123456';

    if (currentPwd !== actualCurrentPwd) {
      showErrorModal(t('errorTitle'), 'Mevcut şifreniz hatalıdır.');
      return;
    }
    if (!newPwd || newPwd.length < 4) {
      showErrorModal(t('errorTitle'), 'Yeni şifreniz en az 4 karakter olmalıdır.');
      return;
    }
    if (newPwd !== confirmPwd) {
      showErrorModal(t('errorTitle'), 'Yeni şifreler birbiriyle eşleşmiyor.');
      return;
    }

    await saveRecord(`users/${user.uid}/password`, newPwd);
    window.closeModal();
    showSuccessModal(t('successTitle'), 'Şifreniz başarıyla değiştirildi.');
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
            <button onclick="window.closeModal()" class="btn btn-secondary" style="padding: 4px 10px;">✕</button>
          </div>

          <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px;">
            <label style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #fff;">
              <span>🔔 Uygulama İçi Bildirimler</span>
              <input type="checkbox" id="pref-inapp" ${prefs.inApp !== false ? 'checked' : ''} onchange="window.handleNotificationPermission(this.checked)">
            </label>
            <label style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #fff;">
              <span>🔊 Sesli Bildirimler</span>
              <input type="checkbox" id="pref-sound" ${prefs.sound !== false ? 'checked' : ''}>
            </label>
            <label style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #fff;">
              <span>📣 Kampanya & Fırsat Bildirimleri</span>
              <input type="checkbox" id="pref-campaigns" ${prefs.campaigns ? 'checked' : ''}>
            </label>
          </div>

          <button onclick="window.saveNotificationPreferences()" class="btn btn-gold" style="width: 100%; min-height: 42px;">
            💾 Kaydet
          </button>
        </div>
      </div>
    `;
  };

  window.handleNotificationPermission = (isEnabling) => {
    if (isEnabling && 'Notification' in window && Notification.permission !== 'granted') {
      Notification.requestPermission().then(perm => {
        if (perm !== 'granted') {
          showErrorModal('Bildirim İzni Denied', 'Tarayıcınızda bildirim izni verilmedi. Bildirimler uygulama içi olarak gösterilecektir.');
        }
      });
    }
  };

  window.saveNotificationPreferences = async () => {
    const prefs = {
      inApp: document.getElementById('pref-inapp').checked,
      sound: document.getElementById('pref-sound').checked,
      campaigns: document.getElementById('pref-campaigns').checked,
      updatedAt: new Date().toISOString()
    };
    await saveRecord(`users/${user.uid}/notificationPreferences`, prefs);
    window.closeModal();
    showSuccessModal(t('successTitle'), 'Bildirim tercihleriniz başarıyla kaydedildi.');
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
            <button onclick="window.closeModal()" class="btn btn-secondary" style="padding: 4px 10px;">✕</button>
          </div>

          <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px;">
            <label style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">Ad Soyad</label>
            <input type="text" id="cust-edit-name" value="${displayName}" class="input-field" placeholder="Ad Soyad">

            <label style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">Telefon Numarası</label>
            <input type="tel" id="cust-edit-phone" value="${user.phone || ''}" class="input-field" placeholder="05XXXXXXXXX">

            <button onclick="window.submitCustomerProfileUpdate()" class="btn btn-gold" style="width: 100%;">
              💾 Bilgileri Güncelle
            </button>

            <div style="display: flex; gap: 8px; margin-top: 6px;">
              <button onclick="window.openChangePasswordModal()" class="btn btn-outline-gold" style="flex: 1; font-size: 11px;">
                🔒 Şifre Değiştir
              </button>
              <button onclick="window.openForgotPasswordModal()" class="btn btn-secondary" style="flex: 1; font-size: 11px;">
                ❓ Şifremi Unuttum
              </button>
            </div>
          </div>

          <button onclick="window.requestDeleteAccount()" class="btn btn-secondary" style="width: 100%; border-color: #ef4444; color: #ef4444; font-size: 11px;">
            ⚠️ Hesabı Silme Talebi Gönder
          </button>
        </div>
      </div>
    `;
  };

  window.submitCustomerProfileUpdate = async () => {
    const nameInput = document.getElementById('cust-edit-name');
    const phoneInput = document.getElementById('cust-edit-phone');
    const newName = nameInput ? nameInput.value.trim() : displayName;
    const newPhone = phoneInput ? phoneInput.value.trim() : user.phone;

    if (!newName) {
      showErrorModal(t('errorTitle'), 'Lütfen geçerli bir ad soyad giriniz.');
      return;
    }

    const cleanPhone = (ph) => String(ph || '').replace(/\D/g, '');
    const targetPhoneClean = cleanPhone(newPhone);

    if (targetPhoneClean && targetPhoneClean !== cleanPhone(user.phone)) {
      const allUsersData = await fetchRecord('users') || {};
      const existingUser = Object.values(allUsersData).find(u => u && u.uid !== user.uid && cleanPhone(u.phone) === targetPhoneClean);

      if (existingUser) {
        showErrorModal('Telefon Kullanımda', 'Girdiğiniz telefon numarası başka bir kullanıcı hesabına kayıtlıdır.');
        return;
      }
      user.phone = newPhone;
      await saveRecord(`users/${user.uid}/phone`, newPhone, 'PUT');
    }

    user.displayName = newName;
    user.name = newName;
    await saveRecord(`users/${user.uid}/displayName`, newName, 'PUT');
    await saveRecord(`users/${user.uid}/name`, newName, 'PUT');

    // Update active session
    localStorage.setItem('ezo_user_data', JSON.stringify(user));
    window.closeModal();
    showSuccessModal(t('successTitle'), 'Profil bilgileriniz başarıyla güncellendi.');
    renderCustomerScreen(user, onTabChange);
  };

  window.openForgotPasswordModal = () => {
    const root = document.getElementById('modal-root');
    if (!root) return;

    root.innerHTML = `
      <div class="modal-overlay" onclick="window.closeModal()">
        <div class="modal-card animate-fade" onclick="event.stopPropagation()">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
            <h3 style="font-size: 15px; font-weight: 800; color: var(--gold-primary); margin: 0;">❓ Şifremi Unuttum</h3>
            <button onclick="window.closeModal()" class="btn btn-secondary" style="padding: 4px 10px;">✕</button>
          </div>

          <div style="font-size: 12px; color: #fff; background: rgba(245,158,11,0.12); padding: 12px; border-radius: 8px; line-height: 1.5; margin-bottom: 14px;">
            ℹ️ Güvenliğiniz için SMS şifre sıfırlama altyapısı aktifleşene kadar şifre yenileme talepleri Destek Ekibimiz veya randevu aldığınız salon yöneticisi üzerinden gerçekleştirilmektedir.
          </div>

          <button onclick="window.closeModal(); window.openHelpSupportModal();" class="btn btn-gold" style="width: 100%;">
            💬 Destek Talebi İlet
          </button>
        </div>
      </div>
    `;
  };

  window.requestDeleteAccount = () => {
    showConfirmModal('Hesap Silme Talebi', 'Hesap silme talebiniz yöneticiye iletilecektir. Emin misiniz?', async () => {
      await saveRecord(`users/${user.uid}/deleteRequest`, { requestedAt: new Date().toISOString() });
      showSuccessModal(t('successTitle'), 'Hesap silme talebiniz başarıyla alındı.');
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
            <button onclick="window.closeModal()" class="btn btn-secondary" style="padding: 4px 10px;">✕</button>
          </div>

          <div style="margin-bottom: 14px; max-height: 250px; overflow-y: auto;">
            <div class="card" style="padding: 10px; margin-bottom: 6px;">
              <div style="font-size: 12px; font-weight: 800; color: var(--gold-primary);">❓ Nasıl randevu alırım?</div>
              <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">Randevu Al sekmesinden hizmet, berber, tarih ve müsait saati seçip onaylayabilirsiniz.</div>
            </div>
            <div class="card" style="padding: 10px; margin-bottom: 6px;">
              <div style="font-size: 12px; font-weight: 800; color: var(--gold-primary);">❓ Randevumu nasıl değiştiririm?</div>
              <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">Randevularım sekmesinde aktif randevunuzun altında "Tarih/Saat Değiştir" butonuna basabilirsiniz.</div>
            </div>
          </div>

          <h4 style="font-size: 12px; font-weight: 700; color: #fff; margin-bottom: 6px;">Destek Ekibine Mesaj Gönder</h4>
          <textarea id="support-msg" class="input-field" rows="3" placeholder="Sorunuz veya geri bildiriminiz..."></textarea>

          <button onclick="window.submitSupportTicket()" class="btn btn-gold" style="width: 100%; min-height: 40px;">
            🚀 Mesajı Gönder
          </button>
        </div>
      </div>
    `;
  };

  window.submitSupportTicket = async () => {
    const msg = document.getElementById('support-msg').value;
    if (!msg) {
      showErrorModal(t('errorTitle'), 'Lütfen bir mesaj yazınız.');
      return;
    }
    const ticketId = 'tkt_' + Date.now();
    await saveRecord(`support_tickets/${ticketId}`, { ticketId, userUid: user.uid, message: msg, createdAt: new Date().toISOString() });
    window.closeModal();
    showSuccessModal(t('successTitle'), 'Destek mesajınız başarıyla iletildi.');
  };

  // CUSTOMER RESCHEDULE WITH 6-HOUR RULE ENGINE (REQUIREMENT 8)
  window.requestRescheduleCustomer = (aptId, is6HoursOrMore) => {
    const root = document.getElementById('modal-root');
    if (!root) return;

    const todayDate = new Date().toISOString().split('T')[0];
    const tomorrowDate = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    root.innerHTML = `
      <div class="modal-overlay" onclick="window.closeModal()">
        <div class="modal-card animate-fade" onclick="event.stopPropagation()">
          <h3 style="font-size: 15px; font-weight: 800; color: var(--gold-primary); margin-bottom: 10px;">
            🔄 ${is6HoursOrMore ? 'Yeni Tarih & Saat Seçin' : 'Değişiklik Talebi Gönder'}
          </h3>
          <p style="font-size: 11px; color: var(--text-muted); margin-bottom: 12px;">
            ${is6HoursOrMore ? 'Randevunuza 6 saatten fazla olduğu için randevunuz doğrudan güncellenecektir.' : 'Randevunuza 6 saatten az kaldığı için yeni saat talebiniz salon onayına gönderilecektir.'}
          </p>

          <label style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">Yeni Tarih</label>
          <div style="display: flex; gap: 6px; margin-bottom: 10px;">
            <input type="date" id="resched-date" value="${tomorrowDate}" class="input-field" style="margin: 0;">
          </div>

          <label style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">Yeni Saat</label>
          <input type="text" id="resched-time" value="14:00" class="input-field" placeholder="14:00">

          <button onclick="window.submitCustomerReschedule('${aptId}')" class="btn btn-gold" style="width: 100%; margin-top: 8px;">
            ⚡ ${is6HoursOrMore ? 'Tarihi Güncelle' : 'Talebi İlet'}
          </button>
        </div>
      </div>
    `;
  };

  window.submitCustomerReschedule = async (aptId) => {
    const newDate = document.getElementById('resched-date').value;
    const newTime = document.getElementById('resched-time').value;

    if (!newDate || !newTime) {
      showErrorModal(t('errorTitle'), 'Lütfen geçerli bir tarih ve saat seçiniz.');
      return;
    }

    const res = await fetch('/api/booking/reschedule-approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aptId, newDate, newTime, userUid: user.uid })
    }).catch(() => null);

    const data = res ? await res.json().catch(() => null) : null;
    window.closeModal();

    if (res && res.ok && data && data.success) {
      showSuccessModal(t('successTitle'), data.message || '✅ Tarih/Saat güncellemesi tamamlandı.');
      renderCustomerScreen(user, onTabChange);
    } else {
      showErrorModal(t('errorTitle'), (data && data.error) ? data.error : 'Tarih değişikliği gerçekleştirilemedi.');
    }
  };

  // CUSTOMER CANCEL REQUEST (REQUIREMENT 7 - NO DIRECT CANCEL)
  window.requestCancelCustomer = (aptId) => {
    showConfirmModal('İptal Talebi Gönder', 'Randevunuz için salona iptal talebi iletilecektir. Emin misiniz?', async () => {
      const res = await fetch('/api/booking/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aptId, newStatus: 'cancel_requested', userUid: user.uid })
      }).catch(() => null);

      const data = res ? await res.json().catch(() => null) : null;
      if (res && res.ok && data && data.success) {
        showSuccessModal(t('successTitle'), '📩 İptal talebiniz salona iletilmiştir. Salon onayı bekleniyor.');
        renderCustomerScreen(user, onTabChange);
      } else {
        showErrorModal(t('errorTitle'), (data && data.error) ? data.error : 'İptal talebi gönderilemedi.');
      }
    });
  };

  // LOGOUT CONFIRM MODAL (REQUIREMENT 3)
    // LOGOUT CONFIRM MODAL (SECTION 4 - NO FREEZE STABLE LOGOUT)
  window.promptUserLogout = () => {
    showConfirmModal('Çıkış Yap', 'Çıkış yapmak istediğinize emin misiniz?', async () => {
      try {
        logoutUserSession();
        const root = document.getElementById('modal-root');
        if (root) root.innerHTML = '';
        if (typeof onTabChange === 'function') {
          onTabChange(null);
        }
      } catch (err) {
        console.error('Logout error:', err);
        logoutUserSession();
        location.reload();
      }
    });
  };

  // SERVICE SELECTION BOTTOM SHEET MODAL
  window.openServiceSelectionModal = async () => {
    const root = document.getElementById('modal-root');
    if (!root) return;

    const servicesList = await getServices(bookingState.businessId);
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
            <div style="font-size: 13px; font-weight: 800; color: #fff;">✂️ ${translatedName}</div>
            <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">Süre: ${s.duration || 30} Dakika</div>
          </div>
          <div style="font-size: 14px; color: var(--gold-primary); font-weight: 900;">${s.price} TL</div>
        </div>
      `;
    }).join('');

    root.innerHTML = `
      <div class="modal-overlay" onclick="window.closeModal()">
        <div class="modal-card animate-fade" onclick="event.stopPropagation()">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
            <h3 style="font-size: 15px; font-weight: 800; color: var(--gold-primary); margin: 0;">✂️ Hizmet Seçin</h3>
            <button onclick="window.closeModal()" class="btn btn-secondary" style="padding: 4px 10px;">✕</button>
          </div>

          <div style="max-height: 300px; overflow-y: auto; margin-bottom: 14px;">
            ${serviceRowsHtml}
          </div>

          <button onclick="window.confirmServiceSelection()" class="btn btn-gold" style="width: 100%; min-height: 42px;">
            Onayla ve Devam Et →
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
      showErrorModal(t('errorTitle'), 'Lütfen bir hizmet seçiniz.');
      return;
    }
    window.closeModal();
    renderCustomerScreen(user, onTabChange);
  };

  window.selectSalonForBooking = (bizId) => {
    bookingState.businessId = bizId;
    activeCustomerTab = 'booking';
    renderCustomerScreen(user, onTabChange);
  };

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

  window.switchCustomerTab = (tab) => {
    activeCustomerTab = tab;
    renderCustomerScreen(user, onTabChange);
  };

  // SUBMIT CUSTOMER BOOKING WITH LOADING STATE & DOUBLE CLICK GUARD
  window.submitCustomerBooking = async () => {
    if (!bookingState.serviceId || !bookingState.time) {
      showErrorModal(t('errorTitle'), 'Lütfen hizmet ve müsait saat seçiniz.');
      return;
    }

    const btnEl = document.getElementById('btn-submit-booking');
    if (btnEl) {
      btnEl.disabled = true;
      btnEl.innerText = '⏳ Randevu Oluşturuluyor...';
    }

    try {
      const res = await fetch('/api/booking/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: bookingState.businessId || 'biz_merkez_salon',
          customerUid: user.uid,
          customerName: displayName,
          customerPhone: user.phone,
          staffId: bookingState.staffId || 'staff-any',
          serviceId: bookingState.serviceId,
          serviceName: bookingState.serviceName,
          servicePrice: bookingState.servicePrice,
          serviceDuration: bookingState.serviceDuration,
          date: bookingState.date,
          time: bookingState.time,
          source: 'ezo_discovery'
        })
      });

      const resData = await res.json().catch(() => null);

      if (res.ok && resData && resData.success && (resData.aptId || resData.appointment)) {
        const aptId = resData.aptId || (resData.appointment ? resData.appointment.aptId : 'apt_new');
        window.openWhatsAppSmsModal('create', {
          aptId,
          serviceName: bookingState.serviceName,
          date: bookingState.date,
          time: bookingState.time,
          customerName: displayName,
          customerPhone: user.phone
        });
        activeCustomerTab = 'appointments';
        renderCustomerScreen(user, onTabChange);
        return;
      }

      if (res && res.status === 409) {
        showErrorModal(t('errorTitle'), (resData && resData.error) ? resData.error : '⚠️ Seçtiğiniz tarih ve saat aralığında berber doludur. Lütfen başka bir saat seçiniz.');
        if (btnEl) { btnEl.disabled = false; btnEl.innerText = `⚡ ${t('confirmBooking', currentLang)}`; }
        return;
      }

      if (resData && resData.error) {
        showErrorModal(t('errorTitle'), `❌ Hata (${res ? res.status : 'API'}): ${resData.error}`);
        if (btnEl) { btnEl.disabled = false; btnEl.innerText = `⚡ ${t('confirmBooking', currentLang)}`; }
        return;
      }
    } catch (e) {
      console.warn('Booking create error:', e);
      showErrorModal(t('errorTitle'), 'Sunucuya ulaşılamadı. Lütfen tekrar deneyiniz.');
      if (btnEl) { btnEl.disabled = false; btnEl.innerText = `⚡ ${t('confirmBooking', currentLang)}`; }
    }
  };

  // WHATSAPP & SMS MODAL ENGINE
  window.openWhatsAppSmsModal = (actionType, details) => {
    const root = document.getElementById('modal-root');
    if (!root) return;

    const messageText = `EZO STİLE Bildirimi:
İşlem: ${actionType.toUpperCase()}
Müşteri: ${details.customerName} (${details.customerPhone})
Hizmet: ${details.serviceName}
Tarih: ${details.date} @ ${details.time}
EZO STİLE üzerinden oluşturuldu.`;
    const encodedText = encodeURIComponent(messageText);

    root.innerHTML = `
      <div class="modal-overlay" onclick="window.closeModal()">
        <div class="modal-card animate-fade" onclick="event.stopPropagation()">
          <h3 style="font-size: 16px; font-weight: 800; color: var(--gold-primary); margin-bottom: 10px;">
            💬 Salon Sahibine Bildir
          </h3>
          <p style="font-size: 11px; color: var(--text-muted); margin-bottom: 14px;">
            Randevunuz başarıyla oluşturuldu. İsterseniz salon sahibine doğrudan WhatsApp veya SMS ile bilgi gönderebilirsiniz.
          </p>

          <div style="display: flex; flex-direction: column; gap: 8px;">
            <a href="https://wa.me/?text=${encodedText}" target="_blank" onclick="window.closeModal()" class="btn btn-gold" style="text-align: center; text-decoration: none;">
              💬 ${t('notifyWhatsApp', currentLang)}
            </a>
            <a href="sms:?body=${encodedText}" target="_blank" onclick="window.closeModal()" class="btn btn-outline-gold" style="text-align: center; text-decoration: none;">
              📱 ${t('notifySms', currentLang)}
            </a>
            <button onclick="window.closeModal()" class="btn btn-secondary">
              ❌ ${t('notNow', currentLang)}
            </button>
          </div>
        </div>
      </div>
    `;
  };
}

  // MÜŞTERİ SALON DETAY EKRANI (REQUIREMENT 9)
  window.openSalonDetailsModal = async (businessId) => {
    const allBusinessesData = await fetchRecord('businesses') || {};
    const biz = allBusinessesData[businessId];
    if (!biz) return;

    const root = document.getElementById('modal-root');
    if (!root) return;

    const media = biz.media || {
      profileImageUrl: biz.profileImageUrl || null,
      coverImageUrl: biz.coverImageUrl || null,
      gallery: biz.gallery || []
    };

    const coverUrl = media.coverImageUrl || media.profileImageUrl || biz.coverImageUrl || biz.profileImageUrl || './assets/images/ezo_stile_logo.png';
    const profileUrl = media.profileImageUrl || biz.profileImageUrl || null;
    const servicesList = await getServices(businessId);
    const staffList = await getStaffList(businessId);

    const servicesHtml = servicesList.map(s => `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px dashed rgba(255,255,255,0.1); font-size: 12px;">
        <span style="color: #fff;">✂️ ${s.name} (${s.duration || 30} dk)</span>
        <span style="color: var(--gold-primary); font-weight: 800;">${s.price} TL</span>
      </div>
    `).join('');

    const staffHtml = staffList.map(st => `
      <span class="badge badge-secondary" style="font-size: 11px;">💈 ${st.displayName}</span>
    `).join(' ');

    const galleryHtml = (media.gallery || []).map(imgUrl => `
      <img src="${imgUrl}" style="width: 100%; height: 75px; object-fit: cover; border-radius: 6px;">
    `).join('');

    root.innerHTML = `
      <div class="modal-overlay" onclick="window.closeModal()">
        <div class="modal-card animate-fade" onclick="event.stopPropagation()" style="max-height: 90vh; overflow-y: auto;">
          <div style="position: relative; margin-bottom: 14px;">
            <img src="${coverUrl}" style="width: 100%; height: 140px; object-fit: cover; border-radius: 8px;" alt="Cover">
            <button onclick="window.closeModal()" style="position: absolute; top: 6px; right: 6px; background: rgba(0,0,0,0.7); color: #fff; border: none; border-radius: 50%; width: 26px; height: 26px; cursor: pointer;">✕</button>
          </div>

          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
            ${profileUrl ? `<img src="${profileUrl}" style="width: 48px; height: 48px; border-radius: 50%; object-fit: cover; border: 2px solid var(--gold-primary);">` : ''}
            <div>
              <h3 style="font-size: 16px; font-weight: 800; color: #fff; margin: 0;">💈 ${biz.name}</h3>
              <div style="font-size: 11px; color: var(--text-muted);">📍 ${biz.district || 'Şişli'} / ${biz.city || 'İstanbul'} • ⭐ ${biz.averageRating || '4.9'}</div>
            </div>
          </div>

          <!-- SERVICES -->
          <h4 style="font-size: 13px; font-weight: 800; color: var(--gold-primary); margin-bottom: 6px;">✂️ Hizmetler & Fiyatlar</h4>
          <div style="margin-bottom: 14px;">
            ${servicesList.length === 0 ? '<div style="font-size: 11px; color: var(--text-muted);">Hizmet bulunmuyor.</div>' : servicesHtml}
          </div>

          <!-- STAFF -->
          <h4 style="font-size: 13px; font-weight: 800; color: var(--gold-primary); margin-bottom: 6px;">👥 Berber Kadrosu</h4>
          <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 14px;">
            ${staffList.length === 0 ? '<div style="font-size: 11px; color: var(--text-muted);">Personel bilgisi yok.</div>' : staffHtml}
          </div>

          <!-- GALLERY -->
          ${(media.gallery || []).length > 0 ? `
            <h4 style="font-size: 13px; font-weight: 800; color: var(--gold-primary); margin-bottom: 6px;">📸 Fotoğraf Galerisi</h4>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-bottom: 14px;">
              ${galleryHtml}
            </div>
          ` : ''}

          <button onclick="window.selectSalonForBooking('${businessId}')" class="btn btn-gold" style="width: 100%; min-height: 44px; font-size: 13px; font-weight: 800;">
            ✂️ Randevu Al →
          </button>
        </div>
      </div>
    `;
  };
