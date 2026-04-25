import { useMemo } from 'react';
import type { GradientStops } from '../../theme/tokens';
import { BG } from '../../theme/tokens';

export interface Skin {
  id: string;
  name: string;
  unlocked: boolean;
  gradient: GradientStops;
}

export function useSkinUnlock(stars: number, maxCombo: number, totalCorrect: number) {
  return useMemo<Skin[]>(
    () => [
      {
        id: 'orchard',
        name: '果园',
        unlocked: true,
        gradient: BG.mint,
      },
      {
        id: 'rainbow',
        name: '彩虹',
        unlocked: totalCorrect >= 10,
        gradient: ['#BAE6FD', '#93C5FD', '#818CF8'],
      },
      {
        id: 'candy',
        name: '糖果',
        unlocked: maxCombo >= 5,
        gradient: ['#FBCFE8', '#C4B5FD', '#818CF8'],
      },
      {
        id: 'forest',
        name: '森林',
        unlocked: stars >= 25,
        gradient: ['#A7F3D0', '#5EEAD4', '#22D3EE'],
      },
      {
        id: 'space',
        name: '宇宙',
        unlocked: stars >= 40,
        gradient: ['#0F172A', '#581C87', '#312E81'],
      },
      {
        id: 'sunset',
        name: '晚霞',
        unlocked: totalCorrect >= 30,
        gradient: ['#FED7AA', '#F9A8D4', '#FB7185'],
      },
    ],
    [maxCombo, stars, totalCorrect],
  );
}
