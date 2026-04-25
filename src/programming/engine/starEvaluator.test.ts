import { describe, expect, it } from 'vitest';
import { evaluateStars } from './starEvaluator';

describe('starEvaluator', () => {
  it('returns three stars at or before the first threshold', () => {
    expect(evaluateStars(3, [3, 5, 7])).toBe(3);
    expect(evaluateStars(4, [3, 5, 7])).toBe(2);
  });

  it('returns two stars between middle thresholds', () => {
    expect(evaluateStars(5, [3, 5, 7])).toBe(2);
    expect(evaluateStars(6, [3, 5, 7])).toBe(1);
  });

  it('returns one star beyond the second threshold', () => {
    expect(evaluateStars(8, [3, 5, 7])).toBe(1);
  });
});
