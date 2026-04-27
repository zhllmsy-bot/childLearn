import type { Sticker } from '../engagement/collection/useStickers';
import type { CelebrationLevel } from '../theme/confetti';
import type { Question } from '../curriculum/types';
import type { EnglishItem } from '../english/englishItems';
import type { LiteracyItem } from '../literacy/literacyItems';

export type VoiceMoment =
  | 'home'
  | 'start'
  | 'question'
  | 'hint'
  | 'correct'
  | 'reward'
  | 'sticker'
  | 'literacy'
  | 'english'
  | 'programming';

export interface VoiceLine {
  moment: VoiceMoment;
  text: string;
  voice?: string;
  rate?: string;
  volume?: string;
  pitch?: string;
}

export interface HomeVoiceInput {
  rankName: string;
  stars: number;
  correct: number;
  difficulty: number;
}

export interface CorrectVoiceInput {
  question: Question;
  combo: number;
  level: CelebrationLevel;
  firstWin: boolean;
  sticker: Sticker | null;
  nextChestRemaining: number;
}

const GENTLE_RATE = '-8%';
const SLOW_RATE = '-12%';
const REWARD_RATE = '-6%';
const GENTLE_VOICE = 'zh-CN-XiaoxiaoNeural';

const QUESTION_PREFIX: Record<Question['variant'], string> = {
  matching: '我们先数一数。',
  compare: '看一看两边。',
  makeTen: '这里想凑成十。',
  missing: '空格这里少了一个数。',
  story: '听一听小故事。',
  numberLine: '从小旗子开始跳。',
};

function compact(text: string) {
  return text.replace(/\s+/g, ' ').trim();
}

export function estimateVoiceLineDurationMs(line: VoiceLine) {
  const punctuationPause = (line.text.match(/[，。！？,.!?]/g)?.length ?? 0) * 120;
  const spokenUnits = Array.from(line.text).filter((char) => char.trim()).length;
  return Math.min(Math.max(spokenUnits * 120 + punctuationPause + 800, 1400), 7200);
}

export function verbalizeExpression(expression: string) {
  return compact(
    expression
      .replace(/\?/g, '空格')
      .replace(/\+/g, ' 加 ')
      .replace(/=/g, ' 等于 ')
      .replace(/→/g, ' 跳到 '),
  );
}

export function buildHomeVoiceLine({
  correct,
}: HomeVoiceInput): VoiceLine {
  const progress =
    correct > 0
      ? '刚才那几题做得不错，我们接着慢慢来。'
      : '今天先从第一颗果子开始，不着急。';

  return {
    moment: 'home',
    rate: SLOW_RATE,
    voice: GENTLE_VOICE,
    text: compact(`回来啦。${progress} 准备好了，就点继续摘果。`),
  };
}

export function buildStartVoiceLine(): VoiceLine {
  return {
    moment: 'start',
    rate: SLOW_RATE,
    voice: GENTLE_VOICE,
    text: '好呀，我们开始。先看清楚，再轻轻点答案。不急。',
  };
}

export function buildStickerVoiceLine(sticker: Sticker): VoiceLine {
  return {
    moment: 'sticker',
    rate: REWARD_RATE,
    voice: GENTLE_VOICE,
    text: compact(`${sticker.voiceLine} ${sticker.actionDescription}`),
  };
}

export function buildLiteracyVoiceLine(item: LiteracyItem): VoiceLine {
  const words = item.words.map((word) => word.text).join('，');

  return {
    moment: 'literacy',
    rate: SLOW_RATE,
    voice: GENTLE_VOICE,
    text: compact(
      `${item.glyph}，拼音 ${item.phonetic}。常用词组：${words}。${item.sentence}`,
    ),
  };
}

export function buildEnglishVoiceLine(item: EnglishItem): VoiceLine {
  const words = item.words.map((word) => word.text).join(', ');

  return {
    moment: 'english',
    rate: SLOW_RATE,
    voice: GENTLE_VOICE,
    text: compact(
      `英语字母 ${item.glyph}。${item.sentence} 常用单词：${words}。跟我读，${item.title}.`,
    ),
  };
}

export function buildProgrammingVoiceLine(text: string): VoiceLine {
  return {
    moment: 'programming',
    rate: SLOW_RATE,
    voice: GENTLE_VOICE,
    text: compact(text),
  };
}

export function buildQuestionVoiceLine(question: Question): VoiceLine {
  const expression = verbalizeExpression(question.expression);
  const shouldReadExpression = question.expression !== '?' && !question.prompt.includes('?');
  const expressionText = shouldReadExpression
    ? `你可以轻轻念一遍，${expression}。`
    : '';

  return {
    moment: 'question',
    rate: GENTLE_RATE,
    voice: GENTLE_VOICE,
    text: compact(`${QUESTION_PREFIX[question.variant]}${question.prompt}${expressionText}`),
  };
}

export function buildHintVoiceLine(question: Question, stage: number): VoiceLine {
  if (stage >= 3) {
    return {
      moment: 'hint',
      rate: SLOW_RATE,
      voice: GENTLE_VOICE,
      text: compact(`我带你走一遍。答案是 ${question.answer}。${question.principleText}`),
    };
  }

  if (stage >= 2) {
    return {
      moment: 'hint',
      rate: SLOW_RATE,
      voice: GENTLE_VOICE,
      text: '差一点点。先看发光的数字，它们更像答案。我们把太远的先放一边。',
    };
  }

  return {
    moment: 'hint',
    rate: SLOW_RATE,
    voice: GENTLE_VOICE,
    text: compact(`没关系。我们换个看法。${question.scaffoldText}`),
  };
}

export function buildCorrectVoiceLine({
  question,
  combo,
  level,
  firstWin,
  sticker,
}: CorrectVoiceInput): VoiceLine {
  if (firstWin) {
    return {
      moment: 'reward',
      rate: REWARD_RATE,
      voice: GENTLE_VOICE,
      text: '对啦。今天第一颗果子摘到了，真稳。我们慢慢继续。',
    };
  }

  if (sticker) {
    return {
      moment: 'reward',
      rate: REWARD_RATE,
      voice: GENTLE_VOICE,
      text: compact(`对啦，还多了一张伙伴贴纸。先收好，下一题也慢慢看。`),
    };
  }

  if (
    question.reasoning?.kind === 'multiStep' &&
    question.reasoning.narrative &&
    question.reasoning.strategy === 'makeTen'
  ) {
    return {
      moment: 'correct',
      rate: REWARD_RATE,
      voice: GENTLE_VOICE,
      text: compact(`对啦。${question.reasoning.narrative} 你刚才想得很清楚。`),
    };
  }

  if (level === 'amazing') {
    return {
      moment: 'correct',
      rate: REWARD_RATE,
      voice: GENTLE_VOICE,
      text: compact(`哇，已经连着答对 ${combo} 题了。你刚才看得很认真。`),
    };
  }

  if (level === 'great') {
    return {
      moment: 'correct',
      rate: REWARD_RATE,
      voice: GENTLE_VOICE,
      text: compact(`连着答对 ${combo} 题了，很稳。下一题也慢慢来。`),
    };
  }

  return {
    moment: 'correct',
    rate: REWARD_RATE,
    voice: GENTLE_VOICE,
    text: compact(`嗯，就是这样。${question.principleText} 我们接着来。`),
  };
}
