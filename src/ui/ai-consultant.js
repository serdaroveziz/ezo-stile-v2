/* EZO STİLE v2 - Standalone AI Hair & Style Consultant Module with AI Wallet & Products Catalog */
import { getCurrentUser } from '../auth.js';
import { AI_CREDIT_CATALOG } from '../config/products.js';

let aiState = {
  photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500',
  stylePreference: 'Modern',
  hairLength: 'Orta',
  recommendations: [],
  selectedRecommendation: null,
  generationResult: null,
  isGenerating: false,
  mode: 'economy'
};

export async function renderAiConsultantScreen(container) {
  if (!container) return;

  const user = getCurrentUser() || { uid: 'usr_demo', name: 'Müşteri', aiCredits: { economy: 3, premium: 1 } };
  const credits = user.aiCredits || { economy: 3, premium: 1 };
  const bonusEarned = user.bonusEarnedCredits || 0;
  const usedCredits = user.usedCreditsCount || 0;

  let contentHtml = '';

  if (aiState.generationResult) {
    // BEFORE / AFTER RESULT VIEW
    contentHtml = `
      <div class="card card-gold animate-fade" style="padding: 18px;">
        <h3 style="font-size: 16px; font-weight: 800; color: var(--gold-primary); margin-bottom: 8px;">✨ AI Saç Modeli Sonucunuz</h3>
        <p style="font-size: 11px; color: var(--text-muted); margin-bottom: 14px;">Mevcut yüz yapınız korunarak <b>${aiState.generationResult.selectedStyle}</b> modeli uygulandı.</p>

        <!-- BEFORE / AFTER COMPARISON -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 14px;">
          <div style="text-align: center;">
            <div style="font-size: 10px; color: var(--text-muted); margin-bottom: 4px;">ÖNCESİ</div>
            <img src="${aiState.generationResult.beforeAfter.input}" style="width: 100%; height: 140px; object-fit: cover; border-radius: 10px; border: 1px solid var(--border-color);" alt="Öncesi">
          </div>
          <div style="text-align: center;">
            <div style="font-size: 10px; color: var(--gold-primary); font-weight: 800; margin-bottom: 4px;">SONRASI (AI)</div>
            <img src="${aiState.generationResult.beforeAfter.output}" style="width: 100%; height: 140px; object-fit: cover; border-radius: 10px; border: 2px solid var(--gold-primary);" alt="Sonrası">
          </div>
        </div>

        <!-- BARBER RECIPE -->
        <div class="card" style="padding: 12px; margin-bottom: 14px; background: rgba(0,0,0,0.4);">
          <div style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">✂️ Berbere Verilecek Tarif:</div>
          <div style="font-size: 12px; color: #fff; margin-top: 4px; font-style: italic;">
            "${aiState.selectedRecommendation ? aiState.selectedRecommendation.barberRecipe : 'Yanlar 2 numara fade, üstler makas kesimi dokulu.'}"
          </div>
        </div>

        <!-- ACTION BUTTONS -->
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <button onclick="window.bookAppointmentWithAiModel()" class="btn btn-gold" style="width: 100%; min-height: 44px; font-size: 13px;">
            ✂️ Bu Modelle Randevu Al
          </button>
          <button onclick="window.switchCustomerTab('salons')" class="btn btn-outline-gold" style="width: 100%; min-height: 40px; font-size: 11px;">
            📍 Bu Modeli Yakınımda Yaptır (Keşfet)
          </button>
          <button onclick="window.resetAiConsultant()" class="btn btn-secondary" style="width: 100%; font-size: 11px;">
            🔄 Başka Model Dene
          </button>
        </div>
      </div>
    `;
  } else if (aiState.recommendations.length > 0) {
    // RECOMMENDATIONS VIEW
    contentHtml = `
      <div class="card card-gold animate-fade" style="padding: 18px;">
        <h3 style="font-size: 16px; font-weight: 800; color: var(--gold-primary); margin-bottom: 6px;">🤖 AI Analiz Sonuçları</h3>
        <p style="font-size: 11px; color: var(--text-muted); margin-bottom: 14px;">Yüz yapınıza ve tercihinize en uygun 3 saç modeli belirlendi.</p>

        <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px;">
          ${aiState.recommendations.map((rec, idx) => `
            <div class="card" style="padding: 12px; margin: 0; border-color: ${aiState.selectedRecommendation && aiState.selectedRecommendation.modelName === rec.modelName ? 'var(--gold-primary)' : 'var(--border-color)'};">
              <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                  <h4 style="font-size: 14px; font-weight: 800; color: #fff;">💈 ${rec.modelName}</h4>
                  <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">${rec.description}</div>
                  <div style="font-size: 10px; color: var(--gold-primary); margin-top: 4px;">💡 ${rec.faceMatchReason}</div>
                </div>
                <span class="badge badge-approved" style="font-size: 9px;">Bakım: ${rec.maintenanceLevel}/5</span>
              </div>

              <div style="display: flex; gap: 6px; margin-top: 10px;">
                <button onclick="window.generateAiTryOn('${rec.modelName}', 'economy')" class="btn btn-gold" style="flex: 1; min-height: 36px; font-size: 11px;" ${aiState.isGenerating ? 'disabled' : ''}>
                  ${aiState.isGenerating ? 'Hazırlanıyor...' : '⚡ Üzerimde Dene (Economy)'}
                </button>
                <button onclick="window.generateAiTryOn('${rec.modelName}', 'premium')" class="btn btn-outline-gold" style="flex: 1; min-height: 36px; font-size: 11px;" ${aiState.isGenerating ? 'disabled' : ''}>
                  👑 Premium (VIP Yüz Korumalı)
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  } else {
    // UPLOAD & WALLET VIEW
    contentHtml = `
      <!-- AI WALLET & ENTITLEMENTS CARD -->
      <div class="card card-gold animate-fade" style="padding: 16px; margin-bottom: 14px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <h3 style="font-size: 15px; font-weight: 800; color: var(--gold-primary);">💳 AI Haklarım & Cüzdanım</h3>
          <span class="badge badge-approved" style="font-size: 10px;">GÜVENLİ BAKIYE</span>
        </div>

        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; text-align: center; margin-bottom: 12px;">
          <div style="background: rgba(0,0,0,0.4); padding: 8px; border-radius: 8px;">
            <div style="font-size: 16px; font-weight: 800; color: var(--gold-primary);">⚡ ${credits.economy || 0}</div>
            <div style="font-size: 9px; color: var(--text-muted);">Economy</div>
          </div>
          <div style="background: rgba(0,0,0,0.4); padding: 8px; border-radius: 8px;">
            <div style="font-size: 16px; font-weight: 800; color: #e5a93b;">👑 ${credits.premium || 0}</div>
            <div style="font-size: 9px; color: var(--text-muted);">Premium</div>
          </div>
          <div style="background: rgba(0,0,0,0.4); padding: 8px; border-radius: 8px;">
            <div style="font-size: 16px; font-weight: 800; color: #4cd964;">🎁 ${bonusEarned}</div>
            <div style="font-size: 9px; color: var(--text-muted);">Bonus</div>
          </div>
          <div style="background: rgba(0,0,0,0.4); padding: 8px; border-radius: 8px;">
            <div style="font-size: 16px; font-weight: 800; color: #fff;">📊 ${usedCredits}</div>
            <div style="font-size: 9px; color: var(--text-muted);">Kullanılan</div>
          </div>
        </div>

        <button onclick="window.watchRewardedAdSandbox()" class="btn btn-outline-gold" style="width: 100%; min-height: 36px; font-size: 11px;">
          🎬 Reklam İzle → +1 Economy AI Hakkı (TEST / SANDBOX)
        </button>
      </div>

      <!-- AI CONSULTANT INPUT CARD -->
      <div class="card card-gold animate-fade" style="padding: 18px; margin-bottom: 14px;">
        <h3 style="font-size: 16px; font-weight: 800; color: var(--gold-primary); margin-bottom: 8px;">🤖 AI Saç Danışmanı</h3>
        <p style="font-size: 11px; color: var(--text-muted); margin-bottom: 14px;">Fotoğrafınızı yükleyin, AI yüz hatlarınıza uygun modelleri çıkarsın.</p>

        <!-- PHOTO PREVIEW -->
        <div style="text-align: center; margin-bottom: 14px;">
          <img src="${aiState.photoUrl}" style="width: 100%; height: 160px; object-fit: cover; border-radius: 12px; border: 1px dashed var(--gold-primary);" alt="Yüklenen Fotoğraf">
        </div>

        <label style="font-size: 11px; color: var(--gold-primary); font-weight: 700;">Tarz Tercihi</label>
        <select id="ai-style-pref" class="input-field" onchange="aiState.stylePreference = this.value">
          <option value="Modern">Modern & Trend</option>
          <option value="Klasik">Klasik Karizmatik</option>
          <option value="Spor">Spor & Rahat</option>
          <option value="Dokulu">Dokulu (Textured)</option>
        </select>

        <button onclick="window.startAiAnalysis()" class="btn btn-gold" style="width: 100%; min-height: 44px; margin-top: 8px;" ${aiState.isGenerating ? 'disabled' : ''}>
          ${aiState.isGenerating ? 'Yüz Analiz Ediliyor...' : '⚡ Yüzümü Analiz Et & Modelleri Getir'}
        </button>
      </div>

      <!-- AI PACKAGES PRODUCT CATALOG -->
      <div class="card animate-fade" style="padding: 16px;">
        <h3 style="font-size: 15px; font-weight: 800; color: var(--gold-primary); margin-bottom: 10px;">🛍️ AI Hak Paketleri Katalog</h3>
        
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${Object.values(AI_CREDIT_CATALOG).map(pkg => `
            <div class="card" style="padding: 10px; margin: 0; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div style="font-size: 12px; font-weight: 800; color: #fff;">${pkg.name}</div>
                <div style="font-size: 10px; color: var(--text-muted);">${pkg.description}</div>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 13px; font-weight: 800; color: var(--gold-primary);">${pkg.priceTry} TL</div>
                <button onclick="alert('💳 Ödeme sistemi (PayTR / StoreKit) yakında aktif olacak. Henüz bakiye yüklenemez.')" class="btn btn-secondary" style="font-size: 9px; padding: 4px 8px; margin-top: 4px;">
                  Ödeme sistemi yakında aktif olacak
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  container.innerHTML = contentHtml;

  window.watchRewardedAdSandbox = async () => {
    const user = getCurrentUser() || { uid: 'usr_demo' };
    const res = await fetch('/api/ai/rewarded-ad', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userUid: user.uid, isSandboxSimulation: true })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      alert(`🎉 [${data.mode}] ${data.reward}`);
      renderAiConsultantScreen(container);
    } else {
      alert('⚠️ ' + (data.error || 'Reklam ödülü alınamadı.'));
    }
  };

  window.startAiAnalysis = async () => {
    const user = getCurrentUser() || { uid: 'usr_demo' };
    aiState.isGenerating = true;
    renderAiConsultantScreen(container);

    const res = await fetch('/api/ai/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userUid: user.uid,
        photoUrl: aiState.photoUrl,
        stylePreference: aiState.stylePreference,
        hairLength: aiState.hairLength
      })
    });

    const data = await res.json();
    aiState.isGenerating = false;

    if (res.ok && data.success) {
      aiState.recommendations = data.recommendations;
      renderAiConsultantScreen(container);
    } else {
      alert('⚠️ Analiz yapılırken bir hata oluştu.');
      renderAiConsultantScreen(container);
    }
  };

  window.generateAiTryOn = async (modelName, mode) => {
    const user = getCurrentUser() || { uid: 'usr_demo' };
    const rec = aiState.recommendations.find(r => r.modelName === modelName);
    aiState.selectedRecommendation = rec;
    aiState.isGenerating = true;
    renderAiConsultantScreen(container);

    const res = await fetch('/api/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userUid: user.uid,
        photoUrl: aiState.photoUrl,
        selectedStyle: modelName,
        mode
      })
    });

    const data = await res.json();
    aiState.isGenerating = false;

    if (res.ok && data.success) {
      aiState.generationResult = data;
      renderAiConsultantScreen(container);
    } else {
      alert('⚠️ ' + (data.error || 'AI üretimi başarısız oldu. Krediniz iade edildi.'));
      renderAiConsultantScreen(container);
    }
  };

  window.bookAppointmentWithAiModel = () => {
    if (!aiState.generationResult) return;
    alert(`✂️ "${aiState.generationResult.selectedStyle}" modeliyle randevu oluşturma ekranına yönlendiriliyorsunuz...`);
    window.switchCustomerTab('booking');
  };

  window.resetAiConsultant = () => {
    aiState.recommendations = [];
    aiState.selectedRecommendation = null;
    aiState.generationResult = null;
    renderAiConsultantScreen(container);
  };
}