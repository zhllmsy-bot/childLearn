import { describe, expect, it } from 'vitest';
import {
  canGoForward,
  collectOnTile,
  jumpPosition,
  nextPosition,
  positionKey,
} from './worldOps';
import type { InterpreterWorld } from './types';

const WORLD: InterpreterWorld = {
  width: 5,
  height: 5,
  start: { x: 0, y: 0 },
  direction: 'east',
  target: { x: 4, y: 4 },
  obstacles: [{ x: 1, y: 0 }],
};

describe('worldOps', () => {
  it('calculates forward and jump positions without mutating input', () => {
    const position = { x: 1, y: 2 };

    expect(nextPosition(position, 'east')).toEqual({ x: 2, y: 2 });
    expect(jumpPosition(position, 'north')).toEqual({ x: 1, y: 0 });
    expect(position).toEqual({ x: 1, y: 2 });
  });

  it('checks forward movement against walls and obstacles', () => {
    expect(canGoForward(WORLD, {
      position: { x: 0, y: 0 },
      direction: 'east',
    })).toBe(false);

    expect(canGoForward(WORLD, {
      position: { x: 0, y: 1 },
      direction: 'east',
    })).toBe(true);

    expect(canGoForward(WORLD, {
      position: { x: 0, y: 0 },
      direction: 'north',
    })).toBe(false);
  });

  it('collects only the gem on the current tile', () => {
    const gems = [
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ];

    expect(collectOnTile(gems, { x: 1, y: 1 })).toEqual({
      collected: true,
      remainingGems: [{ x: 2, y: 1 }],
    });
    expect(collectOnTile(gems, { x: 0, y: 0 })).toEqual({
      collected: false,
      remainingGems: gems,
    });
  });

  it('uses stable position keys for sets and maps', () => {
    expect(positionKey({ x: 3, y: 4 })).toBe('3:4');
  });
});
