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

export interface Question {
  id: string;
  level: QuestionLevel;
  variant: QuestionVariant;
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
  barModel: number[];
  scaffoldText: string;
  principleText: string;
}
