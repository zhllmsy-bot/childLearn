import type { QuestionAttemptRecord } from '../engagement/flow/types';
import { classifyError } from '../engagement/flow/errorClassifier';
import {
  difficultyThetaForTags,
  skillKeysForQuestion,
  LEARNER_SKILL_KEYS,
  type ColdStartBaselineAssessment,
  type LearnerSkillKey,
} from './learnerModel';

export interface ColdStartProbeAttempt {
  childAnswer: string;
  choices?: string[];
  correctAnswer: string;
  errorPattern?: ReturnType<typeof classifyError>;
  finalCorrect: boolean;
  firstAttemptCorrect: boolean;
  hintCount: number;
  questionId: string;
  questionIndex: number;
  reactionTimeMs: number;
  result: QuestionAttemptRecord['result'];
  skillKeys: LearnerSkillKey[];
  stem: string;
  thetaAtTime: number;
  totalTimeMs: number;
}

export interface ColdStartProbePayload {
  ageMonths: number;
  attemptHistory: ColdStartProbeAttempt[];
  probeIndex: number;
  remainingProbes: number;
}

export interface ColdStartBaselinePayload {
  ageMonths: number;
  attemptHistory: ColdStartProbeAttempt[];
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function round(value: number, digits = 4) {
  return Number(value.toFixed(digits));
}

export function coldStartSeedThetaForAge(ageMonths: number) {
  return ageMonths >= 66 ? 0.9 : ageMonths >= 54 ? 0.6 : 0.3;
}

export function coldStartAttemptHistory(records: QuestionAttemptRecord[]): ColdStartProbeAttempt[] {
  return records.map((record) => ({
    childAnswer: record.childAnswer,
    choices: record.choices,
    correctAnswer: String(record.correctAnswer),
    errorPattern: classifyError(record),
    finalCorrect: record.finalCorrect,
    firstAttemptCorrect: record.firstAttemptCorrect,
    hintCount: record.hintCount,
    questionId: record.questionId,
    questionIndex: record.questionIndex,
    reactionTimeMs: record.reactionTimeMs,
    result: record.result,
    skillKeys: skillKeysForQuestion(record),
    stem: record.stem,
    thetaAtTime: difficultyThetaForTags(record.tags),
    totalTimeMs: record.totalTimeMs,
  }));
}

export function buildColdStartProbePayload({
  ageMonths = 60,
  records,
  serial,
  totalProbes,
}: {
  ageMonths?: number;
  records: QuestionAttemptRecord[];
  serial: number;
  totalProbes: number;
}): ColdStartProbePayload {
  const safeAgeMonths = clamp(Math.round(ageMonths), 48, 84);
  return {
    ageMonths: safeAgeMonths,
    attemptHistory: coldStartAttemptHistory(records),
    probeIndex: serial + 1,
    remainingProbes: Math.max(totalProbes - serial, 0),
  };
}

export function buildColdStartBaselinePayload({
  ageMonths = 60,
  records,
}: {
  ageMonths?: number;
  records: QuestionAttemptRecord[];
}): ColdStartBaselinePayload {
  return {
    ageMonths: clamp(Math.round(ageMonths), 48, 84),
    attemptHistory: coldStartAttemptHistory(records),
  };
}

export function fallbackBaselineForAge(ageMonths: number): ColdStartBaselineAssessment {
  const seedTheta = coldStartSeedThetaForAge(ageMonths);
  const baselineTheta = Object.fromEntries(
    LEARNER_SKILL_KEYS.map((skillKey) => [skillKey, round(seedTheta)]),
  ) as Record<LearnerSkillKey, number>;

  return {
    schemaVersion: 'childlearn.cold-start-baseline.v1',
    confidence: 0.28,
    baselineTheta,
    recommendedDifficulty: clamp(Math.round(seedTheta * 2 + 5), 1, 10),
    notes: ['fallback_age_seed'],
  };
}
