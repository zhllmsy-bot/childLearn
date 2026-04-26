import type { QuestionAttemptRecord } from './types';

function reactionTime(record: QuestionAttemptRecord) {
  return Math.max(record.reactionTimeMs, record.firstResponseTimeMs, 0);
}

function accuracy(records: QuestionAttemptRecord[]) {
  if (records.length === 0) {
    return 0;
  }

  return records.filter((record) => record.finalCorrect).length / records.length;
}

function averageReaction(records: QuestionAttemptRecord[]) {
  if (records.length === 0) {
    return 0;
  }

  return records.reduce((sum, record) => sum + reactionTime(record), 0) / records.length;
}

export function detectFatigue(
  history: QuestionAttemptRecord[],
  windowSize = 8,
): 0 | 1 | 2 {
  const recent = history.slice(-windowSize);
  if (recent.length < 4) {
    return 0;
  }

  const midpoint = Math.ceil(recent.length / 2);
  const firstHalf = recent.slice(0, midpoint);
  const secondHalf = recent.slice(midpoint);
  const accuracyDrop = accuracy(firstHalf) - accuracy(secondHalf);
  const firstHalfReaction = averageReaction(firstHalf);
  const secondHalfReaction = averageReaction(secondHalf);
  const reactionRatio =
    firstHalfReaction > 0 ? secondHalfReaction / firstHalfReaction : 1;
  const slowSecondHalfCount = secondHalf.filter(
    (record) => reactionTime(record) >= 9_000 || record.idleMs >= 12_000,
  ).length;

  if (
    (accuracyDrop >= 0.3 && reactionRatio >= 1.45) ||
    slowSecondHalfCount >= Math.ceil(secondHalf.length / 2)
  ) {
    return 2;
  }

  if (
    (accuracyDrop >= 0.12 && reactionRatio >= 1.15) ||
    (accuracyDrop >= 0.2 && secondHalfReaction > firstHalfReaction) ||
    (reactionRatio >= 1.25 && slowSecondHalfCount > 0)
  ) {
    return 1;
  }

  return 0;
}
