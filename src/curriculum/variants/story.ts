import type { Question, QuestionLevel, QuestionOption } from '../types';
import type { StoryContext } from './storyPool';
import { pickStoryContext } from './storyPool';

function storyPrompt(context: StoryContext, first: number, second: number) {
  if (context.frame === 'gift') {
    return `${context.actor}有 ${first} 个${context.item}，朋友又送来 ${second} 个，现在有几个${context.item}？`;
  }

  if (context.frame === 'combine') {
    return `${context.actor}篮子里有 ${first} 个${context.item}，桌上还有 ${second} 个，合起来有几个${context.item}？`;
  }

  if (context.frame === 'arrive') {
    return `桌上先摆了 ${first} 个${context.item}，${context.actor}又放上 ${second} 个，现在一共有几个${context.item}？`;
  }

  return `${context.actor}先${context.verb}了 ${first} 个${context.item}，又${context.verb}了 ${second} 个，一共有几个${context.item}？`;
}

function storyScaffoldText(context: StoryContext, first: number, second: number) {
  if (context.frame === 'arrive') {
    return `先看前面 ${first} 个，再接着数 ${second} 个。`;
  }

  if (context.frame === 'combine') {
    return `先数篮子里的 ${first} 个，再把桌上的 ${second} 个合起来数。`;
  }

  return `先记住 ${first} 个，再接着往后数 ${second} 下。`;
}

function storyPrincipleText(first: number, second: number, answer: number) {
  return `${first} 个和 ${second} 个合在一起，一共是 ${answer} 个。`;
}

export function buildStoryQuestion(
  first: number,
  second: number,
  level: QuestionLevel,
  options: QuestionOption[],
  rng: () => number = Math.random,
): Question {
  const answer = first + second;
  const context = pickStoryContext(rng);
  return {
    id: `story-${level}-${first}-${second}-${context.frame}-${context.actor}-${context.item}`,
    level,
    source: 'pcg',
    variant: 'story',
    factId: `${first}+${second}`,
    prompt: storyPrompt(context, first, second),
    expression: `${first} + ${second} = ?`,
    answer,
    options,
    objects: Array.from({ length: answer }, () => context.emoji),
    theme: { emoji: context.emoji, colorHint: context.colorHint },
    barModel: [first, second],
    scaffoldText: storyScaffoldText(context, first, second),
    principleText: storyPrincipleText(first, second, answer),
  };
}
