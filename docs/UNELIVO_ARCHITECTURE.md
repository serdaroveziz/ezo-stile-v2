# UNELIVO 2.0 — Mevcut Mimari

## Katmanlar

```
Tarayıcı (mobil web / PWA)
 ├─ index.html  — açılış ekranı, import map, tema ön-boyama, zaman aşımı koruması
 ├─ src/auth.js, src/firebase.js — Firebase Auth (CDN SDK v12), oturum geri yükleme
 ├─ src/ui/portal.js        — giriş/kayıt, rol yönlendirme
 ├─ src/ui/customer.js      — müşteri (keşif, salon detayı, randevu, randevularım)   ~2.400 satır
 ├─ src/ui/owner*.js        — patron (özet, takvim, ajanda, müşteriler, yönetim)     ~2.240 + modüller
 ├─ src/ui/staff*.js        — çalışan paneli ve operasyonlar
 ├─ src/ui/super-admin.js   — platform yönetimi
 ├─ src/theme.js            — 6 tema + sistem, localStorage
 └─ src/locales/*.js        — TR/EN/RU/TK/FA, RTL
        │  authenticatedFetch (Firebase ID token)
        ▼
Vercel — tek fonksiyon  api/index.js  (catch-all router, 45 handler)
 ├─ requireAuth → enforceAuthenticatedIdentity (gövdedeki uid alanlarını oturumla eşitler)
 ├─ server/handlers/booking/*   — availability, create, list, update-status, reschedule-approve
 ├─ server/handlers/staff/*     — davet, program, profil
 ├─ server/handlers/salon/*     — başvuru, onay, profil, public senkron, workspace
 ├─ server/handlers/reviews/*   — yalnızca tamamlanmış randevuya yorum
 ├─ server/handlers/ai/*        — booking-assistant (LLM), analyze (sabit katalog), generate
 └─ server/handlers/payments/*  — PayTR / Google / Apple doğrulama (sandbox)
        │  firebase-admin
        ▼
Firebase Realtime Database (europe-west1)
 users/ businesses/ public_businesses/ appointments/ reviews/ notifications/
 staff_invites/ staff_phone_index/ availability_revisions/ audit_logs/ payments/
```

## Randevu motoru

- **Saf çekirdek:** `src/booking-engine.js` (sunucu ve takvim arayüzü aynı dosyayı kullanır; `server/booking-staff.js` onu yeniden dışa aktarır).
  - `scheduleForDate` — salon ∩ çalışan saatleri, `timeOff`, `breaks` (gün bazında `[{start,end}]`; `staff/update-schedule` doğrular ve istekte yoksa mevcut molaları korur)
  - `intervalOverlapsAppointment` — süre tabanlı çakışma. `cancelled/rejected/no_show/completed/expired` kapasiteyi bırakır. Atanmamış eski kayıtlar herkesi bloklar
  - `chooseAvailableStaff` — "Fark Etmez" için günlük yükü en az olan uygun çalışanı seçer
  - `istanbulNowParts` — tüm "geçmiş saat" kontrolleri Europe/Istanbul saatiyle
- **Müsaitlik:** `booking/availability` 30 dakikalık slot üretir, `staffBySlot` ve alternatifleri döner. `no-store` ile önbelleğe alınmaz.
- **Kayıt:** `booking/create` → `db.ref('appointments').transaction(...)`. Transaction içinde geçmiş saat, çalışan uygunluğu ve çakışma yeniden kontrol edilir. "Fark Etmez" ataması da transaction içinde yapılır. Başarılı kayıttan sonra `availability_revisions/{businessId}` güncellenir ve istemciler yeniden yüklenir.

## Yetki modeli

- Roller: `customer`, `owner`, `manager`, `receptionist`, `barber`, `super_admin`.
- Çalışan izinleri: `src/staff-permissions.js` (rol başına izin anahtarları ve varsayılanlar).
- RTDB kuralları: `appointments`, `reviews`, `notifications`, `public_businesses` alanlarına istemci yazamaz. Patron yalnızca kendi salonunun belirli alanlarını yazabilir. Çalışan `appointments` okuyamaz (projeksiyon API'si üzerinden görür).

## Dağıtım

- `vercel.json`: `/salon/:slug` → `/`, `/api/(.*)` → `/api/index?path=` (yakalama grubu yok; router rotayı `req.query.path`, `?path=` ya da URL yolundan çözer). Her yanıt `no-cache`.
- Vercel projesi `ezo-stile-v2`. Alan adları: `unelivo.com` (herkese açık), `*.vercel.app` (SSO korumalı). Deployment Protection `all_except_custom_domains`, bu yüzden preview bağlantıları telefonda Vercel girişi ister.
- Router yalnızca `yöntem + rota` loglar; sorgu dizesi loglanmaz.
- Build adımı yok. Firebase istemci SDK'sı gstatic CDN'den. Leaflet `src/vendor` altında.
- Ortam değişkenleri: `.env.example` (Firebase web config, service account JSON, CRON_SECRET) + `UNELIVO_ASSISTANT_MODEL`.

## Bilinen mimari borç

| Alan | Sorun | Hedef |
|---|---|---|
| Rezervasyon transaction'ı | Bütün `/appointments` kökü | Salon+gün bazlı kilit/sürüm düğümü (`booking_locks/{businessId}/{date}`) ile dar kapsamlı transaction, ardından çok yollu yazma |
| UI dosyaları | `customer.js` ve `owner.js` 2.000+ satır, metin içinde HTML | Ekran bazlı modüller, ortak bileşenler (salon detayı public/uygulama ortak) |
| Tasarım tokenları | `--gold-*`, `--theme-panel-xxxxxx` ve 374 sabit hex | Spesifikasyondaki semantik token seti, tema başına tek kaynak |
| Testler | Kaynak metnini regex ile arayan testler, Windows'a sabit Playwright yolu | Davranış testleri, taşınabilir Playwright, emülatörde kural testleri |
