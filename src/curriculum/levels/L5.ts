import type { Question } from '../types';

export function getL5Variation(question: Question) {
  return {
    expression: question.expression,
    principle: question.principleText,
  };
}
