import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AnimatePresence } from 'framer-motion';
import { ComboBanner } from './components/ComboBanner/ComboBanner';
import {
  FeedbackBadge,
  type FeedbackLevel,
} from './components/FeedbackBadge/FeedbackBadge';
import { FlowStatusIndicator } from './components/FlowStatusIndicator/FlowStatusIndicator';
import { HomeDashboard } from './components/HomeDashboard/HomeDashboard';
import { LevelResult } from './components/LevelResult/LevelResult';
import { ParentReportPanel } from './components/ParentReportPanel/ParentReportPanel';
import { ParentGate } from './components/ParentGate/ParentGate';
import { PracticeSession } from './components/PracticeSession/PracticeSession';
import { StickerActionModal } from './components/StickerActionModal/StickerActionModal';
import {
  AppTopBar,
  AppTopBarProvider,
  useTopBarConfig,
  type AppTopBarConfig,
} from './components/AppTopBar/AppTopBar';
import { useLearnerProfile } from './ai/useLearnerProfile';
import {
  LEARNER_RADAR_SKILLS,
  LEARNER_SKILL_DEFINITIONS,
  thetaToDifficulty,
} from './ai/learnerModel';
import {
  buildAdaptiveQuestionPayload,
  requestCoPilotQuestion,
  requestParentSummary,
  requestProgrammingHint,
} from './ai/api/childlearnAi';
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
  getLevelPackById,
  getLevelPackForDifficulty,
  selectLevelPackItem,
  selectLevelPackQuestionPlan,
  type LevelPackId,
} from './curriculum/levelPacks';
import { useAbilityProfile } from './engagement/ability/useAbilityProfile';
import { useCombo } from './engagement/combo/useCombo';
import { useDailyFirstWin } from './engagement/daily/useDailyFirstWin';
import { useDDA } from './engagement/dda/useDDA';
import { scoreDiagnosticAttempts } from './engagement/dda/diagnosticScoring';
import {
  approveFlowPolicy,
  createLearningBatchReport,
  deriveQuestionDifficultyTags,
  observeLearningBatch,
  selectFlowQuestionPlan,
  type ApprovedFlowPolicy,
  type FlowState,
  type LearningBatchReport,
  type LlmLearningObservation,
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
import { useRewardGarden, type GardenReward } from './engagement/reward/useRewardGarden';
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
  StickerSeriesProgress,
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
import { SkeletonScreen } from './immersion/SkeletonScreen';
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
import {
  EnglishModulePage,
  LiteracyModulePage,
  ProgrammingIslandPage,
  StickerAlbumPage,
  preloadSecondaryScenes,
} from './app/lazyScenes';
import {
  CORRECT_ADVANCE_MIN_MS,
  DEFAULT_LEVEL_QUESTION_GOAL,
  FLOW_OBSERVER_TIMEOUT_MS,
  FLOW_OBSERVER_URL,
  INITIAL_STATS,
  INTERIM_FLOW_EVALUATION_INTERVAL,
  INTRO_TO_QUESTION_GAP_MS,
  MAX_WRONG_ATTEMPTS_PER_QUESTION,
  QUESTION_ENTRY_DELAY_MS,
  QUESTION_IDLE_THRESHOLD_MS,
  RAPID_CLICK_THRESHOLD_MS,
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
  type ActiveQuestionTelemetry,
  type AppScene,
  type FlowEvaluationTrigger,
  type FlowObserverStatus,
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
  const [flowShadowReport, setFlowShadowReport] =
    useState<LearningBatchReport | null>(() => initialAppSnapshot?.flowShadowReport ?? null);
  const [flowShadowPolicy, setFlowShadowPolicy] =
    useState<ApprovedFlowPolicy | null>(() => initialAppSnapshot?.flowShadowPolicy ?? null);
  const [flowObservation, setFlowObservation] =
    useState<LlmLearningObservation | null>(() => initialAppSnapshot?.flowObservation ?? null);
  const [flowObserverStatus, setFlowObserverStatus] =
    useState<FlowObserverStatus>(
      () =>
        initialAppSnapshot?.flowObserverStatus ??
        (FLOW_OBSERVER_URL ? 'idle' : 'unconfigured'),
    );
  const [reviewQueue, setReviewQueue] = useState<ReviewItem[]>(
    () => initialAppSnapshot?.reviewQueue ?? [],
  );
  const reviewQueueRef = useRef<ReviewItem[]>(
    initialAppSnapshot?.reviewQueue ?? [],
  );
  const [parentGateOpen, setParentGateOpen] = useState(false);
  const [parentReportOpen, setParentReportOpen] = useState(false);
  const [parentSummary, setParentSummary] = useState<string | null>(null);
  const [parentSummaryStatus, setParentSummaryStatus] = useState<
    'idle' | 'pending' | 'ready' | 'failed'
  >('idle');
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
  const activeQuestionTelemetryRef = useRef<ActiveQuestionTelemetry | null>(
    initialAppSnapshot?.activeQuestionTelemetry ?? null,
  );
  const levelAttemptRecordsRef = useRef<QuestionAttemptRecord[]>(
    initialAppSnapshot?.levelAttemptRecords ?? [],
  );
  const recentFlowStatesRef = useRef<FlowState[]>(
    initialAppSnapshot?.recentFlowStates ?? [],
  );
  const currentRunPolicyRef = useRef<ApprovedFlowPolicy | null>(
    initialAppSnapshot?.currentRunPolicy ?? null,
  );
  const currentRunPolicyBatchIdRef = useRef<string | null>(
    initialAppSnapshot?.currentRunPolicyBatchId ?? null,
  );
  const currentRunModeRef = useRef<PracticeRunMode>(
    initialAppSnapshot?.currentRunMode ?? 'level',
  );
  const flowObservationRef = useRef<LlmLearningObservation | null>(
    initialAppSnapshot?.flowObservation ?? null,
  );
  const diagnosticRunSeedRef = useRef<number | null>(
    initialAppSnapshot?.diagnosticRunSeed ?? null,
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
  const flowObserverRequestIdRef = useRef(0);
  const lastEvaluatedAttemptCountRef = useRef(0);
  const privacyHref = import.meta.env.VITE_PARENT_PRIVACY_URL?.trim() || '/privacy.html';

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
  const programmingProgress = useProgrammingProgress();
  const skins = useSkinUnlock(rank.stars, combo.maxEver, stats.correct);
  const currentSkin = skins[0];
  const chestGoal = 4;
  const activeLevelPack = activeLevelPackId
    ? getLevelPackById(activeLevelPackId)
    : null;
  const activeLevelPackItem =
    activeLevelPackId && scene === 'practice'
      ? selectLevelPackItem(activeLevelPackId, questionIndex)
      : null;
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
  const parentSummaryPayload = useMemo(
    () => ({
      accuracy:
        stats.attempted === 0 ? 100 : Math.round((stats.correct / stats.attempted) * 100),
      attempted: stats.attempted,
      correct: stats.correct,
      difficulty: dda.difficulty,
      flowAction: flowShadowPolicy?.finalAction ?? null,
      flowObserverIssue: flowObservation?.primaryIssue ?? null,
      flowObserverReason: flowObservation?.stateReason ?? null,
      flowState: flowShadowPolicy?.finalState ?? null,
      focusSkills: historySummary.focusSkills.map((skill) => ({
        count: skill.count,
        key: skill.key,
      })),
      learnerRadar: LEARNER_RADAR_SKILLS.map((skillKey) => ({
        label: LEARNER_SKILL_DEFINITIONS[skillKey].label,
        theta: learner.profile.skills[skillKey]?.theta ?? 0,
      })),
      recommendedMinutes: suggestedMinutes,
      reviewQueueSize: reviewQueue.length,
    }),
    [
      dda.difficulty,
      flowObservation?.primaryIssue,
      flowObservation?.stateReason,
      flowShadowPolicy?.finalAction,
      flowShadowPolicy?.finalState,
      historySummary.focusSkills,
      learner.profile.skills,
      reviewQueue.length,
      stats.attempted,
      stats.correct,
      suggestedMinutes,
    ],
  );

  const {
    schedule,
    clearScheduled,
    waitFor,
    beginFlow,
    isCurrentFlow,
  } = useAppScheduler();

  useEffect(() => {
    reviewQueueRef.current = reviewQueue;
  }, [reviewQueue]);

  useEffect(() => {
    learnerProfileRef.current = learner.profile;
  }, [learner.profile]);

  useEffect(() => {
    flowObservationRef.current = flowObservation;
  }, [flowObservation]);

  useEffect(() => {
    if (!parentReportOpen) {
      return;
    }

    let cancelled = false;
    setParentSummaryStatus('pending');
    void requestParentSummary(parentSummaryPayload).then((summary) => {
      if (cancelled) {
        return;
      }

      setParentSummary(summary);
      setParentSummaryStatus(summary ? 'ready' : 'failed');
    });

    return () => {
      cancelled = true;
    };
  }, [parentReportOpen, parentSummaryPayload]);

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

  const questionEventPayload = useCallback(
    (
      targetQuestion: Question,
      targetQuestionIndex: number,
      extra: Record<string, string | number | boolean | null | undefined> = {},
    ) => {
      const tags = deriveQuestionDifficultyTags(targetQuestion);
      const packId = activeLevelPackIdRef.current;
      const pack = packId ? getLevelPackById(packId) : null;
      const packItem = packId ? selectLevelPackItem(packId, targetQuestionIndex) : null;

      return {
        runId: practiceRunIdRef.current,
        questionId: targetQuestion.id,
        questionIndex: targetQuestionIndex,
        questionSource: targetQuestion.source,
        level: targetQuestion.level,
        variant: targetQuestion.variant,
        fact: targetQuestion.factId,
        levelPackId: packId,
        levelPackTitle: pack?.title ?? null,
        skillId: packItem?.skillId ?? null,
        packSlotRole: packItem?.role ?? null,
        numberRange: tags.numberRange,
        operationType: tags.operationType,
        presentationType: tags.presentationType,
        visualSupport: tags.visualSupport,
        optionDistance: tags.optionDistance,
        crossTen: tags.crossTen,
        carryOrBorrow: tags.carryOrBorrow,
        difficultyLevel: tags.difficultyLevel,
        ...extra,
      };
    },
    [],
  );

  const beginQuestionTelemetry = useCallback(
    (targetQuestion: Question, targetQuestionIndex: number) => {
      const now = Date.now();
      activeQuestionTelemetryRef.current = {
        questionId: targetQuestion.id,
        questionIndex: targetQuestionIndex,
        startedAtMs: now,
        lastInteractionAtMs: now,
        firstSelectedAnswer: null,
        firstResponseTimeMs: null,
        attemptCount: 0,
        audioReplayCount: 0,
        hintCount: 0,
        idleMs: 0,
        idleNotified: false,
        rapidClickCount: 0,
        feedbackInterruptClickCount: 0,
        abandoned: false,
      };
    },
    [],
  );

  const recordAnswerAttempt = useCallback(
    (targetQuestion: Question, option: QuestionOption, nextHintStage: number) => {
      const now = Date.now();

      if (
        !activeQuestionTelemetryRef.current ||
        activeQuestionTelemetryRef.current.questionId !== targetQuestion.id
      ) {
        beginQuestionTelemetry(targetQuestion, questionIndex);
      }

      const telemetry = activeQuestionTelemetryRef.current;
      if (!telemetry) {
        return;
      }

      if (telemetry.attemptCount === 0) {
        telemetry.firstSelectedAnswer = option.value;
        telemetry.firstResponseTimeMs = now - telemetry.startedAtMs;
        if (telemetry.firstResponseTimeMs <= RAPID_CLICK_THRESHOLD_MS) {
          telemetry.rapidClickCount += 1;
          track(
            'question.rapid_click_detected',
            questionEventPayload(targetQuestion, questionIndex, {
              responseTimeMs: telemetry.firstResponseTimeMs,
              thresholdMs: RAPID_CLICK_THRESHOLD_MS,
              selectedValue: option.value,
            }),
          );
        }
      }

      telemetry.lastInteractionAtMs = now;
      telemetry.attemptCount += 1;
      telemetry.hintCount = Math.max(telemetry.hintCount, nextHintStage);
      return telemetry;
    },
    [beginQuestionTelemetry, questionEventPayload, questionIndex],
  );

  const createCompletedAttemptRecord = useCallback(
    (targetQuestion: Question, option: QuestionOption): QuestionAttemptRecord => {
      const now = Date.now();
      const telemetry =
        activeQuestionTelemetryRef.current ??
        ({
          questionId: targetQuestion.id,
          questionIndex,
          startedAtMs: now,
          lastInteractionAtMs: now,
          firstSelectedAnswer: option.value,
          firstResponseTimeMs: 0,
          attemptCount: 1,
          audioReplayCount: 0,
          hintCount: 0,
          idleMs: 0,
          idleNotified: false,
          rapidClickCount: 0,
          feedbackInterruptClickCount: 0,
          abandoned: false,
        } satisfies ActiveQuestionTelemetry);
      const finalCorrect = option.value === targetQuestion.answer;
      const firstAttemptCorrect = telemetry.attemptCount === 1 && finalCorrect;

      return {
        questionId: targetQuestion.id,
        questionIndex: telemetry.questionIndex,
        tags: deriveQuestionDifficultyTags(targetQuestion),
        correctAnswer: targetQuestion.answer,
        firstSelectedAnswer: telemetry.firstSelectedAnswer,
        finalSelectedAnswer: option.value,
        firstAttemptCorrect,
        finalCorrect,
        attemptCount: telemetry.attemptCount,
        firstResponseTimeMs: telemetry.firstResponseTimeMs ?? 0,
        totalTimeMs: now - telemetry.startedAtMs,
        audioReplayCount: telemetry.audioReplayCount,
        hintCount: telemetry.hintCount,
        idleMs: telemetry.idleMs,
        rapidClickCount: telemetry.rapidClickCount,
        feedbackInterruptClickCount: telemetry.feedbackInterruptClickCount,
        abandoned: telemetry.abandoned,
        result: finalCorrect
          ? firstAttemptCorrect
            ? 'correct'
            : 'wrong_first_then_correct'
          : 'wrong_final',
      };
    },
    [questionIndex],
  );

  const createFlowShadowPolicy = useCallback(
    (
      records: QuestionAttemptRecord[],
      currentDifficulty: number,
      trigger: FlowEvaluationTrigger,
    ) => {
      const batchId = `${trigger}-batch-${Date.now()}-${records.length}`;
      const runId = practiceRunIdRef.current;
      const requestId = flowObserverRequestIdRef.current + 1;
      const previousFlowStates = recentFlowStatesRef.current;
      const appliedPolicy = currentRunPolicyRef.current;
      const appliedPolicyBatchId = currentRunPolicyBatchIdRef.current;
      flowObserverRequestIdRef.current = requestId;
      const report = createLearningBatchReport({
        batchId,
        currentDifficulty,
        attempts: records,
      });
      const policy = approveFlowPolicy({
        report,
        recentStates: previousFlowStates,
      });

      recentFlowStatesRef.current = [...previousFlowStates, policy.finalState].slice(
        -5,
      );
      setFlowShadowReport(report);
      setFlowShadowPolicy(policy);
      setFlowObservation(null);
      flowObservationRef.current = null;
      if (trigger === 'interim') {
        currentRunPolicyRef.current = policy;
        currentRunPolicyBatchIdRef.current = batchId;
      }
      track('flow.batch_report_created', {
        runId,
        batchId,
        trigger,
        state: report.rulePreState,
        questionCount: report.questionCount,
        firstTryAccuracy: report.summary.firstTryAccuracy,
        finalAccuracy: report.summary.finalAccuracy,
        correctionRateAfterFirstWrong: report.summary.correctionRateAfterFirstWrong,
        avgFirstResponseTimeMs: report.summary.avgFirstResponseTimeMs,
        avgTotalTimeMs: report.summary.avgTotalTimeMs,
        hintRate: report.summary.hintRate,
        audioReplayRate: report.summary.audioReplayRate,
        wrongFinalCount: report.summary.wrongFinalCount,
        abandonedCount: report.summary.abandonedCount,
        longestWrongFinalStreak: report.summary.longestWrongFinalStreak,
        rapidClickCount: report.summary.rapidClickCount,
        idleCount: report.summary.idleCount,
      });
      track('flow.next_batch_outcome', {
        runId,
        batchId,
        trigger,
        appliedPolicyBatchId,
        appliedState: appliedPolicy?.finalState ?? null,
        appliedAction: appliedPolicy?.finalAction ?? null,
        appliedNextDifficulty: appliedPolicy?.nextDifficulty ?? null,
        appliedBatchSize: appliedPolicy?.batchSize ?? null,
        outcomeState: report.rulePreState,
        firstTryAccuracy: report.summary.firstTryAccuracy,
        finalAccuracy: report.summary.finalAccuracy,
        correctionRateAfterFirstWrong: report.summary.correctionRateAfterFirstWrong,
        hintRate: report.summary.hintRate,
        audioReplayRate: report.summary.audioReplayRate,
        wrongFinalCount: report.summary.wrongFinalCount,
        abandonedCount: report.summary.abandonedCount,
        longestWrongFinalStreak: report.summary.longestWrongFinalStreak,
      });
      track('flow.policy_approved', {
        runId,
        batchId,
        trigger,
        state: policy.finalState,
        action: policy.finalAction,
        nextDifficulty: policy.nextDifficulty,
        batchSize: policy.batchSize,
        mixConfidence: policy.mix.confidence,
        mixReview: policy.mix.review,
        mixCurrent: policy.mix.current,
        mixChallenge: policy.mix.challenge,
        adjustmentDimension: policy.adjustmentDimension,
        source: 'local',
      });
      dda.applyDifficulty(policy.nextDifficulty);

      if (!FLOW_OBSERVER_URL) {
        setFlowObserverStatus('unconfigured');
        return policy;
      }

      setFlowObserverStatus('pending');
      void observeLearningBatch(report, {
        endpoint: FLOW_OBSERVER_URL,
        timeoutMs: FLOW_OBSERVER_TIMEOUT_MS,
      }).then((observation) => {
        if (flowObserverRequestIdRef.current !== requestId) {
          return;
        }

        if (!observation) {
          setFlowObserverStatus('failed');
          track('flow.llm_observation_created', {
            runId,
            batchId,
            trigger,
            status: 'failed',
          });
          return;
        }

        const filteredPolicy = approveFlowPolicy({
          report,
          recentStates: previousFlowStates,
          observation,
        });
        if (observation.profileRefinement) {
          learner.applyRefinement(observation.profileRefinement);
        }

        recentFlowStatesRef.current = [
          ...previousFlowStates,
          filteredPolicy.finalState,
        ].slice(-5);
        setFlowObservation(observation);
        flowObservationRef.current = observation;
        setFlowObserverStatus('ready');
        setFlowShadowPolicy(filteredPolicy);
        if (trigger === 'interim') {
          currentRunPolicyRef.current = filteredPolicy;
          currentRunPolicyBatchIdRef.current = batchId;
        }
        dda.applyDifficulty(filteredPolicy.nextDifficulty);
        track('flow.llm_observation_created', {
          runId,
          batchId,
          trigger,
          status: 'ready',
          state: observation.overallState,
          confidence: observation.confidence,
          issue: observation.primaryIssue,
          direction: observation.recommendation.direction,
          adjustmentDimension: observation.recommendation.adjustmentDimension,
          profileRefinementApplied: Boolean(observation.profileRefinement),
        });
        track('flow.policy_approved', {
          runId,
          batchId,
          trigger,
          state: filteredPolicy.finalState,
          action: filteredPolicy.finalAction,
          nextDifficulty: filteredPolicy.nextDifficulty,
          batchSize: filteredPolicy.batchSize,
          mixConfidence: filteredPolicy.mix.confidence,
          mixReview: filteredPolicy.mix.review,
          mixCurrent: filteredPolicy.mix.current,
          mixChallenge: filteredPolicy.mix.challenge,
          adjustmentDimension: filteredPolicy.adjustmentDimension,
          source: 'llm_filtered',
        });
      });

      return policy;
    },
    [dda, learner.applyRefinement],
  );

  const maybeCreateInterimFlowPolicy = useCallback(
    (records: QuestionAttemptRecord[], currentDifficulty: number) => {
      if (
        records.length < INTERIM_FLOW_EVALUATION_INTERVAL ||
        records.length >= levelQuestionGoal ||
        records.length % INTERIM_FLOW_EVALUATION_INTERVAL !== 0 ||
        lastEvaluatedAttemptCountRef.current >= records.length
      ) {
        return null;
      }

      lastEvaluatedAttemptCountRef.current = records.length;
      return createFlowShadowPolicy(records, currentDifficulty, 'interim');
    },
    [createFlowShadowPolicy, levelQuestionGoal],
  );

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

  const loadAdaptiveQuestion = useCallback(async (difficulty: number, serial: number) => {
    if (currentRunModeRef.current === 'diagnostic' && serial < DIAGNOSTIC_QUESTION_COUNT) {
      return getDiagnosticQuestion(serial, diagnosticRunSeedRef.current ?? 1);
    }

    const queuedReview = reviewQueueRef.current[0];
    if (queuedReview && serial > 0 && serial % 4 === 0) {
      return {
        ...queuedReview.question,
        id: `${queuedReview.question.id}-review-${serial}`,
      };
    }

    const localPlan = selectFlowQuestionPlan({
      learnerProfile: learnerProfileRef.current,
      policy: currentRunPolicyRef.current,
      fallbackDifficulty: difficulty,
      serial,
    });
    const observerSuggestion =
      flowObservationRef.current?.confidence && flowObservationRef.current.confidence >= 0.65
        ? flowObservationRef.current.nextItemSuggestion
        : undefined;
    const suggestionDifficulty = observerSuggestion
      ? Math.min(
          Math.max(
            thetaToDifficulty(observerSuggestion.targetTheta),
            Math.max(localPlan.difficulty - 1, 1),
          ),
          Math.min(localPlan.difficulty + 1, 10),
        )
      : localPlan.difficulty;
    const plan = {
      ...localPlan,
      difficulty: suggestionDifficulty,
      targetSkillKey: observerSuggestion?.targetSkillKey ?? localPlan.targetSkillKey,
      targetTheta: observerSuggestion?.targetTheta ?? localPlan.targetTheta,
      variant: observerSuggestion?.variant ?? localPlan.variant,
    };
    const packId = activeLevelPackIdRef.current;
    const packPlan = packId
      ? selectLevelPackQuestionPlan({
          packId,
          difficulty: plan.difficulty,
          serial,
          flowLane: plan.lane,
          flowVariant: plan.variant,
        })
      : null;

    const payload = buildAdaptiveQuestionPayload({
      difficulty: packPlan?.difficulty ?? plan.difficulty,
      lane: plan.lane,
      learnerProfile: learnerProfileRef.current,
      serial,
      targetSkillKey: plan.targetSkillKey,
      targetTheta: plan.targetTheta,
      variant: packPlan?.variant ?? plan.variant,
    });
    const aiQuestion = await requestCoPilotQuestion(payload);
    if (aiQuestion) {
      return aiQuestion;
    }

    return generateQuestion({
      difficulty: packPlan?.difficulty ?? plan.difficulty,
      serial,
      variant: packPlan?.variant ?? plan.variant,
    });
  }, []);

  useNoInterrupt(addToast, scene === 'practice');
  useAppScrollMemory(scene, mainRef);

  useEffect(() => {
    track(
      'question.show',
      questionEventPayload(question, questionIndex, {
        appliedPolicyBatchId: currentRunPolicyBatchIdRef.current,
        appliedFlowState: currentRunPolicyRef.current?.finalState ?? null,
        appliedFlowAction: currentRunPolicyRef.current?.finalAction ?? null,
      }),
    );
  }, [question, questionEventPayload, questionIndex]);

  useEffect(() => {
    if (scene !== 'practice' || answered || selectedOptionId) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      const telemetry = activeQuestionTelemetryRef.current;
      if (
        !telemetry ||
        telemetry.questionId !== question.id ||
        telemetry.idleNotified
      ) {
        return;
      }

      const now = Date.now();
      const lastInteractionAtMs = telemetry.lastInteractionAtMs || telemetry.startedAtMs;
      const idleMs = now - lastInteractionAtMs;
      telemetry.idleMs = Math.max(telemetry.idleMs, idleMs);
      telemetry.idleNotified = true;
      track(
        'question.idle_detected',
        questionEventPayload(question, questionIndex, {
          idleMs: telemetry.idleMs,
          thresholdMs: QUESTION_IDLE_THRESHOLD_MS,
          attemptCount: telemetry.attemptCount,
        }),
      );
    }, QUESTION_IDLE_THRESHOLD_MS);

    return () => window.clearTimeout(timeoutId);
  }, [answered, question, questionEventPayload, questionIndex, scene, selectedOptionId]);

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
    flowObserverRequestIdRef.current += 1;
    practiceRunIdRef.current = runId;
    currentRunPolicyRef.current = startingPolicy;
    currentRunPolicyBatchIdRef.current = startingPolicyBatchId;
    currentRunModeRef.current = runMode;
    diagnosticRunSeedRef.current = diagnosticSeed;
    const difficulty = startingPolicy?.nextDifficulty ?? dda.difficulty;
    const levelPack = getLevelPackForDifficulty(difficulty);
    activeLevelPackIdRef.current = shouldRunDiagnostic ? null : levelPack.id;
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
    setFlowShadowReport(null);
    setFlowShadowPolicy(null);
    setFlowObservation(null);
    flowObservationRef.current = null;
    setFlowObserverStatus(FLOW_OBSERVER_URL ? 'idle' : 'unconfigured');
    levelAttemptRecordsRef.current = [];
    lastEvaluatedAttemptCountRef.current = 0;
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

  const trackActiveQuestionAbandoned = useCallback(
    (reason: string) => {
      if (scene !== 'practice' || answered) {
        return;
      }

      const telemetry = activeQuestionTelemetryRef.current;
      if (!telemetry || telemetry.questionId !== question.id || telemetry.abandoned) {
        return;
      }

      const now = Date.now();
      telemetry.abandoned = true;
      telemetry.idleMs = Math.max(
        telemetry.idleMs ?? 0,
        now - (telemetry.lastInteractionAtMs || telemetry.startedAtMs),
      );
      telemetry.lastInteractionAtMs = now;

      track(
        'question.abandoned',
        questionEventPayload(question, questionIndex, {
          reason,
          elapsedMs: now - telemetry.startedAtMs,
          attemptCount: telemetry.attemptCount,
          firstSelectedAnswer: telemetry.firstSelectedAnswer,
          idleMs: telemetry.idleMs,
        }),
      );
    },
    [answered, question, questionEventPayload, questionIndex, scene],
  );

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
    setParentReportOpen(false);
    setParentGateOpen(false);
    resetLevelRun();
    track('diagnostic.reset_requested', {});
  }, [resetLevelRun]);

  const handleOpenParentGate = useCallback(() => {
    setParentGateOpen(true);
  }, []);

  const handleParentGateSuccess = useCallback(() => {
    setParentGateOpen(false);
    setParentReportOpen(true);
  }, []);

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
      } else if (question.source === 'template') {
        flowStatusNote = '这题先用练习题库陪练';
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
      <Suspense fallback={<SkeletonScreen />}>
      <AnimatePresence mode="wait">
        {scene === 'home' ? (
          <HomeDashboard
            key="home"
            rankName={rank.rank.name}
            stars={rank.rank.starLabel}
            currentCombo={combo.current}
            maxCombo={combo.maxEver}
            correct={stats.correct}
            attempted={stats.attempted}
            difficulty={dda.difficulty}
            stickers={stickers.collected}
            stickerTotal={stickers.total}
            duplicateShards={stickers.duplicateShards}
            skins={skins}
            levelProgress={levelProgress}
            levelGoal={homeLevelGoal}
            garden={rewardGarden.garden}
            spirits={numberSpirits.spirits}
            literacyPreview={LITERACY_ITEMS}
            englishPreview={ENGLISH_ITEMS}
            programmingCompleted={programmingProgress.completedCount}
            programmingTotal={programmingProgress.totalLevelCount}
            programmingNextTitle={programmingProgress.nextLevel.title}
            onStart={handleStartPractice}
            onOpenProgramming={handleOpenProgramming}
            onOpenLiteracy={handleOpenLiteracy}
            onOpenEnglish={handleOpenEnglish}
            onOpenStickerAlbum={handleOpenStickerAlbum}
            onInspectSticker={handleInspectSticker}
            privacyHref={privacyHref}
          />
        ) : scene === 'literacy' ? (
          <LiteracyModulePage
            key="literacy"
            items={LITERACY_ITEMS}
            selectedItem={selectedLiteracyItem}
            onSelectItem={handleSelectLiteracyItem}
            onSpeakItem={handleSpeakLiteracyItem}
          />
        ) : scene === 'english' ? (
          <EnglishModulePage
            key="english"
            items={ENGLISH_ITEMS}
            selectedItem={selectedEnglishItem}
            onSelectItem={handleSelectEnglishItem}
            onSpeakItem={handleSpeakEnglishItem}
          />
        ) : scene === 'programming' ? (
          <ProgrammingIslandPage
            key="programming"
            onBack={handleHome}
            onSpeak={handleSpeakProgramming}
            onRequestHint={handleRequestProgrammingHint}
            onCompleteLevel={handleCompleteProgrammingLevel}
            completedLevelIds={programmingProgress.completedLevelIds}
            unlockedLevelCount={programmingProgress.unlockedLevelCount}
            initialLevelId={programmingProgress.nextLevel.id}
          />
        ) : scene === 'stickers' ? (
          <StickerAlbumPage
            key="stickers"
            stickers={stickers.collected}
            stickerTotal={stickers.total}
            seriesProgress={stickers.seriesProgress}
            onInspectSticker={handleInspectSticker}
          />
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
            onRetry={resetLevelRun}
            onContinue={resetLevelRun}
            onInspectSticker={handleInspectSticker}
          />
        ) : (
          questionBooting ? (
            <SkeletonScreen key="practice-booting" />
          ) : (
            <PracticeSession
              key="practice"
              question={question}
              answered={answered}
              hintStage={hintStage}
              levelProgress={levelProgress}
              levelQuestionGoal={levelQuestionGoal}
              optionStates={optionStates}
              rankName={rank.rank.name}
              rankStars={rank.rank.starLabel}
              stickerCount={stickers.collected.length}
              stickerTotal={stickers.total}
              difficulty={dda.difficulty}
              onSelect={handleSelect}
            />
          )
        )}
      </AnimatePresence>
      </Suspense>
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
        onClose={() => setParentGateOpen(false)}
        onSuccess={handleParentGateSuccess}
        privacyHref={privacyHref}
      />

      <ParentReportPanel
        open={parentReportOpen}
        onClose={() => setParentReportOpen(false)}
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
