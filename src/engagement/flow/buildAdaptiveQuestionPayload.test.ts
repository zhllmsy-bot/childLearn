import { describe, expect, it } from 'vitest';
import { createEmptyLearnerProfile, updateLearnerModel } from '../../ai/learnerModel';
import { buildAdaptiveQuestionPayload } from './buildAdaptiveQuestionPayload';
import { fingerprintStem } from './fingerprint';
import type { QuestionAttemptRecord } from './types';

function attempt(
  questionIndex: number,
  overrides: Partial<QuestionAttemptRecord> = {},
): QuestionAttemptRecord {
  return {
    questionId: `make-ten-${questionIndex}`,
    questionIndex,
    tags: {
      numberRange: 'within_10',
      operationType: 'addition',
      presentationType: 'semi_visual',
      visualSupport: 'medium',
      crossTen: true,
      carryOrBorrow: true,
      optionDistance: 'close',
      difficultyLevel: 4,
    },
    stem: '7 + 3 = ?',
    choices: ['8', '9', '10', '11'],
    correctAnswer: 10,
    childAnswer: '10',
    firstSelectedAnswer: 10,
    finalSelectedAnswer: 10,
    firstAttemptCorrect: true,
    finalCorrect: true,
    attemptCount: 1,
    reactionTimeMs: 2_400,
    firstResponseTimeMs: 2_400,
    totalTimeMs: 2_900,
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

describe('buildAdaptiveQuestionPayload', () => {
  it('builds an enriched payload without dropping legacy fields', () => {
    const history = [
      attempt(0),
      attempt(1, {
        stem: '8 + 2 = ?',
        childAnswer: '9',
        firstSelectedAnswer: 9,
        finalSelectedAnswer: 9,
        firstAttemptCorrect: false,
        finalCorrect: false,
        reactionTimeMs: 4_400,
        firstResponseTimeMs: 4_400,
        hintCount: 1,
        result: 'wrong_final',
      }),
    ];
    const learnerProfile = history.reduce(
      (profile, record, index) => updateLearnerModel(profile, record, 60_000 + index * 1_000),
      createEmptyLearnerProfile(),
    );

    const payload = buildAdaptiveQuestionPayload({
      difficulty: 4,
      history,
      lane: 'challenge',
      learnerProfile,
      reasoningMode: 'multiStep',
      serial: 3,
      targetSkillKey: 'makeTen',
      targetTheta: 0.45,
      variant: 'makeTen',
      nowMs: 120_000,
    });

    expect(payload.difficulty).toBe(4);
    expect(payload.lane).toBe('challenge');
    expect(payload.variant).toBe('makeTen');
    expect(payload.learner.ageMonths).toBe(60);
    expect(payload.learner.sessionMinutes).toBeGreaterThan(0);
    expect(payload.target).toMatchObject({
      skillKey: 'makeTen',
      targetTheta: 0.45,
      lane: 'challenge',
    });
    expect(payload.recentQuestions).toHaveLength(2);
    expect(payload.recentQuestions[1]?.errorPattern).toBe('off-one');
    expect(payload.recentFingerprints).toEqual([
      fingerprintStem('7 + 3 = ?'),
      fingerprintStem('8 + 2 = ?'),
    ]);
    expect(payload.constraints).toMatchObject({
      variant: 'makeTen',
      reasoningMode: 'multiStep',
      maxChoices: 4,
      readingLevel: 'pre-literate',
    });
    expect(payload.recentResponses).toHaveLength(2);
  });

  it('seeds a stronger cold-start target theta from age when no attempts exist yet', () => {
    const payload = buildAdaptiveQuestionPayload({
      difficulty: 3,
      lane: 'current',
      history: [],
      learnerProfile: createEmptyLearnerProfile(),
      serial: 0,
      nowMs: 120_000,
    });

    expect(payload.target.skillKey).toBe('countingTo10');
    expect(payload.target.currentTheta).toBe(0.6);
    expect(payload.target.targetTheta).toBe(1.1);
  });
});
