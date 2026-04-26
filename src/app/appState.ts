import type { FeedbackLevel } from '../components/FeedbackBadge/FeedbackBadge';
import type { OptionVisualState } from '../components/OptionButton/OptionButton';
import { defaultFlowObserverUrl } from '../ai/api/childlearnAi';
import { DEFAULT_ENGLISH_ITEM } from '../english/englishItems';
import type { Sticker } from '../engagement/collection/useStickers';
import { findStickerById } from '../engagement/collection/useStickers';
import type {
  ApprovedFlowPolicy,
  FlowState,
  LearningBatchReport,
  LlmLearningObservation,
  QuestionAttemptRecord,
} from '../engagement/flow';
import type { NumberSpirit } from '../engagement/reward/useNumberSpirits';
import type { GardenReward } from '../engagement/reward/useRewardGarden';
import { DEFAULT_LITERACY_ITEM } from '../literacy/literacyItems';
import { resolveRuntimeUrl } from '../network/runtimeUrl';
import { scheduleLearningStateSync } from '../sync/learningStateSync';
import type { CelebrationLevel } from '../theme/confetti';
import type { LevelPackId } from '../curriculum/levelPacks';
import { isLevelPackId } from '../curriculum/levelPacks';
import type { ReviewItem } from '../curriculum/reviewQueue';
import type { Question, QuestionOption } from '../curriculum/types';

export type AppScene =
  | 'home'
  | 'practice'
  | 'result'
  | 'stickers'
  | 'literacy'
  | 'english'
  | 'programming';

export type PracticeRunMode = 'level' | 'diagnostic';

export interface SessionStats {
  attempted: number;
  correct: number;
  hintsUsed: number;
}

export interface LevelResultSnapshot {
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

export interface ActiveQuestionTelemetry {
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

export const INITIAL_STATS: SessionStats = {
  attempted: 0,
  correct: 0,
  hintsUsed: 0,
};

export const DEFAULT_LEVEL_QUESTION_GOAL = 10;
export const CORRECT_ADVANCE_MIN_MS = 2100;
export const WRONG_FEEDBACK_MIN_MS = 1500;
export const WRONG_FINAL_ADVANCE_MIN_MS = 2600;
export const MAX_WRONG_ATTEMPTS_PER_QUESTION = 3;
export const INTRO_TO_QUESTION_GAP_MS = 240;
export const QUESTION_ENTRY_DELAY_MS = 520;
export const QUESTION_IDLE_THRESHOLD_MS = 12000;
export const RAPID_CLICK_THRESHOLD_MS = 450;
export const FLOW_OBSERVER_URL = defaultFlowObserverUrl();

const configuredFlowObserverTimeoutMs = Number(
  import.meta.env.VITE_FLOW_OBSERVER_TIMEOUT_MS,
);

export const FLOW_OBSERVER_TIMEOUT_MS =
  Number.isFinite(configuredFlowObserverTimeoutMs) &&
  configuredFlowObserverTimeoutMs > 0
    ? configuredFlowObserverTimeoutMs
    : 4500;

export const INTERIM_FLOW_EVALUATION_INTERVAL = 5;

const STATS_STORAGE_KEY = 'childlearn.session-stats';
const APP_STATE_STORAGE_KEY = 'childlearn.app-state-v1';
const APP_SCROLL_STORAGE_KEY = 'childlearn.app-scroll-v1';

export type FlowObserverStatus = 'unconfigured' | 'idle' | 'pending' | 'ready' | 'failed';
export type FlowEvaluationTrigger = 'interim' | 'level_complete';

export interface StoredAppSnapshot {
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
  currentRunMode?: PracticeRunMode;
  diagnosticRunSeed?: number | null;
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

export function readStoredScrollSnapshot(): Partial<Record<AppScene, number>> {
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

export function writeStoredScrollSnapshot(snapshot: Partial<Record<AppScene, number>>) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(APP_SCROLL_STORAGE_KEY, JSON.stringify(snapshot));
}

export function readStoredAppSnapshot(): StoredAppSnapshot | null {
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
      currentRunMode:
        parsed.currentRunMode === 'diagnostic' || parsed.currentRunMode === 'level'
          ? parsed.currentRunMode
          : 'level',
      diagnosticRunSeed: Number.isFinite(Number(parsed.diagnosticRunSeed))
        ? Math.max(1, Math.round(Number(parsed.diagnosticRunSeed)))
        : null,
    };
  } catch {
    return null;
  }
}

export function writeStoredAppSnapshot(snapshot: StoredAppSnapshot) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(APP_STATE_STORAGE_KEY, JSON.stringify(snapshot));
  scheduleLearningStateSync('app_state');
}

function hydrateSticker(sticker: Sticker | null) {
  return sticker ? findStickerById(sticker.id) ?? sticker : null;
}

export function hydrateLevelResult(snapshot: StoredAppSnapshot | null) {
  if (!snapshot?.lastResult) {
    return null;
  }

  return {
    ...snapshot.lastResult,
    sticker: hydrateSticker(snapshot.lastResult.sticker),
  };
}

export function readStoredStats(): SessionStats {
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

export function writeStoredStats(stats: SessionStats) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(stats));
  scheduleLearningStateSync('session_stats');
}

export function feedbackForCombo(combo: number): CelebrationLevel {
  if (combo >= 10) {
    return 'amazing';
  }

  if (combo >= 3) {
    return 'great';
  }

  return 'correct';
}

export function getOptionState({
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

export function mergeNumberSpirits(previous: NumberSpirit[], next: NumberSpirit[]) {
  const merged = new Map<number, NumberSpirit>();

  [...previous, ...next].forEach((spirit) => {
    merged.set(spirit.value, spirit);
  });

  return [...merged.values()].sort((a, b) => a.value - b.value);
}

export function createClientId(prefix: string) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}
