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

  it('gracefully degrades cross-ten generation when AI is unconfigured', async () => {
    const result = await executeAiAction('cross-ten-question', {
      difficulty: 5,
      lane: 'current',
      serial: 2,
      variant: 'makeTen',
    });

    expect(result).toMatchObject({
      status: 200,
      body: {
        question: null,
        confidence: 0,
        estimatedTheta: null,
        reason: 'ai_unconfigured',
      },
    });
  });

  it('gracefully degrades cross-ten hint generation when AI is unconfigured', async () => {
    const result = await executeAiAction('cross-ten-hint', {
      expression: '6 + 7 = ?',
      prompt: '先把它凑到10吧。',
      reasoningMode: 'multiStep',
      stepStem: '7 可以拆成几和几，让 6 先到 10？',
      wrongChoice: '5 和 2',
    });

    expect(result).toMatchObject({
      status: 200,
      body: {
        hint: null,
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

  it('gracefully degrades cold-start probe when AI is unconfigured', async () => {
    const result = await executeAiAction('cold-start-probe', {
      ageMonths: 60,
      probeIndex: 1,
      remainingProbes: 5,
      attemptHistory: [],
    });

    expect(result).toMatchObject({
      status: 200,
      body: {
        question: null,
        confidence: 0,
        estimatedTheta: null,
        reason: 'ai_unconfigured',
      },
    });
  });

  it('accepts nested question payloads with confidence metadata', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  confidence: 0.82,
                  question: {
                    variant: 'makeTen',
                    level: 3,
                    factId: 'llm-make-ten',
                    prompt: '小猫还差几个才到10？',
                    expression: '7 + ? = 10',
                    answer: 3,
                    options: [2, 3, 4, 5],
                    objects: ['🍓', '🍓', '🍓'],
                    barModel: [7, 3],
                    scaffoldText: '先想到10，还差几个。',
                    principleText: '凑到10会更快。',
                    estimatedTheta: 1.15,
                    theme: {
                      emoji: '🍓',
                      colorHint: 'pink',
                    },
                  },
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
      'question',
      {
        difficulty: 5,
        lane: 'current',
        serial: 2,
        variant: 'makeTen',
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
        confidence: 0.82,
        estimatedTheta: 1.15,
        question: {
          variant: 'makeTen',
          prompt: '小猫还差几个才到10？',
          expression: '7 + ? = 10',
          answer: 3,
          source: 'llm',
        },
      },
    });
  });

  it('accepts validated cross-ten multi-step payloads', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  confidence: 0.88,
                  question: {
                    variant: 'makeTen',
                    level: 4,
                    factId: 'llm-cross-ten',
                    prompt: '先把它凑到10吧。',
                    expression: '6 + 7 = ?',
                    answer: 13,
                    options: [12, 13, 14, 15],
                    objects: ['🍓', '🍓', '🍓', '🍓', '🍓', '🍓', '🍓', '🍓', '🍓', '🍓', '🍓', '🍓', '🍓'],
                    barModel: [6, 7],
                    scaffoldText: '先找离10还差几。',
                    principleText: '拆一拆，先凑10，再合起来。',
                    estimatedTheta: 1.45,
                    theme: {
                      emoji: '🍓',
                      colorHint: 'pink',
                    },
                    reasoning: {
                      kind: 'multiStep',
                      strategy: 'makeTen',
                      narrative: '把7拆成4和3，6加4先到10，再加3。',
                      steps: [
                        {
                          stepId: 'split',
                          stem: '7 可以拆成几和几，让 6 先到 10？',
                          choices: [
                            { label: '3 和 4', value: 3 },
                            { label: '4 和 3', value: 4 },
                            { label: '5 和 2', value: 5 },
                            { label: '2 和 5', value: 2 },
                          ],
                          correctIndex: 1,
                          stepSkillKey: 'decomposition',
                          hintOnWrong: '6 还差 4 才到 10 哦。',
                        },
                        {
                          stepId: 'make-ten',
                          stem: '6 + 4 = ?',
                          choices: [9, 10, 11, 8],
                          correctIndex: 1,
                          stepSkillKey: 'makeTen',
                          hintOnWrong: '先把 6 凑到 10。',
                        },
                        {
                          stepId: 'combine',
                          stem: '10 + 3 = ?',
                          choices: [12, 13, 14, 11],
                          correctIndex: 1,
                          stepSkillKey: 'crossTenBridge',
                          hintOnWrong: '10 再加上剩下的 3。',
                        },
                      ],
                    },
                  },
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
      'cross-ten-question',
      {
        difficulty: 5,
        lane: 'current',
        serial: 2,
        target: {
          skillKey: 'crossTenBridge',
          targetTheta: 1.4,
        },
        constraints: {
          variant: 'makeTen',
          reasoningMode: 'multiStep',
        },
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
        confidence: 0.88,
        estimatedTheta: 1.45,
        question: {
          expression: '6 + 7 = ?',
          answer: 13,
          reasoning: {
            kind: 'multiStep',
            strategy: 'makeTen',
          },
        },
      },
    });
  });

  it('accepts validated cross-ten narration payloads with multiple good answers', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  confidence: 0.79,
                  question: {
                    variant: 'makeTen',
                    level: 4,
                    factId: 'llm-cross-ten-narration',
                    prompt: '8 + 5 算完了，你是怎么想的？',
                    expression: '8 + 5 = 13',
                    answer: 1,
                    options: [
                      { label: '把 5 拆成 2 和 3，8 + 2 先到 10', value: 1 },
                      { label: '从 8 接着数 5 下，也能到 13', value: 2 },
                      { label: '从 1 开始一直数到 13', value: 3 },
                      { label: '我只是随便猜的', value: 4 },
                    ],
                    objects: ['🍓', '🍓', '🍓', '🍓', '🍓', '🍓', '🍓', '🍓', '🍓', '🍓', '🍓', '🍓', '🍓'],
                    barModel: [8, 5],
                    scaffoldText: '想一想，是不是先把 8 凑到 10。',
                    principleText: '会说出自己的想法，就更会算了。',
                    estimatedTheta: 1.62,
                    theme: {
                      emoji: '🍓',
                      colorHint: 'pink',
                    },
                    reasoning: {
                      kind: 'narration',
                      strategy: 'makeTen',
                      narrative: '把 5 拆成 2 和 3，8 加 2 先到 10，再加 3。',
                      acceptedOptionValues: [1, 2],
                    },
                  },
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
      'cross-ten-question',
      {
        difficulty: 6,
        lane: 'challenge',
        serial: 5,
        target: {
          skillKey: 'crossTenBridge',
          targetTheta: 1.6,
        },
        constraints: {
          variant: 'makeTen',
          reasoningMode: 'narration',
        },
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
        confidence: 0.79,
        estimatedTheta: 1.62,
        question: {
          expression: '8 + 5 = 13',
          reasoning: {
            kind: 'narration',
            strategy: 'makeTen',
            acceptedOptionValues: [1, 2],
          },
        },
      },
    });
  });

  it('accepts validated cross-ten hints', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  hint: '6 还差 4 才到 10 哦。',
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
      'cross-ten-hint',
      {
        expression: '6 + 7 = ?',
        prompt: '先把它凑到10吧。',
        reasoningMode: 'multiStep',
        stepStem: '7 可以拆成几和几，让 6 先到 10？',
        wrongChoice: '5 和 2',
        correctChoice: '4 和 3',
        targetNarrative: '把 7 拆成 4 和 3，6 加 4 先到 10。',
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
        hint: '6 还差 4 才到 10 哦。',
      },
    });
  });

  it('normalizes cold-start assessments into a full baseline profile', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  schemaVersion: 'childlearn.cold-start-baseline.v1',
                  confidence: 0.74,
                  baselineTheta: {
                    countingTo10: 0.8,
                    compareWithin10: 0.6,
                    addWithin10: 0.7,
                    makeTen: 1.1,
                  },
                  recommendedDifficulty: 6,
                  nextSkill: 'makeTen',
                  notes: ['probe converged'],
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
      'cold-start-assess',
      {
        ageMonths: 60,
        attemptHistory: [],
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
        schemaVersion: 'childlearn.cold-start-baseline.v1',
        confidence: 0.74,
        recommendedDifficulty: 6,
        nextSkill: 'makeTen',
      },
    });
    expect((result.body as { baselineTheta: Record<string, number> }).baselineTheta.makeTen).toBe(1.1);
    expect(
      Object.keys((result.body as { baselineTheta: Record<string, number> }).baselineTheta),
    ).toHaveLength(18);
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
