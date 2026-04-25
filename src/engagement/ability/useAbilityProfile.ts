import { useCallback, useMemo, useRef, useState } from 'react';
import { scheduleLearningStateSync } from '../../sync/learningStateSync';
import { track } from '../../telemetry/track';
import type { QuestionAttemptRecord } from '../flow';
import {
  createAbilityAssessment,
  createEmptyAbilityProfile,
  hydrateAbilityProfile,
  updateAbilityProfile,
  type AbilityProfile,
} from './abilityProfile';

const STORAGE_KEY = 'childlearn.ability-profile-v1';

function readStoredAbilityProfile() {
  if (typeof window === 'undefined') {
    return createEmptyAbilityProfile();
  }

  return hydrateAbilityProfile(window.localStorage.getItem(STORAGE_KEY));
}

function writeStoredAbilityProfile(profile: AbilityProfile) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  scheduleLearningStateSync('ability_profile');
}

export function useAbilityProfile() {
  const [profile, setProfile] = useState<AbilityProfile>(readStoredAbilityProfile);
  const latestProfileRef = useRef<AbilityProfile | null>(null);

  if (latestProfileRef.current === null) {
    latestProfileRef.current = profile;
  }

  const recordAttempt = useCallback((record: QuestionAttemptRecord) => {
    const nextProfile = updateAbilityProfile(
      latestProfileRef.current ?? createEmptyAbilityProfile(),
      record,
    );
    latestProfileRef.current = nextProfile;
    writeStoredAbilityProfile(nextProfile);
    setProfile(nextProfile);

    const assessment = createAbilityAssessment(nextProfile);
    track('ability.profile_updated', {
      totalCompletedQuestions: assessment.totalCompletedQuestions,
      readiness: assessment.readiness,
      masteredCount: assessment.mastered.length,
      stableCount: assessment.stable.length,
      focusCount: assessment.focus.length,
      observingCount: assessment.observing.length,
    });

    return nextProfile;
  }, []);

  const reset = useCallback(() => {
    const next = createEmptyAbilityProfile();
    latestProfileRef.current = next;
    writeStoredAbilityProfile(next);
    setProfile(next);
  }, []);

  const assessment = useMemo(() => createAbilityAssessment(profile), [profile]);

  return useMemo(
    () => ({
      profile,
      assessment,
      recordAttempt,
      reset,
    }),
    [assessment, profile, recordAttempt, reset],
  );
}
