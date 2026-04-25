import type { Question, QuestionLevel, QuestionOption } from '../types';

export function buildMissingQuestion(
  first: number,
  missing: number,
  level: QuestionLevel,
  options: QuestionOption[],
): Question {
  const sum = first + missing;
  return {
    id: `missing-${level}-${first}-${sum}`,
    level,
    variant: 'missing',
    factId: `${first}+${missing}`,
    prompt: '空格里应该放几？',
    expression: `${first} + ? = ${sum}`,
    answer: missing,
    options,
    objects: Array.from({ length: first }, () => '🍇'),
    theme: { emoji: '🍇', colorHint: 'violet' },
    barModel: [first, missing],
    scaffoldText: `从 ${first} 开始往上数，数到 ${sum} 停下。`,
    principleText: `${first} 加上 ${missing}，才会到 ${sum}。`,
  };
}
