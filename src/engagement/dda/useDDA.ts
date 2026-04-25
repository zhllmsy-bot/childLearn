import { useCallback, useMemo, useState } from 'react';
import { scheduleLearningStateSync } from '../../sync/learningStateSync';
import type { QuestionDifficultyTags } from '../flow';
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
    const skillWindows =
      parsed.skillWindows && typeof parsed.skillWindows === 'object'
        ? Object.fromEntries(
            Object.entries(parsed.skillWindows)
              .filter(([, value]) => Array.isArray(value))
              .map(([key, value]) => [
                key,
                (value as unknown[])
                  .map((item) => Number(item))
                  .filter((item) => item === 0 || item === 1)
                  .slice(-6),
              ]),
          )
        : INITIAL_DDA_STATE.skillWindows;

    return {
      difficulty: Number.isFinite(difficulty)
        ? Math.min(Math.max(Math.round(difficulty), 1), 10)
        : INITIAL_DDA_STATE.difficulty,
      consecutiveCorrect: Number.isFinite(consecutiveCorrect)
        ? Math.min(Math.max(Math.round(consecutiveCorrect), 0), 10)
        : INITIAL_DDA_STATE.consecutiveCorrect,
      consecutiveWrong: Number.isFinite(consecutiveWrong)
        ? Math.min(Math.max(Math.round(consecutiveWrong), 0), 10)
        : INITIAL_DDA_STATE.consecutiveWrong,
      recentWindow,
      skillWindows,
      focusSkillKey:
        typeof parsed.focusSkillKey === 'string'
          ? parsed.focusSkillKey
          : INITIAL_DDA_STATE.focusSkillKey,
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
      skillWindows: {},
      focusSkillKey: null,
    };

    writeStoredDdaState(next);
    setState(next);
    return next;
  }, []);

  const applyDiagnosticResult = useCallback(
    (difficulty: number) => applyDifficulty(difficulty),
    [applyDifficulty],
  );

  const record = useCallback((outcome: DdaOutcome, tags?: QuestionDifficultyTags) => {
    const predicted = nextDdaState(state, outcome, tags);
    setState((previous) => {
      const next = nextDdaState(previous, outcome, tags);
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
      skillWindows: state.skillWindows,
      focusSkillKey: state.focusSkillKey,
      onCorrect: (tags?: QuestionDifficultyTags) => record('correct', tags),
      onWrong: (tags?: QuestionDifficultyTags) => record('wrong', tags),
      applyDifficulty,
      applyDiagnosticResult,
      reset,
    }),
    [
      applyDifficulty,
      applyDiagnosticResult,
      record,
      reset,
      state.consecutiveCorrect,
      state.consecutiveWrong,
      state.difficulty,
      state.focusSkillKey,
      state.recentWindow,
      state.skillWindows,
    ],
  );
}
