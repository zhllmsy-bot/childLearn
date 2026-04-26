import { describe, expect, it } from 'vitest';
import { detectFatigue } from './fatigueDetector';
import type { QuestionAttemptRecord } from './types';

function attempt(
  questionIndex: number,
  overrides: Partial<QuestionAttemptRecord> = {},
): QuestionAttemptRecord {
  return {
    questionId: `q-${questionIndex}`,
    questionIndex,
    tags: {
      numberRange: 'within_10',
      operationType: 'addition',
      presentationType: 'visual',
      visualSupport: 'strong',
      crossTen: false,
      carryOrBorrow: false,
      optionDistance: 'medium',
      difficultyLevel: 2,
    },
    stem: `${questionIndex + 1} + 1 = ?`,
    choices: ['2', '3', '4', '5'],
    correctAnswer: 5,
    childAnswer: '5',
    firstSelectedAnswer: 5,
    finalSelectedAnswer: 5,
    firstAttemptCorrect: true,
    finalCorrect: true,
    attemptCount: 1,
    reactionTimeMs: 2_400,
    firstResponseTimeMs: 2_400,
    totalTimeMs: 2_800,
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

describe('detectFatigue', () => {
  it('stays calm when pace and accuracy hold steady', () => {
    const history = Array.from({ length: 8 }, (_, index) => attempt(index));
    expect(detectFatigue(history)).toBe(0);
  });

  it('flags mild fatigue when pace slips with some accuracy loss', () => {
    const history = [
      attempt(0),
      attempt(1),
      attempt(2),
      attempt(3),
      attempt(4, {
        childAnswer: '4',
        finalSelectedAnswer: 4,
        firstAttemptCorrect: false,
        finalCorrect: false,
        reactionTimeMs: 3_600,
        firstResponseTimeMs: 3_600,
        result: 'wrong_final',
      }),
      attempt(5, {
        reactionTimeMs: 3_400,
        firstResponseTimeMs: 3_400,
      }),
      attempt(6, {
        childAnswer: '4',
        finalSelectedAnswer: 4,
        firstAttemptCorrect: false,
        finalCorrect: false,
        reactionTimeMs: 3_500,
        firstResponseTimeMs: 3_500,
        result: 'wrong_final',
      }),
      attempt(7, {
        reactionTimeMs: 3_200,
        firstResponseTimeMs: 3_200,
      }),
    ];

    expect(detectFatigue(history)).toBe(1);
  });

  it('flags strong fatigue when the back half slows and collapses', () => {
    const history = [
      attempt(0),
      attempt(1),
      attempt(2),
      attempt(3),
      attempt(4, {
        childAnswer: '4',
        finalSelectedAnswer: 4,
        firstAttemptCorrect: false,
        finalCorrect: false,
        reactionTimeMs: 10_500,
        firstResponseTimeMs: 10_500,
        idleMs: 12_500,
        result: 'wrong_final',
      }),
      attempt(5, {
        childAnswer: '4',
        finalSelectedAnswer: 4,
        firstAttemptCorrect: false,
        finalCorrect: false,
        reactionTimeMs: 10_800,
        firstResponseTimeMs: 10_800,
        idleMs: 12_800,
        result: 'wrong_final',
      }),
      attempt(6, {
        childAnswer: '4',
        finalSelectedAnswer: 4,
        firstAttemptCorrect: false,
        finalCorrect: false,
        reactionTimeMs: 9_800,
        firstResponseTimeMs: 9_800,
        idleMs: 12_200,
        result: 'wrong_final',
      }),
      attempt(7, {
        reactionTimeMs: 9_600,
        firstResponseTimeMs: 9_600,
        idleMs: 12_100,
      }),
    ];

    expect(detectFatigue(history)).toBe(2);
  });
});
