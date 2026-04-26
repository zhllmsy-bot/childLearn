import { useCallback, useMemo, useRef, useState } from 'react';
import { scheduleLearningStateSync } from '../sync/learningStateSync';
import { track } from '../telemetry/track';
import type { QuestionAttemptRecord } from '../engagement/flow/types';
import {
  LEARNER_MODEL_STORAGE_KEY,
  applyProfileRefinement,
  createEmptyLearnerProfile,
  hydrateLearnerProfile,
  updateLearnerModel,
  type LearnerProfile,
  type ProfileRefinement,
} from './learnerModel';

function readStoredLearnerProfile() {
  if (typeof window === 'undefined') {
    return createEmptyLearnerProfile();
  }

  return hydrateLearnerProfile(window.localStorage.getItem(LEARNER_MODEL_STORAGE_KEY));
}

function writeStoredLearnerProfile(profile: LearnerProfile) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(LEARNER_MODEL_STORAGE_KEY, JSON.stringify(profile));
  scheduleLearningStateSync('learner_model');
}

export function useLearnerProfile() {
  const [profile, setProfile] = useState<LearnerProfile>(readStoredLearnerProfile);
  const latestProfileRef = useRef<LearnerProfile | null>(null);

  if (latestProfileRef.current === null) {
    latestProfileRef.current = profile;
  }

  const recordAttempt = useCallback((record: QuestionAttemptRecord) => {
    const nextProfile = updateLearnerModel(
      latestProfileRef.current ?? createEmptyLearnerProfile(),
      record,
    );
    latestProfileRef.current = nextProfile;
    writeStoredLearnerProfile(nextProfile);
    setProfile(nextProfile);

    track('learner_model.updated', {
      flowState: nextProfile.flowState,
      recentResponseCount: nextProfile.recentResponses.length,
      errorPatternCount: nextProfile.errorPatterns.length,
      recommendedSkill: nextProfile.recommendedSkill,
    });

    return nextProfile;
  }, []);

  const applyRefinement = useCallback((refinement: ProfileRefinement) => {
    const nextProfile = applyProfileRefinement(
      latestProfileRef.current ?? createEmptyLearnerProfile(),
      refinement,
    );
    latestProfileRef.current = nextProfile;
    writeStoredLearnerProfile(nextProfile);
    setProfile(nextProfile);

    track('learner_model.llm_refined', {
      confidence: refinement.confidence,
      skillAdjustmentCount: refinement.skillAdjustments.length,
      errorPatternCount: refinement.errorPatterns.length,
      recommendedSkill: refinement.nextSkill?.skillKey ?? null,
    });

    return nextProfile;
  }, []);

  const reset = useCallback(() => {
    const nextProfile = createEmptyLearnerProfile();
    latestProfileRef.current = nextProfile;
    writeStoredLearnerProfile(nextProfile);
    setProfile(nextProfile);
  }, []);

  return useMemo(
    () => ({
      profile,
      recordAttempt,
      applyRefinement,
      reset,
    }),
    [applyRefinement, profile, recordAttempt, reset],
  );
}

