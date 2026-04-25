import { useCallback, useMemo, useState } from 'react';
import { scheduleLearningStateSync } from '../../sync/learningStateSync';
import { track } from '../../telemetry/track';
import { addRankStars, getRankSnapshot } from './rankEngine';

const STORAGE_KEY = 'childlearn.rank-stars';

function readStoredStars() {
  if (typeof window === 'undefined') {
    return 0;
  }

  const stored = Number(window.localStorage.getItem(STORAGE_KEY) ?? 0);
  return Number.isFinite(stored) && stored > 0 ? stored : 0;
}

function writeStoredStars(stars: number) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, String(Math.max(stars, 0)));
  scheduleLearningStateSync('rank');
}

export function useRank() {
  const [stars, setStars] = useState(readStoredStars);

  const addStars = useCallback((amount: number) => {
    const predictedStars = addRankStars(stars, amount);
    setStars((previous) => {
      const previousRank = getRankSnapshot(previous);
      const nextStars = addRankStars(previous, amount);
      const nextRank = getRankSnapshot(nextStars);
      if (previousRank.name !== nextRank.name) {
        track('rank.up', {
          from: previousRank.name,
          to: nextRank.name,
          earned: nextStars - previous,
          totalStars: nextStars,
        });
      }
      writeStoredStars(nextStars);
      return nextStars;
    });
    return predictedStars;
  }, [stars]);

  const reset = useCallback(() => {
    writeStoredStars(0);
    setStars(0);
  }, []);

  const rank = getRankSnapshot(stars);
  const nextRank = getRankSnapshot(stars + 1);
  const progress = rank.progress;

  return useMemo(
    () => ({
      stars,
      rank,
      nextRank,
      progress,
      addStars,
      reset,
    }),
    [addStars, nextRank, progress, rank, reset, stars],
  );
}
