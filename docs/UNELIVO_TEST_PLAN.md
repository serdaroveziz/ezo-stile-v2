# UNELIVO 2.0 — Test Planı

## 1. Komutlar

| Komut | Kapsam | Bağımlılık |
|---|---|---|
| `npm run test:unelivo` | Açılış bütünlüğü + tema kontrastı (yeni) | Yok |
| `npm run test:security:regressions` | 20 güvenlik/regresyon paketi | `npm install` |
| `node test_v2_booking_collision_runtime.cjs` | Çakışma | `npm install` |
| `node test_v2_shared_availability_runtime.cjs` | Ortak motor | `npm install` |
| `node test_v2_admin_reentry_runtime.cjs` | Süper admin yeniden giriş | `npm install` |
| `npm run test:rules:emulator` | RTDB kuralları | Firebase emülatörü + Java. Doğrudan çalıştırılmaz; aşağıdaki sarmalayıcıyla çalıştırılır |

Kuralları izole demo emülatöründe çalıştırma (canlı projeye dokunmaz; `demo-` ön ekli proje kimliği gerçek servislere erişemez):

```bash
FIREBASE_PROJECT_ID=demo-ezo-rules firebase emulators:exec --config firebase.security-test.json --project demo-ezo-rules --only database,auth "node test_v2_rules_emulator.mjs"
```

Not: emülatör testi ilk başarısız kontrolde durur. 21 Ekim'de 143. kontrolden sonra durdu; hepsini görmek için geçici bir kopya ile çalıştırıldı (159 kontrol, 1 başarısız).

**Dikkat:** `test:phase*` ve `test:booking` bellek içi sahte veritabanıyla iş mantığını test dosyasında yeniden yazar; gerçek handler'ları çağırmaz. Kabul kanıtı olarak sayılmamalı.

Hedef (P0-3): tek `npm run test:all` komutu. Tarayıcı testleri `require('playwright')` ve Chromium ile çalışır.

## 2. Kabul senaryoları ve mevcut kapsam

| # | Senaryo | Mevcut test | Durum |
|---|---|---|---|
| 1 | Müşteri randevu oluşturur | `customer_booking_experience_local` | Geçti |
| 2 | Patron aynı randevuyu görür | `auth_tenant_isolation_local` (booking/list) | Emülatör/Firebase gerekli, bu ortamda doğrulanmadı |
| 3 | Çalışan kendi randevusunu görür | `staff_projection_local`, `staff_tenant_runtime` | Geçti |
| 4 | Manuel randevu online müsaitliği günceller | `shared_availability_runtime` | Geçti |
| 5 | Çakışan rezervasyon engellenir | `booking_collision_runtime` | Geçti |
| 6 | "Fark Etmez" doğru çalışır | `shared_availability_runtime`, `mobile_calendar` | Kısmen (mobile_calendar fikstürü eski) |
| 7 | Patron salon profilini kaydeder | `salon_profile_detail_local` | Geçti |
| 8 | Sosyal bağlantılar yeniden girişte korunur | `salon_profile_detail_local` (kayıt) | Kısmen. Yeniden giriş senaryosu eklenecek |
| 9 | Salon kartı → detay | `discovery_click_local` | Geçti |
| 10 | Public salon sayfası | `public_storefront_local`, `public_salon_link_local` | Geçti |
| 11 | Tema seçimi korunur | — (yalnızca localStorage) | **Eksik** (P0-5) |
| 12 | Bütün temalarda metin okunur | `test_unelivo_theme_contrast.mjs` (palet) | Kısmen. Render taraması P0-4'te |
| 13 | Süper admin çıkış/giriş donmaz | `admin_reentry_runtime` | Geçti (birim). Tarayıcı testi ortamda çalışmadı |
| 14 | AI başka salonun verisine erişemez | `booking_assistant_runtime` (asistan) | Kısmen. Patron AI yok |
| 15 | Yetkisiz kullanıcı patron API'lerini kullanamaz | `security_local`, `auth_tenant_isolation_local` | Geçti / emülatör gerekli |
| 16 | Mobil navigasyon | tarayıcı testleri | Bu ortamda çalıştırılamadı |
| 17 | Kurallar kritik erişimleri engeller | `rules_emulator` | **158/159 geçti** (demo emülatör, 21 Ekim). Başarısız tek kontrol ürün kararına bağlı (çalışan manuel randevu yetkisi) |
| 18 | Kaydedilen mola randevu motorunda dolu sayılır | `staff_operations_local` (yeni 7 kontrol) | Geçti |
| 19 | Eşzamanlı istekte son boş saati tek kişi alır | `rules_emulator` "booking double guard + Any Staff" | Geçti: 2 uygun çalışana 3 paralel "Fark Etmez" isteği → tam 2 × 200, 1 × 409, farklı çalışanlar. 20 paralel istek testi hâlâ eksik |

## 3. Eklenecek yeni testler (öncelik sırasıyla)

1. **Eşzamanlı rezervasyon:** emülatöre aynı slota 20 paralel `booking/create`. Tam olarak 1 başarı, 19 tane 409 beklenir.
2. **Mola/izin:** molaya ya da izin gününe düşen slot `busySlots` içinde olmalı ve `create` 409 dönmeli.
3. **İptal kapasite bırakır:** iptal sonrası slot yeniden `slots` içinde olmalı.
4. **Render kontrast taraması:** Playwright, 7 görünüm × 4 rol ana ekranı. Her görünür metin için hesaplanan renk/zemin oranı ≥ 4.5 (büyük metin için ≥ 3).
5. **Sosyal bağlantı kalıcılığı:** `salon/update-profile` → yeniden okuma.
6. **Patron AI izolasyonu:** başka `businessId` ile yapılan istek 403 dönmeli, yanıtta müşteri telefonu bulunmamalı.

## 4. Bu aşamanın sonuçları
`UNELIVO_AUDIT.md` §5: 89 dosyadan 63'ü geçti. Başarısızların tamamı ortam kaynaklı ya da eskimiş test olarak sınıflandırıldı. Yeni testler 9/9 ve 42/42 geçti. Değişiklik sonrası regresyon yok.
