# Patron simgeleri / çalışan salon sınırı
16 Ekim 2026

Patron menüsü müşteri menüsündeki aynı icon span + SVG yapısını kullanır. Eski yüzde 20 düğme genişliği, grid içindeki düğmeyi daralttığından yalnız patron gridinde yüzde 100 olarak düzeltildi. Görsel tema tercihi değişmez.

Çalışan paneli kullanıcının doğrulanmış businessId bilgisini kullanır; salon seçme eklenmedi. Çalışan randevu oluşturma ve müsaitlik uçları başka salonu hedefleyen normal/manuel istekleri reddeder. Her istekte sunucudaki aktif çalışan üyeliği yeniden kontrol edilir. Randevu liste ve personel bağlamı uçlarında mevcut salon üyeliği ve veri projeksiyonu korunur, test edilebilir veritabanı bağımlılığı eklendi. Başka salonun bildirimleri çalışan ekranında filtrelenir; salon etiketi olmayan hesap bildirimleri gösterilmeye devam eder.

Normal çalışan yalnız kendi randevularını görür. Patronun izin verdiği yönetici/resepsiyon salon içindeki diğer randevuları görebilir. Manuel randevu oluşturma yetkisi verilen barber rolü de yalnız kendi salonu için işlem yapabilir; herkes için bu yetki otomatik açılmaz. Müşteri rolünün salon keşfi korunur.

Test: çalışan A'nın salon B için manuel/normal oluşturma, müsaitlik, liste ve bağlam isteği 403; aktif kendi salonunun yetkili kayıtları 200; pasif çalışan bütün iş uçlarında 403; yazma yok. Fake veritabanı kullanan gerçek handler testleri ve mevcut regression testleri çalıştırıldı. Canlı Firebase güvenlik kuralı/veri değişikliği yapılmadı. Telefon görünümü henüz gözle doğrulanmadı.

ZIP mevcut simple-shared-booking güncellemesinin üzerine proje köküne çıkarılmalıdır. Önce src/server/api yedekleyin. node test_v2_staff_tenant_runtime.cjs, node test_v2_shared_availability_runtime.cjs, node test_v2_booking_collision_runtime.cjs, node scripts/run-security-regressions.cjs. Hepsi geçince vercel.cmd --yes --scope serdaroveziz17-8085s-projects ile yalnız Preview yayımlayın.
