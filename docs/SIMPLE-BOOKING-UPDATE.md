# UNELIVO sade arayüz ve ortak müsaitlik
16 Ekim 2026

- Üstte sabit tema düğmesi kaldırıldı. Tüm rollerin Profil bölümünde Ayarlar → Tema ve görünüm var. Kullanıcıya özel tema saklama devam eder.
- Alt navigasyon düz zemin, küçük ikon ve etiketlerden oluşur. Patron menüsü dört öğe: Özet, Ajanda, Müşteriler, Menü. Büyük orta + kaldırıldı; randevu ekleme Özet sayfasında kaldı.
- Patron menüsü kart ızgarası yerine sade satırlara dönüştü. Yeni animasyon eklenmedi.
- Müşteri/patron/çalışan aynı /api/booking/availability ve aynı transaction tabanlı kayıt motorunu kullanır. Seçilen çalışan doluysa “diğer müsait çalışanlar” ayrıntısı açılır; çalışan seçimini değiştirerek randevu alınır. Otomatik olarak kullanıcının seçtiği çalışan değiştirilmez. Fark Etmez için uygun çalışan otomatik atanır.
- Alternatifler yalnız hizmeti yapabilen aktif ve uygun çalışanları içerir. Müşteri isimleri, telefonları veya başka randevu ayrıntıları paylaşılmaz.
- Ekrandaki müsaitlik anlık sorgu sonucudur; kayıt anında tekrar kontrol edilir. Bu yama canlı ekranlara yeni bir polling/Realtime aboneliği eklemez. Ekranı yeniden açma veya çalışan/tarih seçimini değiştirme müsaitliği yeniden sorgular.
- Dışarıdan gelen müşteri mevcut salon/randevu akışını kullanır. Bu yama anonim API erişimi veya Firebase kuralı açmaz; mevcut uygulama giriş koşulları devam eder.
- Önceki service worker düzeltmesi korunur. Kullanıcı son olarak açıldığını bildirdi; kalıcı açılış kararlılığı telefonda ayrıca kontrol edilmelidir.

Yerel doğrulama: 20 regression, shared availability, booking collision, workspace, admin reentry, service-worker testleri. Canlı Firebase ve telefon görüntüsü bu ortamda doğrulanmadı. Vercel Preview paylaşım erişimi ayrıca gereklidir. Production veya canlı Firebase değişikliği yapılmadı.

Kurulum: src/server/api/index.html/sw.js dosyalarını yedekleyin. ZIP proje köküne çıkarılır. node test_v2_shared_availability_runtime.cjs, node test_v2_booking_collision_runtime.cjs ve node scripts/run-security-regressions.cjs geçtikten sonra Preview yayımlayın. npm build tanımlı değildir; statik kaynak proje yapısı korunur.
