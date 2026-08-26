/* EZO STİLE v2 - Salon Application Wizard & Submission */
import { submitSalonApplication } from '../db.js';
import { getCurrentUser } from '../auth.js';

export function openSalonApplicationWizard() {
  const root = document.getElementById('modal-root');
  if (!root) return;

  const user = getCurrentUser() || { uid: 'usr_anon', phone: '05550000000' };

  root.innerHTML = `
    <div class="modal-overlay" onclick="window.closeModal()">
      <div class="modal-card" onclick="event.stopPropagation()">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <h3 style="font-size: 16px; font-weight: 800; color: var(--gold-primary);">
            🏢 Salonumu EZO STİLE'a Ekle
          </h3>
          <button onclick="window.closeModal()" class="btn btn-secondary" style="padding: 4px 10px;">✕</button>
        </div>

        <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 16px;">
          Salonunuzu EZO STİLE VIP platformuna eklemek için bilgileri doldurunuz. Başvurunuz Süper Admin onayına gönderilecektir.
        </p>

        <label style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">Salon Adı *</label>
        <input type="text" id="app-salon-name" class="input-field" placeholder="Örn: Elite VIP Barber Club" value="Ezo Stile Premium Barber">

        <label style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">İletişim Telefonu *</label>
        <input type="tel" id="app-phone" class="input-field" placeholder="05XXXXXXXXX" value="${user.phone || ''}">

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          <div>
            <label style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">Şehir *</label>
            <input type="text" id="app-city" class="input-field" placeholder="İstanbul" value="İstanbul">
          </div>
          <div>
            <label style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">İlçe *</label>
            <input type="text" id="app-district" class="input-field" placeholder="Şişli" value="Kadıköy">
          </div>
        </div>

        <label style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">Açık Adres *</label>
        <input type="text" id="app-address" class="input-field" placeholder="Mahalle, Cadde, No..." value="Bağdat Caddesi No: 140/A">

        <label style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">Instagram Hesabı</label>
        <input type="text" id="app-instagram" class="input-field" placeholder="@ezostilebarber" value="@ezostilebarber">

        <label style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">Salon Görsel URL</label>
        <input type="url" id="app-photo-url" class="input-field" placeholder="https://..." value="https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=500">

        <button onclick="window.submitSalonApplicationForm()" class="btn btn-gold" style="width: 100%; margin-top: 10px; min-height: 44px;">
          🚀 Başvuruyu Süper Admin'e Gönder
        </button>
      </div>
    </div>
  `;

  window.submitSalonApplicationForm = async () => {
    const salonName = document.getElementById('app-salon-name').value;
    const phone = document.getElementById('app-phone').value;
    const city = document.getElementById('app-city').value;
    const district = document.getElementById('app-district').value;
    const address = document.getElementById('app-address').value;
    const instagram = document.getElementById('app-instagram').value;
    const photoUrl = document.getElementById('app-photo-url').value;

    if (!salonName || !phone || !city || !address) {
      alert('Lütfen zorunlu alanları (*) doldurunuz.');
      return;
    }

    const res = await submitSalonApplication({
      salonName,
      phone,
      city,
      district,
      address,
      instagram,
      photoUrl,
      applicantUid: user.uid
    });

    if (res) {
      alert('✅ Salon başvurunuz başarıyla alındı! Süper Admin onayından sonra Salon Sahibi paneliniz aktif edilecektir.');
      window.closeModal();
    } else {
      alert('⚠️ Başvuru gönderilirken bir hata oluştu. Lütfen tekrar deneyiniz.');
    }
  };
}