/* EZO STİLE v2 - Customer Main View & Booking Engine */
import { getCurrentUser } from '../auth.js';
import { openSalonApplicationWizard } from './salon-application.js';
import { fetchRecord, getAppointmentsForCustomer, getServices, getStaffList } from '../db.js';

let activeCustomerTab = 'home';
let bookingState = {
  businessId: 'biz_merkez_salon',
  serviceId: null,
  serviceName: null,
  staffId: 'staff-any',
  staffName: 'Fark Etmez',
  date: new Date().toISOString().split('T')[0],
  time: null
};

export async function renderCustomerScreen(onTabChange) {
  const container = document.getElementById('app-container');
  if (!container) return;

  const user = getCurrentUser() || { uid: 'usr_demo', name: 'Müşteri', phone: '05550000000', role: 'customer' };

  let mainHtml = '';

  if (activeCustomerTab === 'home') {
    mainHtml = `
      <div class="card card-gold animate-fade" style="padding: 20px;">
        <div style="font-size: 12px; color: var(--gold-primary); font-weight: 700; text-transform: uppercase;">Hoş Geldiniz 👋</div>
        <h2 style="font-size: 18px; font-weight: 800; color: #fff; margin-top: 2px;">${user.name}</h2>
        <p style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">VIP berber salonlarından anında randevunuzu oluşturun.</p>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px;">
        <div class="card" onclick="window.switchCustomerTab('booking')" style="padding: 16px; text-align: center; cursor: pointer; border-color: var(--border-gold);">
          <div style="font-size: 32px; margin-bottom: 6px;">✂️</div>
          <div style="font-size: 14px; font-weight: 800; color: #fff;">Randevu Al</div>
          <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">Anında slot seçin</div>
        </div>

        <div class="card" onclick="window.switchCustomerTab('salons')" style="padding: 16px; text-align: center; cursor: pointer;">
          <div style="font-size: 32px; margin-bottom: 6px;">💈</div>
          <div style="font-size: 14px; font-weight: 800; color: #fff;">Yakındaki Salonlar</div>
          <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">En iyi berberleri keşfet</div>
        </div>

        <div class="card" onclick="window.switchCustomerTab('ai')" style="padding: 16px; text-align: center; cursor: pointer;">
          <div style="font-size: 32px; margin-bottom: 6px;">🤖</div>
          <div style="font-size: 14px; font-weight: 800; color: #fff;">Saç Modelimi Bul</div>
          <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">AI saç danışmanı</div>
        </div>

        <div class="card" onclick="window.switchCustomerTab('appointments')" style="padding: 16px; text-align: center; cursor: pointer;">
          <div style="font-size: 32px; margin-bottom: 6px;">📅</div>
          <div style="font-size: 14px; font-weight: 800; color: #fff;">Randevularım</div>
          <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">Geçmiş ve aktif talepler</div>
        </div>
      </div>
    `;
  } else if (activeCustomerTab === 'booking') {
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
        occupiedSlots.add(apt.time);
      }
    });

    const hours = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30'];

    const slotsHtml = hours.map(h => {
      const isOccupied = occupiedSlots.has(h);
      const isSelected = bookingState.time === h;
      return `
        <button onclick="${isOccupied ? '' : `window.selectBookingTime('${h}')`}" class="btn ${isSelected ? 'btn-gold' : (isOccupied ? 'btn-secondary' : 'btn-outline-gold')}" style="padding: 6px; font-size: 11px; ${isOccupied ? 'opacity: 0.4; cursor: not-allowed;' : ''}">
          ${h} ${isOccupied ? '🔴 Dolu' : ''}
        </button>
      `;
    }).join('');

    mainHtml = `
      <div class="card card-gold animate-fade" style="padding: 18px;">
        <h3 style="font-size: 16px; font-weight: 800; color: var(--gold-primary); margin-bottom: 12px;">✂️ Randevu Al</h3>

        <!-- STEP 1: HİZMET SEÇİMİ -->
        <label style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">1. Hizmet Seçin</label>
        <div style="display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; margin-top: 4px;">
          ${(services.length > 0 ? services : [{ id: 'svc_1', name: 'Saç Kesimi & Sakal', price: 350 }]).map(s => `
            <div onclick="window.selectBookingService('${s.id}', '${s.name}')" class="card" style="padding: 10px; margin: 0; cursor: pointer; border-color: ${bookingState.serviceId === s.id ? 'var(--gold-primary)' : 'var(--border-color)'};">
              <div style="display: flex; justify-content: space-between;">
                <span style="font-size: 12px; font-weight: 700; color: #fff;">${s.name}</span>
                <span style="font-size: 12px; color: var(--gold-primary); font-weight: 800;">${s.price} TL</span>
              </div>
            </div>
          `).join('')}
        </div>

        <!-- STEP 2: BERBER SEÇİMİ -->
        <label style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">2. Berber Uzmanı Seçin</label>
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

        <!-- STEP 3: TARİH VE MÜSAİT SAAT SEÇİMİ -->
        <label style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">3. Tarih ve Müsait Saat</label>
        <input type="date" value="${bookingState.date}" onchange="window.selectBookingDate(this.value)" class="input-field" style="margin-top: 4px; margin-bottom: 10px;">

        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-bottom: 16px;">
          ${slotsHtml}
        </div>

        <!-- SUBMIT BOOKING BUTTON -->
        <button onclick="window.submitCustomerBooking()" class="btn btn-gold" style="width: 100%; min-height: 44px;" ${!bookingState.serviceId || !bookingState.time ? 'disabled' : ''}>
          ⚡ Randevuyu Onayla ve Gönder
        </button>
      </div>
    `;
  } else if (activeCustomerTab === 'appointments') {
    const userApts = await getAppointmentsForCustomer(user.uid);

    let aptsListHtml = '';
    if (userApts.length === 0) {
      aptsListHtml = `<div style="font-size: 12px; color: var(--text-muted); text-align: center; padding: 20px;">Henüz aktif bir randevunuz bulunmamaktadır.</div>`;
    } else {
      aptsListHtml = userApts.map(apt => `
        <div class="card card-gold" style="padding: 14px; margin-bottom: 10px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <div style="font-size: 14px; font-weight: 800; color: #fff;">✂️ ${apt.serviceName}</div>
              <div style="font-size: 12px; color: var(--gold-primary); margin-top: 2px;">📅 ${apt.date} @ ${apt.time}</div>
              <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">💈 Berber: ${apt.staffId === 'staff-any' ? 'Fark Etmez' : 'Atanan Berber'}</div>
            </div>
            <span class="badge ${apt.status === 'approved' ? 'badge-approved' : (apt.status === 'pending' ? 'badge-pending' : 'badge-rejected')}">
              ${apt.status.toUpperCase()}
            </span>
          </div>

          ${apt.status !== 'cancelled' && apt.status !== 'rejected' ? `
            <div style="display: flex; gap: 8px; margin-top: 10px;">
              <button onclick="window.requestCustomerAptUpdate('${apt.aptId}', 'cancelled')" class="btn btn-secondary" style="flex: 1; min-height: 32px; font-size: 10px; color: var(--danger);">
                ❌ İptal Et
              </button>
              <button onclick="window.requestCustomerAptUpdate('${apt.aptId}', 'reschedule_requested')" class="btn btn-outline-gold" style="flex: 1; min-height: 32px; font-size: 10px;">
                🔄 Tarih Değiştir
              </button>
            </div>
          ` : ''}
        </div>
      `).join('');
    }

    mainHtml = `
      <div class="card animate-fade">
        <h3 style="font-size: 16px; font-weight: 800; color: var(--gold-primary); margin-bottom: 12px;">📅 Randevularım</h3>
        ${aptsListHtml}
      </div>
    `;
  } else if (activeCustomerTab === 'profile') {
    mainHtml = `
      <div class="card card-gold animate-fade" style="padding: 20px;">
        <div style="display: flex; align-items: center; gap: 14px; margin-bottom: 16px;">
          <div style="width: 52px; height: 52px; border-radius: 50%; background: var(--gold-gradient); display: flex; align-items: center; justify-content: center; font-size: 24px; color: #000; font-weight: 800;">
            ${(user.name || 'M')[0]}
          </div>
          <div>
            <h3 style="font-size: 16px; font-weight: 800; color: #fff;">${user.name}</h3>
            <p style="font-size: 11px; color: var(--text-muted);">${user.phone}</p>
            <span class="badge badge-pending" style="margin-top: 4px;">Rol: ${user.role}</span>
          </div>
        </div>

        <hr style="border: none; border-top: 1px solid var(--border-color); margin: 16px 0;">

        <div style="font-size: 13px; font-weight: 700; color: var(--gold-primary); margin-bottom: 10px;">🏢 İşletme İşlemleri</div>
        
        <button onclick="window.triggerSalonApplication()" class="btn btn-outline-gold" style="width: 100%; justify-content: space-between; min-height: 44px;">
          <span>💈 Salonumu EZO STİLE'a Ekle</span>
          <span>→</span>
        </button>
      </div>
    `;
  }

  container.innerHTML = `
    <!-- HEADER BAR -->
    <div class="header-bar">
      <div class="brand-title">💈 EZO STİLE v2</div>
      <div style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">${user.phone}</div>
    </div>

    <!-- MAIN CONTENT AREA -->
    ${mainHtml}

    <!-- 5-TAB BOTTOM NAVIGATION BAR -->
    <nav class="bottom-nav">
      <button onclick="window.switchCustomerTab('home')" class="nav-item ${activeCustomerTab === 'home' ? 'active' : ''}">
        <span class="icon">🏠</span>
        <span>Ana Sayfa</span>
      </button>
      <button onclick="window.switchCustomerTab('booking')" class="nav-item ${activeCustomerTab === 'booking' ? 'active' : ''}">
        <span class="icon">✂️</span>
        <span>Randevu Al</span>
      </button>
      <button onclick="window.switchCustomerTab('ai')" class="nav-item ${activeCustomerTab === 'ai' ? 'active' : ''}">
        <span class="icon">🤖</span>
        <span>AI Danışman</span>
      </button>
      <button onclick="window.switchCustomerTab('appointments')" class="nav-item ${activeCustomerTab === 'appointments' ? 'active' : ''}">
        <span class="icon">📅</span>
        <span>Randevularım</span>
      </button>
      <button onclick="window.switchCustomerTab('profile')" class="nav-item ${activeCustomerTab === 'profile' ? 'active' : ''}">
        <span class="icon">👤</span>
        <span>Profil</span>
      </button>
    </nav>
  `;

  window.switchCustomerTab = (tabKey) => {
    activeCustomerTab = tabKey;
    renderCustomerScreen(onTabChange);
  };

  window.selectBookingService = (svcId, svcName) => {
    bookingState.serviceId = svcId;
    bookingState.serviceName = svcName;
    renderCustomerScreen(onTabChange);
  };

  window.selectBookingStaff = (staffId, staffName) => {
    bookingState.staffId = staffId;
    bookingState.staffName = staffName;
    renderCustomerScreen(onTabChange);
  };

  window.selectBookingDate = (dateStr) => {
    bookingState.date = dateStr;
    bookingState.time = null;
    renderCustomerScreen(onTabChange);
  };

  window.selectBookingTime = (timeStr) => {
    bookingState.time = timeStr;
    renderCustomerScreen(onTabChange);
  };

  window.submitCustomerBooking = async () => {
    if (!bookingState.serviceId || !bookingState.time) {
      alert('Lütfen hizmet ve müsait saat seçiniz.');
      return;
    }

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
        date: bookingState.date,
        time: bookingState.time
      })
    });

    if (res.ok) {
      alert('✅ Randevu talebiniz alındı! Bekleyen randevularınızda takip edebilirsiniz.');
      activeCustomerTab = 'appointments';
      renderCustomerScreen(onTabChange);
    } else if (res.status === 409) {
      alert('⚠️ Seçtiğiniz tarih ve saatte berber doludur. Lütfen başka bir saat seçiniz.');
    } else {
      alert('⚠️ Randevu oluşturulurken bir hata oluştu.');
    }
  };

  window.requestCustomerAptUpdate = async (aptId, newStatus) => {
    const res = await fetch('/api/booking/update-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aptId, newStatus, userUid: user.uid })
    });

    if (res.ok) {
      alert(`✅ Randevu güncelleme talebiniz gönderildi: ${newStatus}`);
      renderCustomerScreen(onTabChange);
    } else {
      alert('⚠️ Güncelleme talebi iletilemedi.');
    }
  };

  window.triggerSalonApplication = () => {
    openSalonApplicationWizard();
  };
}