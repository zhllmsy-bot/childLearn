import { afterEach, describe, expect, it, vi } from 'vitest';
import { executeAiAction, proxyTelemetry } from './childlearnServer';

describe('childlearnServer', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('gracefully degrades question generation when AI is unconfigured', async () => {
    const result = await executeAiAction('question', {
      difficulty: 2,
      lane: 'current',
      serial: 1,
      variant: 'matching',
    });

    expect(result).toMatchObject({
      status: 200,
      body: {
        question: null,
        reason: 'ai_unconfigured',
      },
    });
  });

  it('treats telemetry as a no-op when no upstream is configured', async () => {
    const result = await proxyTelemetry({
      name: 'question.show',
      payload: { questionId: 'q-1' },
    });

    expect(result).toMatchObject({
      status: 200,
      body: {
        ok: true,
        mode: 'noop',
      },
    });
  });

  it('forwards telemetry when an upstream is configured', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('', { status: 202 }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await proxyTelemetry(
      {
        name: 'question.answer',
        payload: { correct: true },
      },
      {
        env: {
          CHILDLEARN_TELEMETRY_UPSTREAM_URL: 'https://example.com/track',
        },
      },
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.com/track',
      expect.objectContaining({
        body: JSON.stringify({
          name: 'question.answer',
          payload: { correct: true },
        }),
        method: 'POST',
      }),
    );
    expect(result).toMatchObject({
      status: 200,
      body: {
        forwarded: true,
        ok: true,
        upstreamStatus: 202,
      },
    });
  });
});
