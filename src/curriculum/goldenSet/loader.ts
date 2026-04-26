import { GOLDEN_SET_SEED } from './seed';
import type { GoldenSetItem } from './types';

let testItems: GoldenSetItem[] | null = null;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function loadGoldenSetItems(): GoldenSetItem[] {
  return clone(testItems ?? GOLDEN_SET_SEED);
}

export function findGoldenSetItemById(id: string): GoldenSetItem | null {
  return loadGoldenSetItems().find((item) => item.id === id) ?? null;
}

export function setGoldenSetItemsForTests(items: GoldenSetItem[] | null) {
  testItems = items ? clone(items) : null;
}
