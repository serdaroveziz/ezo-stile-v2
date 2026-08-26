/* EZO STİLE v2 - Initial Entry Portal Screen (2 Main Options, 5 Languages, RTL Support) */
import { loginUser, updateUserLanguage } from '../auth.js';
import { submitSalonApplication, fetchRecord } from '../db.js';
import { SUPPORTED_LANGUAGES, detectDefaultLanguage, isRtl, t } from '../config.js';

export function renderPortalScreen(onAuthenticated) {
  const container = document.getElementById('app-container');
  if (!container) return;

  const currentLang = detectDefaultLanguage();
  const rtl = isRtl(currentLang);
  document.documentElement.dir = rtl ? 'rtl' : 'ltr';

  const langOptionsHtml = SUPPORTED_LANGUAGES.map(l => `
    <option value="${l.code}" ${l.code === currentLang ? 'selected' : ''}>
      ${l.flag} ${l.name}
    </option>
  `).join('');

  container.innerHTML = `
    <!-- Top Bar: 5-Language Selector -->
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
      <div style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">
        EZO STİLE v2
      </div>
      <div style="display: flex; align-items: center; gap: 6px;">
        <span style="font-size: 11px; color: var(--text-muted);">🌐</span>
        <select id="portal-lang-select" onchange="window.changePortalLanguage(this.value)" class="input-field" style="margin: 0; padding: 4px 8px; font-size: 11px; width: auto; background: rgba(0,0,0,0.6);">
          ${langOptionsHtml}
        </select>
      </div>
    </div>

    <!-- Official Branding Splash Header -->
    <div style="text-align: center; margin-top: 10px; margin-bottom: 24px;" class="animate-fade">
      <img src="./assets/images/ezo_stile_logo.png" style="max-width: 140px; height: auto; margin-bottom: 8px; filter: drop-shadow(0 0 14px rgba(245,158,11,0.35));" alt="EZO STİLE Logo">
      <p style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">${t('welcomeSub', currentLang)}</p>
    </div>

    <!-- STRICT 2 MAIN OPTIONS (Müşteriyim VS Salonum Var) -->
    <div style="display: flex; flex-direction: column; gap: 16px;">
      <!-- OPTION 1: MÜŞTERİYİM -->
      <div class="card card-gold animate-fade" style="padding: 22px; cursor: pointer;" onclick="window.openCustomerAuthModal()">
        <div style="display: flex; align-items: center; gap: 14px;">
          <div style="width: 52px; height: 52px; border-radius: 16px; background: var(--gold-gradient); display: flex; align-items: center; justify-content: center; font-size: 26px; color: #000; flex-shrink: 0;">
            👤
          </div>
          <div>
            <h3 style="font-size: 16px; font-weight: 800; color: #fff; margin-bottom: 2px;">${t('imCustomer', currentLang)}</h3>
            <p style="font-size: 12px; color: var(--text-muted);">Salon bul, randevu al, AI ile saç modelini dene.</p>
          </div>
        </div>
        <button class="btn btn-gold" style="width: 100%; margin-top: 14px; min-height: 42px;">
          ${t('loginBtn', currentLang)} / ${t('registerBtn', currentLang)} →
        </button>
      </div>

      <!-- OPTION 2: SALONUM VAR -->
      <div class="card animate-fade" style="padding: 22px; cursor: pointer;" onclick="window.openSalonChoiceModal()">
        <div style="display: flex; align-items: center; gap: 14px;">
          <div style="width: 52px; height: 52px; border-radius: 16px; background: rgba(255,255,255,0.06); border: 1px solid var(--border-gold); display: flex; align-items: center; justify-content: center; font-size: 26px; color: var(--gold-primary); flex-shrink: 0;">
            💈
          </div>
          <div>
            <h3 style="font-size: 16px; font-weight: 800; color: #fff; margin-bottom: 2px;">${t('iHaveSalon', currentLang)}</h3>
            <p style="font-size: 12px; color: var(--text-muted);">Salon girişi, başvuru veya çalışan davet kodu ile katılım.</p>
          </div>
        </div>
        <button class="btn btn-outline-gold" style="width: 100%; margin-top: 14px; min-height: 42px;">
          ${t('salonLoginTitle', currentLang)} →
        </button>
      </div>
    </div>
  `;

  // Global Language Changer
  window.changePortalLanguage = async (newLang) => {
    await updateUserLanguage(newLang);
    renderPortalScreen(onAuthenticated);
  };

  // 1. Customer Auth Modal (Phone + Password Login/Register)
  window.openCustomerAuthModal = () => {
    const root = document.getElementById('modal-root');
    if (!root) return;

    root.innerHTML = `
      <div class="modal-overlay" onclick="window.closeModal()">
        <div class="modal-card" onclick="event.stopPropagation()">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <img src="./assets/images/ezo_stile_logo.png" style="height: 24px; width: auto;" alt="Logo">
              <h3 style="font-size: 15px; font-weight: 800; color: var(--gold-primary); margin: 0;">
                ${t('customerLoginTitle', currentLang)}
              </h3>
            </div>
            <button onclick="window.closeModal()" class="btn btn-secondary" style="padding: 4px 10px;">✕</button>
          </div>

          <label style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">${t('phoneLabel', currentLang)}</label>
          <input type="tel" id="auth-phone" class="input-field" placeholder="05XXXXXXXXX" value="05550000001">

          <label style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">${t('passwordLabel', currentLang)}</label>
          <input type="password" id="auth-password" class="input-field" placeholder="••••••••" value="123456">

          <button onclick="window.submitAuthLogin()" class="btn btn-gold" style="width: 100%; margin-top: 8px; min-height: 44px;">
            ⚡ ${t('loginBtn', currentLang)}
          </button>
        </div>
      </div>
    `;
  };

  // 2. Salon Choice Modal (Salon Girişi, Salon Başvurusu, Çalışan Davet Kodum Var)
  window.openSalonChoiceModal = () => {
    const root = document.getElementById('modal-root');
    if (!root) return;

    root.innerHTML = `
      <div class="modal-overlay" onclick="window.closeModal()">
        <div class="modal-card" onclick="event.stopPropagation()">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
            <h3 style="font-size: 15px; font-weight: 800; color: var(--gold-primary); margin: 0;">
              💈 ${t('iHaveSalon', currentLang)}
            </h3>
            <button onclick="window.closeModal()" class="btn btn-secondary" style="padding: 4px 10px;">✕</button>
          </div>

          <div style="display: flex; flex-direction: column; gap: 10px;">
            <button onclick="window.openSalonLoginModal()" class="btn btn-gold" style="width: 100%; min-height: 44px; text-align: left; padding-left: 16px;">
              🔑 1. ${t('salonLoginTitle', currentLang)}
            </button>
            <button onclick="window.openSalonApplyModal()" class="btn btn-outline-gold" style="width: 100%; min-height: 44px; text-align: left; padding-left: 16px;">
              📋 2. ${t('salonApplyTitle', currentLang)}
            </button>
            <button onclick="window.openStaffInviteModal()" class="btn btn-secondary" style="width: 100%; min-height: 44px; text-align: left; padding-left: 16px; border: 1px dashed var(--border-gold);">
              🎟️ 3. ${t('staffInviteTitle', currentLang)}
            </button>
          </div>
        </div>
      </div>
    `;
  };

  // Salon Login Modal
  window.openSalonLoginModal = () => {
    const root = document.getElementById('modal-root');
    if (!root) return;

    root.innerHTML = `
      <div class="modal-overlay" onclick="window.closeModal()">
        <div class="modal-card" onclick="event.stopPropagation()">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
            <h3 style="font-size: 15px; font-weight: 800; color: var(--gold-primary); margin: 0;">
              🔑 ${t('salonLoginTitle', currentLang)}
            </h3>
            <button onclick="window.closeModal()" class="btn btn-secondary" style="padding: 4px 10px;">✕</button>
          </div>

          <label style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">${t('phoneLabel', currentLang)}</label>
          <input type="tel" id="auth-phone" class="input-field" placeholder="05XXXXXXXXX" value="05550000002">

          <label style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">${t('passwordLabel', currentLang)}</label>
          <input type="password" id="auth-password" class="input-field" placeholder="••••••••" value="123456">

          <button onclick="window.submitAuthLogin()" class="btn btn-gold" style="width: 100%; margin-top: 8px; min-height: 44px;">
            ⚡ ${t('loginBtn', currentLang)}
          </button>
        </div>
      </div>
    `;
  };

  // Salon Application Modal
  window.openSalonApplyModal = () => {
    const root = document.getElementById('modal-root');
    if (!root) return;

    root.innerHTML = `
      <div class="modal-overlay" onclick="window.closeModal()">
        <div class="modal-card" onclick="event.stopPropagation()">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
            <h3 style="font-size: 15px; font-weight: 800; color: var(--gold-primary); margin: 0;">
              📋 ${t('salonApplyTitle', currentLang)}
            </h3>
            <button onclick="window.closeModal()" class="btn btn-secondary" style="padding: 4px 10px;">✕</button>
          </div>

          <input type="text" id="apply-salon-name" class="input-field" placeholder="Salon Adı">
          <input type="tel" id="apply-phone" class="input-field" placeholder="Telefon Numarası">
          <input type="text" id="apply-city" class="input-field" placeholder="Şehir (Örn: İstanbul)">
          <input type="text" id="apply-address" class="input-field" placeholder="Adres Detayı">

          <button onclick="window.submitSalonApplyForm()" class="btn btn-gold" style="width: 100%; margin-top: 8px; min-height: 44px;">
            🚀 ${t('applyBtn', currentLang)}
          </button>
        </div>
      </div>
    `;
  };

  // Staff Invite Token Modal
  window.openStaffInviteModal = () => {
    const root = document.getElementById('modal-root');
    if (!root) return;

    root.innerHTML = `
      <div class="modal-overlay" onclick="window.closeModal()">
        <div class="modal-card" onclick="event.stopPropagation()">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
            <h3 style="font-size: 15px; font-weight: 800; color: var(--gold-primary); margin: 0;">
              🎟️ ${t('staffInviteTitle', currentLang)}
            </h3>
            <button onclick="window.closeModal()" class="btn btn-secondary" style="padding: 4px 10px;">✕</button>
          </div>

          <p style="font-size: 11px; color: var(--text-muted); margin-bottom: 10px;">
            Salon sahibinizden aldığınız 24 saatlik davet token koda buraya giriniz.
          </p>

          <input type="text" id="invite-token" class="input-field" placeholder="inv_XXXXXXXXXXXXXXXX">
          <input type="tel" id="invite-user-phone" class="input-field" placeholder="Kendi Telefon Numaranız">

          <button onclick="window.submitAcceptStaffInvite()" class="btn btn-gold" style="width: 100%; margin-top: 8px; min-height: 44px;">
            ✅ Daveti Kabul Et & Katıl
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
    const phoneEl = document.getElementById('auth-phone');
    const passwordEl = document.getElementById('auth-password');
    const phone = phoneEl ? phoneEl.value : '';
    const password = passwordEl ? passwordEl.value : '';

    if (!phone) {
      alert('Lütfen geçerli bir telefon numarası giriniz.');
      return;
    }

    const user = await loginUser(phone, password);
    window.closeModal();
    if (typeof onAuthenticated === 'function') onAuthenticated(user);
  };

  window.submitSalonApplyForm = async () => {
    const salonName = document.getElementById('apply-salon-name').value;
    const phone = document.getElementById('apply-phone').value;
    const city = document.getElementById('apply-city').value;
    const address = document.getElementById('apply-address').value;

    if (!salonName || !phone) {
      alert('Lütfen salon adı ve telefon alanlarını doldurunuz.');
      return;
    }

    const appRecord = await submitSalonApplication({ salonName, phone, city, address, applicantUid: 'usr_' + phone.replace(/\D/g, '') });
    if (appRecord) {
      alert('✅ Başvurunuz alındı! Süper Admin onayından sonra salonunuz aktifleşecektir.');
      window.closeModal();
    } else {
      alert('❌ Başvuru gönderilemedi.');
    }
  };

  window.submitAcceptStaffInvite = async () => {
    const token = document.getElementById('invite-token').value;
    const phone = document.getElementById('invite-user-phone').value;

    if (!token || !phone) {
      alert('Lütfen davet kodunu ve telefon numaranızı giriniz.');
      return;
    }

    const userUid = 'usr_' + phone.replace(/\D/g, '');
    const res = await fetch('/api/staff/accept-invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, userUid, userPhone: phone })
    }).catch(() => null);

    const data = res ? await res.json().catch(() => null) : null;
    if (res && res.ok && data && data.success) {
      alert('✅ Davet kabul edildi! Salon kadrosuna katıldınız.');
      window.closeModal();
      const user = await loginUser(phone, '123456');
      if (typeof onAuthenticated === 'function') onAuthenticated(user);
    } else {
      alert(`❌ ${(data && data.error) ? data.error : 'Geçersiz veya süresi dolmuş davet kodu.'}`);
    }
  };
}