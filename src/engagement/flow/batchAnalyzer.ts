import { classifyRulePreState } from './ruleClassifier';
import type {
  BatchSummarySlice,
  ChildBehaviorBaseline,
  LearningBatchReport,
  LearningBatchReportInput,
  LearningBatchSummary,
  QuestionAttemptRecord,
  QuestionDifficultyTags,
  TagPerformanceSlice,
} from './types';

function roundRatio(value: number) {
  return Number(value.toFixed(4));
}

function ratio(numerator: number, denominator: number) {
  return denominator === 0 ? 0 : roundRatio(numerator / denominator);
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function idleCount(records: QuestionAttemptRecord[]) {
  return records.filter((record) => record.idleMs > 0).length;
}

function rapidClickCount(records: QuestionAttemptRecord[]) {
  return records.reduce((sum, record) => sum + record.rapidClickCount, 0);
}

function longestWrongFinalStreak(records: QuestionAttemptRecord[]) {
  let longest = 0;
  let current = 0;

  records.forEach((record) => {
    if (!record.finalCorrect) {
      current += 1;
      longest = Math.max(longest, current);
      return;
    }

    current = 0;
  });

  return longest;
}

function summarizeSlice(records: QuestionAttemptRecord[]): BatchSummarySlice {
  return {
    count: records.length,
    firstTryAccuracy: ratio(
      records.filter((record) => record.firstAttemptCorrect).length,
      records.length,
    ),
    finalAccuracy: ratio(
      records.filter((record) => record.finalCorrect).length,
      records.length,
    ),
    hintRate: ratio(
      records.filter((record) => record.hintCount > 0).length,
      records.length,
    ),
    audioReplayRate: ratio(
      records.filter((record) => record.audioReplayCount > 0).length,
      records.length,
    ),
    avgFirstResponseTimeMs: average(
      records.map((record) => record.firstResponseTimeMs),
    ),
    rapidClickCount: rapidClickCount(records),
    idleCount: idleCount(records),
  };
}

function summarize(records: QuestionAttemptRecord[]): LearningBatchSummary {
  const firstWrongRecords = records.filter((record) => !record.firstAttemptCorrect);
  const slice = summarizeSlice(records);

  return {
    ...slice,
    correctionRateAfterFirstWrong: ratio(
      firstWrongRecords.filter((record) => record.finalCorrect).length,
      firstWrongRecords.length,
    ),
    avgTotalTimeMs: average(records.map((record) => record.totalTimeMs)),
    wrongFinalCount: records.filter(
      (record) => !record.finalCorrect && !record.abandoned,
    ).length,
    abandonedCount: records.filter((record) => record.abandoned).length,
    longestWrongFinalStreak: longestWrongFinalStreak(records),
  };
}

function evidenceStrength(sampleCount: number): TagPerformanceSlice['evidenceStrength'] {
  if (sampleCount >= 6) {
    return 'high';
  }

  if (sampleCount >= 3) {
    return 'medium';
  }

  return 'low';
}

function tagKeysFor(tags: QuestionDifficultyTags) {
  return [
    `range:${tags.numberRange}`,
    `operation:${tags.operationType}`,
    `presentation:${tags.presentationType}`,
    `support:${tags.visualSupport}`,
    `option:${tags.optionDistance}`,
    `level:${tags.difficultyLevel}`,
    tags.crossTen ? 'cross_ten:true' : 'cross_ten:false',
    tags.carryOrBorrow ? 'carry_or_borrow:true' : 'carry_or_borrow:false',
  ];
}

function signalsFor(slice: BatchSummarySlice, avgTimeVsBaseline: number | null) {
  const signals: string[] = [];

  if (slice.firstTryAccuracy < 0.55) {
    signals.push('first_try_accuracy_low');
  }

  if (slice.finalAccuracy < 0.7) {
    signals.push('final_accuracy_low');
  }

  if (slice.hintRate >= 0.4) {
    signals.push('hint_rate_high');
  }

  if (slice.audioReplayRate >= 0.4) {
    signals.push('audio_replay_rate_high');
  }

  if (avgTimeVsBaseline !== null && avgTimeVsBaseline >= 1.5) {
    signals.push('response_time_high_vs_baseline');
  }

  return signals;
}

function summarizeByTag(
  records: QuestionAttemptRecord[],
  baseline?: ChildBehaviorBaseline,
): TagPerformanceSlice[] {
  const groups = new Map<string, QuestionAttemptRecord[]>();

  records.forEach((record) => {
    tagKeysFor(record.tags).forEach((tagKey) => {
      groups.set(tagKey, [...(groups.get(tagKey) ?? []), record]);
    });
  });

  return [...groups.entries()]
    .map(([tagKey, groupRecords]) => {
      const slice = summarizeSlice(groupRecords);
      const avgTimeVsBaseline =
        baseline?.avgFirstResponseTimeMs && baseline.avgFirstResponseTimeMs > 0
          ? roundRatio(slice.avgFirstResponseTimeMs / baseline.avgFirstResponseTimeMs)
          : null;

      return {
        tagKey,
        sampleCount: groupRecords.length,
        firstTryAccuracy: slice.firstTryAccuracy,
        finalAccuracy: slice.finalAccuracy,
        avgTimeVsBaseline,
        hintRate: slice.hintRate,
        audioReplayRate: slice.audioReplayRate,
        evidenceStrength: evidenceStrength(groupRecords.length),
        signals: signalsFor(slice, avgTimeVsBaseline),
      };
    })
    .sort((left, right) => {
      if (right.sampleCount !== left.sampleCount) {
        return right.sampleCount - left.sampleCount;
      }

      return left.tagKey.localeCompare(right.tagKey);
    });
}

export function createLearningBatchReport({
  batchId,
  childAgeMonths,
  currentDifficulty,
  attempts,
  baseline,
}: LearningBatchReportInput): LearningBatchReport {
  const orderedAttempts = [...attempts].sort(
    (left, right) => left.questionIndex - right.questionIndex,
  );
  const midpoint = Math.ceil(orderedAttempts.length / 2);
  const firstHalfSummary = summarizeSlice(orderedAttempts.slice(0, midpoint));
  const secondHalfSummary = summarizeSlice(orderedAttempts.slice(midpoint));
  const summary = summarize(orderedAttempts);

  const draftReport: LearningBatchReport = {
    batchId,
    childAgeMonths,
    questionCount: orderedAttempts.length,
    currentDifficulty,
    rulePreState: 'flow',
    summary,
    firstHalfSummary,
    secondHalfSummary,
    byTag: summarizeByTag(orderedAttempts, baseline),
    attempts: orderedAttempts,
  };

  return {
    ...draftReport,
    rulePreState: classifyRulePreState(draftReport),
  };
}
