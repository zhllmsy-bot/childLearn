import { describe, expect, it } from 'vitest';
import type { QuestionAttemptRecord } from '../flow';
import { scoreDiagnosticAttempts } from './diagnosticScoring';

function record(overrides: Partial<QuestionAttemptRecord>): QuestionAttemptRecord {
  const base: QuestionAttemptRecord = {
    questionId: 'q',
    questionIndex: 0,
    tags: {
      numberRange: 'within_10',
      operationType: 'addition',
      presentationType: 'visual',
      visualSupport: 'strong',
      optionDistance: 'close',
      crossTen: false,
      carryOrBorrow: false,
      difficultyLevel: 3,
    },
    stem: '1 + 0 = ?',
    choices: ['0', '1', '2', '3'],
    correctAnswer: 1,
    childAnswer: '1',
    firstSelectedAnswer: 1,
    finalSelectedAnswer: 1,
    firstAttemptCorrect: true,
    finalCorrect: true,
    attemptCount: 1,
    reactionTimeMs: 3000,
    firstResponseTimeMs: 3000,
    totalTimeMs: 4000,
    audioReplayCount: 0,
    hintCount: 0,
    idleMs: 0,
    rapidClickCount: 0,
    feedbackInterruptClickCount: 0,
    abandoned: false,
    result: 'correct',
  };

  return { ...base, ...overrides };
}

describe('scoreDiagnosticAttempts', () => {
  it('places fluent diagnostic runs at a higher start difficulty', () => {
    const score = scoreDiagnosticAttempts([
      record({}),
      record({}),
      record({}),
      record({}),
      record({ hintCount: 1 }),
    ]);

    expect(score.recommendedDifficulty).toBe(6);
    expect(score.readinessLabel).toBe('challenge');
  });

  it('keeps supported diagnostic runs in the entry band', () => {
    const score = scoreDiagnosticAttempts([
      record({ firstAttemptCorrect: false, hintCount: 1 }),
      record({ firstAttemptCorrect: false, finalCorrect: false, hintCount: 2 }),
      record({ firstAttemptCorrect: false, finalCorrect: false, hintCount: 2 }),
      record({ firstAttemptCorrect: false, finalCorrect: false, hintCount: 2 }),
      record({ firstAttemptCorrect: false, finalCorrect: false, hintCount: 2 }),
    ]);

    expect(score.recommendedDifficulty).toBe(2);
    expect(score.readinessLabel).toBe('support');
  });
});
