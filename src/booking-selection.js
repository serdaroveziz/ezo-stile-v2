// Shared service eligibility for all booking panels and the server.
function normalizedServiceToken(value) {
  return String(value == null ? '' : value).trim().toLocaleLowerCase('tr-TR');
}

export function serviceAliasesForBusiness(business, serviceId) {
  const requested = normalizedServiceToken(serviceId);
  const aliases = new Set([requested]);
  for (const [key, service] of Object.entries((business && business.services) || {})) {
    if (!service) continue;
    const candidates = [key, service.id, service.serviceId, service.name, service.title]
      .map(normalizedServiceToken).filter(Boolean);
    if (candidates.includes(requested)) candidates.forEach(value => aliases.add(value));
  }
  return aliases;
}

export function staffCanProvideService(staff, serviceId, business = null) {
  const aliases = business ? serviceAliasesForBusiness(business, serviceId) : new Set([normalizedServiceToken(serviceId)]);
  const rawServices = staff && staff.services;
  const services = Array.isArray(rawServices)
    ? rawServices
    : (rawServices && typeof rawServices === 'object'
      ? Object.entries(rawServices).filter(([, enabled]) => enabled !== false && enabled != null).map(([key]) => key)
      : ['all']);
  const normalized = services.map(normalizedServiceToken);
  return normalized.includes('all') || normalized.some(value => aliases.has(value));
}

