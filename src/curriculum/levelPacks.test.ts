import { describe, expect, it } from 'vitest';
import {
  LEVEL_PACKS,
  getLevelPackForDifficulty,
  selectLevelPackQuestionPlan,
  validateLevelPacks,
} from './levelPacks';

describe('levelPacks', () => {
  it('keeps every pack short enough for a young child session', () => {
    LEVEL_PACKS.forEach((pack) => {
      expect(pack.items.length).toBeGreaterThanOrEqual(6);
      expect(pack.items.length).toBeLessThanOrEqual(8);
    });
  });

  it('references only known math skills', () => {
    expect(validateLevelPacks()).toBe(true);
  });

  it('selects a pack from the math progression band', () => {
    expect(getLevelPackForDifficulty(1).id).toBe('orchard-count-5');
    expect(getLevelPackForDifficulty(4).id).toBe('basket-bonds-10');
    expect(getLevelPackForDifficulty(6).id).toBe('ten-frame-result');
    expect(getLevelPackForDifficulty(8).id).toBe('teen-bridge-20');
    expect(getLevelPackForDifficulty(10).id).toBe('thirty-extension');
  });

  it('keeps the first four-year-old pack visual and concrete', () => {
    const variants = LEVEL_PACKS.find((pack) => pack.id === 'orchard-count-5')
      ?.items.map((item) => item.variant);

    expect(variants).toEqual([
      'matching',
      'compare',
      'matching',
      'missing',
      'compare',
      'matching',
    ]);
  });

  it('uses the pack to choose the task variant while preserving adaptive difficulty', () => {
    const plan = selectLevelPackQuestionPlan({
      packId: 'thirty-extension',
      difficulty: 9,
      serial: 1,
    });

    expect(plan).toEqual({
      packId: 'thirty-extension',
      skillId: 'within_30_counting_on',
      role: 'core',
      flowLane: 'current',
      variant: 'numberLine',
      difficulty: 9,
    });
  });

  it('does not schedule simple compare variants in advanced packs', () => {
    const advancedPackIds = ['teen-bridge-20', 'thirty-extension'] as const;

    advancedPackIds.forEach((packId) => {
      const pack = LEVEL_PACKS.find((item) => item.id === packId);
      const directVariants = pack?.items.map((item) => item.variant) ?? [];
      const plannedVariants = Array.from({ length: 8 }, (_, serial) =>
        selectLevelPackQuestionPlan({
          packId,
          difficulty: packId === 'teen-bridge-20' ? 8 : 10,
          serial,
          flowLane: 'challenge',
          flowVariant: 'compare',
        }).variant,
      );

      expect(directVariants).not.toContain('compare');
      expect(plannedVariants).not.toContain('compare');
    });
  });

  it('lets the flow lane lower pressure inside a fixed pack slot', () => {
    const plan = selectLevelPackQuestionPlan({
      packId: 'teen-bridge-20',
      difficulty: 7,
      serial: 3,
      flowLane: 'confidence',
      flowVariant: 'makeTen',
    });

    expect(plan.skillId).toBe('within_20_missing_part');
    expect(plan.role).toBe('challenge');
    expect(plan.flowLane).toBe('confidence');
    expect(plan.variant).toBe('makeTen');
  });

  it('lets the flow lane raise pressure without changing the pack identity', () => {
    const plan = selectLevelPackQuestionPlan({
      packId: 'basket-bonds-10',
      difficulty: 5,
      serial: 1,
      flowLane: 'challenge',
      flowVariant: 'story',
    });

    expect(plan.packId).toBe('basket-bonds-10');
    expect(plan.skillId).toBe('compare_quantities_to_10');
    expect(plan.flowLane).toBe('challenge');
    expect(plan.variant).toBe('story');
  });
});
