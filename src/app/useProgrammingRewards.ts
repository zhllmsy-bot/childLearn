import { useCallback } from 'react';
import type { ProgrammingCompletionResult } from '../components/ProgrammingIslandPage/ProgrammingIslandPage';
import type { ProgrammingLevel } from '../programming/programmingLevels';
import { useCombo } from '../engagement/combo/useCombo';
import { useRank } from '../engagement/rank/useRank';
import { useRewardGarden } from '../engagement/reward/useRewardGarden';
import { useStickers, type Sticker } from '../engagement/collection/useStickers';
import { useProgrammingProgress } from '../programming/useProgrammingProgress';
import { track } from '../telemetry/track';

interface UseProgrammingRewardsParams {
  addToast: (text: string) => void;
  combo: ReturnType<typeof useCombo>;
  programmingProgress: ReturnType<typeof useProgrammingProgress>;
  playStickerVoice: (sticker: Sticker) => void;
  rank: ReturnType<typeof useRank>;
  rewardGarden: ReturnType<typeof useRewardGarden>;
  stickers: ReturnType<typeof useStickers>;
}

export function useProgrammingRewards({
  addToast,
  combo,
  programmingProgress,
  playStickerVoice,
  rank,
  rewardGarden,
  stickers,
}: UseProgrammingRewardsParams) {
  return useCallback(
    (level: ProgrammingLevel, completion: ProgrammingCompletionResult) => {
      const isNewCompletion = programmingProgress.completeLevel(level);
      addToast(isNewCompletion ? `${level.title} 通关` : `${level.title} 已通关`);
      if (isNewCompletion) {
        if (completion.stars >= 3) {
          const rankStars = rank.addStars(1);
          track('programming.rank_awarded', {
            levelId: level.id,
            rankStars,
            completionStars: completion.stars,
            usedSteps: completion.usedSteps,
            optimalSteps: completion.optimalSteps,
          });
        }
        const sticker = stickers.grantByTrigger({
          kind: 'programming_level_complete',
          levelId: level.id,
          stars: completion.stars,
        });
        if (sticker) {
          addToast(`奖励贴纸：${sticker.name}`);
          playStickerVoice(sticker);
        }
        rewardGarden.waterByStars(completion.stars);
        combo.hit();
      }
      track('programming.level_complete', {
        levelId: level.id,
        concept: level.concept,
        completionStars: completion.stars,
        usedSteps: completion.usedSteps,
        optimalSteps: completion.optimalSteps,
        isNewCompletion,
      });
    },
    [addToast, combo, programmingProgress, playStickerVoice, rank, rewardGarden, stickers],
  );
}
