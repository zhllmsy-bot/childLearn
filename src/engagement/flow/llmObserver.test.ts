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
