export const STAFF_ROLES = Object.freeze(['barber', 'receptionist', 'manager']);

export function routeForResolvedRole(role) {
  if (role === 'super_admin') return 'super_admin';
  if (role === 'owner') return 'owner';
  if (STAFF_ROLES.includes(role)) return 'staff';
  return 'customer';
}
