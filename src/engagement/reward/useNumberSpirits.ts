import { useCallback, useMemo, useState } from 'react';
import type { Question } from '../../curriculum/types';
import { scheduleLearningStateSync } from '../../sync/learningStateSync';
import { track } from '../../telemetry/track';

const STORAGE_KEY = 'childlearn.number-spirits';

export interface NumberSpirit {
  value: number;
  emoji: string;
  name: string;
  xp: number;
  level: number;
  unlocked: boolean;
}

const SPIRIT_META = [
  { value: 1, emoji: '🌱', name: '一芽' },
  { value: 2, emoji: '🍒', name: '两颗樱桃' },
  { value: 3, emoji: '🍓', name: '三莓' },
  { value: 4, emoji: '🍀', name: '四叶草' },
  { value: 5, emoji: '⭐', name: '五星果' },
  { value: 6, emoji: '🍊', name: '六瓣橙' },
  { value: 7, emoji: '🌈', name: '七彩虹' },
  { value: 8, emoji: '🎈', name: '八气球' },
  { value: 9, emoji: '💎', name: '九宝石' },
  { value: 10, emoji: '🏆', name: '十冠军' },
] as const;

type SpiritXpMap = Record<string, number>;

function readXpMap(): SpiritXpMap {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as SpiritXpMap;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeXpMap(map: SpiritXpMap) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  scheduleLearningStateSync('number_spirits');
}

function spiritLevelForXp(xp: number) {
  if (xp >= 5) {
    return 3;
  }

  if (xp >= 2) {
    return 2;
  }

  return xp > 0 ? 1 : 0;
}

function spiritFromXp(value: number, xp: number): NumberSpirit {
  const meta = SPIRIT_META.find((spirit) => spirit.value === value) ?? SPIRIT_META[0];
  const level = spiritLevelForXp(xp);

  return {
    value,
    emoji: meta.emoji,
    name: meta.name,
    xp,
    level,
    unlocked: xp > 0,
  };
}

function addCandidate(candidates: Set<number>, value: number | undefined) {
  if (typeof value === 'number' && value >= 1 && value <= 10) {
    candidates.add(value);
  }
}

function numbersFromQuestion(question: Question) {
  const candidates = new Set<number>();

  addCandidate(candidates, question.answer);
  question.barModel.forEach((value) => addCandidate(candidates, value));

  if (question.comparePair) {
    addCandidate(candidates, question.comparePair.left);
    addCandidate(candidates, question.comparePair.right);
  }

  if (question.numberLine) {
    addCandidate(candidates, question.numberLine.start);
    addCandidate(candidates, question.numberLine.end);
    addCandidate(candidates, question.numberLine.end - question.numberLine.start);
  }

  return [...candidates];
}

export function useNumberSpirits() {
  const [xpMap, setXpMap] = useState(readXpMap);

  const recordQuestion = useCallback(
    (question: Question) => {
      const numbers = numbersFromQuestion(question);
      const next = { ...xpMap };
      const unlocked: NumberSpirit[] = [];

      numbers.forEach((number) => {
        const key = String(number);
        const previousXp = next[key] ?? 0;
        const nextXp = previousXp + 1;
        next[key] = nextXp;

        if (previousXp === 0) {
          const spirit = spiritFromXp(number, nextXp);
          unlocked.push(spirit);
          track('number_spirit.unlock', { value: number });
        }
      });

      writeXpMap(next);
      setXpMap(next);

      return unlocked;
    },
    [xpMap],
  );

  const spirits = useMemo(
    () => SPIRIT_META.map((meta) => spiritFromXp(meta.value, xpMap[String(meta.value)] ?? 0)),
    [xpMap],
  );

  return useMemo(
    () => ({
      spirits,
      recordQuestion,
    }),
    [recordQuestion, spirits],
  );
}
