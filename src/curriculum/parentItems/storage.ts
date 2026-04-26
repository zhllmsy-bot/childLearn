import {
  LEARNER_SKILL_DEFINITIONS,
  type LearnerSkillKey,
} from '../../ai/learnerModel';
import { getMathProgressionBand } from '../mathProgression';
import type { Question, QuestionVariant } from '../types';
import type { CreateParentItemInput, ParentItem } from './types';

const PARENT_ITEMS_STORAGE_KEY = 'childlearn.parent-items.v1';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isQuestionVariant(value: unknown): value is QuestionVariant {
  return (
    value === 'matching' ||
    value === 'compare' ||
    value === 'makeTen' ||
    value === 'missing' ||
    value === 'story' ||
    value === 'numberLine'
  );
}

function buildDistractors(answer: number) {
  const candidates = new Set<number>();
  [-1, 1, -2, 2, -3, 3].forEach((offset) => {
    const next = answer + offset;
    if (next >= 0) {
      candidates.add(next);
    }
  });

  while (candidates.size < 3) {
    candidates.add(answer + candidates.size + 4);
  }

  return [...candidates].slice(0, 3);
}

function normalizeParentItem(raw: unknown): ParentItem | null {
  if (!isRecord(raw)) {
    return null;
  }

  if (
    typeof raw.id !== 'string' ||
    typeof raw.ownerId !== 'string' ||
    typeof raw.childId !== 'string' ||
    typeof raw.prompt !== 'string' ||
    !Number.isFinite(Number(raw.answer)) ||
    !Array.isArray(raw.distractors) ||
    !Number.isFinite(Number(raw.difficulty)) ||
    typeof raw.skill !== 'string' ||
    !(raw.skill in LEARNER_SKILL_DEFINITIONS) ||
    !isQuestionVariant(raw.variant) ||
    (raw.source !== 'parent' && raw.source !== 'teacher') ||
    (raw.scope !== 'child' && raw.scope !== 'class') ||
    (raw.status !== 'draft' && raw.status !== 'active')
  ) {
    return null;
  }

  return {
    id: raw.id,
    ownerId: raw.ownerId,
    childId: raw.childId,
    prompt: raw.prompt.trim(),
    answer: Math.round(Number(raw.answer)),
    distractors: raw.distractors
      .map((value) => Number(value))
      .filter((value): value is number => Number.isFinite(value))
      .map((value) => Math.round(value))
      .slice(0, 3),
    difficulty: Math.min(Math.max(Math.round(Number(raw.difficulty)), 1), 10),
    skill: raw.skill as LearnerSkillKey,
    variant: raw.variant,
    source: raw.source,
    scope: raw.scope,
    status: raw.status,
    createdAt: Number(raw.createdAt ?? Date.now()),
    updatedAt: Number(raw.updatedAt ?? Date.now()),
  };
}

export function readParentItemsFromStorage() {
  if (typeof window === 'undefined') {
    return [] as ParentItem[];
  }

  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(PARENT_ITEMS_STORAGE_KEY) ?? '[]',
    ) as unknown[];
    return parsed
      .map((item) => normalizeParentItem(item))
      .filter((item): item is ParentItem => item !== null);
  } catch {
    return [] as ParentItem[];
  }
}

export function writeParentItemsToStorage(items: ParentItem[]) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(PARENT_ITEMS_STORAGE_KEY, JSON.stringify(items));
}

export function createParentItem(input: CreateParentItemInput): ParentItem {
  const now = Date.now();
  return {
    id: `pi_${now}`,
    ownerId: input.ownerId,
    childId: input.childId?.trim() || 'local-child',
    prompt: input.prompt.trim(),
    answer: Math.round(input.answer),
    distractors: (input.distractors?.length ? input.distractors : buildDistractors(input.answer))
      .map((value) => Math.round(value))
      .filter((value) => value !== Math.round(input.answer))
      .slice(0, 3),
    difficulty: Math.min(Math.max(Math.round(input.difficulty), 1), 10),
    skill: input.skill,
    variant: input.variant,
    source: input.source ?? 'parent',
    scope: input.scope ?? 'child',
    status: 'active',
    createdAt: now,
    updatedAt: now,
  };
}

export function upsertParentItem(item: ParentItem) {
  const existing = readParentItemsFromStorage();
  const nextItems = [
    ...existing.filter((candidate) => candidate.id !== item.id),
    {
      ...item,
      updatedAt: Date.now(),
    },
  ].sort((left, right) => right.updatedAt - left.updatedAt);
  writeParentItemsToStorage(nextItems);
  return nextItems;
}

export function removeParentItem(itemId: string) {
  const nextItems = readParentItemsFromStorage().filter((item) => item.id !== itemId);
  writeParentItemsToStorage(nextItems);
  return nextItems;
}

export function selectParentItem({
  childId = 'local-child',
  difficulty,
  items = readParentItemsFromStorage(),
  serial,
  targetSkillKey,
  variant,
}: {
  childId?: string;
  difficulty: number;
  items?: ParentItem[];
  serial: number;
  targetSkillKey?: string;
  variant?: string;
}) {
  if (serial <= 0 || serial % 5 !== 0) {
    return null;
  }

  const candidates = items.filter((item) => {
    if (item.childId !== childId || item.status !== 'active') {
      return false;
    }

    if (targetSkillKey && item.skill !== targetSkillKey) {
      return false;
    }

    if (variant && item.variant !== variant) {
      return false;
    }

    return Math.abs(item.difficulty - difficulty) <= 2;
  });

  return candidates[0] ?? null;
}

export function parentItemToQuestion(item: ParentItem, serial = 0): Question {
  const band = getMathProgressionBand(item.difficulty);
  const options = [item.answer, ...item.distractors]
    .slice(0, 4)
    .sort((left, right) => left - right)
    .map((value, index) => ({
      id: `${item.id}-option-${index}-${value}`,
      label: String(value),
      value,
    }));

  return {
    id: `${item.id}-q${serial}`,
    level: band.level,
    variant: item.variant,
    source: item.source,
    factId: item.id,
    prompt: item.prompt,
    expression: '?',
    answer: item.answer,
    options,
    objects: [],
    barModel: [item.answer],
    scaffoldText: '先把题意听清楚，再慢慢试一试。',
    principleText: '把生活里的数量关系想明白，就能找到答案。',
  };
}
