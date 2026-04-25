# Math Progression Strategy

This project should treat math difficulty as a learning progression, not as a
single number that only expands the answer range.

## Current Product Assumption

- Target child: about 4.5 years old.
- Reading ability: assume the child cannot reliably read prompts.
- Primary mode: visual, oral, and touch-first interaction.
- Product goal: playful number sense and early arithmetic confidence, not formal
  exam acceleration.

## Evidence Baseline

- China's `3-6岁儿童学习与发展指南` puts 4-5 year olds around comparing
  quantities by counting and understanding relationships such as `5比4多1` and
  `2和3合在一起是5`. It puts concrete 10-within addition/subtraction more
  clearly in the 5-6 age band.
- Common Core Kindergarten separates counting/cardinality, comparing numbers,
  and addition/subtraction within 10 with objects or drawings. Grade 1 then
  moves to addition/subtraction within 20.
- Clements/Sarama Learning Trajectories describe early addition/subtraction as
  a sequence: small-number action, find result, make N, find change, counting
  strategies, part-whole, numbers-in-numbers, and later multidigit work.

References:

- https://www.edu.cn/xue_qian_779/20121016/t20121016_856526_28.shtml
- https://www.thecorestandards.org/Math/Content/CC/
- https://www.thecorestandards.org/Math/Content/K/OA/
- https://www.thecorestandards.org/Math/Content/1/OA/C/6/
- https://www.learningtrajectories.org/index.php/math/learning-trajectories/adding-subtracting

## Product Interpretation

For this age, harder should not simply mean "bigger numbers".

Difficulty has four independent axes:

| Axis | Easier | Harder |
| --- | --- | --- |
| Number range | within 5 | within 10, 20, 30 |
| Representation | real objects / stickers | number line, bar model, equation |
| Cognitive action | count, compare | compose/decompose, missing addend |
| Support | voice + visual + segmented bars | less visual support, closer options |

`within_30` is an extension band. It should appear only after strong evidence
that `within_10` and `within_20` are comfortable. For a 4.5 year old, the top
band should still keep visual support and should not become pure symbolic
worksheet practice.

## Differentiation: Curriculum Skeleton + Flow Control

Commercial products are useful references for age bands, curriculum scope, and
reward loops, but this product should not become a fixed commercial-style
learning path clone.

The product thesis is:

```text
Commercial-style progression provides the curriculum skeleton.
The flow engine and LLM observer provide the adaptive control layer.
```

In practice:

- Level packs define the safe learning boundary for a short run.
- The local flow engine reads batch behavior and keeps challenge conservative.
- The LLM observer explains likely causes such as skill gap, cognitive load,
  attention drop, fatigue, UI confusion, or item-design problems.
- The approved flow policy decides whether to increase challenge, maintain,
  maintain with support, decrease pressure, or recover from fatigue.
- The next question should be precise to the child state, not just the next item
  in a commercial-style sequence.

This is the core product advantage: keep the child in flow by adapting pressure,
support, and question type around the child's current ability.

## MVP Bands

The code maps the existing `difficulty` value onto these bands in
`src/curriculum/mathProgression.ts`. Each practice run then uses a fixed short
level pack from `src/curriculum/levelPacks.ts` so the child completes a
recognizable set of tasks instead of entering an endless generated stream.

| Difficulty | Band | Range | Core question types | Product intent |
| --- | --- | --- | --- | --- |
| 1-2 | `count_compare_to_5` | quantities/results within 5 | count, compare | one-to-one counting, cardinality, more/less |
| 3-4 | `part_whole_to_10` | quantities/results within 10 | count, compare, missing part, make 10 | bridge from counting to part-whole |
| 5-6 | `result_to_10` | results within 10 | story, number line, missing part, make 10 | 10-within addition with visual support |
| 7-8 | `within_20_bridge` | results within 20 | missing part, story, number line, compare | counting-on and early teen-number reasoning |
| 9-10 | `within_30_extension` | results within 30 | missing part, story, number line, compare | extension only; keep supports visible |

## Guardrails

- Do not unlock larger number ranges from one good question. Use batch evidence.
- Do not treat `compare` as advanced by default; visual comparison is a
  preschool foundation when the UI actually shows two groups clearly.
- Do not rely on text prompts for the child. The UI/audio must carry the task.
- Do not show three different abstract models unless each model has a clear job.
  For example, apple groups, segmented bars, and number line can coexist only if
  one is the main action surface and the others are supporting cues.
- Do not keep `makeTen` as a top-band core item while it is hard-coded to
  `? + n = 10`; at high bands it is better as review/support unless generalized
  to make 20 or make 30.

## Level Pack Rules

- A child-facing pack should contain 6-8 tasks.
- The first task should be familiar and visually obvious.
- The middle tasks can introduce one challenge pattern.
- The last task should return to a supported success moment.
- A pack should name its learning goal in parent-readable language, such as
  `5以内点数和多少比较`, rather than a generic level number.
- Adaptive policy can still adjust number range and support, but the pack owns
  the learning sequence for the run.
- Flow lane can override the pressure of a slot:
  - `confidence` / `review`: use a lower-pressure support variant.
  - `current`: use the pack's planned variant.
  - `challenge`: use a higher-pressure variant unless the slot is explicitly
    marked as recovery.
- A slot keeps its skill identity even when flow changes the variant. This lets
  the product preserve curriculum intent while changing pressure in real time.

## Open Product Questions

- Whether the current two progress bars should become segmented bars with
  numbers printed on each tick.
- Whether `4 + 5 = ?` and `4 + ? = 9` need a third line, or whether a single
  segmented total bar plus two colored part bars is clearer on iPad.
- Whether each level should be fixed at `n` questions with a completion screen,
  versus an endless adaptive practice loop.
