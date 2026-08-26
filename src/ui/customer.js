/* EZO STİLE v2 - Customer Final Panel (5 Tabs, 4 Action Buttons, 5-Step Booking, Duration Overlap Engine, Slot Colors, WhatsApp/SMS Modal, 5 Languages, RTL) */
import { getAppointmentsForCustomer, fetchRecord, saveRecord, getServices, getStaffList } from '../db.js';
import { updateUserLanguage } from '../auth.js';
import { SUPPORTED_LANGUAGES, isRtl, t } from '../config.js';
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

let userFavoritesMap = null;
let searchQuery = '';
let nearbyGeoLocation = null;

export async function renderCustomerScreen(user, onTabChange) {
  const container = document.getElementById('app-container');
  if (!container) return;

  const currentLang = user.language || 'tr';
  const rtl = isRtl(currentLang);
  document.documentElement.dir = rtl ? 'rtl' : 'ltr';

  if (!userFavoritesMap) {
    userFavoritesMap = await fetchRecord(`users/${user.uid}/favorites`) || {};
  }

  let mainHtml = '';

  if (activeCustomerTab === 'home') {
    mainHtml = `
      <div class="card card-gold animate-fade" style="padding: 20px; margin-bottom: 16px;">
        <h3 style="font-size: 18px; font-weight: 800; color: #fff; margin-bottom: 4px;">
          👋 ${t('welcomeTitle', currentLang)}, ${user.name || 'Müşterimiz'}
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
    let salons = Object.values(allBusinessesData).filter(b => b && b.status !== 'suspended');

    salons = salons.map(b => {
      let dist = null;
      if (nearbyGeoLocation && b.lat && b.lng) {
        const rad = Math.PI / 180;
        const dLat = (b.lat - nearbyGeoLocation.lat) * rad;
        const dLng = (b.lng - nearbyGeoLocation.lng) * rad;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(nearbyGeoLocation.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        dist = Math.round(6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
      }
      return { ...b, distanceKm: dist };
    });

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      salons = salons.filter(b => (b.name || '').toLowerCase().includes(q) || (b.district || '').toLowerCase().includes(q) || (b.city || '').toLowerCase().includes(q));
    }

    const salonCardsHtml = salons.map(b => `
      <div class="card card-gold animate-fade" style="padding: 16px; margin-bottom: 12px; cursor: pointer;" onclick="window.selectSalonForBooking('${b.businessId}')">
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
          ✂️ Randevu Al →
        </button>
      </div>
    `).join('');

    mainHtml = `
      <div class="card animate-fade">
        <h3 style="font-size: 16px; font-weight: 800; color: var(--gold-primary); margin-bottom: 12px;">💈 VIP Salon Keşfet</h3>
        <input type="text" placeholder="Salon adı veya semt ara..." value="${searchQuery}" oninput="window.setDiscoverySearch(this.value)" class="input-field">
        ${salons.length === 0 ? '<div style="font-size: 12px; color: var(--text-muted); text-align: center; padding: 20px;">Salon bulunamadı.</div>' : salonCardsHtml}
      </div>
    `;
  } else if (activeCustomerTab === 'booking') {
    const services = await getServices(bookingState.businessId);
    const staffList = await getStaffList(bookingState.businessId);
    const allAptsData = await fetchRecord('appointments') || {};
    const allApts = Object.values(allAptsData);

    // DURATION OVERLAP & OCCUPIED SLOTS CALCULATION
    const occupiedSlots = new Set();
    allApts.forEach(apt => {
      if (apt && apt.businessId === bookingState.businessId &&
          (apt.staffId === bookingState.staffId || bookingState.staffId === 'staff-any') &&
          apt.date === bookingState.date &&
          apt.status !== 'cancelled' && apt.status !== 'rejected') {
        
        const aptDuration = apt.serviceDuration || 30;
        const [h, m] = (apt.time || '00:00').split(':').map(Number);
        const startMins = h * 60 + m;
        const endMins = startMins + aptDuration;

        // Block all 30-min intervals falling within this appointment
        for (let t = 9 * 60; t <= 20 * 60 + 30; t += 30) {
          if (t >= startMins && t < endMins) {
            const slotHourStr = `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
            occupiedSlots.add(slotHourStr);
          }
        }
      }
    });

    const allHours = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30'];

    // FILTER PAST HOURS FOR TODAY
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const currentMins = now.getHours() * 60 + now.getMinutes();

    const visibleHours = allHours.filter(hStr => {
      if (bookingState.date !== todayStr) return true;
      const [h, m] = hStr.split(':').map(Number);
      return (h * 60 + m) > currentMins;
    });

    // SLOT COLOR SYSTEM: Green (Müsait), Red (Dolu 🔒), Yellow (Seçili ✓)
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
        <h3 style="font-size: 16px; font-weight: 800; color: var(--gold-primary); margin-bottom: 12px;">✂️ Randevu Al</h3>

        <!-- STEP 1: SERVICE SELECT (NO DEFAULT CHOICE) -->
        <label style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">1. Hizmet Seçin (Zorunlu)</label>
        <div style="display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; margin-top: 4px;">
          ${(services.length > 0 ? services : [
            { id: 'svc_1', name: 'Saç Kesimi & Sakal', price: 350, duration: 45 },
            { id: 'svc_2', name: 'VIP Saç & Cilt Bakımı', price: 500, duration: 60 }
          ]).map(s => `
            <div onclick="window.selectBookingService('${s.id}', '${s.name}', ${s.price}, ${s.duration || 30})" class="card" style="padding: 10px; margin: 0; cursor: pointer; border-color: ${bookingState.serviceId === s.id ? 'var(--gold-primary)' : 'var(--border-color)'}; background: ${bookingState.serviceId === s.id ? 'rgba(245,158,11,0.15)' : 'transparent'};">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 12px; font-weight: 700; color: #fff;">${s.name} (${s.duration || 30} dk)</span>
                <span style="font-size: 12px; color: var(--gold-primary); font-weight: 800;">${s.price} TL</span>
              </div>
            </div>
          `).join('')}
        </div>

        <!-- STEP 2: STAFF SELECT -->
        <label style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">2. Berber / Uzman Seçin</label>
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
        <label style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">3. Tarih ve Saat Seçin</label>
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

        <button onclick="window.submitCustomerBooking()" class="btn btn-gold" style="width: 100%; min-height: 44px;" ${(!bookingState.serviceId || !bookingState.time) ? 'disabled' : ''}>
          ⚡ ${t('confirmBooking', currentLang)}
        </button>
      </div>
    `;
  } else if (activeCustomerTab === 'appointments') {
    const userApts = await getAppointmentsForCustomer(user.uid);
    const activeApts = userApts.filter(apt => apt && (apt.status === 'pending' || apt.status === 'approved' || apt.status === 'reschedule_requested'));
    let pastApts = userApts.filter(apt => apt && (apt.status === 'completed' || apt.status === 'cancelled' || apt.status === 'rejected' || apt.status === 'no_show'));
    
    // CUSTOMER VIEW LIMIT: MAXIMUM LAST 5 PAST APPOINTMENTS
    pastApts = pastApts.slice(0, 5);

    const activeHtml = activeApts.map(apt => `
      <div class="card card-gold" style="padding: 14px; margin-bottom: 10px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <div style="font-size: 14px; font-weight: 800; color: #fff;">✂️ ${apt.serviceName}</div>
            <div style="font-size: 12px; color: var(--gold-primary); margin-top: 2px;">📅 ${apt.date} @ ${apt.time}</div>
          </div>
          <span class="badge ${apt.status === 'approved' ? 'badge-approved' : 'badge-pending'}">${apt.status.toUpperCase()}</span>
        </div>

        <div style="display: flex; gap: 8px; margin-top: 10px;">
          <button onclick="window.requestRescheduleAppointment('${apt.aptId}')" class="btn btn-secondary" style="flex: 1; font-size: 11px; padding: 6px;">
            🔄 Tarih/Saat Değiştir
          </button>
          <button onclick="window.cancelCustomerAppointment('${apt.aptId}')" class="btn btn-secondary" style="flex: 1; font-size: 11px; padding: 6px; border-color: #ef4444; color: #ef4444;">
            ❌ İptal Et
          </button>
        </div>
      </div>
    `).join('');

    const pastHtml = pastApts.map(apt => `
      <div class="card" style="padding: 12px; margin-bottom: 8px; opacity: 0.8;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-size: 13px; font-weight: 700; color: #fff;">✂️ ${apt.serviceName}</div>
            <div style="font-size: 11px; color: var(--text-muted);">📅 ${apt.date} @ ${apt.time}</div>
          </div>
          <span class="badge badge-secondary" style="font-size: 10px;">${apt.status.toUpperCase()}</span>
        </div>
      </div>
    `).join('');

    mainHtml = `
      <div class="card animate-fade">
        <h3 style="font-size: 16px; font-weight: 800; color: var(--gold-primary); margin-bottom: 12px;">📅 ${t('myAppointments', currentLang)}</h3>
        <h4 style="font-size: 13px; font-weight: 700; color: #fff; margin-bottom: 8px;">Aktif Randevular</h4>
        ${activeApts.length === 0 ? '<div style="font-size: 11px; color: var(--text-muted); margin-bottom: 14px;">Aktif randevunuz bulunmamaktadır.</div>' : activeHtml}

        <h4 style="font-size: 13px; font-weight: 700; color: #fff; margin-top: 16px; margin-bottom: 8px;">Geçmiş Randevular (Son 5)</h4>
        ${pastApts.length === 0 ? '<div style="font-size: 11px; color: var(--text-muted);">Geçmiş randevu kaydı yok.</div>' : pastHtml}
      </div>
    `;
  } else if (activeCustomerTab === 'ai') {
    renderAiConsultantScreen(user, onTabChange);
    return;
  } else if (activeCustomerTab === 'profile') {
    const langOptionsHtml = SUPPORTED_LANGUAGES.map(l => `
      <option value="${l.code}" ${l.code === currentLang ? 'selected' : ''}>
        ${l.flag} ${l.name}
      </option>
    `).join('');

    mainHtml = `
      <div class="card animate-fade">
        <h3 style="font-size: 16px; font-weight: 800; color: var(--gold-primary); margin-bottom: 12px;">👤 Profilim</h3>
        <p style="font-size: 12px; color: #fff;"><strong>Ad Soyad:</strong> ${user.name}</p>
        <p style="font-size: 12px; color: #fff; margin-bottom: 14px;"><strong>Telefon:</strong> ${user.phone}</p>

        <label style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">🌐 Dil Seçimi / Language</label>
        <select onchange="window.changeCustomerLanguage(this.value)" class="input-field" style="margin-top: 4px; margin-bottom: 16px;">
          ${langOptionsHtml}
        </select>

        <button onclick="window.logoutUserSession()" class="btn btn-secondary" style="width: 100%; min-height: 40px; border-color: #ef4444; color: #ef4444;">
          🚪 ${t('logout', currentLang)}
        </button>
      </div>
    `;
  }

  // TOP BAR HEADER
  container.innerHTML = `
    <div class="header-bar">
      <div style="display: flex; align-items: center; gap: 8px;">
        <img src="./assets/images/ezo_stile_logo.png" style="height: 24px; width: auto;" alt="EZO Logo">
        <span style="font-size: 12px; font-weight: 800; color: var(--gold-primary);">${user.name}</span>
      </div>
      <div style="font-size: 11px; color: var(--text-muted);">${user.phone}</div>
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

  // GLOBAL BINDINGS
  window.switchCustomerTab = (tab) => {
    activeCustomerTab = tab;
    renderCustomerScreen(user, onTabChange);
  };

  window.selectBookingService = (id, name, price, duration) => {
    bookingState.serviceId = id;
    bookingState.serviceName = name;
    bookingState.servicePrice = price;
    bookingState.serviceDuration = duration || 30;
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

  window.selectBookingTime = (t) => {
    bookingState.time = t;
    renderCustomerScreen(user, onTabChange);
  };

  window.changeCustomerLanguage = async (newLang) => {
    await updateUserLanguage(newLang);
    renderCustomerScreen(user, onTabChange);
  };

  window.logoutUserSession = () => {
    localStorage.removeItem('ez2_session');
    if (typeof onTabChange === 'function') onTabChange(null);
  };

  window.submitCustomerBooking = async () => {
    if (!bookingState.serviceId || !bookingState.time) {
      alert('Lütfen hizmet ve müsait saat seçiniz.');
      return;
    }

    try {
      const res = await fetch('/api/booking/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: bookingState.businessId,
          customerUid: user.uid,
          customerName: user.name,
          customerPhone: user.phone,
          staffId: bookingState.staffId,
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
          customerName: user.name,
          customerPhone: user.phone
        });
        activeCustomerTab = 'appointments';
        renderCustomerScreen(user, onTabChange);
        return;
      }

      if (res && res.status === 409) {
        alert('⚠️ Seçtiğiniz tarih ve saatte berber doludur. Lütfen başka bir saat seçiniz.');
        return;
      }

      if (resData && resData.error) {
        alert(`❌ Hata (${res ? res.status : 'API'}): ${resData.error}`);
        return;
      }
    } catch (e) {
      console.warn('Booking create error:', e);
    }
  };

  // WHATSAPP & SMS MODAL ENGINE
  window.openWhatsAppSmsModal = (actionType, details) => {
    const root = document.getElementById('modal-root');
    if (!root) return;

    const messageText = `EZO STİLE Bildirimi:\nİşlem: ${actionType.toUpperCase()}\nMüşteri: ${details.customerName} (${details.customerPhone})\nHizmet: ${details.serviceName}\nTarih: ${details.date} @ ${details.time}\nEZO STİLE üzerinden oluşturuldu.`;
    const encodedText = encodeURIComponent(messageText);

    root.innerHTML = `
      <div class="modal-overlay" onclick="window.closeModal()">
        <div class="modal-card" onclick="event.stopPropagation()">
          <h3 style="font-size: 16px; font-weight: 800; color: var(--gold-primary); margin-bottom: 10px;">
            💬 Salon Sahibine Bildir
          </h3>
          <p style="font-size: 11px; color: var(--text-muted); margin-bottom: 14px;">
            Randevunuz kaydedildi. İsterseniz salon sahibine doğrudan WhatsApp veya SMS ile bilgi mesajı gönderebilirsiniz.
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

  window.cancelCustomerAppointment = async (aptId) => {
    if (!confirm('Randevuyu iptal etmek istediğinize emin misiniz?')) return;
    await saveRecord(`appointments/${aptId}/status`, 'cancelled');
    alert('✅ Randevunuz iptal edildi.');
    renderCustomerScreen(user, onTabChange);
  };

  window.requestRescheduleAppointment = async (aptId) => {
    await saveRecord(`appointments/${aptId}/status`, 'reschedule_requested');
    alert('✅ Randevu için tarih/saat değişiklik talebiniz salon sahibine iletildi.');
    renderCustomerScreen(user, onTabChange);
  };
}