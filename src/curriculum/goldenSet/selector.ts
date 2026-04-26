import { thetaToDifficulty, type LearnerSkillKey } from '../../ai/learnerModel';
import type { Question, QuestionSource, QuestionVariant } from '../types';
import { loadGoldenSetItems } from './loader';
import type { GoldenSetItem } from './types';

export interface SelectGoldenSetItemInput {
  difficulty: number;
  variant?: QuestionVariant;
  targetSkillKey?: LearnerSkillKey;
  tags?: string[];
  includeNonPublished?: boolean;
}

function sourceForItem(item: GoldenSetItem): QuestionSource {
  if (item.meta.authorRole === 'parent') {
    return 'parent';
  }

  if (item.meta.authorRole === 'teacher') {
    return 'teacher';
  }

  return 'golden';
}

function scoreItem(item: GoldenSetItem, input: SelectGoldenSetItemInput) {
  let score = 0;
  const itemDifficulty = thetaToDifficulty(item.skeleton.difficulty);
  score -= Math.abs(itemDifficulty - input.difficulty) * 10;

  if (input.variant && item.presentation.variant === input.variant) {
    score += 24;
  }

  if (input.targetSkillKey && item.skeleton.skill === input.targetSkillKey) {
    score += 28;
  } else if (
    input.targetSkillKey &&
    item.skeleton.secondarySkills?.includes(input.targetSkillKey)
  ) {
    score += 12;
  }

  if (input.tags?.length) {
    const matches = input.tags.filter((tag) => item.meta.tags.includes(tag)).length;
    score += matches * 9;
  }

  if (item.meta.tags.includes('diagnostic')) {
    score += 2;
  }

  return score;
}

export function selectGoldenSetItem(
  input: SelectGoldenSetItemInput,
): GoldenSetItem | null {
  const candidates = loadGoldenSetItems().filter((item) => {
    if (!input.includeNonPublished && item.status !== 'published') {
      return false;
    }

    if (input.variant && item.presentation.variant !== input.variant) {
      return false;
    }

    if (input.targetSkillKey) {
      const matchesSkill =
        item.skeleton.skill === input.targetSkillKey ||
        item.skeleton.secondarySkills?.includes(input.targetSkillKey);
      if (!matchesSkill) {
        return false;
      }
    }

    if (input.tags?.length) {
      const matchesAnyTag = input.tags.some((tag) => item.meta.tags.includes(tag));
      if (!matchesAnyTag) {
        return false;
      }
    }

    return true;
  });

  if (candidates.length === 0) {
    return null;
  }

  return [...candidates]
    .sort((left, right) => {
      const scoreDelta = scoreItem(right, input) - scoreItem(left, input);
      if (scoreDelta !== 0) {
        return scoreDelta;
      }

      return left.id.localeCompare(right.id);
    })[0];
}

export function goldenSetItemToQuestion(
  item: GoldenSetItem,
  serial = 0,
): Question {
  return {
    id: `${item.id}-q${serial}`,
    level: item.presentation.level,
    variant: item.presentation.variant,
    source: sourceForItem(item),
    factId: item.id,
    prompt: item.content.prompt,
    expression: item.presentation.expression,
    answer: item.content.correctAnswer,
    options: item.content.choices.map((choice, index) => ({
      id: `${item.id}-option-${index}-${choice.value}`,
      label: choice.text,
      value: choice.value,
    })),
    objects: item.presentation.objects,
    comparePair: item.presentation.comparePair,
    numberLine: item.presentation.numberLine,
    theme: item.presentation.theme,
    barModel: item.presentation.barModel,
    scaffoldText: item.presentation.scaffoldText,
    principleText: item.presentation.principleText,
  };
}
