export interface DdaState {
  difficulty: number;
  consecutiveCorrect: number;
  consecutiveWrong: number;
}

export type DdaOutcome = 'correct' | 'wrong';

export const INITIAL_DDA_STATE: DdaState = {
  difficulty: 1,
  consecutiveCorrect: 0,
  consecutiveWrong: 0,
};

export function nextDdaState(state: DdaState, outcome: DdaOutcome): DdaState {
  if (outcome === 'correct') {
    const consecutiveCorrect = state.consecutiveCorrect + 1;
    if (consecutiveCorrect >= 3) {
      return {
        difficulty: Math.min(state.difficulty + 1, 10),
        consecutiveCorrect: 0,
        consecutiveWrong: 0,
      };
    }

    return {
      ...state,
      consecutiveCorrect,
      consecutiveWrong: 0,
    };
  }

  const consecutiveWrong = state.consecutiveWrong + 1;
  if (consecutiveWrong >= 2) {
    return {
      difficulty: Math.max(state.difficulty - 1, 1),
      consecutiveCorrect: 0,
      consecutiveWrong: 0,
    };
  }

  return {
    ...state,
    consecutiveCorrect: 0,
    consecutiveWrong,
  };
}
