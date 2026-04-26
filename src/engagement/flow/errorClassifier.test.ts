import { describe, expect, it } from 'vitest';
import { classifyError } from './errorClassifier';
import type { QuestionAttemptRecord } from './types';

function attempt(overrides: Partial<QuestionAttemptRecord> = {}): QuestionAttemptRecord {
  return {
    questionId: 'q-1',
    questionIndex: 0,
    tags: {
      numberRange: 'within_10',
      operationType: 'addition',
      presentationType: 'pure_number',
      visualSupport: 'none',
      crossTen: false,
      carryOrBorrow: false,
      optionDistance: 'medium',
      difficultyLevel: 4,
    },
    stem: '6 + 2 = ?',
    choices: ['6', '7', '8', '9'],
    correctAnswer: 8,
    childAnswer: '8',
    firstSelectedAnswer: 8,
    finalSelectedAnswer: 8,
    firstAttemptCorrect: true,
    finalCorrect: true,
    attemptCount: 1,
    reactionTimeMs: 2200,
    firstResponseTimeMs: 2200,
    totalTimeMs: 2600,
    audioReplayCount: 0,
    hintCount: 0,
    idleMs: 0,
    rapidClickCount: 0,
    feedbackInterruptClickCount: 0,
    abandoned: false,
    result: 'correct',
    ...overrides,
  };
}

describe('classifyError', () => {
  it('returns swap-op for opposite-operation answers', () => {
    expect(
      classifyError(
        attempt({
          childAnswer: '4',
          finalSelectedAnswer: 4,
          firstAttemptCorrect: false,
          finalCorrect: false,
          result: 'wrong_final',
        }),
      ),
    ).toBe('swap-op');
  });

  it('returns off-one for near misses', () => {
    expect(
      classifyError(
        attempt({
          childAnswer: '7',
          finalSelectedAnswer: 7,
          firstAttemptCorrect: false,
          finalCorrect: false,
          result: 'wrong_final',
        }),
      ),
    ).toBe('off-one');
  });

  it('returns partial when the child only keeps one operand', () => {
    expect(
      classifyError(
        attempt({
          childAnswer: '6',
          finalSelectedAnswer: 6,
          firstAttemptCorrect: false,
          finalCorrect: false,
          result: 'wrong_final',
        }),
      ),
    ).toBe('partial');
  });

  it('returns timeout when the response dragged on', () => {
    expect(
      classifyError(
        attempt({
          childAnswer: '7',
          finalSelectedAnswer: 7,
          firstAttemptCorrect: false,
          finalCorrect: false,
          reactionTimeMs: 13_000,
          firstResponseTimeMs: 13_000,
          idleMs: 13_000,
          result: 'wrong_final',
        }),
      ),
    ).toBe('timeout');
  });
});
