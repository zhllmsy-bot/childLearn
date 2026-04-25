import type { Question } from './types';

export interface ReviewItem {
  factId: string;
  missedAt: number;
  question: Question;
}

export function addReviewItem(queue: ReviewItem[], question: Question): ReviewItem[] {
  if (queue.some((item) => item.factId === question.factId)) {
    return queue;
  }

  return [
    ...queue,
    {
      factId: question.factId,
      missedAt: Date.now(),
      question,
    },
  ];
}
