# Flow Effectiveness Metrics

## Why This Exists

The Adaptive Flow Engine is only useful if we can measure whether it keeps the
child in a sustainable challenge zone. This document defines the first local
metrics loop for evaluating the product from telemetry.

## Command

```bash
npm run metrics:flow
```

Optional JSON output:

```bash
npm run metrics:flow -- --json
```

Analyze another file:

```bash
npm run metrics:flow -- --file output/telemetry/childlearn-events.jsonl
```

Write a report artifact:

```bash
npm run metrics:flow -- --json --out output/telemetry/flow-metrics-summary.json
```

## Required Telemetry Shape

Every event should include:

- `schemaVersion`
- `eventId`
- `sessionId`
- `childId`
- `deviceId`
- `at`
- `name`
- `payload`

Practice and question events should also include:

- `runId`
- `questionId`
- `questionIndex`
- `levelPackId`
- `skillId`
- `operationType`
- `presentationType`
- `numberRange`
- `optionDistance`

Flow policy events should include:

- `batchId`
- `state`
- `action`
- `nextDifficulty`
- `adjustmentDimension`
- `source`

## Core Metrics

### Coverage

- `completionPerShowRate`: how many shown questions eventually emit
  `question.completed`.
- `unifiedContextRate`: how many events have the v2 context fields.
- `missingRunIdQuestionEventRate`: how many question events cannot be tied to a
  practice run.

Healthy target after a clean run:

- `completionPerShowRate`: high for completed practice sessions.
- `unifiedContextRate`: near 100%.
- `missingRunIdQuestionEventRate`: near 0%.

Old telemetry may score poorly here because earlier events did not have v2
context or `runId`.

### Practice Fit

- `firstTryAccuracy`: primary learning pressure signal.
- `finalAccuracy`: recovery signal, not the main difficulty signal.
- `hintRate`: scaffold demand.
- `audioReplayRate`: voice or comprehension support demand.
- `idleRate`: attention or uncertainty signal.
- `rapidClickRate`: motor noise, guessing, or low-control signal.
- `abandonRate`: frustration, distraction, or navigation-away signal.
- `feedbackInterruptRate`: feedback impatience or unclear feedback signal.
- `avgFirstResponseTimeMs`: processing load.
- `avgTotalTimeMs`: full item load.

Important: because the app lets the child retry, `finalAccuracy` can look
healthy even when the item is too hard. Use `firstTryAccuracy`, `hintRate`,
`attemptCount`, and response time as the main flow signals.

### Flow Fit Label

The analyzer assigns a conservative label per run:

- `observing`: not enough completed questions.
- `too_easy`: very high first-try accuracy, low hints, fast responses.
- `flow`: mostly successful, moderate effort, low friction.
- `stretch`: recoverable difficulty.
- `too_hard`: low first-try/final accuracy or high hint demand.
- `fatigue_or_attention_risk`: idle/abandon friction is high.
- `mixed`: no clear label yet.

The `flowFitScore` is a rough 0-100 heuristic. It is useful for trend watching,
not for judging one child from one short session.

### Flow Policy Impact

The analyzer reads:

- `flow.policy_approved`
- `flow.llm_observation_created`
- `flow.next_batch_outcome`

It reports:

- local policy count vs LLM-filtered policy count
- LLM ready/failed counts
- LLM/local same-state rate
- helpful outcome rate

`helpfulOutcomeRate` is heuristic:

- after `hard` or `fatigue`, moving away from those states is helpful
- after `easy`, moving toward `flow` or `stretch` is helpful
- after `flow`, staying in `flow` is helpful

## Reading The Current Log

If the report warns:

- `Less than 80% of events have unified telemetry context`
- `More than 20% of question events are missing runId`
- `No run has at least 3 completed questions`

then the log is not yet strong enough for product conclusions. It can still
validate that the pipeline works, but a fresh child session with the new
telemetry is needed before evaluating the learning loop.

## Next Improvements

- Store the JSON report as a daily artifact.
- Add a tiny dashboard for trends over time.
- Compare policy applied at batch N with child response at batch N+1.
- Split metrics by age, level pack, skill, and presentation type.
- Add parent-facing summary language after the metric definitions stabilize.
