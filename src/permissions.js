/* EZO STİLE v2 - Security & Permission Engine */
import { CONFIG } from './config.js';

export const PERMISSIONS = {
  SUPER_ADMIN_MANAGE: 'super_admin.manage',
  BUSINESS_MANAGE: 'business.manage',
  STAFF_MANAGE: 'staff.manage',
  SCHEDULE_MANAGE: 'schedule.manage',
  SERVICES_MANAGE: 'services.manage',
  FINANCE_VIEW: 'finance.view',
  APPOINTMENTS_MANAGE: 'appointments.manage',
  APPOINTMENTS_VIEW: 'appointments.view',
  CUSTOMER_BOOK: 'customer.book'
};

export function getRoleRank(role) {
  const idx = CONFIG.ROLE_HIERARCHY.indexOf(role);
  return idx !== -1 ? idx : 99;
}

export function hasPermission(user, requiredPerm) {
  if (!user || !user.role) return false;
  const role = user.role;

  if (role === 'super_admin') return true;

  if (role === 'owner') {
    return requiredPerm !== PERMISSIONS.SUPER_ADMIN_MANAGE;
  }

  if (role === 'manager') {
    const userPerms = user.permissions || {};
    return Boolean(userPerms[requiredPerm] || userPerms[requiredPerm.replace('.', '_')]);
  }

  if (role === 'barber' || role === 'receptionist') {
    return requiredPerm === PERMISSIONS.APPOINTMENTS_VIEW ||
           requiredPerm === PERMISSIONS.APPOINTMENTS_MANAGE ||
           requiredPerm === PERMISSIONS.SCHEDULE_MANAGE;
  }

  if (role === 'customer') {
    return requiredPerm === PERMISSIONS.CUSTOMER_BOOK;
  }

  return false;
}

export function canAccessStaffRevenueAnalytics(biz) {
  if (!biz) return false;
  return biz.plan === 'PREMIUM' || 
         biz.premiumSource === 'super_admin_grant' || 
         (biz.subscription && biz.subscription.plan === 'PREMIUM' && biz.subscription.status === 'active');
}

export function canStaffAccessOwnCustomers(user, biz) {
  if (!user) return false;
  if (user.role === 'owner' || user.role === 'super_admin' || user.role === 'receptionist') return true;
  if (user.role === 'barber') {
    // Owner override takes precedence
    if (biz && biz.allowStaffCustomerAccess === false) return false;
    // Requires Staff Premium entitlement
    return Boolean(user.staffPremium);
  }
  return false;
}