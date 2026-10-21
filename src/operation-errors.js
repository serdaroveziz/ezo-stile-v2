import { t } from './config.js';
const sessionCodes = new Set(['AUTH_SESSION_INVALID','auth/user-token-expired','auth/invalid-user-token','auth/user-disabled','auth/id-token-expired','auth/id-token-revoked']);
export function isInvalidSession(error) { return sessionCodes.has(error?.code); }
export function operationErrorMessage(error) {
  const value = String(error?.code || error?.message || error || '');
  const keys = { OWNER_TRANSFER_REQUIRED:'ownerTransferRequired', SELF_DELETE_DENIED:'superAdminDeleteOwnAccountDenied', SUPER_ADMIN_DELETE_DENIED:'superAdminDeleteDenied', AUTH_SESSION_INVALID:'sessionExpired' };
  if (keys[value]) return t(keys[value]);
  if (isInvalidSession(error)) return t('sessionExpired');
  if (!value || /^[A-Z][A-Z0-9_]+$/.test(value) || /^(Firebase:|auth\/)|fetch|network|timeout|internal server|failed to/i.test(value)) return t('operationRetry');
  return value;
}
