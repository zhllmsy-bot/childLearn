const TELEMETRY_SCHEMA_VERSION = 'childlearn.telemetry.v2';
const SESSION_ID_STORAGE_KEY = 'childlearn.telemetry-session-id';
const CHILD_ID_STORAGE_KEY = 'childlearn.child-id';
const DEVICE_ID_STORAGE_KEY = 'childlearn.device-id';
const CONFIGURED_CHILD_ID = import.meta.env.VITE_LEARNING_CHILD_ID?.trim();

export interface TrackingContext {
  schemaVersion: typeof TELEMETRY_SCHEMA_VERSION;
  eventId: string;
  sessionId: string;
  childId: string;
  deviceId: string;
  at: number;
}

function isBrowser() {
  return typeof window !== 'undefined';
}

function createLocalId(prefix: string) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function getStorageId(
  storage: Storage | undefined,
  key: string,
  prefix: string,
  configuredValue?: string,
) {
  if (!storage) {
    return configuredValue || `${prefix}-local`;
  }

  if (configuredValue) {
    storage.setItem(key, configuredValue);
    return configuredValue;
  }

  const existing = storage.getItem(key);
  if (existing) {
    return existing;
  }

  const next = createLocalId(prefix);
  storage.setItem(key, next);
  return next;
}

export function createTrackingContext(now = Date.now()): TrackingContext {
  const localStorage = isBrowser() ? window.localStorage : undefined;
  const sessionStorage = isBrowser() ? window.sessionStorage : undefined;

  return {
    schemaVersion: TELEMETRY_SCHEMA_VERSION,
    eventId: createLocalId('evt'),
    sessionId: getStorageId(sessionStorage, SESSION_ID_STORAGE_KEY, 'session'),
    childId: getStorageId(
      localStorage,
      CHILD_ID_STORAGE_KEY,
      'child',
      CONFIGURED_CHILD_ID,
    ),
    deviceId: getStorageId(localStorage, DEVICE_ID_STORAGE_KEY, 'device'),
    at: now,
  };
}
