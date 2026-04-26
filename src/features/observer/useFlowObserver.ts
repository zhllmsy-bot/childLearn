import { useCallback, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import {
  buildAdaptiveQuestionPayload,
  requestColdStartProbeQuestion,
  requestCoPilotQuestion,
  requestCrossTenQuestion,
  requestStoryPolish,
} from '../../ai/api/childlearnAi';
import { buildColdStartProbePayload } from '../../ai/coldStartAgent';
import { llmConfidenceWeight } from '../../ai/llmConfidence';
import type { LearnerProfile, ProfileRefinement } from '../../ai/learnerModel';
import { generateQuestion } from '../../curriculum/questionFactory';
import {
  DIAGNOSTIC_QUESTION_COUNT,
  getDiagnosticQuestion,
} from '../../curriculum/diagnostic/diagnosticPlan';
import { selectLevelPackQuestionPlan, type LevelPackId } from '../../curriculum/levelPacks';
import { readParentItemsFromStorage } from '../../curriculum/parentItems';
import type { ReviewItem } from '../../curriculum/reviewQueue';
import type { Question } from '../../curriculum/types';
import {
  FLOW_OBSERVER_TIMEOUT_MS,
  FLOW_OBSERVER_URL,
  INTERIM_FLOW_EVALUATION_INTERVAL,
  type FlowEvaluationTrigger,
  type FlowObserverStatus,
  type PracticeRunMode,
  type StoredAppSnapshot,
} from '../../app/appState';
import {
  approveFlowPolicy,
  composeFlowPlan,
  createLearningBatchReport,
  observeLearningBatch,
  type ApprovedFlowPolicy,
  type FlowState,
  type LearningBatchReport,
  type LlmLearningObservation,
  type QuestionAttemptRecord,
} from '../../engagement/flow';
import { fingerprintStem } from '../../engagement/flow/fingerprint';
import { track } from '../../telemetry/track';

interface DifficultyController {
  applyDifficulty: (difficulty: number) => void;
}

interface LearnerRefiner {
  applyRefinement: (refinement: ProfileRefinement) => unknown;
}

interface UseFlowObserverInput {
  activeLevelPackIdRef: MutableRefObject<LevelPackId | null>;
  initialAppSnapshot: StoredAppSnapshot | null;
  learner: LearnerRefiner;
  learnerProfileRef: MutableRefObject<LearnerProfile>;
  practiceRunIdRef: MutableRefObject<string | null>;
  questionHistoryRef: MutableRefObject<QuestionAttemptRecord[]>;
  reviewQueueRef: MutableRefObject<ReviewItem[]>;
  dda: DifficultyController;
}

interface ComposedPlanRefValue {
  endSerialExclusive: number;
  signature: string;
  startSerial: number;
  plans: ReturnType<typeof composeFlowPlan>['plans'];
}

function planSignature(
  policyBatchId: string | null,
  observation: LlmLearningObservation | null,
  runMode: PracticeRunMode,
) {
  return JSON.stringify({
    policyBatchId,
    runMode,
    observationState: observation?.overallState ?? null,
    observationConfidence: observation?.confidence ?? null,
    nextSkill: observation?.nextItemSuggestion?.targetSkillKey ?? null,
    nextVariant: observation?.nextItemSuggestion?.variant ?? null,
  });
}

function shouldTryStoryPolish(question: Question, serial: number) {
  return question.variant === 'story' && question.source === 'pcg' && serial % 3 === 1;
}

function stemForQuestion(question: Question) {
  const prompt = question.prompt.trim();
  const expression = question.expression.trim();

  if (question.variant === 'story') {
    return prompt || expression;
  }

  return expression || prompt;
}

function questionFingerprint(question: Question) {
  return fingerprintStem(stemForQuestion(question));
}

function buildStoryPolishPayload(question: Question) {
  const [first, second] = question.barModel;
  if (
    !Number.isFinite(first) ||
    !Number.isFinite(second) ||
    Math.round(first + second) !== Math.round(question.answer)
  ) {
    return null;
  }

  return {
    answer: question.answer,
    currentPrompt: question.prompt,
    expression: question.expression,
    first,
    second,
  };
}

function coPilotAcceptance({
  confidence,
  estimatedTheta,
  fingerprint,
  recentFingerprints,
  targetTheta,
}: {
  confidence: number;
  estimatedTheta: number | null;
  fingerprint: string;
  recentFingerprints: string[];
  targetTheta?: number;
}) {
  if (recentFingerprints.includes(fingerprint)) {
    return { accepted: false, reason: 'duplicate_fingerprint' } as const;
  }

  if (
    targetTheta !== undefined &&
    estimatedTheta !== null &&
    Math.abs(estimatedTheta - targetTheta) > 0.25
  ) {
    return { accepted: false, reason: 'target_theta_miss' } as const;
  }

  const confidenceWeight = llmConfidenceWeight(confidence, {
    minConfidence: 0.35,
    fullConfidence: 0.8,
    maxInfluence: 1,
  });
  if (confidenceWeight < 0.45) {
    return { accepted: false, reason: 'low_confidence' } as const;
  }

  return { accepted: true, reason: 'accepted' } as const;
}

export function useFlowObserver({
  activeLevelPackIdRef,
  initialAppSnapshot,
  learner,
  learnerProfileRef,
  practiceRunIdRef,
  questionHistoryRef,
  reviewQueueRef,
  dda,
}: UseFlowObserverInput) {
  const [flowShadowReport, setFlowShadowReport] =
    useState<LearningBatchReport | null>(() => initialAppSnapshot?.flowShadowReport ?? null);
  const [flowShadowPolicy, setFlowShadowPolicyState] =
    useState<ApprovedFlowPolicy | null>(() => initialAppSnapshot?.flowShadowPolicy ?? null);
  const [flowObservation, setFlowObservationState] =
    useState<LlmLearningObservation | null>(() => initialAppSnapshot?.flowObservation ?? null);
  const [flowObserverStatus, setFlowObserverStatus] =
    useState<FlowObserverStatus>(
      () =>
        initialAppSnapshot?.flowObserverStatus ??
        (FLOW_OBSERVER_URL ? 'idle' : 'unconfigured'),
    );
  const currentRunPolicyRef = useRef<ApprovedFlowPolicy | null>(
    initialAppSnapshot?.currentRunPolicy ?? null,
  );
  const currentRunPolicyBatchIdRef = useRef<string | null>(
    initialAppSnapshot?.currentRunPolicyBatchId ?? null,
  );
  const currentRunModeRef = useRef<PracticeRunMode>(
    initialAppSnapshot?.currentRunMode ?? 'level',
  );
  const diagnosticRunSeedRef = useRef<number | null>(
    initialAppSnapshot?.diagnosticRunSeed ?? null,
  );
  const flowObservationRef = useRef<LlmLearningObservation | null>(
    initialAppSnapshot?.flowObservation ?? null,
  );
  const flowObserverRequestIdRef = useRef(0);
  const lastEvaluatedAttemptCountRef = useRef(0);
  const recentFlowStatesRef = useRef<FlowState[]>(
    initialAppSnapshot?.recentFlowStates ?? [],
  );
  const composedPlanRef = useRef<ComposedPlanRefValue | null>(null);

  const invalidateComposedPlan = useCallback(() => {
    composedPlanRef.current = null;
  }, []);

  const setFlowShadowPolicy = useCallback((policy: ApprovedFlowPolicy | null) => {
    setFlowShadowPolicyState(policy);
    invalidateComposedPlan();
  }, [invalidateComposedPlan]);

  const setFlowObservation = useCallback((observation: LlmLearningObservation | null) => {
    flowObservationRef.current = observation;
    setFlowObservationState(observation);
    invalidateComposedPlan();
  }, [invalidateComposedPlan]);

  const loadAdaptiveQuestion = useCallback(async (difficulty: number, serial: number) => {
    if (currentRunModeRef.current === 'diagnostic' && serial < DIAGNOSTIC_QUESTION_COUNT) {
      const coldStartPayload = buildColdStartProbePayload({
        ageMonths: 60,
        records: questionHistoryRef.current,
        serial,
        totalProbes: DIAGNOSTIC_QUESTION_COUNT,
      });
      const probeResult = await requestColdStartProbeQuestion(coldStartPayload);
      if (probeResult?.question) {
        track('diagnostic.probe_question', {
          confidence: probeResult.confidence,
          estimatedTheta: probeResult.estimatedTheta,
          probeIndex: coldStartPayload.probeIndex,
          questionId: probeResult.question.id,
          remainingProbes: coldStartPayload.remainingProbes,
          source: 'llm',
          variant: probeResult.question.variant,
        });
        return probeResult.question;
      }

      track('diagnostic.probe_question', {
        confidence: null,
        estimatedTheta: null,
        probeIndex: coldStartPayload.probeIndex,
        questionId: null,
        remainingProbes: coldStartPayload.remainingProbes,
        source: 'fallback',
        variant: null,
      });
      return getDiagnosticQuestion(serial, diagnosticRunSeedRef.current ?? 1);
    }

    const queuedReview = reviewQueueRef.current[0];
    if (queuedReview && serial > 0 && serial % 4 === 0) {
      return {
        ...queuedReview.question,
        id: `${queuedReview.question.id}-review-${serial}`,
      };
    }

    const signature = planSignature(
      currentRunPolicyBatchIdRef.current,
      flowObservationRef.current,
      currentRunModeRef.current,
    );
    if (
      !composedPlanRef.current ||
      composedPlanRef.current.signature !== signature ||
      serial < composedPlanRef.current.startSerial ||
      serial >= composedPlanRef.current.endSerialExclusive
    ) {
      const composed = composeFlowPlan({
        learnerProfile: learnerProfileRef.current,
        policy: currentRunPolicyRef.current,
        observation: flowObservationRef.current,
        fallbackDifficulty: difficulty,
        serialStart: serial,
      });
      composedPlanRef.current = {
        startSerial: serial,
        endSerialExclusive: serial + composed.plans.length,
        signature,
        plans: composed.plans,
      };
    }

    const plan =
      composedPlanRef.current?.plans[serial - (composedPlanRef.current?.startSerial ?? serial)] ??
      composeFlowPlan({
        learnerProfile: learnerProfileRef.current,
        policy: currentRunPolicyRef.current,
        observation: flowObservationRef.current,
        fallbackDifficulty: difficulty,
        serialStart: serial,
      }).plans[0];
    const packId = activeLevelPackIdRef.current;
    const packPlan = packId
      ? selectLevelPackQuestionPlan({
          packId,
          difficulty: plan.difficulty,
          serial,
          flowLane: plan.lane,
          flowVariant: plan.variant,
        })
      : null;
    const effectiveDifficulty = packPlan?.difficulty ?? plan.difficulty;
    const effectiveVariant = packPlan?.variant ?? plan.variant;
    const buildFallbackQuestion = async () => {
      const question = generateQuestion({
        childId: learnerProfileRef.current?.childId ?? 'local-child',
        difficulty: effectiveDifficulty,
        goldenMode: 'eligible',
        parentItemMode: 'eligible',
        parentItems: readParentItemsFromStorage(),
        serial,
        targetSkillKey: plan.targetSkillKey,
        variant: effectiveVariant,
      });
      if (!shouldTryStoryPolish(question, serial)) {
        return question;
      }

      const storyPayload = buildStoryPolishPayload(question);
      if (!storyPayload) {
        track('question.story_polish', {
          questionId: question.id,
          result: 'skipped_invalid_skeleton',
          serial,
        });
        return question;
      }

      const polishedPrompt = await requestStoryPolish(storyPayload);
      if (!polishedPrompt || polishedPrompt === question.prompt) {
        track('question.story_polish', {
          questionId: question.id,
          result: polishedPrompt ? 'unchanged' : 'fallback',
          serial,
        });
        return question;
      }

      track('question.story_polish', {
        questionId: question.id,
        result: 'applied',
        serial,
      });
      return {
        ...question,
        prompt: polishedPrompt,
        source: 'pcg+llm' as const,
      };
    };
    const coPilotPayload = buildAdaptiveQuestionPayload({
      difficulty: effectiveDifficulty,
      history: questionHistoryRef.current,
      lane: plan.lane,
      learnerProfile: learnerProfileRef.current,
      reasoningMode: plan.reasoningMode,
      serial,
      targetSkillKey: plan.targetSkillKey,
      targetTheta: plan.targetTheta,
      variant: effectiveVariant,
    });
    if (plan.targetSkillKey === 'crossTenBridge' && plan.reasoningMode === 'multiStep') {
      const crossTenResult = await requestCrossTenQuestion(coPilotPayload);
      if (crossTenResult) {
        const fingerprint = questionFingerprint(crossTenResult.question);
        const acceptance = coPilotAcceptance({
          confidence: crossTenResult.confidence,
          estimatedTheta: crossTenResult.estimatedTheta,
          fingerprint,
          recentFingerprints: coPilotPayload.recentFingerprints,
          targetTheta: coPilotPayload.target.targetTheta,
        });

        track('question.cross_ten_co_pilot', {
          confidence: crossTenResult.confidence,
          estimatedTheta: crossTenResult.estimatedTheta,
          lane: plan.lane,
          questionId: crossTenResult.question.id,
          reason: acceptance.reason,
          serial,
          source: acceptance.accepted ? 'llm' : 'fallback',
          targetSkillKey: plan.targetSkillKey,
          targetTheta: coPilotPayload.target.targetTheta,
          variant: crossTenResult.question.variant,
        });

        if (acceptance.accepted) {
          return crossTenResult.question;
        }
      } else {
        track('question.cross_ten_co_pilot', {
          confidence: null,
          estimatedTheta: null,
          lane: plan.lane,
          questionId: null,
          reason: 'no_response',
          serial,
          source: 'fallback',
          targetSkillKey: plan.targetSkillKey,
          targetTheta: coPilotPayload.target.targetTheta,
          variant: effectiveVariant ?? null,
        });
      }
    }
    const coPilotResult = await requestCoPilotQuestion(coPilotPayload);
    if (coPilotResult) {
      const fingerprint = questionFingerprint(coPilotResult.question);
      const acceptance = coPilotAcceptance({
        confidence: coPilotResult.confidence,
        estimatedTheta: coPilotResult.estimatedTheta,
        fingerprint,
        recentFingerprints: coPilotPayload.recentFingerprints,
        targetTheta: coPilotPayload.target.targetTheta,
      });

      track('question.co_pilot', {
        confidence: coPilotResult.confidence,
        estimatedTheta: coPilotResult.estimatedTheta,
        lane: plan.lane,
        questionId: coPilotResult.question.id,
        reason: acceptance.reason,
        serial,
        source: acceptance.accepted ? 'llm' : 'fallback',
        targetSkillKey: plan.targetSkillKey ?? null,
        targetTheta: coPilotPayload.target.targetTheta,
        variant: coPilotResult.question.variant,
      });

      if (acceptance.accepted) {
        return coPilotResult.question;
      }
    } else {
      track('question.co_pilot', {
        confidence: null,
        estimatedTheta: null,
        lane: plan.lane,
        questionId: null,
        reason: 'no_response',
        serial,
        source: 'fallback',
        targetSkillKey: plan.targetSkillKey ?? null,
        targetTheta: coPilotPayload.target.targetTheta,
        variant: effectiveVariant ?? null,
      });
    }

    return buildFallbackQuestion();
  }, [activeLevelPackIdRef, learnerProfileRef, questionHistoryRef, reviewQueueRef]);

  const clearFlowState = useCallback(() => {
    flowObserverRequestIdRef.current += 1;
    lastEvaluatedAttemptCountRef.current = 0;
    currentRunPolicyRef.current = null;
    currentRunPolicyBatchIdRef.current = null;
    setFlowShadowReport(null);
    setFlowShadowPolicy(null);
    setFlowObservation(null);
    setFlowObserverStatus(FLOW_OBSERVER_URL ? 'idle' : 'unconfigured');
    invalidateComposedPlan();
  }, [invalidateComposedPlan, setFlowObservation, setFlowShadowPolicy]);

  const createFlowShadowPolicy = useCallback(
    (
      records: QuestionAttemptRecord[],
      currentDifficulty: number,
      trigger: FlowEvaluationTrigger,
    ) => {
      const batchId = `${trigger}-batch-${Date.now()}-${records.length}`;
      const runId = practiceRunIdRef.current;
      const requestId = flowObserverRequestIdRef.current + 1;
      const previousFlowStates = recentFlowStatesRef.current;
      const appliedPolicy = currentRunPolicyRef.current;
      const appliedPolicyBatchId = currentRunPolicyBatchIdRef.current;
      flowObserverRequestIdRef.current = requestId;
      const report = createLearningBatchReport({
        batchId,
        currentDifficulty,
        attempts: records,
      });
      const policy = approveFlowPolicy({
        report,
        recentStates: previousFlowStates,
      });

      recentFlowStatesRef.current = [...previousFlowStates, policy.finalState].slice(-5);
      setFlowShadowReport(report);
      setFlowShadowPolicy(policy);
      setFlowObservation(null);
      if (trigger === 'interim') {
        currentRunPolicyRef.current = policy;
        currentRunPolicyBatchIdRef.current = batchId;
      }
      track('flow.batch_report_created', {
        runId,
        batchId,
        trigger,
        state: report.rulePreState,
        questionCount: report.questionCount,
        firstTryAccuracy: report.summary.firstTryAccuracy,
        finalAccuracy: report.summary.finalAccuracy,
        correctionRateAfterFirstWrong: report.summary.correctionRateAfterFirstWrong,
        avgFirstResponseTimeMs: report.summary.avgFirstResponseTimeMs,
        avgTotalTimeMs: report.summary.avgTotalTimeMs,
        hintRate: report.summary.hintRate,
        audioReplayRate: report.summary.audioReplayRate,
        wrongFinalCount: report.summary.wrongFinalCount,
        abandonedCount: report.summary.abandonedCount,
        longestWrongFinalStreak: report.summary.longestWrongFinalStreak,
        rapidClickCount: report.summary.rapidClickCount,
        idleCount: report.summary.idleCount,
      });
      track('flow.next_batch_outcome', {
        runId,
        batchId,
        trigger,
        appliedPolicyBatchId,
        appliedState: appliedPolicy?.finalState ?? null,
        appliedAction: appliedPolicy?.finalAction ?? null,
        appliedNextDifficulty: appliedPolicy?.nextDifficulty ?? null,
        appliedBatchSize: appliedPolicy?.batchSize ?? null,
        outcomeState: report.rulePreState,
        firstTryAccuracy: report.summary.firstTryAccuracy,
        finalAccuracy: report.summary.finalAccuracy,
        correctionRateAfterFirstWrong: report.summary.correctionRateAfterFirstWrong,
        hintRate: report.summary.hintRate,
        audioReplayRate: report.summary.audioReplayRate,
        wrongFinalCount: report.summary.wrongFinalCount,
        abandonedCount: report.summary.abandonedCount,
        longestWrongFinalStreak: report.summary.longestWrongFinalStreak,
      });
      track('flow.policy_approved', {
        runId,
        batchId,
        trigger,
        state: policy.finalState,
        action: policy.finalAction,
        nextDifficulty: policy.nextDifficulty,
        batchSize: policy.batchSize,
        mixConfidence: policy.mix.confidence,
        mixReview: policy.mix.review,
        mixCurrent: policy.mix.current,
        mixChallenge: policy.mix.challenge,
        adjustmentDimension: policy.adjustmentDimension,
        source: 'local',
      });
      dda.applyDifficulty(policy.nextDifficulty);

      if (!FLOW_OBSERVER_URL) {
        setFlowObserverStatus('unconfigured');
        return policy;
      }

      setFlowObserverStatus('pending');
      void observeLearningBatch(report, {
        endpoint: FLOW_OBSERVER_URL,
        timeoutMs: FLOW_OBSERVER_TIMEOUT_MS,
      }).then((observation) => {
        if (flowObserverRequestIdRef.current !== requestId) {
          return;
        }

        if (!observation) {
          setFlowObserverStatus('failed');
          track('flow.llm_observation_created', {
            runId,
            batchId,
            trigger,
            status: 'failed',
          });
          return;
        }

        const filteredPolicy = approveFlowPolicy({
          report,
          recentStates: previousFlowStates,
          observation,
        });
        if (observation.profileRefinement) {
          learner.applyRefinement(observation.profileRefinement);
        }

        recentFlowStatesRef.current = [
          ...previousFlowStates,
          filteredPolicy.finalState,
        ].slice(-5);
        setFlowObservation(observation);
        setFlowObserverStatus('ready');
        setFlowShadowPolicy(filteredPolicy);
        if (trigger === 'interim') {
          currentRunPolicyRef.current = filteredPolicy;
          currentRunPolicyBatchIdRef.current = batchId;
        }
        dda.applyDifficulty(filteredPolicy.nextDifficulty);
        track('flow.llm_observation_created', {
          runId,
          batchId,
          trigger,
          status: 'ready',
          state: observation.overallState,
          confidence: observation.confidence,
          issue: observation.primaryIssue,
          direction: observation.recommendation.direction,
          adjustmentDimension: observation.recommendation.adjustmentDimension,
          profileRefinementApplied: Boolean(observation.profileRefinement),
        });
        track('flow.policy_approved', {
          runId,
          batchId,
          trigger,
          state: filteredPolicy.finalState,
          action: filteredPolicy.finalAction,
          nextDifficulty: filteredPolicy.nextDifficulty,
          batchSize: filteredPolicy.batchSize,
          mixConfidence: filteredPolicy.mix.confidence,
          mixReview: filteredPolicy.mix.review,
          mixCurrent: filteredPolicy.mix.current,
          mixChallenge: filteredPolicy.mix.challenge,
          adjustmentDimension: filteredPolicy.adjustmentDimension,
          source: 'llm_filtered',
        });
      });

      return policy;
    },
    [
      dda,
      flowShadowReport,
      invalidateComposedPlan,
      learner,
      practiceRunIdRef,
      setFlowObservation,
      setFlowShadowPolicy,
    ],
  );

  const maybeCreateInterimFlowPolicy = useCallback(
    (records: QuestionAttemptRecord[], currentDifficulty: number, levelQuestionGoal: number) => {
      if (
        records.length < INTERIM_FLOW_EVALUATION_INTERVAL ||
        records.length >= levelQuestionGoal ||
        records.length % INTERIM_FLOW_EVALUATION_INTERVAL !== 0 ||
        lastEvaluatedAttemptCountRef.current >= records.length
      ) {
        return null;
      }

      lastEvaluatedAttemptCountRef.current = records.length;
      return createFlowShadowPolicy(records, currentDifficulty, 'interim');
    },
    [createFlowShadowPolicy],
  );

  return {
    clearFlowState,
    createFlowShadowPolicy,
    currentRunModeRef,
    currentRunPolicyBatchIdRef,
    currentRunPolicyRef,
    diagnosticRunSeedRef,
    flowObservation,
    flowObservationRef,
    flowObserverRequestIdRef,
    flowObserverStatus,
    flowShadowPolicy,
    flowShadowReport,
    invalidateComposedPlan,
    lastEvaluatedAttemptCountRef,
    loadAdaptiveQuestion,
    maybeCreateInterimFlowPolicy,
    recentFlowStatesRef,
    setFlowObserverStatus,
    setFlowObservation,
    setFlowShadowPolicy,
    setFlowShadowReport,
  };
}
