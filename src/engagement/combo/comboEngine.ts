export interface ComboState {
  current: number;
  maxEver: number;
}

export const INITIAL_COMBO_STATE: ComboState = {
  current: 0,
  maxEver: 0,
};

export function hitCombo(state: ComboState): ComboState {
  const current = state.current + 1;
  return {
    current,
    maxEver: Math.max(state.maxEver, current),
  };
}

export function missCombo(state: ComboState): ComboState {
  return {
    current: state.current,
    maxEver: state.maxEver,
  };
}
