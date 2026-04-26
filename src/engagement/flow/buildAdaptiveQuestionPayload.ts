import type { LearnerProfile, LearnerSkillKey } from '../../ai/learnerModel';
import { chooseLearnerTargetSkill, skillTheta } from '../../ai/learnerModel';
import type { QuestionVariant } from '../../curriculum/types';
import type { FlowQuestionLane, FlowQuestionReasoningMode } from './questionSelector';
import { classifyError, type QuestionErrorPattern } from './errorClassifier';
import { buildRecentFingerprints } from './fingerprint';
import { detectFatigue } from './fatigueDetector';
import { difficultyThetaForTags, skillKeysForQuestion } from '../../ai/learnerModel';
import type { QuestionAttemptRecord } from './types';

type LegacyRecentErrorPattern = {
  count: number;
  label: string;
  skillKey: string;
  type: string;
};

type LegacyRecentResponse = {
  difficultyTheta: number;
  finalCorrect: boolean;
  firstAttemptCorrect: boolean;
  hintCount: number;
  questionId: string;
  skillKeys: string[];
};

export type LearnerStage = 'pre-k' | 'k' | 'g1';
export type PromptFlowState = 'easy' | 'flow' | 'hard' | 'thinking' | 'fatigue';

export interface AdaptiveQuestionPayload {
  difficulty: number;
  lane: FlowQuestionLane;
  recentErrorPatterns: LegacyRecentErrorPattern[];
  recentResponses: LegacyRecentResponse[];
  serial: number;
  targetSkillKey?: LearnerSkillKey;
  targetTheta?: number;
  variant?: QuestionVariant;
  reasoningMode?: FlowQuestionReasoningMode;
  learner: {
    ageMonths: number;
    stage: LearnerStage;
    sessionMinutes: number;
    fatigueLevel: 0 | 1 | 2;
    flowState: PromptFlowState;
    slidingAccuracy: number;
  };
  skillRadar: Array<{
    key: string;
    theta: number;
    confidence: number;
    lastSeenMinAgo: number | null;
    mastered: boolean;
  }>;
  target: {
    skillKey: string;
    currentTheta: number;
    targetTheta: number;
    flowOffset: number;
    lane: FlowQuestionLane;
    reasonCode: string;
  };
  recentQuestions: Array<{
    stem: string;
    choices?: string[];
    correctAnswer: string;
    childAnswer: string;
    firstAttemptCorrect: boolean;
    hintCount: number;
    reactionTimeMs: number;
    skillKeys: string[];
    thetaAtTime: number;
    errorPattern?: QuestionErrorPattern | null;
  }>;
  recentFingerprints: string[];
  constraints: {
    variant: QuestionVariant;
    reasoningMode?: FlowQuestionReasoningMode;
    forbiddenPatterns: string[];
    maxChoices: number;
    readingLevel: 'pre-literate';
  };
}

export interface BuildAdaptiveQuestionPayloadInput {
  difficulty: number;
  lane: FlowQuestionLane;
  learnerProfile?: LearnerProfile | null;
  history?: QuestionAttemptRecord[];
  serial: number;
  targetSkillKey?: LearnerSkillKey;
  targetTheta?: number;
  variant?: QuestionVariant;
  reasoningMode?: FlowQuestionReasoningMode;
  childMeta?: {
    ageMonths?: number;
    stage?: LearnerStage;
  };
  nowMs?: number;
}

function targetOffsetForLane(lane: FlowQuestionLane) {
  if (lane === 'confidence') {
    return -0.3;
  }

  if (lane === 'review') {
    return -0.1;
  }

  if (lane === 'challenge') {
    return 0.8;
  }

  return 0.5;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function round(value: number, digits = 4) {
  return Number(value.toFixed(digits));
}

function stageForAge(ageMonths: number): LearnerStage {
  if (ageMonths >= 73) {
    return 'g1';
  }

  if (ageMonths >= 61) {
    return 'k';
  }

  return 'pre-k';
}

function coldStartThetaForAge(ageMonths: number) {
  return ageMonths >= 54 ? 0.6 : 0.3;
}

function sessionMinutes(history: QuestionAttemptRecord[]) {
  const totalMs = history.reduce((sum, record) => sum + record.totalTimeMs, 0);
  return round(totalMs / 60_000, 1);
}

function slidingAccuracy(history: QuestionAttemptRecord[], size: number) {
  const recent = history.slice(-size);
  if (recent.length === 0) {
    return 0;
  }

  return round(
    recent.filter((record) => record.finalCorrect).length / recent.length,
  );
}

function mapPromptFlowState(
  learnerProfile: LearnerProfile | null | undefined,
  fatigueLevel: 0 | 1 | 2,
): PromptFlowState {
  if (fatigueLevel === 2) {
    return 'fatigue';
  }

  if (fatigueLevel === 1) {
    return 'thinking';
  }

  if (learnerProfile?.flowState === 'bored') {
    return 'easy';
  }

  if (learnerProfile?.flowState === 'anxious') {
    return 'hard';
  }

  return 'flow';
}

function reasonCodeForTarget(
  learnerProfile: LearnerProfile | null | undefined,
  skillKey: LearnerSkillKey,
  lane: FlowQuestionLane,
) {
  const skill = learnerProfile?.skills[skillKey];
  if (!skill) {
    return `${skillKey}_${lane}_no_profile`;
  }

  if (lane === 'confidence') {
    return `${skillKey}_confidence_refresh`;
  }

  if (lane === 'challenge') {
    return `${skillKey}_challenge_window`;
  }

  if (skill.confidence < 0.5) {
    return `${skillKey}_low_confidence`;
  }

  if (skill.theta < 0) {
    return `${skillKey}_needs_support`;
  }

  return `${skillKey}_${lane}`;
}

function buildRecentQuestions(
  history: QuestionAttemptRecord[],
  learnerProfile: LearnerProfile | null | undefined,
) {
  if (history.length > 0) {
    return history.slice(-8).map((record) => ({
      stem: record.stem,
      choices: record.choices,
      correctAnswer: String(record.correctAnswer),
      childAnswer: record.childAnswer,
      firstAttemptCorrect: record.firstAttemptCorrect,
      hintCount: record.hintCount,
      reactionTimeMs: record.reactionTimeMs,
      skillKeys: skillKeysForQuestion(record),
      thetaAtTime: difficultyThetaForTags(record.tags),
      errorPattern: classifyError(record),
    }));
  }

  return (learnerProfile?.recentResponses ?? []).slice(-8).map((response) => ({
    stem: response.stem,
    choices: response.choices,
    correctAnswer: response.correctAnswer,
    childAnswer: response.childAnswer,
    firstAttemptCorrect: response.firstAttemptCorrect,
    hintCount: response.hintCount,
    reactionTimeMs: response.reactionTimeMs,
    skillKeys: response.skillKeys,
    thetaAtTime: response.difficultyTheta,
    errorPattern: null,
  }));
}

function buildTarget({
  ageMonths,
  lane,
  learnerProfile,
  targetSkillKey,
  targetTheta,
}: {
  ageMonths: number;
  lane: FlowQuestionLane;
  learnerProfile?: LearnerProfile | null;
  targetSkillKey?: LearnerSkillKey;
  targetTheta?: number;
}) {
  const skillKey =
    targetSkillKey ??
    chooseLearnerTargetSkill(learnerProfile, lane) ??
    'countingTo10';
  const flowOffset = targetOffsetForLane(lane);
  const seededTheta = coldStartThetaForAge(ageMonths);
  const skill = learnerProfile?.skills[skillKey];
  const currentTheta =
    learnerProfile && skill && skill.attempts > 0 ? skillTheta(learnerProfile, skillKey) : seededTheta;

  return {
    skillKey,
    currentTheta,
    targetTheta: targetTheta ?? currentTheta + flowOffset,
    flowOffset,
    lane,
    reasonCode: reasonCodeForTarget(learnerProfile, skillKey, lane),
  };
}

export function buildAdaptiveQuestionPayload({
  difficulty,
  lane,
  learnerProfile,
  history = [],
  serial,
  targetSkillKey,
  targetTheta,
  variant,
  reasoningMode,
  childMeta,
  nowMs = Date.now(),
}: BuildAdaptiveQuestionPayloadInput): AdaptiveQuestionPayload {
  const ageMonths = clamp(Math.round(childMeta?.ageMonths ?? 60), 48, 84);
  const fatigueLevel = detectFatigue(history);
  const target = buildTarget({
    ageMonths,
    lane,
    learnerProfile,
    targetSkillKey,
    targetTheta,
  });
  const recentQuestions = buildRecentQuestions(history, learnerProfile);
  const fingerprintSource =
    learnerProfile && learnerProfile.recentResponses.length > 0
      ? learnerProfile.recentResponses.map((response) => response.stem)
      : history.map((record) => record.stem);

  return {
    difficulty,
    lane,
    recentErrorPatterns: (learnerProfile?.errorPatterns ?? []).slice(-4).map((pattern) => ({
      count: pattern.count,
      label: pattern.label,
      skillKey: pattern.skillKey,
      type: pattern.type,
    })),
    recentResponses: (learnerProfile?.recentResponses ?? []).slice(-8).map((response) => ({
      difficultyTheta: response.difficultyTheta,
      finalCorrect: response.finalCorrect,
      firstAttemptCorrect: response.firstAttemptCorrect,
      hintCount: response.hintCount,
      questionId: response.questionId,
      skillKeys: response.skillKeys,
    })),
    serial,
    targetSkillKey: target.skillKey,
    targetTheta: target.targetTheta,
    variant,
    learner: {
      ageMonths,
      stage: childMeta?.stage ?? stageForAge(ageMonths),
      sessionMinutes: sessionMinutes(history),
      fatigueLevel,
      flowState: mapPromptFlowState(learnerProfile, fatigueLevel),
      slidingAccuracy: slidingAccuracy(history, 10),
    },
    skillRadar: Object.values(learnerProfile?.skills ?? {}).map((skill) => ({
      key: skill.key,
      theta: skill.theta,
      confidence: skill.confidence,
      lastSeenMinAgo:
        skill.lastSeen > 0 ? Math.max(0, Math.round((nowMs - skill.lastSeen) / 60_000)) : null,
      mastered: skill.theta >= 0.8 && skill.confidence >= 0.7,
    })),
    target,
    recentQuestions,
    recentFingerprints: buildRecentFingerprints(fingerprintSource),
    constraints: {
      variant: variant ?? 'matching',
      reasoningMode,
      forbiddenPatterns: ['repeat_stem', '>20_result'],
      maxChoices: 4,
      readingLevel: 'pre-literate',
    },
  };
}
