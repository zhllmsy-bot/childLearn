import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTrackingDetail } from './track';

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
    vi.unstubAllGlobals();
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
});
