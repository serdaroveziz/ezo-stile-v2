import { renderSalonTypeFields } from './salon-type-fields.js';
/* UNELIVO - Salon Application Wizard & Submission */
import { submitSalonApplication } from '../db.js';
import { getCurrentUser } from '../auth.js';
import { showErrorModal, showSuccessToast } from './portal.js';
import { uiIcon } from './icons.js';
import { t } from '../config.js';

export function openSalonApplicationWizard() {
  const root = document.getElementById('modal-root');
  if (!root) return;

  const user = getCurrentUser() || { uid: 'usr_anon', phone: '05550000000' };

  root.innerHTML = `
    <div class="modal-overlay" onclick="window.closeModal()">
      <div class="modal-card" onclick="event.stopPropagation()">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <h3 class="section-title" style="font-size:16px;color:var(--gold-primary);">
            ${uiIcon('store')} ${t('portalUi_addSalon')}
          </h3>
          <button aria-label="${t('ownerUi_099')}" onclick="window.closeModal()" class="btn btn-secondary" style="padding: 4px 10px;">${uiIcon('x')}</button>
        </div>

        <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 16px;">
          ${t('portalUi_applicationHelp')}
        </p>

        <label style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">${t('portalUi_salonName')}</label>
        ${renderSalonTypeFields('app-types')}
          <input type="text" id="app-salon-name" class="input-field" placeholder="${t('portalUi_salonExample')}">

        <label style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">${t('portalUi_contactPhone')}</label>
        <input type="tel" id="app-phone" class="input-field" placeholder="05XXXXXXXXX" value="${user.phone || ''}">

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          <div>
            <label style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">${t('portalUi_city')}</label>
            <input type="text" id="app-city" class="input-field" placeholder="İstanbul">
          </div>
          <div>
            <label style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">${t('portalUi_district')}</label>
            <input type="text" id="app-district" class="input-field" placeholder="Şişli">
          </div>
        </div>

        <label style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">${t('portalUi_address')}</label>
        <input type="text" id="app-address" class="input-field" placeholder="${t('portalUi_addressHint')}">

        <label style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">${t('portalUi_instagram')}</label>
        <input type="text" id="app-instagram" class="input-field" placeholder="@salonhesabi">

        <label style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">${t('portalUi_imageUrl')}</label>
        <input type="url" id="app-photo-url" class="input-field" placeholder="https://...">

        <button onclick="window.submitSalonApplicationForm()" class="btn btn-gold" style="width: 100%; margin-top: 10px; min-height: 44px;">
           ${t('portalUi_submitApplication')}
        </button>
      </div>
    </div>
  `;

  window.submitSalonApplicationForm = async () => {
    const salonTypes=[...document.querySelectorAll('input[name="app-types"]:checked')].map(el=>el.value);
    if(!salonTypes.length)return showErrorModal(t('errorTitle'),'En az bir işletme türü seçin.');
    const salonName = document.getElementById('app-salon-name').value;
    const phone = document.getElementById('app-phone').value;
    const city = document.getElementById('app-city').value;
    const district = document.getElementById('app-district').value;
    const address = document.getElementById('app-address').value;
    const instagram = document.getElementById('app-instagram').value;
    const photoUrl = document.getElementById('app-photo-url').value;

    if (!salonName || !phone || !city || !address) {
      showErrorModal(t('errorTitle'), t('portalUi_requiredFields'));
      return;
    }

    try {
    const res = await submitSalonApplication({
      salonName,
      salonTypes,
      ownerName: user.displayName || user.name || 'Salon yetkilisi',
      phone,
      city,
      district,
      address,
      instagram,
      photoUrl,
      applicantUid: user.uid
    });

    if (res) {
      showSuccessToast(t('portalUi_applicationReceived'));
      window.closeModal();
    } else {
      showErrorModal(t('errorTitle'), t('portalUi_applicationRetry'));
    }
    } catch (error) { showErrorModal(t('errorTitle'), error); }
  };
}
