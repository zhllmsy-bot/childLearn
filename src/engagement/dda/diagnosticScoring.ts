import type { QuestionAttemptRecord } from '../flow';

export interface DiagnosticScore {
  correctCount: number;
  firstTryCorrectCount: number;
  recommendedDifficulty: number;
  readinessLabel: 'support' | 'core' | 'challenge';
}

export function scoreDiagnosticAttempts(records: QuestionAttemptRecord[]): DiagnosticScore {
  const correctCount = records.filter((record) => record.finalCorrect).length;
  const firstTryCorrectCount = records.filter(
    (record) => record.firstAttemptCorrect,
  ).length;
  const slowOrSupportedCount = records.filter(
    (record) => record.hintCount > 0 || record.firstResponseTimeMs >= 8000,
  ).length;

  if (firstTryCorrectCount >= 3 && slowOrSupportedCount === 0) {
    return {
      correctCount,
      firstTryCorrectCount,
      recommendedDifficulty: 5,
      readinessLabel: 'challenge',
    };
  }

  if (correctCount >= 2 && firstTryCorrectCount >= 1) {
    return {
      correctCount,
      firstTryCorrectCount,
      recommendedDifficulty: 3,
      readinessLabel: 'core',
    };
  }

  return {
    correctCount,
    firstTryCorrectCount,
    recommendedDifficulty: 1,
    readinessLabel: 'support',
  };
}
