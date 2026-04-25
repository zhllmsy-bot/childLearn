import { describe, expect, it } from 'vitest';
import { createLearningBatchReport } from './batchAnalyzer';
import { approveFlowPolicy } from './safetyGovernor';
import type {
  LlmLearningObservation,
  QuestionAttemptRecord,
  QuestionDifficultyTags,
} from './types';

const TAGS: QuestionDifficultyTags = {
  numberRange: 'within_10',
  operationType: 'addition',
  presentationType: 'visual',
  visualSupport: 'strong',
  crossTen: false,
  carryOrBorrow: false,
  optionDistance: 'medium',
  difficultyLevel: 2,
};

function record(index: number, finalCorrect = true): QuestionAttemptRecord {
  return {
    questionId: `q-${index}`,
    questionIndex: index,
    tags: TAGS,
    correctAnswer: 3,
    firstSelectedAnswer: finalCorrect ? 3 : 2,
    finalSelectedAnswer: finalCorrect ? 3 : 2,
    firstAttemptCorrect: finalCorrect,
    finalCorrect,
    attemptCount: finalCorrect ? 1 : 2,
    firstResponseTimeMs: 2500,
    totalTimeMs: finalCorrect ? 3000 : 7000,
    audioReplayCount: 0,
    hintCount: finalCorrect ? 0 : 1,
    idleMs: 0,
    rapidClickCount: 0,
    feedbackInterruptClickCount: 0,
    abandoned: false,
    result: finalCorrect ? 'correct' : 'wrong_final',
  };
}

function reportFor(results: boolean[]) {
  return createLearningBatchReport({
    batchId: 'batch',
    currentDifficulty: 3,
    attempts: results.map((result, index) => record(index, result)),
  });
}

const HARD_OBSERVATION: LlmLearningObservation = {
  overallState: 'hard',
  confidence: 0.82,
  stateReason: 'Hints did not rescue final correctness.',
  primaryIssue: 'skill_gap',
  masteredSkills: [],
  weakSkills: [],
  riskSignals: [],
  doNotInfer: [],
  recommendation: {
    direction: 'decrease_slightly',
    adjustmentDimension: 'visual_support',
    suggestedMix: {
      confidence: 3,
      review: 3,
      current: 3,
      challenge: 1,
    },
    avoid: [],
  },
  uxSuggestions: [],
};

describe('approveFlowPolicy', () => {
  it('does not increase difficulty after a single easy batch', () => {
    const policy = approveFlowPolicy({
      report: reportFor(Array.from({ length: 10 }, () => true)),
    });

    expect(policy.finalState).toBe('easy');
    expect(policy.nextDifficulty).toBe(3);
    expect(policy.mix.challenge).toBe(3);
  });

  it('allows one-level increase only after repeated easy batches', () => {
    const policy = approveFlowPolicy({
      report: reportFor(Array.from({ length: 10 }, () => true)),
      recentStates: ['easy'],
    });

    expect(policy.nextDifficulty).toBe(4);
    expect(policy.constraints.maxLevelIncrease).toBe(1);
  });

  it('keeps the level for one hard batch but lowers after repeated hard batches', () => {
    const report = reportFor(Array.from({ length: 10 }, () => false));

    expect(approveFlowPolicy({ report }).nextDifficulty).toBe(3);
    expect(approveFlowPolicy({ report, recentStates: ['hard'] }).nextDifficulty).toBe(
      2,
    );
  });

  it('uses a short no-challenge recovery policy for fatigue', () => {
    const report = reportFor([
      true,
      true,
      true,
      true,
      true,
      false,
      false,
      false,
      false,
      false,
    ]);
    const fatigueReport = {
      ...report,
      rulePreState: 'fatigue' as const,
    };

    const policy = approveFlowPolicy({ report: fatigueReport });

    expect(policy.finalAction).toBe('fatigue_recovery');
    expect(policy.batchSize).toBe(6);
    expect(policy.mix.challenge).toBe(0);
    expect(policy.constraints.maxLevelIncrease).toBe(0);
  });

  it('accepts a high-confidence observer warning when it is safer', () => {
    const policy = approveFlowPolicy({
      report: reportFor(Array.from({ length: 10 }, () => true)),
      observation: HARD_OBSERVATION,
    });

    expect(policy.finalState).toBe('hard');
    expect(policy.finalAction).toBe('decrease_pressure');
    expect(policy.nextDifficulty).toBe(3);
    expect(policy.rationale).toContain('Observer:');
  });

  it('does not let the observer override a local hard state with easy', () => {
    const policy = approveFlowPolicy({
      report: reportFor(Array.from({ length: 10 }, () => false)),
      observation: {
        ...HARD_OBSERVATION,
        overallState: 'easy',
        stateReason: 'Looks fast.',
      },
    });

    expect(policy.finalState).toBe('hard');
    expect(policy.finalAction).toBe('decrease_pressure');
  });

  it('ignores low-confidence observer recommendations', () => {
    const policy = approveFlowPolicy({
      report: reportFor(Array.from({ length: 10 }, () => true)),
      observation: {
        ...HARD_OBSERVATION,
        confidence: 0.4,
      },
    });

    expect(policy.finalState).toBe('easy');
    expect(policy.rationale).not.toContain('Observer:');
  });
});
