import type {
  BatchMix,
  EvidenceStatement,
  FlowState,
  LearningBatchReport,
  LlmIssueType,
  LlmLearningObservation,
} from './types';
import { parseProfileRefinement } from '../../ai/learnerModel';

const FLOW_STATES = new Set(['easy', 'flow', 'stretch', 'hard', 'fatigue']);
const OBSERVER_STATES = new Set([...FLOW_STATES, 'unstable']);
const ISSUE_TYPES = new Set([
  'skill_gap',
  'cognitive_load',
  'attention_drop',
  'fatigue',
  'ui_confusion',
  'item_design_problem',
  'careless_or_motor_error',
  'uncertain',
]);
const DIRECTIONS = new Set([
  'increase_slightly',
  'maintain',
  'maintain_with_support',
  'decrease_slightly',
  'reduce_batch_or_pace',
  'review_item_quality',
]);
const ADJUSTMENT_DIMENSIONS = new Set([
  'number_range',
  'operation_type',
  'presentation_type',
  'visual_support',
  'option_distance',
  'batch_size',
  'feedback_strength',
  'none',
]);
const EVIDENCE_STRENGTHS = new Set(['low', 'medium', 'high']);

export interface ObserveLearningBatchOptions {
  endpoint?: string;
  timeoutMs?: number;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

function isBatchMix(value: unknown): value is BatchMix {
  if (!isObject(value)) {
    return false;
  }

  return ['confidence', 'review', 'current', 'challenge'].every((key) => {
    const field = value[key];
    return typeof field === 'number' && Number.isFinite(field) && field >= 0;
  });
}

function parseEvidenceStatements(value: unknown): EvidenceStatement[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!isObject(item)) {
      return [];
    }

    const { label, evidenceStrength, sampleCount, reason } = item;
    if (
      typeof label !== 'string' ||
      typeof evidenceStrength !== 'string' ||
      !EVIDENCE_STRENGTHS.has(evidenceStrength) ||
      typeof sampleCount !== 'number' ||
      !Number.isFinite(sampleCount) ||
      typeof reason !== 'string'
    ) {
      return [];
    }

    return [
      {
        label,
        evidenceStrength: evidenceStrength as EvidenceStatement['evidenceStrength'],
        sampleCount,
        reason,
      },
    ];
  });
}

export function parseLlmLearningObservation(
  value: unknown,
): LlmLearningObservation | null {
  if (!isObject(value)) {
    return null;
  }

  const {
    overallState,
    confidence,
    stateReason,
    primaryIssue,
    recommendation,
  } = value;

  if (
    typeof overallState !== 'string' ||
    !OBSERVER_STATES.has(overallState) ||
    typeof confidence !== 'number' ||
    !Number.isFinite(confidence) ||
    confidence < 0 ||
    confidence > 1 ||
    typeof stateReason !== 'string' ||
    typeof primaryIssue !== 'string' ||
    !ISSUE_TYPES.has(primaryIssue) ||
    !isObject(recommendation)
  ) {
    return null;
  }

  const { direction, adjustmentDimension, suggestedMix, avoid } = recommendation;
  if (
    typeof direction !== 'string' ||
    !DIRECTIONS.has(direction) ||
    typeof adjustmentDimension !== 'string' ||
    !ADJUSTMENT_DIMENSIONS.has(adjustmentDimension) ||
    !isBatchMix(suggestedMix)
  ) {
    return null;
  }

  return {
    overallState: overallState as FlowState | 'unstable',
    confidence,
    stateReason,
    primaryIssue: primaryIssue as LlmIssueType,
    masteredSkills: parseEvidenceStatements(value.masteredSkills),
    weakSkills: parseEvidenceStatements(value.weakSkills),
    riskSignals: asStringArray(value.riskSignals),
    doNotInfer: asStringArray(value.doNotInfer),
    recommendation: {
      direction: direction as LlmLearningObservation['recommendation']['direction'],
      adjustmentDimension:
        adjustmentDimension as LlmLearningObservation['recommendation']['adjustmentDimension'],
      suggestedMix,
      avoid: asStringArray(avoid),
    },
    uxSuggestions: asStringArray(value.uxSuggestions),
    profileRefinement:
      parseProfileRefinement(value.profileRefinement) ?? undefined,
  };
}

export async function observeLearningBatch(
  report: LearningBatchReport,
  { endpoint, timeoutMs = 4500 }: ObserveLearningBatchOptions = {},
): Promise<LlmLearningObservation | null> {
  const cleanEndpoint = endpoint?.trim();
  if (!cleanEndpoint) {
    return null;
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(cleanEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        schemaVersion: 'childlearn.flow-observer.v1',
        role: 'learning_observer_not_decider',
        report,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as unknown;
    const candidate =
      isObject(payload) && 'observation' in payload ? payload.observation : payload;

    return parseLlmLearningObservation(candidate);
  } catch {
    return null;
  } finally {
    window.clearTimeout(timeoutId);
  }
}
