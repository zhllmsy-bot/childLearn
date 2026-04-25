import { resolveRuntimeUrl } from '../network/runtimeUrl';
import { createTrackingContext, type TrackingContext } from './context';

export type TrackingPayload = Record<
  string,
  string | number | boolean | null | undefined
>;

export interface TrackingDetail extends TrackingContext {
  name: string;
  payload: TrackingPayload;
}

const CONFIGURED_TELEMETRY_URL = import.meta.env.VITE_TELEMETRY_URL?.trim();
const TELEMETRY_QUEUE_STORAGE_KEY = 'childlearn.telemetry-queue-v1';
const MAX_QUEUED_EVENTS = 200;
let flushListenersInstalled = false;

export function createTrackingDetail(
  name: string,
  payload: TrackingPayload = {},
  now = Date.now(),
): TrackingDetail {
  return {
    ...createTrackingContext(now),
    name,
    payload,
  };
}

function getTelemetryUrl() {
  return resolveRuntimeUrl(CONFIGURED_TELEMETRY_URL);
}

function readQueuedTelemetry(): TrackingDetail[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(TELEMETRY_QUEUE_STORAGE_KEY) ?? '[]',
    ) as TrackingDetail[];
    return Array.isArray(parsed) ? parsed.slice(-MAX_QUEUED_EVENTS) : [];
  } catch {
    return [];
  }
}

function writeQueuedTelemetry(events: TrackingDetail[]) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(
    TELEMETRY_QUEUE_STORAGE_KEY,
    JSON.stringify(events.slice(-MAX_QUEUED_EVENTS)),
  );
}

function enqueueTelemetry(detail: TrackingDetail) {
  writeQueuedTelemetry([...readQueuedTelemetry(), detail]);
}

async function postTrackingDetail(telemetryUrl: string, detail: TrackingDetail) {
  const response = await fetch(telemetryUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(detail),
    keepalive: true,
  });

  if (!response.ok) {
    throw new Error(`telemetry failed: ${response.status}`);
  }
}

export function flushQueuedTelemetry() {
  const telemetryUrl = getTelemetryUrl();
  if (!telemetryUrl || typeof fetch !== 'function') {
    return;
  }

  const queued = readQueuedTelemetry();
  if (queued.length === 0) {
    return;
  }

  writeQueuedTelemetry([]);
  void Promise.all(queued.map((detail) => postTrackingDetail(telemetryUrl, detail))).catch(
    () => {
      writeQueuedTelemetry([...readQueuedTelemetry(), ...queued].slice(-MAX_QUEUED_EVENTS));
    },
  );
}

function installTelemetryFlushListeners() {
  if (
    flushListenersInstalled ||
    typeof window === 'undefined' ||
    typeof document === 'undefined'
  ) {
    return;
  }

  flushListenersInstalled = true;
  window.addEventListener('online', flushQueuedTelemetry);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushQueuedTelemetry();
    }
  });
}

export function track(name: string, payload: TrackingPayload = {}) {
  const detail = createTrackingDetail(name, payload);
  installTelemetryFlushListeners();

  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    const event = new CustomEvent('childlearn:track', {
      detail,
    });
    window.dispatchEvent(event);
  }

  const telemetryUrl = getTelemetryUrl();
  if (telemetryUrl && typeof fetch === 'function') {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      enqueueTelemetry(detail);
      return;
    }

    void postTrackingDetail(telemetryUrl, detail)
      .then(flushQueuedTelemetry)
      .catch(() => {
        enqueueTelemetry(detail);
      });
  }
}
