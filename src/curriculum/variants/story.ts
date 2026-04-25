import type { Question, QuestionLevel, QuestionOption } from '../types';

export function buildStoryQuestion(
  first: number,
  second: number,
  level: QuestionLevel,
  options: QuestionOption[],
): Question {
  const answer = first + second;
  return {
    id: `story-${level}-${first}-${second}`,
    level,
    variant: 'story',
    factId: `${first}+${second}`,
    prompt: `小兔先摘了 ${first} 个，又摘了 ${second} 个，一共有几个？`,
    expression: `${first} + ${second} = ?`,
    answer,
    options,
    objects: [
      ...Array.from({ length: first }, () => '🍎'),
      ...Array.from({ length: second }, () => '🍐'),
    ],
    barModel: [first, second],
    scaffoldText: '先数第一堆，再接着数第二堆。',
    principleText: `${first} 个和 ${second} 个放在一起，一共是 ${answer} 个。`,
  };
}
