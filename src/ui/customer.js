/* EZO STİLE v2 - Customer Main View, Discovery & Geolocation Engine with Official Logo */
import { getCurrentUser } from '../auth.js';
import { openSalonApplicationWizard } from './salon-application.js';
import { fetchRecord, getAppointmentsForCustomer, getServices, getStaffList, saveRecord } from '../db.js';
import { renderAiConsultantScreen } from './ai-consultant.js';

let activeCustomerTab = 'home';
let userCoords = null;
let searchQuery = '';
let filterCity = '';

let bookingState = {
  businessId: 'biz_merkez_salon',
  serviceId: null,
  serviceName: null,
  staffId: 'staff-any',
  staffName: 'Fark Etmez',
  date: new Date().toISOString().split('T')[0],
  time: null
};

function calcDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return parseFloat((R * c).toFixed(1));
}

export async function renderCustomerScreen(onTabChange) {
  const container = document.getElementById('app-container');
  if (!container) return;

  const user = getCurrentUser() || { uid: 'usr_demo', name: 'Müşteri', phone: '05550000000', role: 'customer' };

  if (activeCustomerTab === 'ai') {
    container.innerHTML = `
      <div class="header-bar">
        <div style="display: flex; align-items: center; gap: 8px;">
          <img src="./assets/images/ezo_stile_logo.png" style="height: 24px; width: auto;" alt="EZO Logo">
        </div>
        <div style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">${user.phone}</div>
      </div>
      <div id="ai-tab-container"></div>
      <nav class="bottom-nav">
        <button onclick="window.switchCustomerTab('home')" class="nav-item ${activeCustomerTab === 'home' ? 'active' : ''}">
          <span class="icon">🏠</span>
          <span>Ana Sayfa</span>
        </button>
        <button onclick="window.switchCustomerTab('salons')" class="nav-item ${activeCustomerTab === 'salons' ? 'active' : ''}">
          <span class="icon">💈</span>
          <span>Salonlar</span>
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
      </nav>
    `;
    renderAiConsultantScreen(document.getElementById('ai-tab-container'));

    window.switchCustomerTab = (tabKey) => {
      activeCustomerTab = tabKey;
      renderCustomerScreen(onTabChange);
    };
    return;
  }

  let mainHtml = '';

  if (activeCustomerTab === 'home') {
    mainHtml = `
      <div class="card card-gold animate-fade" style="padding: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <div>
            <div style="font-size: 12px; color: var(--gold-primary); font-weight: 700; text-transform: uppercase;">Hoş Geldiniz 👋</div>
            <h2 style="font-size: 18px; font-weight: 800; color: #fff; margin-top: 2px;">${user.name}</h2>
          </div>
          <img src="./assets/images/ezo_stile_logo.png" style="height: 38px; width: auto;" alt="Logo">
        </div>
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
  } else if (activeCustomerTab === 'salons') {
    const rawBiz = await fetchRecord('businesses') || {};
    const favs = await fetchRecord(`users/${user.uid}/favorites`) || {};

    let salons = Object.values(rawBiz).filter(b => 
      b &&
      b.status !== 'suspended' &&
      b.bookingEnabled !== false &&
      b.hiddenFromDiscovery !== true
    );

    if (searchQuery) {
      salons = salons.filter(b => b.name.toLowerCase().includes(searchQuery.toLowerCase()) || (b.district && b.district.toLowerCase().includes(searchQuery.toLowerCase())));
    }
    if (filterCity) {
      salons = salons.filter(b => b.city && b.city.toLowerCase() === filterCity.toLowerCase());
    }

    salons.forEach(b => {
      if (userCoords && b.latitude && b.longitude) {
        b.distanceKm = calcDistance(userCoords.latitude, userCoords.longitude, b.latitude, b.longitude);
      } else {
        b.distanceKm = null;
      }
    });

    salons.sort((a, b) => {
      if (a.distanceKm !== null && b.distanceKm !== null) return a.distanceKm - b.distanceKm;
      return (b.averageRating || 5) - (a.averageRating || 5);
    });

    const salonCardsHtml = salons.map(b => {
      const isFav = Boolean(favs[b.businessId]);
      return `
        <div class="card card-gold animate-fade" style="padding: 16px; margin-bottom: 12px; cursor: pointer;" onclick="window.openSalonProfileModal('${b.businessId}')">
          <div style="position: relative; height: 130px; border-radius: 12px; overflow: hidden; margin-bottom: 10px;">
            <img src="${b.photoUrl || 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=500'}" style="width: 100%; height: 100%; object-fit: cover;" alt="Salon">
            <button onclick="event.stopPropagation(); window.toggleFavoriteSalon('${b.businessId}')" style="position: absolute; top: 8px; right: 8px; background: rgba(0,0,0,0.6); border: none; border-radius: 50%; width: 34px; height: 34px; font-size: 18px; cursor: pointer; color: #fff;">
              ${isFav ? '❤️' : '🤍'}
            </button>
            <span class="badge badge-approved" style="position: absolute; bottom: 8px; left: 8px;">
              ✨ Bugün Müsait
            </span>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <h4 style="font-size: 15px; font-weight: 800; color: #fff;">💈 ${b.name}</h4>
              <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">
                📍 ${b.district || 'Şişli'} / ${b.city || 'İstanbul'} ${b.distanceKm !== null ? `• ${b.distanceKm} km` : ''}
              </div>
            </div>
            <span class="badge badge-approved" style="font-size: 11px;">⭐ ${b.averageRating || '4.9'} (${b.ratingCount || 12})</span>
          </div>
        </div>
      `;
    }).join('');

    mainHtml = `
      <div class="card animate-fade">
        <h3 style="font-size: 16px; font-weight: 800; color: var(--gold-primary); margin-bottom: 12px;">💈 VIP Salon Keşfet</h3>

        <div style="display: flex; gap: 8px; margin-bottom: 12px;">
          <input type="text" placeholder="Salon adı veya semt ara..." value="${searchQuery}" oninput="window.setDiscoverySearch(this.value)" class="input-field" style="margin-bottom: 0;">
          <button onclick="window.requestGeolocation()" class="btn btn-outline-gold" style="white-space: nowrap; font-size: 11px;">📍 Yakındakiler</button>
        </div>

        ${salons.length === 0 ? '<div style="font-size: 12px; color: var(--text-muted); text-align: center; padding: 20px;">Kriterlere uygun salon bulunamadı.</div>' : salonCardsHtml}
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

        <label style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">3. Tarih ve Müsait Saat</label>
        <input type="date" value="${bookingState.date}" onchange="window.selectBookingDate(this.value)" class="input-field" style="margin-top: 4px; margin-bottom: 10px;">

        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-bottom: 16px;">
          ${slotsHtml}
        </div>

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
              <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">Kaynak: ${apt.source || 'ezo_discovery'} ${apt.isNewCustomerForBusiness ? '• ✨ Yeni Müşteri' : ''}</div>
            </div>
            <span class="badge ${apt.status === 'completed' ? 'badge-approved' : 'badge-pending'}">${apt.status.toUpperCase()}</span>
          </div>

          ${apt.status === 'completed' ? `
            <button onclick="window.openReviewModal('${apt.aptId}')" class="btn btn-outline-gold" style="width: 100%; margin-top: 8px; min-height: 32px; font-size: 11px;">
              ⭐ Yorum Yap & Puan Ver
            </button>
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
  }

  container.innerHTML = `
    <div class="header-bar">
      <div style="display: flex; align-items: center; gap: 8px;">
        <img src="./assets/images/ezo_stile_logo.png" style="height: 24px; width: auto;" alt="EZO Logo">
      </div>
      <div style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">${user.phone}</div>
    </div>

    ${mainHtml}

    <nav class="bottom-nav">
      <button onclick="window.switchCustomerTab('home')" class="nav-item ${activeCustomerTab === 'home' ? 'active' : ''}">
        <span class="icon">🏠</span>
        <span>Ana Sayfa</span>
      </button>
      <button onclick="window.switchCustomerTab('salons')" class="nav-item ${activeCustomerTab === 'salons' ? 'active' : ''}">
        <span class="icon">💈</span>
        <span>Salonlar</span>
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
    </nav>
  `;

  window.switchCustomerTab = (tabKey) => {
    activeCustomerTab = tabKey;
    renderCustomerScreen(onTabChange);
  };

  window.setDiscoverySearch = (q) => {
    searchQuery = q;
    renderCustomerScreen(onTabChange);
  };

  window.requestGeolocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          userCoords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
          alert('📍 Konumunuz alındı! Yakındaki salonlar mesafeye göre sıralandı.');
          renderCustomerScreen(onTabChange);
        },
        () => alert('⚠️ Konum izni alınamadı. Şehir araması kullanabilirsiniz.')
      );
    }
  };

  window.toggleFavoriteSalon = async (bizId) => {
    const favs = await fetchRecord(`users/${user.uid}/favorites`) || {};
    const isFav = Boolean(favs[bizId]);
    if (isFav) {
      delete favs[bizId];
    } else {
      favs[bizId] = true;
    }
    await saveRecord(`users/${user.uid}/favorites`, favs);
    renderCustomerScreen(onTabChange);
  };

  window.openReviewModal = (aptId) => {
    const root = document.getElementById('modal-root');
    if (!root) return;

    root.innerHTML = `
      <div class="modal-overlay" onclick="window.closeModal()">
        <div class="modal-card" onclick="event.stopPropagation()">
          <h3 style="font-size: 16px; font-weight: 800; color: var(--gold-primary); margin-bottom: 10px;">⭐ Değerlendirme Yap</h3>
          <p style="font-size: 11px; color: var(--text-muted); margin-bottom: 12px;">Aldığınız hizmeti 1-5 yıldız arasında puanlayıp yorum yapabilirsiniz.</p>

          <select id="rev-rating" class="input-field">
            <option value="5">⭐⭐⭐⭐⭐ (5/5 Mükemmel)</option>
            <option value="4">⭐⭐⭐⭐ (4/5 Çok İyi)</option>
            <option value="3">⭐⭐⭐ (3/5 Orta)</option>
            <option value="2">⭐⭐ (2/5 Zayıf)</option>
            <option value="1">⭐ (1/5 Kötü)</option>
          </select>

          <textarea id="rev-comment" class="input-field" rows="3" placeholder="Yorumunuz..."></textarea>

          <button onclick="window.submitReviewForm('${aptId}')" class="btn btn-gold" style="width: 100%; min-height: 40px;">
            🚀 Yorumu Gönder
          </button>
        </div>
      </div>
    `;
  };

  window.submitReviewForm = async (aptId) => {
    const rating = document.getElementById('rev-rating').value;
    const comment = document.getElementById('rev-comment').value;

    const res = await fetch('/api/reviews/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appointmentId: aptId, customerUid: user.uid, rating, comment })
    });

    const data = await res.json();
    if (res.ok && data.success) {
      alert('✅ Değerlendirmeniz başarıyla kaydedildi!');
      window.closeModal();
      renderCustomerScreen(onTabChange);
    } else {
      alert('⚠️ Yorum kaydedilemedi: ' + (data.error || 'Hata'));
    }
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
        time: bookingState.time,
        source: activeCustomerTab === 'ai' ? 'ezo_ai' : 'ezo_discovery'
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

  window.triggerSalonApplication = () => {
    openSalonApplicationWizard();
  };
}