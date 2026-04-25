export interface StarThresholds {
  threeStarsMaxSteps: number;
  twoStarsMaxSteps: number;
  oneStarMaxSteps: number;
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
