import type { QuestionVariant } from '../../curriculum/types';
import { getVariantsForProgressionLane } from '../../curriculum/mathProgression';
import type { ApprovedFlowPolicy } from './types';

export type FlowQuestionLane = 'confidence' | 'review' | 'current' | 'challenge';

export interface FlowQuestionPlan {
  lane: FlowQuestionLane;
  difficulty: number;
  variant?: QuestionVariant;
}

interface SelectFlowQuestionPlanInput {
  policy: ApprovedFlowPolicy | null;
  fallbackDifficulty: number;
  serial: number;
}

function clampDifficulty(difficulty: number) {
  return Math.min(Math.max(difficulty, 1), 10);
}

function laneSequence(policy: ApprovedFlowPolicy): FlowQuestionLane[] {
  const lanes: FlowQuestionLane[] = [
    ...Array.from({ length: policy.mix.confidence }, () => 'confidence' as const),
    ...Array.from({ length: policy.mix.review }, () => 'review' as const),
    ...Array.from({ length: policy.mix.current }, () => 'current' as const),
    ...Array.from({ length: policy.mix.challenge }, () => 'challenge' as const),
  ];

  if (lanes.length === 0) {
    return ['current'];
  }

  return lanes;
}

function variantForLane(lane: FlowQuestionLane, serial: number, difficulty: number) {
  let variants: QuestionVariant[];

  if (lane === 'confidence') {
    variants = getVariantsForProgressionLane(difficulty, 'support');
  } else if (lane === 'review') {
    variants = getVariantsForProgressionLane(difficulty, 'support');
  } else if (lane === 'challenge') {
    variants = getVariantsForProgressionLane(difficulty, 'challenge');
  } else {
    variants = getVariantsForProgressionLane(difficulty, 'current');
  }

  return variants[serial % variants.length];
}

function difficultyForLane(lane: FlowQuestionLane, policy: ApprovedFlowPolicy) {
  if (lane === 'confidence' || lane === 'review') {
    return clampDifficulty(policy.nextDifficulty - 1);
  }

  if (lane === 'challenge') {
    return clampDifficulty(policy.nextDifficulty + 1);
  }

  return clampDifficulty(policy.nextDifficulty);
}

export function selectFlowQuestionPlan({
  policy,
  fallbackDifficulty,
  serial,
}: SelectFlowQuestionPlanInput): FlowQuestionPlan {
  if (!policy) {
    return {
      lane: 'current',
      difficulty: clampDifficulty(fallbackDifficulty),
    };
  }

  const lanes = laneSequence(policy);
  const lane = lanes[serial % lanes.length];
  const difficulty = difficultyForLane(lane, policy);

  return {
    lane,
    difficulty,
    variant: variantForLane(lane, serial, difficulty),
  };
}
