/* EZO STİLE v2 - Patron Dashboard, Staff Invite & Acquisition Analytics (Completed Status Filtered) */
import { getBusinessRecord, saveRecord, getServices, saveService, getStaffList, saveStaff, getAppointmentsForBusiness } from '../db.js';
import { getCurrentUser } from '../auth.js';

let activeOwnerTab = 'home';
let onboardingStep = 1;

export async function renderOwnerScreen() {
  const container = document.getElementById('app-container');
  if (!container) return;

  const user = getCurrentUser();
  if (!user || !user.businessId) {
    container.innerHTML = `
      <div class="card card-gold text-center" style="padding: 24px;">
        <div style="font-size: 36px; margin-bottom: 8px;">💈</div>
        <h3 style="font-size: 16px; color: var(--gold-primary);">Salon Sahibi Paneli</h3>
        <p style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">Hesabınıza bağlı aktif bir salon (businessId) bulunamadı.</p>
      </div>
    `;
    return;
  }

  const business = await getBusinessRecord(user.businessId);

  if (!business || !business.bookingEnabled) {
    renderOwnerOnboarding(container, user, business);
    return;
  }

  renderSalonDashboard(container, user, business);
}

async function renderOwnerOnboarding(container, user, business) {
  const bizName = business ? business.name : 'Salonunuz';

  container.innerHTML = `
    <div class="header-bar">
      <div class="brand-title">💈 ${bizName}</div>
      <span class="badge badge-pending">KURULUM AŞAMASI</span>
    </div>

    <div class="card card-gold animate-fade" style="padding: 20px;">
      <div style="font-size: 11px; color: var(--gold-primary); font-weight: 700; text-transform: uppercase;">Adım ${onboardingStep} / 5</div>
      <h3 style="font-size: 16px; font-weight: 800; color: #fff; margin-top: 2px;">
        ${onboardingStep === 1 ? '1. Salon Bilgileri' : ''}
        ${onboardingStep === 2 ? '2. Çalışma Günleri & Saatleri' : ''}
        ${onboardingStep === 3 ? '3. Hizmetler & Fiyatlar' : ''}
        ${onboardingStep === 4 ? '4. Personel Ekle' : ''}
        ${onboardingStep === 5 ? '5. Randevu Sistemini Yayınla' : ''}
      </h3>

      <div style="margin-top: 14px;">
        ${onboardingStep === 1 ? `
          <label style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">Salon Adı</label>
          <input type="text" id="ob-biz-name" class="input-field" value="${business.name || ''}">
          <label style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">Telefon</label>
          <input type="tel" id="ob-biz-phone" class="input-field" value="${business.phone || ''}">
          <button onclick="window.nextOnboardingStep(2)" class="btn btn-gold" style="width: 100%;">Devam Et →</button>
        ` : ''}

        ${onboardingStep === 2 ? `
          <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 12px;">Haftalık salon açılış ve kapanış saatlerinizi onaylayın.</p>
          <div class="card" style="padding: 12px; font-size: 12px;">Pazartesi - Cumartesi: 09:00 - 21:00 (Açık)</div>
          <button onclick="window.nextOnboardingStep(3)" class="btn btn-gold" style="width: 100%; margin-top: 8px;">Devam Et →</button>
        ` : ''}

        ${onboardingStep === 3 ? `
          <label style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">Örnek Hizmet Ekle</label>
          <input type="text" id="ob-svc-name" class="input-field" placeholder="Hizmet Adı" value="Saç Kesimi & Yıkama">
          <input type="number" id="ob-svc-price" class="input-field" placeholder="Fiyat (TL)" value="350">
          <button onclick="window.addInitialService()" class="btn btn-gold" style="width: 100%;">Hizmeti Kaydet & Devam Et →</button>
        ` : ''}

        ${onboardingStep === 4 ? `
          <label style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">İlk Personeli Ekle</label>
          <input type="text" id="ob-stf-name" class="input-field" placeholder="Personel Adı" value="Mustafa Usta (Baş Berber)">
          <button onclick="window.addInitialStaff()" class="btn btn-gold" style="width: 100%;">Personeli Kaydet & Devam Et →</button>
        ` : ''}

        ${onboardingStep === 5 ? `
          <div style="text-align: center; padding: 20px;">
            <div style="font-size: 40px; margin-bottom: 8px;">🎉</div>
            <h4 style="font-size: 16px; font-weight: 800; color: var(--gold-primary);">Tebrikler! Kurulum Tamamlandı</h4>
            <p style="font-size: 12px; color: var(--text-muted); margin-top: 4px; margin-bottom: 16px;">Randevu sisteminizi müşterilere açabilirsiniz.</p>
            <button onclick="window.enableSalonBooking()" class="btn btn-gold" style="width: 100%; min-height: 44px;">🚀 Randevu Sistemini Aktif Et</button>
          </div>
        ` : ''}
      </div>
    </div>
  `;

  window.nextOnboardingStep = (step) => {
    onboardingStep = step;
    renderOwnerOnboarding(container, user, business);
  };

  window.addInitialService = async () => {
    const name = document.getElementById('ob-svc-name').value;
    const price = parseInt(document.getElementById('ob-svc-price').value) || 300;
    await saveService(user.businessId, { name, price, durationMin: 30 });
    onboardingStep = 4;
    renderOwnerOnboarding(container, user, business);
  };

  window.addInitialStaff = async () => {
    const displayName = document.getElementById('ob-stf-name').value;
    await saveStaff(user.businessId, { displayName, role: 'barber' });
    onboardingStep = 5;
    renderOwnerOnboarding(container, user, business);
  };

  window.enableSalonBooking = async () => {
    await saveRecord(`businesses/${user.businessId}`, { bookingEnabled: true }, 'PATCH');
    alert('✅ Randevu sisteminiz başarıyla aktif edildi!');
    renderOwnerScreen();
  };
}

async function renderSalonDashboard(container, user, business) {
  const appointments = await getAppointmentsForBusiness(user.businessId);
  const pendingApts = appointments.filter(a => a.status === 'pending');
  const approvedApts = appointments.filter(a => a.status === 'approved');

  // PHASE 6 METRIC REFINEMENT: ONLY COMPLETED APPOINTMENTS COUNT FOR ACQUISITION REVENUE & NEW CUSTOMERS
  const ezoApts = appointments.filter(a => a && (a.source === 'ezo_discovery' || a.source === 'ezo_ai'));
  const completedEzoApts = ezoApts.filter(a => a.status === 'completed');
  const newCompletedCustomers = appointments.filter(a => a && a.isNewCustomerForBusiness && a.status === 'completed');
  const ezoCompletedRevenue = completedEzoApts.reduce((acc, a) => acc + (a.price || 350), 0);

  let mainContent = '';

  if (activeOwnerTab === 'home') {
    mainContent = `
      <!-- ACQUISITION METRIC CARD (PHASE 6 REFINED FOR COMPLETED ONLY) -->
      <div class="card card-gold animate-fade" style="padding: 16px; margin-bottom: 16px;">
        <div style="font-size: 11px; color: var(--gold-primary); font-weight: 700; text-transform: uppercase;">🚀 EZO STİLE Müşteri Kazanımı</div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 10px;">
          <div>
            <div style="font-size: 18px; font-weight: 900; color: var(--success);">${newCompletedCustomers.length}</div>
            <div style="font-size: 10px; color: var(--text-muted);">Tamamlanan Yeni Müşteri</div>
          </div>
          <div>
            <div style="font-size: 18px; font-weight: 900; color: var(--gold-primary);">${ezoApts.length}</div>
            <div style="font-size: 10px; color: var(--text-muted);">EZO Kaynaklı Randevu</div>
          </div>
          <div>
            <div style="font-size: 18px; font-weight: 900; color: #fff;">${completedEzoApts.length}</div>
            <div style="font-size: 10px; color: var(--text-muted);">Tamamlanan EZO Randevusu</div>
          </div>
          <div>
            <div style="font-size: 18px; font-weight: 900; color: var(--gold-primary);">${ezoCompletedRevenue} TL</div>
            <div style="font-size: 10px; color: var(--text-muted);">Tamamlanan EZO Ciro</div>
          </div>
        </div>
      </div>

      <!-- QUICK ACTIONS GRID -->
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 16px;">
        <button onclick="window.openStaffInviteModal()" class="btn btn-outline-gold" style="flex-direction: column; padding: 10px; font-size: 11px;">
          <span style="font-size: 20px;">👥</span> Personel Davet
        </button>
        <button onclick="window.openManualBookingModal()" class="btn btn-outline-gold" style="flex-direction: column; padding: 10px; font-size: 11px;">
          <span style="font-size: 20px;">✂️</span> Manuel Randevu
        </button>
        <button onclick="window.openStaffScheduleModal()" class="btn btn-outline-gold" style="flex-direction: column; padding: 10px; font-size: 11px;">
          <span style="font-size: 20px;">⏰</span> Çalışma Saatleri
        </button>
      </div>

      <!-- PENDING & APPROVED REQUESTS -->
      <div class="card animate-fade" style="padding: 18px;">
        <h3 style="font-size: 15px; font-weight: 800; color: var(--gold-primary); margin-bottom: 12px;">
          📅 Bekleyen & Aktif Randevular
        </h3>
        ${(pendingApts.length === 0 && approvedApts.length === 0) ? '<div style="font-size: 12px; color: var(--text-muted); text-align: center; padding: 16px;">Aktif randevu bulunmuyor.</div>' : 
          [...pendingApts, ...approvedApts].map(apt => `
            <div class="card card-gold" style="padding: 12px; margin-bottom: 8px;">
              <div style="display: flex; justify-content: space-between;">
                <div>
                  <div style="font-size: 13px; font-weight: 800; color: #fff;">👤 ${apt.customerName} (${apt.customerPhone || ''})</div>
                  <div style="font-size: 11px; color: var(--gold-primary);">✂️ ${apt.serviceName} • 📅 ${apt.date} @ ${apt.time}</div>
                  <div style="font-size: 10px; color: var(--text-muted);">Kaynak: ${apt.source || 'ezo_discovery'}</div>
                </div>
                <span class="badge ${apt.status === 'approved' ? 'badge-approved' : 'badge-pending'}">${apt.status.toUpperCase()}</span>
              </div>
              <div style="display: flex; gap: 4px; margin-top: 8px;">
                ${apt.status === 'pending' ? `
                  <button onclick="window.updateAptStatus('${apt.aptId}', 'approved')" class="btn btn-gold" style="flex: 1; min-height: 30px; font-size: 10px;">✅ Onayla</button>
                  <button onclick="window.updateAptStatus('${apt.aptId}', 'rejected')" class="btn btn-secondary" style="flex: 1; min-height: 30px; font-size: 10px;">❌ Reddet</button>
                ` : `
                  <button onclick="window.updateAptStatus('${apt.aptId}', 'completed')" class="btn btn-gold" style="flex: 1; min-height: 30px; font-size: 10px;">🎉 Tamamlandı</button>
                  <button onclick="window.updateAptStatus('${apt.aptId}', 'no_show')" class="btn btn-secondary" style="flex: 1; min-height: 30px; font-size: 10px; color: var(--danger);">🚫 Gelmedi</button>
                `}
                <a href="https://wa.me/90${(apt.customerPhone || '').replace(/\D/g, '')}?text=${encodeURIComponent(`Merhaba ${apt.customerName}, ${business.name} randevunuz onaylandı. 📅 ${apt.date} ⏰ ${apt.time} ✂️ ${apt.serviceName}`)}" target="_blank" class="btn btn-outline-gold" style="min-height: 30px; font-size: 10px; text-decoration: none; padding: 4px 8px;">
                  💬 WhatsApp
                </a>
              </div>
            </div>
          `).join('')
        }
      </div>
    `;
  } else if (activeOwnerTab === 'appointments') {
    mainContent = `
      <div class="card animate-fade" style="padding: 18px;">
        <h3 style="font-size: 15px; font-weight: 800; color: var(--gold-primary); margin-bottom: 12px;">📅 Tüm Salon Randevuları</h3>
        ${appointments.map(apt => `
          <div class="card" style="padding: 12px; margin-bottom: 8px;">
            <div style="display: flex; justify-content: space-between;">
              <div>
                <div style="font-size: 13px; font-weight: 800; color: #fff;">👤 ${apt.customerName} (${apt.customerPhone})</div>
                <div style="font-size: 11px; color: var(--gold-primary);">✂️ ${apt.serviceName} • 📅 ${apt.date} @ ${apt.time}</div>
                <div style="font-size: 10px; color: var(--text-muted);">Kaynak: ${apt.source || 'ezo_discovery'}</div>
              </div>
              <span class="badge ${apt.status === 'completed' ? 'badge-approved' : 'badge-pending'}">${apt.status}</span>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  container.innerHTML = `
    <!-- HEADER BAR -->
    <div class="header-bar">
      <div>
        <div class="brand-title">💈 ${business.name}</div>
        <div style="font-size: 10px; color: var(--gold-primary); font-weight: 700;">👑 Patron • ⭐ ${business.averageRating || '4.9'}</div>
      </div>
      <span class="badge badge-approved">AKTİF</span>
    </div>

    <!-- MAIN CONTENT -->
    ${mainContent}

    <!-- 5-TAB OWNER BOTTOM NAVIGATION BAR -->
    <nav class="bottom-nav">
      <button onclick="window.switchOwnerTab('home')" class="nav-item ${activeOwnerTab === 'home' ? 'active' : ''}">
        <span class="icon">🏠</span>
        <span>Ana Sayfa</span>
      </button>
      <button onclick="window.switchOwnerTab('calendar')" class="nav-item ${activeOwnerTab === 'calendar' ? 'active' : ''}">
        <span class="icon">📅</span>
        <span>Takvim</span>
      </button>
      <button onclick="window.switchOwnerTab('appointments')" class="nav-item ${activeOwnerTab === 'appointments' ? 'active' : ''}">
        <span class="icon">📋</span>
        <span>Randevular</span>
      </button>
      <button onclick="window.switchOwnerTab('management')" class="nav-item ${activeOwnerTab === 'management' ? 'active' : ''}">
        <span class="icon">⚙️</span>
        <span>Yönetim</span>
      </button>
      <button onclick="window.switchOwnerTab('profile')" class="nav-item ${activeOwnerTab === 'profile' ? 'active' : ''}">
        <span class="icon">👑</span>
        <span>Profil</span>
      </button>
    </nav>
  `;

  window.switchOwnerTab = (tabKey) => {
    activeOwnerTab = tabKey;
    renderSalonDashboard(container, user, business);
  };

  window.openStaffInviteModal = () => {
    const root = document.getElementById('modal-root');
    if (!root) return;

    root.innerHTML = `
      <div class="modal-overlay" onclick="window.closeModal()">
        <div class="modal-card" onclick="event.stopPropagation()">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
            <h3 style="font-size: 16px; font-weight: 800; color: var(--gold-primary);">👥 Personel Davet Et</h3>
            <button onclick="window.closeModal()" class="btn btn-secondary" style="padding: 4px 10px;">✕</button>
          </div>

          <p style="font-size: 11px; color: var(--text-muted); margin-bottom: 14px;">
            Çalışanınıza güvenli 24 saatlik tek kullanımlık davet linki gönderin.
          </p>

          <label style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">Ad Soyad *</label>
          <input type="text" id="inv-name" class="input-field" placeholder="Örn: Caner Usta" value="Caner Berber">

          <label style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">Telefon *</label>
          <input type="tel" id="inv-phone" class="input-field" placeholder="05XXXXXXXXX" value="05329990011">

          <label style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">Rol *</label>
          <select id="inv-role" class="input-field">
            <option value="barber">💈 Berber Uzmanı / Barber</option>
            <option value="manager">🧑‍💼 Yönetici / Manager</option>
            <option value="receptionist">🛎️ Resepsiyonist</option>
          </select>

          <button onclick="window.submitCreateStaffInvite()" class="btn btn-gold" style="width: 100%; min-height: 44px; margin-top: 8px;">
            ⚡ Davet Bağlantısı Oluştur
          </button>
        </div>
      </div>
    `;
  };

  window.submitCreateStaffInvite = async () => {
    const displayName = document.getElementById('inv-name').value;
    const phone = document.getElementById('inv-phone').value;
    const role = document.getElementById('inv-role').value;

    const res = await fetch('/api/staff/create-invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ownerUid: user.uid,
        displayName,
        phone,
        role,
        services: ['all'],
        permissions: role === 'manager' ? { 'appointments.manage': true, 'schedule.manage': true } : {}
      })
    });

    const data = await res.json();
    if (res.ok && data.success) {
      const root = document.getElementById('modal-root');
      root.innerHTML = `
        <div class="modal-overlay" onclick="window.closeModal()">
          <div class="modal-card" onclick="event.stopPropagation()">
            <h3 style="font-size: 16px; font-weight: 800; color: var(--success); margin-bottom: 8px;">✅ Davet Oluşturuldu!</h3>
            <p style="font-size: 11px; color: var(--text-muted); margin-bottom: 12px;">Davet bağlantısı 24 saat geçerlidir.</p>

            <input type="text" readonly class="input-field" value="${data.inviteUrl}">

            <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 10px;">
              <a href="https://wa.me/?text=${encodeURIComponent('EZO STİLE Personel Davetiniz: ' + data.inviteUrl)}" target="_blank" class="btn btn-gold" style="text-decoration: none; text-align: center;">
                💬 WhatsApp ile Gönder
              </a>
              <a href="sms:?body=${encodeURIComponent('EZO STİLE Personel Davetiniz: ' + data.inviteUrl)}" class="btn btn-secondary" style="text-decoration: none; text-align: center;">
                📱 SMS ile Gönder
              </a>
              <button onclick="navigator.clipboard.writeText('${data.inviteUrl}'); alert('Bağlantı kopyalandı!');" class="btn btn-outline-gold">
                📋 Bağlantıyı Kopyala
              </button>
            </div>
          </div>
        </div>
      `;
    } else {
      alert('⚠️ Davet oluşturulurken hata.');
    }
  };

  window.updateAptStatus = async (aptId, newStatus) => {
    const res = await fetch('/api/booking/update-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aptId, newStatus, userUid: user.uid })
    });

    if (res.ok) {
      alert(`✅ Randevu durumu '${newStatus}' olarak güncellendi!`);
      renderSalonDashboard(container, user, business);
    } else {
      alert('⚠️ Güncelleme hatası.');
    }
  };
}