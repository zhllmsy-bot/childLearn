import { blendNumbers, llmConfidenceWeight, shouldPreferLlmChoice } from '../../ai/llmConfidence';
import type { LearnerProfile, LearnerSkillKey } from '../../ai/learnerModel';
import { thetaToDifficulty } from '../../ai/learnerModel';
import {
  buildFlowQuestionPlanForLane,
  type FlowQuestionLane,
  type FlowQuestionPlan,
} from './questionSelector';
import type { ApprovedFlowPolicy, BatchMix, LlmLearningObservation } from './types';

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function difficultyToTheta(difficulty: number) {
  return ((clamp(difficulty, 1, 10) - 1) / 9) * 4 - 2;
}

function mixTotal(mix: BatchMix) {
  return mix.confidence + mix.review + mix.current + mix.challenge;
}

function toProportions(mix: BatchMix) {
  const total = mixTotal(mix);
  if (total <= 0) {
    return {
      confidence: 0.25,
      review: 0.25,
      current: 0.25,
      challenge: 0.25,
    } satisfies Record<keyof BatchMix, number>;
  }

  return {
    confidence: mix.confidence / total,
    review: mix.review / total,
    current: mix.current / total,
    challenge: mix.challenge / total,
  } satisfies Record<keyof BatchMix, number>;
}

function scaleMix(proportions: Record<keyof BatchMix, number>, batchSize: number): BatchMix {
  const lanes = Object.entries(proportions).map(([lane, ratio]) => {
    const raw = Math.max(ratio, 0) * batchSize;
    return {
      lane: lane as keyof BatchMix,
      whole: Math.floor(raw),
      remainder: raw - Math.floor(raw),
    };
  });

  let assigned = lanes.reduce((sum, lane) => sum + lane.whole, 0);
  const next: BatchMix = {
    confidence: 0,
    review: 0,
    current: 0,
    challenge: 0,
  };
  lanes.forEach((lane) => {
    next[lane.lane] = lane.whole;
  });

  [...lanes]
    .sort((left, right) => right.remainder - left.remainder)
    .forEach((lane) => {
      if (assigned >= batchSize) {
        return;
      }

      next[lane.lane] += 1;
      assigned += 1;
    });

  return next;
}

export function blendBatchMix(
  localMix: BatchMix,
  llmMix: BatchMix | undefined,
  confidence: number,
  batchSize: number,
) {
  if (!llmMix) {
    return scaleMix(toProportions(localMix), batchSize);
  }

  const llmWeight = llmConfidenceWeight(confidence, { maxInfluence: 0.55 });
  if (llmWeight === 0) {
    return scaleMix(toProportions(localMix), batchSize);
  }

  const local = toProportions(localMix);
  const suggested = toProportions(llmMix);
  return scaleMix(
    {
      confidence: blendNumbers(local.confidence, suggested.confidence, confidence, {
        maxInfluence: 0.55,
      }),
      review: blendNumbers(local.review, suggested.review, confidence, {
        maxInfluence: 0.55,
      }),
      current: blendNumbers(local.current, suggested.current, confidence, {
        maxInfluence: 0.55,
      }),
      challenge: blendNumbers(local.challenge, suggested.challenge, confidence, {
        maxInfluence: 0.55,
      }),
    },
    batchSize,
  );
}

function spreadLaneSequence(mix: BatchMix) {
  const totals = {
    confidence: mix.confidence,
    review: mix.review,
    current: mix.current,
    challenge: mix.challenge,
  };
  const result: FlowQuestionLane[] = [];
  const used = {
    confidence: 0,
    review: 0,
    current: 0,
    challenge: 0,
  };
  const totalItems = mixTotal(mix);

  for (let slot = 0; slot < totalItems; slot += 1) {
    let bestLane: FlowQuestionLane = 'current';
    let bestScore = Number.NEGATIVE_INFINITY;

    (Object.keys(totals) as FlowQuestionLane[]).forEach((lane) => {
      if (totals[lane] <= used[lane]) {
        return;
      }

      const targetByNow = ((slot + 1) * totals[lane]) / totalItems;
      const score = targetByNow - used[lane];
      if (score > bestScore) {
        bestScore = score;
        bestLane = lane;
      }
    });

    used[bestLane] += 1;
    result.push(bestLane);
  }

  return result;
}

function mergeObserverSuggestion(
  plan: FlowQuestionPlan,
  observation: LlmLearningObservation,
) {
  const suggestion = observation.nextItemSuggestion;
  if (!suggestion) {
    return plan;
  }

  const localTheta = plan.targetTheta ?? difficultyToTheta(plan.difficulty);
  const blendedTheta = blendNumbers(localTheta, suggestion.targetTheta, observation.confidence, {
    maxInfluence: 0.5,
  });
  const blendedDifficulty = clamp(
    thetaToDifficulty(blendedTheta),
    Math.max(plan.difficulty - 1, 1),
    Math.min(plan.difficulty + 1, 10),
  );

  return {
    ...plan,
    difficulty: blendedDifficulty,
    targetTheta: blendedTheta,
    targetSkillKey: shouldPreferLlmChoice(observation.confidence, 0.35)
      ? (suggestion.targetSkillKey as LearnerSkillKey)
      : plan.targetSkillKey,
    variant: shouldPreferLlmChoice(observation.confidence, 0.45)
      ? suggestion.variant
      : plan.variant,
  };
}

export interface ComposeFlowPlanInput {
  learnerProfile?: LearnerProfile | null;
  policy: ApprovedFlowPolicy | null;
  observation?: LlmLearningObservation | null;
  fallbackDifficulty: number;
  serialStart: number;
}

export interface ComposedFlowPlan {
  batchSize: number;
  mix: BatchMix;
  plans: FlowQuestionPlan[];
}

export function composeFlowPlan({
  learnerProfile,
  policy,
  observation = null,
  fallbackDifficulty,
  serialStart,
}: ComposeFlowPlanInput): ComposedFlowPlan {
  const batchSize = policy?.batchSize ?? 10;
  const localMix =
    policy?.mix ?? {
      confidence: 1,
      review: 2,
      current: 5,
      challenge: 2,
    };
  const mix = blendBatchMix(
    localMix,
    observation?.recommendation.suggestedMix,
    observation?.confidence ?? 0,
    batchSize,
  );
  const lanes = spreadLaneSequence(mix);
  const plans = lanes.map((lane, index) =>
    buildFlowQuestionPlanForLane({
      learnerProfile,
      policy,
      fallbackDifficulty,
      serial: serialStart + index,
      lane,
    }),
  );

  if (observation?.overallState !== 'unstable' && observation?.nextItemSuggestion) {
    plans[0] = mergeObserverSuggestion(plans[0], observation);
  }

  return {
    batchSize,
    mix,
    plans,
  };
}
