/* EZO STİLE v2 - System Configuration, Constants & 5-Language i18n Engine */

export const CONFIG = {
  APP_NAME: 'EZO STİLE v2',
  APP_VERSION: '2.0.0',
  FIREBASE_DB_URL: 'https://ezostile-barber-default-rtdb.europe-west1.firebasedatabase.app',
  ROLE_HIERARCHY: ['super_admin', 'owner', 'manager', 'barber', 'receptionist', 'customer'],
  ROLE_LABELS: {
    super_admin: '⚡ Platform Süper Admin',
    owner: '👑 Salon Sahibi / Owner',
    manager: '🧑‍💼 Yönetici / Manager',
    barber: '💈 Berber Uzmanı / Barber',
    receptionist: '🛎️ Resepsiyonist',
    customer: '👤 Müşteri'
  },
  DEFAULT_BUSINESS_ID: 'biz_merkez_salon'
};

export const SUPPORTED_LANGUAGES = [
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷', dir: 'ltr' },
  { code: 'en', name: 'English', flag: '🇬🇧', dir: 'ltr' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺', dir: 'ltr' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦', dir: 'rtl' },
  { code: 'tk', name: 'Türkmençe', flag: '🇹🇲', dir: 'ltr' }
];

export function detectDefaultLanguage() {
  if (typeof window === 'undefined') return 'tr';
  const saved = localStorage.getItem('ezo_lang');
  if (saved && ['tr', 'en', 'ru', 'ar', 'tk'].includes(saved)) return saved;
  
  const navLang = (navigator.language || 'tr').toLowerCase();
  if (navLang.startsWith('en')) return 'en';
  if (navLang.startsWith('ru')) return 'ru';
  if (navLang.startsWith('ar')) return 'ar';
  if (navLang.startsWith('tk') || navLang.startsWith('tm')) return 'tk';
  return 'tr';
}

export function isRtl(lang) {
  return lang === 'ar';
}

export const DICTIONARY = {
  tr: {
    welcomeTitle: 'EZO STİLE v2',
    welcomeSub: 'Modern Berber & Güzellik SaaS Platformu',
    imCustomer: '👤 Müşteriyim',
    iHaveSalon: '💈 Salonum Var',
    customerLoginTitle: '👤 Müşteri Girişi / Kayıt',
    salonLoginTitle: '💈 Salon İşletme Girişi',
    salonApplyTitle: '📋 Yeni Salon Başvurusu',
    staffInviteTitle: '🎟️ Çalışan Davet Kodu',
    phoneLabel: 'Telefon Numarası',
    passwordLabel: 'Şifre',
    nameLabel: 'Adınız Soyadınız',
    loginBtn: 'Giriş Yap',
    registerBtn: 'Kayıt Ol',
    applyBtn: 'Başvuru Gönder',
    homeTab: 'Ana Sayfa',
    salonsTab: 'Salonlar',
    bookingTab: 'Randevu Al',
    appointmentsTab: 'Randevularım',
    aiTab: 'AI Danışman',
    profileTab: 'Profil',
    bookAppointment: '✂️ Randevu Al',
    discoverSalons: '💈 Salonları Keşfet',
    aiConsultant: '🤖 AI Saç Danışmanı',
    myAppointments: '📅 Randevularım',
    selectService: '1. Hizmet Seçin',
    selectStaff: '2. Berber Uzmanı Seçin',
    selectDateTime: '3. Tarih ve Müsait Saat',
    confirmBooking: '⚡ Randevuyu Onayla ve Gönder',
    notifyWhatsApp: '💬 WhatsApp ile Bildir',
    notifySms: '📱 SMS ile Bildir',
    notNow: '❌ Şimdi Değil',
    pending: 'BEKLEYEN',
    approved: 'ONAYLANDI',
    completed: 'TAMAMLANDI',
    rejected: 'REDDEDİLDİ',
    cancelled: 'İPTAL EDİLDİ',
    reschedule_requested: 'TARİH DEĞİŞİKLİĞİ İSTENDİ',
    no_show: 'GELMEDİ',
    today: 'Bugün',
    tomorrow: 'Yarın',
    selectDate: '📅 Tarih Seç',
    language: 'Dil / Language',
    logout: 'Çıkış Yap'
  },
  en: {
    welcomeTitle: 'EZO STİLE v2',
    welcomeSub: 'Modern Barber & Beauty SaaS Platform',
    imCustomer: '👤 I am a Customer',
    iHaveSalon: '💈 I Have a Salon',
    customerLoginTitle: '👤 Customer Login / Register',
    salonLoginTitle: '💈 Salon Owner Login',
    salonApplyTitle: '📋 New Salon Application',
    staffInviteTitle: '🎟️ Staff Invite Code',
    phoneLabel: 'Phone Number',
    passwordLabel: 'Password',
    nameLabel: 'Full Name',
    loginBtn: 'Log In',
    registerBtn: 'Sign Up',
    applyBtn: 'Submit Application',
    homeTab: 'Home',
    salonsTab: 'Salons',
    bookingTab: 'Book Now',
    appointmentsTab: 'My Bookings',
    aiTab: 'AI Advisor',
    profileTab: 'Profile',
    bookAppointment: '✂️ Book Appointment',
    discoverSalons: '💈 Discover Salons',
    aiConsultant: '🤖 AI Style Advisor',
    myAppointments: '📅 My Bookings',
    selectService: '1. Select Service',
    selectStaff: '2. Select Barber / Staff',
    selectDateTime: '3. Date & Available Time',
    confirmBooking: '⚡ Confirm & Submit Booking',
    notifyWhatsApp: '💬 Notify via WhatsApp',
    notifySms: '📱 Notify via SMS',
    notNow: '❌ Not Now',
    pending: 'PENDING',
    approved: 'APPROVED',
    completed: 'COMPLETED',
    rejected: 'REJECTED',
    cancelled: 'CANCELLED',
    reschedule_requested: 'RESCHEDULE REQUESTED',
    no_show: 'NO SHOW',
    today: 'Today',
    tomorrow: 'Tomorrow',
    selectDate: '📅 Select Date',
    language: 'Language',
    logout: 'Log Out'
  },
  ru: {
    welcomeTitle: 'EZO STİLE v2',
    welcomeSub: 'Платформа для барбершопов и салонов',
    imCustomer: '👤 Я Клиент',
    iHaveSalon: '💈 У меня салон',
    customerLoginTitle: '👤 Вход / Регистрация клиента',
    salonLoginTitle: '💈 Вход для салона',
    salonApplyTitle: '📋 Заявка на подключение',
    staffInviteTitle: '🎟️ Код приглашения сотрудника',
    phoneLabel: 'Номер телефона',
    passwordLabel: 'Пароль',
    nameLabel: 'Имя и Фамилия',
    loginBtn: 'Войти',
    registerBtn: 'Зарегистрироваться',
    applyBtn: 'Отправить заявку',
    homeTab: 'Главная',
    salonsTab: 'Салоны',
    bookingTab: 'Запись',
    appointmentsTab: 'Мои записи',
    aiTab: 'AI Советник',
    profileTab: 'Профиль',
    bookAppointment: '✂️ Записаться',
    discoverSalons: '💈 Найти салон',
    aiConsultant: '🤖 AI Консультант',
    myAppointments: '📅 Мои записи',
    selectService: '1. Выберите услугу',
    selectStaff: '2. Выберите мастера',
    selectDateTime: '3. Дата и время',
    confirmBooking: '⚡ Подтвердить запись',
    notifyWhatsApp: '💬 Уведомить в WhatsApp',
    notifySms: '📱 Уведомить по SMS',
    notNow: '❌ Не сейчас',
    pending: 'В ОЖИДАНИИ',
    approved: 'ПОДТВЕРЖДЕНО',
    completed: 'ЗАВЕРШЕНО',
    rejected: 'ОТКЛОНЕНО',
    cancelled: 'ОТМЕНЕНО',
    reschedule_requested: 'ЗАПРОС ПЕРЕНОСА',
    no_show: 'НЕ ЯВИЛСЯ',
    today: 'Сегодня',
    tomorrow: 'Завтра',
    selectDate: '📅 Выбрать дату',
    language: 'Язык',
    logout: 'Выйти'
  },
  ar: {
    welcomeTitle: 'EZO STİLE v2',
    welcomeSub: 'منصة الصالونات الحديثة',
    imCustomer: '👤 أنا عميل',
    iHaveSalon: '💈 لدي صالون',
    customerLoginTitle: '👤 تسجيل دخول العميل',
    salonLoginTitle: '💈 تسجيل دخول الصالون',
    salonApplyTitle: '📋 طلب انضمام صالون جديد',
    staffInviteTitle: '🎟️ رمز دعوة موظف',
    phoneLabel: 'رقم الهاتف',
    passwordLabel: 'كلمة المرور',
    nameLabel: 'الاسم الكامل',
    loginBtn: 'تسجيل الدخول',
    registerBtn: 'إنشاء حساب',
    applyBtn: 'إرسال الطلب',
    homeTab: 'الرئيسية',
    salonsTab: 'الصالونات',
    bookingTab: 'حجز موعد',
    appointmentsTab: 'مواعيدي',
    aiTab: 'مستشار AI',
    profileTab: 'الملف الشخصي',
    bookAppointment: '✂️ حجز موعد',
    discoverSalons: '💈 استكشاف الصالونات',
    aiConsultant: '🤖 مستشار الذكاء الاصطناعي',
    myAppointments: '📅 مواعيدي',
    selectService: '١. اختر الخدمة',
    selectStaff: '٢. اختر الحلاق',
    selectDateTime: '٣. التاريخ والوقت',
    confirmBooking: '⚡ تأكيد الحجز',
    notifyWhatsApp: '💬 إشعار عبر WhatsApp',
    notifySms: '📱 إشعار عبر SMS',
    notNow: '❌ ليس الآن',
    pending: 'قيد الانتظار',
    approved: 'تم التأكيد',
    completed: 'مكتمل',
    rejected: 'مرفوض',
    cancelled: 'ملغي',
    reschedule_requested: 'طلب تغيير الموعد',
    no_show: 'لم يحضر',
    today: 'اليوم',
    tomorrow: 'غداً',
    selectDate: '📅 اختر التاريخ',
    language: 'اللغة',
    logout: 'تسجيل الخروج'
  },
  tk: {
    welcomeTitle: 'EZO STİLE v2',
    welcomeSub: 'Döwrebap Berber we Gözellik Platformasy',
    imCustomer: '👤 Men Müşderi',
    iHaveSalon: '💈 Salonym Bar',
    customerLoginTitle: '👤 Müşderi Ulgama Girmek',
    salonLoginTitle: '💈 Salon Eýesi Girmek',
    salonApplyTitle: '📋 Täze Salon Ýüzlenmesi',
    staffInviteTitle: '🎟️ Işgär Çakylyk Kody',
    phoneLabel: 'Telefon belgisi',
    passwordLabel: 'Açar sözi',
    nameLabel: 'At-Familiýa',
    loginBtn: 'Ulgama Gir',
    registerBtn: 'Agza Bol',
    applyBtn: 'Ýüzlenme Ugrat',
    homeTab: 'Baş Sahypa',
    salonsTab: 'Salonlar',
    bookingTab: 'Yazylmak',
    appointmentsTab: 'Yazylmalarym',
    aiTab: 'AI Maslahatçy',
    profileTab: 'Profil',
    bookAppointment: '✂️ Yazylmak',
    discoverSalons: '💈 Salonlary Gözlemek',
    aiConsultant: '🤖 AI Saç Maslahatçysy',
    myAppointments: '📅 Ýazylmalarym',
    selectService: '1. Hyzmaty Saýlaň',
    selectStaff: '2. Usgany Saýlaň',
    selectDateTime: '3. Sene we Wagty Saýlaň',
    confirmBooking: '⚡ Ýazylmagy Tassyklaň',
    notifyWhatsApp: '💬 WhatsApp Bilen Habar Ber',
    notifySms: '📱 SMS Bilen Habar Ber',
    notNow: '❌ Häzir Däl',
    pending: 'GARAŞYLÝAR',
    approved: 'TAS SYKLANDY',
    completed: 'TAMAMLANYNDY',
    rejected: 'RET EDILDY',
    cancelled: 'ÝATYRYLDY',
    reschedule_requested: 'WAGT ÇALŞYRMAK ÝÜZLENMESI',
    no_show: 'GELMEDI',
    today: 'Bugün',
    tomorrow: 'Ertir',
    selectDate: '📅 Sene Saýlaň',
    language: 'Dil',
    logout: 'Ulgamdan Çyk'
  }
};

export function t(key, lang = null) {
  const activeLang = lang || detectDefaultLanguage();
  const dict = DICTIONARY[activeLang] || DICTIONARY.tr;
  return dict[key] || DICTIONARY.tr[key] || key;
}

export function autoTranslateCustomContent(text, targetLang = 'tr') {
  if (!text) return '';
  // Basic dictionary map for common haircut/salon terms across 5 languages
  const termsMap = {
    'saç kesimi': { en: 'Haircut', ru: 'Стрижка', ar: 'قص الشعر', tk: 'Saç kesimi' },
    'sakal tıraşı': { en: 'Beard Trim', ru: 'Стрижка бороды', ar: 'حلاقة اللحية', tk: 'Sakal syrmak' },
    'ense tıraşı': { en: 'Neck Trim', ru: 'Окантовка', ar: 'حلاقة الرقبة', tk: 'Ense kesimi' },
    'saç yıkama': { en: 'Hair Wash', ru: 'Мытье головы', ar: 'غسيل الشعر', tk: 'Saç ýuwmak' },
    'cilt bakımı': { en: 'Skincare', ru: 'Уход за кожей', ar: 'العناية بالبشرة', tk: 'Yüz seretmek' },
    'vip paket': { en: 'VIP Package', ru: 'VIP Пакет', ar: 'باقة VIP', tk: 'VIP Paket' }
  };

  const lower = text.toLowerCase().trim();
  if (termsMap[lower] && termsMap[lower][targetLang]) {
    return termsMap[lower][targetLang];
  }
  return text;
}

export function getApiBaseUrl() {
  if (typeof window !== 'undefined' && window.location.hostname.includes('github.io')) {
    return 'https://ezo-stile-app.vercel.app';
  }
  return '';
}