// Read-only projection of the owner's already authorized appointment response.
// Never fetch global users/customers or infer identity from a name or phone.
export function buildOwnerCustomers(appointments, businessId, today) {
  if (!businessId) return [];
  const groups = new Map();
  const seen = new Set();
  for (const appointment of appointments || []) {
    if (!appointment || appointment.businessId !== businessId) continue;
    const id = appointment.aptId || appointment.appointmentId;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const key = appointment.customerUid ? `uid:${appointment.customerUid}` : `appointment:${id}`;
    if (!groups.has(key)) groups.set(key, { key, appointments: [] });
    groups.get(key).appointments.push(appointment);
  }
  return [...groups.values()].map(group => {
    const rows = group.appointments.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')) || String(b.time || '').localeCompare(String(a.time || '')));
    const latestSnapshot = [...rows].sort((a,b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))[0];
    const past = rows.filter(row => row.date && row.date <= today);
    return { ...group, name: String(latestSnapshot.customerNameSnapshot || latestSnapshot.customerName || ''),
      phone: String(latestSnapshot.customerPhoneSnapshot || latestSnapshot.customerPhone || ''),
      count: rows.length, completed: rows.filter(row => row.status === 'completed').length,
      lastDate: past[0]?.date || '', appointments: rows };
  }).sort((a, b) => b.lastDate.localeCompare(a.lastDate) || a.name.localeCompare(b.name));
}

export function filterOwnerCustomers(customers, query, language = 'tr') {
  const normalized = String(query || '').trim().toLocaleLowerCase(language);
  const digits = normalized.replace(/\D/g, '');
  return customers.filter(customer => !normalized || customer.name.toLocaleLowerCase(language).includes(normalized) ||
    customer.phone.toLocaleLowerCase(language).includes(normalized) || (digits.length > 0 && /^[\d\s+()\-]+$/.test(normalized) && customer.phone.replace(/\D/g, '').includes(digits)));
}
