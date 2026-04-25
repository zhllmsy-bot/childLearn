import type { QuestionLevel, QuestionVariant } from './types';

export interface MathProgressionRange {
  min: number;
  max: number;
}

export interface MathProgressionBand {
  id:
    | 'count_compare_to_5'
    | 'part_whole_to_10'
    | 'result_to_10'
    | 'within_20_bridge'
    | 'within_30_extension';
  difficulty: MathProgressionRange;
  level: QuestionLevel;
  quantityRange: MathProgressionRange;
  totalRange: MathProgressionRange;
  maxPart: number;
  supportVariants: QuestionVariant[];
  currentVariants: QuestionVariant[];
  challengeVariants: QuestionVariant[];
}

export const MATH_PROGRESSION_BANDS: MathProgressionBand[] = [
  {
    id: 'count_compare_to_5',
    difficulty: { min: 1, max: 2 },
    level: 1,
    quantityRange: { min: 2, max: 5 },
    totalRange: { min: 2, max: 5 },
    maxPart: 5,
    supportVariants: ['matching'],
    currentVariants: ['matching', 'compare'],
    challengeVariants: ['compare', 'missing'],
  },
  {
    id: 'part_whole_to_10',
    difficulty: { min: 3, max: 4 },
    level: 2,
    quantityRange: { min: 3, max: 10 },
    totalRange: { min: 4, max: 10 },
    maxPart: 9,
    supportVariants: ['matching', 'compare'],
    currentVariants: ['matching', 'compare', 'missing', 'makeTen'],
    challengeVariants: ['missing', 'makeTen', 'story'],
  },
  {
    id: 'result_to_10',
    difficulty: { min: 5, max: 6 },
    level: 3,
    quantityRange: { min: 5, max: 10 },
    totalRange: { min: 6, max: 10 },
    maxPart: 9,
    supportVariants: ['matching', 'compare', 'makeTen'],
    currentVariants: ['missing', 'story', 'numberLine', 'makeTen', 'compare'],
    challengeVariants: ['missing', 'story', 'numberLine'],
  },
  {
    id: 'within_20_bridge',
    difficulty: { min: 7, max: 8 },
    level: 4,
    quantityRange: { min: 6, max: 20 },
    totalRange: { min: 8, max: 20 },
    maxPart: 9,
    supportVariants: ['matching', 'makeTen', 'numberLine'],
    currentVariants: ['missing', 'story', 'numberLine', 'makeTen'],
    challengeVariants: ['missing', 'story', 'numberLine'],
  },
  {
    id: 'within_30_extension',
    difficulty: { min: 9, max: 10 },
    level: 5,
    quantityRange: { min: 8, max: 30 },
    totalRange: { min: 10, max: 30 },
    maxPart: 20,
    supportVariants: ['makeTen', 'numberLine', 'missing'],
    currentVariants: ['missing', 'story', 'numberLine'],
    challengeVariants: ['missing', 'story', 'numberLine'],
  },
];

function clampDifficulty(difficulty: number) {
  return Math.min(Math.max(Math.round(difficulty), 1), 10);
}

export function getMathProgressionBand(difficulty: number): MathProgressionBand {
  const normalized = clampDifficulty(difficulty);
  return (
    MATH_PROGRESSION_BANDS.find(
      (band) =>
        normalized >= band.difficulty.min && normalized <= band.difficulty.max,
    ) ?? MATH_PROGRESSION_BANDS[0]
  );
}

export function getVariantsForProgressionLane(
  difficulty: number,
  lane: 'support' | 'current' | 'challenge',
): QuestionVariant[] {
  const band = getMathProgressionBand(difficulty);

  if (lane === 'support') {
    return band.supportVariants;
  }

  if (lane === 'challenge') {
    return band.challengeVariants;
  }

  return band.currentVariants;
}
