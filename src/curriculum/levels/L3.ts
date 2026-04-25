import type { Question } from '../types';

export function getL3Segments(question: Question) {
  return question.barModel;
}
