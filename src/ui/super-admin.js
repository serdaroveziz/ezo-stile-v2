/* EZO STİLE v2 - Super Admin Platform Command Center */
import { getSalonApplications, approveSalonApplication, fetchRecord } from '../db.js';
import { getCurrentUser } from '../auth.js';
import { renderOwnerScreen } from './owner.js';

let activeSuperAdminTab = 'home';
let viewingBusinessId = null;

export async function renderSuperAdminScreen() {
  const container = document.getElementById('app-container');
  if (!container) return;

  const user = getCurrentUser() || { role: 'super_admin', name: 'Süper Admin' };

  if (user.role !== 'super_admin') {
    container.innerHTML = `
      <div class="card card-gold text-center" style="padding: 24px;">
        <div style="font-size: 36px; margin-bottom: 8px;">🔒</div>
        <h3 style="font-size: 16px; color: var(--danger);">Erişim Engellendi</h3>
        <p style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">Süper Admin yetkiniz bulunmamaktadır.</p>
      </div>
    `;
    return;
  }

  // 1. SALON VIEWING MODE (SUPPORT IMPERSONATION BANNER)
  if (viewingBusinessId) {
    const tempUser = { ...user, businessId: viewingBusinessId, role: 'owner' };
    
    // Inject Banner at top of page
    const bannerHtml = `
      <div style="background: linear-gradient(135deg, #f59e0b 0%, #b45309 100%); color: #000; padding: 10px 16px; text-align: center; font-size: 12px; font-weight: 800; display: flex; justify-content: space-between; align-items: center; border-radius: 12px; margin-bottom: 12px;">
        <span>🛡️ Süper Admin olarak [${viewingBusinessId}] salonu görüntüleniyor</span>
        <button onclick="window.exitSupportViewingMode()" class="btn btn-secondary" style="padding: 2px 8px; font-size: 10px; background: #000; color: #fff;">
          ← Süper Admin Paneline Dön
        </button>
      </div>
    `;

    window.exitSupportViewingMode = () => {
      viewingBusinessId = null;
      renderSuperAdminScreen();
    };

    container.innerHTML = bannerHtml + `<div id="sub-app-root"></div>`;
    renderOwnerScreen();
    return;
  }

  // 2. FETCH SYSTEM METRICS & DATA
  const applications = await getSalonApplications();
  const pendingApps = applications.filter(a => a.status === 'pending');
  const approvedApps = applications.filter(a => a.status === 'approved');

  const rawBusinesses = await fetchRecord('businesses') || {};
  const businesses = Object.values(rawBusinesses);
  const activeSalons = businesses.filter(b => b && b.status !== 'suspended');

  const rawUsers = await fetchRecord('users') || {};
  const usersList = Object.values(rawUsers);

  const rawApts = await fetchRecord('appointments') || {};
  const aptsList = Object.values(rawApts);
  const todayStr = new Date().toISOString().split('T')[0];
  const todayApts = aptsList.filter(a => a && a.date === todayStr);

  let mainContent = '';

  if (activeSuperAdminTab === 'home') {
    mainContent = `
      <!-- OPERATIONAL METRIC GRID -->
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 16px;">
        <div class="card" style="padding: 12px; text-align: center;">
          <div style="font-size: 18px; font-weight: 900; color: var(--gold-primary);">${businesses.length}</div>
          <div style="font-size: 10px; color: var(--text-muted);">Toplam Salon</div>
        </div>
        <div class="card" style="padding: 12px; text-align: center;">
          <div style="font-size: 18px; font-weight: 900; color: var(--success);">${activeSalons.length}</div>
          <div style="font-size: 10px; color: var(--text-muted);">Aktif Salon</div>
        </div>
        <div class="card" style="padding: 12px; text-align: center;">
          <div style="font-size: 18px; font-weight: 900; color: var(--danger);">${pendingApps.length}</div>
          <div style="font-size: 10px; color: var(--text-muted);">Bekleyen Başvuru</div>
        </div>
        <div class="card" style="padding: 12px; text-align: center;">
          <div style="font-size: 18px; font-weight: 900; color: #fff;">${usersList.length}</div>
          <div style="font-size: 10px; color: var(--text-muted);">Kullanıcı</div>
        </div>
        <div class="card" style="padding: 12px; text-align: center;">
          <div style="font-size: 18px; font-weight: 900; color: var(--gold-primary);">${todayApts.length}</div>
          <div style="font-size: 10px; color: var(--text-muted);">Bugünkü Randevu</div>
        </div>
        <div class="card" style="padding: 12px; text-align: center;">
          <div style="font-size: 18px; font-weight: 900; color: var(--success);">${aptsList.length}</div>
          <div style="font-size: 10px; color: var(--text-muted);">Toplam Randevu</div>
        </div>
      </div>

      <!-- PENDING APPLICATIONS MODULE -->
      <div class="card animate-fade" style="padding: 16px;">
        <h3 style="font-size: 14px; font-weight: 800; color: var(--gold-primary); margin-bottom: 10px; display: flex; justify-content: space-between;">
          <span>📋 Bekleyen Başvurular</span>
          <span style="font-size: 11px; color: var(--text-muted);">${pendingApps.length} Adet</span>
        </h3>
        ${pendingApps.length === 0 ? '<div style="font-size: 12px; color: var(--text-muted); text-align: center; padding: 12px;">Bekleyen salon başvurusu yok.</div>' :
          pendingApps.map(app => `
            <div class="card card-gold" style="padding: 12px; margin-bottom: 8px;">
              <div style="font-size: 13px; font-weight: 800; color: #fff;">💈 ${app.salonName}</div>
              <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">📍 ${app.city} • 📞 ${app.phone}</div>
              <button onclick="window.handleApproveApplication('${app.appId}')" class="btn btn-gold" style="width: 100%; margin-top: 8px; min-height: 34px; font-size: 11px;">
                ✅ Onayla & BusinessId Ata
              </button>
            </div>
          `).join('')
        }
      </div>
    `;
  } else if (activeSuperAdminTab === 'salons') {
    mainContent = `
      <div class="card animate-fade" style="padding: 16px;">
        <h3 style="font-size: 15px; font-weight: 800; color: var(--gold-primary); margin-bottom: 12px;">💈 Tüm Salonlar</h3>
        ${businesses.length === 0 ? '<div style="font-size: 12px; color: var(--text-muted); text-align: center;">Kayıtlı salon bulunmuyor.</div>' :
          businesses.map(b => `
            <div class="card ${b.status === 'suspended' ? '' : 'card-gold'}" style="padding: 12px; margin-bottom: 10px;">
              <div style="display: flex; justify-content: space-between;">
                <div>
                  <div style="font-size: 14px; font-weight: 800; color: #fff;">💈 ${b.name}</div>
                  <div style="font-size: 11px; color: var(--gold-primary); margin-top: 2px;">ID: ${b.businessId} • 📍 ${b.city || 'Şehir'}</div>
                  <div style="font-size: 10px; color: var(--text-muted); margin-top: 2px;">Durum: ${b.status === 'suspended' ? '🚫 ASKIDA' : '✅ AKTİF'}</div>
                </div>
                <span class="badge ${b.status === 'suspended' ? 'badge-rejected' : 'badge-approved'}">
                  ${b.status === 'suspended' ? 'ASKIDA' : 'AKTİF'}
                </span>
              </div>

              <div style="display: flex; gap: 6px; margin-top: 10px;">
                <button onclick="window.enterSupportViewingMode('${b.businessId}')" class="btn btn-outline-gold" style="flex: 1; min-height: 32px; font-size: 10px;">
                  👁️ Görüntüle
                </button>
                ${b.status === 'suspended' ? `
                  <button onclick="window.toggleSalonStatus('${b.businessId}', 'reactivate')" class="btn btn-gold" style="flex: 1; min-height: 32px; font-size: 10px;">
                    ✅ Aktifleştir
                  </button>
                ` : `
                  <button onclick="window.toggleSalonStatus('${b.businessId}', 'suspend')" class="btn btn-secondary" style="flex: 1; min-height: 32px; font-size: 10px; color: var(--danger);">
                    🚫 Askıya Al
                  </button>
                `}
              </div>
            </div>
          `).join('')
        }
      </div>
    `;
  } else if (activeSuperAdminTab === 'users') {
    mainContent = `
      <div class="card animate-fade" style="padding: 16px;">
        <h3 style="font-size: 15px; font-weight: 800; color: var(--gold-primary); margin-bottom: 12px;">👤 Kullanıcı Yönetimi</h3>
        ${usersList.map(u => `
          <div class="card" style="padding: 10px; margin-bottom: 8px;">
            <div style="display: flex; justify-content: space-between;">
              <div>
                <div style="font-size: 12px; font-weight: 800; color: #fff;">${u.name || 'Kullanıcı'} (${u.phone || 'Telefon yok'})</div>
                <div style="font-size: 10px; color: var(--gold-primary); margin-top: 2px;">Rol: ${u.role} • UID: ${u.uid}</div>
              </div>
              <span class="badge ${u.status === 'disabled' ? 'badge-rejected' : 'badge-approved'}">${u.status || 'active'}</span>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  container.innerHTML = `
    <!-- HEADER BAR -->
    <div class="header-bar">
      <div class="brand-title">🛡️ EZO STİLE — Süper Admin</div>
      <span class="badge badge-approved">PLATFORM HAKİMİ</span>
    </div>

    <!-- MAIN CONTENT AREA -->
    ${mainContent}

    <!-- 5-TAB BOTTOM NAVIGATION BAR -->
    <nav class="bottom-nav">
      <button onclick="window.switchSuperAdminTab('home')" class="nav-item ${activeSuperAdminTab === 'home' ? 'active' : ''}">
        <span class="icon">🏠</span>
        <span>Ana Sayfa</span>
      </button>
      <button onclick="window.switchSuperAdminTab('salons')" class="nav-item ${activeSuperAdminTab === 'salons' ? 'active' : ''}">
        <span class="icon">💈</span>
        <span>Salonlar</span>
      </button>
      <button onclick="window.switchSuperAdminTab('users')" class="nav-item ${activeSuperAdminTab === 'users' ? 'active' : ''}">
        <span class="icon">👤</span>
        <span>Kullanıcılar</span>
      </button>
      <button onclick="window.switchSuperAdminTab('audit')" class="nav-item ${activeSuperAdminTab === 'audit' ? 'active' : ''}">
        <span class="icon">📜</span>
        <span>Audit Log</span>
      </button>
    </nav>
  `;

  window.switchSuperAdminTab = (tabKey) => {
    activeSuperAdminTab = tabKey;
    renderSuperAdminScreen();
  };

  window.enterSupportViewingMode = (bizId) => {
    viewingBusinessId = bizId;
    renderSuperAdminScreen();
  };

  window.toggleSalonStatus = async (businessId, action) => {
    const reason = prompt(action === 'suspend' ? 'Askıya alma nedenini giriniz:' : 'Aktifleştirme notu:');
    const res = await fetch('/api/salon/toggle-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessId, action, superAdminUid: user.uid, reason })
    });

    if (res.ok) {
      alert(`✅ Salon durumu '${action}' olarak güncellendi!`);
      renderSuperAdminScreen();
    } else {
      alert('⚠️ Salon durumu güncellenemedi.');
    }
  };

  window.handleApproveApplication = async (appId) => {
    if (!confirm('Bu salon başvurusunu onaylamak ve kullanıcıyı Salon Sahibi (owner) yapmak istiyor musunuz?')) return;

    const res = await approveSalonApplication(appId);
    if (res.success) {
      alert(`✅ Salon başvurusu onaylandı!\nAtanan Business ID: ${res.businessId}\nKullanıcı rolü 'owner' yapıldı.`);
      renderSuperAdminScreen();
    } else {
      alert('⚠️ Onaylama sırasında hata oluştu.');
    }
  };
}