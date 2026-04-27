import { getMathProgressionBand } from '../src/curriculum/mathProgression';
import { buildOptions } from '../src/curriculum/questionFactory';
import {
  LEARNER_RADAR_SKILLS,
  LEARNER_SKILL_KEYS,
  thetaToDifficulty,
  type LearnerSkillKey,
} from '../src/ai/learnerModel';
import type {
  Question,
  QuestionLevel,
  QuestionOption,
  QuestionReasoning,
  QuestionReasoningStep,
  QuestionTheme,
  QuestionVariant,
} from '../src/curriculum/types';

type JsonRecord = Record<string, unknown>;

export type AiAction =
  | 'observe'
  | 'question'
  | 'cross-ten-hint'
  | 'cross-ten-question'
  | 'cold-start-probe'
  | 'cold-start-assess'
  | 'story-polish'
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
  storyPolishModel: string;
}

interface QuestionRequestBody {
  difficulty?: number;
  lane?: string;
  learner?: {
    ageMonths?: number;
    fatigueLevel?: number;
    flowState?: string;
    sessionMinutes?: number;
    slidingAccuracy?: number;
    stage?: string;
  };
  constraints?: {
    forbiddenPatterns?: string[];
    maxChoices?: number;
    readingLevel?: string;
    reasoningMode?: 'direct' | 'multiStep' | 'narration';
    variant?: QuestionVariant;
  };
  recentFingerprints?: string[];
  recentQuestions?: Array<{
    childAnswer?: string;
    choices?: string[];
    correctAnswer?: string;
    errorPattern?: string | null;
    firstAttemptCorrect?: boolean;
    hintCount?: number;
    reactionTimeMs?: number;
    skillKeys?: string[];
    stem?: string;
    strategyUse?: {
      attemptedStrategy?: string;
      narrationChoice?: string;
      stepsCorrect?: boolean[];
      totalSteps?: number;
    };
    thetaAtTime?: number;
  }>;
  skillRadar?: Array<{
    confidence?: number;
    key?: string;
    lastSeenMinAgo?: number | null;
    mastered?: boolean;
    theta?: number;
  }>;
  serial?: number;
  target?: {
    currentTheta?: number;
    flowOffset?: number;
    lane?: string;
    reasonCode?: string;
    skillKey?: string;
    targetTheta?: number;
  };
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

interface CrossTenHintRequestBody {
  correctChoice?: string;
  expression?: string;
  hintOnWrong?: string;
  prompt?: string;
  reasoningMode?: 'multiStep' | 'narration';
  stepStem?: string;
  targetNarrative?: string;
  wrongChoice?: string;
}

interface ColdStartProbeRequestBody {
  ageMonths?: number;
  attemptHistory?: Array<{
    childAnswer?: string;
    choices?: string[];
    correctAnswer?: string;
    errorPattern?: string | null;
    finalCorrect?: boolean;
    firstAttemptCorrect?: boolean;
    hintCount?: number;
    questionId?: string;
    questionIndex?: number;
    reactionTimeMs?: number;
    result?: string;
    skillKeys?: string[];
    stem?: string;
    thetaAtTime?: number;
    totalTimeMs?: number;
  }>;
  probeIndex?: number;
  remainingProbes?: number;
}

interface ColdStartAssessRequestBody {
  ageMonths?: number;
  attemptHistory?: ColdStartProbeRequestBody['attemptHistory'];
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

interface StoryPolishRequestBody {
  answer?: number;
  currentPrompt?: string;
  expression?: string;
  first?: number;
  second?: number;
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
const CROSS_TEN_HINT_ACTION = '/api/ai?action=cross-ten-hint';
const CROSS_TEN_QUESTION_ACTION = '/api/ai?action=cross-ten-question';
const COLD_START_PROBE_ACTION = '/api/ai?action=cold-start-probe';
const COLD_START_ASSESS_ACTION = '/api/ai?action=cold-start-assess';
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

function round(value: number, digits = 4) {
  return Number(value.toFixed(digits));
}

function compactText(text: string) {
  return text.replace(/\s+/g, ' ').trim();
}

function compactOptionalText(value: unknown, maxLength: number) {
  if (typeof value !== 'string') {
    return null;
  }

  const compacted = compactText(value);
  return compacted ? compacted.slice(0, maxLength) : null;
}

function normalizeBoolean(value: unknown, fallback = false) {
  return typeof value === 'boolean' ? value : fallback;
}

function sanitizeStringArray(value: unknown, limit: number, maxLength: number) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .flatMap((item) => {
      const compacted = compactOptionalText(item, maxLength);
      return compacted ? [compacted] : [];
    })
    .slice(0, limit);
}

function sanitizeLearnerSkillKeys(value: unknown, limit = 6) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is LearnerSkillKey => typeof item === 'string' && LEARNER_SKILL_KEYS.includes(item as LearnerSkillKey))
    .slice(0, limit);
}

function defaultBaselineThetaForAge(ageMonths: number) {
  if (ageMonths >= 66) {
    return 0.9;
  }

  if (ageMonths >= 54) {
    return 0.6;
  }

  return 0.3;
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
    action === 'question' ||
    action === 'cross-ten-hint' ||
    action === 'cross-ten-question' ||
    action === 'story-polish' ||
    action === 'cold-start-probe' ||
    action === 'cold-start-assess'
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
    storyPolishModel:
      readEnv(context, 'CHILDLEARN_AI_STORY_POLISH_MODEL') ??
      readEnv(context, 'CHILDLEARN_AI_QUESTION_MODEL') ??
      defaultModel,
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
  if (action === 'story-polish') {
    return config.storyPolishModel;
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
          temperature: action === 'observe' || action === 'cold-start-assess' ? 0 : 0.3,
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
        temperature: action === 'observe' || action === 'cold-start-assess' ? 0 : 0.35,
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
- When the batch strongly indicates the app is below or above the child's real baseline, you may set profileRefinement.globalDeltaTheta within [-0.5, 0.5].
- Use globalDeltaTheta sparingly and only when the whole batch trend is clear.

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

const QUESTION_SYSTEM_PROMPT = `You generate one preschool-friendly math question for a specific 4-6 year old Chinese learner.

You receive:
- learner snapshot
- skill radar
- target difficulty window
- recent questions with the child's actual answers and reaction times
- recent fingerprints to avoid repeats

Rules:
- Output exactly one JSON object.
- Use simple Chinese only. Keep the copy short, warm, and child-safe.
- Stay near target.targetTheta. Aim for estimatedTheta within +/-0.15 of target.targetTheta when possible.
- Respect the requested variant when possible.
- Use one clear concept only.
- Return exactly 4 numeric answer options and include the correct answer.
- Keep numbers inside the supplied difficulty hints.
- Avoid repeating stems or the same obvious structure from recent fingerprints.
- When recent mistakes exist, make at least one distractor reflect that mistake pattern instead of using only random numbers.
- Avoid failure language and red-flag framing.

Return JSON:
{
  "reasoning": {
    "observedErrorPattern": string,
    "pickedSkillKey": string,
    "targetWindow": string,
    "distractorPlan": string
  },
  "confidence": number,
  "question": {
    "variant": "matching" | "compare" | "makeTen" | "missing" | "story" | "numberLine",
    "level": 1 | 2 | 3 | 4 | 5,
    "factId": string,
    "prompt": string,
    "expression": string,
    "answer": number,
    "options": [{ "label": string, "value": number }] | [number],
    "objects": string[],
    "comparePair": { "left": number, "right": number },
    "numberLine": { "start": number, "end": number },
    "theme": { "emoji": string, "colorHint": string },
    "barModel": number[],
    "scaffoldText": string,
    "principleText": string,
    "estimatedTheta": number
  }
}

Constraints:
- objects should match the visible quantity and stay at or below 20
- comparePair only for compare
- numberLine only for numberLine
- theme.colorHint can be a simple token hint like rose, orange, amber, lime, violet, pink`;

const CROSS_TEN_SYSTEM_PROMPT = `You generate one preschool-friendly Chinese make-ten bridge question for a specific 4-6 year old learner.

Goal:
- Teach the thinking path for crossing 10, not just the final answer.
- Prefer questions like 6+7, 8+5, 9+4.
- Read constraints.reasoningMode:
  - "multiStep" => generate a three-step "split -> make 10 -> combine" flow.
  - "narration" => generate a "你是怎么算的" strategy question about a solved cross-ten fact.
  - otherwise => default to "multiStep".

Rules:
- Output exactly one JSON object.
- Use simple Chinese only. Keep every sentence short, warm, and child-safe.
- The whole question should target crossTenBridge and stay near target.targetTheta.
- Return exactly 4 answer options.
- Order the expression so the first addend is the one being brought to 10 and the second addend is the one being split.
- If reasoningMode is "multiStep":
  - The top-level question answer must be the final total.
  - reasoning.kind must be "multiStep".
  - reasoning.strategy must be "makeTen".
  - reasoning.steps must contain exactly 3 steps:
    1. decomposition: choose how to split one addend so the other reaches 10
    2. make ten: compute the bridge to 10
    3. combine: compute 10 + the leftover
  - Step 1 choices should use short labels like "4 和 3" and numeric values equal to the part used to make 10.
  - Include one friendly hintOnWrong for each step.
- If reasoningMode is "narration":
  - reasoning.kind must be "narration".
  - reasoning.strategy should reflect the target good strategy, usually "makeTen".
  - The prompt should ask how the child thought about the solved fact.
  - options should be short strategy descriptions such as "把5拆成2和3", "从8接着数", "从1开始数", "一下就知道".
  - answer should be the value of one accepted correct option.
  - reasoning.acceptedOptionValues may include more than one acceptable strategy value.
  - Include reasoning.narrative with the target explanation sentence.
- Keep stem structures fresh and avoid recent fingerprints when possible.

Return JSON:
{
  "confidence": number,
  "question": {
    "variant": "makeTen",
    "level": 1 | 2 | 3 | 4 | 5,
    "factId": string,
    "prompt": string,
    "expression": string,
    "answer": number,
    "options": [{ "label": string, "value": number }] | [number],
    "objects": string[],
    "theme": { "emoji": string, "colorHint": string },
    "barModel": number[],
    "scaffoldText": string,
    "principleText": string,
    "estimatedTheta": number,
    "reasoning": {
      "kind": "multiStep" | "narration",
      "strategy": "makeTen" | "countOn" | "countAll" | "direct",
      "narrative": string,
      "acceptedOptionValues": [number],
      "steps": [
        {
          "stepId": "split",
          "stem": string,
          "choices": [{ "label": string, "value": number }],
          "correctIndex": number,
          "stepSkillKey": "decomposition",
          "hintOnWrong": string
        },
        {
          "stepId": "make-ten",
          "stem": string,
          "choices": [{ "label": string, "value": number }],
          "correctIndex": number,
          "stepSkillKey": "makeTen",
          "hintOnWrong": string
        },
        {
          "stepId": "combine",
          "stem": string,
          "choices": [{ "label": string, "value": number }],
          "correctIndex": number,
          "stepSkillKey": "crossTenBridge",
          "hintOnWrong": string
        }
      ]
    }
  },
  "reasoning": {
    "pickedNumbers": string,
    "bridgePlan": string,
    "stepFocus": string
  }
}

Constraints:
- barModel should contain the two original addends
- objects should stay at or below 20
- For multiStep, final answer options should include one off-by-one distractor
- For multiStep, step 1 should expose the needed bridge part clearly
- For narration, at least one wrong option should reflect countAll or countOn when makeTen is the target`;

const CROSS_TEN_HINT_SYSTEM_PROMPT = `You explain one cross-ten thinking mistake to a 4-6 year old Chinese learner.

You receive:
- expression and prompt
- reasoningMode
- current step stem if available
- the child's wrong choice
- the correct choice if available
- a target narrative for the good strategy
- a fallback hint

Rules:
- Return exactly one JSON object: { "hint": string }.
- Use simple Chinese only.
- Max 30 Chinese characters.
- Be warm and concrete, never scolding.
- Name the key gap directly, such as "还差几到10" or "是从8接着数".
- Prefer the supplied targetNarrative or correctChoice when they help.
- If the payload is thin, slightly polish hintOnWrong instead of inventing new facts.`;

const COLD_START_PROBE_SYSTEM_PROMPT = `You are assessing a 4-6 year old Chinese learner's math starting point in exactly 5 probe questions.

You receive:
- ageMonths
- probeIndex and remainingProbes
- the full previous probe attempt history with stem, choices, child's answer, correctness, error pattern, and reaction time

Strategy:
- Probe 1 should start around a medium age-appropriate level, not baby-easy.
- By probe 2, jump up or down enough to bracket the child.
- By probes 3-4, narrow the estimate.
- By probe 5, confirm the converged band or test an adjacent key skill.
- Favor addWithin10, compareWithin10, makeTen, missingAddend, and numberLineDistance.

Rules:
- Output exactly one JSON object.
- Use simple Chinese only.
- Keep the question short, concrete, warm, and child-safe.
- Return exactly 4 numeric answer options.
- Avoid repeating the same stem pattern from prior probe history.
- Include an estimatedTheta that reflects the intended challenge.

Return JSON:
{
  "confidence": number,
  "question": {
    "variant": "matching" | "compare" | "makeTen" | "missing" | "story" | "numberLine",
    "level": 1 | 2 | 3 | 4 | 5,
    "factId": string,
    "prompt": string,
    "expression": string,
    "answer": number,
    "options": [{ "label": string, "value": number }] | [number],
    "objects": string[],
    "comparePair": { "left": number, "right": number },
    "numberLine": { "start": number, "end": number },
    "theme": { "emoji": string, "colorHint": string },
    "barModel": number[],
    "scaffoldText": string,
    "principleText": string,
    "estimatedTheta": number
  },
  "reasoning": {
    "probeGoal": string,
    "observedSignal": string,
    "nextBand": string
  }
}`;

const COLD_START_ASSESS_SYSTEM_PROMPT = `You review a 5-question cold-start probe for a 4-6 year old Chinese learner and estimate the baseline ability profile.

Rules:
- Output exactly one JSON object.
- Use only the supplied attempt history as evidence.
- Return baselineTheta for every listed skill key.
- Keep all theta values conservative and bounded to [-1.5, 2.5].
- If evidence is thin for a skill, interpolate from nearby skills and age rather than leaving it blank.
- recommendedDifficulty should match the overall baseline and stay within 1..10.
- nextSkill should be the single best target to stabilize after cold start.

Required skill keys:
${LEARNER_SKILL_KEYS.join(', ')}

Return JSON:
{
  "schemaVersion": "childlearn.cold-start-baseline.v1",
  "confidence": number,
  "baselineTheta": { "<skillKey>": number },
  "recommendedDifficulty": number,
  "nextSkill": string,
  "notes": string[]
}`;

const STORY_POLISH_SYSTEM_PROMPT = `You rewrite one preschool-friendly Chinese math story prompt for ages 4-6.

Rules:
- Return exactly one JSON object: { "prompt": string }.
- Keep exactly the two given operand numbers, in the same order.
- Do not mention or reveal the answer.
- Do not use equations, option text, or extra numbers.
- Use one warm, concrete, child-safe sentence.
- Keep it short, natural, and easy to read aloud.
- Avoid danger, fear, violence, medicine, politics, religion, and other sensitive topics.`;

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

const STORY_POLISH_BLOCKLIST = [
  '打针',
  '怪兽',
  '巫婆',
  '鬼',
  '血',
  '打架',
  '炸弹',
  '枪',
  '死亡',
  '宗教',
  '选举',
];

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

function parseReasoningKind(value: unknown): QuestionReasoning['kind'] | null {
  return value === 'single' || value === 'multiStep' || value === 'narration'
    ? value
    : null;
}

function parseReasoningStrategy(value: unknown): QuestionReasoning['strategy'] | null {
  return value === 'makeTen' ||
    value === 'doubles' ||
    value === 'countOn' ||
    value === 'countAll' ||
    value === 'direct'
    ? value
    : null;
}

function normalizeAcceptedOptionValues(value: unknown): number[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const accepted = value
    .map((item) => Math.round(Number(item)))
    .filter((item) => Number.isFinite(item));

  return accepted.length > 0 ? [...new Set(accepted)].slice(0, 4) : undefined;
}

function normalizeStepChoices(rawChoices: unknown): QuestionOption[] | null {
  if (!Array.isArray(rawChoices)) {
    return null;
  }

  const normalized = rawChoices.flatMap((item, index) => {
    if (typeof item === 'number' && Number.isFinite(item)) {
      return [
        {
          id: `step-option-${index}-${item}`,
          label: String(item),
          value: Math.round(item),
        },
      ];
    }

    if (
      isRecord(item) &&
      typeof item.label === 'string' &&
      Number.isFinite(Number(item.value))
    ) {
      const value = Math.round(Number(item.value));
      const label = compactText(item.label).slice(0, 20);
      if (!label) {
        return [];
      }

      return [
        {
          id: typeof item.id === 'string' ? item.id.slice(0, 40) : `step-option-${index}-${value}`,
          label,
          value,
        },
      ];
    }

    return [];
  });

  const unique = normalized.filter(
    (option, index, options) =>
      options.findIndex(
        (candidate) => candidate.label === option.label && candidate.value === option.value,
      ) === index,
  );
  return unique.length >= 2 ? unique.slice(0, 4) : null;
}

function normalizeQuestionReasoning(payload: unknown): QuestionReasoning | undefined {
  if (!isRecord(payload)) {
    return undefined;
  }

  const kind = parseReasoningKind(payload.kind);
  const strategy = parseReasoningStrategy(payload.strategy);
  if (!kind || !strategy) {
    return undefined;
  }

  const narrative =
    typeof payload.narrative === 'string' ? compactText(payload.narrative).slice(0, 80) : undefined;

  if (kind !== 'multiStep') {
    return {
      kind,
      strategy,
      narrative,
      acceptedOptionValues: normalizeAcceptedOptionValues(payload.acceptedOptionValues),
    };
  }

  const steps = Array.isArray(payload.steps)
    ? payload.steps.slice(0, 4).flatMap((step, index): QuestionReasoningStep[] => {
        if (!isRecord(step)) {
          return [];
        }

        const stem = typeof step.stem === 'string' ? compactText(step.stem).slice(0, 60) : '';
        const choices = normalizeStepChoices(step.choices);
        const correctIndex = Math.round(finiteNumber(step.correctIndex) ?? -1);
        const stepSkillKey = compactOptionalText(step.stepSkillKey, 32);

        if (!stem || !choices || !stepSkillKey || correctIndex < 0 || correctIndex >= choices.length) {
          return [];
        }

        return [
          {
            stepId:
              compactOptionalText(step.stepId, 24) ??
              `step-${index + 1}`,
            stem,
            choices,
            correctIndex,
            stepSkillKey,
            hintOnWrong: compactOptionalText(step.hintOnWrong, 60) ?? undefined,
          },
        ];
      })
    : [];

  if (steps.length === 0) {
    return undefined;
  }

  return {
    kind: 'multiStep',
    strategy,
    narrative,
    steps,
  };
}

function extractIntegerTokens(text: string) {
  return (text.match(/\d+/g) ?? []).map((value) => Number(value));
}

function hasBlockedStoryWord(text: string) {
  return STORY_POLISH_BLOCKLIST.some((word) => text.includes(word));
}

function validateStoryPolishPrompt(
  payload: unknown,
  body: StoryPolishRequestBody,
): string | null {
  const first = finiteNumber(body.first);
  const second = finiteNumber(body.second);
  const answer = finiteNumber(body.answer);
  if (first === null || second === null || answer === null) {
    return null;
  }

  if (Math.round(first + second) !== Math.round(answer)) {
    return null;
  }

  if (!isRecord(payload) || typeof payload.prompt !== 'string') {
    return null;
  }

  const prompt = compactText(payload.prompt).slice(0, 40);
  if (!prompt || prompt.length > 34) {
    return null;
  }

  if (/[=+-]/.test(prompt) || hasBlockedStoryWord(prompt)) {
    return null;
  }

  const numbers = extractIntegerTokens(prompt);
  if (
    numbers.length !== 2 ||
    numbers[0] !== Math.round(first) ||
    numbers[1] !== Math.round(second)
  ) {
    return null;
  }

  return prompt;
}

function extractQuestionCandidate(payload: unknown) {
  if (!isRecord(payload)) {
    return {
      confidence: null,
      estimatedTheta: null,
      questionPayload: payload,
    };
  }

  const questionPayload = isRecord(payload.question) ? payload.question : payload;
  const confidence = finiteNumber(payload.confidence);
  const estimatedTheta =
    finiteNumber(questionPayload.estimatedTheta) ?? finiteNumber(payload.estimatedTheta);

  return {
    confidence,
    estimatedTheta,
    questionPayload,
  };
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
  const reasoning = normalizeQuestionReasoning(payload.reasoning);

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
    reasoning,
    scaffoldText,
    source: 'llm',
    theme,
    variant,
  };
}

function buildQuestionPromptBody(body: QuestionRequestBody) {
  const difficulty = clamp(Math.round(body.difficulty ?? 1), 1, 10);
  const band = getMathProgressionBand(difficulty);
  const targetRecord = isRecord(body.target) ? body.target : null;
  const learnerRecord = isRecord(body.learner) ? body.learner : null;
  const constraintsRecord = isRecord(body.constraints) ? body.constraints : null;
  return {
    difficulty,
    lane:
      compactOptionalText(targetRecord?.lane, 24) ??
      compactOptionalText(body.lane, 24) ??
      'current',
    learner: {
      ageMonths: clamp(Math.round(finiteNumber(learnerRecord?.ageMonths) ?? 60), 48, 84),
      fatigueLevel: clamp(Math.round(finiteNumber(learnerRecord?.fatigueLevel) ?? 0), 0, 2),
      flowState: compactOptionalText(learnerRecord?.flowState, 24) ?? 'flow',
      sessionMinutes: Math.max(0, finiteNumber(learnerRecord?.sessionMinutes) ?? 0),
      slidingAccuracy: clamp(finiteNumber(learnerRecord?.slidingAccuracy) ?? 0, 0, 1),
      stage: compactOptionalText(learnerRecord?.stage, 16) ?? 'k',
    },
    skillRadar: Array.isArray(body.skillRadar)
      ? body.skillRadar.slice(0, 18).flatMap((skill) => {
          if (!isRecord(skill)) {
            return [];
          }

          return [
            {
              confidence: clamp(finiteNumber(skill.confidence) ?? 0, 0, 1),
              key: compactOptionalText(skill.key, 48) ?? 'unknown',
              lastSeenMinAgo:
                skill.lastSeenMinAgo === null
                  ? null
                  : Math.max(0, Math.round(finiteNumber(skill.lastSeenMinAgo) ?? 0)),
              mastered: normalizeBoolean(skill.mastered),
              theta: clamp(finiteNumber(skill.theta) ?? 0, -2, 2),
            },
          ];
        })
      : [],
    target: {
      currentTheta: clamp(
        finiteNumber(targetRecord?.currentTheta) ?? 0,
        -2,
        2,
      ),
      flowOffset: clamp(finiteNumber(targetRecord?.flowOffset) ?? 0, -1, 1.5),
      lane:
        compactOptionalText(targetRecord?.lane, 24) ??
        compactOptionalText(body.lane, 24) ??
        'current',
      reasonCode: compactOptionalText(targetRecord?.reasonCode, 48) ?? 'adaptive_target',
      skillKey:
        compactOptionalText(targetRecord?.skillKey, 48) ??
        compactOptionalText(body.targetSkillKey, 48) ??
        null,
      targetTheta: clamp(
        finiteNumber(targetRecord?.targetTheta ?? body.targetTheta) ?? 0,
        -2,
        2.5,
      ),
    },
    recentQuestions: Array.isArray(body.recentQuestions)
      ? body.recentQuestions.slice(-8).flatMap((question) => {
          if (!isRecord(question)) {
            return [];
          }

          return [
            {
              childAnswer: compactOptionalText(question.childAnswer, 24) ?? '',
              choices: sanitizeStringArray(question.choices, 4, 24),
              correctAnswer: compactOptionalText(question.correctAnswer, 24) ?? '',
              errorPattern: compactOptionalText(question.errorPattern, 24),
              firstAttemptCorrect: normalizeBoolean(question.firstAttemptCorrect),
              hintCount: Math.max(0, Math.round(finiteNumber(question.hintCount) ?? 0)),
              reactionTimeMs: Math.max(
                0,
                Math.round(finiteNumber(question.reactionTimeMs) ?? 0),
              ),
              skillKeys: sanitizeStringArray(question.skillKeys, 6, 48),
              stem: compactOptionalText(question.stem, 80) ?? '',
              strategyUse: isRecord(question.strategyUse)
                ? {
                    attemptedStrategy:
                      compactOptionalText(question.strategyUse.attemptedStrategy, 24) ?? '',
                    narrationChoice:
                      compactOptionalText(question.strategyUse.narrationChoice, 40) ?? '',
                    stepsCorrect: Array.isArray(question.strategyUse.stepsCorrect)
                      ? question.strategyUse.stepsCorrect
                          .slice(0, 4)
                          .map((value) => Boolean(value))
                      : [],
                    totalSteps: Math.max(
                      0,
                      Math.round(finiteNumber(question.strategyUse.totalSteps) ?? 0),
                    ),
                  }
                : undefined,
              thetaAtTime: clamp(finiteNumber(question.thetaAtTime) ?? 0, -2, 2.5),
            },
          ];
        })
      : [],
    recentFingerprints: sanitizeStringArray(body.recentFingerprints, 30, 16),
    recentErrorPatterns: (body.recentErrorPatterns ?? []).slice(-4),
    recentResponses: (body.recentResponses ?? []).slice(-8),
    requestedVariant:
      parseVariant(constraintsRecord?.variant) ??
      body.variant ??
      'matching',
    constraints: {
      forbiddenPatterns: sanitizeStringArray(
        constraintsRecord?.forbiddenPatterns,
        8,
        32,
      ),
      maxChoices: clamp(
        Math.round(finiteNumber(constraintsRecord?.maxChoices) ?? 4),
        2,
        4,
      ),
      reasoningMode:
        constraintsRecord?.reasoningMode === 'multiStep' ||
        constraintsRecord?.reasoningMode === 'narration'
          ? constraintsRecord.reasoningMode
          : 'direct',
      readingLevel: compactOptionalText(constraintsRecord?.readingLevel, 24) ?? 'pre-literate',
    },
    targetSkillKey:
      compactOptionalText(targetRecord?.skillKey, 48) ??
      compactOptionalText(body.targetSkillKey, 48) ??
      null,
    targetTheta:
      finiteNumber(targetRecord?.targetTheta ?? body.targetTheta) ?? null,
    rangeHint: band.quantityRange,
    totalRangeHint: band.totalRange,
    levelHint: band.level,
  };
}

function buildCrossTenHintPromptBody(body: CrossTenHintRequestBody) {
  return {
    expression: compactOptionalText(body.expression, 40) ?? '',
    prompt: compactOptionalText(body.prompt, 60) ?? '',
    reasoningMode:
      body.reasoningMode === 'narration' ? 'narration' : 'multiStep',
    stepStem: compactOptionalText(body.stepStem, 60) ?? '',
    wrongChoice: compactOptionalText(body.wrongChoice, 40) ?? '',
    correctChoice: compactOptionalText(body.correctChoice, 40) ?? '',
    targetNarrative: compactOptionalText(body.targetNarrative, 80) ?? '',
    hintOnWrong: compactOptionalText(body.hintOnWrong, 60) ?? '',
  };
}

function sanitizeColdStartAttemptHistory(
  value: ColdStartProbeRequestBody['attemptHistory'],
  limit: number,
) {
  return Array.isArray(value)
    ? value.slice(-limit).flatMap((attempt) => {
        if (!isRecord(attempt)) {
          return [];
        }

        return [
          {
            childAnswer: compactOptionalText(attempt.childAnswer, 24) ?? '',
            choices: sanitizeStringArray(attempt.choices, 4, 24),
            correctAnswer: compactOptionalText(attempt.correctAnswer, 24) ?? '',
            errorPattern: compactOptionalText(attempt.errorPattern, 24),
            finalCorrect: normalizeBoolean(attempt.finalCorrect),
            firstAttemptCorrect: normalizeBoolean(attempt.firstAttemptCorrect),
            hintCount: Math.max(0, Math.round(finiteNumber(attempt.hintCount) ?? 0)),
            questionIndex: Math.max(0, Math.round(finiteNumber(attempt.questionIndex) ?? 0)),
            reactionTimeMs: Math.max(
              0,
              Math.round(finiteNumber(attempt.reactionTimeMs) ?? 0),
            ),
            result: compactOptionalText(attempt.result, 32) ?? 'correct',
            skillKeys: sanitizeLearnerSkillKeys(attempt.skillKeys),
            stem: compactOptionalText(attempt.stem, 80) ?? '',
            thetaAtTime: clamp(finiteNumber(attempt.thetaAtTime) ?? 0, -2, 2.5),
            totalTimeMs: Math.max(0, Math.round(finiteNumber(attempt.totalTimeMs) ?? 0)),
          },
        ];
      })
    : [];
}

function buildColdStartProbePromptBody(body: ColdStartProbeRequestBody) {
  const ageMonths = clamp(Math.round(finiteNumber(body.ageMonths) ?? 60), 48, 84);
  return {
    ageMonths,
    probeIndex: Math.max(1, Math.round(finiteNumber(body.probeIndex) ?? 1)),
    remainingProbes: Math.max(1, Math.round(finiteNumber(body.remainingProbes) ?? 5)),
    ageSeedTheta: defaultBaselineThetaForAge(ageMonths),
    attemptHistory: sanitizeColdStartAttemptHistory(body.attemptHistory, 4),
  };
}

function normalizeColdStartAssessmentPayload(
  payload: unknown,
  body: ColdStartAssessRequestBody,
) {
  if (!isRecord(payload)) {
    return null;
  }

  const ageMonths = clamp(Math.round(finiteNumber(body.ageMonths) ?? 60), 48, 84);
  const seedTheta = defaultBaselineThetaForAge(ageMonths);
  const rawBaseline = isRecord(payload.baselineTheta) ? payload.baselineTheta : {};
  const providedValues = LEARNER_SKILL_KEYS.flatMap((skillKey) => {
    const value = finiteNumber(rawBaseline[skillKey]);
    return value === null ? [] : [clamp(value, -1.5, 2.5)];
  });
  const meanTheta =
    providedValues.length > 0
      ? providedValues.reduce((sum, value) => sum + value, 0) / providedValues.length
      : seedTheta;
  const baselineTheta = Object.fromEntries(
    LEARNER_SKILL_KEYS.map((skillKey) => {
      const value = finiteNumber(rawBaseline[skillKey]);
      return [skillKey, round(clamp(value === null ? meanTheta : value, -1.5, 2.5))];
    }),
  ) as Record<LearnerSkillKey, number>;
  const radarMean =
    LEARNER_RADAR_SKILLS.reduce((sum, skillKey) => sum + baselineTheta[skillKey], 0) /
    LEARNER_RADAR_SKILLS.length;
  const nextSkill =
    typeof payload.nextSkill === 'string' && LEARNER_SKILL_KEYS.includes(payload.nextSkill as LearnerSkillKey)
      ? (payload.nextSkill as LearnerSkillKey)
      : undefined;

  return {
    schemaVersion: 'childlearn.cold-start-baseline.v1' as const,
    confidence: clamp(finiteNumber(payload.confidence) ?? 0.3, 0, 1),
    baselineTheta,
    recommendedDifficulty: clamp(
      Math.round(finiteNumber(payload.recommendedDifficulty) ?? thetaToDifficulty(radarMean)),
      1,
      10,
    ),
    nextSkill,
    notes: sanitizeStringArray(payload.notes, 6, 80),
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
  const candidate = extractQuestionCandidate(payload);
  const question = normalizeQuestionPayload(candidate.questionPayload, body);
  if (!question) {
    return {
      status: 502,
      body: { error: 'invalid_question_payload' },
    };
  }

  const responseBody = {
    confidence:
      candidate.confidence !== null ? clamp(candidate.confidence, 0, 1) : 0,
    estimatedTheta:
      candidate.estimatedTheta !== null ? clamp(candidate.estimatedTheta, -2, 2.5) : null,
    question,
  };
  setCached('question', body, responseBody);
  return {
    status: 200,
    body: responseBody,
  };
}

async function handleCrossTenHintAction(
  body: CrossTenHintRequestBody,
  context: ServerExecutionContext,
): Promise<ServerResult> {
  const cached = getCached('cross-ten-hint', body);
  if (cached) {
    return { status: 200, body: cached };
  }

  const payload = await requestStructuredJson(
    context,
    'cross-ten-hint',
    CROSS_TEN_HINT_SYSTEM_PROMPT,
    buildCrossTenHintPromptBody(body),
  );
  const hint =
    isRecord(payload) && typeof payload.hint === 'string'
      ? compactText(payload.hint).slice(0, 36)
      : null;
  if (!hint) {
    return {
      status: 502,
      body: { error: 'invalid_cross_ten_hint_payload' },
    };
  }

  const responseBody = { hint };
  setCached('cross-ten-hint', body, responseBody);
  return {
    status: 200,
    body: responseBody,
  };
}

async function handleCrossTenQuestionAction(
  body: QuestionRequestBody,
  context: ServerExecutionContext,
): Promise<ServerResult> {
  const cached = getCached('cross-ten-question', body);
  if (cached) {
    return { status: 200, body: cached };
  }

  const payload = await requestStructuredJson(
    context,
    'cross-ten-question',
    CROSS_TEN_SYSTEM_PROMPT,
    buildQuestionPromptBody(body),
  );
  const candidate = extractQuestionCandidate(payload);
  const question = normalizeQuestionPayload(candidate.questionPayload, body);
  const expectedMode = body.constraints?.reasoningMode ?? 'multiStep';
  if (
    !question?.reasoning ||
    (expectedMode === 'narration'
      ? question.reasoning.kind !== 'narration'
      : question.reasoning.kind !== 'multiStep')
  ) {
    return {
      status: 502,
      body: { error: 'invalid_cross_ten_payload' },
    };
  }

  const responseBody = {
    confidence:
      candidate.confidence !== null ? clamp(candidate.confidence, 0, 1) : 0,
    estimatedTheta:
      candidate.estimatedTheta !== null ? clamp(candidate.estimatedTheta, -2, 2.5) : null,
    question,
  };
  setCached('cross-ten-question', body, responseBody);
  return {
    status: 200,
    body: responseBody,
  };
}

async function handleColdStartProbeAction(
  body: ColdStartProbeRequestBody,
  context: ServerExecutionContext,
): Promise<ServerResult> {
  const cached = getCached('cold-start-probe', body);
  if (cached) {
    return { status: 200, body: cached };
  }

  const payload = await requestStructuredJson(
    context,
    'cold-start-probe',
    COLD_START_PROBE_SYSTEM_PROMPT,
    buildColdStartProbePromptBody(body),
  );
  const candidate = extractQuestionCandidate(payload);
  const fallbackDifficulty = thetaToDifficulty(
    defaultBaselineThetaForAge(clamp(Math.round(finiteNumber(body.ageMonths) ?? 60), 48, 84)),
  );
  const question = normalizeQuestionPayload(candidate.questionPayload, {
    difficulty: fallbackDifficulty,
    serial: Math.round(finiteNumber(body.probeIndex) ?? 1),
    variant: parseVariant(
      isRecord(candidate.questionPayload) ? candidate.questionPayload.variant : undefined,
    ) ?? undefined,
  });
  if (!question) {
    return {
      status: 502,
      body: { error: 'invalid_cold_start_probe_payload' },
    };
  }

  const responseBody = {
    confidence:
      candidate.confidence !== null ? clamp(candidate.confidence, 0, 1) : 0,
    estimatedTheta:
      candidate.estimatedTheta !== null ? clamp(candidate.estimatedTheta, -2, 2.5) : null,
    question,
  };
  setCached('cold-start-probe', body, responseBody);
  return {
    status: 200,
    body: responseBody,
  };
}

async function handleColdStartAssessAction(
  body: ColdStartAssessRequestBody,
  context: ServerExecutionContext,
): Promise<ServerResult> {
  const cached = getCached('cold-start-assess', body);
  if (cached) {
    return { status: 200, body: cached };
  }

  const payload = await requestStructuredJson(
    context,
    'cold-start-assess',
    COLD_START_ASSESS_SYSTEM_PROMPT,
    {
      ageMonths: clamp(Math.round(finiteNumber(body.ageMonths) ?? 60), 48, 84),
      attemptHistory: sanitizeColdStartAttemptHistory(body.attemptHistory, 5),
    },
  );
  const assessment = normalizeColdStartAssessmentPayload(payload, body);
  if (!assessment) {
    return {
      status: 502,
      body: { error: 'invalid_cold_start_assessment_payload' },
    };
  }

  setCached('cold-start-assess', body, assessment);
  return {
    status: 200,
    body: assessment,
  };
}

async function handleStoryPolishAction(
  body: StoryPolishRequestBody,
  context: ServerExecutionContext,
): Promise<ServerResult> {
  const cached = getCached('story-polish', body);
  if (cached) {
    return { status: 200, body: cached };
  }

  const payload = await requestStructuredJson(
    context,
    'story-polish',
    STORY_POLISH_SYSTEM_PROMPT,
    body,
  );
  const prompt = validateStoryPolishPrompt(payload, body);
  if (!prompt) {
    return {
      status: 502,
      body: { error: 'invalid_story_polish_payload' },
    };
  }

  const responseBody = { prompt };
  setCached('story-polish', body, responseBody);
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

    if (action === 'cross-ten-hint') {
      return await handleCrossTenHintAction((body ?? {}) as CrossTenHintRequestBody, context);
    }

    if (action === 'cross-ten-question') {
      return await handleCrossTenQuestionAction((body ?? {}) as QuestionRequestBody, context);
    }

    if (action === 'cold-start-probe') {
      return await handleColdStartProbeAction(
        (body ?? {}) as ColdStartProbeRequestBody,
        context,
      );
    }

    if (action === 'cold-start-assess') {
      return await handleColdStartAssessAction(
        (body ?? {}) as ColdStartAssessRequestBody,
        context,
      );
    }

    if (action === 'story-polish') {
      return await handleStoryPolishAction(
        (body ?? {}) as StoryPolishRequestBody,
        context,
      );
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
              : action === 'cross-ten-hint'
                ? { hint: null, reason: 'ai_unconfigured' }
              : action === 'cross-ten-question'
                ? { question: null, confidence: 0, estimatedTheta: null, reason: 'ai_unconfigured' }
              : action === 'cold-start-probe'
                ? { question: null, confidence: 0, estimatedTheta: null, reason: 'ai_unconfigured' }
                : action === 'cold-start-assess'
                  ? { assessment: null, reason: 'ai_unconfigured' }
              : action === 'story-polish'
                ? { prompt: null, reason: 'ai_unconfigured' }
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
  const headers: Record<string, string> = {};
  if (baseHeaders) {
    new Headers(baseHeaders).forEach((value, key) => {
      headers[key] = value;
    });
  }
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
  const parsed: unknown = text
    ? (() => {
        try {
          return JSON.parse(text) as unknown;
        } catch {
          return { ok: response.ok, raw: text };
        }
      })()
    : { ok: response.ok };

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
  coldStartAssess: COLD_START_ASSESS_ACTION,
  coldStartProbe: COLD_START_PROBE_ACTION,
  crossTenHint: CROSS_TEN_HINT_ACTION,
  crossTenQuestion: CROSS_TEN_QUESTION_ACTION,
  observe: OBSERVE_ACTION,
  parentSummary: PARENT_SUMMARY_ACTION,
  programmingHint: PROGRAMMING_HINT_ACTION,
  question: QUESTION_ACTION,
  storyPolish: '/api/ai?action=story-polish',
};
