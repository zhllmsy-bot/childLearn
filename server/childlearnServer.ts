import { getMathProgressionBand } from '../src/curriculum/mathProgression';
import { buildOptions } from '../src/curriculum/questionFactory';
import type {
  Question,
  QuestionLevel,
  QuestionOption,
  QuestionTheme,
  QuestionVariant,
} from '../src/curriculum/types';

type JsonRecord = Record<string, unknown>;

export type AiAction =
  | 'observe'
  | 'question'
  | 'programming-hint'
  | 'parent-summary';

export interface ServerExecutionContext {
  env?: Record<string, string | undefined>;
}

export interface ServerResult {
  status: number;
  body: unknown;
  headers?: Record<string, string>;
}

interface CacheEntry {
  expiresAt: number;
  body: unknown;
}

interface AiConfig {
  apiKey: string;
  baseUrl: string;
  defaultModel: string;
  provider: 'openai' | 'anthropic';
  observerModel: string;
  parentModel: string;
  programmingHintModel: string;
  questionModel: string;
}

interface QuestionRequestBody {
  difficulty?: number;
  lane?: string;
  serial?: number;
  targetSkillKey?: string;
  targetTheta?: number;
  variant?: QuestionVariant;
  recentErrorPatterns?: Array<{
    count?: number;
    label?: string;
    skillKey?: string;
    type?: string;
  }>;
  recentResponses?: Array<{
    difficultyTheta?: number;
    finalCorrect?: boolean;
    firstAttemptCorrect?: boolean;
    hintCount?: number;
    questionId?: string;
    skillKeys?: string[];
  }>;
}

interface ProgrammingHintRequestBody {
  levelId?: string;
  levelTitle?: string;
  levelPrompt?: string;
  requiredKinds?: string[];
  allowedCommands?: string[];
  currentProgramKinds?: string[];
  remainingGems?: number;
  status?: string;
  blockedReason?: string;
  fallbackHint?: string;
}

interface ParentSummaryRequestBody {
  accuracy?: number;
  attempted?: number;
  correct?: number;
  difficulty?: number;
  flowAction?: string | null;
  flowObserverIssue?: string | null;
  flowObserverReason?: string | null;
  flowState?: string | null;
  focusSkills?: Array<{ count?: number; key?: string }>;
  learnerRadar?: Array<{ label?: string; theta?: number }>;
  recommendedMinutes?: string;
  reviewQueueSize?: number;
}

const ACTION_CACHE = new Map<string, CacheEntry>();

const DEFAULT_THEME_BY_VARIANT: Record<QuestionVariant, QuestionTheme> = {
  compare: { emoji: '🍊', colorHint: 'orange' },
  makeTen: { emoji: '🍓', colorHint: 'pink' },
  matching: { emoji: '🍎', colorHint: 'rose' },
  missing: { emoji: '🍇', colorHint: 'violet' },
  numberLine: { emoji: '⭐', colorHint: 'amber' },
  story: { emoji: '🍐', colorHint: 'lime' },
};

const QUESTION_ACTION = '/api/ai?action=question';
const OBSERVE_ACTION = '/api/ai?action=observe';
const PARENT_SUMMARY_ACTION = '/api/ai?action=parent-summary';
const PROGRAMMING_HINT_ACTION = '/api/ai?action=programming-hint';
export const DEFAULT_SYNC_ACTION = '/api/learning-sync';
export const DEFAULT_AI_ACTION = '/api/ai';

function readEnv(
  context: ServerExecutionContext,
  ...names: string[]
): string | undefined {
  for (const name of names) {
    const fromContext = context.env?.[name]?.trim();
    if (fromContext) {
      return fromContext;
    }
    const fromProcess = process.env[name]?.trim();
    if (fromProcess) {
      return fromProcess;
    }
  }
  return undefined;
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function finiteNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function compactText(text: string) {
  return text.replace(/\s+/g, ' ').trim();
}

function nowMs() {
  return Date.now();
}

function cacheKey(action: AiAction, body: unknown) {
  return JSON.stringify({ action, body });
}

function getCached(action: AiAction, body: unknown) {
  const hit = ACTION_CACHE.get(cacheKey(action, body));
  if (!hit || hit.expiresAt < nowMs()) {
    return null;
  }
  return hit.body;
}

function setCached(action: AiAction, body: unknown, responseBody: unknown) {
  const ttlMs =
    action === 'question'
      ? 10 * 60_000
      : action === 'observe'
        ? 20_000
        : 2 * 60_000;
  ACTION_CACHE.set(cacheKey(action, body), {
    body: responseBody,
    expiresAt: nowMs() + ttlMs,
  });
}

function resolveAiConfig(context: ServerExecutionContext): AiConfig | null {
  const providerText = readEnv(context, 'CHILDLEARN_AI_PROVIDER') ?? 'openai';
  const provider = providerText === 'anthropic' ? 'anthropic' : 'openai';
  const apiKey =
    provider === 'anthropic'
      ? readEnv(context, 'CHILDLEARN_AI_API_KEY', 'ANTHROPIC_API_KEY') ?? ''
      : readEnv(
          context,
          'CHILDLEARN_AI_API_KEY',
          'FLOW_OBSERVER_CLIPROXY_API_KEY',
          'CLIPROXY_API_KEY',
          'OPENAI_API_KEY',
        ) ?? '';

  if (!apiKey) {
    return null;
  }

  const baseUrl =
    provider === 'anthropic'
      ? readEnv(context, 'CHILDLEARN_AI_BASE_URL') ?? 'https://api.anthropic.com/v1'
      : readEnv(
            context,
            'CHILDLEARN_AI_BASE_URL',
            'FLOW_OBSERVER_CLIPROXY_BASE_URL',
            'CLIPROXY_BASE_URL',
          ) ?? 'https://api.openai.com/v1';

  const defaultModel =
    readEnv(context, 'CHILDLEARN_AI_MODEL', 'FLOW_OBSERVER_MODEL') ?? 'gpt-5.4-mini';

  return {
    apiKey,
    baseUrl: baseUrl.replace(/\/$/, ''),
    defaultModel,
    observerModel:
      readEnv(context, 'CHILDLEARN_AI_OBSERVER_MODEL', 'FLOW_OBSERVER_MODEL') ??
      defaultModel,
    parentModel: readEnv(context, 'CHILDLEARN_AI_PARENT_MODEL') ?? defaultModel,
    programmingHintModel:
      readEnv(context, 'CHILDLEARN_AI_HINT_MODEL') ?? defaultModel,
    provider,
    questionModel: readEnv(context, 'CHILDLEARN_AI_QUESTION_MODEL') ?? defaultModel,
  };
}

function modelForAction(config: AiConfig, action: AiAction) {
  if (action === 'observe') {
    return config.observerModel;
  }
  if (action === 'parent-summary') {
    return config.parentModel;
  }
  if (action === 'programming-hint') {
    return config.programmingHintModel;
  }
  return config.questionModel;
}

async function readJsonContent(response: Response) {
  const payload = (await response.json()) as unknown;
  if (!isRecord(payload)) {
    throw new Error('AI response is not a JSON object');
  }

  if ('choices' in payload && Array.isArray(payload.choices)) {
    const firstChoice = payload.choices[0];
    if (!isRecord(firstChoice) || !isRecord(firstChoice.message)) {
      throw new Error('AI response missing message content');
    }
    const content = firstChoice.message.content;
    if (typeof content === 'string') {
      return JSON.parse(content) as unknown;
    }
    if (Array.isArray(content)) {
      const textBlock = content.find(
        (item) => isRecord(item) && item.type === 'text' && typeof item.text === 'string',
      );
      if (textBlock && typeof textBlock.text === 'string') {
        return JSON.parse(textBlock.text) as unknown;
      }
    }
    throw new Error('AI response content is empty');
  }

  if ('content' in payload && Array.isArray(payload.content)) {
    const textBlock = payload.content.find(
      (item) => isRecord(item) && item.type === 'text' && typeof item.text === 'string',
    );
    if (textBlock && typeof textBlock.text === 'string') {
      return JSON.parse(textBlock.text) as unknown;
    }
    throw new Error('Anthropic response content is empty');
  }

  return payload;
}

async function requestStructuredJson(
  context: ServerExecutionContext,
  action: AiAction,
  systemPrompt: string,
  payload: unknown,
): Promise<unknown> {
  const config = resolveAiConfig(context);
  if (!config) {
    throw new Error('AI provider is not configured');
  }

  const model = modelForAction(config, action);
  const requestTimeoutMs = clamp(
    Number(readEnv(context, 'CHILDLEARN_AI_TIMEOUT_MS', 'FLOW_OBSERVER_REQUEST_TIMEOUT_SECONDS')) *
      (readEnv(context, 'FLOW_OBSERVER_REQUEST_TIMEOUT_SECONDS') ? 1000 : 1) || 30_000,
    5_000,
    90_000,
  );
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), requestTimeoutMs);

  try {
    if (config.provider === 'anthropic') {
      const response = await fetch(`${config.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          max_tokens: 900,
          model,
          system: systemPrompt,
          temperature: action === 'observe' ? 0 : 0.3,
          messages: [
            {
              role: 'user',
              content: JSON.stringify(payload),
            },
          ],
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`AI request failed: ${response.status}`);
      }

      return readJsonContent(response);
    }

    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: action === 'observe' ? 0 : 0.35,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: JSON.stringify(payload),
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`AI request failed: ${response.status}`);
    }

    return readJsonContent(response);
  } finally {
    clearTimeout(timeoutId);
  }
}

const OBSERVER_SYSTEM_PROMPT = `You are Xiaoman's learning co-pilot for a Chinese preschool math app.

Rules:
- The local app still has a safety governor. You are allowed to propose the next item, but you are not allowed to skip safety.
- Use only the supplied batch report as evidence.
- Preserve trust: do not over-claim certainty.
- Recommend exactly one main adjustment dimension at a time.
- For young children, language load, UI confusion, or fatigue often explain misses better than skill gaps.

Return one JSON object with:
overallState, confidence, stateReason, primaryIssue, masteredSkills, weakSkills,
riskSignals, doNotInfer, recommendation, uxSuggestions, profileRefinement, nextItemSuggestion.

Allowed overallState:
easy, flow, stretch, hard, fatigue, unstable

Allowed primaryIssue:
skill_gap, cognitive_load, attention_drop, fatigue, ui_confusion, item_design_problem, careless_or_motor_error, uncertain

Allowed recommendation.direction:
increase_slightly, maintain, maintain_with_support, decrease_slightly, reduce_batch_or_pace, review_item_quality

Allowed recommendation.adjustmentDimension:
number_range, operation_type, presentation_type, visual_support, option_distance, batch_size, feedback_strength, none

nextItemSuggestion is optional and must be conservative:
{
  targetSkillKey: string,
  targetTheta: number,
  variant: "matching" | "compare" | "makeTen" | "missing" | "story" | "numberLine",
  reason: string
}

profileRefinement is optional and must stay bounded.`;

const QUESTION_SYSTEM_PROMPT = `You generate one preschool-friendly math question for a 4-6 year old Chinese learner.

Rules:
- Output exactly one JSON object.
- Keep copy short, concrete, warm, and child-safe.
- Make the difficulty just above comfort, not a big jump.
- Respect the requested variant when possible.
- Use only simple Chinese.
- Return exactly 4 numeric answer options and include the correct answer.
- Keep numbers in a range that matches the requested difficulty.
- Use one clear concept only.
- Avoid failure language and avoid red-flag framing.

Return fields:
variant, level, factId, prompt, expression, answer, options, objects, comparePair, numberLine, theme, barModel, scaffoldText, principleText.

Constraints:
- level must be 1..5
- options must be [{label, value}] or [number]
- barModel must be a short number array
- comparePair only for compare
- numberLine only for numberLine
- objects should have a length that matches the visible quantity and stay at or below 20
- theme.colorHint can be a simple token hint like rose, orange, amber, lime, violet, pink`;

const PROGRAMMING_HINT_SYSTEM_PROMPT = `You are a warm co-pilot for a preschool programming puzzle.

Rules:
- Give one short hint in Chinese, max 28 Chinese characters.
- Nudge the next idea, do not dump the full solution.
- If the child is blocked by a wall or obstacle, focus on the next control concept.
- Keep the tone calm, playful, and encouraging.`;

const PARENT_SUMMARY_SYSTEM_PROMPT = `You write a short parent-facing summary for a preschool learning app.

Rules:
- Write in Chinese.
- Max 150 Chinese characters.
- Mention what the child is currently steady on, what to watch next, and one concrete next-step suggestion.
- Be specific and warm, never judgmental.
- Do not mention internal model names or prompt mechanics.

Return JSON:
{ "summary": string }`;

function serializeQuestionOptions(
  rawOptions: unknown,
  fallbackAnswer: number,
  fallbackMax: number,
): QuestionOption[] {
  if (Array.isArray(rawOptions)) {
    const normalized = rawOptions.flatMap((item, index) => {
      if (typeof item === 'number' && Number.isFinite(item)) {
        return [
          {
            id: `option-${index}-${item}`,
            label: String(item),
            value: item,
          },
        ];
      }

      if (
        isRecord(item) &&
        typeof item.label === 'string' &&
        Number.isFinite(Number(item.value))
      ) {
        const value = Number(item.value);
        return [
          {
            id: typeof item.id === 'string' ? item.id : `option-${index}-${value}`,
            label: item.label,
            value,
          },
        ];
      }

      return [];
    });

    const unique = normalized.filter(
      (option, index, options) =>
        options.findIndex((candidate) => candidate.value === option.value) === index,
    );
    if (unique.length === 4 && unique.some((option) => option.value === fallbackAnswer)) {
      return unique;
    }
  }

  return buildOptions(fallbackAnswer, fallbackMax, Math.random);
}

function parseVariant(value: unknown): QuestionVariant | null {
  return value === 'matching' ||
    value === 'compare' ||
    value === 'makeTen' ||
    value === 'missing' ||
    value === 'story' ||
    value === 'numberLine'
    ? value
    : null;
}

function normalizeQuestionPayload(
  payload: unknown,
  body: QuestionRequestBody,
): Question | null {
  if (!isRecord(payload)) {
    return null;
  }

  const variant = parseVariant(payload.variant) ?? body.variant ?? null;
  if (!variant) {
    return null;
  }

  const answer = finiteNumber(payload.answer);
  if (answer === null) {
    return null;
  }

  const difficulty = clamp(Math.round(body.difficulty ?? 1), 1, 10);
  const fallbackBand = getMathProgressionBand(difficulty);
  const level = clamp(
    Math.round(finiteNumber(payload.level) ?? fallbackBand.level),
    1,
    5,
  ) as QuestionLevel;
  const prompt =
    typeof payload.prompt === 'string' ? compactText(payload.prompt).slice(0, 60) : '';
  const expression =
    typeof payload.expression === 'string'
      ? compactText(payload.expression).slice(0, 40)
      : '?';
  const scaffoldText =
    typeof payload.scaffoldText === 'string'
      ? compactText(payload.scaffoldText).slice(0, 50)
      : '先看清楚，再一格一格试一试。';
  const principleText =
    typeof payload.principleText === 'string'
      ? compactText(payload.principleText).slice(0, 60)
      : '我们一步一步来，就能找到答案。';

  if (!prompt || !expression || !scaffoldText || !principleText) {
    return null;
  }

  const themeRecord = isRecord(payload.theme) ? payload.theme : null;
  const theme: QuestionTheme =
    themeRecord &&
    typeof themeRecord.emoji === 'string' &&
    typeof themeRecord.colorHint === 'string'
      ? {
          emoji: themeRecord.emoji.slice(0, 2),
          colorHint: themeRecord.colorHint.slice(0, 16),
        }
      : DEFAULT_THEME_BY_VARIANT[variant];

  const comparePair =
    variant === 'compare' && isRecord(payload.comparePair)
      ? {
          left: clamp(Math.round(finiteNumber(payload.comparePair.left) ?? 0), 1, 20),
          right: clamp(Math.round(finiteNumber(payload.comparePair.right) ?? 0), 1, 20),
        }
      : undefined;

  const numberLine =
    variant === 'numberLine' && isRecord(payload.numberLine)
      ? {
          start: clamp(Math.round(finiteNumber(payload.numberLine.start) ?? 0), 0, 30),
          end: clamp(Math.round(finiteNumber(payload.numberLine.end) ?? 0), 1, 30),
        }
      : undefined;

  const derivedObjectCount =
    variant === 'compare'
      ? Math.max(comparePair?.left ?? 1, comparePair?.right ?? 1)
      : variant === 'numberLine'
        ? Math.max((numberLine?.end ?? answer) - (numberLine?.start ?? 0), 1)
        : Math.max(answer, 1);
  const rawObjects = Array.isArray(payload.objects)
    ? payload.objects.filter((item): item is string => typeof item === 'string').slice(0, 20)
    : [];
  const objectSeed = theme.emoji || DEFAULT_THEME_BY_VARIANT[variant].emoji;
  const objects =
    rawObjects.length > 0
      ? rawObjects
      : Array.from({ length: clamp(derivedObjectCount, 1, 20) }, () => objectSeed);
  const fallbackMax = Math.max(
    fallbackBand.quantityRange.max,
    answer + 4,
    comparePair ? Math.max(comparePair.left, comparePair.right) : 0,
    numberLine ? numberLine.end - numberLine.start + 3 : 0,
  );
  const options = serializeQuestionOptions(payload.options, answer, fallbackMax);
  const rawBarModel = Array.isArray(payload.barModel)
    ? payload.barModel
        .map((item) => finiteNumber(item))
        .filter((item): item is number => item !== null)
        .slice(0, 3)
        .map((item) => clamp(Math.round(item), 0, 20))
    : [];
  const barModel =
    rawBarModel.length > 0
      ? rawBarModel
      : variant === 'compare'
        ? [comparePair?.left ?? answer, comparePair?.right ?? answer]
        : variant === 'numberLine'
          ? [numberLine?.start ?? 0, numberLine ? numberLine.end - numberLine.start : answer]
          : [objects.length];

  return {
    answer,
    barModel,
    comparePair,
    expression,
    factId:
      typeof payload.factId === 'string' && payload.factId.trim()
        ? payload.factId.trim().slice(0, 40)
        : `llm-${variant}-${difficulty}-${Math.abs(answer)}`,
    id: `llm-${variant}-${body.serial ?? 0}-${Math.round(nowMs() / 1000)}`,
    level,
    numberLine,
    objects,
    options,
    principleText,
    prompt,
    scaffoldText,
    source: 'llm',
    theme,
    variant,
  };
}

function buildQuestionPromptBody(body: QuestionRequestBody) {
  const difficulty = clamp(Math.round(body.difficulty ?? 1), 1, 10);
  const band = getMathProgressionBand(difficulty);
  return {
    difficulty,
    lane: body.lane ?? 'current',
    recentErrorPatterns: body.recentErrorPatterns ?? [],
    recentResponses: (body.recentResponses ?? []).slice(-8),
    requestedVariant: body.variant ?? 'matching',
    targetSkillKey: body.targetSkillKey ?? null,
    targetTheta: body.targetTheta ?? null,
    rangeHint: band.quantityRange,
    totalRangeHint: band.totalRange,
    levelHint: band.level,
  };
}

async function handleQuestionAction(
  body: QuestionRequestBody,
  context: ServerExecutionContext,
): Promise<ServerResult> {
  const cached = getCached('question', body);
  if (cached) {
    return { status: 200, body: cached };
  }

  const payload = await requestStructuredJson(
    context,
    'question',
    QUESTION_SYSTEM_PROMPT,
    buildQuestionPromptBody(body),
  );
  const question = normalizeQuestionPayload(payload, body);
  if (!question) {
    return {
      status: 502,
      body: { error: 'invalid_question_payload' },
    };
  }

  const responseBody = { question };
  setCached('question', body, responseBody);
  return {
    status: 200,
    body: responseBody,
  };
}

async function handleProgrammingHintAction(
  body: ProgrammingHintRequestBody,
  context: ServerExecutionContext,
): Promise<ServerResult> {
  const cached = getCached('programming-hint', body);
  if (cached) {
    return { status: 200, body: cached };
  }

  const payload = await requestStructuredJson(
    context,
    'programming-hint',
    PROGRAMMING_HINT_SYSTEM_PROMPT,
    body,
  );

  const hint =
    isRecord(payload) && typeof payload.hint === 'string'
      ? compactText(payload.hint).slice(0, 36)
      : null;
  if (!hint) {
    return { status: 502, body: { error: 'invalid_programming_hint' } };
  }

  const responseBody = { hint };
  setCached('programming-hint', body, responseBody);
  return { status: 200, body: responseBody };
}

async function handleParentSummaryAction(
  body: ParentSummaryRequestBody,
  context: ServerExecutionContext,
): Promise<ServerResult> {
  const cached = getCached('parent-summary', body);
  if (cached) {
    return { status: 200, body: cached };
  }

  const payload = await requestStructuredJson(
    context,
    'parent-summary',
    PARENT_SUMMARY_SYSTEM_PROMPT,
    body,
  );

  const summary =
    isRecord(payload) && typeof payload.summary === 'string'
      ? compactText(payload.summary).slice(0, 180)
      : null;
  if (!summary) {
    return { status: 502, body: { error: 'invalid_parent_summary' } };
  }

  const responseBody = { summary };
  setCached('parent-summary', body, responseBody);
  return { status: 200, body: responseBody };
}

async function handleObserveAction(
  body: unknown,
  context: ServerExecutionContext,
): Promise<ServerResult> {
  const cached = getCached('observe', body);
  if (cached) {
    return { status: 200, body: cached };
  }

  const payload = await requestStructuredJson(
    context,
    'observe',
    OBSERVER_SYSTEM_PROMPT,
    body,
  );

  if (!isRecord(payload)) {
    return { status: 502, body: { error: 'invalid_observation_payload' } };
  }

  const responseBody = { observation: payload };
  setCached('observe', body, responseBody);
  return { status: 200, body: responseBody };
}

export async function executeAiAction(
  action: AiAction | null,
  body: unknown,
  context: ServerExecutionContext = {},
): Promise<ServerResult> {
  if (!action) {
    return {
      status: 400,
      body: { error: 'missing_action' },
    };
  }

  try {
    if (action === 'observe') {
      return await handleObserveAction(body, context);
    }

    if (action === 'question') {
      return await handleQuestionAction((body ?? {}) as QuestionRequestBody, context);
    }

    if (action === 'programming-hint') {
      return await handleProgrammingHintAction(
        (body ?? {}) as ProgrammingHintRequestBody,
        context,
      );
    }

    if (action === 'parent-summary') {
      return await handleParentSummaryAction(
        (body ?? {}) as ParentSummaryRequestBody,
        context,
      );
    }

    return {
      status: 404,
      body: { error: 'unknown_action' },
    };
  } catch (error) {
    if (error instanceof Error && error.message === 'AI provider is not configured') {
      return {
        status: 200,
        body:
          action === 'observe'
            ? { observation: null, reason: 'ai_unconfigured' }
            : action === 'question'
              ? { question: null, reason: 'ai_unconfigured' }
              : action === 'programming-hint'
                ? { hint: null, reason: 'ai_unconfigured' }
                : { summary: null, reason: 'ai_unconfigured' },
      };
    }

    return {
      status: 503,
      body: {
        error: 'ai_unavailable',
        reason: error instanceof Error ? error.message : 'Unknown AI error',
      },
    };
  }
}

function forwardHeaders(
  context: ServerExecutionContext,
  baseHeaders?: HeadersInit,
): Record<string, string> {
  const apiKey = readEnv(context, 'CHILDLEARN_SYNC_API_KEY', 'LEARNING_SYNC_API_KEY');
  const headers: Record<string, string> = {
    ...(baseHeaders ? Object.fromEntries(new Headers(baseHeaders).entries()) : {}),
  };
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }
  return headers;
}

export async function proxyLearningSync(
  method: string,
  requestUrl: string,
  body: unknown,
  context: ServerExecutionContext = {},
): Promise<ServerResult> {
  const upstream =
    readEnv(context, 'CHILDLEARN_SYNC_UPSTREAM_URL', 'LEARNING_SYNC_UPSTREAM_URL') ?? '';

  if (!upstream) {
    if (method === 'GET') {
      return {
        status: 200,
        body: { ok: true, state: null },
      };
    }
    return {
      status: 200,
      body: { ok: true },
    };
  }

  const url = new URL(requestUrl, 'http://localhost');
  const upstreamUrl = new URL(upstream);
  upstreamUrl.search = url.search;

  const headers = forwardHeaders(context, {
    'Content-Type': 'application/json',
  });

  const response = await fetch(upstreamUrl.toString(), {
    body: method === 'GET' ? undefined : JSON.stringify(body ?? {}),
    headers,
    method,
  });

  const text = await response.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text) as unknown;
    } catch {
      parsed = { ok: response.ok, raw: text };
    }
  } else {
    parsed = { ok: response.ok };
  }

  return {
    status: response.status,
    body: parsed,
    headers: {
      'Content-Type': response.headers.get('Content-Type') ?? 'application/json; charset=utf-8',
    },
  };
}

export async function proxyTelemetry(
  body: unknown,
  context: ServerExecutionContext = {},
): Promise<ServerResult> {
  const upstream = readEnv(context, 'CHILDLEARN_TELEMETRY_UPSTREAM_URL') ?? '';
  if (!upstream) {
    return {
      status: 200,
      body: { ok: true, mode: 'noop' },
    };
  }

  try {
    const response = await fetch(upstream, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body ?? {}),
    });

    return {
      status: 200,
      body: {
        forwarded: response.ok,
        ok: response.ok,
        upstreamStatus: response.status,
      },
    };
  } catch (error) {
    return {
      status: 200,
      body: {
        forwarded: false,
        ok: false,
        reason: error instanceof Error ? error.message : 'Unknown telemetry error',
      },
    };
  }
}

export const DEFAULT_AI_ACTIONS = {
  observe: OBSERVE_ACTION,
  parentSummary: PARENT_SUMMARY_ACTION,
  programmingHint: PROGRAMMING_HINT_ACTION,
  question: QUESTION_ACTION,
};
