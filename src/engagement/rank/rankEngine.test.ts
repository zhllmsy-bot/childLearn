import { describe, expect, it } from 'vitest';
import {
  RANK_LADDER_STAR_CAP,
  calculateBatchRankStars,
  getRankSnapshot,
} from './rankEngine';

describe('rankEngine', () => {
  it('splits big ranks into five small divisions', () => {
    expect(getRankSnapshot(0).name).toBe('青铜 5');
    expect(getRankSnapshot(4).starLabel).toBe('4/5');
    expect(getRankSnapshot(5).name).toBe('青铜 4');
    expect(getRankSnapshot(24).name).toBe('青铜 1');
    expect(getRankSnapshot(25).name).toBe('白银 5');
  });

  it('keeps growing after the apex rank as a star map', () => {
    expect(getRankSnapshot(RANK_LADDER_STAR_CAP).name).toBe('王者 1');
    expect(getRankSnapshot(RANK_LADDER_STAR_CAP + 3).name).toBe('王者星图 3');
  });

  it('awards rank stars only for completed batches', () => {
    expect(
      calculateBatchRankStars({
        correct: 10,
        total: 10,
        mistakes: 0,
        maxCombo: 10,
        flowState: 'easy',
      }),
    ).toBe(3);

    expect(
      calculateBatchRankStars({
        correct: 10,
        total: 10,
        mistakes: 6,
        maxCombo: 2,
        flowState: 'hard',
      }),
    ).toBe(1);

    expect(
      calculateBatchRankStars({
        correct: 6,
        total: 10,
        mistakes: 0,
        maxCombo: 6,
        flowState: 'flow',
      }),
    ).toBe(0);
  });
});
