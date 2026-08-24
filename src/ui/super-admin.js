/* EZO STİLE v2 - Super Admin Dashboard & Application Approval Engine */
import { getSalonApplications, approveSalonApplication } from '../db.js';
import { getCurrentUser } from '../auth.js';

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

  const applications = await getSalonApplications();
  const pendingApps = applications.filter(a => a.status === 'pending');
  const approvedApps = applications.filter(a => a.status === 'approved');

  let pendingListHtml = '';
  if (pendingApps.length === 0) {
    pendingListHtml = `<div style="font-size: 12px; color: var(--text-muted); text-align: center; padding: 16px;">Bekleyen salon başvurusu bulunmuyor.</div>`;
  } else {
    pendingListHtml = pendingApps.map(app => `
      <div class="card card-gold" style="padding: 16px; margin-bottom: 12px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
          <div>
            <h4 style="font-size: 15px; font-weight: 800; color: #fff;">💈 ${app.salonName}</h4>
            <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">📍 ${app.city} / ${app.district} • 📞 ${app.phone}</div>
            <div style="font-size: 11px; color: var(--gold-primary); margin-top: 2px;">Adres: ${app.address}</div>
          </div>
          <span class="badge badge-pending">BEKLEYEN</span>
        </div>

        <div style="display: flex; gap: 8px; margin-top: 12px;">
          <button onclick="window.handleApproveApplication('${app.appId}')" class="btn btn-gold" style="flex: 1; min-height: 38px; font-size: 12px;">
            ✅ Onayla & BusinessId Ata
          </button>
        </div>
      </div>
    `).join('');
  }

  container.innerHTML = `
    <!-- HEADER BAR -->
    <div class="header-bar">
      <div class="brand-title">⚡ EZO STİLE Süper Admin</div>
      <span class="badge badge-approved">SÜPER ADMİN</span>
    </div>

    <!-- SYSTEM METRICS SUMMARY -->
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px;">
      <div class="card" style="padding: 14px; text-align: center;">
        <div style="font-size: 20px; font-weight: 900; color: var(--gold-primary);">${pendingApps.length}</div>
        <div style="font-size: 11px; color: var(--text-muted);">Bekleyen Başvuru</div>
      </div>
      <div class="card" style="padding: 14px; text-align: center;">
        <div style="font-size: 20px; font-weight: 900; color: var(--success);">${approvedApps.length}</div>
        <div style="font-size: 11px; color: var(--text-muted);">Aktif / Onaylı Salon</div>
      </div>
    </div>

    <!-- PENDING APPLICATIONS MODULE -->
    <div class="card animate-fade" style="padding: 18px;">
      <h3 style="font-size: 15px; font-weight: 800; color: var(--gold-primary); margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between;">
        <span>📋 Bekleyen Salon Başvuruları</span>
        <span style="font-size: 11px; color: var(--text-muted);">${pendingApps.length} Adet</span>
      </h3>
      ${pendingListHtml}
    </div>

    <button onclick="window.location.reload()" class="btn btn-secondary" style="width: 100%; min-height: 40px; margin-top: 12px;">
      🔄 Sayfayı Yenile
    </button>
  `;

  window.handleApproveApplication = async (appId) => {
    if (!confirm('Bu salon başvurusunu onaylamak ve kullanıcıyı Salon Sahibi (owner) yapmak istiyor musunuz?')) return;

    const res = await approveSalonApplication(appId);
    if (res.success) {
      alert(`✅ Salon başvurusu onaylandı!\nAtanan Business ID: ${res.businessId}\nKullanıcı rolü 'owner' yapıldı.`);
      renderSuperAdminScreen();
    } else {
      alert('⚠️ Onaylama sırasında hata oluştu: ' + (res.error || 'Bilinmeyen hata'));
    }
  };
}