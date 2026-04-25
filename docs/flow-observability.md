# Flow Observability

This project keeps flow and ability analysis grounded in telemetry, not vibes.

## Command

```bash
npm run metrics:flow
```

Useful variants:

```bash
npm run metrics:flow -- --days 1
npm run metrics:flow -- --child-id child-id-here
npm run metrics:flow -- --json
```

## Signals

The weekly readout should watch:

- Flow state mix: `flow` and `stretch` are productive; `hard` and `fatigue`
  are pressure signals; too much `easy` means the child may be under-challenged.
- Question completion quality: first-try accuracy, final accuracy,
  `wrong_final`, hint rate, replay rate, idle count, rapid click count.
- Ability profile: stable skills, developing skills, challenging skills, and
  whether the focus skills match recent wrong-final or high-hint tags.
- Intervention quality: whether `flow.policy_approved`,
  `flow.next_batch_outcome`, and `flow.llm_observation_created` appear after
  enough completed questions.

## Stable Event Contract

Keep these events stable unless the analysis script is updated in the same
change:

- `practice.open`
- `question.show`
- `question.answer`
- `question.completed`
- `question.wrong_final`
- `question.hint_requested`
- `question.idle_detected`
- `question.rapid_click_detected`
- `question.feedback_started`
- `question.feedback_finished`
- `question.feedback_interrupt`
- `question.abandoned`
- `level.complete`
- `flow.batch_report_created`
- `flow.policy_approved`
- `flow.next_batch_outcome`
- `flow.llm_observation_created`
- `ability.profile_updated`

## Operating Rule

If a new child-facing adaptation is added, add the event first, then verify it
with `npm run metrics:flow -- --days 1`. The report should be readable enough
for a product review without opening raw JSONL logs.
