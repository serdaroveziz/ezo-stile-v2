# UNELIVO salon çalışma alanı — ilk aşama
15 Ekim 2026. Referans: https://salonia.io/ halka açık ürün turu. Oturum açılan Salonia uygulaması incelenmedi. UNELIVO markası ve mevcut rezervasyon motoru korunur.

## Hazır olanlar
- Patron navigasyonu: Özet, Ajanda, hızlı randevu, Müşteriler, Menü.
- Gün personel sütunları, hafta listesi, ay ızgarası; personel filtresi, dolu saatler, izinler. Boş saate dokunmak mevcut manuel randevu formunu açar. Sunucu mevcut çakışma kontrolünü uygular.
- Müşteri arama, geçmiş, not, etiket, doğum tarihi, SMS izin beyanı. Beyan kaydı doğrulanmış hukuki izin değildir.
- Kasa: ayrı tahsilat, gider, müşteri borcu kayıtları; nakit/kart/havale ayrımı, CSV. Randevu cirosundan ayrı tutulur, otomatik tahsilat oluşturmaz. Müşteri bakiyesi borç eksi tahsilat; negatif bakiye avanstır.
- Paket oluşturma, tamamlanan aynı müşteri/hizmet randevusundan elle seans düşme; aynı randevu iki kez düşülmez.
- Ürün ve stok artış/azalışı. Kampanya taslakları. Kasa özeti ve CSV raporu.
- Yeni özel kayıtlar sunucuda yalnız doğrulanmış salon sahibine açıktır; çalışan ve müşteri panelleri mevcut akışla devam eder.

## Sonraki aşamalar / sınırlar
- SMS sağlayıcısı ve otomatik SMS henüz bağlı değil; hiçbir SMS gönderilmez.
- Ajandada sürükle-bırak, otomatik paket düşümü, ürün satış/POS entegrasyonu, çok şubeli yönetim bu aşamada yok.
- Yeni ekranlar Türkçe; mevcut uygulamanın diğer dil dosyaları korunmuştur, yeni ekranların çevirisi sonraki aşamadır.
- Kasa kayıtları silinmez/düzeltilmez; muhasebe ters kayıt ve arşivleme sonraki aşama. Salon başına 5000 işlemden sonra arşivleme gerekir. Bu ilk sürümde tüm salon operasyon ağacı transaction kullanır.
- Canlı Firebase/Vercel erişimiyle uçtan uca doğrulama yapılmadı. Yerel HTML önizlemesi ortam tarayıcısının politikasıyla engellendi; telefon yerleşimi gözle doğrulanmadı.

## Kontroller
20 mevcut regression paketi, workspace runtime (API yaz/oku/tekrar işlem, rol/salon izolasyonu, para kuruş doğruluğu, paket ve stok, CSV, ajanda), booking collision runtime ve admin reentry runtime.
Fake veritabanı ile API testleri gerçek Firebase yük/bağlantı testinin yerine geçmez.

## Kurulum
ZIP içeriğini C:\Users\kuvvat\Documents\ezo-stile-v2 klasörüne üzerine yazılacak şekilde çıkarın. Öncesinde yedek alın. Bu bir kaynak güncellemesidir, kendi başına yayına çıkmaz.
PowerShell: powershell -ExecutionPolicy Bypass -File .\INSTALL-WORKSPACE.ps1
Betik testleri çalıştırır; yayın yapmaz. Testler geçince Preview için:
vercel.cmd --yes --scope serdaroveziz17-8085s-projects
Yeni Preview linkinde patron ile kontrol edin; eski Preview linki değişmez. --prod kullanmayın, önce inceleyin. Yeni endpoint için ayrıca DB kuralı yayımlamak gerekmez; client doğrudan özel operasyon kayıtlarına erişmez.
