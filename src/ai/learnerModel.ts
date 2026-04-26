import type {
  QuestionAttemptRecord,
  QuestionDifficultyTags,
} from '../engagement/flow/types';
import { llmConfidenceWeight, shouldPreferLlmChoice } from './llmConfidence';

export const LEARNER_MODEL_SCHEMA_VERSION = 1;
export const LEARNER_MODEL_STORAGE_KEY = 'childlearn.learner-model-v1';

export type LearnerFlowState = 'anxious' | 'flow' | 'bored';

export type LearnerErrorPatternType =
  | 'conceptual'
  | 'careless_or_motor'
  | 'fatigue'
  | 'confusion';

export type LearnerSkillKey =
  | 'countingTo5'
  | 'countingTo10'
  | 'countingTo20'
  | 'visualMatching'
  | 'compareWithin5'
  | 'compareWithin10'
  | 'compareWithin20'
  | 'addWithin5'
  | 'addWithin10'
  | 'subWithin10'
  | 'missingAddend'
  | 'makeTen'
  | 'crossTenBridge'
  | 'numberLineDistance'
  | 'storyAddition'
  | 'semiVisualBridge'
  | 'closeOptionDiscrimination'
  | 'pureNumberReadiness';

export interface LearnerSkillDefinition {
  key: LearnerSkillKey;
  label: string;
  category: string;
}

export interface LearnerSkillState {
  key: LearnerSkillKey;
  label: string;
  category: string;
  theta: number;
  confidence: number;
  attempts: number;
  lastSeen: number;
}

export interface ErrorCluster {
  id: string;
  type: LearnerErrorPatternType;
  label: string;
  skillKey: LearnerSkillKey;
  count: number;
  lastSeen: number;
  exampleQuestionIds: string[];
}

export interface LearnerResponseDigest {
  questionId: string;
  questionIndex: number;
  stem: string;
  choices?: string[];
  correctAnswer: string;
  childAnswer: string;
  skillKeys: LearnerSkillKey[];
  difficultyTheta: number;
  firstAttemptCorrect: boolean;
  finalCorrect: boolean;
  reactionTimeMs: number;
  firstResponseTimeMs: number;
  hintCount: number;
  audioReplayCount: number;
  rapidClickCount: number;
  idleMs: number;
  recordedAt: number;
}

export interface LearnerSkillRefinement {
  skillKey: LearnerSkillKey;
  deltaTheta: number;
  deltaConfidence?: number;
  reason: string;
  evidenceStrength: 'low' | 'medium' | 'high';
}

export interface ProfileRefinement {
  schemaVersion: 'childlearn.profile-refinement.v1';
  confidence: number;
  globalDeltaTheta?: number;
  skillAdjustments: LearnerSkillRefinement[];
  errorPatterns: Array<{
    type: LearnerErrorPatternType;
    label: string;
    skillKey: LearnerSkillKey;
    evidenceQuestionIds?: string[];
  }>;
  nextSkill?: {
    skillKey: LearnerSkillKey;
    difficultyAdjustment?: number;
    reason: string;
  };
  safetyNotes: string[];
}

export interface ColdStartBaselineAssessment {
  schemaVersion: 'childlearn.cold-start-baseline.v1';
  confidence: number;
  baselineTheta: Record<LearnerSkillKey, number>;
  recommendedDifficulty: number;
  notes: string[];
  nextSkill?: LearnerSkillKey;
}

export interface LearnerProfile {
  schemaVersion: typeof LEARNER_MODEL_SCHEMA_VERSION;
  childId: string;
  skills: Record<LearnerSkillKey, LearnerSkillState>;
  recentResponses: LearnerResponseDigest[];
  errorPatterns: ErrorCluster[];
  flowState: LearnerFlowState;
  recommendedSkill: LearnerSkillKey | null;
  llmUpdatedAt: number;
  updatedAt: number;
}

const THETA_MIN = -3;
const THETA_MAX = 3;
const INITIAL_CONFIDENCE = 0.15;
const RECENT_RESPONSE_LIMIT = 50;

export const LEARNER_SKILL_DEFINITIONS: Record<
  LearnerSkillKey,
  LearnerSkillDefinition
> = {
  countingTo5: { key: 'countingTo5', label: '5以内点数', category: '数数' },
  countingTo10: { key: 'countingTo10', label: '10以内点数', category: '数数' },
  countingTo20: { key: 'countingTo20', label: '20以内数量', category: '数数' },
  visualMatching: { key: 'visualMatching', label: '数量配对', category: '数感' },
  compareWithin5: { key: 'compareWithin5', label: '5以内比较', category: '比较' },
  compareWithin10: { key: 'compareWithin10', label: '10以内比较', category: '比较' },
  compareWithin20: { key: 'compareWithin20', label: '20以内比较', category: '比较' },
  addWithin5: { key: 'addWithin5', label: '5以内合成', category: '加法' },
  addWithin10: { key: 'addWithin10', label: '10以内加法', category: '加法' },
  subWithin10: { key: 'subWithin10', label: '10以内距离', category: '减法' },
  missingAddend: { key: 'missingAddend', label: '缺数补全', category: '加法' },
  makeTen: { key: 'makeTen', label: '凑十', category: '关键概念' },
  crossTenBridge: { key: 'crossTenBridge', label: '跨10桥', category: '关键概念' },
  numberLineDistance: {
    key: 'numberLineDistance',
    label: '数轴跳跃',
    category: '数轴',
  },
  storyAddition: { key: 'storyAddition', label: '故事加法', category: '应用' },
  semiVisualBridge: {
    key: 'semiVisualBridge',
    label: '图数桥接',
    category: '表征',
  },
  closeOptionDiscrimination: {
    key: 'closeOptionDiscrimination',
    label: '近选项辨别',
    category: '辨别',
  },
  pureNumberReadiness: {
    key: 'pureNumberReadiness',
    label: '纯数字准备',
    category: '表征',
  },
};

export const LEARNER_SKILL_KEYS = Object.keys(
  LEARNER_SKILL_DEFINITIONS,
) as LearnerSkillKey[];

export const LEARNER_RADAR_SKILLS: LearnerSkillKey[] = [
  'countingTo10',
  'compareWithin10',
  'addWithin10',
  'makeTen',
  'numberLineDistance',
  'storyAddition',
];

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function round(value: number, digits = 4) {
  return Number(value.toFixed(digits));
}

function sigmoid(value: number) {
  return 1 / (1 + Math.exp(-value));
}

function normalizeChildId(childId?: string) {
  const clean = childId?.trim();
  return clean || 'local-child';
}

function createInitialSkillState(key: LearnerSkillKey): LearnerSkillState {
  const definition = LEARNER_SKILL_DEFINITIONS[key];
  return {
    key,
    label: definition.label,
    category: definition.category,
    theta: 0,
    confidence: INITIAL_CONFIDENCE,
    attempts: 0,
    lastSeen: 0,
  };
}

function createInitialSkills() {
  return LEARNER_SKILL_KEYS.reduce(
    (skills, key) => ({
      ...skills,
      [key]: createInitialSkillState(key),
    }),
    {} as Record<LearnerSkillKey, LearnerSkillState>,
  );
}

export function createEmptyLearnerProfile(childId?: string): LearnerProfile {
  return {
    schemaVersion: LEARNER_MODEL_SCHEMA_VERSION,
    childId: normalizeChildId(childId),
    skills: createInitialSkills(),
    recentResponses: [],
    errorPatterns: [],
    flowState: 'flow',
    recommendedSkill: null,
    llmUpdatedAt: 0,
    updatedAt: 0,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function finiteNumber(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeSkillState(
  key: LearnerSkillKey,
  raw: unknown,
): LearnerSkillState {
  const initial = createInitialSkillState(key);
  if (!isRecord(raw)) {
    return initial;
  }

  return {
    ...initial,
    theta: clamp(finiteNumber(raw.theta, initial.theta), THETA_MIN, THETA_MAX),
    confidence: clamp(finiteNumber(raw.confidence, initial.confidence), 0, 0.99),
    attempts: Math.max(0, Math.round(finiteNumber(raw.attempts, 0))),
    lastSeen: Math.max(0, Math.round(finiteNumber(raw.lastSeen, 0))),
  };
}

function isLearnerSkillKey(value: unknown): value is LearnerSkillKey {
  return typeof value === 'string' && value in LEARNER_SKILL_DEFINITIONS;
}

function normalizeRecentResponses(value: unknown): LearnerResponseDigest[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!isRecord(item) || typeof item.questionId !== 'string') {
      return [];
    }

    const skillKeys = Array.isArray(item.skillKeys)
      ? item.skillKeys.filter(isLearnerSkillKey)
      : [];

    if (skillKeys.length === 0) {
      return [];
    }

    return [
      {
        questionId: item.questionId,
        questionIndex: Math.round(finiteNumber(item.questionIndex, 0)),
        stem: typeof item.stem === 'string' ? item.stem.trim().slice(0, 80) : '',
        choices: Array.isArray(item.choices)
          ? item.choices
              .filter((choice): choice is string => typeof choice === 'string')
              .map((choice) => choice.trim())
              .filter(Boolean)
              .slice(0, 6)
          : undefined,
        correctAnswer:
          typeof item.correctAnswer === 'string'
            ? item.correctAnswer.trim().slice(0, 16)
            : '',
        childAnswer:
          typeof item.childAnswer === 'string'
            ? item.childAnswer.trim().slice(0, 16)
            : '',
        skillKeys,
        difficultyTheta: clamp(
          finiteNumber(item.difficultyTheta, 0),
          THETA_MIN,
          THETA_MAX,
        ),
        firstAttemptCorrect: item.firstAttemptCorrect === true,
        finalCorrect: item.finalCorrect === true,
        reactionTimeMs: Math.max(
          0,
          Math.round(
            finiteNumber(
              item.reactionTimeMs,
              finiteNumber(item.firstResponseTimeMs, 0),
            ),
          ),
        ),
        firstResponseTimeMs: Math.max(
          0,
          Math.round(finiteNumber(item.firstResponseTimeMs, 0)),
        ),
        hintCount: Math.max(0, Math.round(finiteNumber(item.hintCount, 0))),
        audioReplayCount: Math.max(
          0,
          Math.round(finiteNumber(item.audioReplayCount, 0)),
        ),
        rapidClickCount: Math.max(
          0,
          Math.round(finiteNumber(item.rapidClickCount, 0)),
        ),
        idleMs: Math.max(0, Math.round(finiteNumber(item.idleMs, 0))),
        recordedAt: Math.max(0, Math.round(finiteNumber(item.recordedAt, 0))),
      },
    ];
  }).slice(-RECENT_RESPONSE_LIMIT);
}

function normalizeErrorPatterns(value: unknown): ErrorCluster[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (
      !isRecord(item) ||
      typeof item.id !== 'string' ||
      typeof item.label !== 'string' ||
      !isLearnerSkillKey(item.skillKey)
    ) {
      return [];
    }

    const type =
      item.type === 'conceptual' ||
      item.type === 'careless_or_motor' ||
      item.type === 'fatigue' ||
      item.type === 'confusion'
        ? item.type
        : 'conceptual';

    return [
      {
        id: item.id,
        type,
        label: item.label,
        skillKey: item.skillKey,
        count: Math.max(1, Math.round(finiteNumber(item.count, 1))),
        lastSeen: Math.max(0, Math.round(finiteNumber(item.lastSeen, 0))),
        exampleQuestionIds: Array.isArray(item.exampleQuestionIds)
          ? item.exampleQuestionIds.filter(
              (questionId): questionId is string => typeof questionId === 'string',
            ).slice(-5)
          : [],
      },
    ];
  });
}

function normalizeProfile(raw: unknown, childId?: string): LearnerProfile {
  if (!isRecord(raw) || raw.schemaVersion !== LEARNER_MODEL_SCHEMA_VERSION) {
    return createEmptyLearnerProfile(childId);
  }

  const rawSkills = raw.skills;
  if (!isRecord(rawSkills)) {
    return createEmptyLearnerProfile(childId);
  }

  const skills = LEARNER_SKILL_KEYS.reduce(
    (nextSkills, key) => ({
      ...nextSkills,
      [key]: normalizeSkillState(key, rawSkills[key]),
    }),
    {} as Record<LearnerSkillKey, LearnerSkillState>,
  );

  const flowState =
    raw.flowState === 'anxious' || raw.flowState === 'bored' || raw.flowState === 'flow'
      ? raw.flowState
      : 'flow';

  return {
    schemaVersion: LEARNER_MODEL_SCHEMA_VERSION,
    childId: normalizeChildId(
      typeof raw.childId === 'string' ? raw.childId : childId,
    ),
    skills,
    recentResponses: normalizeRecentResponses(raw.recentResponses),
    errorPatterns: normalizeErrorPatterns(raw.errorPatterns),
    flowState,
    recommendedSkill: isLearnerSkillKey(raw.recommendedSkill)
      ? raw.recommendedSkill
      : null,
    llmUpdatedAt: Math.max(0, Math.round(finiteNumber(raw.llmUpdatedAt, 0))),
    updatedAt: Math.max(0, Math.round(finiteNumber(raw.updatedAt, 0))),
  };
}

export function hydrateLearnerProfile(
  raw: string | null,
  childId?: string,
): LearnerProfile {
  if (!raw) {
    return createEmptyLearnerProfile(childId);
  }

  try {
    return normalizeProfile(JSON.parse(raw) as unknown, childId);
  } catch {
    return createEmptyLearnerProfile(childId);
  }
}

function rangeSkills(tags: QuestionDifficultyTags): LearnerSkillKey[] {
  if (tags.numberRange === 'within_5') {
    return ['countingTo5'];
  }

  if (tags.numberRange === 'within_10') {
    return ['countingTo10'];
  }

  return ['countingTo20'];
}

function compareSkill(tags: QuestionDifficultyTags): LearnerSkillKey {
  if (tags.numberRange === 'within_5') {
    return 'compareWithin5';
  }

  if (tags.numberRange === 'within_10') {
    return 'compareWithin10';
  }

  return 'compareWithin20';
}

function additionSkill(tags: QuestionDifficultyTags): LearnerSkillKey {
  return tags.numberRange === 'within_5' ? 'addWithin5' : 'addWithin10';
}

function skillsFromQuestionId(questionId: string): LearnerSkillKey[] {
  if (questionId.startsWith('make-ten-')) {
    return ['makeTen'];
  }

  if (questionId.startsWith('missing-')) {
    return ['missingAddend'];
  }

  return [];
}

export function skillKeysForQuestion(
  response: Pick<QuestionAttemptRecord, 'questionId' | 'tags'>,
): LearnerSkillKey[] {
  const tags = response.tags;
  const skills = new Set<LearnerSkillKey>([
    ...rangeSkills(tags),
    ...skillsFromQuestionId(response.questionId),
  ]);

  if (tags.operationType === 'matching') {
    skills.add('visualMatching');
  }

  if (tags.operationType === 'compare') {
    skills.add(compareSkill(tags));
  }

  if (tags.operationType === 'addition' || tags.operationType === 'mixed') {
    skills.add(additionSkill(tags));
  }

  if (tags.operationType === 'subtraction' || tags.operationType === 'mixed') {
    skills.add('subWithin10');
  }

  if (tags.presentationType === 'story') {
    skills.add('storyAddition');
  }

  if (tags.presentationType === 'number_line') {
    skills.add('numberLineDistance');
  }

  if (tags.presentationType === 'semi_visual') {
    skills.add('semiVisualBridge');
  }

  if (tags.presentationType === 'pure_number') {
    skills.add('pureNumberReadiness');
  }

  if (tags.presentationType === 'visual') {
    skills.add('visualMatching');
  }

  if (tags.optionDistance === 'close') {
    skills.add('closeOptionDiscrimination');
  }

  if (tags.crossTen || tags.carryOrBorrow) {
    skills.add('crossTenBridge');
  }

  return [...skills];
}

export function difficultyThetaForTags(tags: QuestionDifficultyTags) {
  return round(clamp((tags.difficultyLevel - 3.5) / 1.75, -2, 2));
}

function responseScore(response: QuestionAttemptRecord) {
  if (response.abandoned || !response.finalCorrect) {
    return 0;
  }

  if (response.firstAttemptCorrect) {
    return response.hintCount > 0 ? 0.86 : 1;
  }

  return response.hintCount > 0 ? 0.52 : 0.62;
}

function pacePenalty(response: QuestionAttemptRecord) {
  let penalty = 0;

  if (response.firstResponseTimeMs >= 8000) {
    penalty -= 0.04;
  }

  if (!response.finalCorrect && response.rapidClickCount > 0) {
    penalty -= 0.04;
  }

  if (response.idleMs >= 12000) {
    penalty -= 0.03;
  }

  return penalty;
}

function updateSkillByResponse(
  skill: LearnerSkillState,
  response: QuestionAttemptRecord,
  difficultyTheta: number,
  now: number,
): LearnerSkillState {
  const score = clamp(responseScore(response) + pacePenalty(response), 0, 1);
  const expected = sigmoid(skill.theta - difficultyTheta);
  const learningRate = 0.42 / Math.sqrt(skill.attempts + 1);
  const delta = clamp(learningRate * (score - expected), -0.35, 0.35);
  const confidenceGain =
    response.abandoned ? 0.01 : 0.045 + Math.min(Math.abs(score - expected), 0.4) * 0.05;

  return {
    ...skill,
    theta: round(clamp(skill.theta + delta, THETA_MIN, THETA_MAX)),
    confidence: round(clamp(skill.confidence + confidenceGain, 0, 0.99)),
    attempts: skill.attempts + 1,
    lastSeen: now,
  };
}

function errorPatternForResponse(
  response: QuestionAttemptRecord,
  skillKey: LearnerSkillKey,
): Omit<ErrorCluster, 'id' | 'count' | 'lastSeen' | 'exampleQuestionIds'> {
  if (response.idleMs >= 12000 || response.firstResponseTimeMs >= 12000) {
    return {
      type: 'fatigue',
      label: '反应变慢',
      skillKey,
    };
  }

  if (response.rapidClickCount > 0 || response.feedbackInterruptClickCount > 0) {
    return {
      type: 'careless_or_motor',
      label: '点选过快',
      skillKey,
    };
  }

  if (response.audioReplayCount >= 2) {
    return {
      type: 'confusion',
      label: '题意需要重复',
      skillKey,
    };
  }

  return {
    type: 'conceptual',
    label: LEARNER_SKILL_DEFINITIONS[skillKey].label,
    skillKey,
  };
}

function mergeErrorPattern(
  patterns: ErrorCluster[],
  draft: Omit<ErrorCluster, 'id' | 'count' | 'lastSeen' | 'exampleQuestionIds'>,
  questionId: string,
  now: number,
) {
  const id = `${draft.type}:${draft.skillKey}:${draft.label}`;
  const existing = patterns.find((pattern) => pattern.id === id);

  if (!existing) {
    return [
      ...patterns,
      {
        ...draft,
        id,
        count: 1,
        lastSeen: now,
        exampleQuestionIds: [questionId],
      },
    ].slice(-12);
  }

  return patterns.map((pattern) =>
    pattern.id === id
      ? {
          ...pattern,
          count: pattern.count + 1,
          lastSeen: now,
          exampleQuestionIds: [
            ...pattern.exampleQuestionIds.filter((item) => item !== questionId),
            questionId,
          ].slice(-5),
        }
      : pattern,
  );
}

function flowStateForResponses(responses: LearnerResponseDigest[]): LearnerFlowState {
  const recent = responses.slice(-10);
  if (recent.length < 4) {
    return 'flow';
  }

  const firstTryAccuracy =
    recent.filter((response) => response.firstAttemptCorrect).length / recent.length;
  const finalAccuracy =
    recent.filter((response) => response.finalCorrect).length / recent.length;
  const hintRate =
    recent.filter((response) => response.hintCount > 0).length / recent.length;
  const avgFirstResponseMs =
    recent.reduce((sum, response) => sum + response.firstResponseTimeMs, 0) /
    recent.length;

  if (finalAccuracy < 0.72 || firstTryAccuracy < 0.55 || hintRate >= 0.45) {
    return 'anxious';
  }

  if (firstTryAccuracy >= 0.88 && hintRate <= 0.12 && avgFirstResponseMs <= 4200) {
    return 'bored';
  }

  return 'flow';
}

function focusSkillForUpdate(
  profile: LearnerProfile,
  skillKeys: LearnerSkillKey[],
): LearnerSkillKey | null {
  return [...skillKeys]
    .sort((left, right) => {
      const leftSkill = profile.skills[left];
      const rightSkill = profile.skills[right];
      if (leftSkill.confidence !== rightSkill.confidence) {
        return rightSkill.confidence - leftSkill.confidence;
      }

      return leftSkill.theta - rightSkill.theta;
    })[0] ?? null;
}

export function updateLearnerModel(
  profile: LearnerProfile,
  response: QuestionAttemptRecord,
  now = Date.now(),
): LearnerProfile {
  const normalized = normalizeProfile(profile);
  const skillKeys = skillKeysForQuestion(response);
  const difficultyTheta = difficultyThetaForTags(response.tags);
  const skills = { ...normalized.skills };

  skillKeys.forEach((skillKey) => {
    skills[skillKey] = updateSkillByResponse(
      skills[skillKey],
      response,
      difficultyTheta,
      now,
    );
  });

  const recentResponses = [
    ...normalized.recentResponses,
    {
      questionId: response.questionId,
      questionIndex: response.questionIndex,
      stem: response.stem,
      choices: response.choices,
      correctAnswer: String(response.correctAnswer),
      childAnswer: response.childAnswer,
      skillKeys,
      difficultyTheta,
      firstAttemptCorrect: response.firstAttemptCorrect,
      finalCorrect: response.finalCorrect,
      reactionTimeMs: response.reactionTimeMs,
      firstResponseTimeMs: response.firstResponseTimeMs,
      hintCount: response.hintCount,
      audioReplayCount: response.audioReplayCount,
      rapidClickCount: response.rapidClickCount,
      idleMs: response.idleMs,
      recordedAt: now,
    },
  ].slice(-RECENT_RESPONSE_LIMIT);

  const focusSkill = focusSkillForUpdate({ ...normalized, skills }, skillKeys);
  const errorPatterns =
    response.finalCorrect || !focusSkill
      ? normalized.errorPatterns
      : mergeErrorPattern(
          normalized.errorPatterns,
          errorPatternForResponse(response, focusSkill),
          response.questionId,
          now,
        );

  return {
    ...normalized,
    skills,
    recentResponses,
    errorPatterns,
    flowState: flowStateForResponses(recentResponses),
    updatedAt: now,
  };
}

function parseSkillRefinement(value: unknown): LearnerSkillRefinement | null {
  if (!isRecord(value) || !isLearnerSkillKey(value.skillKey)) {
    return null;
  }

  const evidenceStrength =
    value.evidenceStrength === 'high' ||
    value.evidenceStrength === 'medium' ||
    value.evidenceStrength === 'low'
      ? value.evidenceStrength
      : null;

  if (
    evidenceStrength === null ||
    typeof value.reason !== 'string' ||
    !Number.isFinite(Number(value.deltaTheta))
  ) {
    return null;
  }

  return {
    skillKey: value.skillKey,
    deltaTheta: clamp(Number(value.deltaTheta), -0.25, 0.25),
    deltaConfidence: Number.isFinite(Number(value.deltaConfidence))
      ? clamp(Number(value.deltaConfidence), -0.08, 0.08)
      : undefined,
    reason: value.reason,
    evidenceStrength,
  };
}

function parseRefinementErrorPattern(
  value: unknown,
): ProfileRefinement['errorPatterns'][number] | null {
  if (
    !isRecord(value) ||
    typeof value.label !== 'string' ||
    !isLearnerSkillKey(value.skillKey)
  ) {
    return null;
  }

  const type =
    value.type === 'conceptual' ||
    value.type === 'careless_or_motor' ||
    value.type === 'fatigue' ||
    value.type === 'confusion'
      ? value.type
      : null;

  if (!type) {
    return null;
  }

  return {
    type,
    label: value.label,
    skillKey: value.skillKey,
    evidenceQuestionIds: Array.isArray(value.evidenceQuestionIds)
      ? value.evidenceQuestionIds.filter(
          (questionId): questionId is string => typeof questionId === 'string',
        ).slice(-5)
      : [],
  };
}

export function parseProfileRefinement(value: unknown): ProfileRefinement | null {
  if (
    !isRecord(value) ||
    value.schemaVersion !== 'childlearn.profile-refinement.v1' ||
    !Number.isFinite(Number(value.confidence)) ||
    Number(value.confidence) < 0 ||
    Number(value.confidence) > 1
  ) {
    return null;
  }

  const skillAdjustments = Array.isArray(value.skillAdjustments)
    ? value.skillAdjustments.flatMap((item) => {
        const parsed = parseSkillRefinement(item);
        return parsed ? [parsed] : [];
      })
    : [];
  const errorPatterns = Array.isArray(value.errorPatterns)
    ? value.errorPatterns.flatMap((item) => {
        const parsed = parseRefinementErrorPattern(item);
        return parsed ? [parsed] : [];
      })
    : [];
  const nextSkill =
    isRecord(value.nextSkill) &&
    isLearnerSkillKey(value.nextSkill.skillKey) &&
    typeof value.nextSkill.reason === 'string'
      ? {
          skillKey: value.nextSkill.skillKey,
          difficultyAdjustment: Number.isFinite(
            Number(value.nextSkill.difficultyAdjustment),
          )
            ? clamp(Number(value.nextSkill.difficultyAdjustment), -0.5, 0.5)
            : undefined,
          reason: value.nextSkill.reason,
        }
      : undefined;

  return {
    schemaVersion: 'childlearn.profile-refinement.v1',
    confidence: Number(value.confidence),
    globalDeltaTheta: Number.isFinite(Number(value.globalDeltaTheta))
      ? clamp(Number(value.globalDeltaTheta), -0.5, 0.5)
      : undefined,
    skillAdjustments,
    errorPatterns,
    nextSkill,
    safetyNotes: Array.isArray(value.safetyNotes)
      ? value.safetyNotes.filter((item): item is string => typeof item === 'string')
      : [],
  };
}

function evidenceWeight(evidenceStrength: LearnerSkillRefinement['evidenceStrength']) {
  if (evidenceStrength === 'high') {
    return 1;
  }

  if (evidenceStrength === 'medium') {
    return 0.72;
  }

  return 0.42;
}

export function applyProfileRefinement(
  profile: LearnerProfile,
  refinement: ProfileRefinement,
  now = Date.now(),
): LearnerProfile {
  const normalized = normalizeProfile(profile);
  const refinementInfluence = llmConfidenceWeight(refinement.confidence);

  if (refinementInfluence === 0) {
    return normalized;
  }

  const skills = { ...normalized.skills };
  if (Number.isFinite(refinement.globalDeltaTheta)) {
    const globalWeight = refinementInfluence * 0.8;
    LEARNER_SKILL_KEYS.forEach((skillKey) => {
      const previous = skills[skillKey];
      const readinessWeight =
        previous.attempts > 0 || previous.confidence >= INITIAL_CONFIDENCE ? 1 : 0.72;
      skills[skillKey] = {
        ...previous,
        theta: round(
          clamp(
            previous.theta + refinement.globalDeltaTheta! * globalWeight * readinessWeight,
            THETA_MIN,
            THETA_MAX,
          ),
        ),
        confidence: round(
          clamp(
            previous.confidence + 0.03 * globalWeight * readinessWeight,
            0,
            0.99,
          ),
        ),
        lastSeen: Math.max(previous.lastSeen, now),
      };
    });
  }
  refinement.skillAdjustments.forEach((adjustment) => {
    const previous = skills[adjustment.skillKey];
    const weight = evidenceWeight(adjustment.evidenceStrength) * refinementInfluence;
    skills[adjustment.skillKey] = {
      ...previous,
      theta: round(
        clamp(
          previous.theta + adjustment.deltaTheta * weight,
          THETA_MIN,
          THETA_MAX,
        ),
      ),
      confidence: round(
        clamp(
          previous.confidence + (adjustment.deltaConfidence ?? 0.04) * weight,
          0,
          0.99,
        ),
      ),
      lastSeen: Math.max(previous.lastSeen, now),
    };
  });

  const errorPatterns =
    refinementInfluence < 0.15
      ? normalized.errorPatterns
      : refinement.errorPatterns.reduce((patterns, pattern) => {
          const exampleId = pattern.evidenceQuestionIds?.[0] ?? `llm-${now}`;
          return mergeErrorPattern(
            patterns,
            {
              type: pattern.type,
              label: pattern.label,
              skillKey: pattern.skillKey,
            },
            exampleId,
            now,
          );
        }, normalized.errorPatterns);

  return {
    ...normalized,
    skills,
    errorPatterns,
    recommendedSkill: shouldPreferLlmChoice(refinement.confidence, 0.3)
      ? refinement.nextSkill?.skillKey ?? normalized.recommendedSkill
      : normalized.recommendedSkill,
    llmUpdatedAt: now,
    updatedAt: now,
  };
}

export function applyColdStartBaseline(
  profile: LearnerProfile,
  assessment: ColdStartBaselineAssessment,
  now = Date.now(),
): LearnerProfile {
  const normalized = normalizeProfile(profile);
  const influence = llmConfidenceWeight(assessment.confidence, {
    minConfidence: 0.15,
    fullConfidence: 0.85,
    maxInfluence: 1,
  });

  if (influence === 0) {
    return normalized;
  }

  const totalAttempts = Object.values(normalized.skills).reduce(
    (sum, skill) => sum + skill.attempts,
    0,
  );
  const exactMode = totalAttempts === 0;
  const skills = LEARNER_SKILL_KEYS.reduce(
    (nextSkills, skillKey) => {
      const previous = normalized.skills[skillKey];
      const targetTheta = clamp(
        assessment.baselineTheta[skillKey] ?? previous.theta,
        THETA_MIN,
        THETA_MAX,
      );
      const blendWeight = exactMode
        ? 1
        : clamp(
            influence * (previous.attempts === 0 ? 0.75 : 0.45),
            0.25,
            0.8,
          );
      const theta = exactMode
        ? targetTheta
        : previous.theta * (1 - blendWeight) + targetTheta * blendWeight;
      const confidenceFloor = exactMode ? 0.3 : 0.22;

      return {
        ...nextSkills,
        [skillKey]: {
          ...previous,
          theta: round(theta),
          confidence: round(
            clamp(
              Math.max(previous.confidence, confidenceFloor + influence * 0.35),
              0,
              0.99,
            ),
          ),
          lastSeen: Math.max(previous.lastSeen, now),
        },
      };
    },
    {} as Record<LearnerSkillKey, LearnerSkillState>,
  );

  return {
    ...normalized,
    skills,
    recommendedSkill: assessment.nextSkill ?? normalized.recommendedSkill,
    llmUpdatedAt: now,
    updatedAt: now,
  };
}

export function thetaToDifficulty(theta: number) {
  return clamp(Math.round(((clamp(theta, -2, 2) + 2) / 4) * 9 + 1), 1, 10);
}

export function skillTheta(profile: LearnerProfile, skillKey: LearnerSkillKey) {
  return profile.skills[skillKey]?.theta ?? 0;
}

export function chooseLearnerTargetSkill(
  profile: LearnerProfile | null | undefined,
  lane: 'confidence' | 'review' | 'current' | 'challenge',
): LearnerSkillKey | null {
  if (!profile) {
    return null;
  }

  if (profile.recommendedSkill) {
    return profile.recommendedSkill;
  }

  const skills = Object.values(profile.skills);
  if (skills.length === 0) {
    return null;
  }

  if (lane === 'confidence') {
    return [...skills].sort((left, right) => right.theta - left.theta)[0]?.key ?? null;
  }

  if (lane === 'challenge') {
    return [...skills]
      .filter((skill) => skill.confidence >= 0.25)
      .sort((left, right) => {
        const leftDistance = Math.abs(left.theta - 0.2);
        const rightDistance = Math.abs(right.theta - 0.2);
        return leftDistance - rightDistance || left.attempts - right.attempts;
      })[0]?.key ?? null;
  }

  return [...skills]
    .filter((skill) => skill.attempts > 0)
    .sort((left, right) => {
      if (left.confidence !== right.confidence) {
        return right.confidence - left.confidence;
      }

      return left.theta - right.theta;
    })[0]?.key ?? null;
}
