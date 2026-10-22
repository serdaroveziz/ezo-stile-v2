# UNELIVO — işletme sistemi uyarlaması
17 Ekim 2026. Referans: https://tek-randevu.com/ halka açık ürün tanıtımı. Demo URL'si bulundu, dinamik iç ekranları inceleme aracıyla okunamadı. Özel uygulama koduna erişilmedi. Aşağıdaki rakip özellikleri pazarlama sayfasında belirtilen işlevlerdir; bağımsız ürün doğrulaması değildir.

## Bu pakette tamamlanan ilk aşama
- Bugün özeti: şu anda devam eden, sıradaki ve onay bekleyen randevular. Mevcut randevu listesine yönlendirir; otomatik durum değiştirmez.
- Başvuruda ve salon profilinde birden fazla işletme türü: erkek berberi, kuaför, güzellik, tırnak/nail art, spa/masaj.
- Başvuru → onay → işletme → güvenli public_businesses izdüşümü boyunca türler taşınır. Eski başvurular geriye uyum için türsüz kalabilir; patron profilden seçebilir. Eski serbest kategori uygun olduğu ölçüde eşlenir. Ayrı salon/şube oluşturulmaz.
- Keşif ekranı: tür, il, ilçe filtreleri. Konum izniyle kuş uçuşu mesafe ve yakından uzağa sıralama; 2/5/10/25/50 km filtresi. Mesafe filtresi yokken koordinatsız salonlar sonda. Yol mesafesi veya “şimdi müsait” iddiası yok.
- Konum yalnız kullanıcı düğmeye basınca istenir. İzin hatasında il/ilçe araması devam eder. Müşteri koordinatı sunucuya gönderilmez veya kalıcı saklanmaz. Konum kaldırılabilir. Oturum değişiminde bellek sıfırlanır.
- Mevcut güvenli rezervasyon/tenant motorları korunur. Yeni çeviriler Türkçe; diğer dil çevirileri henüz yok.

## İşletme özellikleri teslim sırası
| Aşama | Modül | Mevcut durum | Bağımlılık ve kabul ölçütü |
|---|---|---|---|
| 1 | Bugün, salon türleri, yakındaki salonlar | Bu pakette | Randevu durumunu değiştirmeden güncel/sıradaki ayrımı; çoklu tür başvurudan profile taşınır; konum izni olmadan filtreler çalışır. |
| 2 | Adım adım tek randevu deneyimi | Temel hizmet→çalışan→tarih/saat mevcut | Müşteri ve manuel form aynı süre/uygunluk motorunu kullanır; eşzamanlı yarışta tek kayıt; geri dönüş seçimleri korur; sabah/öğle/akşam grupları eklenecek. |
| 3 | Müşteri kartı ve adisyon | Not/etiket/geçmiş, ayrı kasa mevcut | Tamamlanan randevu ile adisyon bağlantısı, hizmet+ürün satırı; iptal/ters kayıt; toplamın kuruş doğruluğu. Randevu cirosu ve tahsilat iki kez sayılmaz. |
| 4 | Tahsilat, borç, taksit | Tahsilat/gider/borç ve CSV ilk sürüm | Taksit planı, vade ve kısmi tahsilat; kalan bakiye eşitliği; tekrar istekte çift tahsilat yok; silme yerine denetlenebilir ters kayıt. |
| 5 | Paket/seans ve müşteri görünümü | Elle tamamlanmış randevudan tekil düşüm | İşlem tamamlama ile atomik seans tüketimi, iptalde kontrollü iade, geçerlilik tarihi; müşteri yalnız kendi kalan seanslarını görür. |
| 6 | Personel primleri | Eski yüzde/ciro hesabı var, ödeme defteri yok | Hizmet bazlı prim kuralı/snapshot, paket hizmetinde prim zamanı, iade düzeltmesi ve ödeme kaydı; aynı işlem çift prim üretmez. |
| 7 | Ürün/stok ve raporlar | Stok +/- ve kasa CSV ilk sürüm | Satış adisyonla bağlı, negatif stok yok; tarihli nakit/kart/gider raporu; doluluk çalışma/izin sürelerinden hesaplanır. |
| 8 | SMS hatırlatma ve kampanya | Taslaklar var; SMS gönderimi yok | Sağlayıcı/ücret/izin tercihi gerekir; gönderim defteri, tekrar engeli, hata/yeniden deneme; iptal edilmiş randevuya hatırlatma yok. FCM ile karıştırılmaz. |
| 9 | UNELIVO AI işletme asistanı | Mevcut AI özellikleri salon asistanı değil | Yetkili API'lerden uygunluk sorar, taslak sunar; onay olmadan randevu/kasa kaydı oluşturmaz; salonlar arası veri sızmaz. |
| 10 | Çok şube, dış siteye randevu ekleme | Yok; salonun public sayfası var | Şube seçimi sunucuda yetkilendirilir, ekip/kasa/rapor ayrı; embed için yalnız public rezervasyon, yönetim verisi paylaşılmaz. |
| 11 | Telefon ve yayın kapısı | Production unelivo.com ayrı mevcut | Önizlemede gerçek telefon, aç/kapat, giriş/çıkış, iki salon ve iki cihaz testi; sonra ayrı production onayı. Native iPhone uygulaması bu web paketinin parçası değil. |

Bu tablo tüm modüllerin bittiği anlamına gelmez. Bu teslim ilk aşamadır. SMS, prim, taksit, AI veya şube yönetimi bu paketle tamamlanmış sayılmaz. Paketleri sırayla, test edilebilir sürümler halinde teslim etmek mevcut randevu sisteminin korunmasını sağlar.

## Test ve yayın sınırı
20 mevcut regression, yeni discovery/types ve başvuru/profil API runtime testleri; ayrıca tenant, shared availability, collision, workspace, admin reentry ve service worker testleri. API testleri fake veritabanıyla gerçek handler çalıştırır; canlı Firebase testi değildir. Tarayıcı/gerçek telefon görsel kontrolü bu ortamda tamamlanmadı. Yeni türler var olan salonlarda kendiliğinden yazılmaz; patron kaydettiğinde oluşur. DB rule, canlı veri ve production değişikliği yapılmadı.

## Kurulum
Bu ZIP en son staff-unified-ui kaynaklarının üzerine uygulanır. src/server/index.html yedeklenir. ZIP köke çıkarılır. node test_v2_discovery_types_runtime.cjs, node test_v2_salon_types_api_runtime.cjs, node test_v2_staff_tenant_runtime.cjs, node test_v2_booking_collision_runtime.cjs ve node scripts/run-security-regressions.cjs geçince yalnız Preview yayımlanır:
vercel.cmd --yes --scope serdaroveziz17-8085s-projects

Telefon kontrolü: yeni salon başvurusunda iki tür seç; önizlemenin canlı veri kullanıp kullanmadığını kontrol etmeden gerçek başvuru gönderme. Kontrollü test salonunda patron profilinden tür seç; müşteri keşifte tür+şehir+ilçe uygula; konuma izin ver/reddet; 5 km filtresi ve konumsuz salonu kontrol et. Onay/başvuru gerçek canlı veri yazımıdır; bu paket testi bunu otomatik yapmaz.
