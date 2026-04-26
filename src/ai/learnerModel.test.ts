import { describe, expect, it } from 'vitest';
import type { QuestionAttemptRecord } from '../engagement/flow/types';
import {
  applyProfileRefinement,
  createEmptyLearnerProfile,
  parseProfileRefinement,
  skillKeysForQuestion,
  updateLearnerModel,
} from './learnerModel';

function attempt(
  partial: Partial<QuestionAttemptRecord> = {},
): QuestionAttemptRecord {
  const base: QuestionAttemptRecord = {
    questionId: 'make-ten-2-7',
    questionIndex: 0,
    tags: {
      numberRange: 'within_10',
      operationType: 'addition',
      presentationType: 'semi_visual',
      visualSupport: 'medium',
      crossTen: true,
      carryOrBorrow: true,
      optionDistance: 'close',
      difficultyLevel: 3,
    },
    stem: '7 + 3 = ?',
    choices: ['3', '9', '10', '11'],
    correctAnswer: 3,
    childAnswer: '3',
    firstSelectedAnswer: 3,
    finalSelectedAnswer: 3,
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

describe('learnerModel', () => {
  it('maps one question into multiple micro skills', () => {
    expect(skillKeysForQuestion(attempt())).toEqual(
      expect.arrayContaining([
        'countingTo10',
        'addWithin10',
        'makeTen',
        'crossTenBridge',
        'semiVisualBridge',
        'closeOptionDiscrimination',
      ]),
    );
  });

  it('raises theta after fluent success and keeps recent evidence', () => {
    const profile = updateLearnerModel(createEmptyLearnerProfile(), attempt(), 1000);

    expect(profile.skills.makeTen.theta).toBeGreaterThan(0);
    expect(profile.skills.addWithin10.theta).toBeGreaterThan(0);
    expect(profile.skills.makeTen.confidence).toBeGreaterThan(0.15);
    expect(profile.recentResponses).toHaveLength(1);
    expect(profile.flowState).toBe('flow');
  });

  it('lowers theta and records an error pattern after final misses', () => {
    let profile = createEmptyLearnerProfile();

    Array.from({ length: 4 }).forEach((_, index) => {
      profile = updateLearnerModel(
        profile,
        attempt({
          questionIndex: index,
          firstAttemptCorrect: false,
          finalCorrect: false,
          firstSelectedAnswer: 2,
          finalSelectedAnswer: 2,
          attemptCount: 3,
          hintCount: 2,
          firstResponseTimeMs: 9600,
          result: 'wrong_final',
        }),
        1000 + index,
      );
    });

    expect(profile.skills.makeTen.theta).toBeLessThan(0);
    expect(profile.errorPatterns.length).toBeGreaterThan(0);
    expect(profile.flowState).toBe('anxious');
  });

  it('applies high-confidence LLM refinements with a bounded delta', () => {
    const refinement = parseProfileRefinement({
      schemaVersion: 'childlearn.profile-refinement.v1',
      confidence: 0.88,
      skillAdjustments: [
        {
          skillKey: 'makeTen',
          deltaTheta: -0.9,
          deltaConfidence: 0.2,
          evidenceStrength: 'high',
          reason: 'Repeated make-ten confusion.',
        },
      ],
      errorPatterns: [
        {
          type: 'conceptual',
          label: '凑十拆分不稳',
          skillKey: 'makeTen',
          evidenceQuestionIds: ['q1', 'q2'],
        },
      ],
      nextSkill: {
        skillKey: 'makeTen',
        difficultyAdjustment: 0.4,
        reason: 'Stay near make-ten with support.',
      },
      safetyNotes: [],
    });

    expect(refinement).not.toBeNull();

    const profile = applyProfileRefinement(
      createEmptyLearnerProfile(),
      refinement!,
      2000,
    );

    expect(profile.skills.makeTen.theta).toBe(-0.25);
    expect(profile.skills.makeTen.confidence).toBe(0.23);
    expect(profile.recommendedSkill).toBe('makeTen');
    expect(profile.errorPatterns[0]?.label).toBe('凑十拆分不稳');
  });

  it('blends lower-confidence LLM refinements instead of discarding them', () => {
    const refinement = parseProfileRefinement({
      schemaVersion: 'childlearn.profile-refinement.v1',
      confidence: 0.4,
      skillAdjustments: [
        {
          skillKey: 'makeTen',
          deltaTheta: -0.9,
          deltaConfidence: 0.2,
          evidenceStrength: 'high',
          reason: 'Some signs of make-ten confusion.',
        },
      ],
      errorPatterns: [],
      nextSkill: {
        skillKey: 'makeTen',
        difficultyAdjustment: 0.2,
        reason: 'Stay nearby.',
      },
      safetyNotes: [],
    });

    expect(refinement).not.toBeNull();

    const profile = applyProfileRefinement(
      createEmptyLearnerProfile(),
      refinement!,
      3000,
    );

    expect(profile.skills.makeTen.theta).toBeLessThan(0);
    expect(profile.skills.makeTen.theta).toBeGreaterThan(-0.25);
    expect(profile.recommendedSkill).toBe('makeTen');
  });
});
