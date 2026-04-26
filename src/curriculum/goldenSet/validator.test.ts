import { describe, expect, it } from 'vitest';
import { GOLDEN_SET_SEED } from './seed';
import type { GoldenSetItem } from './types';
import { validateGoldenSetItem } from './validator';

describe('goldenSet validator', () => {
  it('accepts the seeded published items', () => {
    const result = validateGoldenSetItem(GOLDEN_SET_SEED[0], GOLDEN_SET_SEED);

    expect(result.errors).toEqual([]);
  });

  it('flags duplicate or inconsistent choice definitions', () => {
    const broken: GoldenSetItem = {
      ...GOLDEN_SET_SEED[0],
      id: 'gs_broken_001',
      content: {
        ...GOLDEN_SET_SEED[0].content,
        correctAnswer: 4,
        choices: [
          { text: '4', value: 4, isCorrect: true },
          { text: '4', value: 4, isCorrect: false },
          { text: '5', value: 5, isCorrect: false },
          { text: '6', value: 6, isCorrect: false },
        ],
      },
    };

    const result = validateGoldenSetItem(broken, GOLDEN_SET_SEED);

    expect(result.errors).toContain('choice values must be unique.');
  });
});
