import type {
  ApprovedFlowPolicy,
  BatchMix,
  FlowState,
  LearningBatchReport,
  LlmLearningObservation,
} from './types';
import { llmConfidenceWeight } from '../../ai/llmConfidence';
import { blendBatchMix } from './flowComposer';

const DEFAULT_MIX_BY_STATE: Record<FlowState, BatchMix> = {
  easy: {
    confidence: 1,
    review: 2,
    current: 4,
    challenge: 3,
  },
  flow: {
    confidence: 1,
    review: 2,
    current: 5,
    challenge: 2,
  },
  stretch: {
    confidence: 2,
    review: 2,
    current: 4,
    challenge: 2,
  },
  hard: {
    confidence: 3,
    review: 3,
    current: 3,
    challenge: 1,
  },
  fatigue: {
    confidence: 3,
    review: 2,
    current: 1,
    challenge: 0,
  },
};

function hasConsecutiveState(
  current: FlowState,
  recentStates: FlowState[] = [],
) {
  return recentStates[recentStates.length - 1] === current;
}

function clampDifficulty(difficulty: number) {
  return Math.min(Math.max(difficulty, 1), 10);
}

export interface ApproveFlowPolicyInput {
  report: LearningBatchReport;
  recentStates?: FlowState[];
  observation?: LlmLearningObservation | null;
}

function observationState(
  observation?: LlmLearningObservation | null,
): FlowState | null {
  if (
    !observation ||
    llmConfidenceWeight(observation.confidence, { maxInfluence: 1 }) < 0.35 ||
    observation.overallState === 'unstable'
  ) {
    return null;
  }

  return observation.overallState;
}

function saferState(localState: FlowState, observedState: FlowState | null): FlowState {
  if (!observedState || observedState === localState) {
    return localState;
  }

  if (observedState === 'fatigue') {
    return 'fatigue';
  }

  if (localState === 'fatigue') {
    return 'fatigue';
  }

  if (observedState === 'hard') {
    return 'hard';
  }

  if (localState === 'hard') {
    return 'hard';
  }

  if (observedState === 'stretch') {
    return 'stretch';
  }

  if (localState === 'stretch' && observedState === 'easy') {
    return 'stretch';
  }

  return observedState;
}

function withObservationRationale(
  rationale: string,
  observation?: LlmLearningObservation | null,
) {
  if (
    !observation ||
    observation.overallState === 'unstable' ||
    llmConfidenceWeight(observation.confidence, { maxInfluence: 1 }) === 0
  ) {
    return rationale;
  }

  return `${rationale} Observer: ${observation.stateReason}`;
}

export function approveFlowPolicy({
  report,
  recentStates = [],
  observation = null,
}: ApproveFlowPolicyInput): ApprovedFlowPolicy {
  const state = saferState(report.rulePreState, observationState(observation));
  const repeatedState = hasConsecutiveState(state, recentStates);
  const batchSize = state === 'fatigue' ? 6 : 10;
  const mix = blendBatchMix(
    DEFAULT_MIX_BY_STATE[state],
    observation?.recommendation.suggestedMix,
    observation?.confidence ?? 0,
    batchSize,
  );
  const nextDifficulty =
    state === 'easy' && repeatedState
      ? clampDifficulty(report.currentDifficulty + 1)
      : state === 'hard' && repeatedState
        ? clampDifficulty(report.currentDifficulty - 1)
        : report.currentDifficulty;

  if (state === 'fatigue') {
    return {
      finalState: state,
      finalAction: 'fatigue_recovery',
      nextDifficulty,
      batchSize,
      mix,
      adjustmentDimension: 'batch_size',
      constraints: {
        maxLevelIncrease: 0,
        maxLevelDecrease: 0,
        maxSameOperationInRow: 2,
        maxChallengeInRow: 0,
        minConfidenceItemRatio: 0.4,
        adjustOnlyOneDimension: true,
        avoidTags: ['challenge', 'pure_number_close_options'],
        mustIncludeTags: ['confidence_item'],
      },
      rationale: withObservationRationale(
        'Fatigue signals should reduce pressure without changing long-term skill level.',
        observation,
      ),
    };
  }

  if (state === 'hard') {
    return {
      finalState: state,
      finalAction: 'decrease_pressure',
      nextDifficulty,
      batchSize,
      mix,
      adjustmentDimension: repeatedState ? 'number_range' : 'visual_support',
      constraints: {
        maxLevelIncrease: 0,
        maxLevelDecrease: 1,
        maxSameOperationInRow: 2,
        maxChallengeInRow: 1,
        minConfidenceItemRatio: 0.3,
        adjustOnlyOneDimension: true,
        avoidTags: ['repeated_high_load_items'],
        mustIncludeTags: ['confidence_item', 'visual_support'],
      },
      rationale: withObservationRationale(
        repeatedState
          ? 'Two hard batches allow one-level pressure reduction.'
          : 'One hard batch should first add support and recovery items.',
        observation,
      ),
    };
  }

  if (state === 'stretch') {
    return {
      finalState: state,
      finalAction: 'maintain_with_support',
      nextDifficulty,
      batchSize,
      mix,
      adjustmentDimension: 'visual_support',
      constraints: {
        maxLevelIncrease: 0,
        maxLevelDecrease: 0,
        maxSameOperationInRow: 2,
        maxChallengeInRow: 1,
        minConfidenceItemRatio: 0.2,
        adjustOnlyOneDimension: true,
        avoidTags: ['consecutive_high_load_items'],
        mustIncludeTags: ['confidence_item', 'supported_current_item'],
      },
      rationale: withObservationRationale(
        'Stretch means the child can still recover, so keep the target and add scaffolding.',
        observation,
      ),
    };
  }

  if (state === 'easy') {
    return {
      finalState: state,
      finalAction: 'increase_challenge_ratio',
      nextDifficulty,
      batchSize,
      mix,
      adjustmentDimension: repeatedState ? 'number_range' : 'option_distance',
      constraints: {
        maxLevelIncrease: 1,
        maxLevelDecrease: 0,
        maxSameOperationInRow: 2,
        maxChallengeInRow: 1,
        minConfidenceItemRatio: 0.2,
        adjustOnlyOneDimension: true,
        avoidTags: ['multi_dimension_jump'],
        mustIncludeTags: ['current_item'],
      },
      rationale: withObservationRationale(
        repeatedState
          ? 'Two easy batches allow one-level increase.'
          : 'One easy batch only increases challenge ratio.',
        observation,
      ),
    };
  }

  return {
    finalState: state,
    finalAction: 'maintain',
    nextDifficulty,
    batchSize,
    mix,
    adjustmentDimension: 'none',
    constraints: {
      maxLevelIncrease: 0,
      maxLevelDecrease: 0,
      maxSameOperationInRow: 2,
      maxChallengeInRow: 1,
      minConfidenceItemRatio: 0.2,
      adjustOnlyOneDimension: true,
      avoidTags: ['multi_dimension_jump'],
      mustIncludeTags: ['current_item'],
    },
    rationale: withObservationRationale(
      'Flow state should keep the current rhythm with a small challenge lane.',
      observation,
    ),
  };
}
