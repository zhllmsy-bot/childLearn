export type QuestionLevel = 1 | 2 | 3 | 4 | 5;
export type QuestionSource =
  | 'template'
  | 'pcg'
  | 'pcg+llm'
  | 'llm'
  | 'golden'
  | 'parent'
  | 'teacher';

export type QuestionVariant =
  | 'matching'
  | 'compare'
  | 'makeTen'
  | 'missing'
  | 'story'
  | 'numberLine';

export interface QuestionOption {
  id: string;
  label: string;
  value: number;
}

export interface QuestionTheme {
  emoji: string;
  colorHint: string;
}

export type QuestionReasoningKind = 'single' | 'multiStep' | 'narration';

export type QuestionReasoningStrategy = 'makeTen' | 'doubles' | 'countOn' | 'direct';

export interface QuestionReasoningStep {
  stepId: string;
  stem: string;
  choices: QuestionOption[];
  correctIndex: number;
  stepSkillKey: string;
  hintOnWrong?: string;
}

export interface QuestionReasoning {
  kind: QuestionReasoningKind;
  strategy: QuestionReasoningStrategy;
  steps?: QuestionReasoningStep[];
  narrative?: string;
}

export interface Question {
  id: string;
  level: QuestionLevel;
  variant: QuestionVariant;
  source: QuestionSource;
  factId: string;
  prompt: string;
  expression: string;
  answer: number;
  options: QuestionOption[];
  objects: string[];
  comparePair?: {
    left: number;
    right: number;
  };
  numberLine?: {
    start: number;
    end: number;
  };
  theme?: QuestionTheme;
  barModel: number[];
  scaffoldText: string;
  principleText: string;
  reasoning?: QuestionReasoning;
}
