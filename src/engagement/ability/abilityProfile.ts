import type { QuestionAttemptRecord, QuestionDifficultyTags } from '../flow';

export const ABILITY_PROFILE_SCHEMA_VERSION = 1;

export type AbilitySkillStatus =
  | 'mastered'
  | 'stable'
  | 'developing'
  | 'challenging'
  | 'observing';

export interface AbilitySkillStats {
  key: string;
  label: string;
  category: string;
  attempts: number;
  firstTryCorrect: number;
  finalCorrect: number;
  hintUsed: number;
  audioReplayUsed: number;
  totalFirstResponseTimeMs: number;
  totalTimeMs: number;
  slowCount: number;
  lastSeenAt: number;
}

export interface AbilityProfile {
  schemaVersion: typeof ABILITY_PROFILE_SCHEMA_VERSION;
  updatedAt: number;
  totalCompletedQuestions: number;
  skills: Record<string, AbilitySkillStats>;
}

export interface AbilitySkillAssessment extends AbilitySkillStats {
  firstTryAccuracy: number;
  finalAccuracy: number;
  hintRate: number;
  audioReplayRate: number;
  avgFirstResponseTimeMs: number;
  status: AbilitySkillStatus;
}

export interface AbilityAssessment {
  totalCompletedQuestions: number;
  readiness: AbilitySkillStatus;
  mastered: AbilitySkillAssessment[];
  stable: AbilitySkillAssessment[];
  focus: AbilitySkillAssessment[];
  observing: AbilitySkillAssessment[];
}

const INITIAL_PROFILE: AbilityProfile = {
  schemaVersion: ABILITY_PROFILE_SCHEMA_VERSION,
  updatedAt: 0,
  totalCompletedQuestions: 0,
  skills: {},
};

function roundRatio(value: number) {
  return Number(value.toFixed(4));
}

function ratio(numerator: number, denominator: number) {
  return denominator === 0 ? 0 : roundRatio(numerator / denominator);
}

function tagDescriptors(tags: QuestionDifficultyTags) {
  const descriptors = [
    {
      key: `range:${tags.numberRange}`,
      category: '数字范围',
      label:
        {
          within_5: '5以内数量',
          within_10: '10以内数量',
          within_20: '20以内数量',
          within_30: '30以内数量',
        }[tags.numberRange] ?? tags.numberRange,
    },
    {
      key: `operation:${tags.operationType}`,
      category: '运算类型',
      label:
        {
          matching: '数量配对',
          compare: '比较大小',
          addition: '加法理解',
          subtraction: '减法/跳跃',
          mixed: '加减混合',
        }[tags.operationType] ?? tags.operationType,
    },
    {
      key: `presentation:${tags.presentationType}`,
      category: '呈现方式',
      label:
        {
          visual: '图形题',
          semi_visual: '半图形半数字',
          pure_number: '纯数字题',
          story: '故事题',
          number_line: '数轴题',
        }[tags.presentationType] ?? tags.presentationType,
    },
    {
      key: `option:${tags.optionDistance}`,
      category: '选项辨别',
      label:
        {
          wide: '宽间距选项',
          medium: '中等干扰选项',
          close: '接近选项辨别',
        }[tags.optionDistance] ?? tags.optionDistance,
    },
    {
      key: `level:${tags.difficultyLevel}`,
      category: '难度阶梯',
      label: `难度阶梯 ${tags.difficultyLevel}`,
    },
  ];

  if (tags.crossTen) {
    descriptors.push({
      key: 'concept:cross_ten',
      category: '关键概念',
      label: '跨10/凑十',
    });
  }

  if (tags.carryOrBorrow) {
    descriptors.push({
      key: 'concept:carry_or_borrow',
      category: '关键概念',
      label: '进位/数量分解',
    });
  }

  return descriptors;
}

function statusFor(skill: AbilitySkillAssessment): AbilitySkillStatus {
  if (skill.attempts < 3) {
    return 'observing';
  }

  if (
    skill.attempts >= 5 &&
    skill.firstTryAccuracy >= 0.85 &&
    skill.hintRate <= 0.15 &&
    skill.avgFirstResponseTimeMs <= 5500
  ) {
    return 'mastered';
  }

  if (skill.firstTryAccuracy >= 0.7 && skill.hintRate <= 0.35) {
    return 'stable';
  }

  if (skill.finalAccuracy >= 0.8 || skill.firstTryAccuracy >= 0.45 || skill.hintRate <= 0.6) {
    return 'developing';
  }

  return 'challenging';
}

function normalizeProfile(profile?: Partial<AbilityProfile> | null): AbilityProfile {
  if (!profile || profile.schemaVersion !== ABILITY_PROFILE_SCHEMA_VERSION) {
    return INITIAL_PROFILE;
  }

  return {
    schemaVersion: ABILITY_PROFILE_SCHEMA_VERSION,
    updatedAt: Number(profile.updatedAt ?? 0),
    totalCompletedQuestions: Math.max(
      0,
      Math.round(Number(profile.totalCompletedQuestions ?? 0)),
    ),
    skills: profile.skills && typeof profile.skills === 'object' ? profile.skills : {},
  };
}

export function createEmptyAbilityProfile(): AbilityProfile {
  return {
    ...INITIAL_PROFILE,
    skills: {},
  };
}

export function hydrateAbilityProfile(raw: string | null): AbilityProfile {
  if (!raw) {
    return createEmptyAbilityProfile();
  }

  try {
    return normalizeProfile(JSON.parse(raw) as Partial<AbilityProfile>);
  } catch {
    return createEmptyAbilityProfile();
  }
}

export function updateAbilityProfile(
  profile: AbilityProfile,
  record: QuestionAttemptRecord,
  now = Date.now(),
): AbilityProfile {
  const nextSkills = { ...profile.skills };

  tagDescriptors(record.tags).forEach((descriptor) => {
    const previous = nextSkills[descriptor.key] ?? {
      key: descriptor.key,
      label: descriptor.label,
      category: descriptor.category,
      attempts: 0,
      firstTryCorrect: 0,
      finalCorrect: 0,
      hintUsed: 0,
      audioReplayUsed: 0,
      totalFirstResponseTimeMs: 0,
      totalTimeMs: 0,
      slowCount: 0,
      lastSeenAt: 0,
    };

    nextSkills[descriptor.key] = {
      ...previous,
      label: descriptor.label,
      category: descriptor.category,
      attempts: previous.attempts + 1,
      firstTryCorrect: previous.firstTryCorrect + (record.firstAttemptCorrect ? 1 : 0),
      finalCorrect: previous.finalCorrect + (record.finalCorrect ? 1 : 0),
      hintUsed: previous.hintUsed + (record.hintCount > 0 ? 1 : 0),
      audioReplayUsed: previous.audioReplayUsed + (record.audioReplayCount > 0 ? 1 : 0),
      totalFirstResponseTimeMs:
        previous.totalFirstResponseTimeMs + record.firstResponseTimeMs,
      totalTimeMs: previous.totalTimeMs + record.totalTimeMs,
      slowCount: previous.slowCount + (record.firstResponseTimeMs >= 8000 ? 1 : 0),
      lastSeenAt: now,
    };
  });

  return {
    schemaVersion: ABILITY_PROFILE_SCHEMA_VERSION,
    updatedAt: now,
    totalCompletedQuestions: profile.totalCompletedQuestions + 1,
    skills: nextSkills,
  };
}

function assessSkill(skill: AbilitySkillStats): AbilitySkillAssessment {
  const assessment = {
    ...skill,
    firstTryAccuracy: ratio(skill.firstTryCorrect, skill.attempts),
    finalAccuracy: ratio(skill.finalCorrect, skill.attempts),
    hintRate: ratio(skill.hintUsed, skill.attempts),
    audioReplayRate: ratio(skill.audioReplayUsed, skill.attempts),
    avgFirstResponseTimeMs:
      skill.attempts === 0
        ? 0
        : Math.round(skill.totalFirstResponseTimeMs / skill.attempts),
    status: 'observing' as AbilitySkillStatus,
  };

  return {
    ...assessment,
    status: statusFor(assessment),
  };
}

function sortByEvidenceAndNeed(
  left: AbilitySkillAssessment,
  right: AbilitySkillAssessment,
) {
  if (right.attempts !== left.attempts) {
    return right.attempts - left.attempts;
  }

  if (left.firstTryAccuracy !== right.firstTryAccuracy) {
    return left.firstTryAccuracy - right.firstTryAccuracy;
  }

  return left.label.localeCompare(right.label);
}

export function createAbilityAssessment(profile: AbilityProfile): AbilityAssessment {
  const skills = Object.values(profile.skills).map(assessSkill);
  const mastered = skills
    .filter((skill) => skill.status === 'mastered')
    .sort(sortByEvidenceAndNeed);
  const stable = skills
    .filter((skill) => skill.status === 'stable')
    .sort(sortByEvidenceAndNeed);
  const focus = skills
    .filter((skill) => skill.status === 'developing' || skill.status === 'challenging')
    .sort(sortByEvidenceAndNeed);
  const observing = skills
    .filter((skill) => skill.status === 'observing')
    .sort(sortByEvidenceAndNeed);
  const readiness =
    focus.some((skill) => skill.status === 'challenging')
      ? 'challenging'
      : mastered.length >= 3
        ? 'mastered'
        : stable.length + mastered.length >= 3
          ? 'stable'
          : focus.length > 0
            ? 'developing'
            : 'observing';

  return {
    totalCompletedQuestions: profile.totalCompletedQuestions,
    readiness,
    mastered,
    stable,
    focus,
    observing,
  };
}
