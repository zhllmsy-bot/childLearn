import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  analyzeTelemetryEvents,
  formatMetricsReport,
  parseTelemetryJsonl,
  runCli,
} from './analyze_flow_metrics.mjs';

const BASE_CONTEXT = {
  schemaVersion: 'childlearn.telemetry.v2',
  sessionId: 'session-1',
  childId: 'child-1',
  deviceId: 'device-1',
};

function event(name, payload = {}, at = 1000) {
  return {
    ...BASE_CONTEXT,
    eventId: `evt-${name}-${at}-${Math.random()}`,
    name,
    payload,
    at,
  };
}

function completed(index, overrides = {}) {
  return event(
    'question.completed',
    {
      runId: 'run-1',
      questionId: `q-${index}`,
      questionIndex: index,
      skillId: 'count_objects_to_5',
      operationType: 'matching',
      presentationType: 'visual',
      numberRange: 'within_5',
      optionDistance: 'wide',
      packSlotRole: 'core',
      firstAttemptCorrect: true,
      finalCorrect: true,
      hintCount: 0,
      audioReplayCount: 0,
      rapidClickCount: 0,
      idleMs: 0,
      feedbackInterruptClickCount: 0,
      firstResponseTimeMs: 2400,
      totalTimeMs: 2800,
      ...overrides,
    },
    2000 + index,
  );
}

describe('parseTelemetryJsonl', () => {
  it('keeps valid telemetry events and reports malformed lines', () => {
    const result = parseTelemetryJsonl(
      `${JSON.stringify(event('practice.open'))}\nnot-json\n{"payload":{}}\n`,
    );

    expect(result.events).toHaveLength(1);
    expect(result.malformedLineNumbers).toEqual([2, 3]);
  });
});

describe('analyzeTelemetryEvents', () => {
  it('summarizes practice fit, friction, policy outcomes, and risk dimensions', () => {
    const events = [
      event('practice.open', { runId: 'run-1' }, 1000),
      event('question.show', { runId: 'run-1', questionId: 'q-0' }, 1100),
      event('question.show', { runId: 'run-1', questionId: 'q-1' }, 1200),
      event('question.show', { runId: 'run-1', questionId: 'q-2' }, 1300),
      completed(0),
      completed(1, {
        firstAttemptCorrect: false,
        finalCorrect: true,
        hintCount: 1,
        firstResponseTimeMs: 5000,
      }),
      completed(2),
      event(
        'flow.policy_approved',
        {
          batchId: 'batch-1',
          state: 'hard',
          action: 'decrease_pressure',
          adjustmentDimension: 'visual_support',
          source: 'local',
        },
        3000,
      ),
      event(
        'flow.policy_approved',
        {
          batchId: 'batch-1',
          state: 'stretch',
          action: 'maintain_with_support',
          adjustmentDimension: 'visual_support',
          source: 'llm_filtered',
        },
        3100,
      ),
      event('flow.llm_observation_created', { status: 'ready' }, 3200),
      event(
        'flow.next_batch_outcome',
        {
          batchId: 'batch-2',
          appliedState: 'hard',
          appliedAction: 'decrease_pressure',
          outcomeState: 'flow',
        },
        3300,
      ),
    ];

    const report = analyzeTelemetryEvents(events, { generatedAt: 'now' });

    expect(report.practice).toMatchObject({
      runCount: 1,
      questionCount: 3,
      firstTryAccuracy: 0.6667,
      finalAccuracy: 1,
      hintRate: 0.3333,
      flowFitDistribution: { flow: 1 },
    });
    expect(report.coverage.completionPerShowRate).toBe(1);
    expect(report.flowPolicy).toMatchObject({
      policyCount: 2,
      llmObservationReadyCount: 1,
      llmLocalComparableCount: 1,
      llmLocalSameStateRate: 0,
      helpfulOutcomeRate: 1,
    });
    expect(report.topRiskDimensions[0]).toMatchObject({
      sampleCount: 3,
    });
    expect(formatMetricsReport(report)).toContain('ChildLearn Flow Metrics');
  });

  it('warns when completed question data is missing', () => {
    const report = analyzeTelemetryEvents([
      event('question.show', { runId: 'run-1', questionId: 'q-1' }),
    ]);

    expect(report.warnings).toContain(
      'No question.completed events found; effectiveness metrics are limited.',
    );
  });
});

describe('runCli', () => {
  it('filters by recent days and child id without treating option values as files', () => {
    const cwd = mkdtempSync(join(tmpdir(), 'childlearn-flow-metrics-'));
    const filePath = join(cwd, 'events.jsonl');
    const now = Date.now();
    const events = [
      completed(0, { questionId: 'keep' }),
      { ...completed(1, { questionId: 'other-child' }), childId: 'child-2' },
      { ...completed(2, { questionId: 'old' }), at: now - 3 * 24 * 60 * 60 * 1000 },
    ].map((item, index) => ({
      ...item,
      childId: index === 1 ? 'child-2' : 'child-1',
      at: index === 2 ? item.at : now - 1000,
    }));

    writeFileSync(
      filePath,
      events.map((item) => JSON.stringify(item)).join('\n'),
      'utf8',
    );

    const output = JSON.parse(
      runCli(['--file', 'events.jsonl', '--days', '1', '--child-id', 'child-1', '--json'], cwd),
    );

    expect(output.practice.questionCount).toBe(1);
  });
});
