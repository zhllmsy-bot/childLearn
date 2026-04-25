import { generateQuestion } from '../questionFactory';
import type { Question, QuestionVariant } from '../types';

export const DIAGNOSTIC_STORAGE_KEY = 'childlearn.diagnostic-v1';
export const DIAGNOSTIC_QUESTION_COUNT = 3;

interface DiagnosticQuestionPlan {
  variant: QuestionVariant;
  difficulty: number;
  serial: number;
}

export interface DiagnosticSnapshot {
  schemaVersion: 1;
  completedAt: number;
  recommendedDifficulty: number;
  correctCount: number;
  firstTryCorrectCount: number;
}

const DIAGNOSTIC_PLAN: DiagnosticQuestionPlan[] = [
  { variant: 'numberLine', difficulty: 3, serial: 0 },
  { variant: 'compare', difficulty: 2, serial: 1 },
  { variant: 'makeTen', difficulty: 4, serial: 2 },
];

const DIAGNOSTIC_RNG_VALUES = [0.24, 0.62, 0.38];

function fixedRng(seed: number) {
  return () => DIAGNOSTIC_RNG_VALUES[seed % DIAGNOSTIC_RNG_VALUES.length] ?? 0.42;
}

export function getDiagnosticQuestion(serial: number): Question {
  const plan = DIAGNOSTIC_PLAN[serial % DIAGNOSTIC_PLAN.length];
  const question = generateQuestion({
    difficulty: plan.difficulty,
    serial: plan.serial,
    variant: plan.variant,
    rng: fixedRng(serial),
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
