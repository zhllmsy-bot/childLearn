import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  LEARNER_RADAR_SKILLS,
  LEARNER_SKILL_DEFINITIONS,
  type LearnerProfile,
} from '../../ai/learnerModel';
import { requestParentSummary } from '../../ai/api/childlearnAi';
import type { ApprovedFlowPolicy, LlmLearningObservation } from '../../engagement/flow';
import type { SessionStats } from '../../app/appState';
import { track } from '../../telemetry/track';

interface FocusSkillSummary {
  count: number;
  key: string;
}

interface UseParentAccessInput {
  difficulty: number;
  flowObservation: LlmLearningObservation | null;
  flowShadowPolicy: ApprovedFlowPolicy | null;
  focusSkills: FocusSkillSummary[];
  learnerProfile: LearnerProfile;
  reviewQueueSize: number;
  stats: SessionStats;
  suggestedMinutes: string;
}

export type ParentFeedbackChoice =
  | 'too_easy'
  | 'just_right'
  | 'needs_challenge'
  | 'too_hard'
  | 'fatigued';

const PARENT_FEEDBACK_STORAGE_KEY = 'childlearn.parent-feedback-v1';

function readStoredParentFeedback(): ParentFeedbackChoice | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(PARENT_FEEDBACK_STORAGE_KEY) ?? 'null',
    ) as { choice?: ParentFeedbackChoice } | null;
    return parsed?.choice ?? null;
  } catch {
    return null;
  }
}

function writeStoredParentFeedback(choice: ParentFeedbackChoice) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(
    PARENT_FEEDBACK_STORAGE_KEY,
    JSON.stringify({
      choice,
      recordedAt: Date.now(),
    }),
  );
}

export function useParentAccess({
  difficulty,
  flowObservation,
  flowShadowPolicy,
  focusSkills,
  learnerProfile,
  reviewQueueSize,
  stats,
  suggestedMinutes,
}: UseParentAccessInput) {
  const [parentGateOpen, setParentGateOpen] = useState(false);
  const [parentReportOpen, setParentReportOpen] = useState(false);
  const [parentSummary, setParentSummary] = useState<string | null>(null);
  const [parentFeedback, setParentFeedback] = useState<ParentFeedbackChoice | null>(
    readStoredParentFeedback,
  );
  const [parentSummaryStatus, setParentSummaryStatus] = useState<
    'idle' | 'pending' | 'ready' | 'failed'
  >('idle');
  const privacyHref = import.meta.env.VITE_PARENT_PRIVACY_URL?.trim() || '/privacy.html';
  const parentSummaryPayload = useMemo(
    () => ({
      accuracy:
        stats.attempted === 0 ? 100 : Math.round((stats.correct / stats.attempted) * 100),
      attempted: stats.attempted,
      correct: stats.correct,
      difficulty,
      flowAction: flowShadowPolicy?.finalAction ?? null,
      flowObserverIssue: flowObservation?.primaryIssue ?? null,
      flowObserverReason: flowObservation?.stateReason ?? null,
      flowState: flowShadowPolicy?.finalState ?? null,
      focusSkills: focusSkills.map((skill) => ({
        count: skill.count,
        key: skill.key,
      })),
      learnerRadar: LEARNER_RADAR_SKILLS.map((skillKey) => ({
        label: LEARNER_SKILL_DEFINITIONS[skillKey].label,
        theta: learnerProfile.skills[skillKey]?.theta ?? 0,
      })),
      recommendedMinutes: suggestedMinutes,
      reviewQueueSize,
    }),
    [
      difficulty,
      flowObservation?.primaryIssue,
      flowObservation?.stateReason,
      flowShadowPolicy?.finalAction,
      flowShadowPolicy?.finalState,
      focusSkills,
      learnerProfile.skills,
      reviewQueueSize,
      stats.attempted,
      stats.correct,
      suggestedMinutes,
    ],
  );

  useEffect(() => {
    if (!parentReportOpen) {
      return;
    }

    let cancelled = false;
    setParentSummaryStatus('pending');
    void requestParentSummary(parentSummaryPayload).then((summary) => {
      if (cancelled) {
        return;
      }

      setParentSummary(summary);
      setParentSummaryStatus(summary ? 'ready' : 'failed');
    });

    return () => {
      cancelled = true;
    };
  }, [parentReportOpen, parentSummaryPayload]);

  const handleOpenParentGate = useCallback(() => {
    setParentGateOpen(true);
  }, []);

  const handleParentGateSuccess = useCallback(() => {
    setParentGateOpen(false);
    setParentReportOpen(true);
  }, []);

  const closeParentGate = useCallback(() => {
    setParentGateOpen(false);
  }, []);

  const closeParentReport = useCallback(() => {
    setParentReportOpen(false);
  }, []);

  const submitParentFeedback = useCallback((choice: ParentFeedbackChoice) => {
    setParentFeedback(choice);
    writeStoredParentFeedback(choice);
    track('parent.feedback_submitted', {
      choice,
    });
  }, []);

  return {
    closeParentGate,
    closeParentReport,
    handleOpenParentGate,
    handleParentGateSuccess,
    parentFeedback,
    parentGateOpen,
    parentReportOpen,
    parentSummary,
    parentSummaryStatus,
    privacyHref,
    setParentGateOpen,
    setParentReportOpen,
    submitParentFeedback,
  };
}
