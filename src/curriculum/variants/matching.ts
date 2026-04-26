import type { Question, QuestionLevel, QuestionOption } from '../types';

export function buildMatchingQuestion(
  count: number,
  level: QuestionLevel,
  options: QuestionOption[],
): Question {
  return {
    id: `matching-${level}-${count}`,
    level,
    source: 'template',
    variant: 'matching',
    factId: `count-${count}`,
    prompt: '数一数，果篮里有几个苹果？',
    expression: '?',
    answer: count,
    options,
    objects: Array.from({ length: count }, () => '🍎'),
    theme: { emoji: '🍎', colorHint: 'rose' },
    barModel: [count],
    scaffoldText: '可以一个一个点着数，最后一个数就是总数。',
    principleText: `${count} 个苹果和数字 ${count} 是同一个数量。`,
  };
}
