import type { Question, QuestionLevel, QuestionOption } from '../types';

export function buildMakeTenQuestion(
  start: number,
  level: QuestionLevel,
  options: QuestionOption[],
): Question {
  const answer = 10 - start;
  return {
    id: `make-ten-${level}-${start}`,
    level,
    source: 'template',
    variant: 'makeTen',
    factId: `make-ten-${start}`,
    prompt: '再摘几个可以凑成 10？',
    expression: `${start} + ? = 10`,
    answer,
    options,
    objects: Array.from({ length: start }, () => '🍓'),
    theme: { emoji: '🍓', colorHint: 'pink' },
    barModel: [start, answer],
    scaffoldText: `先看到 ${start} 个，再数到 10，数了几下就是答案。`,
    principleText: `${start} 和 ${answer} 合起来刚好是 10。`,
  };
}
