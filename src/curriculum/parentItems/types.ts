import type { LearnerSkillKey } from '../../ai/learnerModel';
import type { QuestionVariant } from '../types';

export type ParentItemSource = 'parent' | 'teacher';
export type ParentItemScope = 'child' | 'class';
export type ParentItemStatus = 'draft' | 'active';

export interface ParentItem {
  id: string;
  ownerId: string;
  childId: string;
  prompt: string;
  answer: number;
  distractors: number[];
  difficulty: number;
  skill: LearnerSkillKey;
  variant: QuestionVariant;
  source: ParentItemSource;
  scope: ParentItemScope;
  status: ParentItemStatus;
  createdAt: number;
  updatedAt: number;
}

export interface CreateParentItemInput {
  answer: number;
  childId?: string;
  difficulty: number;
  distractors?: number[];
  ownerId: string;
  prompt: string;
  scope?: ParentItemScope;
  skill: LearnerSkillKey;
  source?: ParentItemSource;
  variant: QuestionVariant;
}
