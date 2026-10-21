// Staff and administration interface messages. Values are resolved at render time.
const rows = `
Bekliyor|Waiting|Ожидает|بانتظار|Garaşýar|در انتظار
Onaylandı|Approved|Одобрено|تمت الموافقة|Tassyklandy|تأیید شد
Tamamlandı|Completed|Завершено|مكتمل|Tamamlandy|تکمیل شد
İptal|Cancelled|Отменено|ملغى|Ýatyryldy|لغو شد
dk|min|мин|دقيقة|min|دقیقه
Müşteri|Customer|Клиент|العميل|Müşderi|مشتری
Hizmet|Service|Услуга|الخدمة|Hyzmat|خدمت
Müşteriyi ara|Call customer|Позвонить клиенту|اتصل بالعميل|Müşderä jaň et|تماس با مشتری
Pazartesi|Monday|Понедельник|الاثنين|Duşenbe|دوشنبه
Salı|Tuesday|Вторник|الثلاثاء|Sişenbe|سه‌شنبه
Çarşamba|Wednesday|Среда|الأربعاء|Çarşenbe|چهارشنبه
Perşembe|Thursday|Четверг|الخميس|Penşenbe|پنجشنبه
Cuma|Friday|Пятница|الجمعة|Anna|جمعه
Cumartesi|Saturday|Суббота|السبت|Şenbe|شنبه
Pazar|Sunday|Воскресенье|الأحد|Ýekşenbe|یکشنبه
Kapalı|Closed|Закрыто|مغلق|Ýapyk|بسته
Çalışan hesabı salonla eşleştirilemedi.|The staff account could not be linked to a salon.|Не удалось связать сотрудника с салоном.|تعذر ربط حساب الموظف بالصالون.|Işgär hasaby salon bilen baglanyşdyrylmady.|حساب کارمند به سالن متصل نشد.
Çalışan|Staff|Сотрудник|الموظف|Işgär|کارمند
Yönetici|Manager|Управляющий|المدير|Dolandyryjy|مدیر
Resepsiyon|Reception|Ресепшен|الاستقبال|Kabulhana|پذیرش
Berber|Barber|Парикмахер|الحلاق|Dellek|آرایشگر
Bugünkü Randevu|Today's appointments|Записи на сегодня|مواعيد اليوم|Şu günki ýazgylar|نوبت‌های امروز
randevu|appointments|записей|مواعيد|ýazgy|نوبت
Detayı görüntüle|View details|Подробнее|عرض التفاصيل|Jikme-jik gör|نمایش جزئیات
Tamamlanan|Completed|Завершено|مكتمل|Tamamlanan|تکمیل‌شده
Kalan / Bekleyen|Remaining / Pending|Осталось / Ожидает|المتبقي / المعلق|Galan / Garaşýan|باقی‌مانده / در انتظار
Bugün|Today|Сегодня|اليوم|Şu gün|امروز
Sıradaki Müşteri|Next customer|Следующий клиент|العميل التالي|Indiki müşderi|مشتری بعدی
Bugün sırada müşteri bulunmuyor.|No more customers today.|Сегодня больше нет клиентов.|لا يوجد عملاء آخرون اليوم.|Şu gün başga müşderi ýok.|امروز مشتری دیگری نیست.
Randevularım|My appointments|Мои записи|مواعيدي|Ýazgylarym|نوبت‌های من
Yaklaşan|Upcoming|Предстоящие|القادمة|Ýakynlaşýan|پیش رو
Geçmiş|Past|Прошедшие|السابقة|Geçen|گذشته
Bu kapsamda randevunuz bulunmuyor.|No appointments in this view.|В этом разделе нет записей.|لا توجد مواعيد في هذا العرض.|Bu bölümde ýazgy ýok.|در این بخش نوبتی نیست.
İşlemler|Operations|Операции|العمليات|Amallar|عملیات
Manuel Randevu|Manual booking|Ручная запись|حجز يدوي|El bilen ýazgy|رزرو دستی
Yeni randevu oluştur|Create an appointment|Создать запись|إنشاء موعد|Täze ýazgy döret|ایجاد نوبت جدید
İptal / Değişiklik|Cancellation / Change|Отмена / Перенос|إلغاء / تعديل|Ýatyrmak / Üýtgetmek|لغو / تغییر
Bekleyen talepleri yönet|Manage pending requests|Управлять ожидающими запросами|إدارة الطلبات المعلقة|Garaşýan haýyşlary dolandyr|مدیریت درخواست‌های در انتظار
Çalışan Programı|Staff schedule|Расписание сотрудников|جدول الموظفين|Işgärleriň tertibi|برنامه کارکنان
Çalışma saatlerini düzenle|Edit working hours|Изменить рабочие часы|تعديل ساعات العمل|Iş sagatlaryny üýtget|ویرایش ساعات کاری
Müşteri, hizmet, çalışan, tarih ve müsait saati seçin.|Select a customer, service, staff member, date and available time.|Выберите клиента, услугу, сотрудника, дату и свободное время.|اختر العميل والخدمة والموظف والتاريخ والوقت المتاح.|Müşderini, hyzmaty, işgäri, senäni we boş wagty saýlaň.|مشتری، خدمت، کارمند، تاریخ و زمان آزاد را انتخاب کنید.
Randevu Oluştur|Create appointment|Создать запись|إنشاء موعد|Ýazgy döret|ایجاد نوبت
Çalışma Saatlerim|My working hours|Мои рабочие часы|ساعات عملي|Iş sagatlarym|ساعات کاری من
Müşteriler|Customers|Клиенты|العملاء|Müşderiler|مشتریان
Telefon bilgisi yok|No phone number|Телефон не указан|لا يوجد رقم هاتف|Telefon belgisi ýok|شماره تلفن موجود نیست
Müşteri kaydı bulunmuyor.|No customer records.|Нет клиентов.|لا توجد سجلات عملاء.|Müşderi ýazgysy ýok.|اطلاعات مشتری موجود نیست.
Tamamlanan işlem|Completed appointments|Завершённые записи|المواعيد المكتملة|Tamamlanan ýazgylar|نوبت‌های تکمیل‌شده
Toplam ciro|Total revenue|Общая выручка|إجمالي الإيرادات|Jemi girdeji|درآمد کل
Ciro ve Rapor|Revenue and reports|Выручка и отчёты|الإيرادات والتقارير|Girdeji we hasabat|درآمد و گزارش‌ها
Bildirimler|Notifications|Уведомления|الإشعارات|Duýduryşlar|اعلان‌ها
Bildirim|Notification|Уведомление|إشعار|Duýduryş|اعلان
Bildirim bulunmuyor.|No notifications.|Нет уведомлений.|لا توجد إشعارات.|Duýduryş ýok.|اعلانی نیست.
Tümünü Okundu İşaretle|Mark all as read|Отметить всё прочитанным|تحديد الكل كمقروء|Ählisini okaldy diýip belle|علامت‌گذاری همه به‌عنوان خوانده‌شده
Fotoğrafı Değiştir|Change photo|Изменить фото|تغيير الصورة|Suraty üýtget|تغییر عکس
Bu yetkiler yalnız salon sahibi tarafından değiştirilebilir.|Only the salon owner can change these permissions.|Эти права может изменить только владелец салона.|يمكن لمالك الصالون فقط تغيير هذه الصلاحيات.|Bu rugsatlary diňe salon eýesi üýtgedip biler.|فقط مالک سالن می‌تواند این دسترسی‌ها را تغییر دهد.
Dil|Language|Язык|اللغة|Dil|زبان
Çıkış Yap|Sign out|Выйти|تسجيل الخروج|Çykmak|خروج
Profil|Profile|Профиль|الملف الشخصي|Profil|پروفایل
Salon|Salon|Салон|الصالون|Salon|سالن
Çalışma Saatleri Özeti|Working hours summary|Сводка рабочих часов|ملخص ساعات العمل|Iş sagatlarynyň jemlemesi|خلاصه ساعات کاری
Yetkilerim|My permissions|Мои права|صلاحياتي|Rugsatlarym|دسترسی‌های من
Ek yetki tanımlanmamış|No additional permissions|Дополнительных прав нет|لا توجد صلاحيات إضافية|Goşmaça rugsat ýok|دسترسی اضافی تعریف نشده
Açık|Open|Открыто|مفتوح|Açyk|باز
Ana Sayfa|Home|Главная|الرئيسية|Baş sahypa|خانه
Randevular|Appointments|Записи|المواعيد|Ýazgylar|نوبت‌ها
Çalışan Paneli|Staff panel|Панель сотрудника|لوحة الموظف|Işgär paneli|پنل کارمند
Çalışan paneli|Staff panel|Панель сотрудника|لوحة الموظف|Işgär paneli|پنل کارمند
İptal / Değişiklik Talepleri|Cancellation / Change requests|Запросы отмены / переноса|طلبات الإلغاء / التعديل|Ýatyrmak / Üýtgetmek haýyşlary|درخواست‌های لغو / تغییر
Onayla|Approve|Одобрить|موافقة|Tassykla|تأیید
Reddet|Reject|Отклонить|رفض|Ret et|رد
• İptal talebi|• Cancellation request|• Запрос отмены|• طلب إلغاء|• Ýatyrmak haýyşy|• درخواست لغو
Bekleyen talep bulunmuyor.|No pending requests.|Нет ожидающих запросов.|لا توجد طلبات معلقة.|Garaşýan haýyş ýok.|درخواست در انتظاری نیست.
Programı düzenle|Edit schedule|Изменить расписание|تعديل الجدول|Tertibi üýtget|ویرایش برنامه
Aktif çalışan bulunmuyor.|No active staff.|Нет активных сотрудников.|لا يوجد موظفون نشطون.|Işjeň işgär ýok.|کارمند فعالی نیست.
Programı|Schedule|Расписание|الجدول|Tertibi|برنامه
Kaydet|Save|Сохранить|حفظ|Ýatda sakla|ذخیره
Hata|Error|Ошибка|خطأ|Ýalňyşlyk|خطا
Program kaydedilemedi.|Could not save schedule.|Не удалось сохранить расписание.|تعذر حفظ الجدول.|Tertip ýatda saklanmady.|ذخیره برنامه ناموفق بود.
Başarılı|Success|Успешно|تم بنجاح|Üstünlikli|موفق
Çalışma programı güncellendi.|Work schedule updated.|Расписание обновлено.|تم تحديث جدول العمل.|Iş tertibi täzelendi.|برنامه کاری به‌روز شد.
Talep işlenemedi.|Could not process request.|Не удалось обработать запрос.|تعذرت معالجة الطلب.|Haýyş işlenmedi.|پردازش درخواست ناموفق بود.
Talep onaylandı.|Request approved.|Запрос одобрен.|تمت الموافقة على الطلب.|Haýyş tassyklandy.|درخواست تأیید شد.
Talep reddedildi.|Request rejected.|Запрос отклонён.|تم رفض الطلب.|Haýyş ret edildi.|درخواست رد شد.
Müşteri adı|Customer name|Имя клиента|اسم العميل|Müşderiniň ady|نام مشتری
Hizmet seç|Select service|Выберите услугу|اختر الخدمة|Hyzmat saýla|انتخاب خدمت
Çalışan seç|Select staff|Выберите сотрудника|اختر الموظف|Işgär saýla|انتخاب کارمند
Müsait Saatleri Göster|Show available times|Показать свободное время|عرض الأوقات المتاحة|Boş wagtlary görkez|نمایش زمان‌های آزاد
Randevuyu Oluştur|Create appointment|Создать запись|إنشاء موعد|Ýazgy döret|ایجاد نوبت
Hizmet, çalışan ve tarih seçiniz.|Select a service, staff member and date.|Выберите услугу, сотрудника и дату.|اختر الخدمة والموظف والتاريخ.|Hyzmaty, işgäri we senäni saýlaň.|خدمت، کارمند و تاریخ را انتخاب کنید.
Müsaitlik kontrol ediliyor...|Checking availability...|Проверяем доступность...|جارٍ التحقق من التوفر...|Boş wagt barlanýar...|در حال بررسی زمان آزاد...
Müsaitlik alınamadı.|Could not load availability.|Не удалось загрузить свободное время.|تعذر تحميل الأوقات المتاحة.|Boş wagtlar alynmady.|دریافت زمان‌های آزاد ناموفق بود.
Salon bu tarihte kapalı.|The salon is closed on this date.|В этот день салон закрыт.|الصالون مغلق في هذا التاريخ.|Salon bu senede ýapyk.|سالن در این تاریخ بسته است.
Uygun saat kalmadı.|No available times left.|Свободного времени нет.|لا توجد أوقات متاحة.|Boş wagt galmady.|زمان آزادی باقی نمانده.
Tüm alanları ve müsait bir saati seçiniz.|Complete all fields and select an available time.|Заполните все поля и выберите свободное время.|أكمل جميع الحقول واختر وقتاً متاحاً.|Ähli meýdanlary dolduryň we boş wagt saýlaň.|همه فیلدها را تکمیل و زمان آزاد انتخاب کنید.
Randevu oluşturulamadı.|Could not create appointment.|Не удалось создать запись.|تعذر إنشاء الموعد.|Ýazgy döredilmedi.|ایجاد نوبت ناموفق بود.
Manuel randevu oluşturuldu.|Manual appointment created.|Ручная запись создана.|تم إنشاء الموعد اليدوي.|El bilen ýazgy döredildi.|نوبت دستی ایجاد شد.
E-posta bilgisi yok|No email address|Почта не указана|لا يوجد بريد إلكتروني|E-poçta salgysy ýok|ایمیل موجود نیست
Kendi randevularını gör|View own appointments|Просматривать свои записи|عرض مواعيدي|Öz nobatlaryny gör|مشاهده نوبت‌های خود
Kendi randevusunu tamamlandı yap|Mark own appointment completed|Отмечать свои записи выполненными|وضع علامة مكتمل على موعدي|Öz nobadyny tamamlanan et|تکمیل‌کردن نوبت خود
Müşteri telefonunu gör|View customer phone|Просматривать телефон клиента|عرض هاتف العميل|Müşderiniň telefonyny gör|شماره مشتری را ببینید
Gelmedi olarak işaretle|Mark as no-show|Отметить неявку|وضع علامة لم يحضر|Gelmedi diýip belle|علامت‌گذاری عدم حضور
Randevu notlarını düzenle|Edit appointment notes|Редактировать заметки записи|تعديل ملاحظات الموعد|Nobat belliklerini üýtget|ویرایش یادداشت‌های نوبت
Kendi çalışma saatlerini düzenle|Edit own working hours|Изменять свои рабочие часы|تعديل ساعات عملي|Öz iş sagatlaryny üýtget|ویرایش ساعات کاری خود
Salon randevularını gör|View salon appointments|Просматривать записи салона|عرض مواعيد الصالون|Salon nobatlaryny gör|مشاهده نوبت‌های سالن
Manuel randevu oluştur|Create manual appointment|Создать ручную запись|إنشاء موعد يدوي|El bilen nobat döret|ایجاد نوبت دستی
Müşterileri gör|View customers|Просматривать клиентов|عرض العملاء|Müşderileri gör|مشاهده مشتریان
Randevuları yönet|Manage appointments|Управлять записями|إدارة المواعيد|Nobatlary dolandyr|مدیریت نوبت‌ها
İptal ve değişiklik taleplerini yönet|Manage cancellation and change requests|Управлять запросами отмены и переноса|إدارة طلبات الإلغاء والتعديل|Ýatyrmak we üýtgetmek haýyşlaryny dolandyr|مدیریت درخواست‌های لغو و تغییر
Çalışan programlarını gör|View staff schedules|Просматривать расписания сотрудников|عرض جداول الموظفين|Işgär programmalaryny gör|مشاهده برنامه کارکنان
Ciroyu gör|View revenue|Просматривать выручку|عرض الإيرادات|Girdejini gör|مشاهده درآمد
Çalışan programlarını düzenle|Edit staff schedules|Изменять расписания сотрудников|تعديل جداول الموظفين|Işgär programmalaryny üýtget|ویرایش برنامه کارکنان
Hizmetleri düzenle|Edit services|Редактировать услуги|تعديل الخدمات|Hyzmatlary üýtget|ویرایش خدمات
Çalışanları yönet|Manage staff|Управлять сотрудниками|إدارة الموظفين|Işgärleri dolandyr|مدیریت کارکنان
Raporları gör|View reports|Просматривать отчёты|عرض التقارير|Hasabatlary gör|مشاهده گزارش‌ها
Salon bilgilerini yönet|Manage salon information|Управлять информацией о салоне|إدارة معلومات الصالون|Salon maglumatlaryny dolandyr|مدیریت اطلاعات سالن
Telefon|Phone|Телефон|الهاتف|Telefon|تلفن
E-posta|Email|Эл. почта|البريد الإلكتروني|E-poçta|ایمیل
Rol|Role|Роль|الدور|Rol|نقش
Bildirim durumu|Notification status|Статус уведомлений|حالة الإشعارات|Bildiriş ýagdaýy|وضعیت اعلان
Dil ayarını değiştir|Change language setting|Изменить язык|تغيير إعداد اللغة|Dil sazlamasyny üýtget|تغییر زبان
Profili Düzenle|Edit profile|Редактировать профиль|تعديل الملف الشخصي|Profili üýtget|ویرایش پروفایل
Profil Bilgileri|Profile details|Данные профиля|بيانات الملف الشخصي|Profil maglumatlary|اطلاعات پروفایل
Kaydet|Save|Сохранить|حفظ|Ýatda sakla|ذخیره
Vazgeç|Cancel|Отмена|إلغاء|Ýatyr|انصراف
Kaydediliyor...|Saving...|Сохранение...|جارٍ الحفظ...|Ýatda saklanýar...|در حال ذخیره...
Profiliniz güncellendi.|Your profile was updated.|Ваш профиль обновлён.|تم تحديث ملفك الشخصي.|Profiliňiz täzelendi.|پروفایل شما به‌روزرسانی شد.
Profil güncellenemedi.|Profile could not be updated.|Не удалось обновить профиль.|تعذر تحديث الملف الشخصي.|Profil täzelenmedi.|به‌روزرسانی پروفایل ناموفق بود.
Ad soyad|Full name|Полное имя|الاسم الكامل|Doly ady|نام و نام خانوادگی
Telefon numarası|Phone number|Номер телефона|رقم الهاتف|Telefon belgisi|شماره تلفن
E-posta bu hesap için oturum bilgisidir ve burada değiştirilemez.|Email is the sign-in identity for this account and cannot be changed here.|Эл. почта — это идентификатор входа и не меняется здесь.|البريد الإلكتروني هو هوية تسجيل الدخول ولا يمكن تغييره هنا.|E-poçta bu hasap üçin giriş maglumatydyr we bu ýerde üýtgedilip bilinmez.|ایمیل شناسه ورود این حساب است و از اینجا قابل تغییر نیست.
Bildirimleri Aç|Enable notifications|Включить уведомления|تفعيل الإشعارات|Bildirişleri aç|فعال‌سازی اعلان‌ها
Hesap bilgileriniz güvenle yönetilir. İzin verilen profil bilgilerinizi düzenleyebilirsiniz.|Your account information is managed securely. You can edit your permitted profile details.|Данные вашей учётной записи защищены. Вы можете редактировать разрешённые данные профиля.|تتم إدارة معلومات حسابك بأمان. يمكنك تعديل بيانات ملفك الشخصي المسموح بها.|Hasap maglumatlaryňyz ygtybarly dolandyrylýar. Rugsat berlen profil maglumatlaryňyzy üýtgedip bilersiňiz.|اطلاعات حساب شما به‌صورت امن مدیریت می‌شود. می‌توانید اطلاعات مجاز پروفایل خود را ویرایش کنید.
Yardıma ihtiyacınız olursa salon sahibinizle veya destek ekibiyle iletişime geçin.|If you need help, contact your salon owner or the support team.|Если вам нужна помощь, обратитесь к владельцу салона или в службу поддержки.|إذا احتجت إلى مساعدة، فتواصل مع مالك الصالون أو فريق الدعم.|Kömek gerek bolsa, salon eýesi ýa-da goldaw topary bilen habarlaşyň.|اگر به کمک نیاز دارید، با صاحب سالن یا تیم پشتیبانی تماس بگیرید.
`;
export const staffAdminMessages = Object.fromEntries(rows.trim().split('\n').map((row, index) => {
  const [tr, en, ru, ar, tk, fa] = row.split('|');
  return [`staffUi_${index + 1}`, { tr, en, ru, ar, tk, fa }];
}));
