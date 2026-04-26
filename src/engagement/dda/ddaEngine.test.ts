import { describe, expect, it } from 'vitest';
import { INITIAL_DDA_STATE, nextDdaState, type DdaState } from './ddaEngine';

function createState(overrides: Partial<DdaState>): DdaState {
  return {
    ...INITIAL_DDA_STATE,
    ...overrides,
    skillWindows: overrides.skillWindows ?? {},
    focusSkillKey: overrides.focusSkillKey ?? null,
  };
}

describe('ddaEngine', () => {
  it('raises difficulty when recent accuracy is above the flow band', () => {
    const next = Array.from({ length: 5 }, () => 'correct' as const).reduce(
      (state, outcome) => nextDdaState(state, outcome),
      INITIAL_DDA_STATE,
    );

    expect(next.difficulty).toBe(4);
    expect(next.consecutiveCorrect).toBe(0);
    expect(next.recentWindow).toEqual([1, 1, 1, 1, 1]);
  });

  it('uses a two-step raise when the flow band is cleared on a four-answer streak', () => {
    const seeded = createState({
      difficulty: 3,
      consecutiveCorrect: 3,
      recentWindow: [1, 1, 1, 1],
    });

    const next = nextDdaState(seeded, 'correct');

    expect(next.difficulty).toBe(5);
    expect(next.consecutiveCorrect).toBe(0);
    expect(next.recentWindow).toEqual([1, 1, 1, 1, 1]);
  });

  it('lowers difficulty when recent accuracy falls below the flow band', () => {
    const state = createState({
      difficulty: 3,
      consecutiveCorrect: 0,
      consecutiveWrong: 0,
      recentWindow: [1, 1, 1, 1],
    });

    const first = nextDdaState(state, 'wrong');
    const second = nextDdaState(first, 'wrong');

    expect(first.difficulty).toBe(3);
    expect(second.difficulty).toBe(2);
    expect(second.recentWindow).toEqual([1, 1, 1, 1, 0, 0]);
  });

  it('does not lower difficulty below one', () => {
    const next = nextDdaState(
      createState({
        difficulty: 1,
        consecutiveCorrect: 0,
        consecutiveWrong: 0,
        recentWindow: [0, 1, 0, 1],
      }),
      'wrong',
    );

    expect(next.difficulty).toBe(1);
  });

  it('does not treat a wrong answer as a combo reset input', () => {
    const first = nextDdaState(INITIAL_DDA_STATE, 'correct');
    const wrong = nextDdaState(first, 'wrong');

    expect(wrong.consecutiveCorrect).toBe(0);
    expect(wrong.difficulty).toBe(1);
    expect(wrong.recentWindow).toEqual([1, 0]);
  });

  it('waits for enough evidence before changing difficulty', () => {
    const next = Array.from({ length: 4 }, () => 'correct' as const).reduce(
      (state, outcome) => nextDdaState(state, outcome),
      INITIAL_DDA_STATE,
    );

    expect(next.difficulty).toBe(1);
    expect(next.recentWindow).toEqual([1, 1, 1, 1]);
  });

  it('lowers difficulty when errors are scattered inside the recent window', () => {
    const next = nextDdaState(
      createState({
        difficulty: 4,
        recentWindow: [1, 0, 1, 0],
      }),
      'wrong',
    );

    expect(next.difficulty).toBe(3);
    expect(next.recentWindow).toEqual([1, 0, 1, 0, 0]);
  });
});
