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
const BASE_RETRY_DELAY_MS = 5_000;
const MAX_RETRY_DELAY_MS = 5 * 60_000;
let flushListenersInstalled = false;

interface QueuedTelemetryEvent {
  detail: TrackingDetail;
  failedAttempts: number;
  nextRetryAt: number;
}

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

function normalizeQueuedTelemetryEvent(value: unknown): QueuedTelemetryEvent | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const maybeQueued = value as Partial<QueuedTelemetryEvent>;
  const detail = 'detail' in maybeQueued ? maybeQueued.detail : (value as TrackingDetail);

  if (!detail || typeof detail !== 'object' || typeof detail.name !== 'string') {
    return null;
  }

  return {
    detail: detail as TrackingDetail,
    failedAttempts: Math.max(0, Math.round(Number(maybeQueued.failedAttempts ?? 0))),
    nextRetryAt: Math.max(0, Math.round(Number(maybeQueued.nextRetryAt ?? 0))),
  };
}

function readQueuedTelemetry(): QueuedTelemetryEvent[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(TELEMETRY_QUEUE_STORAGE_KEY) ?? '[]',
    ) as unknown[];
    return Array.isArray(parsed)
      ? parsed
          .map(normalizeQueuedTelemetryEvent)
          .filter((event): event is QueuedTelemetryEvent => Boolean(event))
          .slice(-MAX_QUEUED_EVENTS)
      : [];
  } catch {
    return [];
  }
}

function writeQueuedTelemetry(events: QueuedTelemetryEvent[]) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(
    TELEMETRY_QUEUE_STORAGE_KEY,
    JSON.stringify(events.slice(-MAX_QUEUED_EVENTS)),
  );
}

function retryDelayFor(failedAttempts: number) {
  return Math.min(BASE_RETRY_DELAY_MS * 2 ** Math.max(failedAttempts - 1, 0), MAX_RETRY_DELAY_MS);
}

function enqueueTelemetry(detail: TrackingDetail, failedAttempts = 0) {
  writeQueuedTelemetry([
    ...readQueuedTelemetry(),
    {
      detail,
      failedAttempts,
      nextRetryAt: Date.now() + retryDelayFor(failedAttempts),
    },
  ]);
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

  const now = Date.now();
  const due = queued.filter((event) => event.nextRetryAt <= now);
  const waiting = queued.filter((event) => event.nextRetryAt > now);
  if (due.length === 0) {
    return;
  }

  writeQueuedTelemetry(waiting);
  void Promise.allSettled(
    due.map((event) => postTrackingDetail(telemetryUrl, event.detail)),
  ).then((results) => {
    const failed = due
      .filter((_, index) => results[index]?.status === 'rejected')
      .map((event) => ({
        detail: event.detail,
        failedAttempts: event.failedAttempts + 1,
        nextRetryAt: Date.now() + retryDelayFor(event.failedAttempts + 1),
      }));

    if (failed.length > 0) {
      writeQueuedTelemetry([...readQueuedTelemetry(), ...failed].slice(-MAX_QUEUED_EVENTS));
    }
  });
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
