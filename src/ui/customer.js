
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


/* EZO STİLE v2 - Single Authoritative Customer Booking Flow (v2.0.6) */
/* EZO STİLE v2 - Single Authoritative Customer Booking Architecture (v2.0.8) */
let activeCustomerTab = 'home';
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

let cachedCurrentServices = [];
let cachedCurrentStaff = [];

let isServicePickerExpanded = false;
let isStaffPickerExpanded = false;
let isDatePickerExpanded = false;


export async function beginNewBookingFromSalonById(businessId) {
  try {
    let businessName = 'Salon';
    try {
      const bizData = await fetchRecord('businesses/' + businessId) || {};
      businessName = bizData.name || 'Salon';
    } catch (e) {}

    customerBookingDraft = {
      flowId: 'flw_' + Date.now(),
      businessId: businessId,
      businessName: businessName,
      serviceId: null,
      serviceName: null,
      servicePrice: null,
      serviceDuration: 30,
      staffId: null,
      staffName: null,
      date: null,
      time: null
    };

    // Cleanly close modal & body scroll locks
    try {
      window.closeModal();
    } catch (e) {}

    const modalRoot = document.getElementById('modal-root');
    if (modalRoot) modalRoot.innerHTML = '';
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';

    activeCustomerTab = 'booking';
    if (typeof window._currentRenderCustomerScreen === 'function') {
      window._currentRenderCustomerScreen();
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

export async function renderCustomerScreen(user, onTabChange) {
  window._currentOnTabChange = onTabChange;
  window._currentRenderCustomerScreen = () => renderCustomerScreen(user, onTabChange);
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

        const salonCardsHtml = salons.map(b => {
      const coverUrl = (b.media && (b.media.coverImageUrl || b.media.profileImageUrl)) || b.coverImageUrl || b.profileImageUrl || './assets/images/ezo_stile_logo.png';
      return `
        <div class="card card-gold animate-fade" style="padding: 12px; margin-bottom: 12px; cursor: pointer;" onclick="window.openSalonDetailsModal('${b.businessId}')">
          <div style="width: 100%; height: 110px; border-radius: 8px; overflow: hidden; background: #1f2937; margin-bottom: 10px;">
            <img src="${coverUrl}" onerror="this.onerror=null; this.src='./assets/images/ezo_stile_logo.png';" style="width: 100%; height: 100%; object-fit: cover;" alt="${b.name || 'Salon'}">
          </div>
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
      `;
    }).join('');

    mainHtml = `
      <div class="card animate-fade">
        <h3 style="font-size: 16px; font-weight: 800; color: var(--gold-primary); margin-bottom: 12px;">💈 ${t('discoverSalons', currentLang)}</h3>
        <input type="text" placeholder="Salon adı veya semt ara..." value="${searchQuery}" oninput="window.setDiscoverySearch(this.value)" class="input-field">
        ${salons.length === 0 ? '<div style="font-size: 12px; color: var(--text-muted); text-align: center; padding: 20px;">Salon bulunamadı.</div>' : salonCardsHtml}
      </div>
    `;
  
  
    } else if (activeCustomerTab === 'booking') {
    if (!customerBookingDraft.businessId) {
      mainHtml = `
        <div class="card card-gold animate-fade" style="padding: 24px; text-align: center; margin-top: 10px;">
          <div style="font-size: 44px; margin-bottom: 12px;">💈</div>
          <h3 style="font-size: 16px; font-weight: 800; color: #fff; margin-bottom: 8px;">
            Randevu almak için önce bir salon seçin
          </h3>
          <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 16px;">
            Keşfet sekmesinden dilediğiniz salonu seçip randevunuzu sıfırdan oluşturabilirsiniz.
          </p>
          <button onclick="window.switchCustomerTab('salons')" class="btn btn-gold" style="width: 100%; min-height: 44px; font-weight: 800;">
            💈 Salonları Keşfet
          </button>
        </div>
      `;
    } else {
      const bizData = await fetchRecord('businesses/' + customerBookingDraft.businessId) || {};
      cachedCurrentServices = bizData.services ? Object.values(bizData.services).filter(s => s && s.active !== false) : [];
      cachedCurrentStaff = bizData.staff ? Object.values(bizData.staff).filter(st => st && st.active !== false) : [];

      const isStep1Valid = !!customerBookingDraft.serviceId;
      const isStep2Valid = isStep1Valid && !!customerBookingDraft.staffId;
      const isStep3Valid = isStep2Valid && !!customerBookingDraft.date;
      const isStep4Valid = isStep3Valid && !!customerBookingDraft.time;

      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const tmr = new Date(now.getTime() + 86400000);
      const tomorrowStr = `${tmr.getFullYear()}-${String(tmr.getMonth() + 1).padStart(2, '0')}-${String(tmr.getDate()).padStart(2, '0')}`;

      const todayFormatted = `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}`;
      const tomorrowFormatted = `${String(tmr.getDate()).padStart(2, '0')}.${String(tmr.getMonth() + 1).padStart(2, '0')}`;

      const selectedServiceObj = cachedCurrentServices.find(s => s && s.id === customerBookingDraft.serviceId);

      // Generate Time Slots
      const timeSlots = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00'];
      
      const currentHHMM = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
      const filteredSlots = customerBookingDraft.date === todayStr 
        ? timeSlots.filter(t => t > currentHHMM)
        : timeSlots;

      mainHtml = `
        <div class="card card-gold animate-fade" style="padding: 14px; margin-bottom: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">💈 Seçili Salon</div>
              <div style="font-size: 15px; font-weight: 800; color: #fff;">${customerBookingDraft.businessName || bizData.name || 'Salon'}</div>
            </div>
            <button onclick="window.switchCustomerTab('salons')" class="btn btn-secondary" style="font-size: 11px; padding: 4px 8px;">Değiştir</button>
          </div>
        </div>

        <!-- STEP 1: HİZMET SEÇ (COMPACT ACCORDION) -->
        <div class="card animate-fade" style="padding: 12px; margin-bottom: 10px; border-color: ${isStep1Valid ? '#22c55e' : 'var(--gold-primary)'};">
          ${isStep1Valid && !isServicePickerExpanded ? `
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div style="font-size: 11px; color: #22c55e; font-weight: 800;">1️⃣ Seçilen Hizmet ✓</div>
                <div style="font-size: 14px; font-weight: 800; color: #fff;">✂️ ${customerBookingDraft.serviceName} (${customerBookingDraft.serviceDuration || 30} dk)</div>
                <div style="font-size: 12px; color: var(--gold-primary); font-weight: 800;">💰 ${customerBookingDraft.servicePrice} TL</div>
              </div>
              <button onclick="window.toggleServicePicker(true)" class="btn btn-secondary" style="font-size: 11px; padding: 4px 10px;">Değiştir</button>
            </div>
          ` : `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <h4 style="font-size: 13px; font-weight: 800; color: var(--gold-primary); margin: 0;">
                1️⃣ Hizmet Seçiniz *
              </h4>
              ${isStep1Valid ? '<button onclick="window.toggleServicePicker(false)" class="btn btn-secondary" style="font-size: 10px; padding: 2px 6px;">Kapat ✕</button>' : ''}
            </div>
            <div style="display: flex; flex-direction: column; gap: 6px;">
              ${cachedCurrentServices.length === 0 ? '<div style="font-size: 11px; color: var(--text-muted);">Bu salonda aktif hizmet bulunmuyor.</div>' : cachedCurrentServices.map(s => `
                <div onclick="window.selectDraftServiceById('${s.id}')" class="card" style="padding: 10px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; background: ${customerBookingDraft.serviceId === s.id ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.03)'}; border-color: ${customerBookingDraft.serviceId === s.id ? 'var(--gold-primary)' : 'transparent'};">
                  <div>
                    <div style="font-size: 13px; font-weight: 700; color: #fff;">${s.name} (${s.duration || 30} dk)</div>
                    <div style="font-size: 11px; color: var(--gold-primary); font-weight: 800;">💰 ${s.price} TL</div>
                  </div>
                  <div style="font-size: 13px; font-weight: 800; color: ${customerBookingDraft.serviceId === s.id ? 'var(--gold-primary)' : 'var(--text-muted)'};">${customerBookingDraft.serviceId === s.id ? '✓ Seçili' : 'Seç →'}</div>
                </div>
              `).join('')}
            </div>
          `}
        </div>

        <!-- STEP 2: BERBER / UZMAN SEÇ (COMPACT ACCORDION) -->
        <div class="card animate-fade" style="padding: 12px; margin-bottom: 10px; opacity: ${isStep1Valid ? '1' : '0.5'}; border-color: ${isStep2Valid ? '#22c55e' : 'var(--border-color)'};">
          ${!isStep1Valid ? `
            <h4 style="font-size: 13px; font-weight: 800; color: var(--gold-primary); margin-bottom: 4px;">2️⃣ Berber / Uzman Seçiniz</h4>
            <div style="font-size: 11px; color: var(--text-muted);">Önce yukarıdan bir hizmet seçiniz.</div>
          ` : (isStep2Valid && !isStaffPickerExpanded ? `
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div style="font-size: 11px; color: #22c55e; font-weight: 800;">2️⃣ Seçilen Berber / Uzman ✓</div>
                <div style="font-size: 14px; font-weight: 800; color: #fff;">💈 ${customerBookingDraft.staffName}</div>
              </div>
              <button onclick="window.toggleStaffPicker(true)" class="btn btn-secondary" style="font-size: 11px; padding: 4px 10px;">Değiştir</button>
            </div>
          ` : `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <h4 style="font-size: 13px; font-weight: 800; color: var(--gold-primary); margin: 0;">2️⃣ Berber / Uzman Seçiniz *</h4>
              ${isStep2Valid ? '<button onclick="window.toggleStaffPicker(false)" class="btn btn-secondary" style="font-size: 10px; padding: 2px 6px;">Kapat ✕</button>' : ''}
            </div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              <button onclick="window.selectDraftStaffById('staff-any')" class="btn ${customerBookingDraft.staffId === 'staff-any' ? 'btn-gold' : 'btn-secondary'}" style="flex: 1; min-width: 120px; font-size: 11px;">
                ⭐ Fark Etmez
              </button>
              ${cachedCurrentStaff.map(st => `
                <button onclick="window.selectDraftStaffById('${st.id}')" class="btn ${customerBookingDraft.staffId === st.id ? 'btn-gold' : 'btn-secondary'}" style="flex: 1; min-width: 120px; font-size: 11px;">
                  💈 ${st.displayName || st.name}
                </button>
              `).join('')}
            </div>
          `)}
        </div>

        <!-- STEP 3: TARİH SEÇ (BUGÜN / YARIN / TAKVİM) -->
        <div class="card animate-fade" style="padding: 12px; margin-bottom: 10px; opacity: ${isStep2Valid ? '1' : '0.5'}; border-color: ${isStep3Valid ? '#22c55e' : 'var(--border-color)'};">
          ${!isStep2Valid ? `
            <h4 style="font-size: 13px; font-weight: 800; color: var(--gold-primary); margin-bottom: 4px;">3️⃣ Tarih Seçiniz</h4>
            <div style="font-size: 11px; color: var(--text-muted);">Önce hizmet ve personel seçiniz.</div>
          ` : (isStep3Valid && !isDatePickerExpanded ? `
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div style="font-size: 11px; color: #22c55e; font-weight: 800;">3️⃣ Seçilen Tarih ✓</div>
                <div style="font-size: 14px; font-weight: 800; color: #fff;">📅 ${customerBookingDraft.date === todayStr ? 'Bugün (' + todayFormatted + ')' : (customerBookingDraft.date === tomorrowStr ? 'Yarın (' + tomorrowFormatted + ')' : customerBookingDraft.date.split('-').reverse().join('.'))}</div>
              </div>
              <button onclick="window.toggleDatePicker(true)" class="btn btn-secondary" style="font-size: 11px; padding: 4px 10px;">Değiştir</button>
            </div>
          ` : `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <h4 style="font-size: 13px; font-weight: 800; color: var(--gold-primary); margin: 0;">3️⃣ Tarih Seçiniz *</h4>
              ${isStep3Valid ? '<button onclick="window.toggleDatePicker(false)" class="btn btn-secondary" style="font-size: 10px; padding: 2px 6px;">Kapat ✕</button>' : ''}
            </div>
            <div style="display: flex; gap: 8px; margin-bottom: 8px;">
              <button onclick="window.selectDraftDate('${todayStr}')" class="btn ${customerBookingDraft.date === todayStr ? 'btn-gold' : 'btn-secondary'}" style="flex: 1; font-size: 11px; font-weight: 700;">
                📅 Bugün (${todayFormatted})
              </button>
              <button onclick="window.selectDraftDate('${tomorrowStr}')" class="btn ${customerBookingDraft.date === tomorrowStr ? 'btn-gold' : 'btn-secondary'}" style="flex: 1; font-size: 11px; font-weight: 700;">
                📅 Yarın (${tomorrowFormatted})
              </button>
            </div>
            <div style="display: flex; align-items: center; gap: 8px; margin-top: 6px;">
              <span style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">📅 Başka Tarih:</span>
              <input type="date" value="${customerBookingDraft.date || ''}" min="${todayStr}" onchange="window.selectDraftDate(this.value)" class="input-field" style="flex: 1; background: #111827; color: #fff; margin: 0;">
            </div>
          `)}
        </div>

        <!-- STEP 4: MÜSAİT SAATLER -->
        <div class="card animate-fade" style="padding: 12px; margin-bottom: 14px; opacity: ${isStep3Valid ? '1' : '0.5'}; border-color: ${isStep4Valid ? '#22c55e' : 'var(--border-color)'};">
          <h4 style="font-size: 13px; font-weight: 800; color: var(--gold-primary); margin-bottom: 8px;">
            4️⃣ Müsait Saatler ${isStep4Valid ? '✓' : ''}
          </h4>
          ${!isStep3Valid ? `
            <div style="font-size: 11px; color: var(--text-muted);">Önce hizmet, personel ve tarih seçiniz.</div>
          ` : (filteredSlots.length === 0 ? `
            <div style="font-size: 11px; color: var(--text-muted);">Bugün için kalan müsait saat bulunmamaktadır. Lütfen Yarın veya başka bir tarih seçiniz.</div>
          ` : `
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px;">
              ${filteredSlots.map(slot => `
                <button onclick="window.selectDraftTime('${slot}')" class="btn" style="padding: 6px; font-size: 11px; font-weight: 700; background: ${customerBookingDraft.time === slot ? '#eab308' : '#22c55e'}; color: ${customerBookingDraft.time === slot ? '#000' : '#fff'}; border: 1px solid ${customerBookingDraft.time === slot ? '#eab308' : '#22c55e'};">
                  ${slot} ${customerBookingDraft.time === slot ? '✓' : ''}
                </button>
              `).join('')}
            </div>
          `)}
        </div>

        <!-- STEP 5: ONALYA BUTTON -->
        <button id="btn-submit-booking" onclick="window.submitCustomerBookingAuthoritative()" class="btn btn-gold" style="width: 100%; min-height: 48px; font-weight: 900; font-size: 15px; opacity: ${isStep4Valid ? '1' : '0.5'};" ${!isStep4Valid ? 'disabled' : ''}>
          ⚡ Randevuyu Onayla
        </button>
      `;
    }
  }

 else if (activeCustomerTab === 'appointments') {
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
      <button onclick="window.switchCustomerTab('appointments')" class="nav-item ${activeCustomerTab === 'appointments' ? 'active' : ''}">
        <span class="icon">📅</span>
        <span>${t('myAppointments', currentLang)}</span>
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

    const res = await fetch(window.location.origin + '/api/booking/reschedule-approve', {
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
      const res = await fetch(window.location.origin + '/api/booking/update-status', {
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
  window.promptUserLogout = () => {
    showConfirmModal('Çıkış Yap', 'Çıkış yapmak istediğinize emin misiniz?', () => {
      window.completeExplicitLogout(onTabChange);
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

      window.switchCustomerTab = (tab, targetBizId = null, targetBizName = null) => {
    activeCustomerTab = tab;
    if (tab === 'booking') {
      resetBookingState(targetBizId, targetBizName);
    }
    renderCustomerScreen(user, onTabChange);
  };

  // SUBMIT CUSTOMER BOOKING WITH LOADING STATE & DOUBLE CLICK GUARD
      window.submitCustomerBooking = async () => {
    if (!bookingState.serviceId) {
      showErrorModal('Hizmet Seçimi Zorunlu', 'Lütfen bir hizmet seçiniz.');
      return;
    }
    if (!bookingState.staffId) {
      showErrorModal('Personel Seçimi Zorunlu', 'Lütfen bir berber/uzman seçiniz veya "Fark Etmez" seçeneğini işaretleyiniz.');
      return;
    }
    if (!bookingState.date) {
      showErrorModal('Tarih Seçimi Zorunlu', 'Lütfen randevu tarihi seçiniz.');
      return;
    }
    if (!bookingState.time) {
      showErrorModal('Saat Seçimi Zorunlu', 'Lütfen müsait bir randevu saati seçiniz.');
      return;
    }

    const btnSubmit = document.getElementById('btn-submit-booking');
    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.innerHTML = '⏳ Randevunuz Oluşturuluyor...';
    }

    try {
      const res = await fetch(window.location.origin + '/api/booking/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: bookingState.businessId,
          customerUid: user.uid,
          customerName: user.displayName || user.name || 'Müşteri',
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
        resetBookingState();
        showSuccessModal(t('successTitle'), '✅ Randevunuz başarıyla oluşturuldu!');
        activeCustomerTab = 'appointments';
        renderCustomerScreen(user, onTabChange);
      } else {
        showErrorModal(t('errorTitle'), (data && data.error) ? data.error : 'Randevu oluşturulamadı.');
        if (btnSubmit) {
          btnSubmit.disabled = false;
          btnSubmit.innerHTML = '⚡ ' + t('confirmBooking', currentLang);
        }
      }
    } catch (err) {
      showErrorModal(t('errorTitle'), 'Sunucu bağlantı hatası.');
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = '⚡ ' + t('confirmBooking', currentLang);
      }
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

          <button onclick="window.beginNewBookingFromSalonById('${businessId}')" class="btn btn-gold" style="width: 100%; min-height: 44px; font-size: 13px; font-weight: 800;">
            ✂️ Randevu Al →
          </button>
        </div>
      </div>
    `;
  };

    window.startSalonBookingFromDiscovery = (bizId, bizName) => {
    // 1. Cleanly close any active modal overlay (e.g. salon detail modal)
    window.closeModal();
    const modalRoot = document.getElementById('modal-root');
    if (modalRoot) modalRoot.innerHTML = '';
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';

    // 2. Reset booking state completely for new salon
    resetBookingState(bizId, bizName);

    // 3. Switch directly to booking screen with zero freeze
    activeCustomerTab = 'booking';
    renderCustomerScreen(user, onTabChange);
  };

  window.selectDraftService = (id, name, price, duration) => {
    customerBookingDraft.serviceId = id;
    customerBookingDraft.serviceName = name;
    customerBookingDraft.servicePrice = price;
    customerBookingDraft.serviceDuration = duration || 30;
    renderCustomerScreen(user, onTabChange);
  };

  window.selectDraftStaff = (id, name) => {
    customerBookingDraft.staffId = id;
    customerBookingDraft.staffName = name;
    renderCustomerScreen(user, onTabChange);
  };

  window.selectDraftDate = (dateStr) => {
    customerBookingDraft.date = dateStr;
    renderCustomerScreen(user, onTabChange);
  };

  window.selectDraftTime = (timeStr) => {
    customerBookingDraft.time = timeStr;
    renderCustomerScreen(user, onTabChange);
  };

        window.submitCustomerBookingAuthoritative = async () => {
    if (!customerBookingDraft.serviceId) {
      showErrorModal('Hizmet Seçimi Zorunlu', 'Önce bir hizmet seçmelisiniz.');
      return;
    }
    if (!customerBookingDraft.staffId) {
      showErrorModal('Personel Seçimi Zorunlu', 'Berber / uzman seçmelisiniz.');
      return;
    }
    if (!customerBookingDraft.date) {
      showErrorModal('Tarih Seçimi Zorunlu', 'Tarih seçmelisiniz.');
      return;
    }
    if (!customerBookingDraft.time) {
      showErrorModal('Saat Seçimi Zorunlu', 'Saat seçmelisiniz.');
      return;
    }

    const btn = document.getElementById('btn-submit-booking');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '⏳ Randevunuz Oluşturuluyor...';
    }

    const flowId = customerBookingDraft.flowId || ('flw_' + Date.now());
    console.log('BOOKING_SUBMIT_START', flowId);

    const apiUrl = `${window.location.origin}/api/booking/create`;

    const payload = {
      businessId: customerBookingDraft.businessId,
      businessName: customerBookingDraft.businessName,
      customerUid: user.uid,
      customerName: user.displayName || user.name || 'Müşteri',
      customerPhone: user.phone,
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

    console.log('BOOKING_REQUEST_SENT', apiUrl, payload);

    try {
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      console.log('BOOKING_RESPONSE_RECEIVED', res.status, res.headers.get('content-type'));

      let rawText = '';
      let data = null;
      try {
        rawText = await res.text();
        data = rawText ? JSON.parse(rawText) : null;
        console.log('BOOKING_RESPONSE_PARSED', data);
      } catch (parseErr) {
        console.error('BOOKING_SUBMIT_ERROR', 'JSON_PARSE', parseErr, rawText);
        showErrorModal('Yanıt Format Hatası', `Sunucudan geçersiz yanıt alındı (${res.status}): ${rawText.substring(0, 100)}`);
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = '⚡ Randevuyu Onayla';
        }
        return;
      }

      const createdId = data ? (data.appointmentId || data.aptId) : null;

      if (res.ok && data && data.success && createdId) {
        console.log('BOOKING_SUBMIT_SUCCESS', createdId);

        // Clear booking draft completely
        customerBookingDraft = { flowId: null, businessId: null, businessName: null, serviceId: null, staffId: null, date: null, time: null };
        
        // Invalidate DB cache immediately so Randevularım sees new appointment
        if (typeof window.invalidateDbCache === 'function') {
          window.invalidateDbCache('appointments');
        }

        showSuccessModal(t('successTitle'), '✅ Randevunuz başarıyla oluşturuldu!');
        activeCustomerTab = 'appointments';
        renderCustomerScreen(user, onTabChange);
      } else {
        const errorMessage = (data && (data.error || data.message)) 
          ? (data.error || data.message) 
          : `Sunucu hatası (${res.status} ${res.statusText})`;
        console.warn('BOOKING_SUBMIT_ERROR', 'HTTP_ERROR', res.status, errorMessage);
        showErrorModal('Randevu Oluşturulamadı', errorMessage);
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = '⚡ Randevuyu Onayla';
        }
      }
    } catch (fetchErr) {
      console.error('BOOKING_SUBMIT_ERROR', 'NETWORK_FETCH', fetchErr.name, fetchErr.message);
      showErrorModal('Ağ / Bağlantı Hatası', `Sunucuya erişilemedi (${fetchErr.name}: ${fetchErr.message}). Lütfen bağlantınızı kontrol edip tekrar deneyiniz.`);
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '⚡ Randevuyu Onayla';
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
      if (typeof window._currentRenderCustomerScreen === 'function') {
        window._currentRenderCustomerScreen();
      }
    }
  };

  window.selectDraftStaffById = (staffId) => {
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
    if (typeof window._currentRenderCustomerScreen === 'function') {
      window._currentRenderCustomerScreen();
    }
  };


  window.selectDraftServiceById = (serviceId) => {
    const s = cachedCurrentServices.find(item => item && item.id === serviceId);
    if (s) {
      customerBookingDraft.serviceId = s.id;
      customerBookingDraft.serviceName = s.name;
      customerBookingDraft.servicePrice = s.price;
      customerBookingDraft.serviceDuration = s.duration || 30;
      isServicePickerExpanded = false;
      isStaffPickerExpanded = !customerBookingDraft.staffId;
      if (typeof window._currentRenderCustomerScreen === 'function') {
        window._currentRenderCustomerScreen();
      }
    }
  };

  window.selectDraftStaffById = (staffId) => {
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
    isDatePickerExpanded = !customerBookingDraft.date;
    if (typeof window._currentRenderCustomerScreen === 'function') {
      window._currentRenderCustomerScreen();
    }
  };

  window.selectDraftDate = (dateStr) => {
    if (!dateStr) return;
    customerBookingDraft.date = dateStr;
    customerBookingDraft.time = null; // Reset time slot when date changes
    isDatePickerExpanded = false;
    if (typeof window._currentRenderCustomerScreen === 'function') {
      window._currentRenderCustomerScreen();
    }
  };

  window.selectDraftTime = (timeStr) => {
    if (!timeStr) return;
    customerBookingDraft.time = timeStr;
    if (typeof window._currentRenderCustomerScreen === 'function') {
      window._currentRenderCustomerScreen();
    }
  };

  window.toggleServicePicker = (expand) => {
    isServicePickerExpanded = expand;
    if (typeof window._currentRenderCustomerScreen === 'function') {
      window._currentRenderCustomerScreen();
    }
  };

  window.toggleStaffPicker = (expand) => {
    isStaffPickerExpanded = expand;
    if (typeof window._currentRenderCustomerScreen === 'function') {
      window._currentRenderCustomerScreen();
    }
  };

  window.toggleDatePicker = (expand) => {
    isDatePickerExpanded = expand;
    if (typeof window._currentRenderCustomerScreen === 'function') {
      window._currentRenderCustomerScreen();
    }
  };
