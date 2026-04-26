import { useMemo } from 'react';
import type { GradientStops } from '../../theme/tokens';
import { BG, SKIN_GRADIENTS } from '../../theme/tokens';

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
        gradient: SKIN_GRADIENTS.rainbow,
      },
      {
        id: 'candy',
        name: '糖果',
        unlocked: maxCombo >= 5,
        gradient: SKIN_GRADIENTS.candy,
      },
      {
        id: 'forest',
        name: '森林',
        unlocked: stars >= 25,
        gradient: SKIN_GRADIENTS.forest,
      },
      {
        id: 'space',
        name: '宇宙',
        unlocked: stars >= 40,
        gradient: SKIN_GRADIENTS.space,
      },
      {
        id: 'sunset',
        name: '晚霞',
        unlocked: totalCorrect >= 30,
        gradient: SKIN_GRADIENTS.sunset,
      },
    ],
    [maxCombo, stars, totalCorrect],
  );
}
