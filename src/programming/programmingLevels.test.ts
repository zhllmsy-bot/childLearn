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
    expect(PROGRAMMING_LEVELS.length).toBeGreaterThanOrEqual(25);
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

  it('keeps the 5-world progression annotated for curriculum planning', () => {
    const worlds = new Set(PROGRAMMING_LEVELS.map((level) => level.worldId));

    expect(worlds).toEqual(new Set(['forest', 'meadow', 'cave', 'canyon', 'tower']));
    worlds.forEach((worldId) => {
      const worldLevels = PROGRAMMING_LEVELS.filter((level) => level.worldId === worldId);
      expect(worldLevels.length).toBeGreaterThanOrEqual(5);
      expect(worldLevels.some((level) => level.isBoss), worldId).toBe(true);
    });

    PROGRAMMING_LEVELS.forEach((level) => {
      expect(level.conceptTags.length, level.id).toBeGreaterThan(0);
      expect(level.difficultyStars, level.id).toBeGreaterThanOrEqual(1);
      expect(level.difficultyStars, level.id).toBeLessThanOrEqual(5);
      expect(level.optimalSteps, level.id).toBeGreaterThan(0);
      expect(level.starThresholds, level.id).toBeTruthy();
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
