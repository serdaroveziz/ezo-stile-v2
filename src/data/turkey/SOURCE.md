# Türkiye idari yerleşim verisi

- Kaynak veri: `sabrigunes/turkey-administrative-units-dataset`
- Kaynak URL: https://github.com/sabrigunes/turkey-administrative-units-dataset
- Asıl resmi kaynak: T.C. İçişleri Bakanlığı Mülki İdare Bölümleri Envanteri
- Veri tarihi: Ekim 2025
- Lisans: CC0 1.0 Universal (`LICENSE`)
- Kapsam: 81 il, 973 ilçe, 32.288 mahalle

Kaynakta `district_id: 0` olarak bırakılmış 1.483 merkez mahallesi, başka bir
ilçeye tahminle dağıtılmadan, aynı ilde zaten bulunan resmi `MERKEZ` ilçesine
bağlanmıştır. Aynı ilçe içinde aynı mahalle adını taşıyan 130 yinelenen kaynak
kimliği seçim kutusunda tekrar gösterilmez. Bu nedenle 32.288 kaynak kaydı,
32.158 benzersiz seçilebilir mahalle adı olarak sunulur.

Tarayıcı tüm Türkiye mahallelerini tek seferde yüklemez. `provinces.json` yalnız il
indeksidir. `locations/{plaka}.json` dosyası ancak kullanıcı bir il seçtiğinde
yüklenir ve o ilin ilçeleri ile mahallelerini içerir.
