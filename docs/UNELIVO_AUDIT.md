# UNELIVO 2.0 — Proje Denetimi (Aşama 1)

Tarih: 21 Ekim 2026 · Kapsam: `C:\Users\kuvvat\Documents\ezo-stile-v2` (yerel) ve `github.com/serdaroveziz/ezo-stile-v2`

> **Aşama 1b güncellemesi (21 Ekim 2026, akşam).** Bu bölüm, aşağıdaki §1 ve §5'teki bulut ortamı bulgularının yerini alır. Testler bu kez **kullanıcının kendi makinesinde**, gerçek `node_modules` ile, ağ erişimi kapalıyken (`scripts/security-offline-guard.cjs`) çalıştırıldı. Kurallar, izole `demo-ezo-rules` emülatöründe test edildi. Canlı Firebase'e ve canlı Vercel'e hiçbir yazma yapılmadı.
>
> ### Git durumu (gerçek)
> | Konu | Bulgu | Durum |
> |---|---|---|
> | Yerel `main` | `ee72e64`, `origin/main` ile aynı (geride ya da ileride commit yok) | Çalışıyor |
> | `feature/unelivo-2` | Önceki oturum yerel işi `519e435` commit'ine aldı. Bu aşamada üç küçük commit eklendi. **GitHub'a gönderilmedi** | — |
> | GitHub deposu | **Herkese açık** (API kimlik doğrulamasız 200 döndü) | — |
> | `519e435` içeriği | `outputs/` (canlı veri dökümü, canlı kural kopyaları) ve `work/` (yakalanmış SDK yapılandırması dahil) eklenmişti | **Güvenlik riski**. `d61f192` bunları takipten çıkardı, dosyalar diskte duruyor. Ancak **`519e435` geçmişte kaldığı için branch bu hâliyle push edilirse veriler yine herkese açık GitHub'a gider.** Push öncesi geçmişin temizlenmesi gerekiyor (ROADMAP §0) |
> | `.env.local` | İzlenmiyor | Çalışıyor |
> | `.env.example` | `.env*` kuralı yüzünden yanlışlıkla yok sayılıyordu. Yalnızca yer tutucu içeriyor, artık izleniyor | Düzeltildi |
>
> ### Vercel (salt-okuma sorgusu)
> | Konu | Bulgu | Durum |
> |---|---|---|
> | Deployment Protection | `ssoProtection: all_except_custom_domains`. Herkese açık tek adres `unelivo.com`. Bütün preview URL'leri ve `ezo-stile-v2-bice.vercel.app` gibi `*.vercel.app` adresleri Vercel girişi istiyor | **Telefonda giriş ekranına takılmanın kök nedeni.** Ayar değişikliği kullanıcı onayı gerektiriyor (ROADMAP P0-12) |
> | Son deployment | `production`, READY. Bu aşamada deploy yapılmadı | — |
> | Rewrite | `/api/(.*)` → `/api/index?path=` (yakalama grubu `$1` yok). Router bu yüzden URL yolundan çözüyor. Çalışıyor ama kırılgan | Kısmen |
>
> ### Yeni bulgular
> | Özellik | Durum | Not |
> |---|---|---|
> | Çalışan mola kaydı (`staff/update-schedule`) | Hatalı → **düzeltildi** (`9983cdf`) | Kayıt sırasında motorun kullandığı `breaks` alanı siliniyordu. Artık doğrulanıyor ve korunuyor |
> | API router loglaması | Güvenlik riski → **düzeltildi** (`4c53073`) | Sorgu dizesi dahil tam URL Vercel loglarına yazılıyordu. Artık yalnızca yöntem ve rota yazılıyor |
> | Router `req.query.path` | Hatalı → **düzeltildi** (`4c53073`) | `test_v2_live_router_path` artık geçiyor |
> | Çalışan manuel randevu yetkisi | **Ürün kararı gerekiyor** | Kod (`hasStaffPermission`) her çalışana izin veriyor. Üç test (`rules_emulator` "manual booking permission regression", `staff_system_final`, `mobile_calendar`) ve kullanıcı spesifikasyonu ("yetkisi varsa") izin kontrolü bekliyor. `staff_operations` testi ise "barber manual is a base capability" diyor. Değiştirmek, bugün manuel randevu açan berberlerin yetkisini kaldırır; bu yüzden dokunulmadı |
> | `test:phase*` ve `test:booking` | Kısmen (test değeri düşük) | Bellek içi sahte veritabanı kullanıyorlar ve iş mantığını test dosyasının içinde yeniden yazıyorlar. Gerçek handler'ları çağırmıyorlar. "GERÇEK PASS" çıktısı üretim davranışını kanıtlamaz |
> | Tarayıcı testleri | Hatalı (altyapı) | `playwright` paketi kurulu değil; diğerleri sabit Edge yolunda 90 sn'de zaman aşımına düşüyor |
> | Manuel randevuda müşteri eşleme | Güvenlik riski (KVKK) | Hâlâ bütün `users` düğümü okunuyor. Telefon biçimleri tutarsız saklandığı için (`register-profile` ham değeri yazıyor) dar sorguya geçmeden önce salt-okuma veri biçimi denetimi gerekiyor; bu oturumda canlı veri okunmadı |
>
> Test sonuçlarının tamamı §5b'de.

> **Aşama 2 (22 Ekim 2026).** Preview'da gerçek hesaplarla (müşteri ve patron) mobil boyutta gezildi ve ölçüldü.
>
> | Konu | Durum | Not |
> |---|---|---|
> | F5 / yeniden girişte "Yükleniyor…" donması | Hatalı → **düzeltildi** (`95fb0d7`) | `index.html` modülleri `?v=` ile yüklüyordu; tarayıcı `auth.js`'i iki kez yükledi, oturum bir kopyada kaldı. **`main` (canlı) da etkileniyor.** |
> | Müşteri alt menüsü sola kayık | Hatalı → **düzeltildi** (`53e47da`) | 4 öğe için 5 sütunlu ızgara |
> | "45 dk)", bölünen filtre etiketleri, tekrarlanan il/ilçe, salon sayfası renkleri | Hatalı → **düzeltildi** (`53e47da`, `583bfca`) | |
> | Okunurluk, müşteri (6 tema × 4 sekme, 558 öğe) | **Çalışıyor** | 0 WCAG AA hatası |
> | Okunurluk, patron (6 tema × 5 sekme) | Hatalı → **düzeltildi** (`f5ce983`) | Vurgu rengi üzerindeki sabit koyu yazı açık temalarda 1.2:1 idi; düzeltmeyle yeniden tarama 0 hata, yatay taşma yok |
> | Çalışan manuel randevu yetkisi | **Karar verildi: her çalışan, yalnız kendi salonunda** | Kod zaten böyleydi; 3 test karara göre güncellendi. Müşteri ve başka salon personeli 403. Kural testi 159/159 |
> | Vercel Deployment Protection | **Kaldırıldı** (kullanıcı kararı, 22 Ekim) | Preview ve `*.vercel.app` girişsiz açılıyor. Preview'lar canlı veritabanına bağlı; uygulama içi auth ve RTDB kuralları aynen geçerli |
> | Okunurluk, çalışan/resepsiyon (6 tema × 4 sekme, 504 öğe) | **Çalışıyor** | 0 WCAG AA hatası, yatay taşma yok, alt menü ortalı (4 × 90 px) |
> | Okunurluk, süper admin (6 tema × 5 sekme, 3.420 öğe) | **Çalışıyor** | 0 WCAG AA hatası, yatay taşma yok, alt menü ortalı (5 × 73 px) |
> | Süper admin çıkış/yeniden giriş donması | Kısmen | Kök neden (çift `auth.js`) `95fb0d7` ile giderildi; çıkış-giriş akışı şifre gerektirdiği için elle test edilmedi |

## 0. Yönetici özeti

1. **En büyük risk kod değil, Git.** GitHub'daki son commit `ee72e64` (v2.2.0). Yerel klasör de bu commit'te duruyor (`clean-core` dalı), ama üstünde **commit edilmemiş ~69 değiştirilmiş + ~164 yeni dosya** var. Takvim, çakışma düzeltmeleri, çalışan paneli, marka kiti, rezervasyon asistanı, kurallar dahil son haftaların bütün işi yalnızca bu bilgisayarda. Disk arızası ya da yanlış bir kopyalama bunların hepsini siler. Bu yüzden **ilk adım commit + push** olmalı (bkz. ROADMAP §0).
2. **Rezervasyon motoru sağlam temelde.** Online, patron-manuel ve çalışan-manuel randevu aynı saf motoru (`src/booking-engine.js`) ve aynı RTDB transaction'ını kullanıyor. Çakışma ve "Fark Etmez" testleri geçiyor. Ana risk ölçeklenme: transaction bütün `/appointments` düğümü üzerinde çalışıyor.
3. **Güvenlik kuralları sıkılaştırılmış.** `appointments`, `reviews` ve `notifications` alanlarına istemci doğrudan yazamıyor. Çalışanlar randevuları yalnızca sunucu projeksiyonu üzerinden görüyor. API router kimliği oturumdan zorluyor.
4. **Açılış ekranında canlıya gidecek iki P0 hata bulundu ve düzeltildi:** bozuk Türkçe karakterler ve kullanıcıya ham hata gösteren tanılama kutusu (§4).
5. **Spesifikasyona göre eksik büyük modüller:** patron için gerçek UNELIVO AI (ciro/müşteri analizi), mola/izin yönetim arayüzü, yorum moderasyonu, CRM/adisyon/stok, kullanıcı bazında sunucuda saklanan tema tercihi ve semantik tasarım tokenları.

## 1. Git ve sürüm durumu

| Konu | Bulgu | Durum |
|---|---|---|
| Yerel dal | `clean-core`. HEAD `ee72e64`, origin/main ve origin/clean-core ile aynı | — |
| Commit edilmemiş iş | 69 değiştirilmiş izlenen dosya, 164 izlenmeyen dosya (src/, server/, testler, kurallar, belgeler) | **Güvenlik riski (veri kaybı)** |
| `.env.local` + `.env.local.yedek-*` | `.gitignore` `.env*` ile hariç tutuluyor. Doğru | Çalışıyor |
| Yedek dosyalar | `index.html.boot-yedek-*`, `src/auth.js.backup`, `local-boot-check.html` proje kökünde | Temizlik gerekiyor |
| `outputs/`, `work/` | Üretim verisi dökümü (`public-businesses-production.json`, 322 KB) ve ekran görüntüleri | Repo'ya girmemeli, `.gitignore`'a eklenmeli |

## 2. Mimari özeti

Ayrıntılar `UNELIVO_ARCHITECTURE.md` içinde. Kısaca: build adımı olmayan vanilla ES module SPA (`index.html` + `src/ui/*.js`), Firebase JS SDK CDN'den import map ile yükleniyor. Vercel'de tek serverless fonksiyon (`api/index.js`) 45 handler'ı yönlendiriyor (Hobby limiti). Veri katmanı Firebase RTDB (Admin SDK sunucuda, kurallar istemcide).

## 3. Özellik sınıflandırması

Durum etiketleri: **Çalışıyor** · **Kısmen** · **Hatalı** · **Eksik** · **Güvenlik riski** · **Yeniden tasarım**

### Kimlik ve roller
| Özellik | Durum | Not |
|---|---|---|
| Rol çözümleme (`auth/resolve-role`) | Çalışıyor | Testleri geçti |
| Kiracı (salon) izolasyonu | Çalışıyor | `staff_tenant_runtime`, `security_local` geçti. `employeeSalonError` aktif üyelik de doğruluyor |
| Süper admin çıkış/yeniden giriş donması | Kısmen | `admin_reentry_runtime` geçti. Gerçek cihazda doğrulanmadı |
| Açılışta yanlış ekrana kısa yönlendirme | Kısmen | 2,5 sn yarış zaman aşımı ve yerel geri yükleme var. Tarayıcı testleri bu ortamda çalıştırılamadı |
| Çalışan manuel randevu yetkisi | **Karar gerekiyor** | API her çalışan rolüne manuel randevuya izin veriyor (`appointments.create` arayüzde kilitli-işaretli). Spesifikasyon "yetkiliyse" diyor ve `staff_system_final` testi izin kontrolü bekliyor. Hangisi doğru, ürün kararı |

### Randevu motoru
| Özellik | Durum | Not |
|---|---|---|
| Ortak motor (online + patron + çalışan) | Çalışıyor | `shared_availability_runtime` geçti |
| Çakışma önleme (sunucu, transaction) | Çalışıyor | `booking_collision_runtime` geçti |
| "Fark Etmez" otomatik atama + kayıtta yeniden doğrulama | Çalışıyor | Transaction içinde `chooseAvailableStaff` yeniden çalışıyor |
| Hizmet süresi, çalışma saati, izin (`timeOff`), mola (`breaks`) | Kısmen | Motor destekliyor, ama **mola/izin girilecek arayüz ya da API yok**. `staff/update-schedule` gün nesnesini `{isOpen,start,end}` olarak yeniden yazıyor ve olası `breaks` alanlarını siliyor |
| Ölçeklenme | **Yeniden tasarım** | Transaction `/appointments` kökünün tamamını indiriyor. Tüm salonlar aynı düğümde yarışıyor. Salon sayısı arttıkça yavaşlar ve transaction yeniden denemeleri tükenebilir |
| `completed` durumu kapasiteyi serbest bırakıyor | Kısmen | Erken "tamamlandı" işaretlenen randevunun kalan süresi yeniden satılabiliyor. Bilinçli mi, teyit edilmeli |
| Manuel randevuda müşteri eşleme | Güvenlik/performans riski | Telefonla eşleşme için bütün `users` düğümü okunuyor. `users` üzerinde `phone` indeksi var, `orderByChild('phone')` kullanılmalı |

### Paneller
| Panel | Durum | Not |
|---|---|---|
| Müşteri: keşif, salon detayı, public `/salon/:slug` | Çalışıyor | Public storefront ve keşif testleri geçti |
| Müşteri: randevu akışı (Hizmet → Çalışan → Tarih/Saat) | Çalışıyor | `customer_booking_experience` geçti |
| Patron: takvim, manuel randevu, ciro kartı | Kısmen | Sunucu testleri geçti. Arayüz kaynak testlerinin bir kısmı eski metinleri arıyor (§5) |
| Çalışan paneli | Çalışıyor | Operasyon, projeksiyon ve self-profil testleri geçti |
| Süper admin | Kısmen | Salon onayı ve askıya alma var. Yorum moderasyonu, abonelik yönetimi ve sistem sağlığı **eksik** |
| Salon Marka Kiti | Kısmen | Logo kırpma ve renk var. Logodan renk önerisi ve erişilebilir kombinasyon kontrolü **eksik** |

### Tema, dil, PWA
| Özellik | Durum | Not |
|---|---|---|
| 6 tema + Sistem Teması, canlı önizleme | Çalışıyor | `src/theme.js`. Palet kontrastı 42/42 AA (yeni test) |
| Tema tercihi kalıcılığı | Kısmen | Yalnızca `localStorage` (cihaz + uid anahtarı). Başka cihazda korunmuyor |
| Semantik token seti (background, surfaceElevated, focusRing…) | Eksik | Eski `--gold-*`/`--theme-panel-*` değişkenleri var. `app.css` içinde 374 sabit hex renk |
| i18n (TR/EN/RU/TK/FA) + Farsça RTL | Çalışıyor | `language_regression`, `persian_i18n` geçti |
| PWA manifest + push-only service worker | Çalışıyor | SW önbellek tutmuyor. Hassas veri offline'a düşmüyor (doğru) |
| İkon dosyaları | Performans riski | `logo.png`, `favicon.png`, `icon-192/512.png`, `apple-touch-icon.png` dosyalarının **her biri 852 KB ve hepsi aynı**. Manifest artık `unelivo-*.png` kullanıyor; eskiler yalnızca testlerde ve yedek HTML'de referanslı |

### AI
| Özellik | Durum | Not |
|---|---|---|
| Randevu asistanı (müşteri/çalışan) | Kısmen | Gerçek LLM (`ai` SDK, `UNELIVO_ASSISTANT_MODEL`), şemayla sınırlı ve yazma yetkisi yok. Model değişkeni yoksa 503 |
| Yüz analizi / saç önerisi (`ai/analyze`) | **Hatalı (sahte)** | Fotoğraftan bağımsız olarak sabit katalogdan ilk 3 öğeyi döndürüyor. Spesifikasyonun "sabit cevap veren demo olmamalı" kuralını ihlal ediyor |
| Patron UNELIVO AI (ciro, boş saat, müşteri, kampanya) | **Eksik** | Patron panelinde AI girişi yok |

### Yorumlar
| Özellik | Durum | Not |
|---|---|---|
| Yalnızca tamamlanmış randevu + tek randevuya tek yorum | Çalışıyor | `review_api_contract` geçti, sunucu doğruluyor |
| Moderasyon / şikâyet | Eksik | — |

## 4. Bu aşamada düzeltilen P0 hatalar

### 4.1 Açılış ekranında bozuk Türkçe (Hatalı → düzeltildi)
`index.html` 18 Ekim'den sonra yanlış kodlamayla yeniden kaydedilmiş. Her kullanıcının gördüğü açılış ekranı ve sekme başlığı şöyleydi:
`UNELIVO YÃ¼kleniyor...`, `GÃ¼venli VIP oturum doÄŸrulanÄ±yor`, `VIP KUAFÃ–R & GÃœZELLÄ°K`, `Uâœ¦`.
Toplam 18 bozuk dize vardı. 18 Ekim yedeğiyle karşılaştırınca, kodlama dışındaki tek fark tanılama betiğiydi.

### 4.2 Canlıda ham hata kutusu (Güvenlik/UX riski → düzeltildi)
`<script id="local-boot-diagnostic">` her ortamda çalışıyordu: herhangi bir `error`/`unhandledrejection` olayında (tarayıcı eklentisi hataları dahil) ekranın tamamını kaplayan beyaz-kırmızı bir kutu açıp dosya adı ve satır numarası gösteriyordu. Betik `<meta charset>`'tan önce durduğu için charset 846. bayta itilmişti.
**Düzeltme:** temiz yedek geri yüklendi. Tanılama betiği korundu ama yalnızca `localhost`/`127.0.0.1` üzerinde çalışıyor ve `<meta charset>`'tan sonra duruyor.

### 4.3 Vercel'e iç dosya yükleme (Düşük risk → düzeltildi)
`.vercelignore` dosyasına `*yedek*`, `local-boot-check.html`, `docs/`, `*.txt`, `INSTALL-WORKSPACE.ps1` eklendi.

## 5. Test sonuçları (gerçekten çalıştırıldı)

**Ortam kısıtı:** Bu denetim bulut çalışma alanında yapıldı. npm kayıt deposuna erişim bu oturumda kapalıydı, bu yüzden `firebase`, `firebase-admin`, `ai`, `@firebase/rules-unit-testing` kurulamadı. Proje dışına (`/home/claude/node_modules`) **çağrıldığında hata fırlatan** küçük taklit paketler kondu. Böylece veritabanını enjekte eden testler çalışabildi, gerçek Firebase'e bağlanan testler ise bilinçli olarak başarısız oldu. Bilgisayarın bağlantısı oturum sırasında koptuğu için testler kendi makinende çalıştırılamadı.

Toplam 89 test dosyası (`test_v2_*.cjs/.mjs`) çalıştırıldı:

| Sonuç | Sayı |
|---|---|
| Geçti | **63** |
| Başarısız | 26 |

Başarısız 26 testin dökümü:

| Neden | Testler | Gerçek hata mı? |
|---|---|---|
| Ortam: eski 852 KB PNG'ler ve il-ilçe JSON'ları bu kopyaya alınmadı | `syntax`, `phase10`, `boot_routing`, `owner_turkey_address` | Hayır (senin makinende muhtemelen geçer) |
| Ortam: Microsoft Edge / Windows'a sabitlenmiş Playwright yolu (`C:/Users/kuvvat/.cache/codex-runtimes/...`) | `auth_entry_ui`, `light_theme`, `preview_dark`, `preview_fixes_browser`, `production_candidate_browser`, `unelivo_browser` | Hayır. Ama testler taşınabilir değil, **düzeltilmeli** |
| Ortam: Firebase emülatörü / `@firebase/rules-unit-testing` / `vm.SourceTextModule` | `rules_emulator`, `auth_tenant_isolation`, `preview_api` | Belirsiz. Emülatörde çalıştırılmalı |
| **Eskimiş kaynak-metin testleri** (bilinçli değiştirilmiş metinleri ya da EZO→UNELIVO adını arıyor) | `customer_tour_part1/2`, `customer_ui_final`, `final_fix`, `final_fix_v2`, `staff_invite_share`, `staff_invite_accept`, `staff_admin_tour`, `motion_system`, `global_ui_contract` (AI dışı 9 emoji) | Test borcu. Davranış test edilmiyor, regex ile kaynak metni aranıyor |
| Eskimiş fikstür (sonradan eklenen üyelik kontrolüne takılıyor) | `mobile_calendar` (403 ≠ 200) | Hayır. Güvenlik sıkılaştırıldı, fikstürde `auth.uid`/`userId` yok |
| Router `req.query.path` okumuyor | `live_router_path` | Düşük risk. Vercel'de `req.url` korunduğu için canlıda çalışıyor |
| Ürün kararı | `staff_system_final` | §3 "Çalışan manuel randevu yetkisi" |

`scripts/run-security-regressions.cjs` → başarısız (ilk adım `test_v2_syntax` PNG eksikliğinden düştü; ortam kaynaklı).

**Yeni eklenen testler (geçti):**
- `test_unelivo_p0_integrity.cjs` → 9/9 (113 kaynak dosya bozuk kodlama için tarandı). Eski `index.html` ile çalıştırıldığında **başarısız oluyor**, yani gerçek hatayı yakalıyor.
- `test_unelivo_theme_contrast.mjs` → 42/42, her tema için 7 metin/zemin çifti WCAG AA 4.5:1. Not: bu test paleti ölçer, `app.css` içindeki sabit renkleri ölçmez (ROADMAP P0-4).

Değişiklik sonrası tam koşu: 63 geçen / 26 başarısız. **Hiçbir testin sonucu değişmedi.**

## 5b. Test sonuçları — kullanıcının makinesi (21 Ekim, gerçek çalıştırma)

Ortam: Windows 10, Node 24.21.0, proje `node_modules`'ı, Java 21, firebase-tools 15.28.2. Bütün node testleri `security-offline-guard.cjs` ile ağ kapalı çalıştı. Canlıya bağlanan üç test bilerek atlandı: `test_v2_security.cjs` (`test:security:live`), `test_v2_production_candidate_browser.cjs` (canlı `*.vercel.app`) ve emülatör testi (ayrı koşuldu).

### `package.json` komutları
| Komut | Sonuç |
|---|---|
| `npm test` (`test_v2_syntax`) | Geçti |
| `test:security` | Geçti, 19/19 |
| `test:booking`, `test:phase3` … `test:phase10` (12 komut) | Hepsi geçti. **Uyarı:** simülasyon testleri, gerçek handler'ı çağırmıyor (yukarıda) |
| `test:security:regressions` | Geçti, 20/20 paket |
| `test:unelivo` | Geçti, 9/9 + 42/42 |
| `test:rules:emulator` (demo emülatör) | **Başarısız.** 143 kontrolden sonra durdu. Tamamı çalıştırıldığında 158 geçti, 1 başarısız ("manual booking permission regression", ürün kararı) |
| `test:security:live` | Çalıştırılmadı (canlı sistem, onay gerekir) |

### Bütün test dosyaları (91 dosya)
| Koşu | Geçti | Başarısız | Zaman aşımı | Atlandı |
|---|---|---|---|---|
| Değişiklikten önce | 69 | 16 | 3 | 3 |
| P0 paketinden sonra | **71** | 16 | 1 | 3 |

Değişen sonuçlar: `live_router_path` başarısız → **geçti** (router düzeltmesi). `preview_dark_local` zaman aşımı → geçti, `preview_fixes_browser` zaman aşımı → başarısız. Bu ikisi Edge tarayıcı testleri; ilk koşuda tarayıcının soğuk açılışı 90 sn'yi aştı. `preview_fixes_browser` artık gerçek hatasını gösteriyor (aşağıda). İlgili kod bu aşamada değişmedi. **Geçen hiçbir test başarısız olmadı.**

### Başarısız 17 testin nedeni
| Neden | Testler |
|---|---|
| Ürün kararı: çalışan manuel randevu yetkisi | `staff_system_final`, `mobile_calendar` (fikstürde `auth.uid`/`userId` da eksik), emülatörde 1 kontrol |
| Eski kaynak-metin testleri (bilinçli değiştirilmiş metni ya da EZO adını arıyor) | `customer_tour_part1/2`, `final_fix`, `final_fix_v2`, `staff_invite_share`, `staff_invite_accept`, `staff_admin_tour`, `motion_system`, `owner_turkey_address` |
| Alt menü sayısı: testler müşteri alt menüsünde 5 öğe bekliyor, kod 4 öğe veriyor | `customer_ui_final`, `global_ui_contract`. Kullanıcının istediği müşteri menüsü 4 öğeli (Ana Sayfa, Salonlar, Randevular, Profil); büyük olasılıkla eskiyen test bu |
| `index.html` metin işaretleriyle fonksiyon kesen test, yeni `index.html` ile geçersiz JS üretiyor | `preview_fixes_browser` |
| Eksik bağımlılık: `playwright` paketi kurulu değil | `auth_entry_ui` |
| Node 24'te `vm.SourceTextModule` yok (`--experimental-vm-modules` gerekir) | `preview_api` |
| Tarayıcı testi 90 sn'yi aşıyor | `unelivo_browser` (zaman aşımı) |

## 6. Güvenlik riskleri (öncelik sırasıyla)

1. ~~Commit edilmemiş iş~~ commit'lendi ama push edilmedi → hâlâ tek kopya. Ayrıca `519e435` canlı veri dökümleri içeriyor; herkese açık depoya olduğu gibi push edilirse **veri sızıntısı** olur (ROADMAP §0).
1b. Vercel SSO koruması `*.vercel.app` ve preview'ları kilitliyor → telefonda giriş ekranı (ROADMAP P0-12).
2. `/appointments` kökünde global transaction → yük altında rezervasyon hataları (erişilebilirlik).
3. Manuel randevuda tüm `users` düğümünün okunması → gereksiz kişisel veri işleme (KVKK veri minimizasyonu).
4. `ai/analyze` sahte sonuç → yanıltıcı ürün davranışı.
5. ~~`api/index.js` her isteği URL dahil logluyor~~ → düzeltildi (`4c53073`).
6. Kurallar demo emülatöründe 158/159 kontrolü geçti. **Canlı kurallar ile `database.rules.json` arasındaki fark hâlâ doğrulanmadı** (salt-okuma karşılaştırma için onay gerekir).

## 7. Yapılmayanlar (bilinçli)

- Canlı Firebase verisine ya da kurallarına dokunulmadı. Deploy yapılmadı.
- Eskimiş testler "geçsin" diye düzenlenmedi. Hangisinin güncelleneceği ROADMAP'te.
- Çalışan manuel randevu yetkisi değiştirilmedi (ürün kararı).
