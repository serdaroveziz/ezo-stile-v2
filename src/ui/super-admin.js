/* EZO STİLE v2 - Super Admin Command Center (Final Governance, Max 2 Free Premium Grants, Support Viewing Mode, Audit Log, AI Telemetry, Master Notifications) */
import { getSalonApplications, approveSalonApplication, fetchRecord, saveRecord, getAppointmentsForBusiness } from '../db.js';
import { SUPPORTED_LANGUAGES, isRtl, t } from '../config.js';
import { showSuccessModal, showErrorModal, showConfirmModal } from './portal.js';
import { logoutUserSession } from '../auth.js';
import { renderOwnerScreen } from './owner.js';

let activeAdminTab = 'dashboard'; // 'dashboard', 'salons', 'applications', 'users', 'management', 'profile'
let salonFilterState = 'all'; // 'all', 'active', 'suspended'
let applicationFilterState = 'pending'; // 'pending', 'approved', 'rejected'
let userSearchQuery = '';
let auditFilterAction = 'all';
let supportViewBusinessId = null; // Support viewing mode state

export async function renderSuperAdminScreen(user, onTabChange) {
  // 1. SUPPORT VIEWING MODE GUARD (REQUIREMENT 29 & 30)
  if (supportViewBusinessId) {
    const supportUser = {
      ...user,
      businessId: supportViewBusinessId,
      isSupportViewMode: true
    };

    const appContainer = document.getElementById('app-container');
    if (appContainer) {
      appContainer.innerHTML = `
        <div style="background: #eab308; color: #000; padding: 10px 16px; font-weight: 800; font-size: 12px; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 9999;">
          <span>⚠️ Süper Admin Destek Modu — [${supportViewBusinessId}]</span>
          <button onclick="window.exitSupportViewingMode()" class="btn btn-secondary" style="background: #000; color: #fff; border: none; padding: 4px 10px; font-size: 11px;">
            ${t('exitSupportMode', user.language || 'tr')}
          </button>
        </div>
        <div id="support-owner-root"></div>
      `;

      window.exitSupportViewingMode = () => {
        supportViewBusinessId = null;
        renderSuperAdminScreen(user, onTabChange);
      };

      // Render owner screen inside support view
      renderOwnerScreen(supportUser, onTabChange);
      return;
    }
  }

  const container = document.getElementById('app-container');
  if (!container) return;

  const currentLang = user.language || 'tr';
  const rtl = isRtl(currentLang);
  document.documentElement.dir = rtl ? 'rtl' : 'ltr';

  const applications = await getSalonApplications();
  const pendingApps = applications.filter(a => a && a.status === 'pending');
  const approvedApps = applications.filter(a => a && a.status === 'approved');
  const rejectedApps = applications.filter(a => a && a.status === 'rejected');

  const allBusinessesData = await fetchRecord('businesses') || {};
  const allBusinesses = Object.values(allBusinessesData);
  const activeBusinesses = allBusinesses.filter(b => b && b.status !== 'suspended');

  const grantedSalons = allBusinesses.filter(b => b && b.premiumSource === 'super_admin_grant');

  const allUsersData = await fetchRecord('users') || {};
  const allUsers = Object.values(allUsersData);

  const allAptsData = await fetchRecord('appointments') || {};
  const allApts = Object.values(allAptsData);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayApts = allApts.filter(a => a && a.date === todayStr);

  const displayName = 'Kuvvat';

  let mainHtml = '';

  // ==========================================
  // 1. ANA SAYFA / KOMUTA MERKEZİ (REQS 3-9)
  // ==========================================
  if (activeAdminTab === 'dashboard') {
    mainHtml = `
      <div class="card card-gold animate-fade" style="padding: 18px; margin-bottom: 14px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <h3 style="font-size: 16px; font-weight: 800; color: #fff;">⚡ EZO STİLE — Süper Admin</h3>
            <div style="font-size: 11px; color: var(--gold-primary);">👑 Platform Komuta Merkezi • Hoş geldiniz, ${displayName}</div>
          </div>
          <span class="badge badge-approved" style="font-size: 10px;">Platform Süper Admin</span>
        </div>
      </div>

      <!-- 6 INTERACTIVE KPI CARDS (REQS 3-9) -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 14px;">
        <!-- 1. TOPLAM SALON -->
        <div class="card animate-fade" style="padding: 14px; text-align: center; cursor: pointer; border-color: var(--gold-primary);" onclick="window.switchAdminTab('salons', 'all')">
          <div style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">🏪 Toplam Salon</div>
          <div style="font-size: 24px; font-weight: 900; color: #fff; margin-top: 4px;">${allBusinesses.length}</div>
          <div style="font-size: 9px; color: var(--text-muted); margin-top: 4px;">Salonları Gör →</div>
        </div>

        <!-- 2. AKTİF SALON -->
        <div class="card animate-fade" style="padding: 14px; text-align: center; cursor: pointer;" onclick="window.switchAdminTab('salons', 'active')">
          <div style="font-size: 11px; color: #22c55e; font-weight: 700;">✅ Aktif Salon</div>
          <div style="font-size: 24px; font-weight: 900; color: #22c55e; margin-top: 4px;">${activeBusinesses.length}</div>
          <div style="font-size: 9px; color: var(--text-muted); margin-top: 4px;">Aktifleri Gör →</div>
        </div>

        <!-- 3. BEKLEYEN BAŞVURU -->
        <div class="card animate-fade" style="padding: 14px; text-align: center; cursor: pointer;" onclick="window.switchAdminTab('applications', 'pending')">
          <div style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">⏳ Bekleyen Başvuru</div>
          <div style="font-size: 24px; font-weight: 900; color: var(--gold-primary); margin-top: 4px;">${pendingApps.length}</div>
          <div style="font-size: 9px; color: var(--text-muted); margin-top: 4px;">Başvuruları İncele →</div>
        </div>

        <!-- 4. TOPLAM KULLANICI -->
        <div class="card animate-fade" style="padding: 14px; text-align: center; cursor: pointer;" onclick="window.switchAdminTab('users')">
          <div style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">👥 Toplam Kullanıcı</div>
          <div style="font-size: 24px; font-weight: 900; color: #fff; margin-top: 4px;">${allUsers.length}</div>
          <div style="font-size: 9px; color: var(--text-muted); margin-top: 4px;">Kullanıcıları Yönet →</div>
        </div>

        <!-- 5. BUGÜNKÜ RANDEVU -->
        <div class="card animate-fade" style="padding: 14px; text-align: center; cursor: pointer;" onclick="window.openPlatformTodayAptsModal()">
          <div style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">📅 Bugünkü Randevu</div>
          <div style="font-size: 24px; font-weight: 900; color: #fff; margin-top: 4px;">${todayApts.length}</div>
          <div style="font-size: 9px; color: var(--text-muted); margin-top: 4px;">Randevuları Listele →</div>
        </div>

        <!-- 6. PLATFORM GELİRİ -->
        <div class="card animate-fade" style="padding: 14px; text-align: center; cursor: pointer;" onclick="window.openPlatformRevenueModal()">
          <div style="font-size: 11px; color: #22c55e; font-weight: 700;">💰 Platform Geliri</div>
          <div style="font-size: 18px; font-weight: 900; color: #22c55e; margin-top: 4px;">0,00 TL</div>
          <div style="font-size: 9px; color: var(--text-muted); margin-top: 4px;">Sandbox / Test Modu →</div>
        </div>
      </div>
    `;
  }
  // ==========================================
  // 2. SALONLAR EKRANI (REQS 10-14)
  // ==========================================
  else if (activeAdminTab === 'salons') {
    let filteredSalons = allBusinesses;
    if (salonFilterState === 'active') filteredSalons = allBusinesses.filter(b => b.status !== 'suspended');
    if (salonFilterState === 'suspended') filteredSalons = allBusinesses.filter(b => b.status === 'suspended');

    const salonsHtml = filteredSalons.map(b => {
      const isGranted = b.premiumSource === 'super_admin_grant';
      const isSuspended = b.status === 'suspended';

      return `
        <div class="card animate-fade" style="padding: 14px; margin-bottom: 10px; border-color: ${isSuspended ? '#ef4444' : 'var(--border-color)'};">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <div style="font-size: 14px; font-weight: 800; color: #fff;">💈 ${b.name}</div>
              <div style="font-size: 11px; color: var(--gold-primary); margin-top: 2px;">
                📍 ${b.district || 'Şişli'} / ${b.city || 'İstanbul'} • 📞 ${b.phone || 'Yok'}
              </div>
              <div style="font-size: 10px; color: var(--text-muted); margin-top: 2px;">
                Paket: ${b.plan || 'FREE'} ${isGranted ? '(⚡ Super Admin Grant)' : ''} • Keşfet: ${b.discoveryEnabled !== false ? '🟢 Açık' : '🔴 Kapalı'}
              </div>
            </div>
            <span class="badge ${isSuspended ? 'badge-pending' : 'badge-approved'}">${isSuspended ? '🔴 Askıda' : '🟢 Aktif'}</span>
          </div>

          <div style="display: flex; gap: 6px; margin-top: 10px; flex-wrap: wrap;">
            <button onclick="window.openSalonDetailsModalAdmin('${b.businessId}')" class="btn btn-gold" style="flex: 1; font-size: 10px; padding: 4px 8px;">
              🔍 Detay Gör
            </button>
            <button onclick="window.enterSupportViewingMode('${b.businessId}')" class="btn btn-outline-gold" style="flex: 1; font-size: 10px; padding: 4px 8px;">
              👁️ Patron Gözüyle
            </button>
            <button onclick="window.toggleSalonSuspensionAdmin('${b.businessId}', ${!isSuspended})" class="btn btn-secondary" style="flex: 1; font-size: 10px; padding: 4px 8px; border-color: ${isSuspended ? '#22c55e' : '#ef4444'}; color: ${isSuspended ? '#22c55e' : '#ef4444'};">
              ${isSuspended ? '✅ Aktifleştir' : '🚫 Askıya Al'}
            </button>
            <button onclick="window.toggleSalonDiscoveryAdmin('${b.businessId}', ${b.discoveryEnabled === false})" class="btn btn-secondary" style="flex: 1; font-size: 10px; padding: 4px 8px;">
              ${b.discoveryEnabled === false ? '🌐 Keşfete Aç' : '🙈 Keşfetten Gizle'}
            </button>
          </div>
        </div>
      `;
    }).join('');

    mainHtml = `
      <div class="card animate-fade">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <h3 style="font-size: 16px; font-weight: 800; color: var(--gold-primary); margin: 0;">🏪 Salon Yönetimi (${filteredSalons.length})</h3>
        </div>

        <div style="display: flex; gap: 4px; margin-bottom: 12px;">
          <button onclick="window.setSalonFilter('all')" class="btn ${salonFilterState === 'all' ? 'btn-gold' : 'btn-secondary'}" style="flex: 1; font-size: 11px; padding: 6px;">Tümü (${allBusinesses.length})</button>
          <button onclick="window.setSalonFilter('active')" class="btn ${salonFilterState === 'active' ? 'btn-gold' : 'btn-secondary'}" style="flex: 1; font-size: 11px; padding: 6px;">Aktif (${activeBusinesses.length})</button>
          <button onclick="window.setSalonFilter('suspended')" class="btn ${salonFilterState === 'suspended' ? 'btn-gold' : 'btn-secondary'}" style="flex: 1; font-size: 11px; padding: 6px;">Askıda (${allBusinesses.length - activeBusinesses.length})</button>
        </div>

        ${filteredSalons.length === 0 ? '<div style="font-size: 11px; color: var(--text-muted);">Salon bulunamadı.</div>' : salonsHtml}
      </div>
    `;
  }
  // ==========================================
  // 3. BAŞVURULAR EKRANI (REQS 15-17)
  // ==========================================
  else if (activeAdminTab === 'applications') {
    let filteredApps = pendingApps;
    if (applicationFilterState === 'approved') filteredApps = approvedApps;
    if (applicationFilterState === 'rejected') filteredApps = rejectedApps;

    const appsHtml = filteredApps.map(a => `
      <div class="card card-gold animate-fade" style="padding: 14px; margin-bottom: 10px;">
        <div style="font-size: 14px; font-weight: 800; color: #fff;">💈 ${a.salonName}</div>
        <div style="font-size: 11px; color: var(--gold-primary); margin-top: 2px;">
          👤 Yetkili: ${a.applicantName || 'Bilinmiyor'} • 📞 ${a.phone} • 📍 ${a.city} / ${a.district}
        </div>
        <div style="font-size: 10px; color: var(--text-muted); margin-top: 2px;">Tarih: ${a.createdAt ? a.createdAt.split('T')[0] : 'Bilinmiyor'}</div>

        ${a.status === 'pending' ? `
          <div style="display: flex; gap: 8px; margin-top: 10px;">
            <button onclick="window.approveSalonAppAdmin('${a.appId}')" class="btn btn-gold" style="flex: 1; font-size: 11px;">
              ✅ Onayla & Salon Oluştur
            </button>
            <button onclick="window.rejectSalonAppAdmin('${a.appId}')" class="btn btn-secondary" style="flex: 1; font-size: 11px; border-color: #ef4444; color: #ef4444;">
              ❌ Reddet
            </button>
          </div>
        ` : `<span class="badge ${a.status === 'approved' ? 'badge-approved' : 'badge-pending'}" style="margin-top: 8px;">${a.status}</span>`}
      </div>
    `).join('');

    mainHtml = `
      <div class="card animate-fade">
        <h3 style="font-size: 16px; font-weight: 800; color: var(--gold-primary); margin-bottom: 12px;">📋 Salon Başvuruları</h3>
        
        <div style="display: flex; gap: 4px; margin-bottom: 12px;">
          <button onclick="window.setAppFilter('pending')" class="btn ${applicationFilterState === 'pending' ? 'btn-gold' : 'btn-secondary'}" style="flex: 1; font-size: 11px; padding: 6px;">Bekleyen (${pendingApps.length})</button>
          <button onclick="window.setAppFilter('approved')" class="btn ${applicationFilterState === 'approved' ? 'btn-gold' : 'btn-secondary'}" style="flex: 1; font-size: 11px; padding: 6px;">Onaylanan (${approvedApps.length})</button>
          <button onclick="window.setAppFilter('rejected')" class="btn ${applicationFilterState === 'rejected' ? 'btn-gold' : 'btn-secondary'}" style="flex: 1; font-size: 11px; padding: 6px;">Reddedilen (${rejectedApps.length})</button>
        </div>

        ${filteredApps.length === 0 ? '<div style="font-size: 11px; color: var(--text-muted);">Başvuru bulunmamaktadır.</div>' : appsHtml}
      </div>
    `;
  }
  // ==========================================
  // 4. KULLANICILAR EKRANI (REQS 18-20)
  // ==========================================
  else if (activeAdminTab === 'users') {
    let filteredUsers = allUsers;
    if (userSearchQuery) {
      const q = userSearchQuery.toLowerCase();
      filteredUsers = allUsers.filter(u => u && ((u.displayName || u.name || '').toLowerCase().includes(q) || (u.phone || '').includes(q) || (u.role || '').toLowerCase().includes(q)));
    }

    const usersHtml = filteredUsers.map(u => {
      const isDisabled = u.disabled === true;
      return `
        <div class="card animate-fade" style="padding: 12px; margin-bottom: 8px; border-color: ${isDisabled ? '#ef4444' : 'var(--border-color)'};">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-size: 13px; font-weight: 800; color: #fff;">👤 ${u.displayName || u.name || 'Kullanıcı'}</div>
              <div style="font-size: 11px; color: var(--gold-primary);">📱 ${u.phone} • Rol: ${u.role || 'customer'}</div>
            </div>
            <button onclick="window.toggleUserDisableAdmin('${u.uid}', ${!isDisabled})" class="btn btn-secondary" style="font-size: 10px; padding: 4px 8px; border-color: ${isDisabled ? '#22c55e' : '#ef4444'}; color: ${isDisabled ? '#22c55e' : '#ef4444'};">
              ${isDisabled ? '✅ Aktifleştir' : '🚫 Devre Dışı Bırak'}
            </button>
          </div>
        </div>
      `;
    }).join('');

    mainHtml = `
      <div class="card animate-fade">
        <h3 style="font-size: 16px; font-weight: 800; color: var(--gold-primary); margin-bottom: 12px;">👥 Kullanıcı Yönetimi (${filteredUsers.length})</h3>
        <input type="text" value="${userSearchQuery}" oninput="window.setUserSearchQuery(this.value)" class="input-field" placeholder="Ad, telefon veya rol ile ara..." style="margin-bottom: 12px;">
        ${filteredUsers.length === 0 ? '<div style="font-size: 11px; color: var(--text-muted);">Kullanıcı bulunamadı.</div>' : usersHtml}
      </div>
    `;
  }
  // ==========================================
  // 5. YÖNETİM MENÜSÜ & 6 KAPALI KART (REQS 21-28)
  // ==========================================
  else if (activeAdminTab === 'management') {
    mainHtml = `
      <div class="card animate-fade">
        <h3 style="font-size: 16px; font-weight: 800; color: var(--gold-primary); margin-bottom: 12px;">⚙️ Süper Admin Yönetim Menüsü</h3>
        
        <div style="display: flex; flex-direction: column; gap: 10px;">
          <div onclick="window.openPlatformRevenueModal()" class="card animate-fade" style="padding: 14px; cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
            <h4 style="font-size: 14px; font-weight: 800; color: #fff; margin: 0;">💳 Ödemeler & Abonelikler</h4>
            <span class="badge badge-approved">İncele →</span>
          </div>

          <div onclick="window.openGrantManagementModal()" class="card animate-fade" style="padding: 14px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; border-color: var(--gold-primary);">
            <div>
              <h4 style="font-size: 14px; font-weight: 800; color: #fff; margin: 0;">👑 Ücretsiz Premium Grant Yönetimi</h4>
              <div style="font-size: 10px; color: var(--gold-primary); margin-top: 2px;">Aktif Kullanım: ${grantedSalons.length} / 2 Salon</div>
            </div>
            <span class="badge badge-approved">Yönet →</span>
          </div>

          <div onclick="window.openAiTelemetryModal()" class="card animate-fade" style="padding: 14px; cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
            <h4 style="font-size: 14px; font-weight: 800; color: #fff; margin: 0;">🤖 AI Telemetri & Provider Status</h4>
            <span class="badge badge-approved">Görüntüle →</span>
          </div>

          <div onclick="window.openAuditLogModal()" class="card animate-fade" style="padding: 14px; cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
            <h4 style="font-size: 14px; font-weight: 800; color: #fff; margin: 0;">📋 Platform Audit Log</h4>
            <span class="badge badge-approved">Listele →</span>
          </div>

          <div onclick="window.switchAdminTab('salons')" class="card animate-fade" style="padding: 14px; cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
            <h4 style="font-size: 14px; font-weight: 800; color: #fff; margin: 0;">🛠️ Destek Modu (Patron Gözüyle)</h4>
            <span class="badge badge-approved">Aç →</span>
          </div>
        </div>
      </div>
    `;
  }
  // ==========================================
  // 6. SÜPER ADMIN PROFİLİ (REQS 31-32)
  // ==========================================
  else if (activeAdminTab === 'profile') {
    mainHtml = `
      <div class="card animate-fade" style="padding: 20px;">
        <div style="text-align: center; margin-bottom: 16px;">
          <div style="width: 72px; height: 72px; border-radius: 50%; background: var(--gold-gradient); display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: 900; color: #000; margin: 0 auto;">
            ⚡
          </div>
          <h3 style="font-size: 16px; font-weight: 800; color: #fff; margin-top: 8px;">${displayName}</h3>
          <div style="font-size: 12px; color: var(--gold-primary); font-weight: 700;">⚡ Platform Süper Admin • ${user.phone}</div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 8px;">
          <button onclick="window.openSuperAdminNotificationSettingsModal()" class="btn btn-secondary" style="width: 100%; text-align: left; padding: 12px;">
            🔔 Bildirim Ayarları (9 Kategori)
          </button>
          <button onclick="window.promptAdminLogout()" class="btn btn-secondary" style="width: 100%; margin-top: 10px; min-height: 42px; border-color: #ef4444; color: #ef4444;">
            🚪 Oturumu Kapat
          </button>
        </div>
      </div>
    `;
  }

  // CONTAINER & BOTTOM NAV (REQ 2)
  container.innerHTML = `
    <div class="header-bar">
      <div style="display: flex; align-items: center; gap: 8px;">
        <img src="./assets/images/ezo_stile_logo.png" style="height: 24px; width: auto;" alt="EZO Logo">
        <span style="font-size: 12px; font-weight: 800; color: var(--gold-primary);">EZO STİLE — Süper Admin</span>
      </div>
      <div style="font-size: 11px; color: var(--text-muted);">${displayName}</div>
    </div>

    ${mainHtml}

    <nav class="bottom-nav">
      <button onclick="window.switchAdminTab('dashboard')" class="nav-item ${activeAdminTab === 'dashboard' ? 'active' : ''}">
        <span class="icon">🏠</span>
        <span>Ana Sayfa</span>
      </button>
      <button onclick="window.switchAdminTab('salons')" class="nav-item ${activeAdminTab === 'salons' ? 'active' : ''}">
        <span class="icon">🏪</span>
        <span>Salonlar</span>
      </button>
      <button onclick="window.switchAdminTab('applications')" class="nav-item ${activeAdminTab === 'applications' ? 'active' : ''}">
        <span class="icon">📋</span>
        <span>Başvurular</span>
      </button>
      <button onclick="window.switchAdminTab('users')" class="nav-item ${activeAdminTab === 'users' ? 'active' : ''}">
        <span class="icon">👥</span>
        <span>Kullanıcılar</span>
      </button>
      <button onclick="window.switchAdminTab('management')" class="nav-item ${activeAdminTab === 'management' ? 'active' : ''}">
        <span class="icon">⚙️</span>
        <span>Yönetim</span>
      </button>
    </nav>
  `;

  // GLOBAL STATE HANDLERS
  window.switchAdminTab = (tab, filter = null) => {
    activeAdminTab = tab;
    if (tab === 'salons' && filter) salonFilterState = filter;
    if (tab === 'applications' && filter) applicationFilterState = filter;
    renderSuperAdminScreen(user, onTabChange);
  };

  window.setSalonFilter = (filter) => {
    salonFilterState = filter;
    renderSuperAdminScreen(user, onTabChange);
  };

  window.setAppFilter = (filter) => {
    applicationFilterState = filter;
    renderSuperAdminScreen(user, onTabChange);
  };

  window.setUserSearchQuery = (q) => {
    userSearchQuery = q;
    renderSuperAdminScreen(user, onTabChange);
  };

  window.enterSupportViewingMode = (businessId) => {
    supportViewBusinessId = businessId;
    renderSuperAdminScreen(user, onTabChange);
  };

  // SALON SUSPENSION WITH VIP CONFIRMATION (REQS 12 & 13)
  window.toggleSalonSuspensionAdmin = async (businessId, suspend) => {
    showConfirmModal('Salon Durumu Değişikliği', suspend ? 'Bu salonu askıya almak istediğinize emin misiniz? (Online randevular duracaktır)' : 'Bu salonu tekrar aktifleştirmek istediğinize emin misiniz?', async () => {
      const newStatus = suspend ? 'suspended' : 'active';
      await saveRecord(`businesses/${businessId}/status`, newStatus, 'PUT');
      
      await saveRecord(`audit_logs/log_${Date.now()}`, {
        actorUid: user.uid,
        action: suspend ? 'salon.suspended' : 'salon.activated',
        targetId: businessId,
        createdAt: new Date().toISOString()
      });

      showSuccessModal(t('successTitle'), suspend ? 'Salon askıya alındı.' : 'Salon aktifleştirildi.');
      renderSuperAdminScreen(user, onTabChange);
    });
  };

  // SALON DISCOVERY TOGGLE (REQ 14)
  window.toggleSalonDiscoveryAdmin = async (businessId, enabled) => {
    await saveRecord(`businesses/${businessId}/discoveryEnabled`, enabled, 'PUT');
    showSuccessModal(t('successTitle'), enabled ? 'Salon Keşfet görünümüne açıldı.' : 'Salon Keşfet görünümünden gizlendi.');
    renderSuperAdminScreen(user, onTabChange);
  };

  // SALON APPROVAL & REJECTION (REQS 16 & 17)
  window.approveSalonAppAdmin = async (appId) => {
    const res = await approveSalonApplication(appId);
    if (res && res.success) {
      showSuccessModal(t('successTitle'), 'Salon başvurusu onaylandı ve salon oluşturuldu.');
      renderSuperAdminScreen(user, onTabChange);
    } else {
      showErrorModal(t('errorTitle'), (res && res.error) ? res.error : 'Başvuru onaylanamadı.');
    }
  };

  window.rejectSalonAppAdmin = async (appId) => {
    showConfirmModal('Başvuruyu Reddet', 'Bu salon başvurusunu reddetmek istediğinize emin misiniz?', async () => {
      await saveRecord(`salon_applications/${appId}/status`, 'rejected', 'PUT');
      showSuccessModal(t('successTitle'), 'Başvuru reddedildi.');
      renderSuperAdminScreen(user, onTabChange);
    });
  };

  // USER DISABLE / ENABLE (REQ 19)
  window.toggleUserDisableAdmin = async (targetUid, disable) => {
    showConfirmModal('Kullanıcı Durumu', disable ? 'Bu kullanıcıyı devre dışı bırakmak istediğinize emin misiniz?' : 'Bu kullanıcıyı aktifleştirmek istediğinize emin misiniz?', async () => {
      await saveRecord(`users/${targetUid}/disabled`, disable, 'PUT');
      showSuccessModal(t('successTitle'), disable ? 'Kullanıcı devre dışı bırakıldı.' : 'Kullanıcı aktifleştirildi.');
      renderSuperAdminScreen(user, onTabChange);
    });
  };

  // MAX 2 FREE PREMIUM GRANT MANAGEMENT (REQS 22-24)
  window.openGrantManagementModal = () => {
    const root = document.getElementById('modal-root');
    if (!root) return;

    const availableSalons = allBusinesses.filter(b => b && b.premiumSource !== 'super_admin_grant');

    root.innerHTML = `
      <div class="modal-overlay" onclick="window.closeModal()">
        <div class="modal-card animate-fade" onclick="event.stopPropagation()">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
            <h3 style="font-size: 15px; font-weight: 800; color: var(--gold-primary); margin: 0;">👑 Ücretsiz Premium Grant Yönetimi</h3>
            <button onclick="window.closeModal()" class="btn btn-secondary" style="padding: 4px 10px;">✕</button>
          </div>

          <div style="font-size: 13px; font-weight: 800; color: #fff; background: rgba(245,158,11,0.1); padding: 10px; border-radius: 8px; text-align: center; margin-bottom: 12px;">
            Aktif Grant Kullanımı: ${grantedSalons.length} / 2 Salon
          </div>

          <div style="margin-bottom: 14px;">
            <h4 style="font-size: 12px; font-weight: 800; color: var(--gold-primary); margin-bottom: 6px;">Aktif Grant Verilmiş Salonlar:</h4>
            ${grantedSalons.length === 0 ? '<div style="font-size: 11px; color: var(--text-muted);">Henüz Grant verilmiş salon yok.</div>' : grantedSalons.map(b => `
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px dashed rgba(255,255,255,0.1);">
                <span style="font-size: 12px; color: #fff;">💈 ${b.name}</span>
                <button onclick="window.revokeGrantAdmin('${b.businessId}')" class="btn btn-secondary" style="font-size: 10px; padding: 4px 8px; color: #ef4444; border-color: #ef4444;">Grant Kaldır</button>
              </div>
            `).join('')}
          </div>

          ${grantedSalons.length < 2 ? `
            <label style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">Yeni Salon Seç ve Premium Grant Ver:</label>
            <select id="grant-salon-select" class="input-field" style="margin-top: 4px; margin-bottom: 12px;">
              ${availableSalons.map(b => `<option value="${b.businessId}">💈 ${b.name} (${b.city})</option>`).join('')}
            </select>
            <button onclick="window.applyGrantAdmin()" class="btn btn-gold" style="width: 100%;">⚡ Premium Grant Tanımla</button>
          ` : `
            <div style="font-size: 11px; color: #ef4444; text-align: center; font-weight: 700;">⚠️ Maksimum 2 aktif Grant limitine ulaşıldı.</div>
          `}
        </div>
      </div>
    `;
  };

  window.applyGrantAdmin = async () => {
    if (grantedSalons.length >= 2) {
      showErrorModal(t('errorTitle'), 'GRANT_LIMIT_REACHED: Maksimum 2 salon için ücretsiz Premium verilebilir.');
      return;
    }

    const select = document.getElementById('grant-salon-select');
    const targetBizId = select ? select.value : null;
    if (!targetBizId) return;

    await saveRecord(`businesses/${targetBizId}/plan`, 'PREMIUM', 'PUT');
    await saveRecord(`businesses/${targetBizId}/premiumSource`, 'super_admin_grant', 'PUT');

    window.closeModal();
    showSuccessModal(t('successTitle'), '⚡ Salon için ücretsiz Premium Grant aktif edildi.');
    renderSuperAdminScreen(user, onTabChange);
  };

  window.revokeGrantAdmin = async (targetBizId) => {
    await saveRecord(`businesses/${targetBizId}/plan`, 'FREE', 'PUT');
    await saveRecord(`businesses/${targetBizId}/premiumSource`, null, 'PUT');

    window.closeModal();
    showSuccessModal(t('successTitle'), 'Grant kaldırıldı ve salon FREE plana döndürüldü.');
    renderSuperAdminScreen(user, onTabChange);
  };

  // AUDIT LOG MODAL (REQ 28)
  window.openAuditLogModal = async () => {
    const root = document.getElementById('modal-root');
    if (!root) return;

    const logsData = await fetchRecord('audit_logs') || {};
    const logs = Object.values(logsData);

    root.innerHTML = `
      <div class="modal-overlay" onclick="window.closeModal()">
        <div class="modal-card animate-fade" onclick="event.stopPropagation()" style="max-height: 85vh; overflow-y: auto;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
            <h3 style="font-size: 15px; font-weight: 800; color: var(--gold-primary); margin: 0;">📋 Platform Audit Log</h3>
            <button onclick="window.closeModal()" class="btn btn-secondary" style="padding: 4px 10px;">✕</button>
          </div>

          <div style="max-height: 400px; overflow-y: auto;">
            ${logs.length === 0 ? '<div style="font-size: 11px; color: var(--text-muted);">Henüz audit log kaydı bulunmuyor.</div>' : logs.map(l => `
              <div style="font-size: 11px; color: #fff; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.08);">
                <div><strong>${l.action}</strong> • Target: ${l.targetId || 'N/A'}</div>
                <div style="font-size: 9px; color: var(--text-muted);">Actor: ${l.actorUid} • ${l.createdAt}</div>
              </div>
            `).join('')}
          </div>

          <button onclick="window.closeModal()" class="btn btn-gold" style="width: 100%; margin-top: 10px;">Kapat</button>
        </div>
      </div>
    `;
  };

  // PLATFORM REVENUE MODAL (REQ 9)
  window.openPlatformRevenueModal = () => {
    const root = document.getElementById('modal-root');
    if (!root) return;

    root.innerHTML = `
      <div class="modal-overlay" onclick="window.closeModal()">
        <div class="modal-card animate-fade" onclick="event.stopPropagation()">
          <h3 style="font-size: 15px; font-weight: 800; color: var(--gold-primary); margin-bottom: 12px;">💰 Platform Gelir Dashboard</h3>
          <div style="font-size: 22px; font-weight: 900; color: #22c55e; text-align: center; margin-bottom: 8px;">0,00 TL</div>
          <div style="font-size: 11px; color: #eab308; text-align: center; background: rgba(234,179,8,0.1); padding: 8px; border-radius: 6px; margin-bottom: 14px;">
            ℹ️ Sandbox / Test Ödeme Altyapısı Aktiftir (Gerçek Tahsilat Yoktur)
          </div>
          <button onclick="window.closeModal()" class="btn btn-gold" style="width: 100%;">Kapat</button>
        </div>
      </div>
    `;
  };

  // SALON DETAILS MODAL ADMIN (REQ 11)
  window.openSalonDetailsModalAdmin = (bizId) => {
    const b = allBusinessesData[bizId];
    if (!b) return;
    const root = document.getElementById('modal-root');
    if (!root) return;

    root.innerHTML = `
      <div class="modal-overlay" onclick="window.closeModal()">
        <div class="modal-card animate-fade" onclick="event.stopPropagation()">
          <h3 style="font-size: 15px; font-weight: 800; color: var(--gold-primary); margin-bottom: 12px;">💈 ${b.name} Detayları</h3>
          <div style="font-size: 12px; color: #fff; margin-bottom: 14px;">
            <div><strong>ID:</strong> ${b.businessId}</div>
            <div><strong>Şehir/İlçe:</strong> ${b.city} / ${b.district}</div>
            <div><strong>Paket:</strong> ${b.plan || 'FREE'}</div>
            <div><strong>Durum:</strong> ${b.status || 'active'}</div>
          </div>
          <button onclick="window.closeModal()" class="btn btn-gold" style="width: 100%;">Kapat</button>
        </div>
      </div>
    `;
  };

  window.promptAdminLogout = () => {
    logoutUserSession();
    if (typeof onTabChange === 'function') onTabChange(null);
  };
}
