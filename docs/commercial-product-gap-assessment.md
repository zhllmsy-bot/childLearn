# Commercial Product Gap Assessment

> Status: future commercialization reference, not a current sprint requirement.
> Current product stage: playful prototype / child-facing interaction exploration.
> Last updated: 2026-04-25.

## Why This Exists

The current project is still in the "make it fun and understandable for a
4.5-year-old child" phase. This note parks the commercial-product comparison so
we can reuse it later without letting it distort the current work.

The near-term product goal remains:

- make the child want to keep playing
- make questions understandable without reading
- make answer feedback joyful and legible
- make early number sense concrete, visual, and repeatable

Commercialization can come later, after the play loop feels alive.

## One-Sentence Assessment

The project already has a strong child-facing interaction loop, but compared
with mature commercial learning products, it still lacks three business-grade
loops: a structured curriculum path, parent-trust learning evidence, and
durable account / progress infrastructure.

## Reference Products

- Khan Academy Kids: learning path, adaptive progression, parent/teacher
  progress reports, domain-level progress, score history, and assignment
  follow-up.
- ABCmouse: step-by-step learning path, large content library, tickets and
  rewards, parent progress visibility, and broad early-childhood coverage.
- DragonBox Numbers: number sense through manipulable number characters, with
  gameplay focused on understanding rather than memorization.
- Duolingo: achievements, personal records, streaks, celebration, and clear
  repeat-use habit loops.
- Prodigy Math: parent-set goals, parent dashboard, rewards, and math practice
  wrapped in a game world.

Useful source links:

- https://khankids.zendesk.com/hc/en-us/articles/4403614100109-Progress-reports-in-the-Khan-Academy-Kids-app
- https://khankids.zendesk.com/hc/en-us/articles/360041615571-How-does-the-learning-level-adjust-and-how-do-I-view-my-child-s-progress
- https://www.abcmouse.com/learn/
- https://dragonbox.com/products/numbers
- https://blog.duolingo.com/achievement-badges/
- https://www.prodigygame.com/main-en/blog/goals-rewards-tool

## What Is Already Strong

### Child-Facing Play Loop

The project already has a playful practice loop with animated feedback, combo,
stickers, reward garden, number spirits, result screens, and a home achievement
surface. This is the right foundation for the current stage.

### Low-Literacy Direction

The product is correctly moving away from text-heavy explanations and toward
visual math: fruit, dots, bars, number lines, and concrete story scenes. For a
4.5-year-old child, this matters more than commercial polish.

### Adaptive Learning Foundation

The codebase already includes DDA and a richer flow-analysis foundation. The
flow model records signals like first-try accuracy, final accuracy, hints,
audio replay, response time, idle behavior, rapid clicks, and tag-level
performance. This can become a strong learning-evidence layer later.

### Persistence Foundation

Local progress persistence exists, and a client-side learning-state sync
strategy has been started. This is enough for the current local-first phase,
even though it is not yet a commercial account system.

## Main Commercial Gaps

### 1. Curriculum Path Is Still Thin

Commercial products present a visible learning path: levels, domains, skill
progress, mastered lessons, and what comes next. The current project generates
practice from several variants, which is good for play exploration but not yet
a curriculum map.

Future gap to close:

- skill tree for early number sense
- prerequisites between skills
- unit goals and mastery thresholds
- review schedule
- clear end-of-level and end-of-unit meaning

### 2. Parent Trust Is Not Yet Productized

The parent report currently surfaces useful operational stats, but mature
commercial products translate data into parent-facing trust:

- what the child has learned
- what is still fragile
- what to practice next
- whether the child is improving over time
- why the app adjusted difficulty

Future gap to close:

- weekly parent report
- mastery labels in plain language
- evidence examples from recent questions
- suggested practice plan
- shareable or exportable progress summary

### 3. Rewards Need a Deeper Economy Later

The current reward layer creates delight, but mature products often let rewards
be spent, displayed, upgraded, personalized, or connected to parent-set goals.

Future gap to close:

- spendable fruit coins / tickets
- garden decoration or room decoration
- number-spirit upgrades that change the practice experience
- parent-set goals with child-visible rewards
- long-term collections with clear progress arcs

### 4. Number Sense Should Become the Moat

DragonBox Numbers is a useful benchmark because the number characters are not
just trophies; they are manipulable math objects. The project's number spirits
can become more than a collection layer.

Future gap to close:

- numbers as draggable / combinable objects
- visual composition and decomposition of 5, 10, and teen numbers
- "4 + ? = 9" shown as a manipulable missing-part scene
- three-line models that match the child's visual reasoning, not adult text

### 5. Account And Sync Are Not Commercial-Grade Yet

Local storage and sync scaffolding are fine for the current stage. Commercially,
the product eventually needs durable identity and recovery.

Future gap to close:

- parent account
- child profiles
- cross-device progress recovery
- safe merge rules backed by server revisions
- privacy, consent, deletion, and data export

### 6. Content Operations Are Missing

A commercial learning product cannot rely only on random generation. It needs a
content process.

Future gap to close:

- item schema
- authoring workflow
- difficulty calibration
- bad-question review queue
- content QA tests
- art/audio QA

### 7. Healthy Retention Needs Guardrails

The project wants stronger engagement, but preschool products need parent trust.
The long-term loop should include healthy stopping points, fatigue detection,
and a satisfying end-of-session ritual.

Future gap to close:

- session-length guidance
- fatigue-aware wrap-up
- parent-controlled goals
- no-pressure streaks
- celebratory stopping instead of endless grinding

## Suggested Future Priority

Do not commercialize yet. First make the child's core play loop excellent.

When the playful loop is stable, the recommended commercialization order is:

1. Curriculum map and mastery model.
2. Parent-facing weekly report.
3. Reward economy with spendable / upgradeable items.
4. Account, sync, profiles, and privacy.
5. Content authoring and QA pipeline.

## Current-Stage Reminder

For now, the product should be judged by a simpler question:

Can a 4.5-year-old child understand what to do, feel delighted when answering,
and want to play one more level?

If the answer is not consistently yes, commercial features should wait.
