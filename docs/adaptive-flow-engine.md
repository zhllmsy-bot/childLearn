# Adaptive Flow Engine Spec

## Goal

Adaptive Flow Engine keeps a child inside a sustainable challenge zone after each
practice batch. It does not try to precisely grade the child from one run. It
tries to avoid two product failures:

- The child receives several questions that are clearly too hard.
- The child stays too long on questions that are clearly too easy.

The system should be conservative, explainable, and recoverable.

## Core Principle

The large language model is a learning observer, not the final decision maker.

```text
Child completes a batch
-> app records answer behavior
-> Batch Analyzer creates a structured learning report
-> Rule Classifier makes a local safety-first state estimate
-> LLM Observer explains likely causes and recommends adjustment direction
-> Safety Governor filters the recommendation
-> Question Selector creates the next batch from policy constraints
```

Responsibilities:

- `LLM Observer`: explains why the child may be struggling, bored, or fatigued.
- `Safety Governor`: decides what adjustment is allowed.
- `Question Selector`: chooses questions from the bank using approved mix and constraints.
- `Child Profile`: updates slowly from repeated evidence, not from one batch.

The model must never directly generate the next question list for the child.

## Flow States

Use five internal states:

| State | Meaning | Product Action |
| --- | --- | --- |
| `easy` | Too easy | Add a small amount of challenge. Do not jump levels. |
| `flow` | Good fit | Maintain level and include a few light challenge items. |
| `stretch` | Slightly hard but learnable | Keep the learning goal, add support and confidence items. |
| `hard` | Clearly too hard | Lower pressure quickly, add visual support and recovery items. |
| `fatigue` | Attention or energy is dropping | Reduce batch size or pace. Do not update long-term skill profile. |

Important distinction:

```text
stretch = the child can recover with hints or support
hard = hints do not rescue the child
```

Only `hard` should reduce difficulty. `stretch` should usually add scaffolding.

## Current Repo Baseline

The current DDA module is intentionally simple:

- `src/engagement/dda/ddaEngine.ts`
- `src/engagement/dda/useDDA.ts`

It raises difficulty after three consecutive correct answers and lowers it after
two consecutive wrong answers. It only sees `correct` and `wrong`.

The Adaptive Flow Engine should replace that one-dimensional signal with a
batch-level policy, but it can keep the existing DDA module as a temporary
fallback while the new contracts are introduced.

## Question Tags

Every question should expose difficulty tags. MVP can derive these tags from the
existing `Question` shape and variant builders, then improve the source question
metadata later.

Required tags:

```ts
interface QuestionDifficultyTags {
  numberRange: 'within_5' | 'within_10' | 'within_20' | 'within_30';
  operationType: 'matching' | 'compare' | 'addition' | 'subtraction' | 'mixed';
  presentationType: 'visual' | 'semi_visual' | 'pure_number' | 'story' | 'number_line';
  visualSupport: 'strong' | 'medium' | 'weak' | 'none';
  crossTen: boolean;
  carryOrBorrow: boolean;
  optionDistance: 'wide' | 'medium' | 'close';
  difficultyLevel: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
}
```

Initial mapping notes:

- `matching`: usually visual and low abstraction.
- `compare`: visual or semi-visual depending on UI.
- `makeTen`: may involve cross-ten reasoning.
- `missing`: often higher cognitive load because it asks for an unknown addend.
- `story`: language load is part of difficulty.
- `numberLine`: visual support, but still abstract for some children.

## Event Logging

Every question should produce event-level telemetry. The existing
`src/telemetry/track.ts` can dispatch these events, but the payload should become
more structured.

Minimum events:

```text
practice.open
question.show
voice.prompt
question.audio_replay
question.hint_requested
question.answer
question.completed
question.wrong_final
question.feedback_started
question.feedback_finished
question.feedback_interrupt
question.idle_detected
question.rapid_click_detected
question.abandoned
level.complete
flow.batch_report_created
flow.llm_observation_created
flow.policy_approved
```

Required common payload fields:

```ts
interface CommonLearningEventPayload {
  schemaVersion: string;
  eventId: string;
  sessionId: string;
  childId: string;
  deviceId: string;
  runId?: string;
  batchId?: string;
  questionId?: string;
  questionIndex?: number;
  at: number;
}
```

Current implementation note:

- Every `track()` event now receives telemetry context automatically:
  `schemaVersion`, `eventId`, `sessionId`, `childId`, `deviceId`, and `at`.
- Practice events add `runId`; flow-policy events add `batchId`.
- Question lifecycle events now include `question.completed`, automatic
  `question.hint_requested`, `question.feedback_started`,
  `question.feedback_finished`, `question.feedback_interrupt`,
  `question.idle_detected`, `question.rapid_click_detected`, and
  `question.abandoned`.

Per-question answer record:

```ts
interface QuestionAttemptRecord {
  questionId: string;
  questionIndex: number;
  tags: QuestionDifficultyTags;
  correctAnswer: number;
  firstSelectedAnswer: number | null;
  finalSelectedAnswer: number | null;
  firstAttemptCorrect: boolean;
  finalCorrect: boolean;
  attemptCount: number;
  firstResponseTimeMs: number;
  totalTimeMs: number;
  audioReplayCount: number;
  hintCount: number;
  idleMs: number;
  rapidClickCount: number;
  feedbackInterruptClickCount: number;
  abandoned: boolean;
  result:
    | 'correct'
    | 'wrong_first_then_correct'
    | 'wrong_final'
    | 'abandoned';
}
```

## Batch Report

Create one batch report after a normal 10-question run. For MVP, this can be
computed entirely on-device before any server or LLM integration exists.

```ts
interface LearningBatchReport {
  batchId: string;
  childAgeMonths?: number;
  questionCount: number;
  currentDifficulty: number;
  rulePreState: FlowState;
  summary: {
    firstTryAccuracy: number;
    finalAccuracy: number;
    correctionRateAfterFirstWrong: number;
    avgFirstResponseTimeMs: number;
    avgTotalTimeMs: number;
    hintRate: number;
    audioReplayRate: number;
    wrongFinalCount: number;
    abandonedCount: number;
    longestWrongFinalStreak: number;
    rapidClickCount: number;
    idleCount: number;
  };
  firstHalfSummary: BatchSummarySlice;
  secondHalfSummary: BatchSummarySlice;
  byTag: TagPerformanceSlice[];
  attempts: QuestionAttemptRecord[];
}

type FlowState = 'easy' | 'flow' | 'stretch' | 'hard' | 'fatigue';

interface BatchSummarySlice {
  count: number;
  firstTryAccuracy: number;
  finalAccuracy: number;
  hintRate: number;
  audioReplayRate: number;
  avgFirstResponseTimeMs: number;
  rapidClickCount: number;
  idleCount: number;
}

interface TagPerformanceSlice {
  tagKey: string;
  sampleCount: number;
  firstTryAccuracy: number;
  finalAccuracy: number;
  avgTimeVsBaseline: number | null;
  hintRate: number;
  audioReplayRate: number;
  evidenceStrength: 'low' | 'medium' | 'high';
  signals: string[];
}
```

Evidence strength:

```text
1-2 samples -> low
3-5 samples -> medium
6+ samples -> high
```

Low evidence should be phrased as "possible", not as a stable skill diagnosis.

## Rule Classifier

The local classifier should create a conservative `rulePreState` before calling
the model.

Priority order:

```text
1. fatigue
2. hard
3. stretch
4. easy
5. flow
```

Initial heuristic:

```text
fatigue:
- second half is much worse than first half
- errors are dispersed across tags
- idle, rapid-click, replay, or feedback-interrupt signals increase

hard:
- firstTryAccuracy < 0.55
- finalAccuracy < 0.70
- longestWrongFinalStreak >= 2
- hints do not improve final correctness

stretch:
- firstTryAccuracy between 0.50 and 0.70
- finalAccuracy >= 0.80
- wrong-first questions are often corrected
- engagement remains stable

easy:
- firstTryAccuracy >= 0.85
- finalAccuracy >= 0.95
- hintRate and audioReplayRate are low
- response time is below child baseline or global MVP baseline

flow:
- none of the above safety states dominate
```

Use personal baselines when available. Until a child has enough history, use
global baselines and mark baseline confidence as low.

## LLM Observer Contract

The model receives the `LearningBatchReport`, a compact child profile, and the
rule pre-state. It returns only an observation and adjustment recommendation.

Frontend integration is configured with:

```text
VITE_FLOW_OBSERVER_URL=/api/ai?action=observe
VITE_FLOW_OBSERVER_TIMEOUT_MS=4500
```

The browser must call a trusted app-owned endpoint. Do not put provider API keys
in the Vite client.

Request body:

```json
{
  "schemaVersion": "childlearn.flow-observer.v1",
  "role": "learning_co_pilot",
  "report": "<LearningBatchReport>"
}
```

The endpoint may return either the observation object directly or:

```json
{
  "observation": "<LlmLearningObservation>"
}
```

If the endpoint is missing, times out, fails, or returns invalid JSON, the app
keeps the local rule-based policy.

System instruction summary:

```text
You are the Flow Observer for a math practice app used by a 4.5-year-old child.
Commercial-style progression is only the curriculum skeleton; the app's core
advantage is keeping challenge close to the child's current ability.

You are not the final decision system. Do not generate questions. Analyze only
the supplied LearningBatchReport as short-term evidence.

Apply flow principles:
- Challenge-skill balance: too easy creates boredom risk, too hard creates
  anxiety or shutdown risk.
- Clear micro-goal: wording, layout, audio, or affordance confusion is not a
  math skill gap.
- Immediate feedback and recovery: wrong-first-then-correct with support is
  stretch, not hard.
- Sense of control: rapid clicks, repeated replays, interrupted feedback,
  abandonment, and idle gaps may indicate low control or attention load.
- Concentration and tempo: compare first half vs second half before inferring
  fatigue or attention drop.

For a 4.5-year-old non-reader, treat story/text-heavy failures as possible
language or UI load unless audio-supported evidence clearly shows a math gap.
Recommend changing only one dimension at a time. Prefer support/presentation
adjustments before lowering number range when the issue may be cognitive load,
UI confusion, attention, or fatigue. Never jump multiple levels.
```

Output schema:

```ts
interface LlmLearningObservation {
  overallState: FlowState | 'unstable';
  confidence: number;
  stateReason: string;
  primaryIssue:
    | 'skill_gap'
    | 'cognitive_load'
    | 'attention_drop'
    | 'fatigue'
    | 'ui_confusion'
    | 'item_design_problem'
    | 'careless_or_motor_error'
    | 'uncertain';
  masteredSkills: EvidenceStatement[];
  weakSkills: EvidenceStatement[];
  riskSignals: string[];
  doNotInfer: string[];
  recommendation: {
    direction:
      | 'increase_slightly'
      | 'maintain'
      | 'maintain_with_support'
      | 'decrease_slightly'
      | 'reduce_batch_or_pace'
      | 'review_item_quality';
    adjustmentDimension:
      | 'number_range'
      | 'operation_type'
      | 'presentation_type'
      | 'visual_support'
      | 'option_distance'
      | 'batch_size'
      | 'feedback_strength'
      | 'none';
    suggestedMix: BatchMix;
    avoid: string[];
  };
  uxSuggestions: string[];
}

interface EvidenceStatement {
  label: string;
  evidenceStrength: 'low' | 'medium' | 'high';
  sampleCount: number;
  reason: string;
}

interface BatchMix {
  confidence: number;
  review: number;
  current: number;
  challenge: number;
}
```

## Safety Governor

The governor accepts:

- rule pre-state
- LLM observation
- short-term child state
- long-term child skill profile
- recent batch history

It outputs an approved policy.

```ts
interface ApprovedFlowPolicy {
  finalState: FlowState;
  finalAction:
    | 'increase_challenge_ratio'
    | 'maintain'
    | 'maintain_with_support'
    | 'decrease_pressure'
    | 'fatigue_recovery'
    | 'item_review';
  nextDifficulty: number;
  batchSize: number;
  mix: BatchMix;
  adjustmentDimension:
    | 'number_range'
    | 'operation_type'
    | 'presentation_type'
    | 'visual_support'
    | 'option_distance'
    | 'batch_size'
    | 'feedback_strength'
    | 'none';
  constraints: {
    maxLevelIncrease: 0 | 1;
    maxLevelDecrease: 0 | 1;
    maxSameOperationInRow: number;
    maxChallengeInRow: number;
    minConfidenceItemRatio: number;
    adjustOnlyOneDimension: boolean;
    avoidTags: string[];
    mustIncludeTags: string[];
  };
  rationale: string;
}
```

Default policies for a 10-question batch:

| State | Confidence | Review | Current | Challenge | Notes |
| --- | ---: | ---: | ---: | ---: | --- |
| `easy` | 1 | 2 | 4 | 3 | Increase challenge ratio, not full level jump. |
| `flow` | 1 | 2 | 5 | 2 | Keep rhythm. |
| `stretch` | 2 | 2 | 4 | 2 | Add support, not downgrade. |
| `hard` | 3 | 3 | 3 | 1 | Lower pressure and avoid hard streaks. |
| `fatigue` | 3 | 2 | 1 | 0 | Use 5-6 questions, no challenge items. |

Hard safety rules:

```text
- A single good batch cannot increase more than one level.
- A single hard batch cannot decrease more than one level.
- If model confidence < 0.65, do not upgrade difficulty.
- If rulePreState is hard and model says easy, do not upgrade.
- If model or rules detect fatigue, do not update long-term skills.
- Never send more than one challenge item in a row.
- Never send more than two subtraction or high-load items in a row.
- Every normal batch must include at least 20-30% high-success items.
- Only one difficulty dimension may change at a time.
```

Hysteresis:

```text
single easy batch -> add challenge ratio only
two consecutive easy batches -> allow formal level increase
single hard batch -> add support and confidence items
two consecutive hard batches -> allow level decrease or strong support
fatigue batch -> recovery policy, no skill downgrade
stretch batch -> maintain level with scaffolding
```

## Question Selector

Question Selector receives an `ApprovedFlowPolicy` and chooses questions. It
should not call the model.

Selection categories:

- `confidence`: high probability of success based on child profile.
- `review`: recently practiced or missed skills, but lower pressure.
- `current`: current learning target.
- `challenge`: one-dimension harder than current target.

Example `stretch` output:

```json
{
  "batchSize": 10,
  "mix": {
    "confidence": 2,
    "review": 2,
    "current": 4,
    "challenge": 2
  },
  "constraints": {
    "adjustOnlyOneDimension": true,
    "maxSameOperationInRow": 2,
    "maxChallengeInRow": 1,
    "avoidTags": ["pure_number_subtraction_close_options"],
    "mustIncludeTags": ["visual_support_subtraction"]
  }
}
```

## Child Profile Updates

Split profile updates into short-term and long-term layers.

Short-term state:

- updates after every batch
- drives the next batch policy
- can change quickly

Long-term skill profile:

- updates only from repeated evidence
- ignores fatigue batches
- should be skill-specific, not a single score

Suggested skill states:

```text
unknown
weak
developing
stable
challenge_ready
```

Update rules:

```text
skill stable for 2-3 non-fatigue batches -> stable
skill easy for 2 non-fatigue batches -> challenge_ready
skill hard for 2 non-fatigue batches -> weak or developing
fatigue batch -> update short-term state only
low sample evidence -> no long-term change
```

## Item Quality Loop

Wrong answers do not always mean the child is weak. Some items may be confusing.

Track per-item health:

```ts
interface ItemQualitySignal {
  questionId: string;
  exposureCount: number;
  wrongFinalRate: number;
  audioReplayRate: number;
  idleRate: number;
  rapidClickRate: number;
  abnormalComparedWithSimilarItems: boolean;
  reviewReason:
    | 'high_wrong_rate'
    | 'high_replay_rate'
    | 'ui_confusion'
    | 'ambiguous_options'
    | 'unclear_prompt'
    | 'none';
}
```

If a single item is much worse than similar items, mark it for review instead of
penalizing the child profile.

## MVP Implementation Plan

Phase 1: contracts and local batch report

- Add question difficulty tag helpers.
- Add per-question attempt records.
- Aggregate 10-question batch reports.
- Keep current DDA as fallback.
- Add tests for batch summary and rule classification.

Phase 2: local Safety Governor without LLM

- Implement `RuleClassifier`.
- Implement `SafetyGovernor`.
- Generate next-batch policy from local rules only.
- Update current question generation to accept policy constraints.

Phase 3: LLM Observer integration

- Send compact `LearningBatchReport`, not raw event logs.
- Validate model JSON against schema.
- If model fails, times out, or has low confidence, use local policy.
- Store observation for parent/debug view, not child-facing UI.

Phase 4: child profile and item quality

- Persist short-term state and skill profile.
- Add slow profile updates with hysteresis.
- Track item quality anomalies.
- Surface parent-facing learning notes in the report panel.

## Acceptance Criteria

MVP is successful when:

- Consecutive final failures decrease after hard batches.
- Batch completion rate improves or remains stable.
- Hint-after-wrong correction rate improves for stretch skills.
- Easy batches introduce challenge gradually without large jumps.
- Fatigue batches reduce pressure without downgrading long-term skills.
- The next batch can be explained from logged signals and policy constraints.

## Non-Goals For MVP

- Do not let the model generate question content directly.
- Do not build a full recommendation system from day one.
- Do not expose "difficulty was lowered" to the child.
- Do not treat one batch as a stable diagnosis.
- Do not make global level changes when only one skill dimension is weak.
