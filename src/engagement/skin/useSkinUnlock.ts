import { useMemo } from 'react';

export interface Skin {
  id: string;
  name: string;
  unlocked: boolean;
  gradient: string;
}

export function useSkinUnlock(stars: number, maxCombo: number, totalCorrect: number) {
  return useMemo<Skin[]>(
    () => [
      {
        id: 'orchard',
        name: '果园',
        unlocked: true,
        gradient: 'from-emerald-200 via-lime-200 to-yellow-200',
      },
      {
        id: 'rainbow',
        name: '彩虹',
        unlocked: totalCorrect >= 10,
        gradient: 'from-sky-200 via-blue-300 to-indigo-400',
      },
      {
        id: 'candy',
        name: '糖果',
        unlocked: maxCombo >= 5,
        gradient: 'from-pink-200 via-purple-300 to-indigo-400',
      },
      {
        id: 'forest',
        name: '森林',
        unlocked: stars >= 25,
        gradient: 'from-emerald-200 via-teal-300 to-cyan-400',
      },
      {
        id: 'space',
        name: '宇宙',
        unlocked: stars >= 40,
        gradient: 'from-slate-900 via-purple-900 to-indigo-900',
      },
      {
        id: 'sunset',
        name: '晚霞',
        unlocked: totalCorrect >= 30,
        gradient: 'from-orange-200 via-pink-300 to-rose-400',
      },
    ],
    [maxCombo, stars, totalCorrect],
  );
}
