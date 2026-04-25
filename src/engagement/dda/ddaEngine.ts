import type { QuestionDifficultyTags } from '../flow';

export interface DdaState {
  difficulty: number;
  consecutiveCorrect: number;
  consecutiveWrong: number;
  recentWindow: number[];
  skillWindows: Record<string, number[]>;
  focusSkillKey: string | null;
}

export type DdaOutcome = 'correct' | 'wrong';

const TARGET_ACCURACY_LOW = 0.75;
const TARGET_ACCURACY_HIGH = 0.84;
const WINDOW_SIZE = 10;
const SKILL_WINDOW_SIZE = 6;
const MIN_WINDOW_FOR_ADJUSTMENT = 5;

export const INITIAL_DDA_STATE: DdaState = {
  difficulty: 1,
  consecutiveCorrect: 0,
  consecutiveWrong: 0,
  recentWindow: [],
  skillWindows: {},
  focusSkillKey: null,
};

function accuracyFor(window: number[]) {
  return window.reduce((total, item) => total + item, 0) / Math.max(window.length, 1);
}

function skillKeyFor(tags?: QuestionDifficultyTags) {
  if (!tags) {
    return null;
  }

  return `${tags.operationType}:${tags.presentationType}:${tags.numberRange}`;
}

function updateSkillWindows(
  state: DdaState,
  outcome: DdaOutcome,
  tags?: QuestionDifficultyTags,
) {
  const key = skillKeyFor(tags);
  const previousSkillWindows =
    state.skillWindows && typeof state.skillWindows === 'object'
      ? state.skillWindows
      : {};

  if (!key) {
    return {
      skillWindows: previousSkillWindows,
      focusSkillKey: state.focusSkillKey ?? null,
      currentSkillWindow: [] as number[],
    };
  }

  const currentSkillWindow = [
    ...(previousSkillWindows[key] ?? []),
    outcome === 'correct' ? 1 : 0,
  ].slice(-SKILL_WINDOW_SIZE);

  return {
    skillWindows: {
      ...previousSkillWindows,
      [key]: currentSkillWindow,
    },
    focusSkillKey: key,
    currentSkillWindow,
  };
}

export function nextDdaState(
  state: DdaState,
  outcome: DdaOutcome,
  tags?: QuestionDifficultyTags,
): DdaState {
  const recentWindow = [
    ...(Array.isArray(state.recentWindow) ? state.recentWindow : []),
    outcome === 'correct' ? 1 : 0,
  ].slice(-WINDOW_SIZE);
  const { skillWindows, focusSkillKey, currentSkillWindow } = updateSkillWindows(
    state,
    outcome,
    tags,
  );
  const skillAccuracy =
    currentSkillWindow.length >= 3 ? accuracyFor(currentSkillWindow) : null;

  if (outcome === 'correct') {
    const consecutiveCorrect = state.consecutiveCorrect + 1;
    const accuracy = accuracyFor(recentWindow);
    const shouldRaise =
      recentWindow.length >= MIN_WINDOW_FOR_ADJUSTMENT &&
      accuracy > TARGET_ACCURACY_HIGH &&
      recentWindow.slice(-2).every((item) => item === 1) &&
      consecutiveCorrect >= 2 &&
      (skillAccuracy === null || skillAccuracy >= 0.75);

    if (shouldRaise) {
      return {
        difficulty: Math.min(state.difficulty + 1, 10),
        consecutiveCorrect: 0,
        consecutiveWrong: 0,
        recentWindow,
        skillWindows,
        focusSkillKey,
      };
    }

    return {
      ...state,
      consecutiveCorrect,
      consecutiveWrong: 0,
      recentWindow,
      skillWindows,
      focusSkillKey,
    };
  }

  const consecutiveWrong = state.consecutiveWrong + 1;
  const accuracy = accuracyFor(recentWindow);
  const wrongsInLastFive = recentWindow.slice(-5).filter((item) => item === 0).length;
  const shouldLower =
    recentWindow.length >= MIN_WINDOW_FOR_ADJUSTMENT &&
    accuracy < TARGET_ACCURACY_LOW &&
    (consecutiveWrong >= 2 ||
      wrongsInLastFive >= 2 ||
      (skillAccuracy !== null && skillAccuracy < 0.67));

  if (shouldLower) {
    return {
      difficulty: Math.max(state.difficulty - 1, 1),
      consecutiveCorrect: 0,
      consecutiveWrong: 0,
      recentWindow,
      skillWindows,
      focusSkillKey,
    };
  }

  return {
    ...state,
    consecutiveCorrect: 0,
    consecutiveWrong,
    recentWindow,
    skillWindows,
    focusSkillKey,
  };
}
