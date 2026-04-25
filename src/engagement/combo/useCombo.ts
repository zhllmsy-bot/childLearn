import { useCallback, useMemo, useState } from 'react';
import { scheduleLearningStateSync } from '../../sync/learningStateSync';
import { track } from '../../telemetry/track';
import {
  hitCombo,
  INITIAL_COMBO_STATE,
  missCombo,
  type ComboState,
} from './comboEngine';

const MILESTONES = new Set([3, 5, 10, 15, 20, 30, 50]);
const LEGACY_MAX_STORAGE_KEY = 'childlearn.combo-max';
const STORAGE_KEY = 'childlearn.combo-state';

function readStoredComboState(): ComboState {
  if (typeof window === 'undefined') {
    return INITIAL_COMBO_STATE;
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<ComboState>;
    const current = Number(parsed.current ?? 0);
    const maxEver = Number(
      parsed.maxEver ?? window.localStorage.getItem(LEGACY_MAX_STORAGE_KEY) ?? 0,
    );

    return {
      current: Number.isFinite(current) ? Math.max(0, Math.round(current)) : 0,
      maxEver: Number.isFinite(maxEver) ? Math.max(0, Math.round(maxEver)) : 0,
    };
  } catch {
    const stored = Number(window.localStorage.getItem(LEGACY_MAX_STORAGE_KEY) ?? 0);
    return {
      current: 0,
      maxEver: Number.isFinite(stored) && stored > 0 ? stored : 0,
    };
  }
}

function writeStoredComboState(state: ComboState) {
  if (typeof window === 'undefined') {
    return;
  }

  const next = {
    current: Math.max(state.current, 0),
    maxEver: Math.max(state.maxEver, 0),
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.localStorage.setItem(LEGACY_MAX_STORAGE_KEY, String(next.maxEver));
  scheduleLearningStateSync('combo');
}

export function useCombo() {
  const [state, setState] = useState<ComboState>(readStoredComboState);

  const hit = useCallback(() => {
    const predicted = hitCombo(state);
    setState((previous) => {
      const next = hitCombo(previous);
      writeStoredComboState(next);
      track('combo.hit', { current: next.current, max: next.maxEver });
      if (MILESTONES.has(next.current)) {
        track('combo.milestone', { value: next.current });
      }
      return next;
    });
    return predicted.current;
  }, [state]);

  const miss = useCallback(() => {
    setState((previous) => {
      const next = missCombo(previous);
      writeStoredComboState(next);
      track('combo.reset', {
        from: previous.current,
        to: next.current,
        max: previous.maxEver,
      });
      return next;
    });
  }, []);

  const endRun = useCallback(() => {
    setState((previous) => {
      const next = { current: 0, maxEver: previous.maxEver };
      writeStoredComboState(next);
      return next;
    });
  }, []);

  const resetAll = useCallback(() => {
    writeStoredComboState(INITIAL_COMBO_STATE);
    setState(INITIAL_COMBO_STATE);
  }, []);

  return useMemo(
    () => ({
      current: state.current,
      maxEver: state.maxEver,
      hit,
      miss,
      endRun,
      resetAll,
    }),
    [endRun, hit, miss, resetAll, state.current, state.maxEver],
  );
}
