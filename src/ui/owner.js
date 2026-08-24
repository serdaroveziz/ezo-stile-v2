/* EZO STİLE v2 - Owner Onboarding & Salon Management Dashboard */
import { getBusinessRecord, saveRecord, getServices, saveService, getStaffList, saveStaff, getAppointmentsForBusiness } from '../db.js';
import { getCurrentUser } from '../auth.js';

let onboardingStep = 1;

export async function renderOwnerScreen() {
  const container = document.getElementById('app-container');
  if (!container) return;

  const user = getCurrentUser();
  if (!user || !user.businessId) {
    container.innerHTML = `
      <div class="card card-gold text-center" style="padding: 24px;">
        <div style="font-size: 36px; margin-bottom: 8px;">💈</div>
        <h3 style="font-size: 16px; color: var(--gold-primary);">Salon Sahibi Paneli</h3>
        <p style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">Hesabınıza bağlı aktif bir salon (businessId) bulunamadı.</p>
      </div>
    `;
    return;
  }

  const business = await getBusinessRecord(user.businessId);

  if (!business || !business.bookingEnabled) {
    renderOwnerOnboarding(container, user, business);
    return;
  }

  renderSalonDashboard(container, user, business);
}

async function renderOwnerOnboarding(container, user, business) {
  const bizName = business ? business.name : 'Salonunuz';

  container.innerHTML = `
    <div class="header-bar">
      <div class="brand-title">💈 ${bizName}</div>
      <span class="badge badge-pending">KURULUM AŞAMASI</span>
    </div>

    <div class="card card-gold animate-fade" style="padding: 20px;">
      <div style="font-size: 11px; color: var(--gold-primary); font-weight: 700; text-transform: uppercase;">Adım ${onboardingStep} / 5</div>
      <h3 style="font-size: 16px; font-weight: 800; color: #fff; margin-top: 2px;">
        ${onboardingStep === 1 ? '1. Salon Bilgileri' : ''}
        ${onboardingStep === 2 ? '2. Çalışma Günleri & Saatleri' : ''}
        ${onboardingStep === 3 ? '3. Hizmetler & Fiyatlar' : ''}
        ${onboardingStep === 4 ? '4. Personel Ekle' : ''}
        ${onboardingStep === 5 ? '5. Randevu Sistemini Yayınla' : ''}
      </h3>

      <div style="margin-top: 14px;">
        ${onboardingStep === 1 ? `
          <label style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">Salon Adı</label>
          <input type="text" id="ob-biz-name" class="input-field" value="${business.name || ''}">
          <label style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">Telefon</label>
          <input type="tel" id="ob-biz-phone" class="input-field" value="${business.phone || ''}">
          <button onclick="window.nextOnboardingStep(2)" class="btn btn-gold" style="width: 100%;">Devam Et →</button>
        ` : ''}

        ${onboardingStep === 2 ? `
          <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 12px;">Haftalık salon açılış ve kapanış saatlerinizi onaylayın.</p>
          <div class="card" style="padding: 12px; font-size: 12px;">Pazartesi - Cumartesi: 09:00 - 21:00 (Açık)</div>
          <button onclick="window.nextOnboardingStep(3)" class="btn btn-gold" style="width: 100%; margin-top: 8px;">Devam Et →</button>
        ` : ''}

        ${onboardingStep === 3 ? `
          <label style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">Örnek Hizmet Ekle</label>
          <input type="text" id="ob-svc-name" class="input-field" placeholder="Hizmet Adı" value="Saç Kesimi & Yıkama">
          <input type="number" id="ob-svc-price" class="input-field" placeholder="Fiyat (TL)" value="350">
          <button onclick="window.addInitialService()" class="btn btn-gold" style="width: 100%;">Hizmeti Kaydet & Devam Et →</button>
        ` : ''}

        ${onboardingStep === 4 ? `
          <label style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">İlk Personeli Ekle</label>
          <input type="text" id="ob-stf-name" class="input-field" placeholder="Personel Adı" value="Mustafa Usta (Baş Berber)">
          <button onclick="window.addInitialStaff()" class="btn btn-gold" style="width: 100%;">Personeli Kaydet & Devam Et →</button>
        ` : ''}

        ${onboardingStep === 5 ? `
          <div style="text-align: center; padding: 20px;">
            <div style="font-size: 40px; margin-bottom: 8px;">🎉</div>
            <h4 style="font-size: 16px; font-weight: 800; color: var(--gold-primary);">Tebrikler! Kurulum Tamamlandı</h4>
            <p style="font-size: 12px; color: var(--text-muted); margin-top: 4px; margin-bottom: 16px;">Randevu sisteminizi müşterilere açabilirsiniz.</p>
            <button onclick="window.enableSalonBooking()" class="btn btn-gold" style="width: 100%; min-height: 44px;">🚀 Randevu Sistemini Aktif Et</button>
          </div>
        ` : ''}
      </div>
    </div>
  `;

  window.nextOnboardingStep = (step) => {
    onboardingStep = step;
    renderOwnerOnboarding(container, user, business);
  };

  window.addInitialService = async () => {
    const name = document.getElementById('ob-svc-name').value;
    const price = parseInt(document.getElementById('ob-svc-price').value) || 300;
    await saveService(user.businessId, { name, price, durationMin: 30 });
    onboardingStep = 4;
    renderOwnerOnboarding(container, user, business);
  };

  window.addInitialStaff = async () => {
    const displayName = document.getElementById('ob-stf-name').value;
    await saveStaff(user.businessId, { displayName, role: 'barber' });
    onboardingStep = 5;
    renderOwnerOnboarding(container, user, business);
  };

  window.enableSalonBooking = async () => {
    await saveRecord(`businesses/${user.businessId}`, { bookingEnabled: true }, 'PATCH');
    alert('✅ Randevu sisteminiz başarıyla aktif edildi!');
    renderOwnerScreen();
  };
}

async function renderSalonDashboard(container, user, business) {
  const appointments = await getAppointmentsForBusiness(user.businessId);
  const pendingApts = appointments.filter(a => a.status === 'pending');
  const approvedApts = appointments.filter(a => a.status === 'approved');

  let pendingHtml = '';
  if (pendingApts.length === 0) {
    pendingHtml = `<div style="font-size: 12px; color: var(--text-muted); text-align: center; padding: 16px;">Bekleyen randevu talebi bulunmuyor.</div>`;
  } else {
    pendingHtml = pendingApts.map(apt => `
      <div class="card card-gold" style="padding: 14px; margin-bottom: 10px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <div style="font-size: 14px; font-weight: 800; color: #fff;">👤 ${apt.customerName} (${apt.customerPhone})</div>
            <div style="font-size: 12px; color: var(--gold-primary); font-weight: 700; margin-top: 2px;">✂️ ${apt.serviceName} • 📅 ${apt.date} @ ${apt.time}</div>
          </div>
          <span class="badge badge-pending">BEKLEYEN</span>
        </div>

        <div style="display: flex; gap: 8px; margin-top: 10px;">
          <button onclick="window.updateAptStatus('${apt.aptId}', 'approved')" class="btn btn-gold" style="flex: 1; min-height: 36px; font-size: 11px;">
            ✅ Onayla
          </button>
          <button onclick="window.updateAptStatus('${apt.aptId}', 'rejected')" class="btn btn-secondary" style="flex: 1; min-height: 36px; font-size: 11px;">
            ❌ Reddet
          </button>
        </div>
      </div>
    `).join('');
  }

  container.innerHTML = `
    <!-- HEADER BAR -->
    <div class="header-bar">
      <div class="brand-title">💈 ${business.name}</div>
      <span class="badge badge-approved">AKTİF SALON</span>
    </div>

    <!-- METRICS SUMMARY -->
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px;">
      <div class="card" style="padding: 14px; text-align: center;">
        <div style="font-size: 20px; font-weight: 900; color: var(--gold-primary);">${pendingApts.length}</div>
        <div style="font-size: 11px; color: var(--text-muted);">Bekleyen Talep</div>
      </div>
      <div class="card" style="padding: 14px; text-align: center;">
        <div style="font-size: 20px; font-weight: 900; color: var(--success);">${approvedApts.length}</div>
        <div style="font-size: 11px; color: var(--text-muted);">Onaylı Randevu</div>
      </div>
    </div>

    <!-- PENDING APPOINTMENTS MODULE -->
    <div class="card animate-fade" style="padding: 18px;">
      <h3 style="font-size: 15px; font-weight: 800; color: var(--gold-primary); margin-bottom: 12px;">
        📅 Bekleyen Randevu Talepleri
      </h3>
      ${pendingHtml}
    </div>
  `;

  window.updateAptStatus = async (aptId, newStatus) => {
    const res = await fetch('/api/booking/update-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aptId, newStatus, userUid: user.uid })
    });

    if (res.ok) {
      alert(`✅ Randevu durumu '${newStatus}' olarak güncellendi!`);
      renderOwnerScreen();
    } else {
      alert('⚠️ Güncelleme hatası oluştu.');
    }
  };
}