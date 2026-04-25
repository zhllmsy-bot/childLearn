import { describe, expect, it } from 'vitest';
import { evaluateStars } from './starEvaluator';

describe('starEvaluator', () => {
  it('returns three stars at or before the first threshold', () => {
    const thresholds = {
      threeStarsMaxSteps: 3,
      twoStarsMaxSteps: 5,
      oneStarMaxSteps: 7,
    };

    expect(evaluateStars(3, thresholds)).toBe(3);
    expect(evaluateStars(4, thresholds)).toBe(2);
  });

  it('returns two stars between middle thresholds', () => {
    const thresholds = {
      threeStarsMaxSteps: 3,
      twoStarsMaxSteps: 5,
      oneStarMaxSteps: 7,
    };

    expect(evaluateStars(5, thresholds)).toBe(2);
    expect(evaluateStars(6, thresholds)).toBe(1);
  });

  it('returns one star beyond the second threshold', () => {
    expect(evaluateStars(8, {
      threeStarsMaxSteps: 3,
      twoStarsMaxSteps: 5,
      oneStarMaxSteps: 7,
    })).toBe(1);
  });
});
