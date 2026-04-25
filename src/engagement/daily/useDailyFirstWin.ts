import { useCallback, useMemo, useState } from 'react';
import { scheduleLearningStateSync } from '../../sync/learningStateSync';
import { track } from '../../telemetry/track';

const STORAGE_KEY = 'childlearn.daily-first-win';

function localDayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function readStoredDay() {
  return window.localStorage.getItem(STORAGE_KEY);
}

export function useDailyFirstWin() {
  const [claimedDay, setClaimedDay] = useState(() => readStoredDay());
  const today = localDayKey();

  const claim = useCallback(() => {
    if (readStoredDay() === today) {
      return false;
    }

    window.localStorage.setItem(STORAGE_KEY, today);
    scheduleLearningStateSync('daily_first_win');
    setClaimedDay(today);
    track('daily.first_win', { day: today });
    return true;
  }, [today]);

  return useMemo(
    () => ({
      isClaimedToday: claimedDay === today,
      claim,
    }),
    [claim, claimedDay, today],
  );
}
