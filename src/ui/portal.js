import { renderSalonTypeFields } from './salon-type-fields.js';
﻿/* UNELIVO - Initial Entry Portal Screen (Kayıt Ol / Hesabım Var, Salon & Super Admin Login) */
import { loginUser, registerCustomer, registerSalonApplicant, registerStaffWithInvite, updateUserLanguage, getCurrentUser, isSalonPortalRole, logoutUserSession, setPortalMode } from '../auth.js';
import { submitSalonApplication, fetchRecord } from '../db.js';
import { SUPPORTED_LANGUAGES, applyDocumentLanguage, detectDefaultLanguage, t } from '../config.js';
import { operationErrorMessage } from '../operation-errors.js';
import { uiIcon } from './icons.js';


// Presentation and keyboard behavior only; authentication handlers stay unchanged.
function enhanceEntryDialog() {
  if (!document.querySelector('.auth-entry')) return;
  const card = document.querySelector('#modal-root .modal-card');
  if (!card) return;
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-modal', 'true');
  const heading = card.querySelector('h3');
  if (heading) { heading.id = 'auth-entry-dialog-title'; card.setAttribute('aria-labelledby', heading.id); }
  card.querySelectorAll('input').forEach(input => {
    if (!input.labels.length) input.setAttribute('aria-label', input.placeholder || t('phoneLabel'));
  });
  const focusable = () => [...card.querySelectorAll('button:not(:disabled),input:not(:disabled),[tabindex="0"]')];
  card.onkeydown = event => {
    if (event.key === 'Escape') { event.preventDefault(); window.closeModal(); return; }
    if (event.key !== 'Tab') return;
    const items = focusable(); const first = items[0]; const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  };
  (card.querySelector('input') || focusable()[0])?.focus();
}

export function showSuccessModal(title, message, onClose) {
  const root = document.getElementById('modal-root');
  if (!root) return;

  root.innerHTML = `
    <div class="modal-overlay" onclick="window.closeModal()">
      <div class="modal-card animate-fade" onclick="event.stopPropagation()" style="border-color: var(--gold-primary); text-align: center; padding: 24px;">
        <div style="font-size: 40px; margin-bottom: 8px;"></div>
        <h3 style="font-size: 16px; font-weight: 800; color: var(--theme-ink-ffffff, #fff); margin-bottom: 6px;">${title || t('successTitle')}</h3>
        <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 18px;">${message || ''}</p>
        <button onclick="window.closeModal(); if (typeof window._onModalClose === 'function') window._onModalClose();" class="btn btn-gold" style="width: 100%; min-height: 42px;">
          ${t('closeBtn')}
        </button>
      </div>
    </div>
  `;
  enhanceEntryDialog();
  window._onModalClose = onClose;
}

export function showErrorModal(title, message, onClose, buttonLabel = null) {
  // Keep the actual form nodes, their values, listeners and current wizard step.
  const host = document.querySelector('#modal-root .modal-card') || document.getElementById('app-container');
  if (!host) return false;
  let alert = host.querySelector('[data-operation-error]');
  if (!alert) {
    alert = document.createElement('div');
    alert.dataset.operationError = '';
    alert.className = 'operation-error';
    alert.setAttribute('role', 'alert');
    alert.setAttribute('aria-live', 'polite');
    host.prepend(alert);
  }
  alert.textContent = operationErrorMessage(message);
  alert.hidden = false;
  // An explicit recovery action is optional and never runs just by dismissing an error.
  if (onClose && buttonLabel) {
    const action = document.createElement('button');
    action.type = 'button'; action.className = 'btn btn-secondary';
    action.textContent = buttonLabel; action.onclick = onClose; alert.append(action);
  }
  return false;
}

export function showSuccessToast(message) {
  document.querySelector('.operation-toast')?.remove();
  const toast = document.createElement('div');
  toast.className = 'operation-toast'; toast.setAttribute('role', 'status');
  toast.textContent = message; document.body.append(toast);
  setTimeout(() => toast.remove(), 5000);
}

export function showConfirmModal(title, message, onConfirm, onCancel) {
  const root = document.getElementById('modal-root');
  if (!root) return;

  root.innerHTML = `
    <div class="modal-overlay" onclick="window.closeModal()">
      <div class="modal-card animate-fade" onclick="event.stopPropagation()" style="border-color: var(--gold-primary); text-align: center; padding: 24px;">
        <div style="font-size: 40px; margin-bottom: 8px;"></div>
        <h3 style="font-size: 16px; font-weight: 800; color: var(--theme-ink-ffffff, #fff); margin-bottom: 6px;">${title || t('confirmTitle')}</h3>
        <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 18px;">${message || ''}</p>
        <p id="modal-confirm-error" role="alert" aria-live="polite" hidden style="font-size: 12px; color:var(--theme-copy-f87171, #f87171); margin: -8px 0 14px;"></p>
        <div style="display: flex; gap: 10px;">
          <button id="btn-modal-confirm" onclick="window.handleModalConfirm(this)" class="btn btn-gold" style="flex: 1; min-height: 42px;">
            ${t('portalUi_confirm')}
          </button>
          <button id="btn-modal-cancel" onclick="window.closeModal(); if (typeof window._onModalCancel === 'function') window._onModalCancel();" class="btn btn-secondary" style="flex: 1; min-height: 42px;">
            ${t('portalUi_cancel')}
          </button>
        </div>
      </div>
    </div>
  `;
  window._onModalConfirm = onConfirm;
  window._onModalCancel = onCancel;

  window.handleModalConfirm = async (btnEl) => {
    if (btnEl?.disabled) return;
    const card = btnEl?.closest('.modal-card');
    card?.querySelector('[data-operation-error]')?.remove();
    const previousError = document.getElementById('modal-confirm-error');
    if (previousError) previousError.hidden = true;
    if (btnEl) {
      btnEl.disabled = true;
      btnEl.innerHTML = t('ownerUi_327');
    }
    try {
      if (typeof window._onModalConfirm === 'function') {
        const result = await window._onModalConfirm();
        if (result === false || card?.querySelector('[data-operation-error]')) return;
      }
      // A success handler may replace this dialog (for example with a success modal).
      if (btnEl?.isConnected) window.closeModal();
    } catch (err) {
      console.error('Modal confirm handler error:', err);
      const errorEl = document.getElementById('modal-confirm-error');
      if (errorEl) {
        errorEl.hidden = false;
        errorEl.textContent = operationErrorMessage(err);
      }
      if (btnEl) {
        btnEl.disabled = false;
        btnEl.innerHTML = t('portalUi_confirm');
      }
    } finally {
      if (btnEl?.isConnected) { btnEl.disabled = false; btnEl.innerHTML = t('portalUi_confirm'); }
    }
  };
}

export function renderPortalScreen(onAuthenticated) {
  const container = document.getElementById('app-container');
  if (!container) return;

  const currentLang = detectDefaultLanguage();
  applyDocumentLanguage(currentLang);

  const currentLangObj = SUPPORTED_LANGUAGES.find(l => l.code === currentLang) || SUPPORTED_LANGUAGES[0];

  container.innerHTML = `
    <main class="auth-entry">
      <header class="auth-entry-topbar">
        <span class="auth-entry-wordmark" dir="ltr">UNELIVO</span>
        <button type="button" id="auth-entry-language" class="btn btn-secondary">
          ${uiIcon('globe')} <span>${t('languageName_' + currentLangObj.code, currentLang)}</span>
        </button>
      </header>
      <div class="auth-entry-layout">
        <section class="auth-entry-brand">
          <img class="auth-entry-logo" src="./assets/images/unelivo-placeholder.svg" alt="${t('portalUi_logo')}">
          <h1 dir="ltr">UNELIVO</h1>
          <p>${t('welcomeSub', currentLang)}</p>
          <div class="auth-entry-preview" aria-hidden="true">
            <div class="auth-entry-preview-head">${uiIcon('store')}<i></i>${uiIcon('user')}</div>
            <div class="auth-entry-preview-card">${uiIcon('calendar')}<div><i></i><i></i></div></div>
            <div class="auth-entry-preview-grid"><span>${uiIcon('service')}</span><span>${uiIcon('clock')}</span><span>${uiIcon('users')}</span></div>
            <div class="auth-entry-preview-nav">${uiIcon('home')}${uiIcon('calendar')}${uiIcon('user')}</div>
          </div>
        </section>
        <section class="auth-entry-options" aria-label="${t('loginBtn', currentLang)}">
          <article class="auth-entry-card auth-entry-card-primary">
            <div class="auth-entry-card-heading"><span class="auth-entry-icon">${uiIcon('user')}</span><h2>${t('imCustomer', currentLang)}</h2></div>
            <p>${t('portalUi_customerIntro')}</p>
            <button type="button" id="auth-entry-customer" class="btn btn-gold">${t('loginBtn', currentLang)} / ${t('registerBtn', currentLang)} ${uiIcon('chevron')}</button>
          </article>
          <article class="auth-entry-card">
            <div class="auth-entry-card-heading"><span class="auth-entry-icon">${uiIcon('store')}</span><h2>${t('iHaveSalon', currentLang)}</h2></div>
            <p>${t('portalUi_salonIntro')}</p>
            <button type="button" id="auth-entry-salon" class="btn btn-outline-gold">${t('salonLoginTitle', currentLang)} ${uiIcon('chevron')}</button>
          </article>
        </section>
      </div>
    </main>
  `;
  container.querySelector('#auth-entry-language').addEventListener('click', () => window.openLanguageModal());
  container.querySelector('#auth-entry-customer').addEventListener('click', () => window.openCustomerChoiceModal());
  container.querySelector('#auth-entry-salon').addEventListener('click', () => window.openSalonChoiceModal());

  // Custom VIP Language Selector Modal
  window.openLanguageModal = () => {
    const root = document.getElementById('modal-root');
    if (!root) return;

    const listHtml = SUPPORTED_LANGUAGES.map(l => `
      <div onclick="window.selectAppLanguage('${l.code}')" class="card" style="padding: 12px 16px; margin-bottom: 8px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; border-color: ${l.code === currentLang ? 'var(--gold-primary)' : 'var(--border-color)'}; background: ${l.code === currentLang ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.04)'};">
        <div style="display: flex; align-items: center; gap: 12px;">
          <span style="font-size:20px;line-height:1;" aria-hidden="true">${l.flag}</span>
          <span style="font-size: 14px; font-weight: 700; color: var(--theme-ink-ffffff, #fff);">${t('languageName_' + l.code, currentLang)}</span>
        </div>
        ${l.code === currentLang ? uiIcon('check', '', t('selectedLanguage', currentLang)) : ''}
      </div>
    `).join('');

    root.innerHTML = `
      <div class="modal-overlay" onclick="window.closeModal()">
        <div class="modal-card animate-fade" onclick="event.stopPropagation()">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
            <h3 style="font-size: 15px; font-weight: 800; color: var(--gold-primary); margin: 0;"> ${t('language', currentLang)}</h3>
            <button aria-label="${t('ownerUi_099')}" onclick="window.closeModal()" class="btn btn-secondary" style="padding: 4px 10px;">${uiIcon('x')}</button>
          </div>
          <div>${listHtml}</div>
        </div>
      </div>
    `;
  };

  // Language Change Without Logout Bug Fix
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

  // CUSTOMER CHOICE MODAL: KAYIT OL vs HESABIM VAR (REQUIREMENT 1)
  window.openCustomerChoiceModal = () => {
    const root = document.getElementById('modal-root');
    if (!root) return;

    root.innerHTML = `
      <div class="modal-overlay" onclick="window.closeModal()">
        <div class="modal-card animate-fade" onclick="event.stopPropagation()">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
            <h3 style="font-size: 15px; font-weight: 800; color: var(--gold-primary); margin: 0;">
               ${t('portalUi_customerChoice')}
            </h3>
            <button aria-label="${t('ownerUi_099')}" onclick="window.closeModal()" class="btn btn-secondary" style="padding: 4px 10px;">${uiIcon('x')}</button>
          </div>

          <div style="display: flex; flex-direction: column; gap: 10px;">
            <button onclick="window.openCustomerRegisterModal()" class="btn btn-gold" style="width: 100%; min-height: 44px; text-align: left; padding-left: 16px;">
               ${t('portalUi_newCustomer')}
            </button>
            <button onclick="window.openCustomerAuthModal()" class="btn btn-outline-gold" style="width: 100%; min-height: 44px; text-align: left; padding-left: 16px;">
               ${t('portalUi_existingCustomer')}
            </button>
          </div>
        </div>
      </div>
    `;
  };

  // CUSTOMER REGISTER MODAL (REQUIREMENT 1)
  window.openCustomerRegisterModal = () => {
    const root = document.getElementById('modal-root');
    if (!root) return;

    root.innerHTML = `
      <div class="modal-overlay" onclick="window.closeModal()">
        <div class="modal-card animate-fade" onclick="event.stopPropagation()">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
            <h3 style="font-size: 15px; font-weight: 800; color: var(--gold-primary); margin: 0;">
               ${t('portalUi_registerTitle')}
            </h3>
            <button aria-label="${t('ownerUi_099')}" onclick="window.closeModal()" class="btn btn-secondary" style="padding: 4px 10px;">${uiIcon('x')}</button>
          </div>

          <label for="reg-name" style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">${t('ownerUi_253')}</label>
          <input type="text" id="reg-name" class="input-field" placeholder="${t('portalUi_nameExample')}">

          <label for="reg-phone" style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">${t('ownerUi_254')}</label>
          <input type="tel" id="reg-phone" class="input-field" placeholder="05XXXXXXXXX">

          <label for="reg-password" style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">${t('uiRemaining_293')}</label>
          <input type="password" id="reg-password" class="input-field" placeholder="••••••••">

          <label for="reg-password-confirm" style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">${t('portalUi_passwordRepeat')}</label>
          <input type="password" id="reg-password-confirm" class="input-field" placeholder="••••••••">

          <button onclick="window.submitCustomerRegister()" class="btn btn-gold" style="width: 100%; margin-top: 8px; min-height: 44px;">
             ${t('portalUi_registerLogin')}
          </button>
        </div>
      </div>
    `;
  };

  window.openCustomerAuthModal = () => {
    const root = document.getElementById('modal-root');
    if (!root) return;

    root.innerHTML = `
      <div class="modal-overlay" onclick="window.closeModal()">
        <div class="modal-card animate-fade" onclick="event.stopPropagation()">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <img src="./assets/images/unelivo-placeholder.svg" style="height: 24px; width: auto;" alt="${t('ownerUi_272')}">
              <h3 style="font-size: 15px; font-weight: 800; color: var(--gold-primary); margin: 0;">
                ${t('customerLoginTitle', currentLang)}
              </h3>
            </div>
            <button aria-label="${t('ownerUi_099')}" onclick="window.closeModal()" class="btn btn-secondary" style="padding: 4px 10px;">${uiIcon('x')}</button>
          </div>

          <label for="auth-phone" style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">${t('phoneLabel', currentLang)}</label>
          <input type="tel" id="auth-phone" class="input-field" placeholder="05XXXXXXXXX" autocomplete="tel">

          <label for="auth-password" style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">${t('passwordLabel', currentLang)}</label>
          <input type="password" id="auth-password" class="input-field" placeholder="••••••••" autocomplete="current-password">

          <button onclick="window.submitCustomerAuthLogin()" class="btn btn-gold" style="width: 100%; margin-top: 8px; min-height: 44px;">
             ${t('loginBtn', currentLang)}
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
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <button onclick="window.closeModal()" class="btn btn-secondary" style="padding: 4px 10px; font-size: 11px;">
                ${t('uiRemaining_294')}
              </button>
              <h3 style="font-size: 15px; font-weight: 800; color: var(--gold-primary); margin: 0;">
                 ${t('uiRemaining_295')}
              </h3>
            </div>
            <button aria-label="${t('ownerUi_099')}" onclick="window.closeModal()" class="btn btn-secondary" style="padding: 4px 10px;">${uiIcon('x')}</button>
          </div>

          <div style="display: flex; flex-direction: column; gap: 12px;">
            <button onclick="window.openSalonLoginModal()" class="btn btn-gold" style="width: 100%; min-height: 48px; text-align: left; padding: 12px 16px; display: flex; align-items: center; justify-content: space-between;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 20px;"></span>
                <div>
                  <div style="font-size: 13px; font-weight: 800;">${t('portalUi_existingAccount')}</div>
                  <div style="font-size: 10px; opacity: 0.85;">${t('portalUi_salonAccess')}</div>
                </div>
              </div>
              <span style="font-weight: 900;">→</span>
            </button>

            <button onclick="window.openSalonApplyModal()" class="btn btn-outline-gold" style="width: 100%; min-height: 48px; text-align: left; padding: 12px 16px; display: flex; align-items: center; justify-content: space-between;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 20px;"></span>
                <div>
                  <div style="font-size: 13px; font-weight: 800;">${t('portalUi_newSalon')}</div>
                  <div style="font-size: 10px; color: var(--text-muted);">${t('portalUi_joinPlatform')}</div>
                </div>
              </div>
              <span style="font-weight: 900;">→</span>
            </button>

            <button onclick="window.openStaffInviteModal()" class="btn btn-secondary" style="width: 100%; min-height: 48px; text-align: left; padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; border: 1px dashed var(--border-gold);">
              <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 20px;"></span>
                <div>
                  <div style="font-size: 13px; font-weight: 800;">${t('portalUi_haveInvite')}</div>
                  <div style="font-size: 10px; color: var(--text-muted);">${t('portalUi_joinSalon')}</div>
                </div>
              </div>
              <span style="font-weight: 900;">→</span>
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
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <button onclick="window.openSalonChoiceModal()" class="btn btn-secondary" style="padding: 4px 10px; font-size: 11px;">
                ${t('uiRemaining_294')}
              </button>
              <h3 style="font-size: 15px; font-weight: 800; color: var(--gold-primary); margin: 0;">
                 ${t('portalUi_existingAccount')}
              </h3>
            </div>
            <button aria-label="${t('ownerUi_099')}" onclick="window.closeModal()" class="btn btn-secondary" style="padding: 4px 10px;">${uiIcon('x')}</button>
          </div>

          <p style="font-size: 11px; color: var(--text-muted); margin-bottom: 12px;">
            ${t('portalUi_salonLoginHelp')}
          </p>

          <label for="salon-phone" style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">${t('uiRemaining_079')}</label>
          <input type="tel" id="salon-phone" class="input-field" placeholder="05XXXXXXXXX" autocomplete="tel">

          <label for="salon-password" style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">${t('uiRemaining_293')}</label>
          <input type="password" id="salon-password" class="input-field" placeholder="••••••••" autocomplete="current-password">

          <button onclick="window.submitSalonLogin()" class="btn btn-gold" style="width: 100%; margin-top: 10px; min-height: 44px;">
             ${t('uiRemaining_296')}
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
               ${t('salonApplyTitle', currentLang)}
            </h3>
            <button aria-label="${t('ownerUi_099')}" onclick="window.closeModal()" class="btn btn-secondary" style="padding: 4px 10px;">${uiIcon('x')}</button>
          </div>

          ${renderSalonTypeFields('apply-types')}
          <input type="text" id="apply-salon-name" class="input-field" placeholder="${t('salonNameLabel')}">
          <input type="text" id="apply-owner-name" class="input-field" placeholder="${t('nameLabel')}">
          <input type="tel" id="apply-phone" class="input-field" placeholder="${t('phoneLabel')}">
          <input type="password" id="apply-password" class="input-field" placeholder="${t('portalUi_passwordHint')}" autocomplete="new-password">
          <input type="password" id="apply-password-confirm" class="input-field" placeholder="${t('portalUi_repeatHint')}" autocomplete="new-password">
          <input type="text" id="apply-city" class="input-field" placeholder="${t('cityLabel')}">
          <input type="text" id="apply-district" class="input-field" placeholder="${t('districtLabel')}">

          <button onclick="window.submitSalonApplyForm()" class="btn btn-gold" style="width: 100%; margin-top: 8px; min-height: 44px;">
             ${t('applyBtn', currentLang)}
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
               ${t('staffInviteTitle', currentLang)}
            </h3>
            <button aria-label="${t('ownerUi_099')}" onclick="window.closeModal()" class="btn btn-secondary" style="padding: 4px 10px;">${uiIcon('x')}</button>
          </div>

          <p style="font-size: 11px; color: var(--text-muted); margin-bottom: 10px;">
            ${t('portalUi_inviteHelp')}
          </p>

          <input type="text" id="invite-token" class="input-field" placeholder="inv_XXXXXXXXXXXXXXXX">
          <input type="tel" id="invite-user-phone" class="input-field" placeholder="${t('phoneLabel')}">
          <input type="password" id="invite-user-password" class="input-field" placeholder="${t('passwordLabel')}" autocomplete="new-password">

          <button onclick="window.submitAcceptStaffInvite()" class="btn btn-gold" style="width: 100%; margin-top: 8px; min-height: 44px;">
             ${t('portalUi_acceptInvite')}
          </button>
        </div>
      </div>
    `;
  };

  window.closeModal = () => {
    const root = document.getElementById('modal-root');
    if (root) root.innerHTML = '';
  };

  window.submitCustomerRegister = async () => {
    const name = document.getElementById('reg-name').value;
    const phone = document.getElementById('reg-phone').value;
    const password = document.getElementById('reg-password').value;
    const passwordConfirm = document.getElementById('reg-password-confirm').value;

    if (!name || !phone) {
      showErrorModal(t('errorTitle'), t('portalUi_namePhoneRequired'));
      return;
    }
    if (!password || password.length < 6) {
      showErrorModal(t('errorTitle'), t('uiRemaining_297'));
      return;
    }
    if (password !== passwordConfirm) {
      showErrorModal(t('errorTitle'), t('portalUi_passwordMismatch'));
      return;
    }

    try {
      const user = await registerCustomer(name, phone, password);
      setPortalMode('customer');
      if (typeof onAuthenticated === 'function') await onAuthenticated(user);
    } catch (error) {
      showErrorModal(t('errorTitle'), error.message || t('portalUi_registrationFailed'));
    }
  };

  window.submitCustomerAuthLogin = async () => {
    const phoneEl = document.getElementById('auth-phone');
    const passwordEl = document.getElementById('auth-password');
    const phone = phoneEl ? phoneEl.value : '';
    const password = passwordEl ? passwordEl.value : '';

    if (!phone || !password) {
      showErrorModal(t('errorTitle'), t('portalUi_credentialsRequired'));
      return;
    }
    try {
      const user = await loginUser(phone, password);
      setPortalMode('customer');
      if (typeof onAuthenticated === 'function') await onAuthenticated(user);
    } catch (error) {
      showErrorModal(t('errorTitle'), error.message || t('portalUi_loginFailed'));
    }
  };

  window.submitSalonLogin = async () => {
    const phoneEl = document.getElementById('salon-phone');
    const passwordEl = document.getElementById('salon-password');
    const phone = phoneEl ? phoneEl.value : '';
    const password = passwordEl ? passwordEl.value : '';

    if (!phone || !password) {
      showErrorModal(t('errorTitle'), t('portalUi_credentialsRequired'));
      return;
    }
    let user;
    try {
      user = await loginUser(phone, password);
    } catch (error) {
      showErrorModal(t('errorTitle'), error.message || t('portalUi_loginFailed'));
      return;
    }

    if (!isSalonPortalRole(user && user.role)) {
      await logoutUserSession();
      showErrorModal(t('errorTitle'), t('portalUi_customerAccount'));
      return;
    }
    setPortalMode('salon');

    if (user && user.role === 'owner') {
      const applicantUid = user.uid;
      const allAppsData = await fetchRecord('salon_applications') || {};
      const userApps = Object.values(allAppsData).filter(a => a && a.applicantUid === applicantUid);
      const pendingApp = userApps.find(a => a.status === 'pending');

      if (pendingApp) {
        showErrorModal(t('errorTitle'), t('pendingApprovalMsg'));
        return;
      }

      if (!user.businessId) {
        showErrorModal(t('errorTitle'), t('noSalonAccountMsg'), () => window.openSalonApplyModal());
        return;
      }
    }

    if (typeof onAuthenticated === 'function') await onAuthenticated(user);
  };

  window.submitSalonApplyForm = async () => {
    const salonTypes=[...document.querySelectorAll('input[name="apply-types"]:checked')].map(el=>el.value);
    if(!salonTypes.length)return showErrorModal(t('errorTitle'),'En az bir işletme türü seçin.');
    const salonName = document.getElementById('apply-salon-name').value;
    const ownerName = document.getElementById('apply-owner-name').value;
    const phone = document.getElementById('apply-phone').value;
    const password = document.getElementById('apply-password').value;
    const passwordConfirm = document.getElementById('apply-password-confirm').value;
    const city = document.getElementById('apply-city').value;
    const district = document.getElementById('apply-district').value;

    if (!salonName || !ownerName || !phone || !city || !district) {
      showErrorModal(t('errorTitle'), t('portalUi_applicationRequired'));
      return;
    }
    if (!password || password.length < 6) {
      showErrorModal(t('errorTitle'), t('portalUi_passwordLength'));
      return;
    }
    if (password !== passwordConfirm) {
      showErrorModal(t('errorTitle'), t('portalUi_passwordMismatch'));
      return;
    }

    try {
      await registerSalonApplicant(ownerName, phone, password, { salonName, city, district, salonTypes });
      await logoutUserSession();
      window.closeModal();
      showSuccessModal(t('successTitle'), t('portalUi_applicationCreated'));
    } catch (error) {
      showErrorModal(t('errorTitle'), error.message || t('portalUi_applicationFailed'));
    }
  };

  window.submitAcceptStaffInvite = async () => {
    const token = document.getElementById('invite-token').value.trim();
    const phone = document.getElementById('invite-user-phone').value;
    const password = document.getElementById('invite-user-password').value;

    if (!token || !phone || !password) {
      showErrorModal(t('errorTitle'), t('portalUi_inviteRequired'));
      return;
    }
    try {
      const user = await registerStaffWithInvite(token, phone, password);
      if (typeof onAuthenticated === 'function' && await onAuthenticated(user) === false) return;
      showSuccessModal(t('successTitle'), t('portalUi_inviteAccepted'));
    } catch (error) {
      const message = error.message || t('uiRemaining_298');
      const loginSuggested = /Salon Girişi|giriş yap/i.test(message);
      showErrorModal(t('staffUi_77'), message, loginSuggested ? () => window.openSalonLoginModal() : null, loginSuggested ? t('uiRemaining_296') : t('ownerUi_099'));
    }
  };
  let entryReturnFocus = null;
  for (const name of ['openLanguageModal', 'openCustomerChoiceModal', 'openCustomerRegisterModal', 'openCustomerAuthModal', 'openSalonChoiceModal', 'openSalonLoginModal', 'openSalonApplyModal', 'openStaffInviteModal']) {
    const open = window[name];
    window[name] = (...args) => {
      if (container.contains(document.activeElement)) entryReturnFocus = document.activeElement;
      open(...args);
      enhanceEntryDialog();
    };
  }
  const closeEntryDialog = window.closeModal;
  window.closeModal = () => { closeEntryDialog(); if (entryReturnFocus?.isConnected) entryReturnFocus.focus(); };
  for (const name of ['submitCustomerRegister', 'submitCustomerAuthLogin', 'submitSalonLogin', 'submitSalonApplyForm', 'submitAcceptStaffInvite']) {
    const submit = window[name];
    let pending = false;
    window[name] = async (...args) => {
      if (pending) return;
      pending = true;
      const card = document.querySelector('#modal-root .modal-card');
      const buttons = card ? [...card.querySelectorAll('button')] : [];
      const states = buttons.map(button => button.disabled);
      card?.setAttribute('aria-busy', 'true');
      buttons.forEach(button => { button.disabled = true; });
      try { return await submit(...args); }
      catch (error) { showErrorModal(t('errorTitle'), error); }
      finally {
        pending = false;
        card?.removeAttribute('aria-busy');
        buttons.forEach((button, index) => { button.disabled = states[index]; });
      }
    };
  }

}
export async function completeExplicitLogout(onPortalRendered) {
  try {
    await logoutUserSession();
  } catch (e) {
    console.error('Logout cleanup error:', e);
  } finally {
    // Forcibly clear modal root and body scroll locks
    const modalRoot = document.getElementById('modal-root');
    if (modalRoot) modalRoot.innerHTML = '';
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';

    // Clear app container
    const appContainer = document.getElementById('app-container');
    if (appContainer) appContainer.innerHTML = '';

    // Render portal screen directly
    renderPortalScreen((authenticatedUser) => {
      if (typeof onPortalRendered === 'function') {
        onPortalRendered(authenticatedUser);
      }
    });
  }
}
window.completeExplicitLogout = completeExplicitLogout;
