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

  it('gracefully degrades story polish when AI is unconfigured', async () => {
    const result = await executeAiAction('story-polish', {
      answer: 7,
      currentPrompt: '小熊有 3 个饼干，朋友又送来 4 个，现在有几个饼干？',
      expression: '3 + 4 = ?',
      first: 3,
      second: 4,
    });

    expect(result).toMatchObject({
      status: 200,
      body: {
        prompt: null,
        reason: 'ai_unconfigured',
      },
    });
  });

  it('accepts validated story polish prompts that preserve the math skeleton', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  prompt: '小熊装了 3 个饼干，妈妈又放来 4 个，现在有几个饼干？',
                }),
              },
            },
          ],
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await executeAiAction(
      'story-polish',
      {
        answer: 7,
        currentPrompt: '小熊有 3 个饼干，朋友又送来 4 个，现在有几个饼干？',
        expression: '3 + 4 = ?',
        first: 3,
        second: 4,
      },
      {
        env: {
          CHILDLEARN_AI_API_KEY: 'test-key',
        },
      },
    );

    expect(result).toMatchObject({
      status: 200,
      body: {
        prompt: '小熊装了 3 个饼干，妈妈又放来 4 个，现在有几个饼干？',
      },
    });
  });

  it('rejects story polish prompts that sneak in extra numbers', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  prompt: '小猫拿了 3 个气球，朋友又送来 5 个，一共有 8 个吗？',
                }),
              },
            },
          ],
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await executeAiAction(
      'story-polish',
      {
        answer: 8,
        currentPrompt: '小猫有 3 个气球，朋友又送来 5 个，现在有几个气球？',
        expression: '3 + 5 = ?',
        first: 3,
        second: 5,
      },
      {
        env: {
          CHILDLEARN_AI_API_KEY: 'test-key',
        },
      },
    );

    expect(result).toMatchObject({
      status: 502,
      body: {
        error: 'invalid_story_polish_payload',
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
