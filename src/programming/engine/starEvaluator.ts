export interface StarThresholds {
  threeStarsMaxSteps: number;
  twoStarsMaxSteps: number;
  oneStarMaxSteps: number;
}

export interface StarEvaluationTrace {
  stars: 1 | 2 | 3;
  usedSteps: number;
  targetSteps: number;
  stepsOverThreeStarTarget: number;
  reason: 'within_three_star_target' | 'within_two_star_target' | 'completed_over_target';
}

export function evaluateStars(usedSteps: number, thresholds: StarThresholds): 1 | 2 | 3 {
  if (usedSteps <= thresholds.threeStarsMaxSteps) {
    return 3;
  }

  if (usedSteps <= thresholds.twoStarsMaxSteps) {
    return 2;
  }

  return 1;
}

export function explainStarRating(
  usedSteps: number,
  thresholds: StarThresholds,
): StarEvaluationTrace {
  const roundedSteps = Math.max(0, Math.round(usedSteps));
  const stars = evaluateStars(roundedSteps, thresholds);
  const reason =
    stars === 3
      ? 'within_three_star_target'
      : stars === 2
        ? 'within_two_star_target'
        : 'completed_over_target';

  return {
    stars,
    usedSteps: roundedSteps,
    targetSteps: thresholds.threeStarsMaxSteps,
    stepsOverThreeStarTarget: Math.max(0, roundedSteps - thresholds.threeStarsMaxSteps),
    reason,
  };
}
