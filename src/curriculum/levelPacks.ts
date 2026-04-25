import type { QuestionVariant } from './types';
import type { MathSkillId } from './skillGraph';
import { isMathSkillId } from './skillGraph';
import { getMathProgressionBand } from './mathProgression';

export type LevelPackId =
  | 'orchard-count-5'
  | 'basket-bonds-10'
  | 'ten-frame-result'
  | 'teen-bridge-20'
  | 'thirty-extension';

export interface LevelPackItem {
  skillId: MathSkillId;
  variant: QuestionVariant;
  role: LevelPackSlotRole;
}

export type LevelPackSlotRole = 'warmup' | 'core' | 'challenge' | 'recovery';
export type LevelPackFlowLane = 'confidence' | 'review' | 'current' | 'challenge';

export interface LevelPack {
  id: LevelPackId;
  progressionBandId: ReturnType<typeof getMathProgressionBand>['id'];
  title: string;
  shortGoal: string;
  items: LevelPackItem[];
}

export interface LevelPackQuestionPlan {
  packId: LevelPackId;
  skillId: MathSkillId;
  role: LevelPackSlotRole;
  flowLane: LevelPackFlowLane;
  variant: QuestionVariant;
  difficulty: number;
}

export const LEVEL_PACKS: LevelPack[] = [
  {
    id: 'orchard-count-5',
    progressionBandId: 'count_compare_to_5',
    title: '小果篮数一数',
    shortGoal: '5以内点数和多少比较',
    items: [
      { skillId: 'count_objects_to_5', variant: 'matching', role: 'warmup' },
      { skillId: 'compare_quantities_to_5', variant: 'compare', role: 'core' },
      { skillId: 'count_objects_to_5', variant: 'matching', role: 'recovery' },
      { skillId: 'part_whole_to_5', variant: 'missing', role: 'challenge' },
      { skillId: 'compare_quantities_to_5', variant: 'compare', role: 'core' },
      { skillId: 'count_objects_to_5', variant: 'matching', role: 'recovery' },
    ],
  },
  {
    id: 'basket-bonds-10',
    progressionBandId: 'part_whole_to_10',
    title: '十个水果分一分',
    shortGoal: '10以内数量、比较、合成分解',
    items: [
      { skillId: 'count_objects_to_10', variant: 'matching', role: 'warmup' },
      { skillId: 'compare_quantities_to_10', variant: 'compare', role: 'core' },
      { skillId: 'part_whole_to_10', variant: 'missing', role: 'core' },
      { skillId: 'make_10', variant: 'makeTen', role: 'core' },
      { skillId: 'result_addition_to_10', variant: 'story', role: 'challenge' },
      { skillId: 'part_whole_to_10', variant: 'missing', role: 'core' },
      { skillId: 'compare_quantities_to_10', variant: 'compare', role: 'recovery' },
      { skillId: 'make_10', variant: 'makeTen', role: 'recovery' },
    ],
  },
  {
    id: 'ten-frame-result',
    progressionBandId: 'result_to_10',
    title: '十框加法小任务',
    shortGoal: '10以内求和、补数、数轴',
    items: [
      { skillId: 'result_addition_to_10', variant: 'story', role: 'warmup' },
      { skillId: 'part_whole_to_10', variant: 'missing', role: 'core' },
      { skillId: 'number_line_distance_to_10', variant: 'numberLine', role: 'core' },
      { skillId: 'make_10', variant: 'makeTen', role: 'recovery' },
      { skillId: 'compare_quantities_to_10', variant: 'compare', role: 'recovery' },
      { skillId: 'result_addition_to_10', variant: 'story', role: 'challenge' },
      { skillId: 'part_whole_to_10', variant: 'missing', role: 'core' },
      { skillId: 'number_line_distance_to_10', variant: 'numberLine', role: 'challenge' },
    ],
  },
  {
    id: 'teen-bridge-20',
    progressionBandId: 'within_20_bridge',
    title: '二十以内接着数',
    shortGoal: '20以内接着数、情境求和、缺失部分',
    items: [
      { skillId: 'within_20_counting_on', variant: 'numberLine', role: 'warmup' },
      { skillId: 'within_20_counting_on', variant: 'numberLine', role: 'core' },
      { skillId: 'within_20_counting_on', variant: 'story', role: 'core' },
      { skillId: 'within_20_missing_part', variant: 'missing', role: 'challenge' },
      { skillId: 'within_20_counting_on', variant: 'numberLine', role: 'recovery' },
      { skillId: 'within_20_missing_part', variant: 'missing', role: 'recovery' },
      { skillId: 'within_20_counting_on', variant: 'story', role: 'core' },
      { skillId: 'within_20_missing_part', variant: 'missing', role: 'challenge' },
    ],
  },
  {
    id: 'thirty-extension',
    progressionBandId: 'within_30_extension',
    title: '三十以内小探险',
    shortGoal: '30以内扩展，数轴和缺失部分',
    items: [
      { skillId: 'within_30_counting_on', variant: 'numberLine', role: 'warmup' },
      { skillId: 'within_30_counting_on', variant: 'numberLine', role: 'core' },
      { skillId: 'within_30_counting_on', variant: 'story', role: 'core' },
      { skillId: 'within_30_missing_part', variant: 'missing', role: 'challenge' },
      { skillId: 'within_30_counting_on', variant: 'numberLine', role: 'recovery' },
      { skillId: 'within_30_missing_part', variant: 'missing', role: 'recovery' },
      { skillId: 'within_30_counting_on', variant: 'story', role: 'core' },
      { skillId: 'within_30_missing_part', variant: 'missing', role: 'challenge' },
    ],
  },
];

const PACK_IDS = new Set<LevelPackId>(LEVEL_PACKS.map((pack) => pack.id));

export function isLevelPackId(value: unknown): value is LevelPackId {
  return typeof value === 'string' && PACK_IDS.has(value as LevelPackId);
}

export function getLevelPackById(packId: LevelPackId): LevelPack {
  return LEVEL_PACKS.find((pack) => pack.id === packId) ?? LEVEL_PACKS[0];
}

export function getLevelPackForDifficulty(difficulty: number): LevelPack {
  const band = getMathProgressionBand(difficulty);
  return (
    LEVEL_PACKS.find((pack) => pack.progressionBandId === band.id) ??
    LEVEL_PACKS[0]
  );
}

export function selectLevelPackItem(
  packId: LevelPackId,
  serial: number,
): LevelPackItem {
  const pack = getLevelPackById(packId);
  return pack.items[serial % pack.items.length];
}

function variantForFlowLane(
  item: LevelPackItem,
  pack: LevelPack,
  flowLane: LevelPackFlowLane,
  flowVariant?: QuestionVariant,
) {
  const requestedVariant = flowVariant ?? item.variant;
  const isAdvancedPack =
    pack.progressionBandId === 'within_20_bridge' ||
    pack.progressionBandId === 'within_30_extension';

  if (isAdvancedPack && requestedVariant === 'compare') {
    return item.variant === 'compare' ? 'numberLine' : item.variant;
  }

  if (flowLane === 'confidence' || flowLane === 'review') {
    return flowVariant ?? (item.role === 'challenge' ? 'matching' : item.variant);
  }

  if (flowLane === 'challenge' && item.role !== 'recovery') {
    return flowVariant ?? item.variant;
  }

  return item.variant;
}

export function selectLevelPackQuestionPlan({
  packId,
  difficulty,
  serial,
  flowLane = 'current',
  flowVariant,
}: {
  packId: LevelPackId;
  difficulty: number;
  serial: number;
  flowLane?: LevelPackFlowLane;
  flowVariant?: QuestionVariant;
}): LevelPackQuestionPlan {
  const pack = getLevelPackById(packId);
  const item = pack.items[serial % pack.items.length];

  return {
    packId,
    skillId: item.skillId,
    role: item.role,
    flowLane,
    variant: variantForFlowLane(item, pack, flowLane, flowVariant),
    difficulty,
  };
}

export function validateLevelPacks() {
  return LEVEL_PACKS.every((pack) =>
    pack.items.every(
      (item) =>
        isMathSkillId(item.skillId) &&
        ['warmup', 'core', 'challenge', 'recovery'].includes(item.role),
    ),
  );
}
