/* EZO STİLE v2 - Initial Entry Portal Screen (VIP Modals, Custom Language Selector, Session Preservation) */
import { loginUser, updateUserLanguage, getCurrentUser } from '../auth.js';
import { submitSalonApplication, fetchRecord } from '../db.js';
import { SUPPORTED_LANGUAGES, detectDefaultLanguage, isRtl, t } from '../config.js';

export function showSuccessModal(title, message, onClose) {
  const root = document.getElementById('modal-root');
  if (!root) return;

  root.innerHTML = `
    <div class="modal-overlay" onclick="window.closeModal()">
      <div class="modal-card animate-fade" onclick="event.stopPropagation()" style="border-color: var(--gold-primary); text-align: center; padding: 24px;">
        <div style="font-size: 40px; margin-bottom: 8px;">✅</div>
        <h3 style="font-size: 16px; font-weight: 800; color: #fff; margin-bottom: 6px;">${title || t('successTitle')}</h3>
        <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 18px;">${message || ''}</p>
        <button onclick="window.closeModal(); if (typeof window._onModalClose === 'function') window._onModalClose();" class="btn btn-gold" style="width: 100%; min-height: 42px;">
          ${t('closeBtn')}
        </button>
      </div>
    </div>
  `;
  window._onModalClose = onClose;
}

export function showErrorModal(title, message, onClose) {
  const root = document.getElementById('modal-root');
  if (!root) return;

  root.innerHTML = `
    <div class="modal-overlay" onclick="window.closeModal()">
      <div class="modal-card animate-fade" onclick="event.stopPropagation()" style="border-color: #ef4444; text-align: center; padding: 24px;">
        <div style="font-size: 40px; margin-bottom: 8px;">❌</div>
        <h3 style="font-size: 16px; font-weight: 800; color: #fff; margin-bottom: 6px;">${title || t('errorTitle')}</h3>
        <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 18px;">${message || ''}</p>
        <button onclick="window.closeModal(); if (typeof window._onModalClose === 'function') window._onModalClose();" class="btn btn-secondary" style="width: 100%; min-height: 42px; border-color: #ef4444; color: #ef4444;">
          ${t('closeBtn')}
        </button>
      </div>
    </div>
  `;
  window._onModalClose = onClose;
}

export function showConfirmModal(title, message, onConfirm, onCancel) {
  const root = document.getElementById('modal-root');
  if (!root) return;

  root.innerHTML = `
    <div class="modal-overlay" onclick="window.closeModal()">
      <div class="modal-card animate-fade" onclick="event.stopPropagation()" style="border-color: var(--gold-primary); text-align: center; padding: 24px;">
        <div style="font-size: 40px; margin-bottom: 8px;">⚠️</div>
        <h3 style="font-size: 16px; font-weight: 800; color: #fff; margin-bottom: 6px;">${title || t('confirmTitle')}</h3>
        <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 18px;">${message || ''}</p>
        <div style="display: flex; gap: 10px;">
          <button onclick="window.closeModal(); if (typeof window._onModalConfirm === 'function') window._onModalConfirm();" class="btn btn-gold" style="flex: 1; min-height: 42px;">
            Evet, Onayla
          </button>
          <button onclick="window.closeModal(); if (typeof window._onModalCancel === 'function') window._onModalCancel();" class="btn btn-secondary" style="flex: 1; min-height: 42px;">
            Vazgeç
          </button>
        </div>
      </div>
    </div>
  `;
  window._onModalConfirm = onConfirm;
  window._onModalCancel = onCancel;
}

export function renderPortalScreen(onAuthenticated) {
  const container = document.getElementById('app-container');
  if (!container) return;

  const currentLang = detectDefaultLanguage();
  const rtl = isRtl(currentLang);
  document.documentElement.dir = rtl ? 'rtl' : 'ltr';

  const currentLangObj = SUPPORTED_LANGUAGES.find(l => l.code === currentLang) || SUPPORTED_LANGUAGES[0];

  container.innerHTML = `
    <!-- Top Bar: Custom Language Modal Trigger -->
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
      <div style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">
        EZO STİLE v2
      </div>
      <button onclick="window.openLanguageModal()" class="btn btn-secondary" style="padding: 4px 10px; font-size: 11px; display: flex; align-items: center; gap: 6px; border-color: var(--border-gold);">
        <span>${currentLangObj.flag}</span>
        <span>${currentLangObj.name}</span>
        <span style="font-size: 9px; color: var(--gold-primary);">▼</span>
      </button>
    </div>

    <!-- Branding Header -->
    <div style="text-align: center; margin-top: 10px; margin-bottom: 24px;" class="animate-fade">
      <img src="./assets/images/ezo_stile_logo.png" style="max-width: 140px; height: auto; margin-bottom: 8px; filter: drop-shadow(0 0 14px rgba(245,158,11,0.35));" alt="EZO STİLE Logo">
      <p style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">${t('welcomeSub', currentLang)}</p>
    </div>

    <!-- STRICT 2 MAIN OPTIONS -->
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

  // Custom VIP Language Selector Modal (Requirement 4 & 5)
  window.openLanguageModal = () => {
    const root = document.getElementById('modal-root');
    if (!root) return;

    const listHtml = SUPPORTED_LANGUAGES.map(l => `
      <div onclick="window.selectAppLanguage('${l.code}')" class="card" style="padding: 12px 16px; margin-bottom: 8px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; border-color: ${l.code === currentLang ? 'var(--gold-primary)' : 'var(--border-color)'}; background: ${l.code === currentLang ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.04)'};">
        <div style="display: flex; align-items: center; gap: 12px;">
          <span style="font-size: 22px;">${l.flag}</span>
          <span style="font-size: 14px; font-weight: 700; color: #fff;">${l.name}</span>
        </div>
        ${l.code === currentLang ? '<span style="color: var(--gold-primary); font-size: 18px; font-weight: 900;">✓</span>' : ''}
      </div>
    `).join('');

    root.innerHTML = `
      <div class="modal-overlay" onclick="window.closeModal()">
        <div class="modal-card animate-fade" onclick="event.stopPropagation()">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
            <h3 style="font-size: 15px; font-weight: 800; color: var(--gold-primary); margin: 0;">🌐 Dil Seçimi / Select Language</h3>
            <button onclick="window.closeModal()" class="btn btn-secondary" style="padding: 4px 10px;">✕</button>
          </div>
          <div>${listHtml}</div>
        </div>
      </div>
    `;
  };

  // Language Change Without Logout Bug Fix (P0 - Requirement 3)
  window.selectAppLanguage = async (newLang) => {
    await updateUserLanguage(newLang);
    window.closeModal();
    
    const activeUser = getCurrentUser();
    if (activeUser) {
      if (typeof window.onAppLanguageChanged === 'function') {
        window.onAppLanguageChanged(activeUser);
      }
    } else {
      renderPortalScreen(onAuthenticated);
    }
  };

  window.openCustomerAuthModal = () => {
    const root = document.getElementById('modal-root');
    if (!root) return;

    root.innerHTML = `
      <div class="modal-overlay" onclick="window.closeModal()">
        <div class="modal-card animate-fade" onclick="event.stopPropagation()">
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

          <button onclick="window.submitCustomerAuthLogin()" class="btn btn-gold" style="width: 100%; margin-top: 8px; min-height: 44px;">
            ⚡ ${t('loginBtn', currentLang)}
          </button>
        </div>
      </div>
    `;
  };

  window.openSalonChoiceModal = () => {
    const root = document.getElementById('modal-root');
    if (!root) return;

    root.innerHTML = `
      <div class="modal-overlay" onclick="window.closeModal()">
        <div class="modal-card animate-fade" onclick="event.stopPropagation()">
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

  window.openSalonLoginModal = () => {
    const root = document.getElementById('modal-root');
    if (!root) return;

    root.innerHTML = `
      <div class="modal-overlay" onclick="window.closeModal()">
        <div class="modal-card animate-fade" onclick="event.stopPropagation()">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
            <h3 style="font-size: 15px; font-weight: 800; color: var(--gold-primary); margin: 0;">
              🔑 ${t('salonLoginTitle', currentLang)}
            </h3>
            <button onclick="window.closeModal()" class="btn btn-secondary" style="padding: 4px 10px;">✕</button>
          </div>

          <label style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">${t('phoneLabel', currentLang)}</label>
          <input type="tel" id="salon-phone" class="input-field" placeholder="05XXXXXXXXX" value="05550000002">

          <label style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">${t('passwordLabel', currentLang)}</label>
          <input type="password" id="salon-password" class="input-field" placeholder="••••••••" value="123456">

          <button onclick="window.submitSalonLogin()" class="btn btn-gold" style="width: 100%; margin-top: 8px; min-height: 44px;">
            ⚡ ${t('loginBtn', currentLang)}
          </button>
        </div>
      </div>
    `;
  };

  window.openSalonApplyModal = () => {
    const root = document.getElementById('modal-root');
    if (!root) return;

    root.innerHTML = `
      <div class="modal-overlay" onclick="window.closeModal()">
        <div class="modal-card animate-fade" onclick="event.stopPropagation()">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
            <h3 style="font-size: 15px; font-weight: 800; color: var(--gold-primary); margin: 0;">
              📋 ${t('salonApplyTitle', currentLang)}
            </h3>
            <button onclick="window.closeModal()" class="btn btn-secondary" style="padding: 4px 10px;">✕</button>
          </div>

          <input type="text" id="apply-salon-name" class="input-field" placeholder="${t('salonNameLabel')}">
          <input type="text" id="apply-owner-name" class="input-field" placeholder="${t('nameLabel')}">
          <input type="tel" id="apply-phone" class="input-field" placeholder="${t('phoneLabel')}">
          <input type="text" id="apply-city" class="input-field" placeholder="${t('cityLabel')}">
          <input type="text" id="apply-district" class="input-field" placeholder="${t('districtLabel')}">

          <button onclick="window.submitSalonApplyForm()" class="btn btn-gold" style="width: 100%; margin-top: 8px; min-height: 44px;">
            🚀 ${t('applyBtn', currentLang)}
          </button>
        </div>
      </div>
    `;
  };

  window.openStaffInviteModal = () => {
    const root = document.getElementById('modal-root');
    if (!root) return;

    root.innerHTML = `
      <div class="modal-overlay" onclick="window.closeModal()">
        <div class="modal-card animate-fade" onclick="event.stopPropagation()">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
            <h3 style="font-size: 15px; font-weight: 800; color: var(--gold-primary); margin: 0;">
              🎟️ ${t('staffInviteTitle', currentLang)}
            </h3>
            <button onclick="window.closeModal()" class="btn btn-secondary" style="padding: 4px 10px;">✕</button>
          </div>

          <p style="font-size: 11px; color: var(--text-muted); margin-bottom: 10px;">
            Salon sahibinizden aldığınız 24 saatlik davet kodunu buraya giriniz.
          </p>

          <input type="text" id="invite-token" class="input-field" placeholder="inv_XXXXXXXXXXXXXXXX">
          <input type="tel" id="invite-user-phone" class="input-field" placeholder="${t('phoneLabel')}">

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

  window.submitCustomerAuthLogin = async () => {
    const phoneEl = document.getElementById('auth-phone');
    const passwordEl = document.getElementById('auth-password');
    const phone = phoneEl ? phoneEl.value : '';
    const password = passwordEl ? passwordEl.value : '';

    if (!phone) {
      showErrorModal(t('errorTitle'), 'Lütfen geçerli bir telefon numarası giriniz.');
      return;
    }

    const user = await loginUser(phone, password);
    window.closeModal();
    if (typeof onAuthenticated === 'function') onAuthenticated(user);
  };

  window.submitSalonLogin = async () => {
    const phoneEl = document.getElementById('salon-phone');
    const passwordEl = document.getElementById('salon-password');
    const phone = phoneEl ? phoneEl.value : '';
    const password = passwordEl ? passwordEl.value : '';

    if (!phone) {
      showErrorModal(t('errorTitle'), 'Lütfen geçerli bir telefon numarası giriniz.');
      return;
    }

    const user = await loginUser(phone, password);

    if (user && user.role === 'owner') {
      const applicantUid = user.uid;
      const allAppsData = await fetchRecord('salon_applications') || {};
      const userApps = Object.values(allAppsData).filter(a => a && a.applicantUid === applicantUid);
      const pendingApp = userApps.find(a => a.status === 'pending');

      if (pendingApp) {
        window.closeModal();
        showErrorModal(t('errorTitle'), t('pendingApprovalMsg'));
        return;
      }

      if (!user.businessId) {
        window.closeModal();
        showErrorModal(t('errorTitle'), t('noSalonAccountMsg'), () => window.openSalonApplyModal());
        return;
      }
    }

    window.closeModal();
    if (typeof onAuthenticated === 'function') onAuthenticated(user);
  };

  window.submitSalonApplyForm = async () => {
    const salonName = document.getElementById('apply-salon-name').value;
    const ownerName = document.getElementById('apply-owner-name').value;
    const phone = document.getElementById('apply-phone').value;
    const city = document.getElementById('apply-city').value;
    const district = document.getElementById('apply-district').value;

    if (!salonName || !phone) {
      showErrorModal(t('errorTitle'), 'Lütfen salon adı ve telefon alanlarını doldurunuz.');
      return;
    }

    const applicantUid = 'usr_' + phone.replace(/\D/g, '');

    const allAppsData = await fetchRecord('salon_applications') || {};
    const existingApp = Object.values(allAppsData).find(a => a && a.applicantUid === applicantUid && a.status === 'pending');

    if (existingApp) {
      showErrorModal(t('errorTitle'), 'Bu telefon numarasına ait bekleyen bir salon başvurusu zaten mevcuttur.');
      return;
    }

    const appRecord = await submitSalonApplication({ salonName, ownerName, phone, city, district, applicantUid });
    if (appRecord) {
      window.closeModal();
      showSuccessModal(t('successTitle'), '✅ Başvurunuz alındı! Süper Admin onayından sonra salonunuz aktifleşecektir.');
    } else {
      showErrorModal(t('errorTitle'), 'Başvuru gönderilemedi.');
    }
  };

  window.submitAcceptStaffInvite = async () => {
    const token = document.getElementById('invite-token').value;
    const phone = document.getElementById('invite-user-phone').value;

    if (!token || !phone) {
      showErrorModal(t('errorTitle'), 'Lütfen davet kodunu ve telefon numaranızı giriniz.');
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
      window.closeModal();
      showSuccessModal(t('successTitle'), '✅ Daveti kabul edildi! Salon kadrosuna katıldınız.');
      const user = await loginUser(phone, '123456');
      if (typeof onAuthenticated === 'function') onAuthenticated(user);
    } else {
      showErrorModal(t('errorTitle'), (data && data.error) ? data.error : 'Geçersiz veya süresi dolmuş davet kodu.');
    }
  };
}