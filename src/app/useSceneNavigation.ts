import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { FeedbackLevel } from '../components/FeedbackBadge/FeedbackBadge';
import { ENGLISH_ITEMS } from '../english/englishItems';
import { LITERACY_ITEMS } from '../literacy/literacyItems';
import { useCombo } from '../engagement/combo/useCombo';
import { useStickers } from '../engagement/collection/useStickers';
import { useProgrammingProgress } from '../programming/useProgrammingProgress';
import { track } from '../telemetry/track';
import type { AppScene } from './appState';
import { preloadLazyScene } from './lazyScenes';

interface UseSceneNavigationParams {
  beginFlow: () => number;
  combo: ReturnType<typeof useCombo>;
  programmingProgress: ReturnType<typeof useProgrammingProgress>;
  selectedEnglishId: string;
  selectedLiteracyId: string;
  setAnswered: Dispatch<SetStateAction<boolean>>;
  setFeedback: Dispatch<SetStateAction<FeedbackLevel | null>>;
  setParentReportOpen: Dispatch<SetStateAction<boolean>>;
  setScene: Dispatch<SetStateAction<AppScene>>;
  setSelectedOptionId: Dispatch<SetStateAction<string | null>>;
  stickers: ReturnType<typeof useStickers>;
  stop: () => void;
  trackActiveQuestionAbandoned: (reason: string) => void;
}

export function useSceneNavigation({
  beginFlow,
  combo,
  programmingProgress,
  selectedEnglishId,
  selectedLiteracyId,
  setAnswered,
  setFeedback,
  setParentReportOpen,
  setScene,
  setSelectedOptionId,
  stickers,
  stop,
  trackActiveQuestionAbandoned,
}: UseSceneNavigationParams) {
  const openScene = useCallback(
    (scene: AppScene) => {
      trackActiveQuestionAbandoned(scene);
      beginFlow();
      stop();
      combo.endRun();
      setFeedback(null);
      setAnswered(false);
      setSelectedOptionId(null);
      setParentReportOpen(false);
      setScene(scene);
    },
    [
      beginFlow,
      combo,
      setAnswered,
      setFeedback,
      setParentReportOpen,
      setScene,
      setSelectedOptionId,
      stop,
      trackActiveQuestionAbandoned,
    ],
  );

  const handleHome = useCallback(() => {
    openScene('home');
    track('home.open', {});
  }, [openScene]);

  const handleOpenStickerAlbum = useCallback(() => {
    preloadLazyScene('stickers');
    openScene('stickers');
    track('stickers.open', {
      collected: stickers.collected.length,
      total: stickers.total,
    });
  }, [openScene, stickers.collected.length, stickers.total]);

  const handleOpenLiteracy = useCallback(() => {
    preloadLazyScene('literacy');
    openScene('literacy');
    track('literacy.open', {
      itemCount: LITERACY_ITEMS.length,
      selectedItemId: selectedLiteracyId,
    });
  }, [openScene, selectedLiteracyId]);

  const handleOpenEnglish = useCallback(() => {
    preloadLazyScene('english');
    openScene('english');
    track('english.open', {
      itemCount: ENGLISH_ITEMS.length,
      selectedItemId: selectedEnglishId,
    });
  }, [openScene, selectedEnglishId]);

  const handleOpenProgramming = useCallback(() => {
    preloadLazyScene('programming');
    openScene('programming');
    track('programming.open', {
      completed: programmingProgress.completedCount,
      total: programmingProgress.totalLevelCount,
      nextLevelId: programmingProgress.nextLevel.id,
    });
  }, [
    openScene,
    programmingProgress.completedCount,
    programmingProgress.nextLevel.id,
    programmingProgress.totalLevelCount,
  ]);

  return {
    handleHome,
    handleOpenEnglish,
    handleOpenLiteracy,
    handleOpenProgramming,
    handleOpenStickerAlbum,
  };
}
