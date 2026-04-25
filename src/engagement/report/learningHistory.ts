import { scheduleLearningStateSync } from '../../sync/learningStateSync';
import type { QuestionAttemptRecord } from '../flow';

export const LEARNING_HISTORY_STORAGE_KEY = 'childlearn.learning-history-v1';

export interface LearningDaySnapshot {
  day: string;
  attempted: number;
  correct: number;
  firstTryCorrect: number;
  hintsUsed: number;
  totalTimeMs: number;
  focusSkillCounts: Record<string, number>;
  updatedAt: number;
}

export interface LearningHistory {
  schemaVersion: 1;
  days: LearningDaySnapshot[];
}

export interface LearningPeriodSummary {
  attempted: number;
  correct: number;
  firstTryCorrect: number;
  hintsUsed: number;
  totalTimeMs: number;
  accuracy: number;
  avgTimeMs: number;
}

export interface LearningHistorySummary {
  today: LearningPeriodSummary;
  thisWeek: LearningPeriodSummary;
  previousWeek: LearningPeriodSummary;
  weeklyAttemptDelta: number;
  weeklyAccuracyDelta: number;
  focusSkills: { key: string; count: number }[];
}

const EMPTY_PERIOD: LearningPeriodSummary = {
  attempted: 0,
  correct: 0,
  firstTryCorrect: 0,
  hintsUsed: 0,
  totalTimeMs: 0,
  accuracy: 0,
  avgTimeMs: 0,
};
const FOCUS_SKILL_LOOKBACK_DAYS = 28;
const FOCUS_SKILL_HALF_LIFE_DAYS = 10;

function localDayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function startOfWeek(date = new Date()) {
  const copy = new Date(date);
  const day = copy.getDay() === 0 ? 7 : copy.getDay();
  copy.setHours(0, 0, 0, 0);
  copy.setDate(copy.getDate() - day + 1);
  return copy;
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function daysBetween(left: Date, right: Date) {
  const leftDay = new Date(left);
  const rightDay = new Date(right);
  leftDay.setHours(0, 0, 0, 0);
  rightDay.setHours(0, 0, 0, 0);
  return Math.round((leftDay.getTime() - rightDay.getTime()) / 86_400_000);
}

function dateFromDayKey(day: string) {
  const [year, month, date] = day.split('-').map((part) => Number(part));
  if (!year || !month || !date) {
    return null;
  }

  return new Date(year, month - 1, date);
}

function readHistory(): LearningHistory {
  if (typeof window === 'undefined') {
    return { schemaVersion: 1, days: [] };
  }

  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(LEARNING_HISTORY_STORAGE_KEY) ?? 'null',
    ) as Partial<LearningHistory> | null;

    if (!parsed || parsed.schemaVersion !== 1 || !Array.isArray(parsed.days)) {
      return { schemaVersion: 1, days: [] };
    }

    return {
      schemaVersion: 1,
      days: parsed.days
        .filter((day): day is LearningDaySnapshot => typeof day.day === 'string')
        .slice(-90),
    };
  } catch {
    return { schemaVersion: 1, days: [] };
  }
}

function writeHistory(history: LearningHistory) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(
    LEARNING_HISTORY_STORAGE_KEY,
    JSON.stringify({ ...history, days: history.days.slice(-90) }),
  );
  scheduleLearningStateSync('learning_history');
}

function focusKeysFor(record: QuestionAttemptRecord) {
  if (record.firstAttemptCorrect && record.hintCount === 0) {
    return [];
  }

  return [
    `operation:${record.tags.operationType}`,
    `presentation:${record.tags.presentationType}`,
    `range:${record.tags.numberRange}`,
  ];
}

export function recordLearningHistory(
  record: QuestionAttemptRecord,
  now = new Date(),
) {
  const history = readHistory();
  const day = localDayKey(now);
  const previous = history.days.find((item) => item.day === day);
  const focusSkillCounts = { ...(previous?.focusSkillCounts ?? {}) };

  focusKeysFor(record).forEach((key) => {
    focusSkillCounts[key] = (focusSkillCounts[key] ?? 0) + 1;
  });

  const nextDay: LearningDaySnapshot = {
    day,
    attempted: (previous?.attempted ?? 0) + 1,
    correct: (previous?.correct ?? 0) + (record.finalCorrect ? 1 : 0),
    firstTryCorrect:
      (previous?.firstTryCorrect ?? 0) + (record.firstAttemptCorrect ? 1 : 0),
    hintsUsed: (previous?.hintsUsed ?? 0) + (record.hintCount > 0 ? 1 : 0),
    totalTimeMs: (previous?.totalTimeMs ?? 0) + record.totalTimeMs,
    focusSkillCounts,
    updatedAt: now.getTime(),
  };
  const days = [
    ...history.days.filter((item) => item.day !== day),
    nextDay,
  ].sort((left, right) => left.day.localeCompare(right.day));

  writeHistory({ schemaVersion: 1, days });
}

function summarize(days: LearningDaySnapshot[]): LearningPeriodSummary {
  if (days.length === 0) {
    return EMPTY_PERIOD;
  }

  const totals = days.reduce(
    (summary, day) => ({
      attempted: summary.attempted + day.attempted,
      correct: summary.correct + day.correct,
      firstTryCorrect: summary.firstTryCorrect + day.firstTryCorrect,
      hintsUsed: summary.hintsUsed + day.hintsUsed,
      totalTimeMs: summary.totalTimeMs + day.totalTimeMs,
    }),
    {
      attempted: 0,
      correct: 0,
      firstTryCorrect: 0,
      hintsUsed: 0,
      totalTimeMs: 0,
    },
  );

  return {
    ...totals,
    accuracy:
      totals.attempted === 0 ? 0 : Math.round((totals.correct / totals.attempted) * 100),
    avgTimeMs:
      totals.attempted === 0 ? 0 : Math.round(totals.totalTimeMs / totals.attempted),
  };
}

export function createLearningHistorySummary(
  now = new Date(),
): LearningHistorySummary {
  const history = readHistory();
  const todayKey = localDayKey(now);
  const currentWeekStart = startOfWeek(now);
  const previousWeekStart = addDays(currentWeekStart, -7);
  const currentWeekStartKey = localDayKey(currentWeekStart);
  const previousWeekStartKey = localDayKey(previousWeekStart);
  const previousWeekEndKey = localDayKey(addDays(currentWeekStart, -1));
  const today = summarize(history.days.filter((day) => day.day === todayKey));
  const thisWeekDays = history.days.filter((day) => day.day >= currentWeekStartKey);
  const previousWeekDays = history.days.filter(
    (day) => day.day >= previousWeekStartKey && day.day <= previousWeekEndKey,
  );
  const focusSkillCounts = new Map<string, number>();
  const focusStartKey = localDayKey(addDays(now, -FOCUS_SKILL_LOOKBACK_DAYS + 1));

  history.days.filter((day) => day.day >= focusStartKey).forEach((day) => {
    const dayDate = dateFromDayKey(day.day);
    const ageDays = dayDate ? Math.max(daysBetween(now, dayDate), 0) : 0;
    const decayWeight = 0.5 ** (ageDays / FOCUS_SKILL_HALF_LIFE_DAYS);

    Object.entries(day.focusSkillCounts).forEach(([key, count]) => {
      focusSkillCounts.set(key, (focusSkillCounts.get(key) ?? 0) + count * decayWeight);
    });
  });

  const thisWeek = summarize(thisWeekDays);
  const previousWeek = summarize(previousWeekDays);

  return {
    today,
    thisWeek,
    previousWeek,
    weeklyAttemptDelta: thisWeek.attempted - previousWeek.attempted,
    weeklyAccuracyDelta: thisWeek.accuracy - previousWeek.accuracy,
    focusSkills: [...focusSkillCounts.entries()]
      .map(([key, count]) => ({ key, count }))
      .sort((left, right) => right.count - left.count)
      .map(({ key, count }) => ({ key, count: Math.max(1, Math.round(count)) }))
      .slice(0, 5),
  };
}
