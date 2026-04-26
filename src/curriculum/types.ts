export type QuestionLevel = 1 | 2 | 3 | 4 | 5;

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

export interface Question {
  id: string;
  level: QuestionLevel;
  variant: QuestionVariant;
  source: 'template' | 'llm';
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
}
