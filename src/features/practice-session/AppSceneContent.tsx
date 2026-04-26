import { Suspense, type ComponentProps } from 'react';
import { AnimatePresence } from 'framer-motion';
import { HomeDashboard } from '../../components/HomeDashboard/HomeDashboard';
import { LevelResult } from '../../components/LevelResult/LevelResult';
import { PracticeSession } from '../../components/PracticeSession/PracticeSession';
import { SkeletonScreen } from '../../immersion/SkeletonScreen';
import {
  EnglishModulePage,
  LiteracyModulePage,
  ProgrammingIslandPage,
  StickerAlbumPage,
} from '../../app/lazyScenes';
import type { AppScene, LevelResultSnapshot } from '../../app/appState';
import type { StickerSeriesProgress } from '../../engagement/collection/useStickers';

interface AppSceneContentProps {
  englishProps: ComponentProps<typeof EnglishModulePage>;
  homeProps: ComponentProps<typeof HomeDashboard>;
  lastResult: LevelResultSnapshot | null;
  literacyProps: ComponentProps<typeof LiteracyModulePage>;
  onResetLevelRun: () => void;
  practiceProps: ComponentProps<typeof PracticeSession>;
  programmingProps: ComponentProps<typeof ProgrammingIslandPage>;
  questionBooting: boolean;
  scene: AppScene;
  stickerAlbumProps: Omit<ComponentProps<typeof StickerAlbumPage>, 'seriesProgress'> & {
    seriesProgress: StickerSeriesProgress[];
  };
}

export function AppSceneContent({
  englishProps,
  homeProps,
  lastResult,
  literacyProps,
  onResetLevelRun,
  practiceProps,
  programmingProps,
  questionBooting,
  scene,
  stickerAlbumProps,
}: AppSceneContentProps) {
  return (
    <Suspense fallback={<SkeletonScreen />}>
      <AnimatePresence mode="wait">
        {scene === 'home' ? (
          <HomeDashboard key="home" {...homeProps} />
        ) : scene === 'literacy' ? (
          <LiteracyModulePage key="literacy" {...literacyProps} />
        ) : scene === 'english' ? (
          <EnglishModulePage key="english" {...englishProps} />
        ) : scene === 'programming' ? (
          <ProgrammingIslandPage key="programming" {...programmingProps} />
        ) : scene === 'stickers' ? (
          <StickerAlbumPage key="stickers" {...stickerAlbumProps} />
        ) : scene === 'result' && lastResult ? (
          <LevelResult
            key="result"
            correct={lastResult.correct}
            total={lastResult.total}
            mistakes={lastResult.mistakes}
            maxCombo={lastResult.maxCombo}
            starsEarned={lastResult.starsEarned}
            rankName={lastResult.rankName}
            difficulty={lastResult.difficulty}
            sticker={lastResult.sticker}
            gardenReward={lastResult.gardenReward}
            newSpirits={lastResult.newSpirits}
            onRetry={onResetLevelRun}
            onContinue={onResetLevelRun}
            onInspectSticker={homeProps.onInspectSticker}
          />
        ) : questionBooting ? (
          <SkeletonScreen key="practice-booting" />
        ) : (
          <PracticeSession key="practice" {...practiceProps} />
        )}
      </AnimatePresence>
    </Suspense>
  );
}
