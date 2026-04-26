import { describe, expect, it } from 'vitest';
import { createEmptyLearnerProfile } from '../../ai/learnerModel';
import { blendBatchMix, composeFlowPlan } from './flowComposer';
import type { ApprovedFlowPolicy, LlmLearningObservation } from './types';

const LOCAL_POLICY: ApprovedFlowPolicy = {
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
  rationale: 'Keep the rhythm.',
};

const OBSERVATION: LlmLearningObservation = {
  overallState: 'stretch',
  confidence: 0.82,
  stateReason: 'Child can recover with support.',
  primaryIssue: 'cognitive_load',
  masteredSkills: [],
  weakSkills: [],
  riskSignals: [],
  doNotInfer: [],
  recommendation: {
    direction: 'maintain_with_support',
    adjustmentDimension: 'visual_support',
    suggestedMix: {
      confidence: 3,
      review: 2,
      current: 4,
      challenge: 1,
    },
    avoid: [],
  },
  uxSuggestions: [],
  nextItemSuggestion: {
    reason: 'Stay near make-ten but reduce jump size.',
    targetSkillKey: 'makeTen',
    targetTheta: -0.3,
    variant: 'makeTen',
  },
};

describe('flowComposer', () => {
  it('blends local and observer mixes while preserving batch size', () => {
    const mix = blendBatchMix(
      LOCAL_POLICY.mix,
      OBSERVATION.recommendation.suggestedMix,
      0.7,
      LOCAL_POLICY.batchSize,
    );

    expect(mix.confidence).toBeGreaterThan(LOCAL_POLICY.mix.confidence);
    expect(mix.challenge).toBeLessThan(LOCAL_POLICY.mix.challenge);
    expect(mix.confidence + mix.review + mix.current + mix.challenge).toBe(10);
  });

  it('composes a full batch plan and lets observer guidance bias the first slot', () => {
    const learnerProfile = createEmptyLearnerProfile();
    const localPlan = composeFlowPlan({
      learnerProfile,
      policy: LOCAL_POLICY,
      fallbackDifficulty: 4,
      serialStart: 0,
    });
    const blendedPlan = composeFlowPlan({
      learnerProfile,
      policy: LOCAL_POLICY,
      observation: OBSERVATION,
      fallbackDifficulty: 4,
      serialStart: 0,
    });

    expect(blendedPlan.plans).toHaveLength(10);
    expect(blendedPlan.plans[0]?.difficulty).toBeLessThanOrEqual(localPlan.plans[0]?.difficulty ?? 10);
    expect(blendedPlan.plans[0]?.targetSkillKey).toBe('makeTen');
  });
});
