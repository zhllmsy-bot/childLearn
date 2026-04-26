import type { LearnerSkillKey } from '../../ai/learnerModel';
import { generateQuestion } from '../questionFactory';
import type { Question, QuestionVariant } from '../types';

export const DIAGNOSTIC_STORAGE_KEY = 'childlearn.diagnostic-v1';
export const DIAGNOSTIC_QUESTION_COUNT = 3;

interface DiagnosticQuestionPlan {
  variant: QuestionVariant;
  difficulty: number;
  serial: number;
  skill: LearnerSkillKey;
}

export interface DiagnosticSnapshot {
  schemaVersion: 1;
  completedAt: number;
  recommendedDifficulty: number;
  correctCount: number;
  firstTryCorrectCount: number;
  runSeed?: number;
}

const DIAGNOSTIC_PLAN: DiagnosticQuestionPlan[] = [
  { variant: 'numberLine', difficulty: 3, serial: 0, skill: 'numberLineDistance' },
  { variant: 'compare', difficulty: 2, serial: 1, skill: 'compareWithin5' },
  { variant: 'makeTen', difficulty: 4, serial: 2, skill: 'makeTen' },
];

function normalizeSeed(seed: number) {
  return Math.abs(Math.round(seed)) || 1;
}

function createSeededRng(seed: number) {
  let value = normalizeSeed(seed) >>> 0;

  return () => {
    value += 0x6d2b79f5;
    let next = value;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function diagnosticPlanForSeed(runSeed: number) {
  const rng = createSeededRng(runSeed);
  return [...DIAGNOSTIC_PLAN].sort(() => rng() - 0.5);
}

export function createDiagnosticRunSeed(now = Date.now()) {
  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    return values[0] || normalizeSeed(now);
  }

  return normalizeSeed(now + Math.random() * 1_000_000);
}

export function getDiagnosticQuestion(serial: number, runSeed = 1): Question {
  const safeSeed = normalizeSeed(runSeed);
  const plan = diagnosticPlanForSeed(safeSeed)[serial % DIAGNOSTIC_PLAN.length];
  const questionSerial = plan.serial + serial + (safeSeed % 997);
  const question = generateQuestion({
    difficulty: plan.difficulty,
    goldenMode: 'required',
    goldenTags: ['diagnostic'],
    serial: questionSerial,
    targetSkillKey: plan.skill,
    variant: plan.variant,
    rng: createSeededRng(safeSeed + serial * 101 + plan.difficulty * 17),
  });

  return {
    ...question,
    id: `diagnostic-${serial}-${question.id}`,
    prompt: `${question.prompt} 这题帮我了解起点。`,
  };
}

export function readDiagnosticSnapshot(): DiagnosticSnapshot | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(DIAGNOSTIC_STORAGE_KEY) ?? 'null',
    ) as Partial<DiagnosticSnapshot> | null;

    if (!parsed || parsed.schemaVersion !== 1) {
      return null;
    }

    return {
      schemaVersion: 1,
      completedAt: Number(parsed.completedAt ?? 0),
      recommendedDifficulty: Math.min(
        Math.max(Math.round(Number(parsed.recommendedDifficulty ?? 1)), 1),
        10,
      ),
      correctCount: Math.max(0, Math.round(Number(parsed.correctCount ?? 0))),
    firstTryCorrectCount: Math.max(
        0,
        Math.round(Number(parsed.firstTryCorrectCount ?? 0)),
      ),
      runSeed: Number.isFinite(Number(parsed.runSeed))
        ? normalizeSeed(Number(parsed.runSeed))
        : undefined,
    };
  } catch {
    return null;
  }
}

export function writeDiagnosticSnapshot(snapshot: DiagnosticSnapshot) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(DIAGNOSTIC_STORAGE_KEY, JSON.stringify(snapshot));
}

export function clearDiagnosticSnapshot() {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(DIAGNOSTIC_STORAGE_KEY);
}
