# UNELIVO yazılı randevu asistanı — ilk sürüm

Müşteri, patron ve aktif çalışan için yazılı randevu planlama. Sesli kullanım bu pakette yoktur. Asistan mevcut salonun hizmetlerini ve ortak müsaitlik motorunu kullanır. İşlem özeti açıkça onaylanmadan randevu oluşturulmaz. Onay sırasında müsaitlik yeniden kontrol edilir; aynı taslağın tekrar onaylanması ikinci kayıt oluşturmaz.

## Kurulum

Önce mevcut dosyaları yedekleyin, ZIP içeriğini proje köküne çıkarın. `npm.cmd install` çalıştırın. Vercel Preview ortamında aşağıdaki değişkenleri tanımlayın ve yeniden Preview yayımlayın:

- `UNELIVO_ASSISTANT_ENABLED`: `true`
- `UNELIVO_ASSISTANT_MODEL`: AI Gateway güncel kataloğundan yapılandırılmış çıktı destekleyen tam sağlayıcı/model kimliği.
- `UNELIVO_ASSISTANT_SECRET`: kriptografik olarak rastgele üretilmiş en az 32 karakterlik gizli değer.
- `AI_GATEWAY_API_KEY`: hesabınızın Gateway anahtarı; alternatif olarak geçerli Vercel OIDC kimliği.

Anahtarları sohbet ekranına, kaynak koda veya tarayıcıya koymayın. Gateway hesabında kredi ve harcama sınırı ayrıca ayarlanmalıdır. Kurulum eksikse asistan açık bir yapılandırma mesajı gösterir; normal randevu sistemi kullanılabilir.

## Sınırlar ve gizlilik

Kullanıcı başına saatte 20, proje genelinde günde 200 model isteği sınırı vardır. Bunlar parasal bütçe değildir. Model çağrısı 20 saniyede kesilir, otomatik tekrar denenmez ve çıktı sınırı 600 tokendır. Seçilen modelin bu sınıra uygunluğu canlı denemede doğrulanmalıdır.

Yazılan mesajlar ve mesajda verilen ad/telefon AI sağlayıcısına gönderilebilir. Tüm müşteri veya randevu veritabanı modele gönderilmez. Sohbet tarayıcıda kalıcı tutulmaz. İmzalı taslak 10 dakika geçerlidir ve oturumdaki kişiye bağlıdır. Çalışanlar yalnız kendi aktif salon üyelikleri kapsamında işlem yapabilir.

Bu sürüm ödeme, iptal, yetki değişikliği veya ses kaydı yapmaz. Firebase kurallarını değiştirmek gerekmez; kota sayaçları yalnız sunucu tarafından yazılır.

## Doğrulama ve yayın

`node test_v2_booking_assistant_runtime.cjs` ardından `node scripts/run-security-regressions.cjs` çalıştırın. Testler model yanıtını taklit eder; canlı sağlayıcı bağlantısı, gerçek telefon ve tarayıcı deneyimi henüz doğrulanmadı. Önce Preview ortamında müşteri ve çalışan hesaplarıyla deneyin. Bu paket üretime yayın yapmaz.

Kapatmak için `UNELIVO_ASSISTANT_ENABLED=false` ayarlayıp yeniden yayınlayın.
