import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Award, Gem, Sparkles, Star } from 'lucide-react';
import { ComboBanner } from './components/ComboBanner/ComboBanner';
import {
  FeedbackBadge,
  type FeedbackLevel,
} from './components/FeedbackBadge/FeedbackBadge';
import { EnglishModulePage } from './components/EnglishModulePage/EnglishModulePage';
import { FloatingDecoration } from './components/FloatingDecoration/FloatingDecoration';
import { HomeDashboard } from './components/HomeDashboard/HomeDashboard';
import { LevelResult } from './components/LevelResult/LevelResult';
import { LiteracyModulePage } from './components/LiteracyModulePage/LiteracyModulePage';
import {
  OptionButton,
  type OptionVisualState,
} from './components/OptionButton/OptionButton';
import { ParentReportPanel } from './components/ParentReportPanel/ParentReportPanel';
import { ProgrammingIslandPage } from './components/ProgrammingIslandPage/ProgrammingIslandPage';
import { QuestionCard } from './components/QuestionCard/QuestionCard';
import { Stat } from './components/Stat/Stat';
import { StickerActionModal } from './components/StickerActionModal/StickerActionModal';
import { StickerAlbumPage } from './components/StickerAlbumPage/StickerAlbumPage';
import { TopBar } from './components/TopBar/TopBar';
import { generateQuestion } from './curriculum/questionFactory';
import { addReviewItem, type ReviewItem } from './curriculum/reviewQueue';
import type { Question, QuestionOption } from './curriculum/types';
import {
  getLevelPackById,
  getLevelPackForDifficulty,
  isLevelPackId,
  selectLevelPackItem,
  selectLevelPackQuestionPlan,
  type LevelPackId,
} from './curriculum/levelPacks';
import { HintLadder } from './curriculum/scaffolding/HintLadder';
import { useAbilityProfile } from './engagement/ability/useAbilityProfile';
import { useCombo } from './engagement/combo/useCombo';
import { useDailyFirstWin } from './engagement/daily/useDailyFirstWin';
import { useDDA } from './engagement/dda/useDDA';
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
import { useSkinUnlock } from './engagement/skin/useSkinUnlock';
import {
  STICKER_UNLOCK_COMBO_INTERVAL,
  findStickerById,
  shouldOfferStickerUnlock,
  useStickers,
} from './engagement/collection/useStickers';
import type { Sticker } from './engagement/collection/useStickers';
import type { ProgrammingLevel } from './programming/programmingLevels';
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
import { LongPressGate } from './immersion/LongPressGate';
import { ToastStack, type ToastMessage } from './immersion/Toast';
import { useNoInterrupt } from './immersion/useNoInterrupt';
import { celebrate, type CelebrationLevel } from './theme/confetti';
import { playPositiveFeedback, playTryAgainFeedback } from './theme/sound';
import { BG } from './theme/tokens';
import { track } from './telemetry/track';
import { resolveRuntimeUrl } from './network/runtimeUrl';
import {
  scheduleLearningStateSync,
  useLearningStateSync,
} from './sync/learningStateSync';
import {
  buildCorrectVoiceLine,
  buildEnglishVoiceLine,
  buildHintVoiceLine,
  buildHomeVoiceLine,
  buildLiteracyVoiceLine,
  buildProgrammingVoiceLine,
  buildQuestionVoiceLine,
  buildStartVoiceLine,
  buildStickerVoiceLine,
  estimateVoiceLineDurationMs,
} from './voice/voiceLines';
import { useVoicePlayer } from './voice/useVoicePlayer';

type AppScene =
  | 'home'
  | 'practice'
  | 'result'
  | 'stickers'
  | 'literacy'
  | 'english'
  | 'programming';

interface SessionStats {
  attempted: number;
  correct: number;
  hintsUsed: number;
}

interface LevelResultSnapshot {
  correct: number;
  total: number;
  mistakes: number;
  maxCombo: number;
  starsEarned: number;
  rankName: string;
  difficulty: number;
  sticker: Sticker | null;
  gardenReward: GardenReward;
  newSpirits: NumberSpirit[];
}

interface ActiveQuestionTelemetry {
  questionId: string;
  questionIndex: number;
  startedAtMs: number;
  lastInteractionAtMs: number;
  firstSelectedAnswer: number | null;
  firstResponseTimeMs: number | null;
  attemptCount: number;
  audioReplayCount: number;
  hintCount: number;
  idleMs: number;
  idleNotified: boolean;
  rapidClickCount: number;
  feedbackInterruptClickCount: number;
  abandoned: boolean;
}

const INITIAL_STATS: SessionStats = {
  attempted: 0,
  correct: 0,
  hintsUsed: 0,
};

const STATS_STORAGE_KEY = 'childlearn.session-stats';
const DEFAULT_LEVEL_QUESTION_GOAL = 10;
const CORRECT_ADVANCE_MIN_MS = 2100;
const WRONG_FEEDBACK_MIN_MS = 1500;
const WRONG_FINAL_ADVANCE_MIN_MS = 2600;
const MAX_WRONG_ATTEMPTS_PER_QUESTION = 3;
const INTRO_TO_QUESTION_GAP_MS = 240;
const QUESTION_ENTRY_DELAY_MS = 520;
const QUESTION_IDLE_THRESHOLD_MS = 12000;
const RAPID_CLICK_THRESHOLD_MS = 450;
const FLOW_OBSERVER_URL = resolveRuntimeUrl(import.meta.env.VITE_FLOW_OBSERVER_URL?.trim());
const configuredFlowObserverTimeoutMs = Number(
  import.meta.env.VITE_FLOW_OBSERVER_TIMEOUT_MS,
);
const FLOW_OBSERVER_TIMEOUT_MS =
  Number.isFinite(configuredFlowObserverTimeoutMs) &&
  configuredFlowObserverTimeoutMs > 0
    ? configuredFlowObserverTimeoutMs
    : 4500;
const APP_STATE_STORAGE_KEY = 'childlearn.app-state-v1';
const APP_SCROLL_STORAGE_KEY = 'childlearn.app-scroll-v1';
const INTERIM_FLOW_EVALUATION_INTERVAL = 5;

type FlowObserverStatus = 'unconfigured' | 'idle' | 'pending' | 'ready' | 'failed';
type FlowEvaluationTrigger = 'interim' | 'level_complete';

interface StoredAppSnapshot {
  schemaVersion: 1;
  updatedAt: number;
  scene: AppScene;
  questionIndex: number;
  question: Question;
  selectedOptionId: string | null;
  feedback: FeedbackLevel | null;
  answered: boolean;
  hintStage: number;
  levelQuestionGoal: number;
  levelProgress: number;
  levelMistakes: number;
  levelBestCombo: number;
  levelStarsEarned: number;
  levelLatestStickerId: string | null;
  levelNewSpirits: NumberSpirit[];
  activeLevelPackId: LevelPackId | null;
  lastResult: LevelResultSnapshot | null;
  flowShadowReport: LearningBatchReport | null;
  flowShadowPolicy: ApprovedFlowPolicy | null;
  flowObservation: LlmLearningObservation | null;
  flowObserverStatus: FlowObserverStatus;
  reviewQueue: ReviewItem[];
  selectedStickerId: string | null;
  selectedLiteracyId: string | null;
  selectedEnglishId: string | null;
  practiceRunId: string | null;
  activeQuestionTelemetry: ActiveQuestionTelemetry | null;
  levelAttemptRecords: QuestionAttemptRecord[];
  recentFlowStates: FlowState[];
  currentRunPolicy: ApprovedFlowPolicy | null;
  currentRunPolicyBatchId: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function isAppScene(value: unknown): value is AppScene {
  return (
    value === 'home' ||
    value === 'practice' ||
    value === 'result' ||
    value === 'stickers' ||
    value === 'literacy' ||
    value === 'english' ||
    value === 'programming'
  );
}

function isQuestion(value: unknown): value is Question {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    typeof value.factId === 'string' &&
    typeof value.prompt === 'string' &&
    typeof value.expression === 'string' &&
    typeof value.answer === 'number' &&
    Array.isArray(value.options)
  );
}

function readStoredScrollSnapshot(): Partial<Record<AppScene, number>> {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(APP_SCROLL_STORAGE_KEY) ?? '{}',
    ) as Record<string, unknown>;

    return Object.fromEntries(
      Object.entries(parsed)
        .filter(([sceneKey, scrollTop]) => isAppScene(sceneKey) && typeof scrollTop === 'number')
        .map(([sceneKey, scrollTop]) => [
          sceneKey,
          Math.max(0, Math.round(Number(scrollTop))),
        ]),
    ) as Partial<Record<AppScene, number>>;
  } catch {
    return {};
  }
}

function writeStoredScrollSnapshot(snapshot: Partial<Record<AppScene, number>>) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(APP_SCROLL_STORAGE_KEY, JSON.stringify(snapshot));
}

function readStoredAppSnapshot(): StoredAppSnapshot | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(APP_STATE_STORAGE_KEY) ?? 'null',
    ) as Partial<StoredAppSnapshot> | null;

    if (!parsed || parsed.schemaVersion !== 1 || !isAppScene(parsed.scene)) {
      return null;
    }

    if (!isQuestion(parsed.question)) {
      return null;
    }

    const scene =
      parsed.scene === 'result' && !parsed.lastResult ? 'home' : parsed.scene;

    return {
      schemaVersion: 1,
      updatedAt: Number(parsed.updatedAt ?? Date.now()),
      scene,
      questionIndex: Number.isFinite(Number(parsed.questionIndex))
        ? Math.max(0, Math.round(Number(parsed.questionIndex)))
        : 0,
      question: parsed.question,
      selectedOptionId:
        typeof parsed.selectedOptionId === 'string' ? parsed.selectedOptionId : null,
      feedback: parsed.feedback ?? null,
      answered: Boolean(parsed.answered),
      hintStage: Number.isFinite(Number(parsed.hintStage))
        ? Math.min(Math.max(Math.round(Number(parsed.hintStage)), 0), 3)
        : 0,
      levelQuestionGoal: Number.isFinite(Number(parsed.levelQuestionGoal))
        ? Math.max(1, Math.round(Number(parsed.levelQuestionGoal)))
        : DEFAULT_LEVEL_QUESTION_GOAL,
      levelProgress: Number.isFinite(Number(parsed.levelProgress))
        ? Math.max(0, Math.round(Number(parsed.levelProgress)))
        : 0,
      levelMistakes: Number.isFinite(Number(parsed.levelMistakes))
        ? Math.max(0, Math.round(Number(parsed.levelMistakes)))
        : 0,
      levelBestCombo: Number.isFinite(Number(parsed.levelBestCombo))
        ? Math.max(0, Math.round(Number(parsed.levelBestCombo)))
        : 0,
      levelStarsEarned: Number.isFinite(Number(parsed.levelStarsEarned))
        ? Math.max(0, Math.round(Number(parsed.levelStarsEarned)))
        : 0,
      levelLatestStickerId:
        typeof parsed.levelLatestStickerId === 'string'
          ? parsed.levelLatestStickerId
          : null,
      levelNewSpirits: Array.isArray(parsed.levelNewSpirits)
        ? parsed.levelNewSpirits
        : [],
      activeLevelPackId: isLevelPackId(parsed.activeLevelPackId)
        ? parsed.activeLevelPackId
        : null,
      lastResult: parsed.lastResult ?? null,
      flowShadowReport: parsed.flowShadowReport ?? null,
      flowShadowPolicy: parsed.flowShadowPolicy ?? null,
      flowObservation: parsed.flowObservation ?? null,
      flowObserverStatus:
        parsed.flowObserverStatus === 'ready' || parsed.flowObserverStatus === 'failed'
          ? parsed.flowObserverStatus
          : FLOW_OBSERVER_URL
            ? 'idle'
            : 'unconfigured',
      reviewQueue: Array.isArray(parsed.reviewQueue) ? parsed.reviewQueue : [],
      selectedStickerId:
        typeof parsed.selectedStickerId === 'string' ? parsed.selectedStickerId : null,
      selectedLiteracyId:
        typeof parsed.selectedLiteracyId === 'string'
          ? parsed.selectedLiteracyId
          : DEFAULT_LITERACY_ITEM.id,
      selectedEnglishId:
        typeof parsed.selectedEnglishId === 'string'
          ? parsed.selectedEnglishId
          : DEFAULT_ENGLISH_ITEM.id,
      practiceRunId:
        typeof parsed.practiceRunId === 'string' ? parsed.practiceRunId : null,
      activeQuestionTelemetry: parsed.activeQuestionTelemetry ?? null,
      levelAttemptRecords: Array.isArray(parsed.levelAttemptRecords)
        ? parsed.levelAttemptRecords
        : [],
      recentFlowStates: Array.isArray(parsed.recentFlowStates)
        ? parsed.recentFlowStates
        : [],
      currentRunPolicy: parsed.currentRunPolicy ?? null,
      currentRunPolicyBatchId:
        typeof parsed.currentRunPolicyBatchId === 'string'
          ? parsed.currentRunPolicyBatchId
          : null,
    };
  } catch {
    return null;
  }
}

function writeStoredAppSnapshot(snapshot: StoredAppSnapshot) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(APP_STATE_STORAGE_KEY, JSON.stringify(snapshot));
  scheduleLearningStateSync('app_state');
}

function hydrateSticker(sticker: Sticker | null) {
  return sticker ? findStickerById(sticker.id) ?? sticker : null;
}

function hydrateLevelResult(snapshot: StoredAppSnapshot | null) {
  if (!snapshot?.lastResult) {
    return null;
  }

  return {
    ...snapshot.lastResult,
    sticker: hydrateSticker(snapshot.lastResult.sticker),
  };
}

function readStoredStats(): SessionStats {
  if (typeof window === 'undefined') {
    return INITIAL_STATS;
  }

  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(STATS_STORAGE_KEY) ?? '{}',
    ) as Partial<SessionStats>;

    const attempted = Number(parsed.attempted ?? 0);
    const correct = Number(parsed.correct ?? 0);
    const hintsUsed = Number(parsed.hintsUsed ?? 0);

    return {
      attempted: Number.isFinite(attempted) ? Math.max(0, attempted) : 0,
      correct: Number.isFinite(correct) ? Math.max(0, correct) : 0,
      hintsUsed: Number.isFinite(hintsUsed) ? Math.max(0, hintsUsed) : 0,
    };
  } catch {
    return INITIAL_STATS;
  }
}

function writeStoredStats(stats: SessionStats) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(stats));
  scheduleLearningStateSync('session_stats');
}

function feedbackForCombo(combo: number): CelebrationLevel {
  if (combo >= 10) {
    return 'amazing';
  }

  if (combo >= 3) {
    return 'great';
  }

  return 'correct';
}

function getOptionState({
  option,
  question,
  selectedOptionId,
  answered,
  hintStage,
}: {
  option: QuestionOption;
  question: Question;
  selectedOptionId: string | null;
  answered: boolean;
  hintStage: number;
}): OptionVisualState {
  if (answered) {
    return option.value === question.answer ? 'correct' : 'disabled';
  }

  if (selectedOptionId === option.id) {
    return option.value === question.answer ? 'correct' : 'wrong';
  }

  if (hintStage >= 3 && option.value === question.answer) {
    return 'correct';
  }

  if (hintStage >= 2 && Math.abs(option.value - question.answer) <= 1) {
    return 'hint';
  }

  return 'idle';
}

function mergeNumberSpirits(previous: NumberSpirit[], next: NumberSpirit[]) {
  const merged = new Map<number, NumberSpirit>();

  [...previous, ...next].forEach((spirit) => {
    merged.set(spirit.value, spirit);
  });

  return [...merged.values()].sort((a, b) => a.value - b.value);
}

function createClientId(prefix: string) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function LevelProgressStrip({ current, total }: { current: number; total: number }) {
  const safeCurrent = Math.min(Math.max(current, 0), total);

  return (
    <div className="mx-auto w-full rounded-3xl bg-white/78 p-4 shadow-xl shadow-emerald-500/15 ring-2 ring-white backdrop-blur-xl">
      <div className="mb-3 flex items-center justify-between gap-3 text-base font-black text-emerald-950">
        <span>本关</span>
        <span>{safeCurrent}/{total}</span>
      </div>
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: total }, (_, index) => (
          <span
            key={index}
            className={`h-5 rounded-full ring-1 ring-white ${
              index < safeCurrent
                ? 'bg-gradient-to-r from-emerald-300 to-lime-400 shadow-md shadow-emerald-400/25'
                : 'bg-emerald-50'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

export default function App() {
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
  const scrollPositionsRef = useRef<Partial<Record<AppScene, number>>>(
    readStoredScrollSnapshot(),
  );
  const currentScrollSceneRef = useRef<AppScene>(scene);
  const hasRestoredInitialScrollRef = useRef(false);
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
  const [parentReportOpen, setParentReportOpen] = useState(false);
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
  const timeoutIds = useRef<number[]>([]);
  const flowIdRef = useRef(0);
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

  const combo = useCombo();
  const dda = useDDA();
  const rank = useRank();
  const daily = useDailyFirstWin();
  const stickers = useStickers();
  const rewardGarden = useRewardGarden();
  const numberSpirits = useNumberSpirits();
  const ability = useAbilityProfile();
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

  const schedule = useCallback((task: () => void, delay: number) => {
    const id = window.setTimeout(() => {
      timeoutIds.current = timeoutIds.current.filter((storedId) => storedId !== id);
      task();
    }, delay);
    timeoutIds.current.push(id);
  }, []);

  const clearScheduled = useCallback(() => {
    timeoutIds.current.forEach((id) => window.clearTimeout(id));
    timeoutIds.current = [];
  }, []);

  const waitFor = useCallback(
    (delay: number) =>
      new Promise<void>((resolve) => {
        schedule(resolve, delay);
      }),
    [schedule],
  );

  const beginFlow = useCallback(() => {
    flowIdRef.current += 1;
    return flowIdRef.current;
  }, []);

  const isCurrentFlow = useCallback((flowId: number) => flowIdRef.current === flowId, []);

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

        recentFlowStatesRef.current = [
          ...previousFlowStates,
          filteredPolicy.finalState,
        ].slice(-5);
        setFlowObservation(observation);
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
    [dda],
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

  const generateAdaptiveQuestion = useCallback((difficulty: number, serial: number) => {
    const plan = selectFlowQuestionPlan({
      policy: currentRunPolicyRef.current,
      fallbackDifficulty: difficulty,
      serial,
    });
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

    return generateQuestion({
      difficulty: packPlan?.difficulty ?? plan.difficulty,
      serial,
      variant: packPlan?.variant ?? plan.variant,
    });
  }, []);

  useNoInterrupt(addToast);

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

  useEffect(() => () => clearScheduled(), [clearScheduled]);

  useEffect(() => {
    const node = mainRef.current;
    if (!node) {
      return undefined;
    }

    let persistTimeoutId: number | null = null;
    const rememberCurrentScroll = ({
      preserveNonZero = false,
    }: { preserveNonZero?: boolean } = {}) => {
      const sceneKey = currentScrollSceneRef.current;
      const scrollTop = Math.max(0, Math.round(node.scrollTop));
      const previousScrollTop = scrollPositionsRef.current[sceneKey] ?? 0;

      if (preserveNonZero && scrollTop === 0 && previousScrollTop > 0) {
        return;
      }

      scrollPositionsRef.current[sceneKey] = scrollTop;
    };
    const persistScrollSoon = () => {
      if (persistTimeoutId !== null) {
        return;
      }

      persistTimeoutId = window.setTimeout(() => {
        persistTimeoutId = null;
        writeStoredScrollSnapshot(scrollPositionsRef.current);
      }, 300);
    };
    const handleScroll = () => {
      rememberCurrentScroll();
      persistScrollSoon();
    };
    const flushScroll = () => {
      rememberCurrentScroll({ preserveNonZero: true });
      if (persistTimeoutId !== null) {
        window.clearTimeout(persistTimeoutId);
        persistTimeoutId = null;
      }
      writeStoredScrollSnapshot(scrollPositionsRef.current);
    };

    node.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('pagehide', flushScroll);

    return () => {
      node.removeEventListener('scroll', handleScroll);
      window.removeEventListener('pagehide', flushScroll);
      flushScroll();
    };
  }, []);

  useEffect(() => {
    const node = mainRef.current;
    if (!node) {
      return undefined;
    }

    currentScrollSceneRef.current = scene;
    const savedScrollTop = scrollPositionsRef.current[scene] ?? 0;
    const shouldAnimate = hasRestoredInitialScrollRef.current && savedScrollTop === 0;
    let frameId = 0;
    const restoreScroll = (attempt: number) => {
      const maxScrollTop = Math.max(node.scrollHeight - node.clientHeight, 0);
      const targetScrollTop = Math.min(savedScrollTop, maxScrollTop);

      node.scrollTo({
        top: targetScrollTop,
        behavior: shouldAnimate ? 'smooth' : 'auto',
      });
      hasRestoredInitialScrollRef.current = true;

      if (
        savedScrollTop > 0 &&
        attempt < 8 &&
        Math.abs(node.scrollTop - targetScrollTop) > 2
      ) {
        frameId = window.requestAnimationFrame(() => restoreScroll(attempt + 1));
      }
    };

    frameId = window.requestAnimationFrame(() => restoreScroll(0));

    return () => window.cancelAnimationFrame(frameId);
  }, [scene]);

  const nextQuestion = useCallback(
    (difficulty: number, flowId?: number) => {
      const nextIndex = questionIndex + 1;
      const next = generateAdaptiveQuestion(difficulty, nextIndex);
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
      generateAdaptiveQuestion,
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
    flowObserverRequestIdRef.current += 1;
    practiceRunIdRef.current = runId;
    currentRunPolicyRef.current = startingPolicy;
    currentRunPolicyBatchIdRef.current = startingPolicyBatchId;
    const difficulty = startingPolicy?.nextDifficulty ?? dda.difficulty;
    const levelPack = getLevelPackForDifficulty(difficulty);
    activeLevelPackIdRef.current = levelPack.id;
    const goal = Math.min(
      startingPolicy?.batchSize ?? levelPack.items.length,
      levelPack.items.length,
    );
    const firstQuestion = generateAdaptiveQuestion(difficulty, 0);
    const line = buildStartVoiceLine();

    clearScheduled();
    stop();
    combo.endRun();
    if (startingPolicy) {
      dda.applyDifficulty(difficulty);
    }
    setQuestionIndex(0);
    setQuestion(firstQuestion);
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
    setActiveLevelPackId(levelPack.id);
    setLevelQuestionGoal(goal);
    setLastResult(null);
    setFlowShadowReport(null);
    setFlowShadowPolicy(null);
    setFlowObservation(null);
    setFlowObserverStatus(FLOW_OBSERVER_URL ? 'idle' : 'unconfigured');
    levelAttemptRecordsRef.current = [];
    lastEvaluatedAttemptCountRef.current = 0;
    beginQuestionTelemetry(firstQuestion, 0);
    setScene('practice');
    void speak(line);
    readQuestionAfterDelay(
      firstQuestion,
      flowId,
      estimateVoiceLineDurationMs(line) + INTRO_TO_QUESTION_GAP_MS,
    );
    track('practice.open', {
      runId,
      difficulty,
      goal,
      levelPackId: levelPack.id,
      levelPackTitle: levelPack.title,
      levelPackGoal: levelPack.shortGoal,
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
    generateAdaptiveQuestion,
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

  const handleHome = useCallback(() => {
    trackActiveQuestionAbandoned('home');
    beginFlow();
    stop();
    combo.endRun();
    setFeedback(null);
    setAnswered(false);
    setSelectedOptionId(null);
    setParentReportOpen(false);
    setScene('home');
    track('home.open', {});
  }, [beginFlow, combo, stop, trackActiveQuestionAbandoned]);

  const handleOpenStickerAlbum = useCallback(() => {
    trackActiveQuestionAbandoned('stickers');
    beginFlow();
    stop();
    setFeedback(null);
    setAnswered(false);
    setSelectedOptionId(null);
    setParentReportOpen(false);
    setScene('stickers');
    track('stickers.open', {
      collected: stickers.collected.length,
      total: stickers.total,
    });
  }, [
    beginFlow,
    stickers.collected.length,
    stickers.total,
    stop,
    trackActiveQuestionAbandoned,
  ]);

  const handleOpenLiteracy = useCallback(() => {
    trackActiveQuestionAbandoned('literacy');
    beginFlow();
    stop();
    setFeedback(null);
    setAnswered(false);
    setSelectedOptionId(null);
    setParentReportOpen(false);
    setScene('literacy');
    track('literacy.open', {
      itemCount: LITERACY_ITEMS.length,
      selectedItemId: selectedLiteracyId,
    });
  }, [beginFlow, selectedLiteracyId, stop, trackActiveQuestionAbandoned]);

  const handleOpenEnglish = useCallback(() => {
    trackActiveQuestionAbandoned('english');
    beginFlow();
    stop();
    setFeedback(null);
    setAnswered(false);
    setSelectedOptionId(null);
    setParentReportOpen(false);
    setScene('english');
    track('english.open', {
      itemCount: ENGLISH_ITEMS.length,
      selectedItemId: selectedEnglishId,
    });
  }, [beginFlow, selectedEnglishId, stop, trackActiveQuestionAbandoned]);

  const handleOpenProgramming = useCallback(() => {
    trackActiveQuestionAbandoned('programming');
    beginFlow();
    stop();
    setFeedback(null);
    setAnswered(false);
    setSelectedOptionId(null);
    setParentReportOpen(false);
    setScene('programming');
    track('programming.open', {
      completed: programmingProgress.completedCount,
      total: programmingProgress.totalLevelCount,
      nextLevelId: programmingProgress.nextLevel.id,
    });
  }, [
    beginFlow,
    programmingProgress.completedCount,
    programmingProgress.nextLevel.id,
    programmingProgress.totalLevelCount,
    stop,
    trackActiveQuestionAbandoned,
  ]);

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

  const handleCompleteProgrammingLevel = useCallback(
    (level: ProgrammingLevel) => {
      const isNewCompletion = programmingProgress.completeLevel(level);
      addToast(isNewCompletion ? `${level.title} 通关` : `${level.title} 已通关`);
      track('programming.level_complete', {
        levelId: level.id,
        concept: level.concept,
        isNewCompletion,
      });
    },
    [addToast, programmingProgress],
  );

  const handleStartPractice = useCallback(() => {
    resetLevelRun();
  }, [resetLevelRun]);

  const handleSound = useCallback(() => {
    const line =
      scene === 'practice'
        ? hintStage > 0
          ? buildHintVoiceLine(question, hintStage)
          : buildQuestionVoiceLine(question)
        : scene === 'result' && lastResult
          ? {
              moment: 'reward' as const,
              rate: '-8%',
              text: `本关完成。答对 ${lastResult.correct} 题，失误 ${lastResult.mistakes} 次，最高连击 ${lastResult.maxCombo}。`,
            }
        : scene === 'literacy'
          ? buildLiteracyVoiceLine(selectedLiteracyItem)
        : scene === 'english'
          ? buildEnglishVoiceLine(selectedEnglishItem)
        : scene === 'programming'
          ? buildProgrammingVoiceLine(
              '这里是光之编程馆。先放指令，再点运行，看看小光会怎么走。',
            )
        : buildHomeVoiceLine({
            rankName: rank.rank.name,
            stars: rank.stars,
            correct: stats.correct,
            difficulty: dda.difficulty,
          });

    void speak(line, { notifyOnUnsupported: true });
    if (scene === 'practice') {
      const telemetry = activeQuestionTelemetryRef.current;
      if (telemetry?.questionId === question.id) {
        telemetry.audioReplayCount += 1;
        telemetry.lastInteractionAtMs = Date.now();
      }
      track(
        'question.audio_replay',
        questionEventPayload(question, questionIndex, {
          audioReplayCount: telemetry?.audioReplayCount ?? null,
        }),
      );
    }
    track('voice.prompt', {
      scene,
      fact:
        scene === 'practice'
          ? question.factId
          : scene === 'literacy'
            ? selectedLiteracyItem.id
            : scene === 'english'
              ? selectedEnglishItem.id
              : scene === 'programming'
                ? 'programming'
              : 'home',
    });
  }, [
    dda.difficulty,
    hintStage,
    question,
    questionIndex,
    questionEventPayload,
    rank.rank.name,
    rank.stars,
    scene,
    selectedEnglishItem,
    selectedLiteracyItem,
    stats.correct,
    lastResult,
    speak,
  ]);

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
      const nextHintStage = isCorrect ? hintStage : Math.min(hintStage + 1, 3);
      const attemptTelemetry = recordAnswerAttempt(question, option, nextHintStage);
      setSelectedOptionId(option.id);
      setStats((previous) => {
        const next = {
          attempted: previous.attempted + 1,
          correct: previous.correct + (isCorrect ? 1 : 0),
          hintsUsed: previous.hintsUsed + (isCorrect ? 0 : 1),
        };
        writeStoredStats(next);
        return next;
      });

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
        ability.recordAttempt(completedAttemptRecord);
        const flowId = beginFlow();
        const nextDda = dda.onCorrect();
        const nextCombo = combo.hit();
        const level = feedbackForCombo(nextCombo);
        const firstWin = daily.claim();
        const stickerUnlockEligible = shouldOfferStickerUnlock({
          combo: nextCombo,
          firstAttemptCorrect: completedAttemptRecord.firstAttemptCorrect,
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
        const newlyUnlockedSpirits = numberSpirits.recordQuestion(question);
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
        const nextChestRemaining = chestGoal - ((stats.correct + 1) % chestGoal || chestGoal);

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
                ? `COMBO ×${nextCombo} 里程碑`
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
        celebrate(level);
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
      combo.miss();
      const nextDda = dda.onWrong();
      const nextLevelMistakes = levelMistakes + 1;
      const shouldFinalizeWrong =
        (attemptTelemetry?.attemptCount ?? 0) >= MAX_WRONG_ATTEMPTS_PER_QUESTION;
      setLevelMistakes(nextLevelMistakes);
      setHintStage(nextHintStage);
      const wrongFeedbackStartedAt = Date.now();
      setFeedback('wrong');
      setReviewQueue((queue) => addReviewItem(queue, question));
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
        ability.recordAttempt(completedAttemptRecord);
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
  return (
    <main
      ref={mainRef}
      className={`app-shell relative overflow-x-hidden overflow-y-auto overscroll-y-contain bg-gradient-to-b ${currentSkin.gradient || BG.mint}`}
    >
      <FloatingDecoration emoji="☁️" className="left-[10%] top-[8%] z-0 text-7xl opacity-25" />
      <FloatingDecoration
        emoji="🌈"
        className={
          scene === 'practice'
            ? 'hidden'
            : 'right-[14%] top-[18%] z-0 text-6xl opacity-20'
        }
        delay={0.4}
      />
      <FloatingDecoration
        emoji="⭐"
        className="bottom-[16%] left-[18%] z-0 text-5xl opacity-30"
        delay={0.8}
      />
      <FloatingDecoration
        emoji="🍃"
        className="bottom-[10%] right-[18%] z-0 text-6xl opacity-25"
        delay={1.2}
      />

      <TopBar
        combo={scene === 'practice' ? combo.current : 0}
        themeName={
          scene === 'literacy'
            ? '识字乐园'
            : scene === 'english'
              ? '英语乐园'
              : scene === 'programming'
                ? '编程馆'
              : `${currentSkin.name}摘果`
        }
        onHome={handleHome}
        onSound={handleSound}
      />
      {scene === 'practice' ? <FeedbackBadge level={feedback} /> : null}
      {scene === 'practice' ? <ComboBanner combo={combo.current} /> : null}

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
            skins={skins}
            levelProgress={levelProgress}
            levelGoal={homeLevelGoal}
            garden={rewardGarden.garden}
            spirits={numberSpirits.spirits}
            literacyPreview={LITERACY_ITEMS.slice(0, 4)}
            englishPreview={ENGLISH_ITEMS.slice(0, 4)}
            programmingCompleted={programmingProgress.completedCount}
            programmingTotal={programmingProgress.totalLevelCount}
            programmingNextTitle={programmingProgress.nextLevel.title}
            onStart={handleStartPractice}
            onOpenProgramming={handleOpenProgramming}
            onOpenLiteracy={handleOpenLiteracy}
            onOpenEnglish={handleOpenEnglish}
            onOpenStickerAlbum={handleOpenStickerAlbum}
            onInspectSticker={handleInspectSticker}
          />
        ) : scene === 'literacy' ? (
          <LiteracyModulePage
            key="literacy"
            items={LITERACY_ITEMS}
            selectedItem={selectedLiteracyItem}
            onBack={handleHome}
            onSelectItem={handleSelectLiteracyItem}
            onSpeakItem={handleSpeakLiteracyItem}
          />
        ) : scene === 'english' ? (
          <EnglishModulePage
            key="english"
            items={ENGLISH_ITEMS}
            selectedItem={selectedEnglishItem}
            onBack={handleHome}
            onSelectItem={handleSelectEnglishItem}
            onSpeakItem={handleSpeakEnglishItem}
          />
        ) : scene === 'programming' ? (
          <ProgrammingIslandPage
            key="programming"
            onBack={handleHome}
            onSpeak={handleSpeakProgramming}
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
            onBack={handleHome}
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
            onHome={handleHome}
            onRetry={resetLevelRun}
            onContinue={resetLevelRun}
            onInspectSticker={handleInspectSticker}
          />
        ) : (
          <motion.section
            key="practice"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: 'spring', stiffness: 200, damping: 30 }}
            className="ipad-practice-grid relative z-10 mx-auto grid w-full max-w-7xl gap-5 pb-24"
          >
            <div className="flex min-w-0 flex-col gap-5">
              <QuestionCard question={question} answered={answered} />

              <HintLadder question={question} stage={hintStage} />
            </div>

            <aside className="ipad-answer-rail flex min-w-0 flex-col gap-4">
              <LevelProgressStrip current={levelProgress} total={levelQuestionGoal} />

              <div className="ipad-options-grid mx-auto grid w-full gap-4">
                {optionStates.map(({ option, state }) => (
                  <OptionButton
                    key={`${question.id}-${option.id}`}
                    option={option}
                    state={state}
                    onSelect={handleSelect}
                  />
                ))}
              </div>

              <div className="ipad-session-stats mx-auto grid w-full gap-3">
                <Stat label="段位" value={rank.rank.name}>
                  <Award size={28} strokeWidth={3.2} />
                </Stat>
                <Stat label="小星" value={rank.rank.starLabel}>
                  <Star size={28} strokeWidth={3.2} />
                </Stat>
                <Stat label="奥特贴纸" value={`${stickers.collected.length}/${stickers.total}`}>
                  <Sparkles size={28} strokeWidth={3.2} />
                </Stat>
                <Stat label="难度" value={String(dda.difficulty)}>
                  <Gem size={28} strokeWidth={3.2} />
                </Stat>
              </div>
            </aside>
          </motion.section>
        )}
      </AnimatePresence>

      <LongPressGate onOpen={() => setParentReportOpen(true)} />

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

      <AnimatePresence>
        {answered && feedback !== 'wrong' ? (
          <motion.span
            key={question.id}
            initial={{
              top: '50%',
              left: '50%',
              scale: 1.5,
              opacity: 1,
            }}
            animate={{
              top: '6rem',
              left: 'calc(100vw - 4rem)',
              scale: 0.6,
              opacity: 0,
            }}
            transition={{ duration: 0.8, ease: 'easeIn' }}
            className="pointer-events-none fixed z-40 text-5xl drop-shadow-xl"
          >
            💎
          </motion.span>
        ) : null}
      </AnimatePresence>

      <ParentReportPanel
        open={parentReportOpen}
        onClose={() => setParentReportOpen(false)}
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
      />
      <ToastStack messages={toasts} />
    </main>
  );
}
