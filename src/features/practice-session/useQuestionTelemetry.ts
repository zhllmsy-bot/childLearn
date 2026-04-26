import { useCallback, useEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';
import {
  QUESTION_IDLE_THRESHOLD_MS,
  RAPID_CLICK_THRESHOLD_MS,
  type ActiveQuestionTelemetry,
  type AppScene,
  type StoredAppSnapshot,
} from '../../app/appState';
import {
  getLevelPackById,
  selectLevelPackItem,
  type LevelPackId,
} from '../../curriculum/levelPacks';
import type { Question, QuestionOption } from '../../curriculum/types';
import { deriveQuestionDifficultyTags, type QuestionAttemptRecord } from '../../engagement/flow';
import { track } from '../../telemetry/track';

interface UseQuestionTelemetryInput {
  activeLevelPackIdRef: MutableRefObject<LevelPackId | null>;
  answered: boolean;
  currentRunPolicyBatchIdRef: MutableRefObject<string | null>;
  currentRunPolicyRef: MutableRefObject<{
    finalAction: string;
    finalState: string;
  } | null>;
  initialAppSnapshot: StoredAppSnapshot | null;
  practiceRunIdRef: MutableRefObject<string | null>;
  question: Question;
  questionIndex: number;
  scene: AppScene;
  selectedOptionId: string | null;
}

function stemForQuestion(question: Question) {
  const prompt = question.prompt.trim();
  const expression = question.expression.trim();

  if (question.variant === 'story') {
    return prompt || expression;
  }

  return expression || prompt;
}

export function useQuestionTelemetry({
  activeLevelPackIdRef,
  answered,
  currentRunPolicyBatchIdRef,
  currentRunPolicyRef,
  initialAppSnapshot,
  practiceRunIdRef,
  question,
  questionIndex,
  scene,
  selectedOptionId,
}: UseQuestionTelemetryInput) {
  const activeQuestionTelemetryRef = useRef<ActiveQuestionTelemetry | null>(
    initialAppSnapshot?.activeQuestionTelemetry ?? null,
  );

  const questionEventPayload = useCallback(
    (
      targetQuestion: Question,
      targetQuestionIndex: number,
      extra: Record<string, string | number | boolean | null | undefined> = {},
    ) => {
      const tags = deriveQuestionDifficultyTags(targetQuestion);
      const packId = activeLevelPackIdRef.current;
      const pack = packId ? getLevelPackById(packId) : null;
      const packItem = packId ? selectLevelPackItem(packId, targetQuestionIndex) : null;

      return {
        runId: practiceRunIdRef.current,
        questionId: targetQuestion.id,
        questionIndex: targetQuestionIndex,
        questionSource: targetQuestion.source,
        level: targetQuestion.level,
        variant: targetQuestion.variant,
        fact: targetQuestion.factId,
        levelPackId: packId,
        levelPackTitle: pack?.title ?? null,
        skillId: packItem?.skillId ?? null,
        packSlotRole: packItem?.role ?? null,
        numberRange: tags.numberRange,
        operationType: tags.operationType,
        presentationType: tags.presentationType,
        visualSupport: tags.visualSupport,
        optionDistance: tags.optionDistance,
        crossTen: tags.crossTen,
        carryOrBorrow: tags.carryOrBorrow,
        difficultyLevel: tags.difficultyLevel,
        ...extra,
      };
    },
    [activeLevelPackIdRef, practiceRunIdRef],
  );

  const beginQuestionTelemetry = useCallback(
    (targetQuestion: Question, targetQuestionIndex: number) => {
      const now = Date.now();
      activeQuestionTelemetryRef.current = {
        questionId: targetQuestion.id,
        questionIndex: targetQuestionIndex,
        startedAtMs: now,
        lastInteractionAtMs: now,
        firstSelectedAnswer: null,
        firstResponseTimeMs: null,
        attemptCount: 0,
        audioReplayCount: 0,
        hintCount: 0,
        idleMs: 0,
        idleNotified: false,
        rapidClickCount: 0,
        feedbackInterruptClickCount: 0,
        abandoned: false,
      };
    },
    [],
  );

  const recordAnswerAttempt = useCallback(
    (targetQuestion: Question, option: QuestionOption, nextHintStage: number) => {
      const now = Date.now();

      if (
        !activeQuestionTelemetryRef.current ||
        activeQuestionTelemetryRef.current.questionId !== targetQuestion.id
      ) {
        beginQuestionTelemetry(targetQuestion, questionIndex);
      }

      const telemetry = activeQuestionTelemetryRef.current;
      if (!telemetry) {
        return;
      }

      if (telemetry.attemptCount === 0) {
        telemetry.firstSelectedAnswer = option.value;
        telemetry.firstResponseTimeMs = now - telemetry.startedAtMs;
        if (telemetry.firstResponseTimeMs <= RAPID_CLICK_THRESHOLD_MS) {
          telemetry.rapidClickCount += 1;
          track(
            'question.rapid_click_detected',
            questionEventPayload(targetQuestion, questionIndex, {
              responseTimeMs: telemetry.firstResponseTimeMs,
              thresholdMs: RAPID_CLICK_THRESHOLD_MS,
              selectedValue: option.value,
            }),
          );
        }
      }

      telemetry.lastInteractionAtMs = now;
      telemetry.attemptCount += 1;
      telemetry.hintCount = Math.max(telemetry.hintCount, nextHintStage);
      return telemetry;
    },
    [beginQuestionTelemetry, questionEventPayload, questionIndex],
  );

  const createCompletedAttemptRecord = useCallback(
    (
      targetQuestion: Question,
      option: QuestionOption,
      overrides: Partial<QuestionAttemptRecord> = {},
    ): QuestionAttemptRecord => {
      const now = Date.now();
      const telemetry =
        activeQuestionTelemetryRef.current ??
        ({
          questionId: targetQuestion.id,
          questionIndex,
          startedAtMs: now,
          lastInteractionAtMs: now,
          firstSelectedAnswer: option.value,
          firstResponseTimeMs: 0,
          attemptCount: 1,
          audioReplayCount: 0,
          hintCount: 0,
          idleMs: 0,
          idleNotified: false,
          rapidClickCount: 0,
          feedbackInterruptClickCount: 0,
          abandoned: false,
        } satisfies ActiveQuestionTelemetry);
      const finalSelectedAnswer = overrides.finalSelectedAnswer ?? option.value;
      const finalCorrect =
        overrides.finalCorrect ?? finalSelectedAnswer === targetQuestion.answer;
      const firstAttemptCorrect =
        overrides.firstAttemptCorrect ?? (telemetry.attemptCount === 1 && finalCorrect);

      return {
        questionId: targetQuestion.id,
        questionIndex: overrides.questionIndex ?? telemetry.questionIndex,
        tags: deriveQuestionDifficultyTags(targetQuestion),
        stem: overrides.stem ?? stemForQuestion(targetQuestion),
        choices: overrides.choices ?? targetQuestion.options.map((candidate) =>
          candidate.label.trim() || String(candidate.value),
        ),
        correctAnswer: overrides.correctAnswer ?? targetQuestion.answer,
        childAnswer: overrides.childAnswer ?? (option.label.trim() || String(option.value)),
        firstSelectedAnswer: telemetry.firstSelectedAnswer,
        finalSelectedAnswer,
        firstAttemptCorrect,
        finalCorrect,
        attemptCount: telemetry.attemptCount,
        reactionTimeMs:
          telemetry.firstResponseTimeMs ?? Math.max(0, now - telemetry.startedAtMs),
        firstResponseTimeMs: telemetry.firstResponseTimeMs ?? 0,
        totalTimeMs: now - telemetry.startedAtMs,
        audioReplayCount: telemetry.audioReplayCount,
        hintCount: telemetry.hintCount,
        idleMs: telemetry.idleMs,
        rapidClickCount: telemetry.rapidClickCount,
        feedbackInterruptClickCount: telemetry.feedbackInterruptClickCount,
        abandoned: telemetry.abandoned,
        result:
          overrides.result ??
          (finalCorrect
            ? firstAttemptCorrect
              ? 'correct'
              : 'wrong_first_then_correct'
            : 'wrong_final'),
        strategyUse: overrides.strategyUse,
      };
    },
    [questionIndex],
  );

  const trackActiveQuestionAbandoned = useCallback(
    (reason: string) => {
      if (scene !== 'practice' || answered) {
        return;
      }

      const telemetry = activeQuestionTelemetryRef.current;
      if (!telemetry || telemetry.questionId !== question.id || telemetry.abandoned) {
        return;
      }

      const now = Date.now();
      telemetry.abandoned = true;
      telemetry.idleMs = Math.max(
        telemetry.idleMs ?? 0,
        now - (telemetry.lastInteractionAtMs || telemetry.startedAtMs),
      );
      telemetry.lastInteractionAtMs = now;

      track(
        'question.abandoned',
        questionEventPayload(question, questionIndex, {
          reason,
          elapsedMs: now - telemetry.startedAtMs,
          attemptCount: telemetry.attemptCount,
          firstSelectedAnswer: telemetry.firstSelectedAnswer,
          idleMs: telemetry.idleMs,
        }),
      );
    },
    [answered, question, questionEventPayload, questionIndex, scene],
  );

  useEffect(() => {
    track(
      'question.show',
      questionEventPayload(question, questionIndex, {
        appliedPolicyBatchId: currentRunPolicyBatchIdRef.current,
        appliedFlowState: currentRunPolicyRef.current?.finalState ?? null,
        appliedFlowAction: currentRunPolicyRef.current?.finalAction ?? null,
      }),
    );
  }, [
    currentRunPolicyBatchIdRef,
    currentRunPolicyRef,
    question,
    questionEventPayload,
    questionIndex,
  ]);

  useEffect(() => {
    if (scene !== 'practice' || answered || selectedOptionId) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      const telemetry = activeQuestionTelemetryRef.current;
      if (!telemetry || telemetry.questionId !== question.id || telemetry.idleNotified) {
        return;
      }

      const now = Date.now();
      const lastInteractionAtMs = telemetry.lastInteractionAtMs || telemetry.startedAtMs;
      const idleMs = now - lastInteractionAtMs;
      telemetry.idleMs = Math.max(telemetry.idleMs, idleMs);
      telemetry.idleNotified = true;
      track(
        'question.idle_detected',
        questionEventPayload(question, questionIndex, {
          idleMs: telemetry.idleMs,
          thresholdMs: QUESTION_IDLE_THRESHOLD_MS,
          attemptCount: telemetry.attemptCount,
        }),
      );
    }, QUESTION_IDLE_THRESHOLD_MS);

    return () => window.clearTimeout(timeoutId);
  }, [answered, question, questionEventPayload, questionIndex, scene, selectedOptionId]);

  return {
    activeQuestionTelemetryRef,
    beginQuestionTelemetry,
    createCompletedAttemptRecord,
    questionEventPayload,
    recordAnswerAttempt,
    trackActiveQuestionAbandoned,
  };
}
