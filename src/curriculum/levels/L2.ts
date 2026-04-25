import type { Question } from '../types';

export function getL2Dots(question: Question) {
  return Array.from({ length: question.answer }, (_, index) => index + 1);
}
