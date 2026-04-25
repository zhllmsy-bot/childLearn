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

export function track(name: string, payload: TrackingPayload = {}) {
  const detail = createTrackingDetail(name, payload);

  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    const event = new CustomEvent('childlearn:track', {
      detail,
    });
    window.dispatchEvent(event);
  }

  const telemetryUrl = resolveRuntimeUrl(CONFIGURED_TELEMETRY_URL);
  if (telemetryUrl && typeof fetch === 'function') {
    void fetch(telemetryUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(detail),
      keepalive: true,
    }).catch(() => {
      // Telemetry must never interrupt the child-facing flow.
    });
  }
}
