import type { Question, QuestionLevel, QuestionOption } from '../types';

export function buildCompareQuestion(
  left: number,
  right: number,
  level: QuestionLevel,
  options: QuestionOption[],
): Question {
  const answer = Math.max(left, right);
  return {
    id: `compare-${level}-${left}-${right}`,
    level,
    source: 'template',
    variant: 'compare',
    factId: `compare-${left}-${right}`,
    prompt: '哪一边的数量更大？',
    expression: `${left} 还是 ${right}`,
    answer,
    options,
    objects: Array.from({ length: answer }, () => '🍊'),
    theme: { emoji: '🍊', colorHint: 'orange' },
    comparePair: { left, right },
    barModel: [left, right],
    scaffoldText: '把两边排成两行，哪一行更长，数量就更大。',
    principleText: `${answer} 比另一个数多，所以它更大。`,
  };
}
