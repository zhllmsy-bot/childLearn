import type { FlowState, LearningBatchReport } from './types';

function isMeaningfullyWorse(second: number, first: number, delta = 0.3) {
  return first - second >= delta;
}

function hasEngagementDrop(report: LearningBatchReport) {
  const first = report.firstHalfSummary;
  const second = report.secondHalfSummary;

  return (
    second.rapidClickCount > first.rapidClickCount ||
    second.idleCount > first.idleCount ||
    second.audioReplayRate - first.audioReplayRate >= 0.25
  );
}

function isLikelyFatigue(report: LearningBatchReport) {
  if (report.questionCount < 6) {
    return false;
  }

  return (
    isMeaningfullyWorse(
      report.secondHalfSummary.finalAccuracy,
      report.firstHalfSummary.finalAccuracy,
    ) &&
    hasEngagementDrop(report)
  );
}

function isLikelyHard(report: LearningBatchReport) {
  const { summary } = report;

  return (
    summary.finalAccuracy < 0.6 ||
    (summary.firstTryAccuracy < 0.55 && summary.finalAccuracy < 0.7) ||
    summary.longestWrongFinalStreak >= 2
  );
}

function isLikelyStretch(report: LearningBatchReport) {
  const { summary } = report;

  return (
    summary.firstTryAccuracy >= 0.45 &&
    summary.firstTryAccuracy <= 0.7 &&
    summary.finalAccuracy >= 0.8 &&
    summary.correctionRateAfterFirstWrong >= 0.5 &&
    summary.abandonedCount === 0
  );
}

function isLikelyEasy(report: LearningBatchReport) {
  const { summary } = report;

  return (
    summary.firstTryAccuracy >= 0.85 &&
    summary.finalAccuracy >= 0.95 &&
    summary.hintRate <= 0.1 &&
    summary.audioReplayRate <= 0.1
  );
}

export function classifyRulePreState(report: LearningBatchReport): FlowState {
  if (isLikelyFatigue(report)) {
    return 'fatigue';
  }

  if (isLikelyHard(report)) {
    return 'hard';
  }

  if (isLikelyStretch(report)) {
    return 'stretch';
  }

  if (isLikelyEasy(report)) {
    return 'easy';
  }

  return 'flow';
}
