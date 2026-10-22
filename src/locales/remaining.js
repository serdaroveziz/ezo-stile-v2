// Remaining reviewed customer and administration UI copy.
const rows = `
Bugün kapalı|Closed today|Сегодня закрыто|مغلق اليوم|Şu gün ýapyk|امروز بسته است
Bugün açık|Open today|Сегодня открыто|مفتوح اليوم|Şu gün açyk|امروز باز است
Salon Sayfası|Salon Page|Страница салона|صفحة الصالون|Salon sahypasy|صفحه سالن
Salon kapak fotoğrafı|Salon cover photo|Обложка салона|صورة غلاف الصالون|Salonyň daşky suraty|تصویر روی جلد سالن
Salon logosu|Salon logo|Логотип салона|شعار الصالون|Salonyň logotipi|نشان سالن
Yol Tarifi|Directions|Маршрут|الاتجاهات|Ýol görkezmesi|مسیریابی
Randevu Al|Book Appointment|Записаться|احجز موعداً|Nobat al|رزرو نوبت
Hizmet bulunmuyor.|No services available.|Услуг нет.|لا توجد خدمات.|Hyzmat ýok.|خدمتی وجود ندارد.
Personel bilgisi yok.|No staff information.|Нет данных о сотрудниках.|لا توجد معلومات عن الموظفين.|Işgär maglumaty ýok.|اطلاعات کارکنان موجود نیست.
Salon galerisi|Salon gallery|Галерея салона|معرض الصالون|Salon galereýasy|گالری سالن
Henüz yorum yok.|No reviews yet.|Отзывов пока нет.|لا توجد مراجعات بعد.|Entäk teswir ýok.|هنوز دیدگاهی وجود ندارد.
Devamını Gör (|Show More (|Показать ещё (|عرض المزيد (|Dowamyny görkez (|نمایش بیشتر (
Çalışma Saatleri|Working Hours|Часы работы|ساعات العمل|Iş wagtlary|ساعات کاری
İletişim & Konum|Contact & Location|Контакты и адрес|التواصل والموقع|Habarlaşmak we ýerleşýän ýeri|تماس و موقعیت
Salon haritası|Salon map|Карта салона|خريطة الصالون|Salon kartasy|نقشه سالن
Randevu Alımı Kapalı|Booking Disabled|Запись закрыта|الحجز مغلق|Nobat almak ýapyk|رزرو نوبت بسته است
Randevu Al →|Book →|Записаться →|احجز ←|Nobat al →|رزرو ←
Salon fotoğrafı|Salon photo|Фото салона|صورة الصالون|Salon suraty|تصویر سالن
Merhaba,|Hello,|Здравствуйте,|مرحباً،|Salam,|سلام،
VIP Kuaför & Berber randevunuzu saniyeler içinde planlayın.|Book your VIP hair and barber appointment in seconds.|Запишитесь в VIP-салон за несколько секунд.|احجز موعد الشعر والحلاقة المميز خلال ثوانٍ.|VIP saç we dellek nobatyňyzy sekuntlarda meýilleşdiriň.|نوبت آرایشگاه ویژه خود را در چند ثانیه تنظیم کنید.
Salon adı, semt veya hizmet ara...|Search salon, district or service...|Поиск салона, района или услуги...|ابحث عن صالون أو منطقة أو خدمة...|Salon, etrap ýa-da hyzmat gözle...|جستجوی سالن، محله یا خدمت...
Salon bulunamadı.|Salon not found.|Салон не найден.|لم يتم العثور على الصالون.|Salon tapylmady.|سالن پیدا نشد.
Favorilerden çıkar|Remove from favorites|Удалить из избранного|إزالة من المفضلة|Halanýanlardan aýyr|حذف از علاقه‌مندی‌ها
Hızlı Randevu Al|Quick Booking|Быстрая запись|حجز سريع|Çalt nobat al|رزرو سریع
Favori Salonlarım|My Favorite Salons|Избранные салоны|صالوناتي المفضلة|Halanýan salonlarym|سالن‌های مورد علاقه من
Salon Ekle|Add Salon|Добавить салон|إضافة صالون|Salon goş|افزودن سالن
Henüz favori salonunuz yok.|You have no favorite salons yet.|В избранном пока нет салонов.|لا توجد صالونات مفضلة بعد.|Entäk halaýan salonyňyz ýok.|هنوز سالن مورد علاقه‌ای ندارید.
Salonlar bölümündeki yıldıza dokunarak ekleyebilirsiniz.|Tap the star in Salons to add one.|Нажмите звезду в разделе салонов.|اضغط النجمة في قسم الصالونات للإضافة.|Salonlar bölümindäki ýyldyza basyp goşuň.|برای افزودن، ستاره بخش سالن‌ها را بزنید.
Randevu almak için önce bir salon seçin|Choose a salon before booking|Сначала выберите салон|اختر صالوناً قبل الحجز|Ilki salon saýlaň|برای رزرو ابتدا یک سالن انتخاب کنید
Salonlar sekmesinden dilediğiniz salonu seçip randevunuzu sıfırdan oluşturabilirsiniz.|Choose any salon from the Salons tab and start a new booking.|Выберите салон во вкладке «Салоны» и создайте новую запись.|اختر صالوناً من تبويب الصالونات وابدأ حجزاً جديداً.|Salonlar goýmasyndan salon saýlap täze nobat dörediň.|از برگه سالن‌ها یک سالن انتخاب و نوبت جدید ایجاد کنید.
Salonları Aç|Open Salons|Открыть салоны|فتح الصالونات|Salonlary aç|باز کردن سالن‌ها
Seçili Salon|Selected Salon|Выбранный салон|الصالون المحدد|Saýlanan salon|سالن انتخاب‌شده
Değiştir|Change|Изменить|تغيير|Üýtget|تغییر
Bu salonda aktif hizmet bulunmuyor.|This salon has no active services.|В салоне нет активных услуг.|لا توجد خدمات نشطة في هذا الصالون.|Bu salonda işjeň hyzmat ýok.|این سالن خدمت فعالی ندارد.
Seçili|Selected|Выбрано|محدد|Saýlanan|انتخاب‌شده
Seç →|Select →|Выбрать →|اختر ←|Saýla →|انتخاب ←
Önce yukarıdan bir hizmet seçiniz.|Select a service above first.|Сначала выберите услугу выше.|اختر خدمة من الأعلى أولاً.|Ilki ýokardan hyzmat saýlaň.|ابتدا یک خدمت از بالا انتخاب کنید.
Önce hizmet ve personel seçiniz.|Select a service and staff member first.|Сначала выберите услугу и сотрудника.|اختر الخدمة والموظف أولاً.|Ilki hyzmat we işgär saýlaň.|ابتدا خدمت و کارمند را انتخاب کنید.
Bugün (|Today (|Сегодня (|اليوم (|Şu gün (|امروز (
Yarın (|Tomorrow (|Завтра (|غداً (|Ertir (|فردا (
Öbür Gün (|Day After Tomorrow (|Послезавтра (|بعد غد (|Birigün (|پس‌فردا (
Başka Tarih:|Other Date:|Другая дата:|تاريخ آخر:|Başga sene:|تاریخ دیگر:
Önce hizmet, personel ve tarih seçiniz.|Select service, staff and date first.|Сначала выберите услугу, сотрудника и дату.|اختر الخدمة والموظف والتاريخ أولاً.|Ilki hyzmat, işgär we sene saýlaň.|ابتدا خدمت، کارمند و تاریخ را انتخاب کنید.
Salon bugün kapalı.|The salon is closed today.|Сегодня салон закрыт.|الصالون مغلق اليوم.|Salon şu gün ýapyk.|سالن امروز بسته است.
Salon seçtiğiniz tarihte kapalı.|The salon is closed on the selected date.|Салон закрыт в выбранную дату.|الصالون مغلق في التاريخ المحدد.|Salon saýlanan senede ýapyk.|سالن در تاریخ انتخابی بسته است.
Yarınki Tarihi ve Saatleri Aç|Show Tomorrow's Times|Показать время на завтра|عرض أوقات الغد|Ertiriň wagtlaryny görkez|نمایش زمان‌های فردا
Seçilen hizmet:|Selected service:|Выбранная услуга:|الخدمة المحددة:|Saýlanan hyzmat:|خدمت انتخاب‌شده:
dk • Saat aralığı:|min • Time interval:|мин • Интервал:|دقيقة • الفاصل:|min • Wagt aralygy:|دقیقه • فاصله زمانی:
dk • Geçmiş saatler otomatik gizlenir|min • Past times are hidden automatically|мин • Прошедшее время скрыто|دقيقة • تُخفى الأوقات الماضية تلقائياً|min • Geçen wagtlar awtomatik gizlenýär|دقیقه • زمان‌های گذشته خودکار پنهان می‌شوند
Değişiklik Talebini Geri Çek|Withdraw Change Request|Отозвать запрос изменения|سحب طلب التغيير|Üýtgetmek haýyşyny yzyna al|پس گرفتن درخواست تغییر
İptal Talebi Alındı|Cancellation Request Received|Запрос отмены получен|تم استلام طلب الإلغاء|Ýatyrmak haýyşy alyndy|درخواست لغو دریافت شد
Onay Bekleyen|Awaiting Approval|Ожидают подтверждения|بانتظار الموافقة|Tassyklama garaşýar|در انتظار تأیید
Onay bekleyen randevunuz yok.|No appointments awaiting approval.|Нет записей на подтверждение.|لا توجد مواعيد بانتظار الموافقة.|Tassyklama garaşýan nobat ýok.|نوبتی در انتظار تأیید نیست.
Aktif Randevular|Active Appointments|Активные записи|المواعيد النشطة|Işjeň nobatlar|نوبت‌های فعال
Aktif randevunuz yok.|You have no active appointments.|У вас нет активных записей.|ليس لديك مواعيد نشطة.|Işjeň nobatyňyz ýok.|نوبت فعالی ندارید.
İptal Edilenler|Cancelled Appointments|Отменённые записи|المواعيد الملغاة|Ýatyrylan nobatlar|نوبت‌های لغوشده
İptal edilmiş randevunuz yok.|You have no cancelled appointments.|У вас нет отменённых записей.|ليس لديك مواعيد ملغاة.|Ýatyrylan nobatyňyz ýok.|نوبت لغوشده‌ای ندارید.
Geçmiş randevunuz yok.|You have no past appointments.|У вас нет прошлых записей.|ليس لديك مواعيد سابقة.|Öňki nobatyňyz ýok.|نوبت گذشته‌ای ندارید.
İptal Edilen|Cancelled|Отменённые|ملغاة|Ýatyrylan|لغوشده
Bildiriminiz bulunmamaktadır.|You have no notifications.|У вас нет уведомлений.|لا توجد إشعارات.|Bildirişiňiz ýok.|اعلانی ندارید.
Profil Fotoğrafı|Profile Photo|Фото профиля|صورة الملف الشخصي|Profil suraty|تصویر پروفایل
Fotoğraf Yükle / Değiştir|Upload / Change Photo|Загрузить / изменить фото|رفع / تغيير الصورة|Surat ýükle / üýtget|بارگذاری / تغییر تصویر
Fotoğrafı Kaldır|Remove Photo|Удалить фото|إزالة الصورة|Suraty aýyr|حذف تصویر
Profil fotoğrafınız başarıyla güncellendi.|Profile photo updated.|Фото профиля обновлено.|تم تحديث صورة الملف.|Profil suraty täzelendi.|تصویر پروفایل به‌روزرسانی شد.
Profil fotoğrafınız kaldırıldı.|Profile photo removed.|Фото профиля удалено.|تمت إزالة صورة الملف.|Profil suraty aýryldy.|تصویر پروفایل حذف شد.
Şifre Değiştir|Change Password|Изменить пароль|تغيير كلمة المرور|Açar sözüni üýtget|تغییر رمز عبور
Mevcut Şifre|Current Password|Текущий пароль|كلمة المرور الحالية|Häzirki açar söz|رمز عبور فعلی
Yeni Şifre|New Password|Новый пароль|كلمة المرور الجديدة|Täze açar söz|رمز عبور جدید
Yeni Şifre Tekrar|Repeat New Password|Повторите новый пароль|تأكيد كلمة المرور الجديدة|Täze açar sözüni gaýtala|تکرار رمز عبور جدید
Şifreyi Kaydet|Save Password|Сохранить пароль|حفظ كلمة المرور|Açar sözüni ýatda sakla|ذخیره رمز عبور
Yeni şifreniz en az 6 karakter olmalıdır.|New password must have at least 6 characters.|Новый пароль должен содержать не менее 6 символов.|يجب أن تتكون كلمة المرور الجديدة من 6 أحرف على الأقل.|Täze açar söz azyndan 6 nyşan bolmaly.|رمز عبور جدید باید حداقل ۶ نویسه باشد.
Yeni şifreler birbiriyle eşleşmiyor.|New passwords do not match.|Новые пароли не совпадают.|كلمتا المرور الجديدتان غير متطابقتين.|Täze açar sözler gabat gelmeýär.|رمزهای عبور جدید یکسان نیستند.
Şifreniz başarıyla değiştirildi.|Password changed successfully.|Пароль успешно изменён.|تم تغيير كلمة المرور بنجاح.|Açar sözüňiz üýtgedildi.|رمز عبور با موفقیت تغییر کرد.
Şifre değiştirilemedi.|Could not change password.|Не удалось изменить пароль.|تعذر تغيير كلمة المرور.|Açar sözüni üýtgedip bolmady.|تغییر رمز عبور انجام نشد.
Kampanya & Fırsat Bildirimleri|Offers & Campaign Notifications|Уведомления об акциях|إشعارات العروض والحملات|Kampaniýa we teklip bildirişleri|اعلان کمپین‌ها و پیشنهادها
Bildirim İzni Denied|Notification Permission Denied|Разрешение на уведомления отклонено|تم رفض إذن الإشعارات|Bildiriş rugsady berilmedi|مجوز اعلان رد شد
Tarayıcınızda bildirim izni verilmedi. Bildirimler uygulama içi olarak gösterilecektir.|Browser notification permission was not granted. Notifications will appear in the app.|Браузер не разрешил уведомления. Они будут показаны в приложении.|لم يُمنح إذن الإشعارات في المتصفح. ستظهر الإشعارات داخل التطبيق.|Brauzer bildirişlere rugsat bermedi. Olar programmada görkeziler.|مجوز اعلان مرورگر داده نشد؛ اعلان‌ها داخل برنامه نمایش داده می‌شوند.
Bildirim tercihleriniz başarıyla kaydedildi.|Notification preferences saved.|Настройки уведомлений сохранены.|تم حفظ تفضيلات الإشعارات.|Bildiriş sazlamalary ýatda saklandy.|تنظیمات اعلان ذخیره شد.
Telefon Numarası|Phone Number|Номер телефона|رقم الهاتف|Telefon belgisi|شماره تلفن
Telefon değişikliği SMS doğrulaması eklendiğinde etkinleştirilecektir.|Phone changes will be enabled when SMS verification is available.|Смена телефона станет доступна после добавления SMS-проверки.|سيتم تفعيل تغيير الهاتف عند إضافة التحقق بالرسائل.|SMS tassyklamasy goşulanda telefon üýtgetmek açylar.|تغییر تلفن پس از فعال شدن تأیید پیامکی در دسترس خواهد بود.
Bilgileri Güncelle|Update Details|Обновить данные|تحديث البيانات|Maglumatlary täzele|به‌روزرسانی اطلاعات
Şifremi Unuttum|Forgot Password|Забыли пароль|نسيت كلمة المرور|Açar sözümü unutdym|رمز عبور را فراموش کردم
Hesabı Silme Talebi Gönder|Request Account Deletion|Запросить удаление аккаунта|طلب حذف الحساب|Hasaby pozmak haýyşyny iber|درخواست حذف حساب
Lütfen geçerli bir ad soyad giriniz.|Enter a valid full name.|Введите корректное имя.|أدخل اسماً كاملاً صالحاً.|Dogry at-familiýa giriziň.|نام و نام خانوادگی معتبر وارد کنید.
Profil bilgileriniz başarıyla güncellendi.|Profile details updated.|Данные профиля обновлены.|تم تحديث بيانات الملف.|Profil maglumatlary täzelendi.|اطلاعات پروفایل به‌روزرسانی شد.
Güvenliğiniz için SMS şifre sıfırlama altyapısı aktifleşene kadar şifre yenileme talepleri Destek Ekibimiz veya randevu aldığınız salon yöneticisi üzerinden gerçekleştirilmektedir.|Until SMS password reset is available, contact support or your salon manager to reset your password.|До запуска SMS-сброса обратитесь в поддержку или к администратору салона.|حتى يتوفر استرداد كلمة المرور بالرسائل، تواصل مع الدعم أو مدير الصالون.|SMS arkaly açar sözüni dikeltmek açylýança goldaw ýa-da salon dolandyryjysy bilen habarlaşyň.|تا فعال شدن بازیابی پیامکی، برای تغییر رمز با پشتیبانی یا مدیر سالن تماس بگیرید.
Destek Talebi İlet|Send Support Request|Обратиться в поддержку|إرسال طلب دعم|Goldaw haýyşyny iber|ارسال درخواست پشتیبانی
Hesap Silme Talebi|Account Deletion Request|Запрос удаления аккаунта|طلب حذف الحساب|Hasaby pozmak haýyşy|درخواست حذف حساب
Hesap silme talebiniz yöneticiye iletilecektir. Emin misiniz?|Your deletion request will be sent to the administrator. Continue?|Запрос будет отправлен администратору. Продолжить?|سيُرسل طلب الحذف إلى المسؤول. هل تريد المتابعة؟|Pozmak haýyşy dolandyryja iberiler. Dowam etmelimi?|درخواست حذف برای مدیر ارسال می‌شود. ادامه می‌دهید؟
Hesap silme talebiniz başarıyla alındı.|Account deletion request received.|Запрос удаления получен.|تم استلام طلب حذف الحساب.|Hasaby pozmak haýyşy alyndy.|درخواست حذف حساب دریافت شد.
Randevu Sorunu|Appointment Issue|Проблема с записью|مشكلة في الموعد|Nobat meselesi|مشکل نوبت
Salonla İletişim|Contact Salon|Связь с салоном|التواصل مع الصالون|Salon bilen habarlaşmak|تماس با سالن
Hesap / Profil|Account / Profile|Аккаунт / профиль|الحساب / الملف|Hasap / Profil|حساب / پروفایل
Bildirim Sorunu|Notification Issue|Проблема уведомлений|مشكلة الإشعارات|Bildiriş meselesi|مشکل اعلان
Teknik Sorun|Technical Issue|Техническая проблема|مشكلة تقنية|Tehniki mesele|مشکل فنی
Diğer|Other|Другое|أخرى|Başga|سایر
Destek Ekibine Mesaj Gönder|Message Support|Написать в поддержку|مراسلة الدعم|Goldawa habar iber|ارسال پیام به پشتیبانی
Sorunuz veya geri bildiriminiz...|Your question or feedback...|Ваш вопрос или отзыв...|سؤالك أو ملاحظتك...|Soragyňyz ýa-da pikiriňiz...|پرسش یا بازخورد شما...
Mesajı Gönder|Send Message|Отправить сообщение|إرسال الرسالة|Habary iber|ارسال پیام
Lütfen bir mesaj yazınız.|Enter a message.|Введите сообщение.|أدخل رسالة.|Habar ýazyň.|یک پیام بنویسید.
Destek mesajınız başarıyla iletildi.|Support message sent.|Сообщение отправлено в поддержку.|تم إرسال الرسالة للدعم.|Goldaw habary iberildi.|پیام پشتیبانی ارسال شد.
Randevu bilgisi bulunamadı. Lütfen Randevularım ekranını yenileyin.|Appointment details not found. Refresh My Appointments.|Данные записи не найдены. Обновите экран записей.|لم توجد تفاصيل الموعد. حدّث صفحة مواعيدي.|Nobat maglumaty tapylmady. Nobatlarym sahypasyny täzeläň.|اطلاعات نوبت پیدا نشد. صفحه نوبت‌های من را تازه کنید.
Bekleyen değişiklik talebi bulunamadı.|No pending change request.|Нет ожидающего запроса изменения.|لا يوجد طلب تغيير معلق.|Garaşýan üýtgetme haýyşy ýok.|درخواست تغییر در انتظاری نیست.
Yalnızca tarih/saat değişikliği talebi geri çekilecek. Mevcut randevunuz iptal edilmeyecek ve aynı tarih/saatte kalacaktır.|Only the reschedule request will be withdrawn. Your appointment remains unchanged.|Будет отозван только запрос переноса; запись останется без изменений.|سيُسحب طلب التغيير فقط وسيبقى الموعد كما هو.|Diňe wagt üýtgetmek haýyşy yzyna alnar; nobat üýtgemez.|فقط درخواست تغییر زمان پس گرفته می‌شود و نوبت فعلی بدون تغییر می‌ماند.
Değişiklik talebi geri çekilemedi.|Could not withdraw change request.|Не удалось отозвать запрос.|تعذر سحب طلب التغيير.|Üýtgetmek haýyşyny yzyna alyp bolmady.|پس گرفتن درخواست تغییر انجام نشد.
Değişiklik talebiniz geri çekildi. Randevunuz mevcut tarih ve saatinde devam ediyor.|Change request withdrawn. Your appointment remains at its original date and time.|Запрос отозван. Запись остаётся на прежние дату и время.|تم سحب الطلب وبقي الموعد في تاريخه ووقته.|Haýyş yzyna alyndy. Nobat öňki senede we wagtda galýar.|درخواست پس گرفته شد و نوبت در تاریخ و ساعت فعلی باقی ماند.
Yeni Tarih & Saat Seçin|Select New Date & Time|Выберите новые дату и время|اختر تاريخاً ووقتاً جديدين|Täze sene we wagt saýlaň|تاریخ و ساعت جدید را انتخاب کنید
Değişiklik Talebi Gönder|Send Change Request|Отправить запрос изменения|إرسال طلب التغيير|Üýtgetmek haýyşyny iber|ارسال درخواست تغییر
Randevunuza 48 saat veya daha fazla olduğu için değişiklik doğrudan uygulanır.|The change applies immediately because the appointment is at least 48 hours away.|Изменение применится сразу, так как до записи не менее 48 часов.|سيُطبق التغيير مباشرة لأن الموعد بعد 48 ساعة أو أكثر.|Nobata azyndan 48 sagat barlygy üçin üýtgeşme göni ulanylar.|چون تا نوبت حداقل ۴۸ ساعت مانده، تغییر مستقیم اعمال می‌شود.
Randevuya 48 saatten az kaldığı için bu işlem işletme onayına gönderilecektir.|Because less than 48 hours remain, this request needs salon approval.|Так как осталось менее 48 часов, требуется одобрение салона.|لأن المتبقي أقل من 48 ساعة، يلزم تأكيد الصالون.|48 sagatdan az galandygy üçin salon tassyklamaly.|چون کمتر از ۴۸ ساعت مانده، تأیید سالن لازم است.
Salon seçilen gün kapalıdır. Başka bir gün seçin.|The salon is closed on that day. Choose another date.|Салон закрыт в этот день. Выберите другой.|الصالون مغلق في ذلك اليوم. اختر يوماً آخر.|Salon şol gün ýapyk. Başga gün saýlaň.|سالن در آن روز بسته است. روز دیگری انتخاب کنید.
Tarihi Güncelle|Update Date|Изменить дату|تحديث التاريخ|Senäni täzele|به‌روزرسانی تاریخ
Talebi İlet|Submit Request|Отправить запрос|إرسال الطلب|Haýyşy iber|ارسال درخواست
Randevu değişikliği bilgisi güncelliğini yitirdi. Lütfen tekrar deneyin.|Appointment change data is outdated. Try again.|Данные изменения устарели. Повторите попытку.|بيانات التغيير قديمة. حاول مرة أخرى.|Üýtgetme maglumaty köneldi. Täzeden synanyşyň.|اطلاعات تغییر قدیمی شده است. دوباره تلاش کنید.
Lütfen geçerli bir tarih ve saat seçiniz.|Select a valid date and time.|Выберите допустимые дату и время.|اختر تاريخاً ووقتاً صالحين.|Dogry sene we wagt saýlaň.|تاریخ و ساعت معتبر انتخاب کنید.
Tarih/Saat güncellemesi tamamlandı.|Date/time updated.|Дата и время обновлены.|تم تحديث التاريخ والوقت.|Sene/wagt täzelendi.|تاریخ و ساعت به‌روزرسانی شد.
Tarih Değişikliği Talebi|Reschedule Request|Запрос переноса|طلب تغيير الموعد|Senäni üýtgetmek haýyşy|درخواست تغییر تاریخ
Tarih değişikliği gerçekleştirilemedi.|Could not change date.|Не удалось изменить дату.|تعذر تغيير التاريخ.|Senäni üýtgedip bolmady.|تغییر تاریخ انجام نشد.
Randevuyu İptal Et|Cancel Appointment|Отменить запись|إلغاء الموعد|Nobaty ýatyr|لغو نوبت
Randevuya 48 saatten fazla var. İptal hemen uygulanacak ve kayıt geçmişte saklanacaktır.|More than 48 hours remain. Cancellation is immediate and retained in history.|До записи более 48 часов. Она будет отменена сразу и сохранена в истории.|المتبقي أكثر من 48 ساعة. سيُلغى الموعد فوراً ويُحفظ في السجل.|48 sagatdan köp wagt bar. Nobat derrew ýatyrylar we taryhda saklanar.|بیش از ۴۸ ساعت مانده؛ نوبت فوری لغو و در تاریخچه نگهداری می‌شود.
Randevuya 48 saatten az var. İptal patron onayına gönderilecek ve ayrıca WhatsApp/SMS seçeneği açılacaktır.|Less than 48 hours remain. Cancellation needs owner approval and WhatsApp/SMS options will appear.|Осталось менее 48 часов. Отмена требует одобрения владельца; появятся WhatsApp/SMS.|المتبقي أقل من 48 ساعة. يحتاج الإلغاء موافقة المالك وستظهر خيارات WhatsApp/SMS.|48 sagatdan az wagt bar. Ýatyrmak eýe tassyklamasyna iberiler we WhatsApp/SMS açylar.|کمتر از ۴۸ ساعت مانده؛ لغو نیازمند تأیید مالک است و گزینه WhatsApp/SMS نمایش داده می‌شود.
Randevunuz iptal edildi ve iptal geçmişine taşındı.|Appointment cancelled and moved to history.|Запись отменена и перенесена в историю.|أُلغي الموعد ونُقل إلى السجل.|Nobat ýatyryldy we taryha geçirildi.|نوبت لغو و به تاریخچه منتقل شد.
İptal talebiniz salona iletildi. Salon onayı bekleniyor.|Cancellation request sent to the salon. Awaiting approval.|Запрос отправлен салону. Ожидается подтверждение.|أُرسل طلب الإلغاء للصالون وبانتظار الموافقة.|Ýatyrmak haýyşy salona iberildi. Tassyklama garaşylýar.|درخواست لغو برای سالن ارسال شد و منتظر تأیید است.
Yakın Tarihli İptal Talebi|Short-Notice Cancellation|Срочная отмена|طلب إلغاء قريب|Ýakyn wagtly ýatyrmak haýyşy|درخواست لغو نزدیک
İptal talebi gönderilemedi.|Could not send cancellation request.|Не удалось отправить запрос отмены.|تعذر إرسال طلب الإلغاء.|Ýatyrmak haýyşyny iberip bolmady.|ارسال درخواست لغو انجام نشد.
Süre:|Duration:|Длительность:|المدة:|Dowamlylygy:|مدت:
Hizmet Seçin|Select Service|Выберите услугу|اختر الخدمة|Hyzmat saýlaň|انتخاب خدمت
Onayla ve Devam Et →|Confirm and Continue →|Подтвердить и продолжить →|تأكيد ومتابعة ←|Tassykla we dowam et →|تأیید و ادامه ←
Lütfen bir hizmet seçiniz.|Select a service.|Выберите услугу.|اختر خدمة.|Hyzmat saýlaň.|یک خدمت انتخاب کنید.
Favori salon güncellenemedi.|Could not update favorite salon.|Не удалось обновить избранное.|تعذر تحديث الصالون المفضل.|Halanýan salony täzeläp bolmady.|به‌روزرسانی سالن مورد علاقه انجام نشد.
Hizmet Seçimi Zorunlu|Service Required|Требуется услуга|الخدمة مطلوبة|Hyzmat saýlamak hökmany|انتخاب خدمت الزامی است
Personel Seçimi Zorunlu|Staff Required|Требуется сотрудник|الموظف مطلوب|Işgär saýlamak hökmany|انتخاب کارمند الزامی است
Lütfen bir berber/uzman seçiniz veya "Fark Etmez" seçeneğini işaretleyiniz.|Select a specialist or choose “Any Staff”.|Выберите мастера или «Любой сотрудник».|اختر مختصاً أو «أي موظف».|Hünärmen saýlaň ýa-da “Islendik işgär” saýlaň.|یک متخصص یا «هر کارمند» را انتخاب کنید.
Tarih Seçimi Zorunlu|Date Required|Требуется дата|التاريخ مطلوب|Sene saýlamak hökmany|انتخاب تاریخ الزامی است
Lütfen randevu tarihi seçiniz.|Select an appointment date.|Выберите дату записи.|اختر تاريخ الموعد.|Nobat senesini saýlaň.|تاریخ نوبت را انتخاب کنید.
Saat Seçimi Zorunlu|Time Required|Требуется время|الوقت مطلوب|Wagt saýlamak hökmany|انتخاب ساعت الزامی است
Lütfen müsait bir randevu saati seçiniz.|Select an available appointment time.|Выберите свободное время.|اختر وقتاً متاحاً.|Boş nobat wagtyny saýlaň.|یک ساعت آزاد انتخاب کنید.
Randevunuz Oluşturuluyor...|Creating Your Appointment...|Создаём запись...|جارٍ إنشاء موعدك...|Nobatyňyz döredilýär...|در حال ایجاد نوبت...
Salon Sahibine Bildir|Notify Salon Owner|Сообщить владельцу|إبلاغ مالك الصالون|Salon eýesine habar ber|اطلاع به مالک سالن
Bu yakın tarihli işlem için salon sahibine WhatsApp veya SMS kanallarından birini seçerek ayrıca bilgi veriniz. Uygulama içi bildirim zaten gönderildi.|Also notify the owner via WhatsApp or SMS. An in-app notification was already sent.|Дополнительно сообщите владельцу через WhatsApp или SMS. Уведомление в приложении уже отправлено.|أبلغ المالك أيضاً عبر WhatsApp أو SMS. أُرسل إشعار داخل التطبيق.|Eýä WhatsApp ýa-da SMS arkaly hem habar beriň. Programma bildirişi eýýäm iberildi.|همچنین از طریق WhatsApp یا SMS به مالک اطلاع دهید. اعلان داخل برنامه ارسال شده است.
İşlem tamamlandı. İsterseniz salon sahibine doğrudan WhatsApp veya SMS ile bilgi gönderebilirsiniz.|Done. You may notify the owner by WhatsApp or SMS.|Готово. Можно сообщить владельцу через WhatsApp или SMS.|تمت العملية. يمكنك إبلاغ المالك عبر WhatsApp أو SMS.|Amal tamamlandy. Eýä WhatsApp ýa-da SMS iberip bilersiňiz.|عملیات انجام شد. می‌توانید از طریق WhatsApp یا SMS به مالک اطلاع دهید.
Salon telefonu tanımlı değil; alıcıyı WhatsApp veya SMS içinde seçebilirsiniz. Uygulama içi bildirim salona gönderildi.|No salon phone is set; choose the recipient in WhatsApp or SMS. The in-app notification was sent.|Телефон салона не указан; выберите получателя в WhatsApp или SMS. Уведомление отправлено.|هاتف الصالون غير محدد؛ اختر المستلم في WhatsApp أو SMS. أُرسل إشعار التطبيق.|Salon telefony ýok; WhatsApp ýa-da SMS-de alyjyny saýlaň. Programma bildirişi iberildi.|تلفن سالن ثبت نشده؛ گیرنده را در WhatsApp یا SMS انتخاب کنید. اعلان برنامه ارسال شد.
Salon bilgisi bulunamadı. Lütfen Salonlar ekranını yenileyin.|Salon details not found. Refresh the Salons screen.|Данные салона не найдены. Обновите список салонов.|لم توجد بيانات الصالون. حدّث شاشة الصالونات.|Salon maglumaty tapylmady. Salonlar sahypasyny täzeläň.|اطلاعات سالن پیدا نشد. صفحه سالن‌ها را تازه کنید.
Salon artık Salonlar listesinde bulunmuyor.|This salon is no longer listed.|Салона больше нет в списке.|لم يعد الصالون في القائمة.|Bu salon indi sanawda ýok.|این سالن دیگر در فهرست نیست.
Open today|Open today|Открыто сегодня|مفتوح اليوم|Şu gün açyk|امروز باز است
Closed today|Closed today|Закрыто сегодня|مغلق اليوم|Şu gün ýapyk|امروز بسته است
UNELIVO ana sayfa|UNELIVO home page|Главная UNELIVO|صفحة UNELIVO الرئيسية|UNELIVO baş sahypasy|صفحه اصلی UNELIVO
Puan Ver / Yorum Yap|Rate / Review|Оценить / оставить отзыв|تقييم / مراجعة|Baha ber / Teswir ýaz|امتیاز / ثبت دیدگاه
Yorumunu Düzenle|Edit Review|Изменить отзыв|تعديل المراجعة|Teswiriňi üýtget|ویرایش دیدگاه
Yorumunuzun 48 saatlik düzenleme süresi doldu.|The 48-hour review edit period has expired.|48 часов для редактирования истекли.|انتهت مهلة تعديل المراجعة البالغة 48 ساعة.|Teswiri üýtgetmegiň 48 sagady gutardy.|مهلت ۴۸ ساعته ویرایش دیدگاه تمام شده است.
Favorilerden Çıkar|Remove from Favorites|Удалить из избранного|إزالة من المفضلة|Halanýanlardan aýyr|حذف از علاقه‌مندی‌ها
Favorilere Ekle|Add to Favorites|Добавить в избранное|إضافة إلى المفضلة|Halanýanlara goş|افزودن به علاقه‌مندی‌ها
İletişim|Contact|Контакты|التواصل|Habarlaşmak|تماس
Önceki|Previous|Предыдущий|السابق|Öňki|قبلی
Yorum (isteğe bağlı)|Review (optional)|Отзыв (необязательно)|المراجعة (اختيارية)|Teswir (hökmany däl)|دیدگاه (اختیاری)
Yorum kaydedilemedi.|Could not save review.|Не удалось сохранить отзыв.|تعذر حفظ المراجعة.|Teswiri ýatda saklap bolmady.|ذخیره دیدگاه انجام نشد.
Yorumunuz güncellendi.|Review updated.|Отзыв обновлён.|تم تحديث المراجعة.|Teswiriňiz täzelendi.|دیدگاه به‌روزرسانی شد.
Yorumunuz yayınlandı.|Review published.|Отзыв опубликован.|تم نشر المراجعة.|Teswiriňiz çap edildi.|دیدگاه منتشر شد.
Önce bir hizmet seçmelisiniz.|Choose a service first.|Сначала выберите услугу.|اختر خدمة أولاً.|Ilki hyzmat saýlamaly.|ابتدا یک خدمت انتخاب کنید.
Berber / uzman seçmelisiniz.|Choose a barber / specialist.|Выберите мастера.|اختر الحلاق / المختص.|Dellek / hünärmen saýlamaly.|آرایشگر / متخصص انتخاب کنید.
Tarih seçmelisiniz.|Choose a date.|Выберите дату.|اختر تاريخاً.|Sene saýlamaly.|تاریخ انتخاب کنید.
Saat seçmelisiniz.|Choose a time.|Выберите время.|اختر وقتاً.|Wagt saýlamaly.|ساعت انتخاب کنید.
Yeni Randevu|New Appointment|Новая запись|موعد جديد|Täze nobat|نوبت جدید
Randevu Oluşturulamadı|Appointment Could Not Be Created|Не удалось создать запись|تعذر إنشاء الموعد|Nobat döredilmedi|نوبت ایجاد نشد
Randevuyu Onayla|Confirm Appointment|Подтвердить запись|تأكيد الموعد|Nobaty tassykla|تأیید نوبت
Bağlantı Hatası|Connection Error|Ошибка соединения|خطأ في الاتصال|Birikme ýalňyşlygy|خطای اتصال
Sunucuya ulaşılamadı. Lütfen internet bağlantınızı kontrol edip tekrar deneyiniz.|Could not reach the server. Check your connection and try again.|Сервер недоступен. Проверьте интернет и повторите попытку.|تعذر الوصول للخادم. تحقق من الاتصال وحاول مجدداً.|Serwere ýetip bolmady. Interneti barlap gaýtadan synanyşyň.|دسترسی به سرور ممکن نشد. اینترنت را بررسی و دوباره تلاش کنید.
Salon yükleniyor…|Loading salon…|Загрузка салона…|جارٍ تحميل الصالون…|Salon ýüklenýär…|در حال بارگیری سالن…
Salon bulunamadı|Salon Not Found|Салон не найден|لم يتم العثور على الصالون|Salon tapylmady|سالن پیدا نشد
Bu bağlantı geçersiz olabilir veya salon şu anda herkese açık değildir.|This link may be invalid or the salon is not public.|Ссылка недействительна или салон сейчас недоступен публично.|قد يكون الرابط غير صالح أو الصالون غير متاح للعامة.|Salgy nädogry ýa-da salon köpçülige açyk däl.|ممکن است پیوند نامعتبر باشد یا سالن عمومی نباشد.
Ana Sayfaya Dön|Return Home|На главную|العودة للرئيسية|Baş sahypa dolan|بازگشت به صفحه اصلی
Salon şu anda yüklenemiyor|Salon Cannot Load Right Now|Салон сейчас не загружается|تعذر تحميل الصالون الآن|Salon häzir ýüklenmeýär|سالن اکنون بارگیری نمی‌شود
Lütfen bağlantınızı kontrol edip yeniden deneyin.|Check your connection and try again.|Проверьте соединение и повторите.|تحقق من اتصالك وحاول مرة أخرى.|Birikmäni barlap gaýtadan synanyşyň.|اتصال را بررسی و دوباره تلاش کنید.
Tekrar Dene|Try Again|Повторить|حاول مجدداً|Gaýtadan synanyş|تلاش دوباره
Salon askıya alındı|Salon suspended|Салон приостановлен|تم تعليق الصالون|Salon togtadyldy|سالن تعلیق شد
Salon yeniden aktifleştirildi|Salon reactivated|Салон снова активирован|أُعيد تفعيل الصالون|Salon täzeden işjeňleşdirildi|سالن دوباره فعال شد
Salon Keşfet’ten gizlendi|Salon hidden from Discovery|Салон скрыт из поиска|أُخفي الصالون من الاستكشاف|Salon gözlegden gizlendi|سالن از جستجو پنهان شد
Salon Keşfet’e açıldı|Salon shown in Discovery|Салон показан в поиске|أُظهر الصالون في الاستكشاف|Salon gözlege açyldy|سالن در جستجو نمایش داده شد
Tarih bilgisi eski kayıtta bulunmuyor|Legacy record has no date|В старой записи нет даты|لا يوجد تاريخ في السجل القديم|Köne ýazgyda sene ýok|رکورد قدیمی تاریخ ندارد
Tarih bilgisi geçersiz|Invalid date|Недопустимая дата|التاريخ غير صالح|Sene nädogry|تاریخ نامعتبر است
Süper admin paneli yalnız doğrulanmış süper admin rolüyle açılabilir.|Only a verified super admin can open this panel.|Панель доступна только подтверждённому суперадминистратору.|لا تفتح هذه اللوحة إلا للمسؤول العام الموثق.|Bu paneli diňe tassyklanan baş administrator açyp biler.|فقط مدیر کل تأییدشده می‌تواند این پنل را باز کند.
Patron Gözüyle — Salt Okunur|Owner View — Read Only|Вид владельца — только чтение|عرض المالك — للقراءة فقط|Eýe görnüşi — diňe okamak|نمای مالک — فقط خواندنی
← Salonlara Dön|← Back to Salons|← Назад к салонам|العودة للصالونات →|← Salonlara dolan|بازگشت به سالن‌ها →
Patron Paneli Önizlemesi • Paket:|Owner Panel Preview • Plan:|Предпросмотр панели владельца • Тариф:|معاينة لوحة المالك • الباقة:|Eýe paneliniň syny • Paket:|پیش‌نمایش پنل مالک • بسته:
Hizmetler (|Services (|Услуги (|الخدمات (|Hyzmatlar (|خدمات (
Personel (|Staff (|Сотрудники (|الموظفون (|Işgärler (|کارکنان (
Telefon yok|No phone|Телефон не указан|لا يوجد هاتف|Telefon ýok|تلفن موجود نیست
Personel bulunmuyor.|No staff found.|Сотрудники не найдены.|لا يوجد موظفون.|Işgär tapylmady.|کارمندی پیدا نشد.
Platform Komuta Merkezi • Hoş geldiniz,|Platform Control Center • Welcome,|Центр управления • Добро пожаловать,|مركز تحكم المنصة • أهلاً،|Platforma dolandyryş merkezi • Hoş geldiňiz,|مرکز مدیریت پلتفرم • خوش آمدید،
Platform Süper Admin|Platform Super Admin|Суперадминистратор платформы|المسؤول العام للمنصة|Platformanyň baş administratory|مدیر کل پلتفرم
Salonları Gör →|View Salons →|Смотреть салоны →|عرض الصالونات ←|Salonlary gör →|مشاهده سالن‌ها ←
Aktifleri Gör →|View Active →|Смотреть активные →|عرض النشطة ←|Işjeňleri gör →|مشاهده فعال‌ها ←
Başvuruları İncele →|Review Applications →|Рассмотреть заявки →|مراجعة الطلبات ←|Arzalary barla →|بررسی درخواست‌ها ←
Kullanıcıları Yönet →|Manage Users →|Управление пользователями →|إدارة المستخدمين ←|Ulanyjylary dolandyr →|مدیریت کاربران ←
Randevuları Listele →|List Appointments →|Список записей →|قائمة المواعيد ←|Nobatlary görkez →|فهرست نوبت‌ها ←
Sandbox / Test Modu →|Sandbox / Test Mode →|Тестовый режим →|الوضع التجريبي ←|Synag tertibi →|حالت آزمایشی ←
• Keşfet:|• Discovery:|• Поиск:|• الاستكشاف:|• Gözleg:|• جستجو:
İsimsiz Salon|Unnamed Salon|Безымянный салон|صالون بلا اسم|Atsyz salon|سالن بدون نام
( Super Admin Grant)|(Super Admin Grant)|(Грант суперадминистратора)|(منحة المسؤول العام)|(Baş administrator rugsady)|(هدیه مدیر کل)
Askıda|Suspended|Приостановлен|معلق|Togtadylan|تعلیق‌شده
Detayı Kapat|Close Details|Закрыть детали|إغلاق التفاصيل|Jikme-jigi ýap|بستن جزئیات
Detay ve İşlemler|Details & Actions|Детали и действия|التفاصيل والإجراءات|Jikme-jik we amallar|جزئیات و عملیات
Detay Gör|View Details|Подробнее|عرض التفاصيل|Jikme-jigi gör|مشاهده جزئیات
Patron Gözüyle|Owner View|Вид владельца|عرض المالك|Eýe görnüşi|نمای مالک
Askıya Al|Suspend|Приостановить|تعليق|Togtat|تعلیق
Keşfete Aç|Show in Discovery|Показать в поиске|إظهار في الاستكشاف|Gözlege aç|نمایش در جستجو
Keşfetten Gizle|Hide from Discovery|Скрыть из поиска|إخفاء من الاستكشاف|Gözlegden gizle|پنهان از جستجو
Salon Yönetimi (|Salon Management (|Управление салонами (|إدارة الصالونات (|Salon dolandyryşy (|مدیریت سالن‌ها (
Tümü (|All (|Все (|الكل (|Ählisi (|همه (
Aktif (|Active (|Активные (|نشط (|Işjeň (|فعال (
Askıda (|Suspended (|Приостановленные (|معلق (|Togtadylan (|تعلیق‌شده (
Salon adı, telefon, şehir veya ilçe ara|Search name, phone, city or district|Поиск по названию, телефону, городу или району|ابحث بالاسم أو الهاتف أو المدينة أو المنطقة|At, telefon, şäher ýa-da etrap boýunça gözle|جستجو با نام، تلفن، شهر یا منطقه
Tüm şehirler|All Cities|Все города|كل المدن|Ähli şäherler|همه شهرها
Eski teknik Router/Debug/Test kayıtları silinmeden bu listeden ayrılmıştır.|Legacy Router/Debug/Test records are separated without deletion.|Старые тестовые записи отделены без удаления.|تم فصل سجلات الاختبار القديمة دون حذفها.|Köne synag ýazgylary pozulman aýry görkezilýär.|رکوردهای آزمایشی قدیمی بدون حذف جدا شده‌اند.
Arama için en az 2 karakter yazın.|Enter at least 2 characters to search.|Введите минимум 2 символа.|أدخل حرفين على الأقل للبحث.|Gözleg üçin azyndan 2 nyşan ýazyň.|برای جستجو حداقل ۲ نویسه بنویسید.
Onayla & Salon Oluştur|Approve & Create Salon|Одобрить и создать салон|موافقة وإنشاء الصالون|Tassykla we salon döret|تأیید و ایجاد سالن
Salon Başvuruları|Salon Applications|Заявки салонов|طلبات الصالونات|Salon arzalary|درخواست‌های سالن
Bekleyen (|Pending (|Ожидают (|معلق (|Garaşýan (|در انتظار (
Onaylanan (|Approved (|Одобрено (|مقبول (|Tassyklanan (|تأییدشده (
Reddedilen (|Rejected (|Отклонено (|مرفوض (|Ret edilen (|ردشده (
Başvuru bulunmamaktadır.|No applications found.|Заявок нет.|لا توجد طلبات.|Arza tapylmady.|درخواستی وجود ندارد.
Kullanıcı|User|Пользователь|المستخدم|Ulanyjy|کاربر
Devre Dışı Bırak|Disable|Отключить|تعطيل|Öçür|غیرفعال
Kullanıcı Yönetimi|User Management|Управление пользователями|إدارة المستخدمين|Ulanyjy dolandyryşy|مدیریت کاربران
Seçili grupta ad veya telefon ara...|Search name or phone in this group...|Поиск имени или телефона в группе...|ابحث بالاسم أو الهاتف في هذه المجموعة...|Bu toparda at ýa-da telefon gözle...|جستجوی نام یا تلفن در این گروه...
Gösterilen:|Shown:|Показано:|المعروض:|Görkezilen:|نمایش:
kullanıcı|users|пользователей|مستخدم|ulanyjy|کاربر
Kullanıcı bulunamadı.|User not found.|Пользователь не найден.|لم يوجد مستخدم.|Ulanyjy tapylmady.|کاربر پیدا نشد.
Süper Admin Yönetim Menüsü|Super Admin Menu|Меню суперадминистратора|قائمة المسؤول العام|Baş administrator menýusy|منوی مدیر کل
Ödemeler & Abonelikler|Payments & Subscriptions|Платежи и подписки|المدفوعات والاشتراكات|Tölegler we abunalar|پرداخت‌ها و اشتراک‌ها
İncele →|Review →|Открыть →|مراجعة ←|Barla →|بررسی ←
Ücretsiz Premium Tanımları|Free Premium Grants|Управление бесплатным Premium|إدارة منح Premium المجانية|Mugt Premium rugsat dolandyryşy|مدیریت هدیه Premium رایگان
Aktif Kullanım:|Active Usage:|Активно:|الاستخدام النشط:|Işjeň ulanyş:|استفاده فعال:
/ 2 Salon|/ 2 Salons|/ 2 салона|/ صالونان|/ 2 salon|/ ۲ سالن
Yönet →|Manage →|Управлять →|إدارة ←|Dolandyr →|مدیریت ←
AI Kullanımı ve Sağlayıcı Durumu|AI Usage & Provider Status|Телеметрия ИИ и провайдер|قياس الذكاء الاصطناعي وحالة المزود|AI telemetriýasy we üpjün ediji|تله‌متری هوش مصنوعی و وضعیت ارائه‌دهنده
Görüntüle →|View →|Открыть →|عرض ←|Gör →|مشاهده ←
Denetim Kayıtları|Audit Log|Журнал аудита платформы|سجل تدقيق المنصة|Platforma audit žurnaly|گزارش ممیزی پلتفرم
Listele →|List →|Список →|قائمة ←|Sanawy görkez →|فهرست ←
Destek Modu (Patron Gözüyle)|Support Mode (Owner View)|Режим поддержки (вид владельца)|وضع الدعم (عرض المالك)|Goldaw tertibi (eýe görnüşi)|حالت پشتیبانی (نمای مالک)
Aç →|Open →|Открыть →|فتح ←|Aç →|باز کردن ←
Platform Süper Admin •|Platform Super Admin •|Суперадминистратор •|المسؤول العام •|Platforma baş administratory •|مدیر کل پلتفرم •
Bildirim Ayarları (9 Kategori)|Notification Settings (9 Categories)|Настройки уведомлений (9 категорий)|إعدادات الإشعارات (9 فئات)|Bildiriş sazlamalary (9 kategoriýa)|تنظیمات اعلان (۹ دسته)
Oturumu Kapat|Sign Out|Выйти|تسجيل الخروج|Hasapdan çyk|خروج
Süper admin|Super admin|Суперадминистратор|المسؤول العام|Baş administrator|مدیر کل
Salon Durumu Değişikliği|Salon Status Change|Изменение статуса салона|تغيير حالة الصالون|Salon ýagdaýynyň üýtgemegi|تغییر وضعیت سالن
Bu salonu askıya almak istediğinize emin misiniz? (Online randevular duracaktır)|Suspend this salon? Online bookings will stop.|Приостановить салон? Онлайн-запись будет остановлена.|هل تريد تعليق الصالون؟ ستتوقف الحجوزات الإلكترونية.|Salony togtatmalymy? Onlaýn nobatlar durar.|سالن تعلیق شود؟ رزرو آنلاین متوقف خواهد شد.
Bu salonu tekrar aktifleştirmek istediğinize emin misiniz?|Reactivate this salon?|Снова активировать салон?|هل تريد إعادة تفعيل الصالون؟|Salony täzeden işjeňleşdirmelimi?|سالن دوباره فعال شود؟
Salon durumu değiştirilemedi.|Could not change salon status.|Не удалось изменить статус салона.|تعذر تغيير حالة الصالون.|Salon ýagdaýyny üýtgedip bolmady.|تغییر وضعیت سالن انجام نشد.
Salon askıya alındı.|Salon suspended.|Салон приостановлен.|تم تعليق الصالون.|Salon togtadyldy.|سالن تعلیق شد.
Salon aktifleştirildi.|Salon activated.|Салон активирован.|تم تفعيل الصالون.|Salon işjeňleşdirildi.|سالن فعال شد.
Keşfet görünürlüğü değiştirilemedi.|Could not change Discovery visibility.|Не удалось изменить видимость в поиске.|تعذر تغيير الظهور في الاستكشاف.|Gözleg görünmesini üýtgedip bolmady.|تغییر نمایش در جستجو انجام نشد.
Salon Keşfet görünümüne açıldı.|Salon shown in Discovery.|Салон показан в поиске.|أُظهر الصالون في الاستكشاف.|Salon gözlege açyldy.|سالن در جستجو نمایش داده شد.
Salon Keşfet görünümünden gizlendi.|Salon hidden from Discovery.|Салон скрыт из поиска.|أُخفي الصالون من الاستكشاف.|Salon gözlegden gizlendi.|سالن از جستجو پنهان شد.
Salon başvurusu onaylandı ve salon oluşturuldu.|Application approved and salon created.|Заявка одобрена, салон создан.|تمت الموافقة وإنشاء الصالون.|Arza tassyklandy we salon döredildi.|درخواست تأیید و سالن ایجاد شد.
Başvuru onaylanamadı.|Could not approve application.|Не удалось одобрить заявку.|تعذر قبول الطلب.|Arzany tassyklap bolmady.|تأیید درخواست انجام نشد.
Başvuruyu Reddet|Reject Application|Отклонить заявку|رفض الطلب|Arzany ret et|رد درخواست
Bu salon başvurusunu reddetmek istediğinize emin misiniz?|Reject this salon application?|Отклонить эту заявку салона?|هل تريد رفض طلب الصالون؟|Bu salon arzasyny ret etmelimi?|این درخواست سالن رد شود؟
Başvuru reddedildi.|Application rejected.|Заявка отклонена.|تم رفض الطلب.|Arza ret edildi.|درخواست رد شد.
Kullanıcı Durumu|User Status|Статус пользователя|حالة المستخدم|Ulanyjy ýagdaýy|وضعیت کاربر
Bu kullanıcıyı devre dışı bırakmak istediğinize emin misiniz?|Disable this user?|Отключить пользователя?|هل تريد تعطيل هذا المستخدم؟|Bu ulanyjyny öçürmelimi?|این کاربر غیرفعال شود؟
Bu kullanıcıyı aktifleştirmek istediğinize emin misiniz?|Activate this user?|Активировать пользователя?|هل تريد تفعيل هذا المستخدم؟|Bu ulanyjyny işjeňleşdirmelimi?|این کاربر فعال شود؟
Kullanıcı devre dışı bırakıldı.|User disabled.|Пользователь отключён.|تم تعطيل المستخدم.|Ulanyjy öçürildi.|کاربر غیرفعال شد.
Kullanıcı aktifleştirildi.|User activated.|Пользователь активирован.|تم تفعيل المستخدم.|Ulanyjy işjeňleşdirildi.|کاربر فعال شد.
Aktif Grant Kullanımı:|Active Grant Usage:|Активные гранты:|استخدام المنح النشطة:|Işjeň rugsat ulanyşy:|استفاده از هدیه فعال:
Aktif Grant Verilmiş Salonlar:|Salons with Active Grants:|Салоны с активным грантом:|الصالونات ذات المنح النشطة:|Işjeň rugsatly salonlar:|سالن‌های دارای هدیه فعال:
Henüz Grant verilmiş salon yok.|No salons have a grant yet.|Салонов с грантом пока нет.|لا توجد صالونات بمنحة بعد.|Entäk rugsat berlen salon ýok.|هنوز سالنی هدیه نگرفته است.
Grant Kaldır|Remove Grant|Отозвать грант|إزالة المنحة|Rugsady aýyr|حذف هدیه
Yeni Salon Seç ve Premium Grant Ver:|Select a Salon and Grant Premium:|Выберите салон и предоставьте Premium:|اختر صالوناً وامنح Premium:|Salon saýla we Premium rugsat ber:|یک سالن انتخاب و Premium هدیه دهید:
Premium Grant Tanımla|Grant Premium|Предоставить Premium|منح Premium|Premium rugsat ber|اعطای Premium
Maksimum 2 aktif Grant limitine ulaşıldı.|Maximum of 2 active grants reached.|Достигнут лимит: 2 активных гранта.|تم بلوغ حد المنحتين النشطتين.|2 işjeň rugsat çägine ýetildi.|حداکثر ۲ هدیه فعال پر شده است.
GRANT_LIMIT_REACHED: Maksimum 2 salon için ücretsiz Premium verilebilir.|GRANT_LIMIT_REACHED: Free Premium is limited to 2 salons.|GRANT_LIMIT_REACHED: Бесплатный Premium доступен максимум 2 салонам.|GRANT_LIMIT_REACHED: يقتصر Premium المجاني على صالونين.|GRANT_LIMIT_REACHED: Mugt Premium diňe 2 salona berilýär.|GRANT_LIMIT_REACHED: Premium رایگان فقط برای ۲ سالن است.
Salon için ücretsiz Premium Grant aktif edildi.|Free Premium grant activated for salon.|Бесплатный Premium активирован для салона.|تم تفعيل منحة Premium المجانية للصالون.|Salon üçin mugt Premium işjeňleşdirildi.|هدیه Premium رایگان برای سالن فعال شد.
Grant kaldırıldı ve salon FREE plana döndürüldü.|Grant removed and salon returned to FREE.|Грант удалён, салон переведён на FREE.|أُزيلت المنحة وعاد الصالون إلى FREE.|Rugsat aýryldy we salon FREE paketine geçirildi.|هدیه حذف و سالن به بسته FREE بازگردانده شد.
Sistem yöneticisi|System administrator|Системный администратор|مسؤول النظام|Ulgam administratory|مدیر سیستم
Platform İşlem Geçmişi|Platform Activity History|История действий платформы|سجل عمليات المنصة|Platforma amallarynyň taryhy|تاریخچه عملیات پلتفرم
Henüz işlem kaydı bulunmuyor.|No activity records yet.|Записей действий пока нет.|لا توجد سجلات عمليات بعد.|Entäk amal ýazgysy ýok.|هنوز سابقه عملیاتی وجود ندارد.
İşlemi yapan:|Performed by:|Исполнитель:|نفّذها:|Ýerine ýetiren:|انجام‌دهنده:
Yönetim işlemi yapıldı|Administrative action performed|Выполнено административное действие|تم إجراء عملية إدارية|Dolandyryş amaly ýerine ýetirildi|عملیات مدیریتی انجام شد
Artık listede olmayan eski salon|Legacy salon no longer listed|Старый салон вне списка|صالون قديم لم يعد في القائمة|Sanawda ýok köne salon|سالن قدیمی خارج از فهرست
Platform Gelir Dashboard|Platform Revenue Dashboard|Панель дохода платформы|لوحة إيرادات المنصة|Platforma girdeji paneli|داشبورد درآمد پلتفرم
Sandbox / Test Ödeme Altyapısı Aktiftir (Gerçek Tahsilat Yoktur)|Sandbox / test payments are active (no real charges)|Включены тестовые платежи (без реальных списаний)|الدفع التجريبي مفعّل (لا تحصيل حقيقي)|Synag tölegleri işjeň (hakyky töleg ýok)|پرداخت آزمایشی فعال است (برداشت واقعی ندارد)
Detayları|Details|Детали|التفاصيل|Jikme-jikleri|جزئیات
Patron UID:|Owner UID:|UID владельца:|UID المالك:|Eýe UID:|UID مالک:
Şehir/İlçe:|City/District:|Город/район:|المدينة/المنطقة:|Şäher/etrap:|شهر/منطقه:
Keşfet:|Discovery:|Поиск:|الاستكشاف:|Gözleg:|جستجو:
Online Randevu:|Online Booking:|Онлайн-запись:|الحجز الإلكتروني:|Onlaýn nobat:|رزرو آنلاین:
Hizmet / Personel:|Services / Staff:|Услуги / сотрудники:|الخدمات / الموظفون:|Hyzmat / Işgär:|خدمات / کارکنان:
Tanımlı değil|Not set|Не указано|غير محدد|Bellenmedik|ثبت نشده
Görünür|Visible|Видим|ظاهر|Görünýär|قابل مشاهده
Uygulamadan çıkmak istediğinize emin misiniz?|Are you sure you want to sign out?|Выйти из приложения?|هل تريد تسجيل الخروج؟|Programmadan çykmalymy?|از برنامه خارج می‌شوید؟
Hayır|No|Нет|لا|Ýok|خیر
Şifre|Password|Пароль|كلمة المرور|Açar söz|رمز عبور
← Geri|← Back|← Назад|رجوع →|← Yza|بازگشت →
Salonum Var|I Own a Salon|У меня есть салон|لدي صالون|Salonym bar|سالن دارم
Giriş Yap|Sign In|Войти|تسجيل الدخول|Gir|ورود
Şifreniz en az 6 karakter olmalıdır.|Password must contain at least 6 characters.|Пароль должен содержать не менее 6 символов.|يجب أن تتكون كلمة المرور من 6 أحرف على الأقل.|Açar sözüňiz azyndan 6 nyşan bolmaly.|رمز عبور باید حداقل ۶ نویسه باشد.
Geçersiz veya süresi dolmuş davet kodu.|Invalid or expired invitation code.|Недействительный или просроченный код приглашения.|رمز الدعوة غير صالح أو منتهي.|Çakylyk kody nädogry ýa-da möhleti gutaran.|کد دعوت نامعتبر یا منقضی شده است.
Yeni|New|Новый|جديد|Täze|جدید
Website|Website|Сайт|الموقع|Web sahypa|وب‌سایت
Ekibimiz|Our Team|Наша команда|فريقنا|Toparymyz|تیم ما
Yorumlar|Reviews|Отзывы|المراجعات|Teswirler|دیدگاه‌ها
Dolu|Full|Занято|محجوز|Doly|پر
Konu|Subject|Тема|الموضوع|Tema|موضوع
Dakika|Minutes|Минуты|دقائق|Minut|دقیقه
Sonraki|Next|Следующий|التالي|Indiki|بعدی
Puan|Rating|Оценка|التقييم|Baha|امتیاز
Misafir|Guest|Гость|ضيف|Myhman|مهمان
Personel|Staff|Сотрудники|الموظفون|Işgär|کارکنان
Yok|None|Нет|لا يوجد|Ýok|وجود ندارد
Ara|Search|Поиск|بحث|Gözle|جستجو
Temizle|Clear|Очистить|مسح|Arassala|پاک کردن
Evet|Yes|Да|نعم|Hawa|بله
UNELIVO Bildirimi:\nİşlem: {action}\nMüşteri: {customer} ({phone})\nHizmet: {service}\nTarih: {date} @ {time}\nUNELIVO üzerinden oluşturuldu.|UNELIVO Notification:\nAction: {action}\nCustomer: {customer} ({phone})\nService: {service}\nDate: {date} @ {time}\nCreated via UNELIVO.|Уведомление UNELIVO:\nДействие: {action}\nКлиент: {customer} ({phone})\nУслуга: {service}\nДата: {date} @ {time}\nСоздано через UNELIVO.|إشعار UNELIVO:\nالإجراء: {action}\nالعميل: {customer} ({phone})\nالخدمة: {service}\nالتاريخ: {date} @ {time}\nتم عبر UNELIVO.|UNELIVO bildirişi:\nAmal: {action}\nMüşderi: {customer} ({phone})\nHyzmat: {service}\nSene: {date} @ {time}\nUNELIVO arkaly döredildi.|اعلان UNELIVO:\nعملیات: {action}\nمشتری: {customer} ({phone})\nخدمت: {service}\nتاریخ: {date} @ {time}\nایجادشده از طریق UNELIVO.
Randevu oluşturulamadı ({error})|Appointment could not be created ({error})|Не удалось создать запись ({error})|تعذر إنشاء الموعد ({error})|Nobat döredilmedi ({error})|نوبت ایجاد نشد ({error})
{name}, salon bu tarihte kapalı olduğu için günlük ciro 0 TL.|{name}, daily revenue is 0 TL because the salon is closed on this date.|{name}, дневная выручка — 0 TL, так как салон закрыт.|{name}، الإيراد اليومي 0 TL لأن الصالون مغلق.|{name}, salon ýapyk bolany üçin gündelik girdeji 0 TL.|{name}، چون سالن در این تاریخ بسته است درآمد روزانه ۰ TL است.
{name}, bu tarihte henüz tamamlanmış bir hizmet yok.|{name}, there are no completed services on this date yet.|{name}, на эту дату завершённых услуг пока нет.|{name}، لا توجد خدمات مكتملة في هذا التاريخ بعد.|{name}, bu senede entäk tamamlanan hyzmat ýok.|{name}، در این تاریخ هنوز خدمت تکمیل‌شده‌ای وجود ندارد.
{plan} paket talebiniz yönetime gönderildi.|Your {plan} plan request was sent to management.|Запрос тарифа {plan} отправлен администрации.|تم إرسال طلب باقة {plan} للإدارة.|{plan} paket haýyşyňyz dolandyryşa iberildi.|درخواست بسته {plan} برای مدیریت ارسال شد.
{salon} randevu bağlantısı|{salon} booking link|Ссылка записи: {salon}|رابط حجز {salon}|{salon} nobat salgysy|پیوند رزرو {salon}
ve|and|и|و|we|و
`;

const baseMessages = Object.fromEntries(rows.trim().split('\n').slice(0, 313).map((row, index) => {
  const [source, en, ru, ar, tk, fa] = row.split('|');
  return [`uiRemaining_${String(index + 1).padStart(3, '0')}`, { source, tr:source, en, ru, ar, tk, fa }];
}));

// Multiline notification copy must not go through the newline-delimited table above.
// Keeping it explicit prevents its six translations from being split into invalid keys.
const dynamicMessages = {
  uiRemaining_314: { tr:'UNELIVO Bildirimi:\nİşlem: {action}\nMüşteri: {customer} ({phone})\nHizmet: {service}\nTarih: {date} @ {time}\nUNELIVO üzerinden oluşturuldu.', en:'UNELIVO Notification:\nAction: {action}\nCustomer: {customer} ({phone})\nService: {service}\nDate: {date} @ {time}\nCreated via UNELIVO.', ru:'Уведомление UNELIVO:\nДействие: {action}\nКлиент: {customer} ({phone})\nУслуга: {service}\nДата: {date} @ {time}\nСоздано через UNELIVO.', ar:'إشعار UNELIVO:\nالإجراء: {action}\nالعميل: {customer} ({phone})\nالخدمة: {service}\nالتاريخ: {date} @ {time}\nتم عبر UNELIVO.', tk:'UNELIVO bildirişi:\nAmal: {action}\nMüşderi: {customer} ({phone})\nHyzmat: {service}\nSene: {date} @ {time}\nUNELIVO arkaly döredildi.', fa:'اعلان UNELIVO:\nعملیات: {action}\nمشتری: {customer} ({phone})\nخدمت: {service}\nتاریخ: {date} @ {time}\nایجادشده از طریق UNELIVO.' },
  uiRemaining_315: { tr:'Randevu oluşturulamadı ({error})', en:'Appointment could not be created ({error})', ru:'Не удалось создать запись ({error})', ar:'تعذر إنشاء الموعد ({error})', tk:'Nobat döredilmedi ({error})', fa:'نوبت ایجاد نشد ({error})' },
  uiRemaining_316: { tr:'{name}, salon bu tarihte kapalı olduğu için günlük ciro 0 TL.', en:'{name}, daily revenue is 0 TL because the salon is closed on this date.', ru:'{name}, дневная выручка — 0 TL, так как салон закрыт.', ar:'{name}، الإيراد اليومي 0 TL لأن الصالون مغلق.', tk:'{name}, salon ýapyk bolany üçin gündelik girdeji 0 TL.', fa:'{name}، چون سالن در این تاریخ بسته است درآمد روزانه ۰ TL است.' },
  uiRemaining_317: { tr:'{name}, bu tarihte henüz tamamlanmış bir hizmet yok.', en:'{name}, there are no completed services on this date yet.', ru:'{name}, на эту дату завершённых услуг пока нет.', ar:'{name}، لا توجد خدمات مكتملة في هذا التاريخ بعد.', tk:'{name}, bu senede entäk tamamlanan hyzmat ýok.', fa:'{name}، در این تاریخ هنوز خدمت تکمیل‌شده‌ای وجود ندارد.' },
  uiRemaining_318: { tr:'{plan} paket talebiniz yönetime gönderildi.', en:'Your {plan} plan request was sent to management.', ru:'Запрос тарифа {plan} отправлен администрации.', ar:'تم إرسال طلب باقة {plan} للإدارة.', tk:'{plan} paket haýyşyňyz dolandyryşa iberildi.', fa:'درخواست بسته {plan} برای مدیریت ارسال شد.' },
  uiRemaining_319: { tr:'{salon} randevu bağlantısı', en:'{salon} booking link', ru:'Ссылка записи: {salon}', ar:'رابط حجز {salon}', tk:'{salon} nobat salgysy', fa:'پیوند رزرو {salon}' },
  uiRemaining_320: { tr:'ve', en:'and', ru:'и', ar:'و', tk:'we', fa:'و' }
  ,salonDetailAbout: { tr:'Hakkında', en:'About', ru:'О салоне', ar:'عن الصالون', tk:'Barada', fa:'درباره سالن' }
  ,salonDetailSections: { tr:'Salon bölümleri', en:'Salon sections', ru:'Разделы салона', ar:'أقسام الصالون', tk:'Salon bölümleri', fa:'بخش‌های سالن' }
  ,salonDetailNew: { tr:'Yeni', en:'New', ru:'Новый', ar:'جديد', tk:'Täze', fa:'جدید' }
  ,salonDetailNoDescription: { tr:'Bu salon henüz bir açıklama eklemedi.', en:'This salon has not added a description yet.', ru:'Этот салон ещё не добавил описание.', ar:'لم يضف هذا الصالون وصفاً بعد.', tk:'Bu salon entek düşündiriş goşmady.', fa:'این سالن هنوز توضیحی اضافه نکرده است.' }
  ,salonDetailNoGallery: { tr:'Henüz galeri fotoğrafı yok.', en:'There are no gallery photos yet.', ru:'Фотографий в галерее пока нет.', ar:'لا توجد صور في المعرض بعد.', tk:'Entäk galereýa suraty ýok.', fa:'هنوز عکس گالری وجود ندارد.' }
  ,salonDetailNoHours: { tr:'Çalışma saatleri henüz eklenmedi.', en:'Working hours have not been added yet.', ru:'Часы работы ещё не добавлены.', ar:'لم تتم إضافة ساعات العمل بعد.', tk:'Iş wagtlary entek goşulmady.', fa:'ساعات کاری هنوز اضافه نشده است.' }
  ,salonDetailNoAddress: { tr:'Adres bilgisi henüz eklenmedi.', en:'Address information has not been added yet.', ru:'Адрес ещё не добавлен.', ar:'لم تتم إضافة معلومات العنوان بعد.', tk:'Salgy maglumaty entek goşulmady.', fa:'اطلاعات آدرس هنوز اضافه نشده است.' }
  ,salonDetailLoadReviews: { tr:'Yorumlar açıldığında yüklenir.', en:'Reviews load when this section is opened.', ru:'Отзывы загружаются при открытии раздела.', ar:'يتم تحميل المراجعات عند فتح هذا القسم.', tk:'Teswirler bu bölüm açylanda ýüklenýär.', fa:'دیدگاه‌ها با باز شدن این بخش بارگیری می‌شوند.' }
  ,salonDetailRateExperience: { tr:'Deneyiminizi Değerlendirin', en:'Rate Your Experience', ru:'Оцените свой опыт', ar:'قيّم تجربتك', tk:'Tejribäňize baha beriň', fa:'تجربه خود را ارزیابی کنید' }
  ,salonDetailRatePrompt: { tr:'Bu salonu nasıl değerlendirirsiniz?', en:'How would you rate this salon?', ru:'Как бы вы оценили этот салон?', ar:'كيف تقيّم هذا الصالون؟', tk:'Bu salona nähili baha berýärsiňiz?', fa:'به این سالن چه امتیازی می‌دهید؟' }
  ,salonDetailReviewPlaceholder: { tr:'Deneyiminizi paylaşın...', en:'Share your experience...', ru:'Поделитесь впечатлением...', ar:'شارك تجربتك...', tk:'Tejribäňizi paýlaşyň...', fa:'تجربه خود را به اشتراک بگذارید...' }
  ,salonDetailSubmitReview: { tr:'Yorumu Gönder', en:'Submit Review', ru:'Отправить отзыв', ar:'إرسال المراجعة', tk:'Teswiri iber', fa:'ارسال دیدگاه' }
  ,salonDetailChooseAppointment: { tr:'Hangi randevunuzu değerlendirmek istiyorsunuz?', en:'Which appointment would you like to review?', ru:'Какую запись вы хотите оценить?', ar:'أي موعد تريد تقييمه؟', tk:'Haýsy nobatyňyza baha bermek isleýärsiňiz?', fa:'کدام نوبت را می‌خواهید ارزیابی کنید؟' }
  ,salonDetailReviewRequiresCompleted: { tr:'Yorum yapabilmek için bu salonda tamamlanmış bir randevunuz olmalıdır.', en:'You need a completed appointment at this salon to leave a review.', ru:'Чтобы оставить отзыв, у вас должна быть завершённая запись в этом салоне.', ar:'تحتاج إلى موعد مكتمل في هذا الصالون لكتابة مراجعة.', tk:'Teswir ýazmak üçin bu salonda tamamlanan nobatyňyz bolmaly.', fa:'برای ثبت دیدگاه باید یک نوبت تکمیل‌شده در این سالن داشته باشید.' }
  ,salonDetailStarLabel: { tr:'{value} yıldız', en:'{value} stars', ru:'{value} звёзд', ar:'{value} نجوم', tk:'{value} ýyldyz', fa:'{value} ستاره' }
  ,ownerNoShowAppointments: { tr:'Gelmedi Randevular', en:'No-show Appointments', ru:'Записи с неявкой', ar:'مواعيد لم يحضر أصحابها', tk:'Gelmedik Randevular', fa:'نوبت‌های عدم حضور' }
  ,superAdminDeleteUser: { tr:'Kullanıcıyı Sil', en:'Delete User', ru:'Удалить пользователя', ar:'حذف المستخدم', tk:'Ulanyjyny poz', fa:'حذف کاربر' }
  ,superAdminDeleteUserConfirm: {"tr":"Bu hesap ve giriş erişimi kalıcı olarak silinecek. Kişisel profil ve kimlik indeksleri kaldırılacak; gerekli geçmiş kişisel bilgilerden arındırılacak. Bu işlem geri alınamaz. Devam edilsin mi?","en":"This account and its sign-in access will be permanently deleted. Personal profile and identity indexes will be removed; retained history will be anonymized. This cannot be undone. Continue?","ru":"Аккаунт и доступ будут удалены навсегда. Профиль и индексы личности будут удалены, сохраняемая история обезличена. Это необратимо. Продолжить?","ar":"سيُحذف الحساب وإمكانية الدخول نهائيًا. ستُحذف بيانات الملف وفهارس الهوية وتُزال الهوية من السجل المحتفظ به. لا يمكن التراجع. هل تريد المتابعة؟","tk":"Hasap we giriş mümkinçiligi hemişelik pozular. Şahsy profil we şahsyýet indeksleri aýrylar, saklanýan taryhdan şahsy maglumatlar aýrylar. Yza gaýtaryp bolmaz. Dowam etmelimi?","fa":"حساب و دسترسی ورود برای همیشه حذف می‌شود. پروفایل و شاخص‌های هویتی حذف و سوابق باقی‌مانده بی‌نام می‌شوند. این کار برگشت‌پذیر نیست. ادامه می‌دهید؟"}
  ,superAdminDeleteUserSuccess: {"tr":"Kullanıcı hesabı kalıcı olarak silindi.","en":"The user account was permanently deleted.","ru":"Аккаунт удалён навсегда.","ar":"تم حذف حساب المستخدم نهائيًا.","tk":"Ulanyjy hasaby hemişelik pozuldy.","fa":"حساب کاربر برای همیشه حذف شد."}
  ,superAdminDeleteUserFailed: {"tr":"Silme tamamlanamadı. Lütfen tekrar deneyin.","en":"Deletion could not be completed. Please retry.","ru":"Удаление не завершено. Повторите попытку.","ar":"تعذر إكمال الحذف. يرجى المحاولة مجددًا.","tk":"Pozmak tamamlanmady. Täzeden synanyşyň.","fa":"حذف کامل نشد. دوباره تلاش کنید."}
  ,superAdminDeleteOwnAccountDenied: { tr:'Kendi hesabınızı bu ekrandan silemezsiniz.', en:'You cannot delete your own account from this screen.', ru:'Нельзя удалить собственную учётную запись с этого экрана.', ar:'لا يمكنك حذف حسابك من هذه الشاشة.', tk:'Öz hasabyňyzy bu ekrandan pozup bilmersiňiz.', fa:'شما نمی‌توانید حساب خود را از این صفحه حذف کنید.' }
  ,uiRemaining_321: { tr:'Bu saate randevu alamazsınız. Seçtiğiniz hizmetin işlem süresi mevcut boşluğa sığmıyor. Daha kısa bir hizmet veya farklı bir saat seçin.', en:'You cannot book this time. The selected service does not fit in the available gap. Choose a shorter service or another time.', ru:'Нельзя записаться на это время. Выбранная услуга не помещается в доступный промежуток. Выберите более короткую услугу или другое время.', ar:'لا يمكنك الحجز في هذا الوقت. مدة الخدمة المختارة لا تتسع ضمن الفترة المتاحة. اختر خدمة أقصر أو وقتاً آخر.', tk:'Bu wagta ýazylmak bolmaýar. Saýlanan hyzmatyň dowamlylygy boş aralyga sygmaýar. Has gysga hyzmaty ýa-da başga wagty saýlaň.', fa:'برای این ساعت نمی‌توانید نوبت بگیرید. مدت خدمت انتخاب‌شده در بازه خالی موجود جا نمی‌گیرد. خدمت کوتاه‌تر یا زمان دیگری را انتخاب کنید.' }
};

export const remainingMessages = { ...baseMessages, ...dynamicMessages };
