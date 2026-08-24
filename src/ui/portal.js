/* EZO STİLE v2 - Initial Entry Portal Screen */
import { loginUser } from '../auth.js';

export function renderPortalScreen(onAuthenticated) {
  const container = document.getElementById('app-container');
  if (!container) return;

  container.innerHTML = `
    <div style="text-align: center; margin-top: 24px; margin-bottom: 28px;">
      <div style="font-size: 48px; margin-bottom: 8px;">💈</div>
      <h1 class="brand-title" style="font-size: 26px; justify-content: center;">EZO STİLE v2</h1>
      <p style="font-size: 13px; color: var(--text-muted); margin-top: 4px;">VIP Berber & Güzellik Platformu</p>
    </div>

    <div style="display: flex; flex-direction: column; gap: 16px;">
      <!-- CARD 1: MÜŞTERİ -->
      <div class="card card-gold animate-fade" style="padding: 22px; cursor: pointer;" onclick="window.openAuthModal('customer')">
        <div style="display: flex; align-items: center; gap: 14px;">
          <div style="width: 52px; height: 52px; border-radius: 16px; background: var(--gold-gradient); display: flex; align-items: center; justify-content: center; font-size: 26px; color: #000;">
            👤
          </div>
          <div>
            <h3 style="font-size: 16px; font-weight: 800; color: #fff; margin-bottom: 2px;">Müşteriyim</h3>
            <p style="font-size: 12px; color: var(--text-muted);">Salon bul, randevu al, AI ile saç modelini dene.</p>
          </div>
        </div>
        <button class="btn btn-gold" style="width: 100%; margin-top: 14px; min-height: 42px;">
          Müşteri Girişi Yap / Kaydol →
        </button>
      </div>

      <!-- CARD 2: SALON / İŞLETMEYİM -->
      <div class="card animate-fade" style="padding: 22px; cursor: pointer;" onclick="window.openAuthModal('business')">
        <div style="display: flex; align-items: center; gap: 14px;">
          <div style="width: 52px; height: 52px; border-radius: 16px; background: rgba(255,255,255,0.06); border: 1px solid var(--border-gold); display: flex; align-items: center; justify-content: center; font-size: 26px; color: var(--gold-primary);">
            💈
          </div>
          <div>
            <h3 style="font-size: 16px; font-weight: 800; color: #fff; margin-bottom: 2px;">Salon / İşletmeyim</h3>
            <p style="font-size: 12px; color: var(--text-muted);">Salonunu, çalışanlarını ve randevularını yönet.</p>
          </div>
        </div>
        <button class="btn btn-outline-gold" style="width: 100%; margin-top: 14px; min-height: 42px;">
          İşletme Girişi / Kurulum →
        </button>
      </div>
    </div>
  `;

  // Global Auth Modal Handler
  window.openAuthModal = (intent) => {
    const root = document.getElementById('modal-root');
    if (!root) return;

    root.innerHTML = `
      <div class="modal-overlay" onclick="window.closeModal()">
        <div class="modal-card" onclick="event.stopPropagation()">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <h3 style="font-size: 16px; font-weight: 800; color: var(--gold-primary);">
              🔑 ${intent === 'business' ? 'İşletme Girişi' : 'Müşteri Girişi'}
            </h3>
            <button onclick="window.closeModal()" class="btn btn-secondary" style="padding: 4px 10px;">✕</button>
          </div>

          <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 16px;">
            Telefon numaranız ile tek adımda güvenli giriş yapabilirsiniz. Rolünüz backend tarafından otomatik doğrulanacaktır.
          </p>

          <label style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">Telefon Numaranız</label>
          <input type="tel" id="auth-phone" class="input-field" placeholder="05XXXXXXXXX" value="05550000001">

          <label style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">Şifreniz</label>
          <input type="password" id="auth-password" class="input-field" placeholder="••••••••" value="123456">

          <button onclick="window.submitAuthLogin()" class="btn btn-gold" style="width: 100%; margin-top: 8px; min-height: 44px;">
            ⚡ Oturum Aç / Giriş Yap
          </button>
        </div>
      </div>
    `;
  };

  window.closeModal = () => {
    const root = document.getElementById('modal-root');
    if (root) root.innerHTML = '';
  };

  window.submitAuthLogin = async () => {
    const phone = document.getElementById('auth-phone').value;
    const password = document.getElementById('auth-password').value;

    if (!phone) {
      alert('Lütfen geçerli bir telefon numarası giriniz.');
      return;
    }

    const user = await loginUser(phone, password);
    window.closeModal();
    if (typeof onAuthenticated === 'function') onAuthenticated(user);
  };
}