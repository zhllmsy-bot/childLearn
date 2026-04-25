export interface DdaState {
  difficulty: number;
  consecutiveCorrect: number;
  consecutiveWrong: number;
  recentWindow: number[];
}

export type DdaOutcome = 'correct' | 'wrong';

const TARGET_ACCURACY_LOW = 0.75;
const TARGET_ACCURACY_HIGH = 0.85;
const WINDOW_SIZE = 10;
const MIN_WINDOW_FOR_ADJUSTMENT = 5;

export const INITIAL_DDA_STATE: DdaState = {
  difficulty: 1,
  consecutiveCorrect: 0,
  consecutiveWrong: 0,
  recentWindow: [],
};

export function nextDdaState(state: DdaState, outcome: DdaOutcome): DdaState {
  const recentWindow = [
    ...(Array.isArray(state.recentWindow) ? state.recentWindow : []),
    outcome === 'correct' ? 1 : 0,
  ].slice(-WINDOW_SIZE);

  if (outcome === 'correct') {
    const consecutiveCorrect = state.consecutiveCorrect + 1;
    const accuracy =
      recentWindow.reduce((total, item) => total + item, 0) / recentWindow.length;
    const shouldRaise =
      recentWindow.length >= MIN_WINDOW_FOR_ADJUSTMENT &&
      accuracy > TARGET_ACCURACY_HIGH &&
      recentWindow.slice(-3).every((item) => item === 1) &&
      consecutiveCorrect >= 3;

    if (shouldRaise) {
      return {
        difficulty: Math.min(state.difficulty + 1, 10),
        consecutiveCorrect: 0,
        consecutiveWrong: 0,
        recentWindow,
      };
    }

    return {
      ...state,
      consecutiveCorrect,
      consecutiveWrong: 0,
      recentWindow,
    };
  }

  const consecutiveWrong = state.consecutiveWrong + 1;
  const accuracy =
    recentWindow.reduce((total, item) => total + item, 0) / recentWindow.length;
  const shouldLower =
    recentWindow.length >= MIN_WINDOW_FOR_ADJUSTMENT &&
    accuracy < TARGET_ACCURACY_LOW &&
    recentWindow.slice(-3).filter((item) => item === 0).length >= 2;

  if (shouldLower) {
    return {
      difficulty: Math.max(state.difficulty - 1, 1),
      consecutiveCorrect: 0,
      consecutiveWrong: 0,
      recentWindow,
    };
  }

  return {
    ...state,
    consecutiveCorrect: 0,
    consecutiveWrong,
    recentWindow,
  };
}
