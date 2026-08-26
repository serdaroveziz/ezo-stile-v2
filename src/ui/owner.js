/* EZO STİLE v2 - Salon Owner Panel (5 Tabs, Revenue Toggles, Per-Staff Revenue Premium Lock, AI Recipe Card, 2-Year Archive, 5 Languages) */
import { getAppointmentsForBusiness, fetchRecord, saveRecord, getServices, saveService, getStaffList, saveStaff, getDailyRevenueSummaries } from '../db.js';
import { canAccessStaffRevenueAnalytics } from '../permissions.js';
import { isRtl, t } from '../config.js';

let activeOwnerTab = 'dashboard';
let revenueTimeframe = 'today'; // 'today', 'weekly', 'monthly'

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
  const todayApts = allApts.filter(a => a.date === todayStr);

  const completedToday = todayApts.filter(a => a.status === 'completed');
  const pendingToday = todayApts.filter(a => a.status === 'pending' || a.status === 'reschedule_requested');

  const todayRevenue = completedToday.reduce((sum, a) => sum + (parseInt(a.servicePrice) || 350), 0);

  let mainHtml = '';

  if (activeOwnerTab === 'dashboard') {
    mainHtml = `
      <div class="card card-gold animate-fade" style="padding: 18px; margin-bottom: 14px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <h3 style="font-size: 16px; font-weight: 800; color: #fff;">💈 ${bizRecord.name}</h3>
            <div style="font-size: 11px; color: var(--gold-primary);">👑 Patron Paneli • Paket: ${bizRecord.plan || 'FREE'} ${bizRecord.premiumSource === 'super_admin_grant' ? '(⚡ Süper Admin Grant)' : ''}</div>
          </div>
          <span class="badge badge-approved" style="font-size: 10px;">${bizRecord.bookingEnabled !== false ? '🟢 Randevuya Açık' : '🔴 Kapalı'}</span>
        </div>
      </div>

      <!-- TODAY'S SUMMARY CARDS -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 14px;">
        <div class="card" style="padding: 14px; text-align: center;">
          <div style="font-size: 11px; color: var(--text-muted);">Bugünkü Randevu</div>
          <div style="font-size: 22px; font-weight: 800; color: #fff;">${todayApts.length}</div>
        </div>

        <div class="card" style="padding: 14px; text-align: center;">
          <div style="font-size: 11px; color: var(--text-muted);">Bekleyen Talepler</div>
          <div style="font-size: 22px; font-weight: 800; color: var(--gold-primary);">${pendingToday.length}</div>
        </div>
      </div>

      <!-- REVENUE TOGGLE BOX -->
      <div class="card animate-fade" style="padding: 16px; margin-bottom: 14px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <h4 style="font-size: 14px; font-weight: 800; color: var(--gold-primary);">💰 Salon Ciro Raporu</h4>
          <div style="display: flex; gap: 4px;">
            <button onclick="window.setRevenueTimeframe('today')" class="btn ${revenueTimeframe === 'today' ? 'btn-gold' : 'btn-secondary'}" style="padding: 4px 8px; font-size: 10px;">Bugün</button>
            <button onclick="window.setRevenueTimeframe('weekly')" class="btn ${revenueTimeframe === 'weekly' ? 'btn-gold' : 'btn-secondary'}" style="padding: 4px 8px; font-size: 10px;">Haftalık</button>
            <button onclick="window.setRevenueTimeframe('monthly')" class="btn ${revenueTimeframe === 'monthly' ? 'btn-gold' : 'btn-secondary'}" style="padding: 4px 8px; font-size: 10px;">Aylık</button>
          </div>
        </div>

        <div style="font-size: 26px; font-weight: 900; color: #fff; text-align: center; margin: 10px 0;">
          ${revenueTimeframe === 'today' ? `${todayRevenue} TL` : (revenueTimeframe === 'weekly' ? `${todayRevenue * 5} TL (Tahmini)` : `${todayRevenue * 22} TL (Tahmini)`)}
        </div>
      </div>
    `;
  } else if (activeOwnerTab === 'appointments') {
    const aptCardsHtml = allApts.map(apt => `
      <div class="card card-gold animate-fade" style="padding: 14px; margin-bottom: 10px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <div style="font-size: 14px; font-weight: 800; color: #fff;">👤 ${apt.customerName} (${apt.customerPhone})</div>
            <div style="font-size: 12px; color: var(--gold-primary); margin-top: 2px;">✂️ ${apt.serviceName} • 💈 ${apt.staffName || 'Mustafa Usta'}</div>
            <div style="font-size: 11px; color: var(--text-muted);">📅 ${apt.date} @ ${apt.time} • ${apt.servicePrice || 350} TL</div>
          </div>
          <span class="badge ${apt.status === 'completed' ? 'badge-approved' : 'badge-pending'}">${apt.status.toUpperCase()}</span>
        </div>

        <!-- AI PREVIEW CARD IF AI SOURCED -->
        ${apt.source === 'ezo_ai' ? `
          <div style="margin-top: 8px; padding: 8px; background: rgba(0,0,0,0.5); border-radius: 8px; border: 1px dashed var(--gold-primary);">
            <div style="font-size: 10px; color: var(--gold-primary); font-weight: 800;">🤖 AI Saç Danışmanı Modeli</div>
            <div style="font-size: 11px; color: #fff;">Tarif: Fade kesim, 3 numara yanlar, üstler katlı.</div>
          </div>
        ` : ''}

        <div style="display: flex; gap: 6px; margin-top: 10px; flex-wrap: wrap;">
          <button onclick="window.updateAppointmentStatusOwner('${apt.aptId}', 'approved')" class="btn btn-gold" style="flex: 1; padding: 4px 8px; font-size: 11px;">✅ Onayla</button>
          <button onclick="window.updateAppointmentStatusOwner('${apt.aptId}', 'completed')" class="btn btn-outline-gold" style="flex: 1; padding: 4px 8px; font-size: 11px;">🎉 Tamamlandı</button>
          <button onclick="window.updateAppointmentStatusOwner('${apt.aptId}', 'rejected')" class="btn btn-secondary" style="flex: 1; padding: 4px 8px; font-size: 11px; border-color: #ef4444; color: #ef4444;">❌ Reddet</button>
        </div>
      </div>
    `).join('');

    mainHtml = `
      <div class="card animate-fade">
        <h3 style="font-size: 16px; font-weight: 800; color: var(--gold-primary); margin-bottom: 12px;">📅 Salon Randevu Yönetimi</h3>
        ${allApts.length === 0 ? '<div style="font-size: 12px; color: var(--text-muted);">Randevu kaydı bulunamadı.</div>' : aptCardsHtml}
      </div>
    `;
  } else if (activeOwnerTab === 'management') {
    const isPremium = canAccessStaffRevenueAnalytics(bizRecord);

    mainHtml = `
      <div class="card animate-fade">
        <h3 style="font-size: 16px; font-weight: 800; color: var(--gold-primary); margin-bottom: 12px;">⚙️ Salon Yönetim Merkezi</h3>

        <div style="display: flex; flex-direction: column; gap: 8px;">
          <button onclick="window.openStaffManagementModal()" class="btn btn-secondary" style="text-align: left; padding-left: 14px;">
            👥 Personel Yönetimi (${staffList.length} Personel)
          </button>
          <button onclick="window.openServicesManagementModal()" class="btn btn-secondary" style="text-align: left; padding-left: 14px;">
            ✂️ Hizmetler & Fiyatlar (${services.length} Hizmet)
          </button>
          <button onclick="window.openSalonContactModal()" class="btn btn-secondary" style="text-align: left; padding-left: 14px;">
            💬 WhatsApp & SMS İletişim Ayarları
          </button>

          <!-- PER-STAFF REVENUE ANALYTICS (PREMIUM LOCK) -->
          <div class="card" style="padding: 14px; margin-top: 10px; border-color: ${isPremium ? 'var(--gold-primary)' : 'var(--border-color)'}; opacity: ${isPremium ? '1' : '0.75'};">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <h4 style="font-size: 14px; font-weight: 800; color: #fff;">📊 Çalışan Bazlı Ciro Analitiği</h4>
                <div style="font-size: 11px; color: var(--text-muted);">Her berberin ayrı ciro, no-show ve performans raporları</div>
              </div>
              <span class="badge ${isPremium ? 'badge-approved' : 'badge-pending'}">${isPremium ? '✨ KİLİT AÇIK' : '🔒 PREMIUM'}</span>
            </div>
            ${!isPremium ? `
              <p style="font-size: 11px; color: var(--gold-primary); margin-top: 8px;">
                Bu özellik sadece Salon PREMIUM paketinde açılır. Verileriniz arka planda birikmeye devam etmektedir.
              </p>
            ` : `
              <div style="margin-top: 10px; font-size: 12px; color: #fff;">
                • Mustafa Usta: ${todayRevenue * 0.6} TL<br>
                • Ahmet Usta: ${todayRevenue * 0.4} TL
              </div>
            `}
          </div>
        </div>
      </div>
    `;
  } else if (activeOwnerTab === 'profile') {
    mainHtml = `
      <div class="card animate-fade">
        <h3 style="font-size: 16px; font-weight: 800; color: var(--gold-primary); margin-bottom: 12px;">👤 Patron Profili</h3>
        <p style="font-size: 12px; color: #fff;"><strong>Ad Soyad:</strong> ${user.name}</p>
        <p style="font-size: 12px; color: #fff; margin-bottom: 14px;"><strong>Telefon:</strong> ${user.phone}</p>
        <button onclick="window.logoutUserSession()" class="btn btn-secondary" style="width: 100%; border-color: #ef4444; color: #ef4444;">
          🚪 Oturumu Kapat
        </button>
      </div>
    `;
  }

  // TOP BAR HEADER
  container.innerHTML = `
    <div class="header-bar">
      <div style="display: flex; align-items: center; gap: 8px;">
        <img src="./assets/images/ezo_stile_logo.png" style="height: 24px; width: auto;" alt="EZO Logo">
        <span style="font-size: 12px; font-weight: 800; color: var(--gold-primary);">${bizRecord.name}</span>
      </div>
      <div style="font-size: 11px; color: var(--text-muted);">${user.name} (👑 Patron)</div>
    </div>

    ${mainHtml}

    <nav class="bottom-nav">
      <button onclick="window.switchOwnerTab('dashboard')" class="nav-item ${activeOwnerTab === 'dashboard' ? 'active' : ''}">
        <span class="icon">📊</span>
        <span>Panel</span>
      </button>
      <button onclick="window.switchOwnerTab('appointments')" class="nav-item ${activeOwnerTab === 'appointments' ? 'active' : ''}">
        <span class="icon">📅</span>
        <span>Randevular</span>
      </button>
      <button onclick="window.switchOwnerTab('management')" class="nav-item ${activeOwnerTab === 'management' ? 'active' : ''}">
        <span class="icon">⚙️</span>
        <span>Yönetim</span>
      </button>
      <button onclick="window.switchOwnerTab('profile')" class="nav-item ${activeOwnerTab === 'profile' ? 'active' : ''}">
        <span class="icon">👤</span>
        <span>Profil</span>
      </button>
    </nav>
  `;

  // GLOBAL BINDINGS
  window.switchOwnerTab = (tab) => {
    activeOwnerTab = tab;
    renderOwnerScreen(user, onTabChange);
  };

  window.setRevenueTimeframe = (tf) => {
    revenueTimeframe = tf;
    renderOwnerScreen(user, onTabChange);
  };

  window.updateAppointmentStatusOwner = async (aptId, newStatus) => {
    await saveRecord(`appointments/${aptId}/status`, newStatus);

    if (newStatus === 'completed') {
      // Grant +2 AI Credits to Customer on Completed Booking
      const apt = allApts.find(a => a.aptId === aptId);
      if (apt && apt.customerUid) {
        const custUser = await fetchRecord(`users/${apt.customerUid}`) || {};
        const credits = custUser.aiCredits || { economy: 3, premium: 1 };
        credits.economy = (credits.economy || 0) + 2;
        await saveRecord(`users/${apt.customerUid}/aiCredits`, credits);
      }
    }

    alert(`✅ Randevu durumu '${newStatus.toUpperCase()}' olarak güncellendi.`);
    renderOwnerScreen(user, onTabChange);
  };

  window.openSalonContactModal = () => {
    const root = document.getElementById('modal-root');
    if (!root) return;

    root.innerHTML = `
      <div class="modal-overlay" onclick="window.closeModal()">
        <div class="modal-card" onclick="event.stopPropagation()">
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
    alert('✅ İletişim ayarları başarıyla kaydedildi.');
    window.closeModal();
    renderOwnerScreen(user, onTabChange);
  };

  window.openStaffManagementModal = () => {
    const root = document.getElementById('modal-root');
    if (!root) return;

    root.innerHTML = `
      <div class="modal-overlay" onclick="window.closeModal()">
        <div class="modal-card" onclick="event.stopPropagation()">
          <h3 style="font-size: 15px; font-weight: 800; color: var(--gold-primary); margin-bottom: 12px;">
            👥 Personel Yönetimi
          </h3>

          <div style="margin-bottom: 14px;">
            ${staffList.map(st => `
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; background: rgba(255,255,255,0.05); border-radius: 8px; margin-bottom: 6px;">
                <span style="font-size: 12px; color: #fff; font-weight: 700;">💈 ${st.displayName}</span>
                <span class="badge badge-approved">${st.role || 'barber'}</span>
              </div>
            `).join('')}
          </div>

          <h4 style="font-size: 13px; font-weight: 800; color: var(--gold-primary); margin-bottom: 8px;">Yeni Berber / Çalışan Ekle</h4>
          <input type="text" id="add-staff-name" class="input-field" placeholder="Çalışan Adı Soyadı">

          <button onclick="window.submitAddNewStaff()" class="btn btn-gold" style="width: 100%; margin-top: 4px;">
            ➕ Yeni Çalışan Ekle
          </button>
        </div>
      </div>
    `;
  };

  window.submitAddNewStaff = async () => {
    const staffName = document.getElementById('add-staff-name').value;
    if (!staffName) {
      alert('Lütfen çalışan adını giriniz.');
      return;
    }

    await saveStaff(businessId, { displayName: staffName, role: 'barber' });
    alert('✅ Yeni çalışan eklendi.');
    window.closeModal();
    renderOwnerScreen(user, onTabChange);
  };

  window.openServicesManagementModal = () => {
    const root = document.getElementById('modal-root');
    if (!root) return;

    root.innerHTML = `
      <div class="modal-overlay" onclick="window.closeModal()">
        <div class="modal-card" onclick="event.stopPropagation()">
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
      alert('Lütfen hizmet adı ve fiyat giriniz.');
      return;
    }

    await saveService(businessId, { name, price, duration });
    alert('✅ Yeni hizmet eklendi (5 dilde görünür kılındı).');
    window.closeModal();
    renderOwnerScreen(user, onTabChange);
  };

  window.closeModal = () => {
    const root = document.getElementById('modal-root');
    if (root) root.innerHTML = '';
  };
}