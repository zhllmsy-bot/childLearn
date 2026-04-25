import type {
  Question,
  QuestionLevel,
  QuestionOption,
  QuestionVariant,
} from './types';
import { buildCompareQuestion } from './variants/compare';
import { buildMakeTenQuestion } from './variants/makeTen';
import { buildMatchingQuestion } from './variants/matching';
import { buildMissingQuestion } from './variants/missing';
import { buildNumberLineQuestion } from './variants/numberLine';
import { buildStoryQuestion } from './variants/story';
import {
  getMathProgressionBand,
  getVariantsForProgressionLane,
} from './mathProgression';

export interface GenerateQuestionInput {
  difficulty: number;
  serial: number;
  variant?: QuestionVariant;
  rng?: () => number;
}

function randomInt(min: number, max: number, rng: () => number) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function shuffle<T>(items: T[], rng: () => number) {
  return [...items].sort(() => rng() - 0.5);
}

function variantCycleForDifficulty(difficulty: number) {
  return getVariantsForProgressionLane(difficulty, 'current');
}

function shouldAvoidCompareVariant(difficulty: number) {
  return difficulty >= 7;
}

function selectVariantForDifficulty(
  difficulty: number,
  serial: number,
  preferredVariant?: QuestionVariant,
) {
  const variantCycle = variantCycleForDifficulty(difficulty);
  const selectedVariant = preferredVariant ?? variantCycle[serial % variantCycle.length];

  if (selectedVariant !== 'compare' || !shouldAvoidCompareVariant(difficulty)) {
    return selectedVariant;
  }

  const fallbackCycle = variantCycle.filter((variant) => variant !== 'compare');
  return fallbackCycle[serial % fallbackCycle.length] ?? 'numberLine';
}

function levelForDifficulty(difficulty: number): QuestionLevel {
  return getMathProgressionBand(difficulty).level;
}

function quantityRangeForDifficulty(difficulty: number) {
  return getMathProgressionBand(difficulty).quantityRange;
}

function totalRangeForDifficulty(difficulty: number) {
  return getMathProgressionBand(difficulty).totalRange;
}

function splitTotal(total: number, difficulty: number, rng: () => number) {
  const maxPart = getMathProgressionBand(difficulty).maxPart;
  const first = randomInt(
    Math.max(1, total - maxPart),
    Math.min(maxPart, total - 1),
    rng,
  );
  return { first, second: total - first };
}

export function buildOptions(
  answer: number,
  maxValue: number,
  rng: () => number = Math.random,
): QuestionOption[] {
  const candidates = new Set<number>([answer]);
  const nearOffsets = shuffle([-1, 1], rng);
  const offsets = shuffle([-3, -2, 2, 3, 4, -4], rng);

  nearOffsets.forEach((offset) => {
    const next = answer + offset;
    if (next >= 0 && next <= maxValue) {
      candidates.add(next);
    }
  });

  offsets.forEach((offset) => {
    if (candidates.size >= 4) {
      return;
    }

    const next = answer + offset;
    if (next >= 0 && next <= maxValue) {
      candidates.add(next);
    }
  });

  while (candidates.size < 4) {
    candidates.add(randomInt(0, maxValue, rng));
  }

  return shuffle([...candidates], rng).map((value) => ({
    id: `option-${value}`,
    label: String(value),
    value,
  }));
}

export function generateQuestion({
  difficulty,
  serial,
  variant: preferredVariant,
  rng = Math.random,
}: GenerateQuestionInput): Question {
  const level = levelForDifficulty(difficulty);
  const variant = selectVariantForDifficulty(difficulty, serial, preferredVariant);
  const quantityRange = quantityRangeForDifficulty(difficulty);
  const totalRange = totalRangeForDifficulty(difficulty);
  const maxFact = quantityRange.max;

  if (variant === 'matching') {
    const count = randomInt(quantityRange.min, quantityRange.max, rng);
    return buildMatchingQuestion(count, level, buildOptions(count, maxFact, rng));
  }

  if (variant === 'compare') {
    const delta = difficulty >= 7 ? 1 : randomInt(1, 3, rng);
    const left = randomInt(quantityRange.min, quantityRange.max - delta, rng);
    const right = left + delta;
    const answer = Math.max(left, right);
    return buildCompareQuestion(
      left,
      right,
      level,
      buildOptions(answer, maxFact, rng),
    );
  }

  if (variant === 'makeTen') {
    const start = randomInt(1, 9, rng);
    return buildMakeTenQuestion(start, level, buildOptions(10 - start, 10, rng));
  }

  if (variant === 'missing') {
    const total = randomInt(totalRange.min, totalRange.max, rng);
    const { first, second: missing } = splitTotal(total, difficulty, rng);
    return buildMissingQuestion(
      first,
      missing,
      level,
      buildOptions(missing, maxFact, rng),
    );
  }

  if (variant === 'story') {
    const total = randomInt(totalRange.min, totalRange.max, rng);
    const { first, second } = splitTotal(total, difficulty, rng);
    return buildStoryQuestion(
      first,
      second,
      level,
      buildOptions(first + second, maxFact, rng),
    );
  }

  const end = randomInt(Math.max(3, totalRange.min), totalRange.max, rng);
  const maxJump = Math.min(difficulty >= 9 ? 8 : difficulty >= 6 ? 6 : 4, end - 1);
  const jump = randomInt(Math.min(2, maxJump), maxJump, rng);
  const start = end - jump;
  return buildNumberLineQuestion(
    start,
    end,
    level,
    buildOptions(jump, maxFact, rng),
  );
}
