import { describe, expect, it } from 'vitest';
import { createLearningBatchReport } from './batchAnalyzer';
import type { QuestionAttemptRecord, QuestionDifficultyTags } from './types';

const BASE_TAGS: QuestionDifficultyTags = {
  numberRange: 'within_10',
  operationType: 'addition',
  presentationType: 'visual',
  visualSupport: 'strong',
  crossTen: false,
  carryOrBorrow: false,
  optionDistance: 'medium',
  difficultyLevel: 2,
};

function attempt(
  questionIndex: number,
  overrides: Partial<QuestionAttemptRecord> = {},
): QuestionAttemptRecord {
  const finalCorrect = overrides.finalCorrect ?? true;
  const firstAttemptCorrect = overrides.firstAttemptCorrect ?? finalCorrect;

  const base: QuestionAttemptRecord = {
    questionId: `q-${questionIndex}`,
    questionIndex,
    tags: BASE_TAGS,
    stem: `${questionIndex + 1} + 1 = ?`,
    choices: ['2', '3', '4', '5'],
    correctAnswer: 5,
    childAnswer: finalCorrect ? '5' : '4',
    firstSelectedAnswer: firstAttemptCorrect ? 5 : 4,
    finalSelectedAnswer: finalCorrect ? 5 : 4,
    firstAttemptCorrect,
    finalCorrect,
    attemptCount: firstAttemptCorrect ? 1 : 2,
    reactionTimeMs: 3000,
    firstResponseTimeMs: 3000,
    totalTimeMs: firstAttemptCorrect ? 3500 : 7000,
    audioReplayCount: 0,
    hintCount: firstAttemptCorrect ? 0 : 1,
    idleMs: 0,
    rapidClickCount: 0,
    feedbackInterruptClickCount: 0,
    abandoned: false,
    result: firstAttemptCorrect
      ? 'correct'
      : finalCorrect
        ? 'wrong_first_then_correct'
        : 'wrong_final',
  };

  return { ...base, ...overrides };
}

function reportFrom(attempts: QuestionAttemptRecord[]) {
  return createLearningBatchReport({
    batchId: 'batch-1',
    currentDifficulty: 3,
    attempts,
    baseline: {
      avgFirstResponseTimeMs: 3000,
    },
  });
}

describe('createLearningBatchReport', () => {
  it('classifies a high-accuracy low-effort batch as easy', () => {
    const report = reportFrom(Array.from({ length: 10 }, (_, index) => attempt(index)));

    expect(report.rulePreState).toBe('easy');
    expect(report.summary.firstTryAccuracy).toBe(1);
    expect(report.summary.finalAccuracy).toBe(1);
  });

  it('classifies wrong-first but recoverable work as stretch', () => {
    const attempts = [
      ...Array.from({ length: 5 }, (_, index) => attempt(index)),
      ...Array.from({ length: 4 }, (_, offset) =>
        attempt(5 + offset, {
          firstAttemptCorrect: false,
          finalCorrect: true,
          hintCount: 1,
        }),
      ),
      attempt(9, {
        firstAttemptCorrect: false,
        finalCorrect: false,
        hintCount: 1,
      }),
    ];

    const report = reportFrom(attempts);

    expect(report.rulePreState).toBe('stretch');
    expect(report.summary.firstTryAccuracy).toBe(0.5);
    expect(report.summary.finalAccuracy).toBe(0.9);
    expect(report.summary.correctionRateAfterFirstWrong).toBe(0.8);
  });

  it('classifies low final accuracy or repeated final misses as hard', () => {
    const attempts = [
      ...Array.from({ length: 4 }, (_, index) => attempt(index)),
      ...Array.from({ length: 6 }, (_, offset) =>
        attempt(4 + offset, {
          firstAttemptCorrect: false,
          finalCorrect: false,
          hintCount: 1,
        }),
      ),
    ];

    const report = reportFrom(attempts);

    expect(report.rulePreState).toBe('hard');
    expect(report.summary.finalAccuracy).toBe(0.4);
    expect(report.summary.longestWrongFinalStreak).toBe(6);
  });

  it('classifies second-half collapse with engagement noise as fatigue', () => {
    const attempts = [
      ...Array.from({ length: 5 }, (_, index) => attempt(index)),
      attempt(5, {
        firstAttemptCorrect: false,
        finalCorrect: true,
        audioReplayCount: 1,
        rapidClickCount: 1,
      }),
      ...Array.from({ length: 4 }, (_, offset) =>
        attempt(6 + offset, {
          firstAttemptCorrect: false,
          finalCorrect: false,
          audioReplayCount: 1,
          rapidClickCount: 1,
        }),
      ),
    ];

    const report = reportFrom(attempts);

    expect(report.rulePreState).toBe('fatigue');
    expect(report.firstHalfSummary.finalAccuracy).toBe(1);
    expect(report.secondHalfSummary.finalAccuracy).toBe(0.2);
  });

  it('groups evidence by tag with sample strength and time signals', () => {
    const weakTags: QuestionDifficultyTags = {
      ...BASE_TAGS,
      operationType: 'subtraction',
      presentationType: 'semi_visual',
    };
    const report = reportFrom([
      attempt(0, { tags: weakTags, firstResponseTimeMs: 6000 }),
      attempt(1, { tags: weakTags, firstResponseTimeMs: 6000 }),
      attempt(2, { tags: weakTags, firstResponseTimeMs: 6000 }),
    ]);

    const subtractionSlice = report.byTag.find(
      (slice) => slice.tagKey === 'operation:subtraction',
    );

    expect(subtractionSlice).toMatchObject({
      sampleCount: 3,
      evidenceStrength: 'medium',
      avgTimeVsBaseline: 2,
    });
    expect(subtractionSlice?.signals).toContain('response_time_high_vs_baseline');
  });
});
