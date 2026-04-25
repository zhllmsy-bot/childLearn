import { describe, expect, it } from 'vitest';
import { selectFlowQuestionPlan } from './questionSelector';
import type { ApprovedFlowPolicy } from './types';

const BASE_POLICY: ApprovedFlowPolicy = {
  finalState: 'flow',
  finalAction: 'maintain',
  nextDifficulty: 4,
  batchSize: 10,
  mix: {
    confidence: 1,
    review: 2,
    current: 5,
    challenge: 2,
  },
  adjustmentDimension: 'none',
  constraints: {
    maxLevelIncrease: 0,
    maxLevelDecrease: 0,
    maxSameOperationInRow: 2,
    maxChallengeInRow: 1,
    minConfidenceItemRatio: 0.2,
    adjustOnlyOneDimension: true,
    avoidTags: [],
    mustIncludeTags: [],
  },
  rationale: 'test policy',
};

describe('selectFlowQuestionPlan', () => {
  it('falls back to current difficulty when no policy exists', () => {
    expect(
      selectFlowQuestionPlan({
        policy: null,
        fallbackDifficulty: 3,
        serial: 0,
      }),
    ).toEqual({
      lane: 'current',
      difficulty: 3,
    });
  });

  it('turns policy mix into deterministic lanes', () => {
    const lanes = Array.from({ length: 10 }, (_, serial) =>
      selectFlowQuestionPlan({
        policy: BASE_POLICY,
        fallbackDifficulty: 3,
        serial,
      }),
    ).map((plan) => plan.lane);

    expect(lanes).toEqual([
      'confidence',
      'review',
      'review',
      'current',
      'current',
      'current',
      'current',
      'current',
      'challenge',
      'challenge',
    ]);
  });

  it('uses lower pressure for confidence and higher pressure for challenge', () => {
    expect(
      selectFlowQuestionPlan({
        policy: BASE_POLICY,
        fallbackDifficulty: 3,
        serial: 0,
      }).difficulty,
    ).toBe(3);

    expect(
      selectFlowQuestionPlan({
        policy: BASE_POLICY,
        fallbackDifficulty: 3,
        serial: 8,
      }).difficulty,
    ).toBe(5);
  });

  it('uses visual support variants for lower-pressure adaptive batches', () => {
    const supportPolicy: ApprovedFlowPolicy = {
      ...BASE_POLICY,
      mix: {
        confidence: 2,
        review: 2,
        current: 0,
        challenge: 0,
      },
    };
    const variants = Array.from({ length: 4 }, (_, serial) =>
      selectFlowQuestionPlan({
        policy: supportPolicy,
        fallbackDifficulty: 3,
        serial,
      }).variant,
    );

    expect(variants).toEqual(['matching', 'compare', 'matching', 'compare']);
    expect(variants).not.toContain('story');
    expect(variants).not.toContain('numberLine');
  });

  it('uses advanced variants for high-difficulty current lanes', () => {
    const highPolicy: ApprovedFlowPolicy = {
      ...BASE_POLICY,
      nextDifficulty: 10,
      mix: {
        confidence: 0,
        review: 0,
        current: 4,
        challenge: 0,
      },
    };
    const variants = Array.from({ length: 4 }, (_, serial) =>
      selectFlowQuestionPlan({
        policy: highPolicy,
        fallbackDifficulty: 10,
        serial,
      }).variant,
    );

    expect(variants).toEqual(['missing', 'story', 'numberLine', 'missing']);
    expect(variants).not.toContain('matching');
    expect(variants).not.toContain('makeTen');
    expect(variants).not.toContain('compare');
  });
});
