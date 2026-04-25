import { useCallback, useMemo, useState } from 'react';
import { scheduleLearningStateSync } from '../../sync/learningStateSync';
import {
  INITIAL_DDA_STATE,
  nextDdaState,
  type DdaOutcome,
  type DdaState,
} from './ddaEngine';

const STORAGE_KEY = 'childlearn.dda-state';

function readStoredDdaState(): DdaState {
  if (typeof window === 'undefined') {
    return INITIAL_DDA_STATE;
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<DdaState>;
    const difficulty = Number(parsed.difficulty ?? INITIAL_DDA_STATE.difficulty);
    const consecutiveCorrect = Number(
      parsed.consecutiveCorrect ?? INITIAL_DDA_STATE.consecutiveCorrect,
    );
    const consecutiveWrong = Number(
      parsed.consecutiveWrong ?? INITIAL_DDA_STATE.consecutiveWrong,
    );
    const recentWindow = Array.isArray(parsed.recentWindow)
      ? parsed.recentWindow
          .map((item) => Number(item))
          .filter((item) => item === 0 || item === 1)
          .slice(-10)
      : INITIAL_DDA_STATE.recentWindow;

    return {
      difficulty: Number.isFinite(difficulty)
        ? Math.min(Math.max(Math.round(difficulty), 1), 10)
        : INITIAL_DDA_STATE.difficulty,
      consecutiveCorrect: Number.isFinite(consecutiveCorrect)
        ? Math.min(Math.max(Math.round(consecutiveCorrect), 0), 2)
        : INITIAL_DDA_STATE.consecutiveCorrect,
      consecutiveWrong: Number.isFinite(consecutiveWrong)
        ? Math.min(Math.max(Math.round(consecutiveWrong), 0), 1)
        : INITIAL_DDA_STATE.consecutiveWrong,
      recentWindow,
    };
  } catch {
    return INITIAL_DDA_STATE;
  }
}

function writeStoredDdaState(state: DdaState) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  scheduleLearningStateSync('dda');
}

export function useDDA() {
  const [state, setState] = useState<DdaState>(readStoredDdaState);

  const applyDifficulty = useCallback((difficulty: number) => {
    const next = {
      difficulty: Math.min(Math.max(Math.round(difficulty), 1), 10),
      consecutiveCorrect: 0,
      consecutiveWrong: 0,
      recentWindow: [],
    };

    writeStoredDdaState(next);
    setState(next);
    return next;
  }, []);

  const record = useCallback((outcome: DdaOutcome) => {
    const predicted = nextDdaState(state, outcome);
    setState((previous) => {
      const next = nextDdaState(previous, outcome);
      writeStoredDdaState(next);
      return next;
    });
    return predicted;
  }, [state]);

  const reset = useCallback(() => {
    writeStoredDdaState(INITIAL_DDA_STATE);
    setState(INITIAL_DDA_STATE);
  }, []);

  return useMemo(
    () => ({
      difficulty: state.difficulty,
      consecutiveCorrect: state.consecutiveCorrect,
      consecutiveWrong: state.consecutiveWrong,
      recentWindow: state.recentWindow,
      onCorrect: () => record('correct'),
      onWrong: () => record('wrong'),
      applyDifficulty,
      reset,
    }),
    [
      applyDifficulty,
      record,
      reset,
      state.consecutiveCorrect,
      state.consecutiveWrong,
      state.difficulty,
      state.recentWindow,
    ],
  );
}
