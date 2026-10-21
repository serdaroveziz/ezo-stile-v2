# UNELIVO 2.0 — Aşamalı Geliştirme Planı

İlke: çalışan özellikler korunur, her paket küçük, geri alınabilir ve testli olur. Canlı veri, kural ve deploy işlemleri yalnızca açık onayla yapılır.

## §0 — Hemen · Kayıp riskini kapat, sızıntı olmadan

Durum (21 Ekim akşamı): `feature/unelivo-2` var, yerel iş commit'lendi, `.gitignore` güncellendi (`d61f192`). **Henüz push edilmedi.**

Engel: `519e435` commit'i `outputs/` ve `work/` klasörlerini (canlı veri dökümü, canlı kural kopyaları, yakalanmış SDK yapılandırması) içeriyor. Depo herkese açık. Bu yüzden branch olduğu gibi push edilmemeli. Önerilen yol, **kullanıcı onayıyla**: push edilmemiş dört commit'i, bu klasörler hiç girmemiş tek bir temiz commit'e dönüştürmek (`git reset --soft ee72e64` → `git commit`), sonra `git push -u origin feature/unelivo-2`. Diskteki dosyalar etkilenmez. Bu işlem yerel geçmişi yeniden yazdığı için onaysız yapılmadı.

## P0 — Kritik temel (sıralı paketler)

| # | Paket | Durum |
|---|---|---|
| P0-1 | Açılış bütünlüğü: bozuk Türkçe, canlıda hata kutusu, `.vercelignore` + regresyon testi | **Tamamlandı (bu aşama)** |
| P0-2 | Tema palet kontrast testi (6 tema × 7 çift) | **Tamamlandı (bu aşama)** |
| P0-3 | Test altyapısı: Playwright yolunu `require('playwright')` yap, Edge yerine Chromium kullan, eskimiş 11 kaynak-metin testini davranış testine çevir ya da kaldır, `mobile_calendar` fikstürüne `uid`/`userId` ekle, tek `npm run test:all` komutu | Sırada |
| P0-4 | Semantik tasarım tokenları (`--color-background` … `--color-focus-ring`), `theme.js` üretir, eski değişkenler geriye dönük takma ad olarak kalır. Playwright ile **render edilmiş** sayfa kontrast taraması (her tema × müşteri/patron/çalışan/admin ana ekranları) | Sırada |
| P0-5 | Tema tercihini `users/{uid}/preferences/theme` alanına yaz (kural: yalnızca kendi uid'i). Yeniden girişte ve başka cihazda korunur | Kural değişikliği → **onay gerekir** |
| P0-6 | Rezervasyon ölçeklenmesi: transaction'ı `booking_locks/{businessId}/{date}` sürüm düğümüne daralt. Eşzamanlı 20 istek testi (emülatör) | Şema eklemesi → **onay gerekir** |
| P0-7 | Mola ve izin yönetimi: `staff/update-schedule` `breaks` alanını korusun, ayrıca `staff/update-time-off` API'si ve kompakt arayüz (eski karmaşık doluluk takvimi geri getirilmeyecek) | **Kısmen.** API mola koruma + doğrulama tamam (`9983cdf`). Arayüz ve izin API'si sırada |
| P0-8 | Manuel randevuda telefon eşleme: `users` tam okuma yerine `orderByChild('phone').equalTo(...)` | Sırada. Önce canlı `users/*/phone` biçimlerinin salt-okuma denetimi (onayla) |
| P0-12 | Vercel Deployment Protection: `all_except_custom_domains` → yalnızca preview'ları koru (`preview`) ya da preview'lar için paylaşılabilir bypass bağlantısı. Telefonda giriş ekranı sorununu çözer | Hesap ayarı → **onay gerekir** |
| P0-13 | API router loglaması (yalnızca yöntem + rota) ve `req.query.path` | **Tamamlandı** (`4c53073`) |
| P0-14 | Repo hijyeni: `outputs/`, `work/`, yedekler takipten çıktı, `.env.example` izleniyor | **Tamamlandı** (`d61f192`). Geçmiş temizliği §0'da |
| P0-9 | Süper admin: yorum moderasyonu + şikâyet kuyruğu | Sırada |
| P0-10 | Salon Marka Kiti: logodan renk önerisi, marka rengi / yazı kontrast uyarısı | Sırada |
| P0-11 | `ai/analyze`: sahte sonucu kaldır ya da "örnek" diye açıkça etiketle | **Karar gerekir** |

Karar bekleyen konu: **çalışanlar manuel randevu oluşturabilsin mi?** Şu an herkes oluşturabiliyor. Spesifikasyon ise "yetkiliyse" diyor. Bu karar üç başarısız testi doğrudan belirliyor (`rules_emulator`, `staff_system_final`, `mobile_calendar`). "Yetkiliyse" seçilirse: `hasStaffPermission` içindeki koşulsuz `appointments.create` istisnası kalkar, `berber` varsayılan izinlerine eklenip eklenmeyeceğine karar verilir, `staff_operations` testindeki "base capability" beklentisi güncellenir.

## P1 — İşletme özellikleri

1. **UNELIVO AI (patron):** sunucu tarafında `ai/owner-insights`. Önce deterministik metrik sorguları çalışır (ciro, boş saat, iptal oranı, 45 gündür gelmeyen müşteriler), model yalnızca bu hesaplanmış özetleri yorumlar. Müşteri adı ve telefonu modele gönderilmez, salon kimliği oturumdan gelir. Kullanım limiti ve maliyet tavanı olur, yalnızca okuma yetkisi verilir. Ücretli model kullanımı için **onay gerekir**.
2. CRM (müşteri geçmişi, segment, not).
3. Adisyon ve ödeme kaydı (online ödemeden ayrı).
4. Ciro raporları, çalışan performansı.
5. Stok.

## P2 — Marketplace büyümesi
Gelişmiş keşif, "Şimdi Müsait", son dakika boşluk doldurma, akıllı kampanyalar, sadakat sistemi, organik sıralama.

## P3 — İleri seviye
Online ödeme ve kapora, abonelik paketleri, hediye kartı, prim, çok şube, muhasebe entegrasyonu.

## Yayın kapısı
Preview deployment → kritik test listesi (TEST_PLAN §2) yeşil → gerçek telefonda duman testi → **kullanıcı onayı** → production.
