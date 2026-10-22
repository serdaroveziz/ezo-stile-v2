// Deterministic metrics for UNELIVO AI. The model only ever sees these aggregates:
// no customer names, phones or ids leave the server (KVKK data minimisation).
const DAY_MS = 86400000;
const DONE = new Set(['completed']);
const LOST = new Set(['cancelled', 'rejected', 'no_show']);
const WEEKDAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

const price = a => {
  const value = Number(a.servicePriceSnapshot ?? a.servicePrice ?? a.price ?? 0);
  return Number.isFinite(value) && value > 0 ? value : 0;
};
const shiftDate = (date, days) => new Date(Date.parse(date + 'T12:00:00Z') + days * DAY_MS).toISOString().slice(0, 10);
const top = (map, limit = 5) => Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, limit).map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }));
const pct = (part, total) => total ? Math.round((part / total) * 1000) / 10 : 0;

function periodSummary(list) {
  const completed = list.filter(a => DONE.has(a.status));
  return {
    appointments: list.length,
    completed: completed.length,
    cancelled: list.filter(a => a.status === 'cancelled' || a.status === 'rejected').length,
    noShow: list.filter(a => a.status === 'no_show').length,
    revenueTL: completed.reduce((sum, a) => sum + price(a), 0)
  };
}

export function computeSalonMetrics(business, appointments, today) {
  const all = Object.values(appointments || {}).filter(a => a && typeof a.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(a.date));
  const since = days => all.filter(a => a.date >= shiftDate(today, -days + 1) && a.date <= today);
  const last30 = since(30), prev30 = all.filter(a => a.date >= shiftDate(today, -59) && a.date <= shiftDate(today, -30));
  const upcoming = all.filter(a => a.date > today && a.date <= shiftDate(today, 7) && !LOST.has(a.status));
  const services = {}, serviceRevenue = {}, staffLoad = {}, weekdays = {}, hours = {}, visitsByCustomer = {};
  for (const a of last30) {
    const service = String(a.serviceNameSnapshot || a.serviceName || 'Hizmet').slice(0, 60);
    services[service] = (services[service] || 0) + 1;
    if (DONE.has(a.status)) serviceRevenue[service] = (serviceRevenue[service] || 0) + price(a);
    if (!LOST.has(a.status)) {
      const staff = String(a.staffNameSnapshot || a.staffName || 'Atanmamış').slice(0, 60);
      staffLoad[staff] = (staffLoad[staff] || 0) + 1;
      const day = WEEKDAYS[new Date(a.date + 'T12:00:00Z').getUTCDay()];
      weekdays[day] = (weekdays[day] || 0) + 1;
      const hour = String(a.time || a.startTime || '').slice(0, 2);
      if (/^\d{2}$/.test(hour)) hours[hour + ':00'] = (hours[hour + ':00'] || 0) + 1;
    }
    if (a.customerUid && !String(a.customerUid).startsWith('usr_manual_')) visitsByCustomer[a.customerUid] = (visitsByCustomer[a.customerUid] || 0) + 1;
  }
  const customers = Object.values(visitsByCustomer);
  const last30Summary = periodSummary(last30);
  return {
    scope: 'salon',
    salonName: String(business?.name || 'Salon').slice(0, 80),
    today,
    currency: 'TL',
    todaySummary: periodSummary(all.filter(a => a.date === today)),
    last7Days: periodSummary(since(7)),
    last30Days: { ...last30Summary, cancelRatePct: pct(last30Summary.cancelled, last30Summary.appointments), noShowRatePct: pct(last30Summary.noShow, last30Summary.appointments) },
    previous30Days: periodSummary(prev30),
    next7DaysBooked: upcoming.length,
    pendingApproval: all.filter(a => a.status === 'pending' && a.date >= today).length,
    topServicesByCount: top(services),
    topServicesByRevenueTL: top(serviceRevenue),
    staffLoad: top(staffLoad, 10),
    busiestWeekdays: top(weekdays, 3),
    busiestHours: top(hours, 3),
    customers30Days: { distinct: customers.length, returning: customers.filter(n => n > 1).length },
    onlineVsManual: { online: last30.filter(a => !a.isManual).length, manual: last30.filter(a => a.isManual).length },
    activeServices: Object.values(business?.services || {}).filter(s => s && s.active !== false).length,
    activeStaff: Object.values(business?.staff || {}).filter(s => s && s.active !== false).length,
    onlineBookingOpen: business?.bookingEnabled !== false
  };
}

export function computePlatformMetrics({ businesses, users, appointments, applications }, today) {
  const salons = Object.values(businesses || {}).filter(b => b && typeof b === 'object');
  const accounts = Object.values(users || {}).filter(u => u && typeof u === 'object');
  const all = Object.values(appointments || {}).filter(a => a && typeof a.date === 'string');
  const last30 = all.filter(a => a.date >= shiftDate(today, -29) && a.date <= today);
  const roles = {}, cities = {}, activeSalonIds = new Set();
  for (const u of accounts) { const role = ['owner', 'super_admin', 'customer', 'barber', 'manager', 'receptionist'].includes(u.role) ? u.role : 'customer'; roles[role] = (roles[role] || 0) + 1; }
  for (const b of salons) if (b.status !== 'suspended' && b.city) { const city = String(b.city).trim().toLocaleLowerCase('tr-TR'); cities[city] = (cities[city] || 0) + 1; }
  for (const a of last30) if (a.businessId) activeSalonIds.add(a.businessId);
  const apps = Object.values(applications || {}).filter(Boolean);
  return {
    scope: 'platform',
    today,
    currency: 'TL',
    salons: {
      total: salons.length,
      active: salons.filter(b => b.status === 'active').length,
      suspended: salons.filter(b => b.status === 'suspended').length,
      hiddenFromDiscovery: salons.filter(b => b.discoveryEnabled === false || b.hiddenFromDiscovery === true).length,
      withBookingsLast30Days: activeSalonIds.size,
      premium: salons.filter(b => String(b.plan || '').toUpperCase() === 'PREMIUM').length
    },
    applications: { pending: apps.filter(a => a.status === 'pending').length, approved: apps.filter(a => a.status === 'approved').length, rejected: apps.filter(a => a.status === 'rejected').length },
    usersByRole: roles,
    topCities: top(cities, 5),
    appointments: { today: periodSummary(all.filter(a => a.date === today)), last7Days: periodSummary(all.filter(a => a.date >= shiftDate(today, -6) && a.date <= today)), last30Days: periodSummary(last30) }
  };
}
