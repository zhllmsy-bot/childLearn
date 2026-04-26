import type { ProfileRefinement } from '../../ai/learnerModel';
import type { QuestionVariant } from '../../curriculum/types';

export type FlowState = 'easy' | 'flow' | 'stretch' | 'hard' | 'fatigue';

export type NumberRange = 'within_5' | 'within_10' | 'within_20' | 'within_30';

export type OperationType =
  | 'matching'
  | 'compare'
  | 'addition'
  | 'subtraction'
  | 'mixed';

export type PresentationType =
  | 'visual'
  | 'semi_visual'
  | 'pure_number'
  | 'story'
  | 'number_line';

export type VisualSupport = 'strong' | 'medium' | 'weak' | 'none';

export type OptionDistance = 'wide' | 'medium' | 'close';

export type DifficultyLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface QuestionDifficultyTags {
  numberRange: NumberRange;
  operationType: OperationType;
  presentationType: PresentationType;
  visualSupport: VisualSupport;
  crossTen: boolean;
  carryOrBorrow: boolean;
  optionDistance: OptionDistance;
  difficultyLevel: DifficultyLevel;
}

export interface QuestionAttemptRecord {
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
  result: 'correct' | 'wrong_first_then_correct' | 'wrong_final' | 'abandoned';
}

export interface BatchSummarySlice {
  count: number;
  firstTryAccuracy: number;
  finalAccuracy: number;
  hintRate: number;
  audioReplayRate: number;
  avgFirstResponseTimeMs: number;
  rapidClickCount: number;
  idleCount: number;
}

export interface TagPerformanceSlice {
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

export interface LearningBatchSummary extends BatchSummarySlice {
  correctionRateAfterFirstWrong: number;
  avgTotalTimeMs: number;
  wrongFinalCount: number;
  abandonedCount: number;
  longestWrongFinalStreak: number;
}

export interface LearningBatchReport {
  batchId: string;
  childAgeMonths?: number;
  questionCount: number;
  currentDifficulty: number;
  rulePreState: FlowState;
  summary: LearningBatchSummary;
  firstHalfSummary: BatchSummarySlice;
  secondHalfSummary: BatchSummarySlice;
  byTag: TagPerformanceSlice[];
  attempts: QuestionAttemptRecord[];
}

export interface ChildBehaviorBaseline {
  avgFirstResponseTimeMs?: number;
  hintRate?: number;
  audioReplayRate?: number;
}

export interface LearningBatchReportInput {
  batchId: string;
  childAgeMonths?: number;
  currentDifficulty: number;
  attempts: QuestionAttemptRecord[];
  baseline?: ChildBehaviorBaseline;
}

export interface BatchMix {
  confidence: number;
  review: number;
  current: number;
  challenge: number;
}

export type LlmIssueType =
  | 'skill_gap'
  | 'cognitive_load'
  | 'attention_drop'
  | 'fatigue'
  | 'ui_confusion'
  | 'item_design_problem'
  | 'careless_or_motor_error'
  | 'uncertain';

export interface EvidenceStatement {
  label: string;
  evidenceStrength: 'low' | 'medium' | 'high';
  sampleCount: number;
  reason: string;
}

export interface LlmLearningObservation {
  overallState: FlowState | 'unstable';
  confidence: number;
  stateReason: string;
  primaryIssue: LlmIssueType;
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
  profileRefinement?: ProfileRefinement;
  nextItemSuggestion?: {
    reason: string;
    targetSkillKey: string;
    targetTheta: number;
    variant: QuestionVariant;
  };
}

export interface ApprovedFlowPolicy {
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
