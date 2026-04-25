import { useCallback, useMemo, useState } from 'react';
import { scheduleLearningStateSync } from '../sync/learningStateSync';
import { track } from '../telemetry/track';
import { PROGRAMMING_LEVELS, type ProgrammingLevel } from './programmingLevels';

export const PROGRAMMING_PROGRESS_STORAGE_KEY =
  'childlearn.programming-progress-v1';

export interface ProgrammingProgressState {
  schemaVersion: 1;
  completedLevelIds: string[];
  lastLevelId: string | null;
  totalCompletions: number;
  updatedAt: number;
}

const EMPTY_PROGRESS: ProgrammingProgressState = {
  schemaVersion: 1,
  completedLevelIds: [],
  lastLevelId: null,
  totalCompletions: 0,
  updatedAt: 0,
};

function normalizeCompletedLevelIds(ids: unknown) {
  const knownIds = new Set(PROGRAMMING_LEVELS.map((level) => level.id));
  const completed = new Set<string>();

  if (Array.isArray(ids)) {
    ids.forEach((id) => {
      if (typeof id === 'string' && knownIds.has(id)) {
        completed.add(id);
      }
    });
  }

  return PROGRAMMING_LEVELS.map((level) => level.id).filter((id) =>
    completed.has(id),
  );
}

function normalizeProgress(value: unknown): ProgrammingProgressState {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return EMPTY_PROGRESS;
  }

  const record = value as Record<string, unknown>;
  const completedLevelIds = normalizeCompletedLevelIds(record.completedLevelIds);
  const knownIds = new Set(PROGRAMMING_LEVELS.map((level) => level.id));
  const lastLevelId =
    typeof record.lastLevelId === 'string' && knownIds.has(record.lastLevelId)
      ? record.lastLevelId
      : completedLevelIds[completedLevelIds.length - 1] ?? null;
  const totalCompletions = Number(record.totalCompletions ?? completedLevelIds.length);
  const updatedAt = Number(record.updatedAt ?? 0);

  return {
    schemaVersion: 1,
    completedLevelIds,
    lastLevelId,
    totalCompletions: Number.isFinite(totalCompletions)
      ? Math.max(0, Math.round(totalCompletions))
      : completedLevelIds.length,
    updatedAt: Number.isFinite(updatedAt) ? Math.max(0, updatedAt) : 0,
  };
}

export function readProgrammingProgress(): ProgrammingProgressState {
  if (typeof window === 'undefined') {
    return EMPTY_PROGRESS;
  }

  try {
    return normalizeProgress(
      JSON.parse(window.localStorage.getItem(PROGRAMMING_PROGRESS_STORAGE_KEY) ?? '{}'),
    );
  } catch {
    return EMPTY_PROGRESS;
  }
}

function writeProgrammingProgress(progress: ProgrammingProgressState) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(
    PROGRAMMING_PROGRESS_STORAGE_KEY,
    JSON.stringify(progress),
  );
  scheduleLearningStateSync('programming_progress');
}

export function deriveProgrammingUnlockedCount(completedLevelIds: string[]) {
  const completed = new Set(completedLevelIds);
  const firstIncompleteIndex = PROGRAMMING_LEVELS.findIndex(
    (level) => !completed.has(level.id),
  );

  if (firstIncompleteIndex === -1) {
    return PROGRAMMING_LEVELS.length;
  }

  return Math.min(firstIncompleteIndex + 1, PROGRAMMING_LEVELS.length);
}

export function useProgrammingProgress() {
  const [progress, setProgress] = useState<ProgrammingProgressState>(
    readProgrammingProgress,
  );

  const completeLevel = useCallback(
    (level: ProgrammingLevel) => {
      const alreadyCompleted = progress.completedLevelIds.includes(level.id);

      setProgress((previous) => {
        const completedLevelIds = normalizeCompletedLevelIds([
          ...previous.completedLevelIds,
          level.id,
        ]);
        const next: ProgrammingProgressState = {
          schemaVersion: 1,
          completedLevelIds,
          lastLevelId: level.id,
          totalCompletions: Math.max(
            previous.totalCompletions + (previous.completedLevelIds.includes(level.id) ? 0 : 1),
            completedLevelIds.length,
          ),
          updatedAt: Date.now(),
        };

        writeProgrammingProgress(next);
        return next;
      });

      track('programming.progress_complete', {
        levelId: level.id,
        concept: level.concept,
        alreadyCompleted,
      });

      return !alreadyCompleted;
    },
    [progress.completedLevelIds],
  );

  const unlockedLevelCount = useMemo(
    () => deriveProgrammingUnlockedCount(progress.completedLevelIds),
    [progress.completedLevelIds],
  );
  const nextLevel =
    PROGRAMMING_LEVELS.find((level) => !progress.completedLevelIds.includes(level.id)) ??
    PROGRAMMING_LEVELS[PROGRAMMING_LEVELS.length - 1];

  return useMemo(
    () => ({
      ...progress,
      completedCount: progress.completedLevelIds.length,
      totalLevelCount: PROGRAMMING_LEVELS.length,
      unlockedLevelCount,
      nextLevel,
      completeLevel,
    }),
    [completeLevel, nextLevel, progress, unlockedLevelCount],
  );
}
