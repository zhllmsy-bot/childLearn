import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTrackingDetail, flushQueuedTelemetry, track } from './track';

const TELEMETRY_QUEUE_STORAGE_KEY = 'childlearn.telemetry-queue-v1';

class MemoryStorage implements Storage {
  private values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  clear() {
    this.values.clear();
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  key(index: number) {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

describe('createTrackingDetail', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('adds stable learning context to every telemetry event', () => {
    vi.stubGlobal('window', {
      localStorage: new MemoryStorage(),
      sessionStorage: new MemoryStorage(),
    });

    const first = createTrackingDetail('question.show', { questionId: 'q-1' }, 1000);
    const second = createTrackingDetail('question.answer', { correct: true }, 1500);

    expect(first).toMatchObject({
      schemaVersion: 'childlearn.telemetry.v2',
      name: 'question.show',
      at: 1000,
      payload: { questionId: 'q-1' },
    });
    expect(first.eventId).toMatch(/^evt-/);
    expect(second.eventId).toMatch(/^evt-/);
    expect(second.eventId).not.toBe(first.eventId);
    expect(second.sessionId).toBe(first.sessionId);
    expect(second.childId).toBe(first.childId);
    expect(second.deviceId).toBe(first.deviceId);
  });

  it('queues offline events with retry metadata', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000);
    const localStorage = new MemoryStorage();

    vi.stubGlobal('window', {
      localStorage,
      sessionStorage: new MemoryStorage(),
      dispatchEvent: vi.fn(),
      addEventListener: vi.fn(),
    });
    vi.stubGlobal('document', {
      addEventListener: vi.fn(),
      visibilityState: 'visible',
    });
    vi.stubGlobal('navigator', { onLine: false });
    vi.stubGlobal(
      'CustomEvent',
      class CustomEventStub {
        type: string;
        detail: unknown;

        constructor(type: string, init?: { detail?: unknown }) {
          this.type = type;
          this.detail = init?.detail;
        }
      },
    );

    track('question.answer', { correct: true });

    const queue = JSON.parse(
      localStorage.getItem(TELEMETRY_QUEUE_STORAGE_KEY) ?? '[]',
    ) as { failedAttempts: number; nextRetryAt: number }[];

    expect(queue).toHaveLength(1);
    expect(queue[0]).toMatchObject({
      failedAttempts: 0,
      nextRetryAt: 6_000,
    });
  });

  it('increments failure count when a queued flush fails', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(10_000);
    const localStorage = new MemoryStorage();
    const detail = createTrackingDetail('question.answer', { correct: false }, 1_000);

    localStorage.setItem(
      TELEMETRY_QUEUE_STORAGE_KEY,
      JSON.stringify([
        {
          detail,
          failedAttempts: 1,
          nextRetryAt: 1,
        },
      ]),
    );
    vi.stubGlobal('window', {
      localStorage,
      sessionStorage: new MemoryStorage(),
    });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('server down')));

    flushQueuedTelemetry();

    await vi.waitFor(() => {
      const queue = JSON.parse(
        localStorage.getItem(TELEMETRY_QUEUE_STORAGE_KEY) ?? '[]',
      ) as { failedAttempts: number; nextRetryAt: number }[];

      expect(queue).toHaveLength(1);
      expect(queue[0].failedAttempts).toBe(2);
      expect(queue[0].nextRetryAt).toBeGreaterThan(10_000);
    });
  });
});
