#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const DEFAULT_TELEMETRY_PATH = 'output/telemetry/childlearn-events.jsonl';
const FLOW_TARGET_FIRST_TRY = 0.72;

function asNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function round(value, digits = 4) {
  return Number(value.toFixed(digits));
}

function ratio(numerator, denominator) {
  return denominator === 0 ? 0 : round(numerator / denominator);
}

function average(values) {
  const clean = values.filter((value) => Number.isFinite(value));
  if (clean.length === 0) {
    return 0;
  }

  return Math.round(clean.reduce((sum, value) => sum + value, 0) / clean.length);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function payload(event) {
  return event && typeof event.payload === 'object' && event.payload !== null
    ? event.payload
    : {};
}

function eventAt(event) {
  return asNumber(event?.at, 0);
}

function increment(record, key, amount = 1) {
  record[key] = (record[key] ?? 0) + amount;
}

function distribution(events, selector) {
  const result = {};
  events.forEach((event) => {
    const key = selector(event);
    if (key !== null && key !== undefined && key !== '') {
      increment(result, String(key));
    }
  });
  return Object.fromEntries(
    Object.entries(result).sort((left, right) => right[1] - left[1]),
  );
}

export function parseTelemetryJsonl(text) {
  const events = [];
  const malformed = [];

  text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .forEach((line, index) => {
      if (!line) {
        return;
      }

      try {
        const event = JSON.parse(line);
        if (event && typeof event === 'object' && typeof event.name === 'string') {
          events.push(event);
          return;
        }
      } catch {
        // Collected below.
      }

      malformed.push(index + 1);
    });

  return { events, malformedLineNumbers: malformed };
}

function runIdFor(event, fallback = 'legacy-run') {
  return (
    payload(event).runId ||
    event.runId ||
    event.sessionId ||
    `${fallback}:${payload(event).levelPackId ?? 'unknown'}`
  );
}

function summarizeCompletedQuestions(completed, frictionEvents = []) {
  const questionCount = completed.length;
  const wrongFinalCount = completed.filter(
    (event) => payload(event).finalCorrect === false,
  ).length;
  const firstTryAccuracy = ratio(
    completed.filter((event) => payload(event).firstAttemptCorrect === true).length,
    questionCount,
  );
  const finalAccuracy = ratio(
    completed.filter((event) => payload(event).finalCorrect === true).length,
    questionCount,
  );
  const hintRate = ratio(
    completed.filter((event) => asNumber(payload(event).hintCount) > 0).length,
    questionCount,
  );
  const audioReplayRate = ratio(
    completed.filter((event) => asNumber(payload(event).audioReplayCount) > 0).length,
    questionCount,
  );
  const rapidClickRate = ratio(
    completed.filter((event) => asNumber(payload(event).rapidClickCount) > 0).length,
    questionCount,
  );
  const idleRate = ratio(
    completed.filter((event) => asNumber(payload(event).idleMs) > 0).length,
    questionCount,
  );
  const feedbackInterruptRate = ratio(
    completed.filter((event) => asNumber(payload(event).feedbackInterruptClickCount) > 0)
      .length,
    questionCount,
  );
  const abandonedCount = frictionEvents.filter(
    (event) => event.name === 'question.abandoned',
  ).length;

  return {
    questionCount,
    wrongFinalCount,
    wrongFinalRate: ratio(wrongFinalCount, questionCount),
    firstTryAccuracy,
    finalAccuracy,
    hintRate,
    audioReplayRate,
    rapidClickRate,
    idleRate,
    abandonedCount,
    abandonRate: ratio(abandonedCount, questionCount + abandonedCount),
    feedbackInterruptRate,
    avgFirstResponseTimeMs: average(
      completed.map((event) => asNumber(payload(event).firstResponseTimeMs, NaN)),
    ),
    avgTotalTimeMs: average(
      completed.map((event) => asNumber(payload(event).totalTimeMs, NaN)),
    ),
  };
}

function flowFitScore(summary) {
  if (summary.questionCount < 3) {
    return null;
  }

  const firstTryPenalty = Math.abs(summary.firstTryAccuracy - FLOW_TARGET_FIRST_TRY) * 90;
  const finalPenalty = Math.max(0, 0.8 - summary.finalAccuracy) * 110;
  const hintPenalty = Math.max(0, summary.hintRate - 0.45) * 45;
  const frictionPenalty =
    summary.idleRate * 20 +
    summary.rapidClickRate * 15 +
    summary.abandonRate * 40 +
    summary.feedbackInterruptRate * 15;

  return Math.round(
    clamp(100 - firstTryPenalty - finalPenalty - hintPenalty - frictionPenalty, 0, 100),
  );
}

function classifyFlowFit(summary) {
  if (summary.questionCount < 3) {
    return 'observing';
  }

  if (summary.abandonRate >= 0.2 || summary.idleRate >= 0.35) {
    return 'fatigue_or_attention_risk';
  }

  if (
    summary.firstTryAccuracy >= 0.9 &&
    summary.hintRate <= 0.1 &&
    summary.avgFirstResponseTimeMs > 0 &&
    summary.avgFirstResponseTimeMs <= 3500
  ) {
    return 'too_easy';
  }

  if (
    summary.finalAccuracy < 0.75 ||
    summary.firstTryAccuracy < 0.45 ||
    summary.hintRate >= 0.6
  ) {
    return 'too_hard';
  }

  if (
    summary.firstTryAccuracy >= 0.55 &&
    summary.firstTryAccuracy <= 0.85 &&
    summary.finalAccuracy >= 0.8 &&
    summary.hintRate <= 0.45 &&
    summary.abandonRate <= 0.1
  ) {
    return 'flow';
  }

  if (summary.firstTryAccuracy >= 0.4 && summary.finalAccuracy >= 0.75) {
    return 'stretch';
  }

  return 'mixed';
}

function groupByRun(events) {
  const runs = new Map();

  events.forEach((event) => {
    if (
      !event.name.startsWith('question.') &&
      event.name !== 'practice.open' &&
      event.name !== 'level.complete'
    ) {
      return;
    }

    const runId = runIdFor(event);
    const run = runs.get(runId) ?? {
      runId,
      firstAt: eventAt(event),
      lastAt: eventAt(event),
      events: [],
    };

    run.firstAt = Math.min(run.firstAt || eventAt(event), eventAt(event));
    run.lastAt = Math.max(run.lastAt, eventAt(event));
    run.events.push(event);
    runs.set(runId, run);
  });

  return [...runs.values()].sort((left, right) => left.firstAt - right.firstAt);
}

function summarizeRuns(events) {
  return groupByRun(events).map((run) => {
    const completed = run.events.filter((event) => event.name === 'question.completed');
    const friction = run.events.filter((event) =>
      [
        'question.abandoned',
        'question.idle_detected',
        'question.rapid_click_detected',
        'question.feedback_interrupt',
      ].includes(event.name),
    );
    const summary = summarizeCompletedQuestions(completed, friction);

    return {
      runId: run.runId,
      firstAt: run.firstAt,
      lastAt: run.lastAt,
      durationMs: run.lastAt > run.firstAt ? run.lastAt - run.firstAt : 0,
      eventCount: run.events.length,
      ...summary,
      flowFit: classifyFlowFit(summary),
      flowFitScore: flowFitScore(summary),
    };
  });
}

function dimensionEntries(event) {
  const p = payload(event);
  return [
    ['skillId', p.skillId],
    ['operationType', p.operationType],
    ['presentationType', p.presentationType],
    ['numberRange', p.numberRange],
    ['optionDistance', p.optionDistance],
    ['packSlotRole', p.packSlotRole],
  ].filter(([, value]) => value !== null && value !== undefined && value !== '');
}

function summarizeRiskGroups(completed) {
  const groups = new Map();

  completed.forEach((event) => {
    dimensionEntries(event).forEach(([dimension, value]) => {
      const key = `${dimension}:${value}`;
      const group = groups.get(key) ?? {
        dimension,
        value: String(value),
        events: [],
      };
      group.events.push(event);
      groups.set(key, group);
    });
  });

  return [...groups.values()]
    .map((group) => {
      const summary = summarizeCompletedQuestions(group.events);
      const responsePenalty = Math.min(summary.avgFirstResponseTimeMs / 1000, 15);
      const riskScore = Math.round(
        clamp(
          (1 - summary.firstTryAccuracy) * 40 +
            (1 - summary.finalAccuracy) * 35 +
            summary.hintRate * 25 +
            summary.idleRate * 15 +
            responsePenalty,
          0,
          100,
        ),
      );

      return {
        dimension: group.dimension,
        value: group.value,
        sampleCount: summary.questionCount,
        firstTryAccuracy: summary.firstTryAccuracy,
        finalAccuracy: summary.finalAccuracy,
        hintRate: summary.hintRate,
        avgFirstResponseTimeMs: summary.avgFirstResponseTimeMs,
        riskScore,
      };
    })
    .sort((left, right) => {
      if (right.riskScore !== left.riskScore) {
        return right.riskScore - left.riskScore;
      }

      return right.sampleCount - left.sampleCount;
    })
    .slice(0, 12);
}

function transitionHelpfulness(appliedState, outcomeState) {
  if (!appliedState || !outcomeState) {
    return null;
  }

  if (appliedState === 'hard' || appliedState === 'fatigue') {
    return !['hard', 'fatigue'].includes(outcomeState);
  }

  if (appliedState === 'easy') {
    return outcomeState === 'flow' || outcomeState === 'stretch';
  }

  if (appliedState === 'stretch') {
    return outcomeState === 'stretch' || outcomeState === 'flow';
  }

  if (appliedState === 'flow') {
    return outcomeState === 'flow';
  }

  return null;
}

function summarizeFlowPolicies(events) {
  const policies = events.filter((event) => event.name === 'flow.policy_approved');
  const observations = events.filter((event) => event.name === 'flow.llm_observation_created');
  const outcomes = events.filter((event) => event.name === 'flow.next_batch_outcome');
  const byBatch = new Map();

  policies.forEach((event) => {
    const p = payload(event);
    if (!p.batchId) {
      return;
    }

    const item = byBatch.get(p.batchId) ?? {};
    item[p.source === 'llm_filtered' ? 'llmFiltered' : 'local'] = p;
    byBatch.set(p.batchId, item);
  });

  const comparable = [...byBatch.values()].filter((item) => item.local && item.llmFiltered);
  const sameState = comparable.filter(
    (item) => item.local.state === item.llmFiltered.state,
  ).length;
  const sameAction = comparable.filter(
    (item) => item.local.action === item.llmFiltered.action,
  ).length;
  const outcomePairs = outcomes
    .map((event) => {
      const p = payload(event);
      return {
        batchId: p.batchId ?? null,
        appliedState: p.appliedState ?? null,
        appliedAction: p.appliedAction ?? null,
        outcomeState: p.outcomeState ?? null,
        helpful: transitionHelpfulness(p.appliedState, p.outcomeState),
      };
    })
    .filter((item) => item.appliedState || item.outcomeState);
  const helpfulPairs = outcomePairs.filter((item) => item.helpful === true).length;
  const scoredPairs = outcomePairs.filter((item) => item.helpful !== null).length;

  return {
    policyCount: policies.length,
    localPolicyCount: policies.filter((event) => payload(event).source === 'local').length,
    llmFilteredPolicyCount: policies.filter(
      (event) => payload(event).source === 'llm_filtered',
    ).length,
    llmObservationReadyCount: observations.filter(
      (event) => payload(event).status === 'ready',
    ).length,
    llmObservationFailedCount: observations.filter(
      (event) => payload(event).status === 'failed',
    ).length,
    stateDistribution: distribution(policies, (event) => payload(event).state),
    actionDistribution: distribution(policies, (event) => payload(event).action),
    adjustmentDistribution: distribution(
      policies,
      (event) => payload(event).adjustmentDimension,
    ),
    llmLocalComparableCount: comparable.length,
    llmLocalSameStateRate: ratio(sameState, comparable.length),
    llmLocalSameActionRate: ratio(sameAction, comparable.length),
    outcomePairCount: outcomePairs.length,
    helpfulOutcomeRate: ratio(helpfulPairs, scoredPairs),
    outcomePairs: outcomePairs.slice(-20),
  };
}

function buildWarnings({ events, completed, runs, contextRate, missingRunIdRate }) {
  const warnings = [];

  if (events.length === 0) {
    warnings.push('No telemetry events were found.');
    return warnings;
  }

  if (completed.length === 0) {
    warnings.push('No question.completed events found; effectiveness metrics are limited.');
  }

  if (contextRate < 0.8) {
    warnings.push('Less than 80% of events have unified telemetry context.');
  }

  if (missingRunIdRate > 0.2) {
    warnings.push('More than 20% of question events are missing runId.');
  }

  if (runs.filter((run) => run.questionCount >= 3).length === 0) {
    warnings.push('No run has at least 3 completed questions; flow-fit labels are observing.');
  }

  if (!events.some((event) => event.name === 'flow.next_batch_outcome')) {
    warnings.push('No flow.next_batch_outcome events found; adaptive impact cannot be estimated.');
  }

  return warnings;
}

export function analyzeTelemetryEvents(events, options = {}) {
  const completed = events.filter((event) => event.name === 'question.completed');
  const shows = events.filter((event) => event.name === 'question.show');
  const answers = events.filter((event) => event.name === 'question.answer');
  const questionEvents = events.filter((event) => event.name.startsWith('question.'));
  const contextEvents = events.filter(
    (event) => event.schemaVersion && event.eventId && event.sessionId && event.childId,
  );
  const missingRunIdQuestionEvents = questionEvents.filter(
    (event) => !payload(event).runId,
  );
  const runs = summarizeRuns(events);
  const summary = summarizeCompletedQuestions(
    completed,
    events.filter((event) => event.name === 'question.abandoned'),
  );
  const scores = runs
    .map((run) => run.flowFitScore)
    .filter((score) => Number.isFinite(score));

  return {
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    source: {
      eventCount: events.length,
      firstAt: events.length > 0 ? Math.min(...events.map(eventAt).filter(Boolean)) : null,
      lastAt: events.length > 0 ? Math.max(...events.map(eventAt).filter(Boolean)) : null,
    },
    coverage: {
      questionShowCount: shows.length,
      questionAnswerCount: answers.length,
      questionCompletedCount: completed.length,
      completionPerShowRate: ratio(completed.length, shows.length),
      completionPerAnswerRate: ratio(completed.length, answers.length),
      unifiedContextRate: ratio(contextEvents.length, events.length),
      missingRunIdQuestionEventRate: ratio(
        missingRunIdQuestionEvents.length,
        questionEvents.length,
      ),
    },
    practice: {
      runCount: runs.length,
      ...summary,
      averageFlowFitScore:
        scores.length > 0 ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : null,
      flowFitDistribution: distribution(runs, (run) => run.flowFit),
    },
    flowPolicy: summarizeFlowPolicies(events),
    topRiskDimensions: summarizeRiskGroups(completed),
    runs,
    warnings: buildWarnings({
      events,
      completed,
      runs,
      contextRate: ratio(contextEvents.length, events.length),
      missingRunIdRate: ratio(missingRunIdQuestionEvents.length, questionEvents.length),
    }),
  };
}

function formatPercent(value) {
  const percent = value * 100;
  const digits = percent > 0 && percent < 10 ? 1 : 0;
  return `${percent.toFixed(digits)}%`;
}

export function formatMetricsReport(report) {
  const lines = [];
  lines.push('ChildLearn Flow Metrics');
  lines.push(`Events: ${report.source.eventCount}`);
  lines.push(
    `Coverage: completed/show ${formatPercent(report.coverage.completionPerShowRate)}, context ${formatPercent(report.coverage.unifiedContextRate)}, missing runId ${formatPercent(report.coverage.missingRunIdQuestionEventRate)}`,
  );
  lines.push(
    `Practice: ${report.practice.runCount} runs, ${report.practice.questionCount} completed questions, first-try ${formatPercent(report.practice.firstTryAccuracy)}, final ${formatPercent(report.practice.finalAccuracy)}, wrong-final ${formatPercent(report.practice.wrongFinalRate)}, hints ${formatPercent(report.practice.hintRate)}`,
  );
  lines.push(
    `Friction: idle ${formatPercent(report.practice.idleRate)}, rapid ${formatPercent(report.practice.rapidClickRate)}, abandon ${formatPercent(report.practice.abandonRate)}, feedback interrupt ${formatPercent(report.practice.feedbackInterruptRate)}`,
  );
  lines.push(
    `Flow fit: avg score ${report.practice.averageFlowFitScore ?? 'n/a'}, ${JSON.stringify(report.practice.flowFitDistribution)}`,
  );
  lines.push(
    `Policies: ${report.flowPolicy.policyCount} approved, LLM ready ${report.flowPolicy.llmObservationReadyCount}, LLM/local same-state ${formatPercent(report.flowPolicy.llmLocalSameStateRate)}, helpful outcome ${formatPercent(report.flowPolicy.helpfulOutcomeRate)}`,
  );

  if (report.topRiskDimensions.length > 0) {
    lines.push('Top risk dimensions:');
    report.topRiskDimensions.slice(0, 6).forEach((item) => {
      lines.push(
        `- ${item.dimension}:${item.value} samples=${item.sampleCount} firstTry=${formatPercent(item.firstTryAccuracy)} hints=${formatPercent(item.hintRate)} risk=${item.riskScore}`,
      );
    });
  }

  if (report.warnings.length > 0) {
    lines.push('Warnings:');
    report.warnings.forEach((warning) => lines.push(`- ${warning}`));
  }

  return `${lines.join('\n')}\n`;
}

function parseArgs(argv) {
  const args = {
    file: DEFAULT_TELEMETRY_PATH,
    childId: '',
    days: 0,
    json: false,
    out: '',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--json') {
      args.json = true;
      continue;
    }

    if (arg === '--file' || arg === '--telemetry') {
      args.file = argv[index + 1] ?? args.file;
      index += 1;
      continue;
    }

    if (arg === '--child-id') {
      args.childId = argv[index + 1] ?? '';
      index += 1;
      continue;
    }

    if (arg === '--days') {
      args.days = asNumber(argv[index + 1], 0);
      index += 1;
      continue;
    }

    if (arg === '--out') {
      args.out = argv[index + 1] ?? '';
      index += 1;
      continue;
    }

    if (arg.startsWith('--')) {
      throw new Error(`Unknown option: ${arg}`);
    }

    if (!arg.startsWith('--')) {
      args.file = arg;
    }
  }

  return args;
}

function filterEvents(events, args, now = Date.now()) {
  const since =
    args.days > 0 ? now - args.days * 24 * 60 * 60 * 1000 : Number.NEGATIVE_INFINITY;

  return events.filter((event) => {
    if (eventAt(event) < since) {
      return false;
    }

    if (!args.childId) {
      return true;
    }

    return event.childId === args.childId || payload(event).childId === args.childId;
  });
}

export function runCli(argv = process.argv.slice(2), cwd = process.cwd()) {
  const args = parseArgs(argv);
  const filePath = resolve(cwd, args.file);

  if (!existsSync(filePath)) {
    throw new Error(`Telemetry file not found: ${filePath}`);
  }

  const { events, malformedLineNumbers } = parseTelemetryJsonl(
    readFileSync(filePath, 'utf8'),
  );
  const report = analyzeTelemetryEvents(filterEvents(events, args), {
    generatedAt: new Date().toISOString(),
  });
  const output = args.json
    ? `${JSON.stringify({ ...report, malformedLineNumbers }, null, 2)}\n`
    : formatMetricsReport({ ...report, malformedLineNumbers });

  if (args.out) {
    const outPath = resolve(cwd, args.out);
    writeFileSync(outPath, output, 'utf8');
  }

  return output;
}

const currentFile = fileURLToPath(import.meta.url);
const invokedFile = process.argv[1] ? fileURLToPath(pathToFileURL(process.argv[1])) : '';

if (currentFile === invokedFile) {
  try {
    process.stdout.write(runCli());
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  }
}

export { DEFAULT_TELEMETRY_PATH };
