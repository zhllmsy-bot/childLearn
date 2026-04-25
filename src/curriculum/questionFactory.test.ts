import { describe, expect, it } from 'vitest';
import { buildOptions, generateQuestion } from './questionFactory';

function fixedRng(value: number) {
  return () => value;
}

describe('questionFactory', () => {
  it('creates four unique options including the answer', () => {
    const options = buildOptions(5, 10, fixedRng(0.42));
    const values = options.map((option) => option.value);

    expect(options).toHaveLength(4);
    expect(values).toContain(5);
    expect(new Set(values).size).toBe(4);
  });

  it('uses visual-first variants in the early part-whole band', () => {
    const variants = Array.from({ length: 4 }, (_, serial) =>
      generateQuestion({ difficulty: 4, serial, rng: fixedRng(0.35) }).variant,
    );

    expect(variants).toEqual(['matching', 'compare', 'missing', 'makeTen']);
  });

  it('uses higher-load variants at the top difficulty band', () => {
    const variants = Array.from({ length: 4 }, (_, serial) =>
      generateQuestion({ difficulty: 10, serial, rng: fixedRng(0.35) }).variant,
    );

    expect(variants).toEqual(['missing', 'story', 'numberLine', 'missing']);
    expect(variants).not.toContain('matching');
    expect(variants).not.toContain('makeTen');
    expect(variants).not.toContain('compare');
  });

  it('does not generate simple compare prompts in advanced bands', () => {
    const variants = Array.from({ length: 12 }, (_, serial) =>
      generateQuestion({ difficulty: 8, serial, rng: fixedRng(0.35) }).variant,
    );
    const explicitCompare = generateQuestion({
      difficulty: 10,
      serial: 0,
      variant: 'compare',
      rng: fixedRng(0.35),
    });

    expect(variants).not.toContain('compare');
    expect(explicitCompare.variant).not.toBe('compare');
  });

  it('scales top difficulty quantities beyond the early counting range', () => {
    const matching = generateQuestion({
      difficulty: 10,
      serial: 0,
      variant: 'matching',
      rng: fixedRng(0),
    });
    const story = generateQuestion({
      difficulty: 10,
      serial: 0,
      variant: 'story',
      rng: fixedRng(0),
    });

    expect(matching.answer).toBeGreaterThanOrEqual(8);
    expect(story.answer).toBeGreaterThanOrEqual(10);
  });

  it('keeps mid-difficulty addition in the ten-frame range', () => {
    const story = generateQuestion({
      difficulty: 6,
      serial: 0,
      variant: 'story',
      rng: fixedRng(0.999),
    });

    expect(story.answer).toBeLessThanOrEqual(10);
  });

  it('keeps top difficulty results within thirty', () => {
    const rng = fixedRng(0.999);
    const questions = [
      generateQuestion({ difficulty: 10, serial: 0, variant: 'matching', rng }),
      generateQuestion({ difficulty: 10, serial: 0, variant: 'compare', rng }),
      generateQuestion({ difficulty: 10, serial: 0, variant: 'missing', rng }),
      generateQuestion({ difficulty: 10, serial: 0, variant: 'story', rng }),
      generateQuestion({ difficulty: 10, serial: 0, variant: 'numberLine', rng }),
    ];

    questions.forEach((question) => {
      const maxValue = Math.max(
        question.answer,
        ...question.options.map((option) => option.value),
        ...question.barModel,
        question.comparePair?.left ?? 0,
        question.comparePair?.right ?? 0,
        question.numberLine?.end ?? 0,
      );

      expect(maxValue).toBeLessThanOrEqual(30);
    });
    expect(questions.some((question) => question.barModel.reduce((sum, part) => sum + part, 0) > 20)).toBe(
      true,
    );
  });

  it('keeps every generated answer inside its options', () => {
    Array.from({ length: 18 }, (_, serial) =>
      generateQuestion({ difficulty: 7, serial, rng: fixedRng(0.55) }),
    ).forEach((question) => {
      expect(question.options.some((option) => option.value === question.answer)).toBe(
        true,
      );
    });
  });

  it('does not print the answer into quantity matching prompts', () => {
    const question = generateQuestion({
      difficulty: 5,
      serial: 0,
      variant: 'matching',
      rng: fixedRng(0.2),
    });

    expect(question.variant).toBe('matching');
    expect(question.expression).toBe('?');
    expect(question.expression).not.toBe(String(question.answer));
  });

  it('can generate a requested variant for adaptive selection', () => {
    const question = generateQuestion({
      difficulty: 4,
      serial: 0,
      variant: 'story',
      rng: fixedRng(0.25),
    });

    expect(question.variant).toBe('story');
  });
});
