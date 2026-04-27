import type { LearnerProfile } from '../learnerModel';
import type { LearningBatchReport } from '../../engagement/flow';
import type { Question, QuestionVariant } from '../../curriculum/types';
import type { ColdStartBaselineAssessment } from '../learnerModel';
import {
  buildAdaptiveQuestionPayload,
  type AdaptiveQuestionPayload,
} from '../../engagement/flow/buildAdaptiveQuestionPayload';
import type {
  ColdStartBaselinePayload,
  ColdStartProbePayload,
} from '../coldStartAgent';
import {
  resolveChildlearnEndpoint,
  resolveRuntimeUrl,
} from '../../network/runtimeUrl';

const DEFAULT_AI_ACTION = '/api/ai';
const DEFAULT_AI_ACTIONS = {
  observe: '/api/ai?action=observe',
  parentSummary: '/api/ai?action=parent-summary',
  programmingHint: '/api/ai?action=programming-hint',
  question: '/api/ai?action=question',
  crossTenHint: '/api/ai?action=cross-ten-hint',
  crossTenQuestion: '/api/ai?action=cross-ten-question',
  coldStartProbe: '/api/ai?action=cold-start-probe',
  coldStartAssess: '/api/ai?action=cold-start-assess',
  storyPolish: '/api/ai?action=story-polish',
} as const;
const DEFAULT_SYNC_ACTION = '/api/learning-sync';
const AI_ACTION_QUERY_NAMES = {
  observe: 'observe',
  parentSummary: 'parent-summary',
  programmingHint: 'programming-hint',
  question: 'question',
  crossTenHint: 'cross-ten-hint',
  crossTenQuestion: 'cross-ten-question',
  coldStartProbe: 'cold-start-probe',
  coldStartAssess: 'cold-start-assess',
  storyPolish: 'story-polish',
} as const;

type ProgrammingHintPayload = {
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
};

type ParentSummaryPayload = {
  accuracy: number;
  attempted: number;
  correct: number;
  difficulty: number;
  flowAction?: string | null;
  flowObserverIssue?: string | null;
  flowObserverReason?: string | null;
  flowState?: string | null;
  focusSkills: Array<{ count: number; key: string }>;
  learnerRadar: Array<{ label: string; theta: number }>;
  recommendedMinutes: string;
  reviewQueueSize: number;
};

type StoryPolishPayload = {
  answer: number;
  currentPrompt: string;
  expression: string;
  first: number;
  second: number;
};

type CrossTenHintPayload = {
  expression: string;
  prompt: string;
  reasoningMode: 'multiStep' | 'narration';
  stepStem?: string;
  wrongChoice: string;
  correctChoice?: string;
  targetNarrative?: string;
  hintOnWrong?: string;
};

export interface CoPilotQuestionResult {
  confidence: number;
  estimatedTheta: number | null;
  question: Question;
}

function aiBaseUrl() {
  return resolveRuntimeUrl(import.meta.env.VITE_CHILDLEARN_AI_URL?.trim() || DEFAULT_AI_ACTION);
}

export function aiActionUrl(action: keyof typeof DEFAULT_AI_ACTIONS) {
  const baseUrl = aiBaseUrl();
  if (!baseUrl) {
    return DEFAULT_AI_ACTIONS[action];
  }

  try {
    const url = new URL(baseUrl, window.location.origin);
    url.searchParams.set('action', AI_ACTION_QUERY_NAMES[action]);
    return url.pathname + url.search;
  } catch {
    return DEFAULT_AI_ACTIONS[action];
  }
}

export function defaultFlowObserverUrl() {
  return resolveChildlearnEndpoint({
    configuredUrl: import.meta.env.VITE_FLOW_OBSERVER_URL?.trim(),
    fallbackUrl: aiActionUrl('observe'),
    legacyPaths: ['/observe'],
  });
}

export function defaultLearningSyncUrl() {
  return resolveChildlearnEndpoint({
    configuredUrl: import.meta.env.VITE_LEARNING_SYNC_URL?.trim(),
    fallbackUrl: DEFAULT_SYNC_ACTION,
    legacyPaths: ['/sync/child-state'],
  });
}

async function postJson<T>(url: string, payload: unknown): Promise<T | null> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function isQuestionOption(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    'label' in value &&
    typeof value.label === 'string' &&
    'value' in value &&
    Number.isFinite(Number(value.value))
  );
}

function isQuestion(value: unknown): value is Question {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof value.id === 'string' &&
    'variant' in value &&
    typeof value.variant === 'string' &&
    'source' in value &&
    (value.source === 'template' ||
      value.source === 'pcg' ||
      value.source === 'pcg+llm' ||
      value.source === 'llm' ||
      value.source === 'golden' ||
      value.source === 'parent' ||
      value.source === 'teacher') &&
    'prompt' in value &&
    typeof value.prompt === 'string' &&
    'expression' in value &&
    typeof value.expression === 'string' &&
    'answer' in value &&
    Number.isFinite(Number(value.answer)) &&
    'options' in value &&
    Array.isArray(value.options) &&
    value.options.every(isQuestionOption) &&
    'objects' in value &&
    Array.isArray(value.objects) &&
    'barModel' in value &&
    Array.isArray(value.barModel) &&
    'scaffoldText' in value &&
    typeof value.scaffoldText === 'string' &&
    'principleText' in value &&
    typeof value.principleText === 'string'
  );
}

export async function requestCoPilotQuestion(
  payload: AdaptiveQuestionPayload,
): Promise<CoPilotQuestionResult | null> {
  const result = await postJson<{
    confidence?: unknown;
    estimatedTheta?: unknown;
    question?: unknown;
  }>(aiActionUrl('question'), payload);
  if (!result?.question || !isQuestion(result.question)) {
    return null;
  }

  const confidence = Number(result.confidence);
  const estimatedTheta = Number(result.estimatedTheta);

  return {
    question: result.question,
    confidence:
      Number.isFinite(confidence) && confidence >= 0 && confidence <= 1 ? confidence : 0,
    estimatedTheta: Number.isFinite(estimatedTheta) ? estimatedTheta : null,
  };
}

export async function requestCrossTenQuestion(
  payload: AdaptiveQuestionPayload,
): Promise<CoPilotQuestionResult | null> {
  const result = await postJson<{
    confidence?: unknown;
    estimatedTheta?: unknown;
    question?: unknown;
  }>(aiActionUrl('crossTenQuestion'), payload);
  if (!result?.question || !isQuestion(result.question)) {
    return null;
  }

  const confidence = Number(result.confidence);
  const estimatedTheta = Number(result.estimatedTheta);

  return {
    question: result.question,
    confidence:
      Number.isFinite(confidence) && confidence >= 0 && confidence <= 1 ? confidence : 0,
    estimatedTheta: Number.isFinite(estimatedTheta) ? estimatedTheta : null,
  };
}

export async function requestCrossTenHint(
  payload: CrossTenHintPayload,
): Promise<string | null> {
  const result = await postJson<{ hint?: unknown }>(aiActionUrl('crossTenHint'), payload);
  return typeof result?.hint === 'string' ? result.hint : null;
}

function isColdStartBaselineAssessment(value: unknown): value is ColdStartBaselineAssessment {
  return (
    typeof value === 'object' &&
    value !== null &&
    'schemaVersion' in value &&
    value.schemaVersion === 'childlearn.cold-start-baseline.v1' &&
    'confidence' in value &&
    Number.isFinite(Number(value.confidence)) &&
    'recommendedDifficulty' in value &&
    Number.isFinite(Number(value.recommendedDifficulty)) &&
    'baselineTheta' in value &&
    typeof value.baselineTheta === 'object' &&
    value.baselineTheta !== null
  );
}

export async function requestColdStartProbeQuestion(
  payload: ColdStartProbePayload,
): Promise<CoPilotQuestionResult | null> {
  const result = await postJson<{
    confidence?: unknown;
    estimatedTheta?: unknown;
    question?: unknown;
  }>(aiActionUrl('coldStartProbe'), payload);
  if (!result?.question || !isQuestion(result.question)) {
    return null;
  }

  const confidence = Number(result.confidence);
  const estimatedTheta = Number(result.estimatedTheta);
  return {
    question: result.question,
    confidence:
      Number.isFinite(confidence) && confidence >= 0 && confidence <= 1 ? confidence : 0,
    estimatedTheta: Number.isFinite(estimatedTheta) ? estimatedTheta : null,
  };
}

export async function requestColdStartBaselineAssessment(
  payload: ColdStartBaselinePayload,
): Promise<ColdStartBaselineAssessment | null> {
  const result = await postJson<unknown>(aiActionUrl('coldStartAssess'), payload);
  return isColdStartBaselineAssessment(result) ? result : null;
}

export async function requestProgrammingHint(
  payload: ProgrammingHintPayload,
): Promise<string | null> {
  const result = await postJson<{ hint?: unknown }>(
    aiActionUrl('programmingHint'),
    payload,
  );
  return typeof result?.hint === 'string' ? result.hint : null;
}

export async function requestStoryPolish(
  payload: StoryPolishPayload,
): Promise<string | null> {
  const result = await postJson<{ prompt?: unknown }>(aiActionUrl('storyPolish'), payload);
  return typeof result?.prompt === 'string' ? result.prompt : null;
}

export async function requestParentSummary(
  payload: ParentSummaryPayload,
): Promise<string | null> {
  const result = await postJson<{ summary?: unknown }>(
    aiActionUrl('parentSummary'),
    payload,
  );
  return typeof result?.summary === 'string' ? result.summary : null;
}

export { buildAdaptiveQuestionPayload };
export type {
  AdaptiveQuestionPayload,
  ParentSummaryPayload,
  ProgrammingHintPayload,
  StoryPolishPayload,
};
