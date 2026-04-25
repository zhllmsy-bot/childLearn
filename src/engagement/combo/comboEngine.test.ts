import { describe, expect, it } from 'vitest';
import { hitCombo, INITIAL_COMBO_STATE, missCombo } from './comboEngine';

describe('comboEngine', () => {
  it('increments current combo and max combo', () => {
    const first = hitCombo(INITIAL_COMBO_STATE);
    const second = hitCombo(first);

    expect(second.current).toBe(2);
    expect(second.maxEver).toBe(2);
  });

  it('resets current combo on miss while preserving maxEver', () => {
    const next = missCombo({ current: 34, maxEver: 34 });

    expect(next.current).toBe(0);
    expect(next.maxEver).toBe(34);
  });

  it('never goes below zero after a miss', () => {
    const next = missCombo(INITIAL_COMBO_STATE);

    expect(next.current).toBe(0);
    expect(next.maxEver).toBe(0);
  });
});
