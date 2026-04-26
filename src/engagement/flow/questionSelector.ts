import type { QuestionVariant } from '../../curriculum/types';
import { getVariantsForProgressionLane } from '../../curriculum/mathProgression';
import {
  chooseLearnerTargetSkill,
  skillTheta,
  thetaToDifficulty,
  type LearnerProfile,
  type LearnerSkillKey,
} from '../../ai/learnerModel';
import type { ApprovedFlowPolicy } from './types';

export type FlowQuestionLane = 'confidence' | 'review' | 'current' | 'challenge';

export interface FlowQuestionPlan {
  lane: FlowQuestionLane;
  difficulty: number;
  targetSkillKey?: LearnerSkillKey;
  targetTheta?: number;
  variant?: QuestionVariant;
}

interface SelectFlowQuestionPlanInput {
  learnerProfile?: LearnerProfile | null;
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

function variantForSkill(skillKey: LearnerSkillKey): QuestionVariant | null {
  if (skillKey === 'visualMatching' || skillKey === 'countingTo5') {
    return 'matching';
  }

  if (
    skillKey === 'compareWithin5' ||
    skillKey === 'compareWithin10' ||
    skillKey === 'compareWithin20'
  ) {
    return 'compare';
  }

  if (skillKey === 'makeTen' || skillKey === 'crossTenBridge') {
    return 'makeTen';
  }

  if (skillKey === 'missingAddend' || skillKey === 'pureNumberReadiness') {
    return 'missing';
  }

  if (skillKey === 'numberLineDistance' || skillKey === 'subWithin10') {
    return 'numberLine';
  }

  if (skillKey === 'storyAddition') {
    return 'story';
  }

  return null;
}

function targetOffsetForLane(lane: FlowQuestionLane) {
  if (lane === 'confidence') {
    return -0.45;
  }

  if (lane === 'review') {
    return -0.15;
  }

  if (lane === 'challenge') {
    return 0.4;
  }

  return 0.2;
}

function learnerPlanAdjustment({
  baselineDifficulty,
  lane,
  learnerProfile,
}: {
  baselineDifficulty: number;
  lane: FlowQuestionLane;
  learnerProfile?: LearnerProfile | null;
}) {
  const targetSkillKey = chooseLearnerTargetSkill(learnerProfile, lane);
  if (!targetSkillKey || !learnerProfile) {
    return {
      difficulty: baselineDifficulty,
      targetSkillKey: undefined,
      targetTheta: undefined,
      variant: undefined,
    };
  }

  const targetTheta = skillTheta(learnerProfile, targetSkillKey) + targetOffsetForLane(lane);
  const thetaDifficulty = thetaToDifficulty(targetTheta);
  const difficulty = clampDifficulty(
    Math.min(Math.max(thetaDifficulty, baselineDifficulty - 1), baselineDifficulty + 1),
  );

  return {
    difficulty,
    targetSkillKey,
    targetTheta,
    variant: variantForSkill(targetSkillKey) ?? undefined,
  };
}

export function buildFlowQuestionPlanForLane({
  learnerProfile,
  policy,
  fallbackDifficulty,
  serial,
  lane,
}: SelectFlowQuestionPlanInput & { lane: FlowQuestionLane }): FlowQuestionPlan {
  const baselineDifficulty = policy
    ? difficultyForLane(lane, policy)
    : clampDifficulty(fallbackDifficulty);
  const learnerAdjustment = learnerPlanAdjustment({
    baselineDifficulty,
    lane,
    learnerProfile,
  });
  const difficulty = learnerAdjustment.difficulty;
  const plan: FlowQuestionPlan = {
    lane,
    difficulty,
    variant: learnerAdjustment.variant ?? variantForLane(lane, serial, difficulty),
  };

  if (learnerAdjustment.targetSkillKey) {
    plan.targetSkillKey = learnerAdjustment.targetSkillKey;
    plan.targetTheta = learnerAdjustment.targetTheta;
  }

  return plan;
}

export function selectFlowQuestionPlan({
  learnerProfile,
  policy,
  fallbackDifficulty,
  serial,
}: SelectFlowQuestionPlanInput): FlowQuestionPlan {
  if (!policy) {
    return buildFlowQuestionPlanForLane({
      learnerProfile,
      policy,
      fallbackDifficulty,
      serial,
      lane: 'current',
    });
  }

  const lanes = laneSequence(policy);
  const lane = lanes[serial % lanes.length];
  return buildFlowQuestionPlanForLane({
    learnerProfile,
    policy,
    fallbackDifficulty,
    serial,
    lane,
  });
}
