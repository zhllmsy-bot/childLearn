import { describe, expect, it } from 'vitest';
import { parseLlmLearningObservation } from './llmObserver';

const VALID_OBSERVATION = {
  overallState: 'stretch',
  confidence: 0.78,
  stateReason: 'Recoverable misses with high hint effectiveness.',
  primaryIssue: 'cognitive_load',
  masteredSkills: [
    {
      label: 'within_10_visual_addition',
      evidenceStrength: 'medium',
      sampleCount: 4,
      reason: 'Fast first-try success.',
    },
  ],
  weakSkills: [],
  riskSignals: ['hint_rate_high'],
  doNotInfer: ['Do not downgrade long-term profile from one batch.'],
  recommendation: {
    direction: 'maintain_with_support',
    adjustmentDimension: 'visual_support',
    suggestedMix: {
      confidence: 2,
      review: 2,
      current: 4,
      challenge: 2,
    },
    avoid: ['consecutive high-load subtraction'],
  },
  uxSuggestions: ['Add visual support after first miss.'],
  profileRefinement: {
    schemaVersion: 'childlearn.profile-refinement.v1',
    confidence: 0.82,
    skillAdjustments: [
      {
        skillKey: 'makeTen',
        deltaTheta: -0.12,
        deltaConfidence: 0.04,
        reason: 'Recent make-ten prompts needed hints.',
        evidenceStrength: 'medium',
      },
    ],
    errorPatterns: [
      {
        type: 'conceptual',
        label: '凑十拆分不稳',
        skillKey: 'makeTen',
        evidenceQuestionIds: ['q1'],
      },
    ],
    nextSkill: {
      skillKey: 'makeTen',
      difficultyAdjustment: 0.3,
      reason: 'Keep challenge close to this skill.',
    },
    safetyNotes: [],
  },
};

describe('parseLlmLearningObservation', () => {
  it('accepts a complete observer response', () => {
    expect(parseLlmLearningObservation(VALID_OBSERVATION)).toMatchObject({
      overallState: 'stretch',
      confidence: 0.78,
      primaryIssue: 'cognitive_load',
      recommendation: {
        direction: 'maintain_with_support',
        adjustmentDimension: 'visual_support',
      },
      profileRefinement: {
        confidence: 0.82,
        nextSkill: {
          skillKey: 'makeTen',
        },
      },
    });
  });

  it('rejects invalid states and out-of-range confidence', () => {
    expect(
      parseLlmLearningObservation({
        ...VALID_OBSERVATION,
        overallState: 'decide_next_question',
      }),
    ).toBeNull();

    expect(
      parseLlmLearningObservation({
        ...VALID_OBSERVATION,
        confidence: 1.5,
      }),
    ).toBeNull();
  });

  it('rejects malformed recommendation mixes', () => {
    expect(
      parseLlmLearningObservation({
        ...VALID_OBSERVATION,
        recommendation: {
          ...VALID_OBSERVATION.recommendation,
          suggestedMix: {
            confidence: 2,
            review: -1,
            current: 4,
            challenge: 2,
          },
        },
      }),
    ).toBeNull();
  });
});
