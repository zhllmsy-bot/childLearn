import type { Question, QuestionLevel, QuestionOption } from '../types';

export function buildNumberLineQuestion(
  start: number,
  end: number,
  level: QuestionLevel,
  options: QuestionOption[],
): Question {
  const answer = end - start;
  return {
    id: `number-line-${level}-${start}-${end}`,
    level,
    variant: 'numberLine',
    factId: `jump-${start}-${end}`,
    prompt: '从小旗子跳到星星，要跳几步？',
    expression: `${start} → ${end}`,
    answer,
    options,
    objects: Array.from({ length: answer }, () => '⭐'),
    theme: { emoji: '⭐', colorHint: 'amber' },
    numberLine: { start, end },
    barModel: [start, answer],
    scaffoldText: `从 ${start} 开始，每跳一步数一个，跳到 ${end} 停。`,
    principleText: `从 ${start} 到 ${end} 的距离是 ${answer} 步。`,
  };
}
