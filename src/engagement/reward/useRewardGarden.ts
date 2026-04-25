import { useCallback, useMemo, useState } from 'react';
import { scheduleLearningStateSync } from '../../sync/learningStateSync';
import { track } from '../../telemetry/track';

const STORAGE_KEY = 'childlearn.reward-garden';

export type ChestTier = 'sprout' | 'rainbow' | 'sun';

export interface GardenBadge {
  id: string;
  emoji: string;
  label: string;
}

export interface TreeStage {
  emoji: string;
  name: string;
  progress: number;
  goal: number;
  nextLabel: string;
}

interface StoredGardenState {
  lastWateredDay: string | null;
  streak: number;
  totalWaterings: number;
  fruitCoins: number;
  badges: string[];
}

export interface GardenState extends StoredGardenState {
  todayWatered: boolean;
  treeStage: TreeStage;
  earnedBadges: GardenBadge[];
}

export interface GardenReward {
  didWaterToday: boolean;
  streak: number;
  totalWaterings: number;
  fruitCoins: number;
  chestTier: ChestTier;
  chestLabel: string;
  treeStage: TreeStage;
  badges: GardenBadge[];
}

interface ClaimLevelCompletionInput {
  correct: number;
  total: number;
  mistakes: number;
  maxCombo: number;
}

const BADGE_LIBRARY: Record<string, GardenBadge> = {
  'daily-water': { id: 'daily-water', emoji: '💧', label: '今日浇水' },
  perfect: { id: 'perfect', emoji: '🌟', label: '满格果篮' },
  'combo-5': { id: 'combo-5', emoji: '🔥', label: '连击火苗' },
  'combo-10': { id: 'combo-10', emoji: '🏆', label: '十连奖杯' },
  'first-level': { id: 'first-level', emoji: '🌱', label: '第一棵芽' },
};

const INITIAL_STATE: StoredGardenState = {
  lastWateredDay: null,
  streak: 0,
  totalWaterings: 0,
  fruitCoins: 0,
  badges: [],
};

function localDayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function previousDayKey(date = new Date()) {
  const previous = new Date(date);
  previous.setDate(date.getDate() - 1);
  return localDayKey(previous);
}

function readStoredGarden(): StoredGardenState {
  if (typeof window === 'undefined') {
    return INITIAL_STATE;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return INITIAL_STATE;
    }

    const parsed = JSON.parse(raw) as Partial<StoredGardenState>;
    return {
      lastWateredDay: parsed.lastWateredDay ?? null,
      streak: Number(parsed.streak ?? 0),
      totalWaterings: Number(parsed.totalWaterings ?? 0),
      fruitCoins: Number(parsed.fruitCoins ?? 0),
      badges: Array.isArray(parsed.badges) ? parsed.badges : [],
    };
  } catch {
    return INITIAL_STATE;
  }
}

function writeStoredGarden(state: StoredGardenState) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  scheduleLearningStateSync('reward_garden');
}

function treeStageFor(totalWaterings: number): TreeStage {
  if (totalWaterings >= 14) {
    return {
      emoji: '🌳',
      name: '彩虹果树',
      progress: 14,
      goal: 14,
      nextLabel: '继续结果',
    };
  }

  if (totalWaterings >= 7) {
    return {
      emoji: '🍎',
      name: '结果树',
      progress: totalWaterings - 7,
      goal: 7,
      nextLabel: '彩虹果树',
    };
  }

  if (totalWaterings >= 3) {
    return {
      emoji: '🌸',
      name: '开花树',
      progress: totalWaterings - 3,
      goal: 4,
      nextLabel: '结果树',
    };
  }

  if (totalWaterings >= 1) {
    return {
      emoji: '🌿',
      name: '小树苗',
      progress: totalWaterings - 1,
      goal: 2,
      nextLabel: '开花树',
    };
  }

  return {
    emoji: '🌱',
    name: '新芽',
    progress: 0,
    goal: 1,
    nextLabel: '小树苗',
  };
}

function badgesFromIds(ids: string[]) {
  return ids.map((id) => BADGE_LIBRARY[id]).filter(Boolean);
}

function chestFor({ mistakes, maxCombo }: { mistakes: number; maxCombo: number }) {
  if (mistakes === 0) {
    return {
      chestTier: 'sun' as const,
      chestLabel: '太阳宝箱',
    };
  }

  if (maxCombo >= 5) {
    return {
      chestTier: 'rainbow' as const,
      chestLabel: '彩虹宝箱',
    };
  }

  return {
    chestTier: 'sprout' as const,
    chestLabel: '小芽宝箱',
  };
}

export function useRewardGarden() {
  const [storedGarden, setStoredGarden] = useState(readStoredGarden);
  const today = localDayKey();

  const claimLevelCompletion = useCallback(
    ({ correct, total, mistakes, maxCombo }: ClaimLevelCompletionInput): GardenReward => {
      const previous = readStoredGarden();
      const didWaterToday = previous.lastWateredDay !== today;
      const nextStreak = didWaterToday
        ? previous.lastWateredDay === previousDayKey()
          ? previous.streak + 1
          : 1
        : previous.streak;
      const nextWaterings = previous.totalWaterings + (didWaterToday ? 1 : 0);
      const nextBadges: GardenBadge[] = [];

      if (didWaterToday) {
        nextBadges.push(BADGE_LIBRARY['daily-water']);
      }

      if (previous.totalWaterings === 0) {
        nextBadges.push(BADGE_LIBRARY['first-level']);
      }

      if (correct === total && mistakes === 0) {
        nextBadges.push(BADGE_LIBRARY.perfect);
      }

      if (maxCombo >= 10) {
        nextBadges.push(BADGE_LIBRARY['combo-10']);
      } else if (maxCombo >= 5) {
        nextBadges.push(BADGE_LIBRARY['combo-5']);
      }

      const fruitCoins =
        10 + Math.min(maxCombo, 10) + Math.max(0, 3 - mistakes) * 2 + (didWaterToday ? 5 : 0);
      const { chestTier, chestLabel } = chestFor({ mistakes, maxCombo });
      const badgeIds = Array.from(
        new Set([...previous.badges, ...nextBadges.map((badge) => badge.id)]),
      );
      const next: StoredGardenState = {
        lastWateredDay: didWaterToday ? today : previous.lastWateredDay,
        streak: nextStreak,
        totalWaterings: nextWaterings,
        fruitCoins: previous.fruitCoins + fruitCoins,
        badges: badgeIds,
      };

      writeStoredGarden(next);
      setStoredGarden(next);
      track('garden.reward.claim', {
        chestTier,
        didWaterToday,
        streak: nextStreak,
        fruitCoins,
      });

      return {
        didWaterToday,
        streak: nextStreak,
        totalWaterings: nextWaterings,
        fruitCoins,
        chestTier,
        chestLabel,
        treeStage: treeStageFor(nextWaterings),
        badges: nextBadges,
      };
    },
    [today],
  );

  const garden = useMemo<GardenState>(
    () => ({
      ...storedGarden,
      todayWatered: storedGarden.lastWateredDay === today,
      treeStage: treeStageFor(storedGarden.totalWaterings),
      earnedBadges: badgesFromIds(storedGarden.badges),
    }),
    [storedGarden, today],
  );

  return useMemo(
    () => ({
      garden,
      claimLevelCompletion,
    }),
    [claimLevelCompletion, garden],
  );
}
