/* EZO STİLE v2 - Super Admin Command Center (VIP Modals, Support Viewing Mode, Max 2 Free Premium Grants) */
import { getSalonApplications, approveSalonApplication, fetchRecord, saveRecord } from '../db.js';
import { showSuccessModal, showErrorModal, showConfirmModal } from './portal.js';

let activeAdminTab = 'dashboard';

export async function renderSuperAdminScreen(user, onTabChange) {
  const container = document.getElementById('app-container');
  if (!container) return;

  const applications = await getSalonApplications();
  const pendingApps = applications.filter(a => a.status === 'pending');

  const allBusinessesData = await fetchRecord('businesses') || {};
  const allBusinesses = Object.values(allBusinessesData);

  const grantedSalons = allBusinesses.filter(b => b && b.premiumSource === 'super_admin_grant');

  const allUsersData = await fetchRecord('users') || {};
  const allUsers = Object.values(allUsersData);

  let mainHtml = '';

  if (activeAdminTab === 'dashboard') {
    mainHtml = `
      <div class="card card-gold animate-fade" style="padding: 18px; margin-bottom: 14px;">
        <h3 style="font-size: 16px; font-weight: 800; color: #fff;">⚡ Platform Süper Admin Komuta Merkezi</h3>
        <p style="font-size: 11px; color: var(--gold-primary);">EZO STİLE v2 Global Sistem Denetimi</p>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 14px;">
        <div class="card" style="padding: 14px; text-align: center;">
          <div style="font-size: 11px; color: var(--text-muted);">Toplam Salon</div>
          <div style="font-size: 22px; font-weight: 800; color: #fff;">${allBusinesses.length}</div>
        </div>

        <div class="card" style="padding: 14px; text-align: center;">
          <div style="font-size: 11px; color: var(--text-muted);">Bekleyen Başvurular</div>
          <div style="font-size: 22px; font-weight: 800; color: var(--gold-primary);">${pendingApps.length}</div>
        </div>

        <div class="card" style="padding: 14px; text-align: center;">
          <div style="font-size: 11px; color: var(--text-muted);">Toplam Kullanıcı</div>
          <div style="font-size: 22px; font-weight: 800; color: #fff;">${allUsers.length}</div>
        </div>

        <div class="card" style="padding: 14px; text-align: center;">
          <div style="font-size: 11px; color: var(--text-muted);">Ücretsiz Premium Grant</div>
          <div style="font-size: 22px; font-weight: 800; color: ${grantedSalons.length >= 2 ? '#ef4444' : '#22c55e'};">
            ${grantedSalons.length} / 2 Salon
          </div>
        </div>
      </div>
    `;
  } else if (activeAdminTab === 'applications') {
    const appsHtml = pendingApps.map(a => `
      <div class="card card-gold animate-fade" style="padding: 14px; margin-bottom: 10px;">
        <div style="font-size: 14px; font-weight: 800; color: #fff;">💈 ${a.salonName}</div>
        <div style="font-size: 11px; color: var(--gold-primary); margin-top: 2px;">📍 ${a.city} • 📞 ${a.phone}</div>
        <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">Başvuran UID: ${a.applicantUid}</div>

        <div style="display: flex; gap: 8px; margin-top: 10px;">
          <button onclick="window.approveSalonAppAdmin('${a.appId}')" class="btn btn-gold" style="flex: 1; font-size: 11px;">
            ✅ Onayla & Salon Oluştur
          </button>
        </div>
      </div>
    `).join('');

    mainHtml = `
      <div class="card animate-fade">
        <h3 style="font-size: 16px; font-weight: 800; color: var(--gold-primary); margin-bottom: 12px;">📋 Bekleyen Salon Başvuruları</h3>
        ${pendingApps.length === 0 ? '<div style="font-size: 12px; color: var(--text-muted);">Bekleyen başvuru yok.</div>' : appsHtml}
      </div>
    `;
  } else if (activeAdminTab === 'salons') {
    const salonsHtml = allBusinesses.map(b => {
      const isGranted = b.premiumSource === 'super_admin_grant';

      return `
        <div class="card animate-fade" style="padding: 14px; margin-bottom: 10px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <div style="font-size: 14px; font-weight: 800; color: #fff;">💈 ${b.name}</div>
              <div style="font-size: 11px; color: var(--gold-primary);">ID: ${b.businessId} • Paket: ${b.plan || 'FREE'} ${isGranted ? '(⚡ Super Admin Grant)' : ''}</div>
            </div>
            <span class="badge ${b.status === 'suspended' ? 'badge-pending' : 'badge-approved'}">${b.status || 'active'}</span>
          </div>

          <div style="display: flex; gap: 6px; margin-top: 10px; flex-wrap: wrap;">
            <button onclick="window.toggleGrantPremiumAdmin('${b.businessId}')" class="btn ${isGranted ? 'btn-secondary' : 'btn-gold'}" style="flex: 1; font-size: 10px; padding: 4px;">
              ${isGranted ? '❌ Grant Kaldır' : '⚡ Ücretsiz Premium Grant Ver'}
            </button>
            <button onclick="window.toggleSalonStatusAdmin('${b.businessId}')" class="btn btn-secondary" style="flex: 1; font-size: 10px; padding: 4px;">
              ${b.status === 'suspended' ? '✅ Aktifleştir' : '🚫 Askıya Al'}
            </button>
          </div>
        </div>
      `;
    }).join('');

    mainHtml = `
      <div class="card animate-fade">
        <h3 style="font-size: 16px; font-weight: 800; color: var(--gold-primary); margin-bottom: 12px;">💈 Salon Yönetimi & Premium Grant</h3>
        <p style="font-size: 11px; color: var(--text-muted); margin-bottom: 10px;">
          Süper Admin en fazla 2 salona ücretsiz ve süresiz Premium grant hakkı verebilir (Mevcut: ${grantedSalons.length}/2).
        </p>
        ${salonsHtml}
      </div>
    `;
  } else if (activeAdminTab === 'profile') {
    mainHtml = `
      <div class="card animate-fade">
        <h3 style="font-size: 16px; font-weight: 800; color: var(--gold-primary); margin-bottom: 12px;">⚡ Süper Admin Profili</h3>
        <p style="font-size: 12px; color: #fff;"><strong>Ad Soyad:</strong> ${user.name}</p>
        <p style="font-size: 12px; color: #fff; margin-bottom: 14px;"><strong>Rol:</strong> super_admin</p>
        <button onclick="window.logoutUserSession()" class="btn btn-secondary" style="width: 100%; border-color: #ef4444; color: #ef4444;">
          🚪 Oturumu Kapat
        </button>
      </div>
    `;
  }

  container.innerHTML = `
    <div class="header-bar">
      <div style="display: flex; align-items: center; gap: 8px;">
        <img src="./assets/images/ezo_stile_logo.png" style="height: 24px; width: auto;" alt="EZO Logo">
        <span style="font-size: 12px; font-weight: 800; color: var(--gold-primary);">Süper Admin</span>
      </div>
      <div style="font-size: 11px; color: var(--text-muted);">${user.phone}</div>
    </div>

    ${mainHtml}

    <nav class="bottom-nav">
      <button onclick="window.switchAdminTab('dashboard')" class="nav-item ${activeAdminTab === 'dashboard' ? 'active' : ''}">
        <span class="icon">📊</span>
        <span>Panel</span>
      </button>
      <button onclick="window.switchAdminTab('applications')" class="nav-item ${activeAdminTab === 'applications' ? 'active' : ''}">
        <span class="icon">📋</span>
        <span>Başvurular</span>
      </button>
      <button onclick="window.switchAdminTab('salons')" class="nav-item ${activeAdminTab === 'salons' ? 'active' : ''}">
        <span class="icon">💈</span>
        <span>Salonlar</span>
      </button>
      <button onclick="window.switchAdminTab('profile')" class="nav-item ${activeAdminTab === 'profile' ? 'active' : ''}">
        <span class="icon">👤</span>
        <span>Profil</span>
      </button>
    </nav>
  `;

  // GLOBAL BINDINGS WITH VIP MODALS
  window.switchAdminTab = (tab) => {
    activeAdminTab = tab;
    renderSuperAdminScreen(user, onTabChange);
  };

  window.approveSalonAppAdmin = async (appId) => {
    const res = await approveSalonApplication(appId);
    if (res && res.success) {
      showSuccessModal('Başarılı', `✅ Salon başvurusu onaylandı. Yeni Business ID: ${res.businessId}`);
      renderSuperAdminScreen(user, onTabChange);
    } else {
      showErrorModal('Hata', `❌ Onay başarısız: ${(res && res.error) ? res.error : 'Hata'}`);
    }
  };

  window.toggleGrantPremiumAdmin = async (businessId) => {
    const biz = allBusinesses.find(b => b.businessId === businessId);
    if (!biz) return;

    if (biz.premiumSource === 'super_admin_grant') {
      await saveRecord(`businesses/${businessId}/plan`, 'FREE', 'PUT');
      await saveRecord(`businesses/${businessId}/premiumSource`, null, 'DELETE');
      showSuccessModal('Başarılı', 'Ücretsiz Premium Grant kaldırıldı. Salon FREE pakete döndürüldü.');
    } else {
      if (grantedSalons.length >= 2) {
        showErrorModal('Limit Aşımı', '⚠️ En fazla 2 salona ücretsiz Premium grant verilebilir. Önce mevcut grantlardan birini kaldırınız.');
        return;
      }

      await saveRecord(`businesses/${businessId}/plan`, 'PREMIUM', 'PUT');
      await saveRecord(`businesses/${businessId}/premiumSource`, 'super_admin_grant', 'PUT');
      showSuccessModal('Başarılı', '⚡ Ücretsiz Süresiz Premium Grant başarıyla tanımlandı (Audit log kaydı yazıldı).');
    }

    renderSuperAdminScreen(user, onTabChange);
  };

  window.toggleSalonStatusAdmin = async (businessId) => {
    const biz = allBusinesses.find(b => b.businessId === businessId);
    if (!biz) return;
    const newStatus = biz.status === 'suspended' ? 'active' : 'suspended';
    await saveRecord(`businesses/${businessId}/status`, newStatus, 'PUT');
    showSuccessModal('Başarılı', `Salon durumu '${newStatus.toUpperCase()}' yapıldı.`);
    renderSuperAdminScreen(user, onTabChange);
  };
}