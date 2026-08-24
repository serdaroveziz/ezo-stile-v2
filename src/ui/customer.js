/* EZO STİLE v2 - Customer Main View & Bottom Navigation */
import { getCurrentUser } from '../auth.js';
import { openSalonApplicationWizard } from './salon-application.js';

let activeCustomerTab = 'home';

export function renderCustomerScreen(onTabChange) {
  const container = document.getElementById('app-container');
  if (!container) return;

  const user = getCurrentUser() || { name: 'Müşteri', phone: '05550000000', role: 'customer' };

  let mainHtml = '';

  if (activeCustomerTab === 'home') {
    mainHtml = `
      <div class="card card-gold animate-fade" style="padding: 20px;">
        <div style="font-size: 12px; color: var(--gold-primary); font-weight: 700; text-transform: uppercase;">Hoş Geldiniz 👋</div>
        <h2 style="font-size: 18px; font-weight: 800; color: #fff; margin-top: 2px;">${user.name}</h2>
        <p style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">VIP berber salonlarından anında randevunuzu oluşturun.</p>
      </div>

      <!-- 4 PRIMARY HOME ACTIONS -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px;">
        <div class="card" onclick="window.switchCustomerTab('booking')" style="padding: 16px; text-align: center; cursor: pointer; border-color: var(--border-gold);">
          <div style="font-size: 32px; margin-bottom: 6px;">✂️</div>
          <div style="font-size: 14px; font-weight: 800; color: #fff;">Randevu Al</div>
          <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">Anında slot seçin</div>
        </div>

        <div class="card" onclick="window.switchCustomerTab('salons')" style="padding: 16px; text-align: center; cursor: pointer;">
          <div style="font-size: 32px; margin-bottom: 6px;">💈</div>
          <div style="font-size: 14px; font-weight: 800; color: #fff;">Yakındaki Salonlar</div>
          <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">En iyi berberleri keşfet</div>
        </div>

        <div class="card" onclick="window.switchCustomerTab('ai')" style="padding: 16px; text-align: center; cursor: pointer;">
          <div style="font-size: 32px; margin-bottom: 6px;">🤖</div>
          <div style="font-size: 14px; font-weight: 800; color: #fff;">Saç Modelimi Bul</div>
          <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">AI saç danışmanı</div>
        </div>

        <div class="card" onclick="window.switchCustomerTab('appointments')" style="padding: 16px; text-align: center; cursor: pointer;">
          <div style="font-size: 32px; margin-bottom: 6px;">📅</div>
          <div style="font-size: 14px; font-weight: 800; color: #fff;">Randevularım</div>
          <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">Geçmiş ve aktif talepler</div>
        </div>
      </div>
    `;
  } else if (activeCustomerTab === 'salons') {
    mainHtml = `
      <div class="card animate-fade">
        <h3 style="font-size: 16px; font-weight: 800; color: var(--gold-primary); margin-bottom: 12px;">💈 Yakındaki Salonlar</h3>
        <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 16px;">Konumunuza en yakın onaylı EZO STİLE VIP salonları listelenmektedir.</p>

        <div class="card card-gold" style="padding: 14px; margin-bottom: 10px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <div style="font-size: 14px; font-weight: 800; color: #fff;">Merkez VIP Barber Club</div>
              <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">📍 Şişli / İstanbul • 1.2 km</div>
            </div>
            <span class="badge badge-approved">⭐ 4.9</span>
          </div>
        </div>
      </div>
    `;
  } else if (activeCustomerTab === 'ai') {
    mainHtml = `
      <div class="card card-gold animate-fade" style="padding: 20px;">
        <h3 style="font-size: 16px; font-weight: 800; color: var(--gold-primary); margin-bottom: 6px;">🤖 AI Saç Danışmanı</h3>
        <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 16px;">Fotoğrafını yükle, sana en çok yakışan 3 saç modelini deneyelim.</p>
        <button class="btn btn-gold" style="width: 100%;">📸 Fotoğraf Yükle ve Dene</button>
      </div>
    `;
  } else if (activeCustomerTab === 'appointments') {
    mainHtml = `
      <div class="card animate-fade">
        <h3 style="font-size: 16px; font-weight: 800; color: var(--gold-primary); margin-bottom: 12px;">📅 Randevularım</h3>
        <div style="font-size: 12px; color: var(--text-muted); text-align: center; padding: 20px;">Henüz aktif bir randevunuz bulunmamaktadır.</div>
      </div>
    `;
  } else if (activeCustomerTab === 'profile') {
    mainHtml = `
      <div class="card card-gold animate-fade" style="padding: 20px;">
        <div style="display: flex; align-items: center; gap: 14px; margin-bottom: 16px;">
          <div style="width: 52px; height: 52px; border-radius: 50%; background: var(--gold-gradient); display: flex; align-items: center; justify-content: center; font-size: 24px; color: #000; font-weight: 800;">
            ${(user.name || 'M')[0]}
          </div>
          <div>
            <h3 style="font-size: 16px; font-weight: 800; color: #fff;">${user.name}</h3>
            <p style="font-size: 11px; color: var(--text-muted);">${user.phone}</p>
            <span class="badge badge-pending" style="margin-top: 4px;">Rol: ${user.role}</span>
          </div>
        </div>

        <hr style="border: none; border-top: 1px solid var(--border-color); margin: 16px 0;">

        <div style="font-size: 13px; font-weight: 700; color: var(--gold-primary); margin-bottom: 10px;">🏢 İşletme İşlemleri</div>
        
        <button onclick="window.triggerSalonApplication()" class="btn btn-outline-gold" style="width: 100%; justify-content: space-between; min-height: 44px;">
          <span>💈 Salonumu EZO STİLE'a Ekle</span>
          <span>→</span>
        </button>
      </div>
    `;
  }

  container.innerHTML = `
    <!-- HEADER BAR -->
    <div class="header-bar">
      <div class="brand-title">💈 EZO STİLE v2</div>
      <div style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">${user.phone}</div>
    </div>

    <!-- MAIN CONTENT AREA -->
    ${mainHtml}

    <!-- 5-TAB BOTTOM NAVIGATION BAR -->
    <nav class="bottom-nav">
      <button onclick="window.switchCustomerTab('home')" class="nav-item ${activeCustomerTab === 'home' ? 'active' : ''}">
        <span class="icon">🏠</span>
        <span>Ana Sayfa</span>
      </button>
      <button onclick="window.switchCustomerTab('salons')" class="nav-item ${activeCustomerTab === 'salons' ? 'active' : ''}">
        <span class="icon">💈</span>
        <span>Salonlar</span>
      </button>
      <button onclick="window.switchCustomerTab('ai')" class="nav-item ${activeCustomerTab === 'ai' ? 'active' : ''}">
        <span class="icon">🤖</span>
        <span>AI Danışman</span>
      </button>
      <button onclick="window.switchCustomerTab('appointments')" class="nav-item ${activeCustomerTab === 'appointments' ? 'active' : ''}">
        <span class="icon">📅</span>
        <span>Randevularım</span>
      </button>
      <button onclick="window.switchCustomerTab('profile')" class="nav-item ${activeCustomerTab === 'profile' ? 'active' : ''}">
        <span class="icon">👤</span>
        <span>Profil</span>
      </button>
    </nav>
  `;

  window.switchCustomerTab = (tabKey) => {
    activeCustomerTab = tabKey;
    renderCustomerScreen(onTabChange);
  };

  window.triggerSalonApplication = () => {
    openSalonApplicationWizard();
  };
}