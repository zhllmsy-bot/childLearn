import { describe, expect, it } from 'vitest';
import { PROGRAMMING_LEVELS } from './programmingLevels';
import { buildExecutionFrames } from './engine/interpreter';
import type { CommandKind } from './engine/types';
import { containsKind } from './blocks';

function levelWorld(level: (typeof PROGRAMMING_LEVELS)[number]) {
  return {
    width: level.width ?? 5,
    height: level.height ?? 5,
    start: level.start,
    direction: level.direction,
    target: level.target,
    obstacles: level.obstacles,
    gems: level.gems ?? [],
    requiresAllGems: level.requiresAllGems,
    procedures: level.procedures,
  };
}

describe('programming levels', () => {
  it('ships enough levels to exercise interpreter concepts', () => {
    expect(PROGRAMMING_LEVELS.length).toBeGreaterThanOrEqual(10);
    const requiredKinds = new Set(
      PROGRAMMING_LEVELS.flatMap((level) => level.requiredKinds ?? []),
    );

    const expectedKinds: CommandKind[] = [
      'repeat',
      'ifPath',
      'collect',
      'ifGem',
      'whileNotGoal',
      'jump',
      'procCall',
    ];

    expectedKinds.forEach((kind) => {
      expect(requiredKinds.has(kind)).toBe(true);
    });
  });

  it('keeps sample programs runnable and aligned with required concepts', () => {
    PROGRAMMING_LEVELS.forEach((level) => {
      const frames = buildExecutionFrames(level.sampleProgram, levelWorld(level));
      expect(frames[frames.length - 1], level.id).toMatchObject({ status: 'success' });
      (level.requiredKinds ?? []).forEach((kind) => {
        expect(containsKind(level.sampleProgram, kind), `${level.id}:${kind}`).toBe(true);
      });
      expect(level.starThresholds?.threeStarsMaxSteps).toBeLessThanOrEqual(
        level.starThresholds?.twoStarsMaxSteps ?? Number.POSITIVE_INFINITY,
      );
    });
  });
});
