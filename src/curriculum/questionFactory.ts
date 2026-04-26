import type { LearnerSkillKey } from '../ai/learnerModel';
import { goldenSetItemToQuestion, selectGoldenSetItem } from './goldenSet';
import { parentItemToQuestion, selectParentItem } from './parentItems';
import type { ParentItem } from './parentItems/types';
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
  goldenMode?: 'off' | 'eligible' | 'required';
  goldenTags?: string[];
  parentItemMode?: 'off' | 'eligible';
  parentItems?: ParentItem[];
  serial: number;
  targetSkillKey?: LearnerSkillKey;
  variant?: QuestionVariant;
  rng?: () => number;
  childId?: string;
}

interface CandidateOptionInput {
  answer: number;
  candidates: number[];
  maxValue: number;
  minValue?: number;
  rng?: () => number;
}

function randomInt(min: number, max: number, rng: () => number) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function shuffle<T>(items: T[], rng: () => number) {
  return [...items].sort(() => rng() - 0.5);
}

function ensureOptionValues(
  values: Set<number>,
  minValue: number,
  maxValue: number,
  rng: () => number,
) {
  const fallbackPool = shuffle(
    Array.from({ length: Math.max(maxValue - minValue + 1, 0) }, (_, index) => minValue + index),
    rng,
  );
  fallbackPool.forEach((value) => {
    if (values.size < 4) {
      values.add(value);
    }
  });

  let spill = maxValue + 1;
  while (values.size < 4) {
    values.add(spill);
    spill += 1;
  }
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

  ensureOptionValues(candidates, 0, maxValue, rng);

  return shuffle(Array.from(candidates), rng).map((value) => ({
    id: `option-${value}`,
    label: String(value),
    value,
  }));
}

function buildCandidateOptions({
  answer,
  candidates,
  maxValue,
  minValue = 0,
  rng = Math.random,
}: CandidateOptionInput): QuestionOption[] {
  const values = new Set<number>([answer]);

  candidates.forEach((value) => {
    const rounded = Math.round(value);
    if (rounded >= minValue && rounded <= maxValue) {
      values.add(rounded);
    }
  });

  ensureOptionValues(values, minValue, maxValue, rng);

  return shuffle(Array.from(values).slice(0, 4), rng).map((value) => ({
    id: `option-${value}`,
    label: String(value),
    value,
  }));
}

function buildVariantOptions(
  variant: QuestionVariant,
  params: {
    answer: number;
    end?: number;
    first?: number;
    left?: number;
    maxValue: number;
    missing?: number;
    right?: number;
    start?: number;
    total?: number;
  },
  rng: () => number,
): QuestionOption[] {
  const { answer, maxValue } = params;

  if (variant === 'compare') {
    const left = params.left ?? answer;
    const right = params.right ?? answer;
    const smaller = Math.min(left, right);
    const larger = Math.max(left, right);
    const gap = Math.max(larger - smaller, 1);
    return buildCandidateOptions({
      answer,
      candidates: [smaller, larger - 1, gap, larger + 1],
      maxValue,
      minValue: 0,
      rng,
    });
  }

  if (variant === 'makeTen') {
    const start = params.start ?? 0;
    return buildCandidateOptions({
      answer,
      candidates: [start, answer - 1, answer + 1, 10],
      maxValue: Math.max(maxValue, 10),
      minValue: 0,
      rng,
    });
  }

  if (variant === 'missing') {
    const first = params.first ?? 0;
    const total = params.total ?? answer;
    return buildCandidateOptions({
      answer,
      candidates: [first, answer - 1, total, answer + 1],
      maxValue: Math.max(maxValue, total),
      minValue: 0,
      rng,
    });
  }

  if (variant === 'story') {
    const first = params.first ?? 0;
    const second = params.missing ?? 0;
    const difference = Math.abs(first - second);
    return buildCandidateOptions({
      answer,
      candidates: [first, second, answer - 1, difference, answer + 1],
      maxValue,
      minValue: 0,
      rng,
    });
  }

  if (variant === 'numberLine') {
    const start = params.start ?? 0;
    const end = params.end ?? answer;
    return buildCandidateOptions({
      answer,
      candidates: [start, answer - 1, answer + 1, end],
      maxValue: Math.max(maxValue, end),
      minValue: 0,
      rng,
    });
  }

  return buildCandidateOptions({
    answer,
    candidates: [answer - 1, answer + 1, answer - 2, answer + 2],
    maxValue,
    minValue: 0,
    rng,
  });
}

export function generateQuestion({
  difficulty,
  goldenMode = 'off',
  goldenTags,
  parentItemMode = 'off',
  parentItems,
  serial,
  targetSkillKey,
  variant: preferredVariant,
  rng = Math.random,
  childId = 'local-child',
}: GenerateQuestionInput): Question {
  const level = levelForDifficulty(difficulty);
  const variant = selectVariantForDifficulty(difficulty, serial, preferredVariant);
  const quantityRange = quantityRangeForDifficulty(difficulty);
  const totalRange = totalRangeForDifficulty(difficulty);
  const maxFact = quantityRange.max;
  const optionMaxValue = Math.max(maxFact, totalRange.max, 10);

  if (goldenMode !== 'required' && parentItemMode === 'eligible') {
    const parentItem = selectParentItem({
      childId,
      difficulty,
      items: parentItems,
      serial,
      targetSkillKey,
      variant,
    });

    if (parentItem) {
      return parentItemToQuestion(parentItem, serial);
    }
  }

  const shouldTryGolden =
    goldenMode === 'required' ||
    (goldenMode === 'eligible' && (variant === 'story' || rng() <= 0.15));
  if (shouldTryGolden) {
    const goldenItem = selectGoldenSetItem({
      difficulty,
      variant,
      targetSkillKey,
      tags: goldenTags,
    });

    if (goldenItem) {
      return goldenSetItemToQuestion(goldenItem, serial);
    }
  }

  if (variant === 'matching') {
    const count = randomInt(quantityRange.min, quantityRange.max, rng);
    return buildMatchingQuestion(
      count,
      level,
      buildVariantOptions(
        'matching',
        {
          answer: count,
          maxValue: optionMaxValue,
        },
        rng,
      ),
    );
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
      buildVariantOptions(
        'compare',
        {
          answer,
          left,
          maxValue: optionMaxValue,
          right,
        },
        rng,
      ),
    );
  }

  if (variant === 'makeTen') {
    const start = randomInt(1, 9, rng);
    return buildMakeTenQuestion(
      start,
      level,
      buildVariantOptions(
        'makeTen',
        {
          answer: 10 - start,
          maxValue: 10,
          start,
        },
        rng,
      ),
    );
  }

  if (variant === 'missing') {
    const total = randomInt(totalRange.min, totalRange.max, rng);
    const { first, second: missing } = splitTotal(total, difficulty, rng);
    return buildMissingQuestion(
      first,
      missing,
      level,
      buildVariantOptions(
        'missing',
        {
          answer: missing,
          first,
          maxValue: Math.max(optionMaxValue, total),
          total,
        },
        rng,
      ),
    );
  }

  if (variant === 'story') {
    const total = randomInt(totalRange.min, totalRange.max, rng);
    const { first, second } = splitTotal(total, difficulty, rng);
    return buildStoryQuestion(
      first,
      second,
      level,
      buildVariantOptions(
        'story',
        {
          answer: first + second,
          first,
          maxValue: Math.max(optionMaxValue, total),
          missing: second,
        },
        rng,
      ),
      rng,
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
    buildVariantOptions(
      'numberLine',
      {
        answer: jump,
        end,
        maxValue: Math.max(optionMaxValue, end),
        start,
      },
      rng,
    ),
  );
}
