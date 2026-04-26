import type { LearnerSkillKey } from '../../ai/learnerModel';
import type {
  QuestionLevel,
  QuestionTheme,
  QuestionVariant,
} from '../types';

export type GoldenSetStatus = 'draft' | 'review' | 'published' | 'retired';
export type GoldenSetAuthorRole = 'teacher' | 'expert' | 'parent' | 'partner';
export type GoldenSetSource =
  | 'handcraft'
  | 'excel-import'
  | 'parent-contributed'
  | 'llm-seeded';
export type GoldenSetBloomLevel =
  | 'remember'
  | 'understand'
  | 'apply'
  | 'analyze';
export type GoldenSetInputType = 'choice' | 'numpad' | 'drag' | 'numberLine';
export type GoldenSetTrapType = 'swap-op' | 'partial' | 'off-one' | 'none';

export interface GoldenSetChoice {
  text: string;
  value: number;
  isCorrect: boolean;
  trapType?: GoldenSetTrapType;
  trapHint?: string;
}

export interface GoldenSetPresentation {
  variant: QuestionVariant;
  level: QuestionLevel;
  expression: string;
  objects: string[];
  barModel: number[];
  comparePair?: {
    left: number;
    right: number;
  };
  numberLine?: {
    start: number;
    end: number;
  };
  theme?: QuestionTheme;
  scaffoldText: string;
  principleText: string;
}

export interface GoldenSetItem {
  id: string;
  version: number;
  status: GoldenSetStatus;
  skeleton: {
    skill: LearnerSkillKey;
    secondarySkills?: LearnerSkillKey[];
    difficulty: number;
    bloomLevel: GoldenSetBloomLevel;
    expectedAccuracy: number;
  };
  content: {
    prompt: string;
    narration?: string;
    inputType: GoldenSetInputType;
    choices: GoldenSetChoice[];
    correctAnswer: number;
    solutionSteps?: string[];
  };
  presentation: GoldenSetPresentation;
  context: {
    scene?: string;
    actors?: string[];
    festival?: 'spring-fes' | 'mid-autumn' | 'children-day';
    emotion?: 'curious' | 'joyful' | 'calm';
  };
  meta: {
    authorId: string;
    authorRole: GoldenSetAuthorRole;
    reviewerId?: string;
    reviewedAt?: number;
    source: GoldenSetSource;
    tags: string[];
    usedInCount: number;
    globalAccuracy: number;
  };
  safety: {
    reviewedForBias: boolean;
    reviewedForSafety: boolean;
    safetyFlags: string[];
  };
  createdAt: number;
  updatedAt: number;
}

export interface GoldenSetValidationResult {
  errors: string[];
  warnings: string[];
}
