const PUSH_CONTEXT_KEY = 'ezo_pending_push_context';
const SAFE_TABS = new Set(['appointments', 'today', 'notifications', 'dashboard']);
const SAFE_VALUE = /^[A-Za-z0-9_-]{1,160}$/;

export function parsePushNavigation(search = '') {
  const params = new URLSearchParams(search);
  if (params.get('notification') !== '1') return null;
  const context = {};
  for (const key of ['appointmentId', 'businessId', 'targetSection']) {
    const value = params.get(key);
    if (value && SAFE_VALUE.test(value)) context[key] = value;
  }
  const targetTab = params.get('targetTab');
  if (targetTab && SAFE_TABS.has(targetTab)) context.targetTab = targetTab;
  return Object.keys(context).length ? context : { targetTab: 'notifications' };
}

export function savePushNavigation(search, storage = sessionStorage) {
  const context = parsePushNavigation(search);
  if (!context) return null;
  storage.setItem(PUSH_CONTEXT_KEY, JSON.stringify(context));
  return context;
}

export function takePushNavigation(storage = sessionStorage) {
  const raw = storage.getItem(PUSH_CONTEXT_KEY);
  if (!raw) return null;
  storage.removeItem(PUSH_CONTEXT_KEY);
  try {
    const value = JSON.parse(raw);
    const params = new URLSearchParams({ notification: '1' });
    for (const key of ['appointmentId', 'businessId', 'targetSection', 'targetTab']) {
      if (value && value[key] != null) params.set(key, value[key]);
    }
    return parsePushNavigation(params.toString());
  } catch {
    return null;
  }
}
