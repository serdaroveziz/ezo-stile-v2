// UI copy only. Columns: key | tr | en | ru | ar | tk | fa.
const rows = `
operationRetry|İşlem tamamlanamadı. Bilgileriniz korundu; lütfen tekrar deneyin.|The operation could not be completed. Your inputs are preserved; please try again.|Не удалось завершить операцию. Введённые данные сохранены; повторите попытку.|تعذر إكمال العملية. تم الاحتفاظ بمدخلاتك؛ يرجى المحاولة مجددًا.|Amal tamamlanmady. Girizen maglumatlaryňyz saklandy; täzeden synanyşyň.|عملیات انجام نشد. اطلاعات واردشده حفظ شده است؛ دوباره تلاش کنید.
ownerTransferRequired|Bu kullanıcı salon sahibi. Önce salon sahipliğini başka bir hesaba aktarın.|This user owns a salon. Transfer salon ownership to another account first.|Этот пользователь владеет салоном. Сначала передайте салон другому аккаунту.|هذا المستخدم مالك صالون. انقل ملكية الصالون إلى حساب آخر أولًا.|Bu ulanyjy salonyň eýesi. Ilki salonyň eýeçiligini başga hasaba geçiriň.|این کاربر مالک سالن است. ابتدا مالکیت سالن را به حساب دیگری منتقل کنید.
superAdminDeleteDenied|Başka bir süper admin hesabı silinemez.|Another super admin account cannot be deleted.|Нельзя удалить другого суперадминистратора.|لا يمكن حذف حساب مسؤول عام آخر.|Başga baş administratoryň hasabyny pozup bolmaýar.|حساب مدیر کل دیگر قابل حذف نیست.
sessionExpired|Oturumunuz geçersiz veya süresi dolmuş. Lütfen tekrar giriş yapın.|Your session is invalid or expired. Please sign in again.|Сессия недействительна или истекла. Войдите снова.|جلستك غير صالحة أو انتهت. يرجى تسجيل الدخول مجددًا.|Sessiýaňyz nädogry ýa-da möhleti gutardy. Täzeden giriň.|نشست شما نامعتبر است یا منقضی شده. دوباره وارد شوید.
superAdminTitle|UNELIVO — Süper Admin|UNELIVO — Super Admin|UNELIVO — Суперадминистратор|UNELIVO — المسؤول العام|UNELIVO — Baş administrator|UNELIVO — مدیر کل
commandCenter|Komuta Merkezi|Control Center|Центр управления|مركز التحكم|Dolandyryş merkezi|مرکز مدیریت
totalSalons|Toplam Salon|Total Salons|Всего салонов|إجمالي الصالونات|Salonlaryň jemi|مجموع سالن‌ها
activeSalons|Aktif Salon|Active Salons|Активные салоны|الصالونات النشطة|Işjeň salonlar|سالن‌های فعال
pendingApps|Bekleyen Başvuru|Pending Applications|Заявки на рассмотрении|الطلبات المعلقة|Garaşýan arzalar|درخواست‌های در انتظار
totalUsers|Toplam Kullanıcı|Total Users|Всего пользователей|إجمالي المستخدمين|Ulanyjylaryň jemi|مجموع کاربران
todayPlatformApts|Bugünkü Randevu|Today's Appointments|Записи на сегодня|مواعيد اليوم|Şu günki nobatlar|نوبت‌های امروز
platformRevenue|Platform Geliri|Platform Revenue|Доход платформы|إيرادات المنصة|Platformanyň girdejisi|درآمد پلتفرم
salonsTabAdmin|Salonlar|Salons|Салоны|الصالونات|Salonlar|سالن‌ها
applicationsTabAdmin|Başvurular|Applications|Заявки|الطلبات|Arzalar|درخواست‌ها
usersTabAdmin|Kullanıcılar|Users|Пользователи|المستخدمون|Ulanyjylar|کاربران
managementTabAdmin|Yönetim|Management|Управление|الإدارة|Dolandyryş|مدیریت
grantLimitNotice|Maksimum 2 Aktif Ücretsiz Premium Grant|At most 2 active free Premium grants|Не более 2 активных бесплатных предоставлений Premium|بحد أقصى منحتان مجانيتان نشطتان من Premium|Iň köp 2 işjeň mugt Premium rugsady|حداکثر ۲ اشتراک هدیه فعال Premium
supportModeBanner|Süper Admin Destek Modu —|Super Admin Support Mode —|Режим поддержки администратора —|وضع دعم المسؤول العام —|Baş administrator goldaw tertibi —|حالت پشتیبانی مدیر کل —
exitSupportMode|Destek Modundan Çık|Exit Support Mode|Выйти из режима поддержки|الخروج من وضع الدعم|Goldaw tertibinden çyk|خروج از حالت پشتیبانی
serviceLabel|Hizmet|Service|Услуга|الخدمة|Hyzmat|خدمت
barberLabel|Berber|Barber|Мастер|الحلاق|Dellek|آرایشگر
dateLabel|Tarih|Date|Дата|التاريخ|Sene|تاریخ
timeLabel|Saat|Time|Время|الوقت|Wagt|ساعت
priceLabel|Fiyat|Price|Цена|السعر|Baha|قیمت
statusLabel|Durum|Status|Статус|الحالة|Ýagdaý|وضعیت
cancelRequestBtn|İptal Talebi Gönder|Request Cancellation|Запросить отмену|طلب الإلغاء|Ýatyrmak haýyşyny iber|درخواست لغو
rescheduleRequestBtn|Tarih/Saat Değiştir|Change Date/Time|Изменить дату и время|تغيير التاريخ والوقت|Senäni/wagty üýtget|تغییر تاریخ و ساعت
noActiveAppointments|Aktif randevunuz bulunmamaktadır.|You have no active appointments.|У вас нет активных записей.|ليس لديك مواعيد نشطة.|Işjeň nobatyňyz ýok.|نوبت فعالی ندارید.
noPastAppointments|Geçmiş randevu kaydı bulunmamaktadır.|No past appointments.|Прошлых записей нет.|لا توجد مواعيد سابقة.|Öňki nobatlar ýok.|نوبت گذشته‌ای وجود ندارد.
masterNotifLabel|Tüm Bildirimleri Aç / Kapat|Enable / Disable All Notifications|Включить / выключить все уведомления|تفعيل / تعطيل جميع الإشعارات|Ähli bildirişleri aç / ýap|فعال / غیرفعال کردن همه اعلان‌ها
masterNotifSub|Ana bildirim anahtarı (alt tercihler korunur)|Master switch (individual preferences are kept)|Главный переключатель (настройки сохраняются)|المفتاح الرئيسي (تُحفظ التفضيلات الفرعية)|Esasy açar (aýratyn sazlamalar saklanýar)|کلید اصلی (تنظیمات جزئی حفظ می‌شوند)
imageEditorTitle|Görsel Düzenleme & Kırpma|Edit & Crop Image|Редактирование и обрезка|تحرير الصورة واقتصاصها|Suraty redaktirlemek we kesmek|ویرایش و برش تصویر
zoomIn|Yakınlaştır (+)|Zoom In (+)|Увеличить (+)|تكبير (+)|Ýakynlaşdyr (+)|بزرگ‌نمایی (+)
zoomOut|Uzaklaştır (-)|Zoom Out (-)|Уменьшить (-)|تصغير (-)|Uzaklaşdyr (-)|کوچک‌نمایی (-)
previewKesfet|Keşfet Kartı Önizleme|Discovery Card Preview|Предпросмотр карточки поиска|معاينة بطاقة الاستكشاف|Gözleg kartynyň syny|پیش‌نمایش کارت جستجو
previewProfile|Profil/Logo Önizleme|Profile/Logo Preview|Предпросмотр профиля/логотипа|معاينة الملف/الشعار|Profil/logotip syny|پیش‌نمایش پروفایل/نشان
packageManagementTitle|Paket & Lisans Durumu|Plan & License Status|Тариф и лицензия|حالة الباقة والترخيص|Paket we ygtyýarnama ýagdaýy|وضعیت بسته و مجوز
currentPackage|Mevcut Paket|Current Plan|Текущий тариф|الباقة الحالية|Häzirki paket|بسته فعلی
upgradePackageBtn|Paketi Yükselt →|Upgrade Plan →|Улучшить тариф →|ترقية الباقة ←|Paketi ýokarlandyr →|ارتقای بسته ←
superAdminGrantNotice|Premium — Süper Admin Tarafından Tanımlandı|Premium — Granted by Super Admin|Premium — предоставлен администратором|Premium — منحه المسؤول العام|Premium — Baş administrator tarapyndan berildi|Premium — اعطاشده توسط مدیر کل
sandboxPaymentNotice|Sandbox / Test Ödeme Altyapısı Aktiftir|Sandbox / Test Payments Are Active|Включён тестовый режим оплаты|الدفع التجريبي مفعّل|Synag töleg ulgamy işjeň|پرداخت آزمایشی فعال است
personalDetails|Kişisel Bilgiler & Profil|Personal Details & Profile|Личные данные и профиль|البيانات الشخصية والملف|Şahsy maglumatlar we profil|اطلاعات شخصی و پروفایل
salonMedia|Salon Görselleri & Galeri|Salon Images & Gallery|Фото салона и галерея|صور الصالون والمعرض|Salon suratlary we galereýa|تصاویر سالن و گالری
editDisplayName|Ad Soyad Düzenle|Edit Full Name|Изменить имя|تعديل الاسم الكامل|Ady we familiýany üýtget|ویرایش نام و نام خانوادگی
changePhone|Telefon Numarası Değiştir|Change Phone Number|Изменить номер телефона|تغيير رقم الهاتف|Telefon belgisini üýtget|تغییر شماره تلفن
inAppNotifs|Uygulama İçi Bildirimler|In-App Notifications|Уведомления в приложении|إشعارات داخل التطبيق|Programma içindäki bildirişler|اعلان‌های داخل برنامه
soundNotifs|Sesli Bildirimler|Notification Sounds|Звуки уведомлений|أصوات الإشعارات|Sesli bildirişler|صدای اعلان‌ها
newBookingNotifs|Yeni Randevu Bildirimleri|New Appointment Notifications|Уведомления о новых записях|إشعارات المواعيد الجديدة|Täze nobat bildirişleri|اعلان نوبت جدید
statusUpdateNotifs|Randevu Onay / Durum Güncellemesi|Appointment Approval / Status Updates|Подтверждение / изменение статуса записи|تأكيد الموعد / تحديث الحالة|Nobaty tassyklamak / ýagdaýy täzelemek|تأیید نوبت / تغییر وضعیت
cancelReqNotifs|İptal Talebi Bildirimleri|Cancellation Requests|Запросы отмены|طلبات الإلغاء|Ýatyrmak haýyşlary|درخواست‌های لغو
reschedReqNotifs|Tarih/Saat Değişiklik Talebi|Reschedule Requests|Запросы переноса|طلبات تغيير الموعد|Wagty üýtgetmek haýyşlary|درخواست‌های تغییر زمان
upcomingReminderNotifs|Yaklaşan Randevu Hatırlatması|Upcoming Appointment Reminders|Напоминания о предстоящих записях|تذكيرات المواعيد القادمة|Ýakynlaşýan nobat ýatlatmalary|یادآوری نوبت‌های نزدیک
noShowNotifs|Gelmedi Bildirimi|No-Show Notifications|Уведомления о неявке|إشعارات عدم الحضور|Gelmedik müşderi bildirişleri|اعلان عدم حضور
completedNotifs|Tamamlanan Randevu Bildirimi|Completed Appointment Notifications|Уведомления о завершённых записях|إشعارات المواعيد المكتملة|Tamamlanan nobat bildirişleri|اعلان نوبت‌های انجام‌شده
staffInviteNotifs|Personel Daveti Bildirimleri|Staff Invitation Notifications|Уведомления о приглашениях сотрудников|إشعارات دعوات الموظفين|Işgär çakylyk bildirişleri|اعلان دعوت کارکنان
staffRoleNotifs|Personel Rol / Yetki Değişikliği|Staff Role / Permission Changes|Изменения роли / прав сотрудника|تغييرات أدوار / صلاحيات الموظفين|Işgär wezipesiniň / rugsatlarynyň üýtgemegi|تغییر نقش / مجوز کارکنان
packagePremiumNotifs|Paket / Premium Bildirimleri|Plan / Premium Notifications|Уведомления о тарифе / Premium|إشعارات الباقة / Premium|Paket / Premium bildirişleri|اعلان بسته / Premium
billingNotifs|Ödeme / Abonelik Bildirimleri|Payment / Subscription Notifications|Уведомления об оплате / подписке|إشعارات الدفع / الاشتراك|Töleg / abuna bildirişleri|اعلان پرداخت / اشتراک
campaignNotifs|UNELIVO Kampanya & Duyurular|UNELIVO Offers & Announcements|Акции и объявления UNELIVO|عروض وإعلانات UNELIVO|UNELIVO teklipleri we bildirişleri|پیشنهادها و اطلاعیه‌های UNELIVO
searchPlaceholder|Salon adı, şehir, ilçe veya hizmet ara...|Search salon, city, district or service...|Поиск салона, города, района или услуги...|ابحث عن صالون أو مدينة أو منطقة أو خدمة...|Salon, şäher, etrap ýa-da hyzmat gözle...|جستجوی سالن، شهر، منطقه یا خدمت...
salonGallery|Fotoğraf Galerisi|Photo Gallery|Фотогалерея|معرض الصور|Surat galereýasy|گالری تصاویر
activeUpcomingAppointments|Aktif / Yaklaşan Randevular|Active / Upcoming Appointments|Активные / предстоящие записи|المواعيد النشطة / القادمة|Işjeň / ýakynlaşýan nobatlar|نوبت‌های فعال / آینده
pastAppointmentsLimit|Geçmiş Randevular (Son 5)|Past Appointments (Last 5)|Прошлые записи (последние 5)|المواعيد السابقة (آخر 5)|Öňki nobatlar (soňky 5)|نوبت‌های گذشته (۵ مورد آخر)
salonLabel|Salon|Salon|Салон|الصالون|Salon|سالن
portalUi_confirm|Evet, Onayla|Yes, Confirm|Да, подтвердить|نعم، تأكيد|Hawa, tassykla|بله، تأیید
portalUi_cancel|Vazgeç|Cancel|Отмена|إلغاء|Ýatyr|انصراف
portalUi_processing|İşleniyor...|Processing...|Обработка...|جارٍ المعالجة...|Işlenýär...|در حال پردازش...
portalUi_logo|UNELIVO Logo|UNELIVO Logo|Логотип UNELIVO|شعار UNELIVO|UNELIVO logotipi|نشان UNELIVO
portalUi_customerIntro|Salon bul, randevu al, AI ile saç modelini dene.|Find a salon, book an appointment, try hairstyles with AI.|Найдите салон, запишитесь и примерьте причёску с ИИ.|ابحث عن صالون واحجز موعداً وجرّب تسريحة بالذكاء الاصطناعي.|Salon tapyň, nobat alyň, emeli aň bilen saç keşbini synap görüň.|سالن پیدا کنید، نوبت بگیرید و مدل مو را با هوش مصنوعی امتحان کنید.
portalUi_salonIntro|Salon girişi, başvuru veya çalışan davet kodu ile katılım.|Salon login, application or staff invitation code.|Вход в салон, заявка или код приглашения сотрудника.|دخول الصالون أو التقديم أو الانضمام برمز دعوة موظف.|Salona giriş, arza ýa-da işgär çakylyk kody bilen goşulmak.|ورود سالن، ثبت درخواست یا عضویت با کد دعوت کارکنان.
portalUi_customerChoice|Müşteri Girişi & Kayıt|Customer Login & Registration|Вход и регистрация клиента|دخول العميل والتسجيل|Müşderi girişi we hasaba alyş|ورود و ثبت‌نام مشتری
portalUi_newCustomer|1. Kayıt Ol (Yeni Müşteri)|1. Register (New Customer)|1. Регистрация (новый клиент)|1. تسجيل (عميل جديد)|1. Hasaba al (täze müşderi)|۱. ثبت‌نام (مشتری جدید)
portalUi_existingCustomer|2. Hesabım Var (Müşteri Girişi)|2. I Have an Account (Customer Login)|2. У меня есть аккаунт (вход клиента)|2. لدي حساب (دخول العميل)|2. Hasabym bar (müşderi girişi)|۲. حساب دارم (ورود مشتری)
portalUi_registerTitle|Müşteri Kayıt Formu|Customer Registration|Регистрация клиента|تسجيل العميل|Müşderini hasaba almak|ثبت‌نام مشتری
portalUi_nameExample|Örn: Serdar Kuvvat|e.g. Serdar Kuvvat|Например: Serdar Kuvvat|مثال: Serdar Kuvvat|Mysal: Serdar Kuvvat|مثلاً: Serdar Kuvvat
portalUi_passwordRepeat|Şifre Tekrar|Repeat Password|Повторите пароль|تأكيد كلمة المرور|Açar sözüni gaýtala|تکرار رمز عبور
portalUi_registerLogin|Kayıt Ol & Otomatik Giriş Yap|Register & Sign In|Зарегистрироваться и войти|التسجيل والدخول|Hasaba al we gir|ثبت‌نام و ورود
portalUi_existingAccount|Hesabım Var|I Have an Account|У меня есть аккаунт|لدي حساب|Hasabym bar|حساب دارم
portalUi_salonAccess|Salon, Yönetici & Süper Admin Girişi|Salon, Manager & Super Admin Login|Вход салона, управляющего и администратора|دخول الصالون والمدير والمسؤول العام|Salon, dolandyryjy we baş administrator girişi|ورود سالن، مدیر و مدیر کل
portalUi_newSalon|Yeni Salon Başvurusu|New Salon Application|Заявка нового салона|طلب صالون جديد|Täze salon arzasy|درخواست سالن جدید
portalUi_joinPlatform|UNELIVO Platformuna Katılın|Join UNELIVO|Присоединяйтесь к UNELIVO|انضم إلى UNELIVO|UNELIVO platformasyna goşulyň|به UNELIVO بپیوندید
portalUi_haveInvite|Çalışan Davet Kodum Var|I Have a Staff Invitation Code|У меня есть код приглашения сотрудника|لدي رمز دعوة موظف|Işgär çakylyk kodum bar|کد دعوت کارکنان دارم
portalUi_joinSalon|Davet Kodu ile Salona Katıl|Join Salon with Invitation Code|Присоединиться к салону по коду|الانضمام للصالون برمز الدعوة|Çakylyk kody bilen salona goşul|عضویت در سالن با کد دعوت
portalUi_salonLoginHelp|Patron, Yönetici, Resepsiyon, Çalışan veya Süper Admin hesabınızla giriş yapınız.|Sign in with your owner, manager, receptionist, staff or super admin account.|Войдите как владелец, управляющий, администратор стойки, сотрудник или суперадминистратор.|ادخل بحساب المالك أو المدير أو موظف الاستقبال أو الموظف أو المسؤول العام.|Eýe, dolandyryjy, kabul ediji, işgär ýa-da baş administrator hasabyňyz bilen giriň.|با حساب مالک، مدیر، پذیرش، کارمند یا مدیر کل وارد شوید.
portalUi_passwordHint|Şifre (en az 6 karakter)|Password (at least 6 characters)|Пароль (не менее 6 символов)|كلمة المرور (6 أحرف على الأقل)|Açar sözi (azyndan 6 nyşan)|رمز عبور (حداقل ۶ نویسه)
portalUi_repeatHint|Şifreyi tekrar girin|Enter Password Again|Введите пароль ещё раз|أدخل كلمة المرور مجدداً|Açar sözüni täzeden giriziň|رمز عبور را دوباره وارد کنید
portalUi_inviteHelp|Salon sahibinizden aldığınız 24 saatlik davet kodunu buraya giriniz.|Enter the 24-hour invitation code from your salon owner.|Введите полученный от владельца код, действующий 24 часа.|أدخل رمز الدعوة من مالك الصالون الصالح لمدة 24 ساعة.|Salon eýesinden alan 24 sagatlyk çakylyk koduny giriziň.|کد دعوت ۲۴ ساعته دریافتی از مالک سالن را وارد کنید.
portalUi_acceptInvite|Daveti Kabul Et & Katıl|Accept Invitation & Join|Принять приглашение и присоединиться|قبول الدعوة والانضمام|Çakylygy kabul et we goşul|پذیرش دعوت و عضویت
portalUi_namePhoneRequired|Lütfen ad soyad ve telefon numarası giriniz.|Enter your full name and phone number.|Введите имя и номер телефона.|أدخل الاسم الكامل ورقم الهاتف.|Adyňyzy, familiýaňyzy we telefon belgiňizi giriziň.|نام و نام خانوادگی و شماره تلفن را وارد کنید.
portalUi_passwordLength|Şifre en az 6 karakter olmalıdır.|Password must contain at least 6 characters.|Пароль должен содержать не менее 6 символов.|يجب أن تتكون كلمة المرور من 6 أحرف على الأقل.|Açar sözi azyndan 6 nyşan bolmaly.|رمز عبور باید حداقل ۶ نویسه باشد.
portalUi_passwordMismatch|Şifreler birbiriyle eşleşmiyor.|Passwords do not match.|Пароли не совпадают.|كلمتا المرور غير متطابقتين.|Açar sözleri gabat gelmeýär.|رمزهای عبور یکسان نیستند.
portalUi_registrationFailed|Kayıt oluşturulamadı.|Registration failed.|Не удалось зарегистрироваться.|تعذر التسجيل.|Hasaba almak başartmady.|ثبت‌نام انجام نشد.
portalUi_credentialsRequired|Telefon numarası ve şifre zorunludur.|Phone number and password are required.|Требуются номер телефона и пароль.|رقم الهاتف وكلمة المرور مطلوبان.|Telefon belgisi we açar sözi hökmany.|شماره تلفن و رمز عبور الزامی است.
portalUi_loginFailed|Giriş yapılamadı.|Could not sign in.|Не удалось войти.|تعذر تسجيل الدخول.|Girip bolmady.|ورود انجام نشد.
portalUi_customerAccount|Bu telefon müşteri hesabına aittir. Lütfen Müşteriyim → Giriş Yap bölümünden giriş yapınız.|This is a customer account. Sign in under I am a Customer → Login.|Это аккаунт клиента. Войдите через Я клиент → Вход.|هذا حساب عميل. ادخل من أنا عميل ← تسجيل الدخول.|Bu müşderi hasaby. Men müşderi → Giriş bölüminden giriň.|این حساب مشتری است. از بخش مشتری هستم ← ورود اقدام کنید.
portalUi_applicationRequired|Lütfen salon, yetkili, telefon, şehir ve ilçe alanlarını doldurunuz.|Enter salon, contact name, phone, city and district.|Укажите салон, контактное лицо, телефон, город и район.|أدخل الصالون واسم المسؤول والهاتف والمدينة والمنطقة.|Salon, jogapkär, telefon, şäher we etrap meýdanlaryny dolduryň.|سالن، نام مسئول، تلفن، شهر و منطقه را وارد کنید.
portalUi_applicationCreated|Hesabınız ve başvurunuz oluşturuldu. Onaydan sonra aynı telefon ve şifreyle Salon Girişi yapabilirsiniz.|Your account and application were created. After approval, use the same phone and password for Salon Login.|Аккаунт и заявка созданы. После одобрения войдите с теми же телефоном и паролем.|تم إنشاء الحساب والطلب. بعد الموافقة، ادخل بنفس الهاتف وكلمة المرور.|Hasabyňyz we arzaňyz döredildi. Tassyklanandan soň şol telefon we açar sözi bilen salona giriň.|حساب و درخواست شما ایجاد شد. پس از تأیید با همان تلفن و رمز وارد بخش سالن شوید.
portalUi_applicationFailed|Başvuru gönderilemedi.|Could not submit application.|Не удалось отправить заявку.|تعذر إرسال الطلب.|Arzany iberip bolmady.|ارسال درخواست انجام نشد.
portalUi_inviteRequired|Davet kodu, telefon numarası ve şifre zorunludur.|Invitation code, phone and password are required.|Требуются код приглашения, телефон и пароль.|رمز الدعوة والهاتف وكلمة المرور مطلوبة.|Çakylyk kody, telefon belgisi we açar sözi hökmany.|کد دعوت، تلفن و رمز عبور الزامی است.
portalUi_inviteAccepted|Davet kabul edildi! Çalışan paneliniz açıldı.|Invitation accepted! Your staff panel is open.|Приглашение принято! Панель сотрудника открыта.|تم قبول الدعوة! فُتحت لوحة الموظف.|Çakylyk kabul edildi! Işgär paneliňiz açyldy.|دعوت پذیرفته شد! پنل کارکنان باز شد.
portalUi_inviteInvalid|Geçersiz veya süresi dolmuş davet kodu.|Invalid or expired invitation code.|Недействительный или просроченный код.|رمز الدعوة غير صالح أو منتهي.|Çakylyk kody nädogry ýa-da möhleti gutaran.|کد دعوت نامعتبر است یا منقضی شده است.
portalUi_addSalon|Salonumu UNELIVO'a Ekle|Add My Salon to UNELIVO|Добавить мой салон в UNELIVO|إضافة صالوني إلى UNELIVO|Salonymy UNELIVO-a goş|افزودن سالن من به UNELIVO
portalUi_applicationHelp|Salonunuzu UNELIVO VIP platformuna eklemek için bilgileri doldurunuz. Başvurunuz Süper Admin onayına gönderilecektir.|Enter your salon details. Your application will be sent to the super admin for approval.|Заполните данные салона. Заявка будет отправлена суперадминистратору на одобрение.|أدخل بيانات الصالون. سيُرسل الطلب للمسؤول العام للموافقة.|Salon maglumatlaryny dolduryň. Arzaňyz tassyklamak üçin baş administratora iberiler.|اطلاعات سالن را وارد کنید. درخواست برای تأیید به مدیر کل ارسال می‌شود.
portalUi_salonName|Salon Adı *|Salon Name *|Название салона *|اسم الصالون *|Salonyň ady *|نام سالن *
portalUi_salonExample|Örn: Elite VIP Barber Club|e.g. Elite VIP Barber Club|Например: Elite VIP Barber Club|مثال: Elite VIP Barber Club|Mysal: Elite VIP Barber Club|مثلاً: Elite VIP Barber Club
portalUi_contactPhone|İletişim Telefonu *|Contact Phone *|Контактный телефон *|هاتف التواصل *|Habarlaşmak üçin telefon *|تلفن تماس *
portalUi_city|Şehir *|City *|Город *|المدينة *|Şäher *|شهر *
portalUi_district|İlçe *|District *|Район *|المنطقة *|Etrap *|منطقه *
portalUi_address|Açık Adres *|Full Address *|Полный адрес *|العنوان الكامل *|Doly salgy *|نشانی کامل *
portalUi_addressHint|Mahalle, Cadde, No...|Neighborhood, Street, No...|Квартал, улица, номер...|الحي، الشارع، الرقم...|Ýaşaýyş ýeri, köçe, belgi...|محله، خیابان، پلاک...
portalUi_instagram|Instagram Hesabı|Instagram Account|Аккаунт Instagram|حساب Instagram|Instagram hasaby|حساب Instagram
portalUi_imageUrl|Salon Görsel URL|Salon Image URL|Ссылка на фото салона|رابط صورة الصالون|Salon suratynyň salgysy|پیوند تصویر سالن
portalUi_submitApplication|Başvuruyu Süper Admin'e Gönder|Submit to Super Admin|Отправить суперадминистратору|إرسال الطلب للمسؤول العام|Arzany baş administratora iber|ارسال درخواست به مدیر کل
portalUi_requiredFields|Lütfen zorunlu alanları (*) doldurunuz.|Complete the required fields (*).|Заполните обязательные поля (*).|املأ الحقول المطلوبة (*).|Hökmany meýdanlary (*) dolduryň.|فیلدهای الزامی (*) را پر کنید.
portalUi_applicationReceived|Salon başvurunuz başarıyla alındı! Süper Admin onayından sonra Salon Sahibi paneliniz aktif edilecektir.|Application received! Your owner panel will be activated after super admin approval.|Заявка получена! Панель владельца станет доступна после одобрения.|تم استلام الطلب! ستُفعّل لوحة المالك بعد موافقة المسؤول العام.|Arzaňyz alyndy! Baş administrator tassyklandan soň eýe paneli işjeňleşer.|درخواست دریافت شد! پنل مالک پس از تأیید مدیر کل فعال می‌شود.
portalUi_applicationRetry|Başvuru gönderilirken bir hata oluştu. Lütfen tekrar deneyiniz.|Application could not be sent. Please try again.|Ошибка отправки заявки. Попробуйте ещё раз.|تعذر إرسال الطلب. حاول مرة أخرى.|Arza iberilende ýalňyşlyk boldy. Täzeden synanyşyň.|در ارسال درخواست خطایی رخ داد. دوباره تلاش کنید.
ui_unexpectedError|İşlem tamamlanamadı. Lütfen tekrar deneyin.|Could not complete the operation. Please try again.|Не удалось завершить операцию. Повторите попытку.|تعذر إكمال العملية. حاول مرة أخرى.|Amaly tamamlap bolmady. Täzeden synanyşyň.|عملیات انجام نشد. دوباره تلاش کنید.
ui_phoneInvalid|Geçerli bir Türkiye cep telefonu numarası giriniz.|Enter a valid Turkish mobile phone number.|Введите действительный турецкий мобильный номер.|أدخل رقم هاتف محمول تركي صالحاً.|Dogry Türkiýe jübi telefon belgisini giriziň.|شماره تلفن همراه معتبر ترکیه وارد کنید.
ui_sessionRequired|Oturum açmanız gerekiyor.|Please sign in.|Войдите в аккаунт.|يرجى تسجيل الدخول.|Hasabyňyza giriň.|لطفاً وارد شوید.
ui_pushKeyMissing|Web Push anahtarı yapılandırılmamış.|Web Push key is not configured.|Ключ Web Push не настроен.|مفتاح Web Push غير مُعدّ.|Web Push açary sazlanmady.|کلید Web Push تنظیم نشده است.
ui_pushTokenUnavailable|Push token alınamadı.|Could not obtain a push token.|Не удалось получить токен push.|تعذر الحصول على رمز الإشعارات.|Push tokenini alyp bolmady.|دریافت توکن اعلان انجام نشد.
ui_pushTokenSaveFailed|Push token kaydedilemedi.|Could not save the push token.|Не удалось сохранить токен push.|تعذر حفظ رمز الإشعارات.|Push tokenini ýatda saklap bolmady.|ذخیره توکن اعلان انجام نشد.
ui_provincesLoadFailed|Türkiye il listesi yüklenemedi.|Could not load Turkish provinces.|Не удалось загрузить провинции Турции.|تعذر تحميل محافظات تركيا.|Türkiýäniň welaýatlaryny ýükläp bolmady.|فهرست استان‌های ترکیه بارگیری نشد.
ui_locationsLoadFailed|Seçilen ilin yerleşim bilgileri yüklenemedi.|Could not load locations for this province.|Не удалось загрузить населённые пункты провинции.|تعذر تحميل مناطق المحافظة المحددة.|Saýlanan welaýatyň ýerlerini ýükläp bolmady.|مناطق استان انتخاب‌شده بارگیری نشد.
ui_bootTimeout|Başlatma Zaman Aşımı|Startup Timed Out|Время запуска истекло|انتهت مهلة بدء التشغيل|Başlatmagyň wagty gutardy|مهلت راه‌اندازی تمام شد
ui_bootDelayed|Uygulama yüklenirken gecikme oluştu (Aşama: {stage}).|Loading is taking longer than expected (Stage: {stage}).|Загрузка занимает больше времени (этап: {stage}).|استغرق التحميل وقتاً أطول (المرحلة: {stage}).|Ýüklemek gijikdi (Tapgyr: {stage}).|بارگیری طول کشیده است (مرحله: {stage}).
ui_returnLogin|Giriş Ekranına Dön|Return to Login|Вернуться ко входу|العودة لتسجيل الدخول|Giriş ekranyna dolan|بازگشت به صفحه ورود
ui_platformTagline|VIP KUAFÖR & GÜZELLİK PLATFORMU|VIP HAIR & BEAUTY PLATFORM|VIP-ПЛАТФОРМА КРАСОТЫ|منصة VIP للشعر والجمال|VIP SAÇ WE GÖZELLIK PLATFORMASY|پلتفرم ویژه آرایش و زیبایی
ui_loading|UNELIVO Yükleniyor...|Loading UNELIVO...|Загрузка UNELIVO...|جارٍ تحميل UNELIVO...|UNELIVO ýüklenýär...|در حال بارگیری UNELIVO...
ui_verifyingSession|Güvenli VIP oturum doğrulanıyor|Verifying your secure session|Проверка защищённого сеанса|جارٍ التحقق من الجلسة الآمنة|Howpsuz sessiýa barlanýar|در حال تأیید نشست امن
ui_panelUnavailable|Panel Açılamadı|Panel Unavailable|Панель недоступна|اللوحة غير متاحة|Panel açylmady|پنل باز نشد
ui_panelRetry|Hesabınız doğrulandı ancak panel yüklenemedi. Lütfen tekrar giriş yapın; sorun sürerse destek ekibine bildirin.|Your account was verified but the panel could not load. Sign in again; contact support if the problem persists.|Аккаунт подтверждён, но панель не загрузилась. Войдите снова; если ошибка повторится, обратитесь в поддержку.|تم التحقق من الحساب لكن تعذر تحميل اللوحة. ادخل مجدداً وتواصل مع الدعم إذا استمرت المشكلة.|Hasabyňyz tassyklandy, ýöne panel ýüklenmedi. Täzeden giriň; mesele dowam etse goldawa ýüz tutuň.|حساب تأیید شد اما پنل بارگیری نشد. دوباره وارد شوید؛ اگر مشکل ادامه داشت با پشتیبانی تماس بگیرید.
`;
export const coreMessages = Object.fromEntries(rows.trim().split('\n').map(line => {
  const [key, ...values] = line.split('|');
  if (values.length !== 6 || values.some(value => !value.trim())) throw new Error(`Invalid UI translation row: ${key}`);
  return [key, Object.fromEntries(['tr','en','ru','ar','tk','fa'].map((lang,index) => [lang, values[index]]))];
}));
