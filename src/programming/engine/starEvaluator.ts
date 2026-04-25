export type StarThresholds = [number, number, number];

export function evaluateStars(usedSteps: number, thresholds: StarThresholds): 1 | 2 | 3 {
  if (usedSteps <= thresholds[0]) {
    return 3;
  }

  if (usedSteps <= thresholds[1]) {
    return 2;
  }

  return 1;
}

