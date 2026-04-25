import { describe, expect, it } from 'vitest';
import { INITIAL_DDA_STATE, nextDdaState } from './ddaEngine';

describe('ddaEngine', () => {
  it('raises difficulty after three consecutive correct answers', () => {
    const first = nextDdaState(INITIAL_DDA_STATE, 'correct');
    const second = nextDdaState(first, 'correct');
    const third = nextDdaState(second, 'correct');

    expect(third.difficulty).toBe(2);
    expect(third.consecutiveCorrect).toBe(0);
  });

  it('lowers difficulty after two consecutive misses without going below one', () => {
    const state = {
      difficulty: 3,
      consecutiveCorrect: 0,
      consecutiveWrong: 0,
    };

    const first = nextDdaState(state, 'wrong');
    const second = nextDdaState(first, 'wrong');
    const floor = nextDdaState(
      {
        difficulty: 1,
        consecutiveCorrect: 0,
        consecutiveWrong: 1,
      },
      'wrong',
    );

    expect(second.difficulty).toBe(2);
    expect(floor.difficulty).toBe(1);
  });

  it('does not treat a wrong answer as a combo reset input', () => {
    const first = nextDdaState(INITIAL_DDA_STATE, 'correct');
    const wrong = nextDdaState(first, 'wrong');

    expect(wrong.consecutiveCorrect).toBe(0);
    expect(wrong.difficulty).toBe(1);
  });
});
