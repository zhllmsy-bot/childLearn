import { describe, expect, it } from 'vitest';
import type { QuestionAttemptRecord } from '../flow';
import {
  createAbilityAssessment,
  createEmptyAbilityProfile,
  updateAbilityProfile,
} from './abilityProfile';

function attempt(
  partial: Partial<QuestionAttemptRecord> = {},
): QuestionAttemptRecord {
  const base: QuestionAttemptRecord = {
    questionId: 'q1',
    questionIndex: 0,
    tags: {
      numberRange: 'within_10',
      operationType: 'addition',
      presentationType: 'semi_visual',
      visualSupport: 'medium',
      crossTen: true,
      carryOrBorrow: true,
      optionDistance: 'close',
      difficultyLevel: 2,
    },
    stem: '4 + 3 = ?',
    choices: ['5', '6', '7', '8'],
    correctAnswer: 7,
    childAnswer: '7',
    firstSelectedAnswer: 7,
    finalSelectedAnswer: 7,
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
  };

  return { ...base, ...partial };
}

describe('abilityProfile', () => {
  it('marks repeated fluent skills as mastered', () => {
    let profile = createEmptyAbilityProfile();

    Array.from({ length: 5 }).forEach((_, index) => {
      profile = updateAbilityProfile(profile, attempt({ questionIndex: index }), index);
    });

    const assessment = createAbilityAssessment(profile);

    expect(assessment.totalCompletedQuestions).toBe(5);
    expect(assessment.mastered.some((skill) => skill.key === 'operation:addition')).toBe(
      true,
    );
    expect(assessment.readiness).toBe('mastered');
  });

  it('surfaces skills that need attention when hints are common', () => {
    let profile = createEmptyAbilityProfile();

    Array.from({ length: 4 }).forEach((_, index) => {
      profile = updateAbilityProfile(
        profile,
        attempt({
          questionIndex: index,
          firstAttemptCorrect: false,
          firstSelectedAnswer: 6,
          attemptCount: 2,
          hintCount: 1,
          result: 'wrong_first_then_correct',
        }),
        index,
      );
    });

    const assessment = createAbilityAssessment(profile);

    expect(assessment.focus.some((skill) => skill.key === 'operation:addition')).toBe(
      true,
    );
    expect(assessment.readiness).toBe('developing');
  });

  it('marks repeated final misses as challenging evidence', () => {
    let profile = createEmptyAbilityProfile();

    Array.from({ length: 3 }).forEach((_, index) => {
      profile = updateAbilityProfile(
        profile,
        attempt({
          questionIndex: index,
          firstAttemptCorrect: false,
          finalCorrect: false,
          firstSelectedAnswer: 6,
          finalSelectedAnswer: 6,
          attemptCount: 3,
          hintCount: 3,
          firstResponseTimeMs: 9200,
          totalTimeMs: 16000,
          result: 'wrong_final',
        }),
        index,
      );
    });

    const assessment = createAbilityAssessment(profile);

    expect(assessment.focus.some((skill) => skill.key === 'operation:addition')).toBe(
      true,
    );
    expect(
      assessment.focus.find((skill) => skill.key === 'operation:addition')?.status,
    ).toBe('challenging');
    expect(assessment.readiness).toBe('challenging');
  });
});
