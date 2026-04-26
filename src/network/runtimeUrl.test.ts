import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveChildlearnEndpoint } from './runtimeUrl';

describe('resolveChildlearnEndpoint', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('falls back to same-origin routes for legacy 8792 bridge endpoints', () => {
    vi.stubGlobal('window', {
      location: {
        hostname: 'localhost',
        origin: 'http://localhost:5173',
      },
    });

    expect(
      resolveChildlearnEndpoint({
        configuredUrl: 'http://127.0.0.1:8792/observe',
        fallbackUrl: '/api/ai?action=observe',
        legacyPaths: ['/observe'],
      }),
    ).toBe('/api/ai?action=observe');

    expect(
      resolveChildlearnEndpoint({
        configuredUrl: 'http://127.0.0.1:8792/sync/child-state',
        fallbackUrl: '/api/learning-sync',
        legacyPaths: ['/sync/child-state'],
      }),
    ).toBe('/api/learning-sync');

    expect(
      resolveChildlearnEndpoint({
        configuredUrl: 'http://127.0.0.1:8792/track',
        fallbackUrl: '/api/telemetry',
        legacyPaths: ['/track'],
      }),
    ).toBe('/api/telemetry');
  });

  it('preserves non-legacy local services', () => {
    vi.stubGlobal('window', {
      location: {
        hostname: 'localhost',
        origin: 'http://localhost:5173',
      },
    });

    expect(
      resolveChildlearnEndpoint({
        configuredUrl: 'http://127.0.0.1:8793/synthesize',
        fallbackUrl: '/api/telemetry',
        legacyPaths: ['/track'],
      }),
    ).toBe('http://127.0.0.1:8793/synthesize');
  });
});
