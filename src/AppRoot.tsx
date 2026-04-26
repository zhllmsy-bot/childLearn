import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { ComboBanner } from './components/ComboBanner/ComboBanner';
import {
  FeedbackBadge,
  type FeedbackLevel,
} from './components/FeedbackBadge/FeedbackBadge';
import { FlowStatusIndicator } from './components/FlowStatusIndicator/FlowStatusIndicator';
import { ParentReportPanel } from './components/ParentReportPanel/ParentReportPanel';
import { ParentGate } from './components/ParentGate/ParentGate';
import { StickerActionModal } from './components/StickerActionModal/StickerActionModal';
import {
  AppTopBar,
  AppTopBarProvider,
  useTopBarConfig,
  type AppTopBarConfig,
} from './components/AppTopBar/AppTopBar';
import { useLearnerProfile } from './ai/useLearnerProfile';
import { requestProgrammingHint } from './ai/api/childlearnAi';
import { generateQuestion } from './curriculum/questionFactory';
import {
  DIAGNOSTIC_QUESTION_COUNT,
  clearDiagnosticSnapshot,
  createDiagnosticRunSeed,
  getDiagnosticQuestion,
  readDiagnosticSnapshot,
  writeDiagnosticSnapshot,
} from './curriculum/diagnostic/diagnosticPlan';
import { addReviewItem, type ReviewItem } from './curriculum/reviewQueue';
import type { Question, QuestionOption } from './curriculum/types';
import {
  getLevelPackForDifficulty,
  type LevelPackId,
} from './curriculum/levelPacks';
import { useAbilityProfile } from './engagement/ability/useAbilityProfile';
import { useCombo } from './engagement/combo/useCombo';
import { useDailyFirstWin } from './engagement/daily/useDailyFirstWin';
import { useDDA } from './engagement/dda/useDDA';
import { scoreDiagnosticAttempts } from './engagement/dda/diagnosticScoring';
import {
  deriveQuestionDifficultyTags,
  type QuestionAttemptRecord,
} from './engagement/flow';
import {
  calculateBatchRankStars,
  getRankSnapshot,
} from './engagement/rank/rankEngine';
import { useRank } from './engagement/rank/useRank';
import {
  useNumberSpirits,
  type NumberSpirit,
} from './engagement/reward/useNumberSpirits';
import { useRewardGarden } from './engagement/reward/useRewardGarden';
import { recordLearningHistory } from './engagement/report/learningHistory';
import { createLearningHistorySummary } from './engagement/report/learningHistory';
import { useSkinUnlock } from './engagement/skin/useSkinUnlock';
import {
  STICKER_UNLOCK_COMBO_INTERVAL,
  findStickerById,
  shouldOfferStickerUnlock,
  useStickers,
} from './engagement/collection/useStickers';
import type {
  Sticker,
} from './engagement/collection/useStickers';
import { useProgrammingProgress } from './programming/useProgrammingProgress';
import {
  DEFAULT_ENGLISH_ITEM,
  ENGLISH_ITEMS,
  findEnglishItemById,
  type EnglishItem,
} from './english/englishItems';
import {
  DEFAULT_LITERACY_ITEM,
  LITERACY_ITEMS,
  findLiteracyItemById,
  type LiteracyItem,
} from './literacy/literacyItems';
import { ToastStack, type ToastMessage } from './immersion/Toast';
import { useNoInterrupt } from './immersion/useNoInterrupt';
import { celebrate } from './theme/confetti';
import { playPositiveFeedback, playTryAgainFeedback } from './theme/sound';
import { BG, gradientStyle } from './theme/tokens';
import { track } from './telemetry/track';
import { useLearningStateSync } from './sync/learningStateSync';
import {
  buildCorrectVoiceLine,
  buildEnglishVoiceLine,
  buildHintVoiceLine,
  buildLiteracyVoiceLine,
  buildProgrammingVoiceLine,
  buildQuestionVoiceLine,
  buildStartVoiceLine,
  buildStickerVoiceLine,
  estimateVoiceLineDurationMs,
} from './voice/voiceLines';
import { useVoicePlayer } from './voice/useVoicePlayer';
import { preloadSecondaryScenes } from './app/lazyScenes';
import {
  CORRECT_ADVANCE_MIN_MS,
  DEFAULT_LEVEL_QUESTION_GOAL,
  INITIAL_STATS,
  INTRO_TO_QUESTION_GAP_MS,
  MAX_WRONG_ATTEMPTS_PER_QUESTION,
  QUESTION_ENTRY_DELAY_MS,
  WRONG_FEEDBACK_MIN_MS,
  WRONG_FINAL_ADVANCE_MIN_MS,
  createClientId,
  feedbackForCombo,
  getOptionState,
  hydrateLevelResult,
  mergeNumberSpirits,
  readStoredAppSnapshot,
  readStoredStats,
  writeStoredAppSnapshot,
  writeStoredStats,
  type AppScene,
  type LevelResultSnapshot,
  type PracticeRunMode,
  type SessionStats,
  type StoredAppSnapshot,
} from './app/appState';
import { useAppScheduler } from './app/useAppScheduler';
import { useAppScrollMemory } from './app/useAppScrollMemory';
import { useAppVoicePrompt } from './app/useAppVoicePrompt';
import { useProgrammingRewards } from './app/useProgrammingRewards';
import { useSceneNavigation } from './app/useSceneNavigation';
import { useFlowObserver } from './features/observer/useFlowObserver';
import { useParentAccess } from './features/parent-gate/useParentAccess';
import { AppSceneContent } from './features/practice-session/AppSceneContent';
import { useQuestionTelemetry } from './features/practice-session/useQuestionTelemetry';

export default function AppRoot() {
  return (
    <AppTopBarProvider>
      <AppRootContent />
    </AppTopBarProvider>
  );
}

function AppRootContent() {
  useLearningStateSync();

  const initialAppSnapshotRef = useRef<StoredAppSnapshot | null>(
    readStoredAppSnapshot(),
  );
  const initialAppSnapshot = initialAppSnapshotRef.current;
  const shouldRestoreAnsweredQuestion =
    initialAppSnapshot?.scene === 'practice' && initialAppSnapshot.answered;
  const restoredAnsweredQuestionRef = useRef(shouldRestoreAnsweredQuestion);
  const mainRef = useRef<HTMLElement | null>(null);
  const [scene, setScene] = useState<AppScene>(
    () => initialAppSnapshot?.scene ?? 'home',
  );
  const [questionIndex, setQuestionIndex] = useState(
    () => initialAppSnapshot?.questionIndex ?? 0,
  );
  const [question, setQuestion] = useState(() =>
    initialAppSnapshot?.question ?? generateQuestion({ difficulty: 1, serial: 0 }),
  );
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(
    () => (shouldRestoreAnsweredQuestion ? initialAppSnapshot?.selectedOptionId ?? null : null),
  );
  const [feedback, setFeedback] = useState<FeedbackLevel | null>(
    () => (shouldRestoreAnsweredQuestion ? initialAppSnapshot?.feedback ?? null : null),
  );
  const [answered, setAnswered] = useState(shouldRestoreAnsweredQuestion);
  const [hintStage, setHintStage] = useState(() => initialAppSnapshot?.hintStage ?? 0);
  const [stats, setStats] = useState<SessionStats>(readStoredStats);
  const [levelQuestionGoal, setLevelQuestionGoal] = useState(
    () => initialAppSnapshot?.levelQuestionGoal ?? DEFAULT_LEVEL_QUESTION_GOAL,
  );
  const [levelProgress, setLevelProgress] = useState(
    () => initialAppSnapshot?.levelProgress ?? 0,
  );
  const [levelMistakes, setLevelMistakes] = useState(
    () => initialAppSnapshot?.levelMistakes ?? 0,
  );
  const [levelBestCombo, setLevelBestCombo] = useState(
    () => initialAppSnapshot?.levelBestCombo ?? 0,
  );
  const [levelStarsEarned, setLevelStarsEarned] = useState(
    () => initialAppSnapshot?.levelStarsEarned ?? 0,
  );
  const [levelLatestSticker, setLevelLatestSticker] = useState<Sticker | null>(
    () => findStickerById(initialAppSnapshot?.levelLatestStickerId) ?? null,
  );
  const [levelNewSpirits, setLevelNewSpirits] = useState<NumberSpirit[]>(
    () => initialAppSnapshot?.levelNewSpirits ?? [],
  );
  const [activeLevelPackId, setActiveLevelPackId] = useState<LevelPackId | null>(
    () => initialAppSnapshot?.activeLevelPackId ?? null,
  );
  const [lastResult, setLastResult] = useState<LevelResultSnapshot | null>(
    () => hydrateLevelResult(initialAppSnapshot),
  );
  const [reviewQueue, setReviewQueue] = useState<ReviewItem[]>(
    () => initialAppSnapshot?.reviewQueue ?? [],
  );
  const reviewQueueRef = useRef<ReviewItem[]>(
    initialAppSnapshot?.reviewQueue ?? [],
  );
  const [questionBooting, setQuestionBooting] = useState(false);
  const [selectedSticker, setSelectedSticker] = useState<Sticker | null>(
    () => findStickerById(initialAppSnapshot?.selectedStickerId) ?? null,
  );
  const [selectedLiteracyId, setSelectedLiteracyId] = useState<string>(
    () =>
      findLiteracyItemById(initialAppSnapshot?.selectedLiteracyId)?.id ??
      DEFAULT_LITERACY_ITEM.id,
  );
  const [selectedEnglishId, setSelectedEnglishId] = useState<string>(
    () =>
      findEnglishItemById(initialAppSnapshot?.selectedEnglishId)?.id ??
      DEFAULT_ENGLISH_ITEM.id,
  );
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const levelAttemptRecordsRef = useRef<QuestionAttemptRecord[]>(
    initialAppSnapshot?.levelAttemptRecords ?? [],
  );
  const practiceRunIdRef = useRef<string | null>(
    initialAppSnapshot?.practiceRunId ?? null,
  );
  const selectedLiteracyItem = useMemo(
    () => findLiteracyItemById(selectedLiteracyId) ?? DEFAULT_LITERACY_ITEM,
    [selectedLiteracyId],
  );
  const selectedEnglishItem = useMemo(
    () => findEnglishItemById(selectedEnglishId) ?? DEFAULT_ENGLISH_ITEM,
    [selectedEnglishId],
  );
  const activeLevelPackIdRef = useRef<LevelPackId | null>(
    initialAppSnapshot?.activeLevelPackId ?? null,
  );

  const combo = useCombo();
  const dda = useDDA();
  const rank = useRank();
  const daily = useDailyFirstWin();
  const stickers = useStickers();
  const rewardGarden = useRewardGarden();
  const numberSpirits = useNumberSpirits();
  const ability = useAbilityProfile();
  const learner = useLearnerProfile();
  const learnerProfileRef = useRef(learner.profile);
  const {
    clearFlowState,
    createFlowShadowPolicy,
    currentRunModeRef,
    currentRunPolicyBatchIdRef,
    currentRunPolicyRef,
    diagnosticRunSeedRef,
    flowObservation,
    flowObserverStatus,
    flowShadowPolicy,
    flowShadowReport,
    lastEvaluatedAttemptCountRef,
    loadAdaptiveQuestion,
    maybeCreateInterimFlowPolicy,
    recentFlowStatesRef,
  } = useFlowObserver({
    activeLevelPackIdRef,
    initialAppSnapshot,
    learner,
    learnerProfileRef,
    practiceRunIdRef,
    questionHistoryRef: levelAttemptRecordsRef,
    reviewQueueRef,
    dda,
  });
  const programmingProgress = useProgrammingProgress();
  const skins = useSkinUnlock(rank.stars, combo.maxEver, stats.correct);
  const currentSkin = skins[0];
  const chestGoal = 4;
  const upcomingLevelPack = getLevelPackForDifficulty(
    flowShadowPolicy?.nextDifficulty ?? dda.difficulty,
  );
  const homeLevelGoal =
    scene === 'home' && !activeLevelPackId ? upcomingLevelPack.items.length : levelQuestionGoal;
  const historySummary = useMemo(() => createLearningHistorySummary(), [learner.profile.updatedAt]);
  const suggestedMinutes =
    historySummary.today.attempted >= 12
      ? '今天已经够了，明天 8 分钟轻复习'
      : '建议今天 8-12 分钟，优先做巩固包';
  const {
    closeParentGate,
    closeParentReport,
    handleOpenParentGate,
    handleParentGateSuccess,
    parentGateOpen,
    parentReportOpen,
    parentSummary,
    parentSummaryStatus,
    privacyHref,
    setParentReportOpen,
  } = useParentAccess({
    difficulty: dda.difficulty,
    flowObservation,
    flowShadowPolicy,
    focusSkills: historySummary.focusSkills,
    learnerProfile: learner.profile,
    reviewQueueSize: reviewQueue.length,
    stats,
    suggestedMinutes,
  });

  const {
    schedule,
    clearScheduled,
    waitFor,
    beginFlow,
    isCurrentFlow,
  } = useAppScheduler();
  const {
    activeQuestionTelemetryRef,
    beginQuestionTelemetry,
    createCompletedAttemptRecord,
    questionEventPayload,
    recordAnswerAttempt,
    trackActiveQuestionAbandoned,
  } = useQuestionTelemetry({
    activeLevelPackIdRef,
    answered,
    currentRunPolicyBatchIdRef,
    currentRunPolicyRef,
    initialAppSnapshot,
    practiceRunIdRef,
    question,
    questionIndex,
    scene,
    selectedOptionId,
  });

  useEffect(() => {
    reviewQueueRef.current = reviewQueue;
  }, [reviewQueue]);

  useEffect(() => {
    learnerProfileRef.current = learner.profile;
  }, [learner.profile]);

  useEffect(() => {
    if (scene !== 'home') {
      return undefined;
    }

    if ('requestIdleCallback' in window) {
      const idleId = window.requestIdleCallback(() => preloadSecondaryScenes(), {
        timeout: 1800,
      });
      return () => window.cancelIdleCallback(idleId);
    }

    const timeoutId = setTimeout(preloadSecondaryScenes, 600);
    return () => clearTimeout(timeoutId);
  }, [scene]);

  const addToast = useCallback(
    (text: string) => {
      const cleanText = text.trim();
      if (!cleanText) {
        return;
      }

      const id = Date.now();
      setToasts((messages) => [...messages, { id, text: cleanText }].slice(-3));
      schedule(
        () => setToasts((messages) => messages.filter((message) => message.id !== id)),
        2200,
      );
    },
    [schedule],
  );

  const { speak, stop } = useVoicePlayer(addToast);

  const playStickerVoice = useCallback(
    (sticker: Sticker) => {
      void speak(buildStickerVoiceLine(sticker), {
        notifyOnUnsupported: true,
      });
    },
    [speak],
  );

  const handleInspectSticker = useCallback(
    (sticker: Sticker) => {
      setSelectedSticker(sticker);
      playStickerVoice(sticker);
      track('sticker.inspect', {
        stickerId: sticker.id,
        stickerName: sticker.name,
        signatureMove: sticker.signatureMove,
      });
    },
    [playStickerVoice],
  );

  const handleReplayStickerVoice = useCallback(() => {
    if (selectedSticker) {
      playStickerVoice(selectedSticker);
    }
  }, [playStickerVoice, selectedSticker]);

  const handleCloseSticker = useCallback(() => {
    setSelectedSticker(null);
    stop();
  }, [stop]);

  const readQuestionAfterDelay = useCallback(
    (targetQuestion: Question, flowId: number, delay: number) => {
      void waitFor(delay).then(() => {
        if (isCurrentFlow(flowId)) {
          void speak(buildQuestionVoiceLine(targetQuestion));
        }
      });
    },
    [isCurrentFlow, speak, waitFor],
  );

  useNoInterrupt(addToast, scene === 'practice');
  useAppScrollMemory(scene, mainRef);

  const nextQuestion = useCallback(
    async (difficulty: number, flowId?: number) => {
      const nextIndex = questionIndex + 1;
      const next = await loadAdaptiveQuestion(difficulty, nextIndex);
      if (flowId && !isCurrentFlow(flowId)) {
        return;
      }

      setQuestionIndex(nextIndex);
      setQuestion(next);
      beginQuestionTelemetry(next, nextIndex);
      setSelectedOptionId(null);
      setFeedback(null);
      setAnswered(false);
      setHintStage(0);

      if (flowId) {
        readQuestionAfterDelay(next, flowId, QUESTION_ENTRY_DELAY_MS);
      }
    },
    [
      beginQuestionTelemetry,
      isCurrentFlow,
      loadAdaptiveQuestion,
      questionIndex,
      readQuestionAfterDelay,
    ],
  );

  useEffect(() => {
    writeStoredAppSnapshot({
      schemaVersion: 1,
      updatedAt: Date.now(),
      scene: scene === 'result' && !lastResult ? 'home' : scene,
      questionIndex,
      question,
      selectedOptionId: answered ? selectedOptionId : null,
      feedback: answered ? feedback : null,
      answered,
      hintStage,
      levelQuestionGoal,
      levelProgress,
      levelMistakes,
      levelBestCombo,
      levelStarsEarned,
      levelLatestStickerId: levelLatestSticker?.id ?? null,
      levelNewSpirits,
      activeLevelPackId,
      lastResult,
      flowShadowReport,
      flowShadowPolicy,
      flowObservation,
      flowObserverStatus,
      reviewQueue,
      selectedStickerId: selectedSticker?.id ?? null,
      selectedLiteracyId,
      selectedEnglishId,
      practiceRunId: practiceRunIdRef.current,
      activeQuestionTelemetry: activeQuestionTelemetryRef.current,
      levelAttemptRecords: levelAttemptRecordsRef.current,
      recentFlowStates: recentFlowStatesRef.current,
      currentRunPolicy: currentRunPolicyRef.current,
      currentRunPolicyBatchId: currentRunPolicyBatchIdRef.current,
      currentRunMode: currentRunModeRef.current,
      diagnosticRunSeed: diagnosticRunSeedRef.current,
    });
  }, [
    answered,
    feedback,
    flowObservation,
    flowObserverStatus,
    flowShadowPolicy,
    flowShadowReport,
    hintStage,
    lastResult,
    levelBestCombo,
    levelLatestSticker,
    levelMistakes,
    levelNewSpirits,
    activeLevelPackId,
    levelProgress,
    levelQuestionGoal,
    levelStarsEarned,
    question,
    questionIndex,
    reviewQueue,
    scene,
    selectedEnglishId,
    selectedOptionId,
    selectedLiteracyId,
    selectedSticker,
  ]);

  useEffect(() => {
    if (
      !restoredAnsweredQuestionRef.current ||
      scene !== 'practice' ||
      !answered
    ) {
      return;
    }

    const flowId = beginFlow();

    void waitFor(900).then(() => {
      if (!isCurrentFlow(flowId)) {
        return;
      }

      restoredAnsweredQuestionRef.current = false;
      setSelectedOptionId(null);
      setFeedback(null);
      setAnswered(false);

      if (levelProgress >= levelQuestionGoal) {
        setScene(lastResult ? 'result' : 'home');
        return;
      }

      nextQuestion(dda.difficulty, flowId);
    });
  }, [
    answered,
    beginFlow,
    dda.difficulty,
    isCurrentFlow,
    lastResult,
    levelProgress,
    levelQuestionGoal,
    nextQuestion,
    scene,
    waitFor,
  ]);

  const resetLevelRun = useCallback(() => {
    const flowId = beginFlow();
    const runId = createClientId('run');
    const startingPolicy = flowShadowPolicy;
    const startingPolicyBatchId = flowShadowReport?.batchId ?? null;
    const shouldRunDiagnostic = !readDiagnosticSnapshot();
    const runMode: PracticeRunMode = shouldRunDiagnostic ? 'diagnostic' : 'level';
    const diagnosticSeed = shouldRunDiagnostic ? createDiagnosticRunSeed() : null;
    const difficulty = startingPolicy?.nextDifficulty ?? dda.difficulty;
    const levelPack = getLevelPackForDifficulty(difficulty);
    const goal = shouldRunDiagnostic
      ? DIAGNOSTIC_QUESTION_COUNT
      : Math.min(
          startingPolicy?.batchSize ?? levelPack.items.length,
          levelPack.items.length,
        );
    const line = buildStartVoiceLine();

    clearScheduled();
    stop();
    combo.endRun();
    clearFlowState();
    practiceRunIdRef.current = runId;
    currentRunPolicyRef.current = startingPolicy;
    currentRunPolicyBatchIdRef.current = startingPolicyBatchId;
    currentRunModeRef.current = runMode;
    diagnosticRunSeedRef.current = diagnosticSeed;
    activeLevelPackIdRef.current = shouldRunDiagnostic ? null : levelPack.id;
    if (startingPolicy) {
      dda.applyDifficulty(difficulty);
    }
    setQuestionIndex(0);
    setSelectedOptionId(null);
    setFeedback(null);
    setAnswered(false);
    setHintStage(0);
    setLevelProgress(0);
    setLevelMistakes(0);
    setLevelBestCombo(0);
    setLevelStarsEarned(0);
    setLevelLatestSticker(null);
    setLevelNewSpirits([]);
    setActiveLevelPackId(shouldRunDiagnostic ? null : levelPack.id);
    setLevelQuestionGoal(goal);
    setLastResult(null);
    levelAttemptRecordsRef.current = [];
    setScene('practice');
    setQuestionBooting(true);

    void (async () => {
      const firstQuestion = shouldRunDiagnostic
        ? getDiagnosticQuestion(0, diagnosticSeed ?? 1)
        : await loadAdaptiveQuestion(difficulty, 0);

      if (!isCurrentFlow(flowId)) {
        return;
      }

      setQuestion(firstQuestion);
      beginQuestionTelemetry(firstQuestion, 0);
      setQuestionBooting(false);
      void speak(line);
      readQuestionAfterDelay(
        firstQuestion,
        flowId,
        estimateVoiceLineDurationMs(line) + INTRO_TO_QUESTION_GAP_MS,
      );
    })();

    track('practice.open', {
      runId,
      difficulty,
      goal,
      levelPackId: shouldRunDiagnostic ? null : levelPack.id,
      levelPackTitle: shouldRunDiagnostic ? '入学小测' : levelPack.title,
      levelPackGoal: shouldRunDiagnostic ? '找到合适起点' : levelPack.shortGoal,
      runMode,
      diagnosticSeed,
      flowState: startingPolicy?.finalState ?? null,
      flowAction: startingPolicy?.finalAction ?? null,
    });
    track('flow.policy_applied', {
      runId,
      policyBatchId: startingPolicyBatchId,
      state: startingPolicy?.finalState ?? null,
      action: startingPolicy?.finalAction ?? null,
      nextDifficulty: startingPolicy?.nextDifficulty ?? difficulty,
      batchSize: startingPolicy?.batchSize ?? goal,
      mixConfidence: startingPolicy?.mix.confidence ?? null,
      mixReview: startingPolicy?.mix.review ?? null,
      mixCurrent: startingPolicy?.mix.current ?? null,
      mixChallenge: startingPolicy?.mix.challenge ?? null,
      adjustmentDimension: startingPolicy?.adjustmentDimension ?? null,
      source: startingPolicy ? 'adaptive' : 'initial',
    });
  }, [
    beginFlow,
    beginQuestionTelemetry,
    clearFlowState,
    clearScheduled,
    combo,
    dda,
    flowShadowReport?.batchId,
    flowShadowPolicy,
    isCurrentFlow,
    loadAdaptiveQuestion,
    readQuestionAfterDelay,
    speak,
    stop,
  ]);

  const {
    handleHome,
    handleOpenEnglish,
    handleOpenLiteracy,
    handleOpenProgramming,
    handleOpenStickerAlbum,
  } = useSceneNavigation({
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
  });

  const handleSelectLiteracyItem = useCallback((item: LiteracyItem) => {
    setSelectedLiteracyId(item.id);
    track('literacy.select_item', {
      itemId: item.id,
      glyph: item.glyph,
    });
  }, []);

  const handleSelectEnglishItem = useCallback((item: EnglishItem) => {
    setSelectedEnglishId(item.id);
    track('english.select_item', {
      itemId: item.id,
      glyph: item.glyph,
    });
  }, []);

  const handleSpeakLiteracyItem = useCallback(
    (item: LiteracyItem) => {
      void speak(buildLiteracyVoiceLine(item), { notifyOnUnsupported: true });
      track('literacy.speak_item', {
        itemId: item.id,
        glyph: item.glyph,
      });
    },
    [speak],
  );

  const handleSpeakEnglishItem = useCallback(
    (item: EnglishItem) => {
      void speak(buildEnglishVoiceLine(item), { notifyOnUnsupported: true });
      track('english.speak_item', {
        itemId: item.id,
        glyph: item.glyph,
      });
    },
    [speak],
  );

  const handleSpeakProgramming = useCallback(
    (text: string) => {
      void speak(buildProgrammingVoiceLine(text), { notifyOnUnsupported: true });
    },
    [speak],
  );

  const handleRequestProgrammingHint = useCallback(
    async (payload: {
      allowedCommands: string[];
      blockedReason?: string;
      currentProgramKinds: string[];
      fallbackHint: string;
      levelId: string;
      levelPrompt: string;
      levelTitle: string;
      remainingGems: number;
      requiredKinds: string[];
      status: string;
    }) => requestProgrammingHint(payload),
    [],
  );

  const handleCompleteProgrammingLevel = useProgrammingRewards({
    addToast,
    combo,
    programmingProgress,
    playStickerVoice,
    rank,
    rewardGarden,
    stickers,
  });

  const handleStartPractice = useCallback(() => {
    resetLevelRun();
  }, [resetLevelRun]);

  const handleRestartDiagnostic = useCallback(() => {
    clearDiagnosticSnapshot();
    closeParentReport();
    closeParentGate();
    resetLevelRun();
    track('diagnostic.reset_requested', {});
  }, [closeParentGate, closeParentReport, resetLevelRun]);

  const handleSound = useAppVoicePrompt({
    activeQuestionTelemetryRef,
    difficulty: dda.difficulty,
    hintStage,
    lastResult,
    question,
    questionEventPayload,
    questionIndex,
    rankName: rank.rank.name,
    rankStars: rank.stars,
    scene,
    selectedEnglishItem,
    selectedLiteracyItem,
    speak,
    stats,
  });

  const completeDiagnosticRun = useCallback(
    ({
      records,
      mistakes,
      maxCombo,
      latestSticker,
      newSpirits,
    }: {
      records: QuestionAttemptRecord[];
      mistakes: number;
      maxCombo: number;
      latestSticker: Sticker | null;
      newSpirits: NumberSpirit[];
    }) => {
      const score = scoreDiagnosticAttempts(records);
      writeDiagnosticSnapshot({
        schemaVersion: 1,
        completedAt: Date.now(),
        recommendedDifficulty: score.recommendedDifficulty,
        correctCount: score.correctCount,
        firstTryCorrectCount: score.firstTryCorrectCount,
        runSeed: diagnosticRunSeedRef.current ?? undefined,
      });
      dda.applyDiagnosticResult(score.recommendedDifficulty);
      const gardenReward = rewardGarden.claimLevelCompletion({
        correct: score.correctCount,
        total: DIAGNOSTIC_QUESTION_COUNT,
        mistakes,
        maxCombo,
      });
      const result: LevelResultSnapshot = {
        correct: score.correctCount,
        total: DIAGNOSTIC_QUESTION_COUNT,
        mistakes,
        maxCombo,
        starsEarned: 0,
        rankName: rank.rank.name,
        difficulty: score.recommendedDifficulty,
        sticker: latestSticker,
        gardenReward,
        newSpirits,
      };

      currentRunModeRef.current = 'level';
      diagnosticRunSeedRef.current = null;
      combo.endRun();
      setLevelStarsEarned(0);
      setLastResult(result);
      setFeedback(null);
      setAnswered(false);
      setSelectedOptionId(null);
      setScene('result');
      track('diagnostic.complete', {
        runId: practiceRunIdRef.current,
        correct: score.correctCount,
        firstTryCorrect: score.firstTryCorrectCount,
        recommendedDifficulty: score.recommendedDifficulty,
        readiness: score.readinessLabel,
      });
    },
    [combo, dda, rank.rank.name, rewardGarden],
  );

  const completeLevelRun = useCallback(
    ({
      records,
      ddaDifficulty,
      correctCount,
      mistakes,
      maxCombo,
      latestSticker,
      newSpirits,
    }: {
      records: QuestionAttemptRecord[];
      ddaDifficulty: number;
      correctCount: number;
      mistakes: number;
      maxCombo: number;
      latestSticker: Sticker | null;
      newSpirits: NumberSpirit[];
    }) => {
      lastEvaluatedAttemptCountRef.current = records.length;
      const nextFlowPolicy = createFlowShadowPolicy(
        records,
        ddaDifficulty,
        'level_complete',
      );
      const gardenReward = rewardGarden.claimLevelCompletion({
        correct: correctCount,
        total: levelQuestionGoal,
        mistakes,
        maxCombo,
      });
      const rankStarsAwarded = calculateBatchRankStars({
        correct: correctCount,
        total: levelQuestionGoal,
        mistakes,
        maxCombo,
        flowState: nextFlowPolicy.finalState,
      });
      const nextRankStars = rank.addStars(rankStarsAwarded);
      const nextRankSnapshot = getRankSnapshot(nextRankStars);
      const result: LevelResultSnapshot = {
        correct: correctCount,
        total: levelQuestionGoal,
        mistakes,
        maxCombo,
        starsEarned: rankStarsAwarded,
        rankName: nextRankSnapshot.name,
        difficulty: nextFlowPolicy.nextDifficulty,
        sticker: latestSticker,
        gardenReward,
        newSpirits,
      };

      currentRunModeRef.current = 'level';
      diagnosticRunSeedRef.current = null;
      combo.endRun();
      setLevelStarsEarned(rankStarsAwarded);
      setLastResult(result);
      setFeedback(null);
      setAnswered(false);
      setSelectedOptionId(null);
      setScene('result');
      track('level.complete', {
        runId: practiceRunIdRef.current,
        levelPackId: activeLevelPackIdRef.current,
        correct: result.correct,
        mistakes: result.mistakes,
        maxCombo: result.maxCombo,
        difficulty: result.difficulty,
        rankStarsAwarded,
        rankName: result.rankName,
      });
      track('rank.stars_awarded', {
        runId: practiceRunIdRef.current,
        amount: rankStarsAwarded,
        rankName: result.rankName,
        flowState: nextFlowPolicy.finalState,
        mistakes,
        maxCombo,
      });
    },
    [combo, createFlowShadowPolicy, levelQuestionGoal, rank, rewardGarden],
  );

  const handleSelect = useCallback(
    (option: QuestionOption) => {
      if (answered || selectedOptionId) {
        const telemetry = activeQuestionTelemetryRef.current;
        if (scene === 'practice' && telemetry?.questionId === question.id) {
          telemetry.feedbackInterruptClickCount += 1;
          telemetry.lastInteractionAtMs = Date.now();
          track(
            'question.feedback_interrupt',
            questionEventPayload(question, questionIndex, {
              selectedValue: option.value,
              feedback: feedback ?? null,
              interruptCount: telemetry.feedbackInterruptClickCount,
              answered,
              selectionLocked: Boolean(selectedOptionId),
            }),
          );
        }
        return;
      }

      const isCorrect = option.value === question.answer;
      const isDiagnosticRun = currentRunModeRef.current === 'diagnostic';
      const nextHintStage = isCorrect ? hintStage : Math.min(hintStage + 1, 3);
      const attemptTelemetry = recordAnswerAttempt(question, option, nextHintStage);
      setSelectedOptionId(option.id);
      if (!isDiagnosticRun) {
        setStats((previous) => {
          const next = {
            attempted: previous.attempted + 1,
            correct: previous.correct + (isCorrect ? 1 : 0),
            hintsUsed: previous.hintsUsed + (isCorrect ? 0 : 1),
          };
          writeStoredStats(next);
          return next;
        });
      }

      track(
        'question.answer',
        questionEventPayload(question, questionIndex, {
          selectedValue: option.value,
          answerValue: question.answer,
          correct: isCorrect,
          attemptCount: attemptTelemetry?.attemptCount ?? null,
          firstResponseTimeMs: attemptTelemetry?.firstResponseTimeMs ?? null,
          elapsedMs: attemptTelemetry
            ? Date.now() - attemptTelemetry.startedAtMs
            : null,
          hintsUsed: nextHintStage,
          audioReplayCount: attemptTelemetry?.audioReplayCount ?? null,
        }),
      );

      if (isCorrect) {
        setReviewQueue((queue) => {
          if (!queue.some((item) => item.factId === question.factId)) {
            return queue;
          }
          const nextQueue = queue.filter((item) => item.factId !== question.factId);
          reviewQueueRef.current = nextQueue;
          return nextQueue;
        });
        const completedAttemptRecord = createCompletedAttemptRecord(question, option);
        track(
          'question.completed',
          questionEventPayload(question, questionIndex, {
            result: completedAttemptRecord.result,
            finalCorrect: completedAttemptRecord.finalCorrect,
            firstAttemptCorrect: completedAttemptRecord.firstAttemptCorrect,
            attemptCount: completedAttemptRecord.attemptCount,
            firstResponseTimeMs: completedAttemptRecord.firstResponseTimeMs,
            totalTimeMs: completedAttemptRecord.totalTimeMs,
            audioReplayCount: completedAttemptRecord.audioReplayCount,
            hintCount: completedAttemptRecord.hintCount,
            rapidClickCount: completedAttemptRecord.rapidClickCount,
            idleMs: completedAttemptRecord.idleMs,
            feedbackInterruptClickCount:
              completedAttemptRecord.feedbackInterruptClickCount,
            selectedValue: option.value,
            answerValue: question.answer,
          }),
        );
        const nextAttemptRecords = [
          ...levelAttemptRecordsRef.current,
          completedAttemptRecord,
        ];
        levelAttemptRecordsRef.current = nextAttemptRecords;
        if (!isDiagnosticRun) {
          ability.recordAttempt(completedAttemptRecord);
          learner.recordAttempt(completedAttemptRecord);
          recordLearningHistory(completedAttemptRecord);
        }
        const flowId = beginFlow();
        const nextDda = isDiagnosticRun
          ? dda
          : dda.onCorrect(deriveQuestionDifficultyTags(question));
        const nextCombo = isDiagnosticRun ? 0 : combo.hit();
        const level = feedbackForCombo(nextCombo);
        const firstWin = isDiagnosticRun ? false : daily.claim();
        const stickerUnlockEligible = shouldOfferStickerUnlock({
          combo: nextCombo,
          firstAttemptCorrect:
            !isDiagnosticRun && completedAttemptRecord.firstAttemptCorrect,
        });
        track('sticker.unlock_check', {
          eligible: stickerUnlockEligible,
          combo: nextCombo,
          firstAttemptCorrect: completedAttemptRecord.firstAttemptCorrect,
          interval: STICKER_UNLOCK_COMBO_INTERVAL,
        });
        const newSticker = stickerUnlockEligible
          ? stickers.collectBySeed(
              stats.correct + questionIndex + nextCombo + (firstWin ? 13 : 0),
            )
          : null;
        const newlyUnlockedSpirits = isDiagnosticRun
          ? []
          : numberSpirits.recordQuestion(question);
        const nextLevelNewSpirits = mergeNumberSpirits(
          levelNewSpirits,
          newlyUnlockedSpirits,
        );
        const nextLevelProgress = levelProgress + 1;
        const nextLevelBestCombo = Math.max(levelBestCombo, nextCombo);
        const nextLevelSticker = newSticker ?? levelLatestSticker;
        const interimFlowPolicy = maybeCreateInterimFlowPolicy(
          nextAttemptRecords,
          nextDda.difficulty,
          levelQuestionGoal,
        );
        const nextAdaptiveDifficulty =
          interimFlowPolicy?.nextDifficulty ??
          currentRunPolicyRef.current?.nextDifficulty ??
          nextDda.difficulty;
        const comboRemaining = Math.max((nextCombo >= 5 ? 10 : 5) - nextCombo, 0);
        const nextCorrectCount = stats.correct + (isDiagnosticRun ? 0 : 1);
        const nextChestRemaining = chestGoal - (nextCorrectCount % chestGoal || chestGoal);

        setLevelProgress(nextLevelProgress);
        setLevelBestCombo(nextLevelBestCombo);
        if (newSticker) {
          setLevelLatestSticker(newSticker);
        }
        if (newlyUnlockedSpirits.length > 0) {
          setLevelNewSpirits(nextLevelNewSpirits);
        }
        addToast(
          firstWin
            ? '今日首胜已点亮'
            : newSticker
              ? `${newSticker.shortName} ${newSticker.name} 已解锁`
              : newlyUnlockedSpirits.length > 0
                ? `${newlyUnlockedSpirits[0].emoji} 数字 ${newlyUnlockedSpirits[0].value} 果灵醒了`
              : comboRemaining === 0
                ? `连对 ${nextCombo} 题`
                : `再答对 ${nextChestRemaining} 题开宝箱`,
        );
        const correctFeedbackStartedAt = Date.now();
        setFeedback(level);
        setAnswered(true);
        track(
          'question.feedback_started',
          questionEventPayload(question, questionIndex, {
            outcome: 'correct',
            feedbackLevel: level,
            combo: nextCombo,
          }),
        );
        if (!isDiagnosticRun) {
          celebrate(level);
        }
        playPositiveFeedback(level);
        const line = buildCorrectVoiceLine({
          question,
          combo: nextCombo,
          level,
          firstWin,
          sticker: newSticker,
          nextChestRemaining,
        });
        void speak(line);
        const advanceDelay = Math.max(
          CORRECT_ADVANCE_MIN_MS,
          estimateVoiceLineDurationMs(line),
        );
        void waitFor(advanceDelay).then(() => {
          if (!isCurrentFlow(flowId)) {
            return;
          }

          track(
            'question.feedback_finished',
            questionEventPayload(question, questionIndex, {
              outcome: 'correct',
              feedbackLevel: level,
              combo: nextCombo,
              feedbackDurationMs: Date.now() - correctFeedbackStartedAt,
            }),
          );

          if (nextLevelProgress >= levelQuestionGoal) {
            if (currentRunModeRef.current === 'diagnostic') {
              completeDiagnosticRun({
                records: nextAttemptRecords,
                mistakes: levelMistakes,
                maxCombo: nextLevelBestCombo,
                latestSticker: nextLevelSticker,
                newSpirits: nextLevelNewSpirits,
              });
              return;
            }

            completeLevelRun({
              records: nextAttemptRecords,
              ddaDifficulty: nextDda.difficulty,
              correctCount: nextAttemptRecords.filter((record) => record.finalCorrect)
                .length,
              mistakes: levelMistakes,
              maxCombo: nextLevelBestCombo,
              latestSticker: nextLevelSticker,
              newSpirits: nextLevelNewSpirits,
            });
            return;
          }

          nextQuestion(nextAdaptiveDifficulty, flowId);
        });
        return;
      }

      const flowId = beginFlow();
      if (!isDiagnosticRun) {
        combo.miss();
      }
      const nextDda = isDiagnosticRun
        ? dda
        : dda.onWrong(deriveQuestionDifficultyTags(question));
      const nextLevelMistakes = levelMistakes + 1;
      const shouldFinalizeWrong =
        (attemptTelemetry?.attemptCount ?? 0) >= MAX_WRONG_ATTEMPTS_PER_QUESTION;
      setLevelMistakes(nextLevelMistakes);
      setHintStage(nextHintStage);
      const wrongFeedbackStartedAt = Date.now();
      setFeedback('wrong');
      setReviewQueue((queue) => {
        const nextQueue = addReviewItem(queue, question);
        reviewQueueRef.current = nextQueue;
        return nextQueue;
      });
      playTryAgainFeedback();
      track(
        'question.hint_requested',
        questionEventPayload(question, questionIndex, {
          source: 'wrong_answer_auto',
          hintStage: nextHintStage,
          selectedValue: option.value,
          answerValue: question.answer,
          attemptCount: attemptTelemetry?.attemptCount ?? null,
        }),
      );
      track(
        'question.feedback_started',
        questionEventPayload(question, questionIndex, {
          outcome: shouldFinalizeWrong ? 'wrong_final' : 'wrong_attempt',
          feedbackLevel: 'wrong',
          hintStage: nextHintStage,
        }),
      );

      if (shouldFinalizeWrong) {
        const completedAttemptRecord = createCompletedAttemptRecord(question, option);
        track(
          'question.completed',
          questionEventPayload(question, questionIndex, {
            result: completedAttemptRecord.result,
            finalCorrect: completedAttemptRecord.finalCorrect,
            firstAttemptCorrect: completedAttemptRecord.firstAttemptCorrect,
            attemptCount: completedAttemptRecord.attemptCount,
            firstResponseTimeMs: completedAttemptRecord.firstResponseTimeMs,
            totalTimeMs: completedAttemptRecord.totalTimeMs,
            audioReplayCount: completedAttemptRecord.audioReplayCount,
            hintCount: completedAttemptRecord.hintCount,
            rapidClickCount: completedAttemptRecord.rapidClickCount,
            idleMs: completedAttemptRecord.idleMs,
            feedbackInterruptClickCount:
              completedAttemptRecord.feedbackInterruptClickCount,
            selectedValue: option.value,
            answerValue: question.answer,
          }),
        );
        const nextAttemptRecords = [
          ...levelAttemptRecordsRef.current,
          completedAttemptRecord,
        ];
        levelAttemptRecordsRef.current = nextAttemptRecords;
        if (!isDiagnosticRun) {
          ability.recordAttempt(completedAttemptRecord);
          learner.recordAttempt(completedAttemptRecord);
          recordLearningHistory(completedAttemptRecord);
        }
        const nextLevelProgress = levelProgress + 1;
        const interimFlowPolicy = maybeCreateInterimFlowPolicy(
          nextAttemptRecords,
          nextDda.difficulty,
          levelQuestionGoal,
        );
        const nextAdaptiveDifficulty =
          interimFlowPolicy?.nextDifficulty ??
          currentRunPolicyRef.current?.nextDifficulty ??
          nextDda.difficulty;

        setLevelProgress(nextLevelProgress);
        setHintStage(3);
        setAnswered(true);
        addToast('这题先放进复习包，机器人带你看答案');
        track(
          'question.wrong_final',
          questionEventPayload(question, questionIndex, {
            attemptCount: completedAttemptRecord.attemptCount,
            hintCount: completedAttemptRecord.hintCount,
            answerValue: question.answer,
            finalSelectedAnswer: completedAttemptRecord.finalSelectedAnswer,
          }),
        );

        const line = buildHintVoiceLine(question, 3);
        void speak(line);
        const rescueDelay = Math.max(
          WRONG_FINAL_ADVANCE_MIN_MS,
          estimateVoiceLineDurationMs(line),
        );
        void waitFor(rescueDelay).then(() => {
          if (!isCurrentFlow(flowId)) {
            return;
          }

          track(
            'question.feedback_finished',
            questionEventPayload(question, questionIndex, {
              outcome: 'wrong_final',
              feedbackLevel: 'wrong',
              hintStage: 3,
              feedbackDurationMs: Date.now() - wrongFeedbackStartedAt,
            }),
          );

          if (nextLevelProgress >= levelQuestionGoal) {
            if (currentRunModeRef.current === 'diagnostic') {
              completeDiagnosticRun({
                records: nextAttemptRecords,
                mistakes: nextLevelMistakes,
                maxCombo: levelBestCombo,
                latestSticker: levelLatestSticker,
                newSpirits: levelNewSpirits,
              });
              return;
            }

            completeLevelRun({
              records: nextAttemptRecords,
              ddaDifficulty: nextDda.difficulty,
              correctCount: nextAttemptRecords.filter((record) => record.finalCorrect)
                .length,
              mistakes: nextLevelMistakes,
              maxCombo: levelBestCombo,
              latestSticker: levelLatestSticker,
              newSpirits: levelNewSpirits,
            });
            return;
          }

          nextQuestion(nextAdaptiveDifficulty, flowId);
        });
        return;
      }

      const line = buildHintVoiceLine(question, nextHintStage);
      void speak(line);
      const feedbackDelay = Math.max(
        WRONG_FEEDBACK_MIN_MS,
        estimateVoiceLineDurationMs(line),
      );
      void waitFor(feedbackDelay).then(() => {
        if (!isCurrentFlow(flowId)) {
          return;
        }

        track(
          'question.feedback_finished',
          questionEventPayload(question, questionIndex, {
            outcome: 'wrong_attempt',
            feedbackLevel: 'wrong',
            hintStage: nextHintStage,
            feedbackDurationMs: Date.now() - wrongFeedbackStartedAt,
          }),
        );
        setSelectedOptionId(null);
        setFeedback(null);
      });
    },
    [
      answered,
      ability,
      beginFlow,
      combo,
      completeDiagnosticRun,
      completeLevelRun,
      createCompletedAttemptRecord,
      createFlowShadowPolicy,
      daily,
      dda,
      feedback,
      hintStage,
      isCurrentFlow,
      levelBestCombo,
      levelLatestSticker,
      levelMistakes,
      levelNewSpirits,
      levelProgress,
      levelQuestionGoal,
      learner.recordAttempt,
      maybeCreateInterimFlowPolicy,
      nextQuestion,
      numberSpirits,
      question,
      questionEventPayload,
      questionIndex,
      rank,
      recordAnswerAttempt,
      rewardGarden,
      scene,
      selectedOptionId,
      stats.correct,
      stickers,
      addToast,
      chestGoal,
      speak,
      waitFor,
    ],
  );

  const optionStates = useMemo(
    () =>
      question.options.map((option) => ({
        option,
        state: getOptionState({
          option,
          question,
          selectedOptionId,
          answered,
          hintStage,
        }),
      })),
    [answered, hintStage, question, selectedOptionId],
  );
  const homeSceneProps = useMemo(
    () => ({
      rankName: rank.rank.name,
      stars: rank.rank.starLabel,
      currentCombo: combo.current,
      maxCombo: combo.maxEver,
      correct: stats.correct,
      attempted: stats.attempted,
      difficulty: dda.difficulty,
      stickers: stickers.collected,
      stickerTotal: stickers.total,
      duplicateShards: stickers.duplicateShards,
      skins,
      levelProgress,
      levelGoal: homeLevelGoal,
      garden: rewardGarden.garden,
      spirits: numberSpirits.spirits,
      literacyPreview: LITERACY_ITEMS,
      englishPreview: ENGLISH_ITEMS,
      programmingCompleted: programmingProgress.completedCount,
      programmingTotal: programmingProgress.totalLevelCount,
      programmingNextTitle: programmingProgress.nextLevel.title,
      onStart: handleStartPractice,
      onOpenProgramming: handleOpenProgramming,
      onOpenLiteracy: handleOpenLiteracy,
      onOpenEnglish: handleOpenEnglish,
      onOpenStickerAlbum: handleOpenStickerAlbum,
      onInspectSticker: handleInspectSticker,
      privacyHref,
    }),
    [
      combo.current,
      combo.maxEver,
      dda.difficulty,
      handleInspectSticker,
      handleOpenEnglish,
      handleOpenLiteracy,
      handleOpenProgramming,
      handleOpenStickerAlbum,
      handleStartPractice,
      homeLevelGoal,
      levelProgress,
      numberSpirits.spirits,
      privacyHref,
      programmingProgress.completedCount,
      programmingProgress.nextLevel.title,
      programmingProgress.totalLevelCount,
      rank.rank.name,
      rank.rank.starLabel,
      rewardGarden.garden,
      skins,
      stats.attempted,
      stats.correct,
      stickers.collected,
      stickers.duplicateShards,
      stickers.total,
    ],
  );
  const literacySceneProps = useMemo(
    () => ({
      items: LITERACY_ITEMS,
      selectedItem: selectedLiteracyItem,
      onSelectItem: handleSelectLiteracyItem,
      onSpeakItem: handleSpeakLiteracyItem,
    }),
    [handleSelectLiteracyItem, handleSpeakLiteracyItem, selectedLiteracyItem],
  );
  const englishSceneProps = useMemo(
    () => ({
      items: ENGLISH_ITEMS,
      selectedItem: selectedEnglishItem,
      onSelectItem: handleSelectEnglishItem,
      onSpeakItem: handleSpeakEnglishItem,
    }),
    [handleSelectEnglishItem, handleSpeakEnglishItem, selectedEnglishItem],
  );
  const programmingSceneProps = useMemo(
    () => ({
      onBack: handleHome,
      onSpeak: handleSpeakProgramming,
      onRequestHint: handleRequestProgrammingHint,
      onCompleteLevel: handleCompleteProgrammingLevel,
      completedLevelIds: programmingProgress.completedLevelIds,
      unlockedLevelCount: programmingProgress.unlockedLevelCount,
      initialLevelId: programmingProgress.nextLevel.id,
    }),
    [
      handleCompleteProgrammingLevel,
      handleHome,
      handleRequestProgrammingHint,
      handleSpeakProgramming,
      programmingProgress.completedLevelIds,
      programmingProgress.nextLevel.id,
      programmingProgress.unlockedLevelCount,
    ],
  );
  const stickerSceneProps = useMemo(
    () => ({
      stickers: stickers.collected,
      stickerTotal: stickers.total,
      seriesProgress: stickers.seriesProgress,
      onInspectSticker: handleInspectSticker,
    }),
    [handleInspectSticker, stickers.collected, stickers.seriesProgress, stickers.total],
  );
  const practiceSceneProps = useMemo(
    () => ({
      question,
      answered,
      hintStage,
      levelProgress,
      levelQuestionGoal,
      optionStates,
      rankName: rank.rank.name,
      rankStars: rank.rank.starLabel,
      stickerCount: stickers.collected.length,
      stickerTotal: stickers.total,
      difficulty: dda.difficulty,
      onSelect: handleSelect,
    }),
    [
      answered,
      dda.difficulty,
      handleSelect,
      hintStage,
      levelProgress,
      levelQuestionGoal,
      optionStates,
      question,
      rank.rank.name,
      rank.rank.starLabel,
      stickers.collected.length,
      stickers.total,
    ],
  );

  const topBarConfig = useMemo<AppTopBarConfig>(() => {
    const title =
      scene === 'literacy'
        ? '识字乐园'
        : scene === 'english'
          ? '英语乐园'
          : scene === 'stickers'
            ? '贴纸图鉴'
            : scene === 'result'
              ? '本关完成'
              : scene === 'programming'
                ? '编程岛'
                : scene === 'practice'
                  ? '本关练习'
                  : `${currentSkin.name}摘果`;
    let flowStatusNote: string | null = null;
    if (scene === 'practice') {
      if (flowObserverStatus === 'pending') {
        flowStatusNote = '刚刚几题在整理中';
      } else if (flowObserverStatus === 'ready') {
        flowStatusNote =
          flowObservation?.nextItemSuggestion?.reason ??
          flowObservation?.stateReason ??
          null;
      } else if (
        flowObserverStatus === 'unconfigured' ||
        flowObserverStatus === 'failed'
      ) {
        flowStatusNote =
          question.source === 'llm'
            ? '协作助手稍后会继续加入'
            : '当前先用练习题库陪练';
      } else if (question.source === 'pcg') {
        flowStatusNote = '这题先用程序生成题陪练';
      } else if (question.source === 'pcg+llm') {
        flowStatusNote = '这题先由程序出骨架，再由协作助手润色故事';
      } else if (question.source === 'template') {
        flowStatusNote = '这题先用旧版保底题库陪练';
      } else if (question.source === 'golden') {
        flowStatusNote = '这题来自金标准题库';
      } else if (question.source === 'parent') {
        flowStatusNote = '这题来自家长私密题库';
      } else if (question.source === 'teacher') {
        flowStatusNote = '这题来自老师私密题库';
      }
    }
    const actions: AppTopBarConfig['actions'] = [
      {
        ariaLabel: '播放语音',
        icon: 'sound',
        id: 'sound',
        onClick: handleSound,
      },
    ];

    if (scene !== 'stickers') {
      actions.push({
        ariaLabel: '打开贴纸图鉴',
        icon: 'stickers',
        id: 'stickers',
        onClick: handleOpenStickerAlbum,
      });
    }

    if (scene !== 'programming') {
      actions.push({
        ariaLabel: '打开家长入口',
        icon: 'parent-report',
        id: 'parent-report',
        onClick: handleOpenParentGate,
      });
    }

    return {
      actions,
      leadingAction: {
        ariaLabel: '首页',
        icon: 'home',
        id: 'home',
        onClick: handleHome,
      },
      status:
        scene === 'practice' ? (
          <FlowStatusIndicator
            flowState={flowShadowPolicy?.finalState ?? flowShadowReport?.rulePreState ?? null}
            learnerFlowState={learner.profile.flowState}
            note={flowStatusNote}
            observerStatus={flowObserverStatus}
          />
        ) : null,
      title,
    };
  }, [
    currentSkin.name,
    flowObserverStatus,
    flowObservation?.nextItemSuggestion?.reason,
    flowObservation?.stateReason,
    flowShadowPolicy?.finalState,
    flowShadowReport?.rulePreState,
    handleHome,
    handleOpenParentGate,
    handleOpenStickerAlbum,
    handleSound,
    learner.profile.flowState,
    question.source,
    scene,
  ]);

  useTopBarConfig(topBarConfig);

  return (
    <main
      ref={mainRef}
      className={`app-shell relative overflow-x-hidden overflow-y-auto overscroll-y-contain ${
        scene === 'programming' ? 'app-shell-programming' : ''
      }`}
      style={gradientStyle(currentSkin.gradient || BG.mint)}
    >
      <AppTopBar />
      {scene === 'practice' ? <FeedbackBadge level={feedback} /> : null}
      {scene === 'practice' ? <ComboBanner combo={combo.current} /> : null}

      <div
        className={`app-content ${
          scene === 'programming' ? 'app-content-programming' : ''
        }`}
      >
        <AppSceneContent
          englishProps={englishSceneProps}
          homeProps={homeSceneProps}
          lastResult={lastResult}
          literacyProps={literacySceneProps}
          onResetLevelRun={resetLevelRun}
          practiceProps={practiceSceneProps}
          programmingProps={programmingSceneProps}
          questionBooting={questionBooting}
          scene={scene}
          stickerAlbumProps={stickerSceneProps}
        />
      </div>

      <AnimatePresence>
        {selectedSticker ? (
          <StickerActionModal
            key={selectedSticker.id}
            sticker={selectedSticker}
            onClose={handleCloseSticker}
            onReplayVoice={handleReplayStickerVoice}
          />
        ) : null}
      </AnimatePresence>

      <ParentGate
        open={parentGateOpen}
        onClose={closeParentGate}
        onSuccess={handleParentGateSuccess}
        privacyHref={privacyHref}
      />

      <ParentReportPanel
        open={parentReportOpen}
        onClose={closeParentReport}
        onRestartDiagnostic={handleRestartDiagnostic}
        correct={stats.correct}
        attempted={stats.attempted}
        maxCombo={combo.maxEver}
        rankName={rank.rank.name}
        difficulty={dda.difficulty}
        reviewQueue={reviewQueue}
        skins={skins}
        stickers={stickers.collected}
        stickerTotal={stickers.total}
        abilityAssessment={ability.assessment}
        flowState={flowShadowReport?.rulePreState ?? null}
        flowAction={flowShadowPolicy?.finalAction ?? null}
        flowRationale={flowShadowPolicy?.rationale ?? null}
        flowObserverStatus={flowObserverStatus}
        flowObserverReason={flowObservation?.stateReason ?? null}
        flowObserverIssue={flowObservation?.primaryIssue ?? null}
        learnerProfile={learner.profile}
        parentSummary={parentSummary}
        parentSummaryStatus={parentSummaryStatus}
        privacyHref={privacyHref}
        questionSource={question.source}
      />
      <ToastStack messages={toasts} />
    </main>
  );
}
