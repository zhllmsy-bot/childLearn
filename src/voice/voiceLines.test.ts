import { describe, expect, it } from 'vitest';
import { buildOptions } from '../curriculum/questionFactory';
import { buildMakeTenQuestion } from '../curriculum/variants/makeTen';
import { DEFAULT_ENGLISH_ITEM } from '../english/englishItems';
import { DEFAULT_LITERACY_ITEM } from '../literacy/literacyItems';
import {
  buildEnglishVoiceLine,
  buildHomeVoiceLine,
  buildLiteracyVoiceLine,
  buildHintVoiceLine,
  buildQuestionVoiceLine,
  estimateVoiceLineDurationMs,
  verbalizeExpression,
} from './voiceLines';

describe('voice lines', () => {
  it('verbalizes math symbols for TTS', () => {
    expect(verbalizeExpression('7 + ? = 10')).toBe('7 加 空格 等于 10');
    expect(verbalizeExpression('3 → 8')).toBe('3 跳到 8');
  });

  it('builds non-empty stage lines from dynamic question content', () => {
    const question = buildMakeTenQuestion(6, 2, buildOptions(4, 10, () => 0.4));

    expect(
      buildHomeVoiceLine({ rankName: '青芽', stars: 2, correct: 0, difficulty: 1 }).text,
    ).toContain('第一颗果子');
    expect(buildQuestionVoiceLine(question).text).toContain('凑成十');
    expect(buildHintVoiceLine(question, 1).text).toContain(question.scaffoldText);
    expect(buildHintVoiceLine(question, 3).text).toContain(question.principleText);
  });

  it('reads literacy cards with glyph, pinyin, and words', () => {
    const line = buildLiteracyVoiceLine(DEFAULT_LITERACY_ITEM);

    expect(line.moment).toBe('literacy');
    expect(line.text).toContain(DEFAULT_LITERACY_ITEM.glyph);
    expect(line.text).toContain(DEFAULT_LITERACY_ITEM.phonetic);
    expect(line.text).toContain(DEFAULT_LITERACY_ITEM.words[0]?.text);
  });

  it('reads english cards with letters and common words', () => {
    const line = buildEnglishVoiceLine(DEFAULT_ENGLISH_ITEM);

    expect(line.moment).toBe('english');
    expect(line.text).toContain(DEFAULT_ENGLISH_ITEM.glyph);
    expect(line.text).toContain(DEFAULT_ENGLISH_ITEM.title);
    expect(line.text).toContain(DEFAULT_ENGLISH_ITEM.words[0]?.text);
  });

  it('estimates a practical choreography duration for voice lines', () => {
    expect(
      estimateVoiceLineDurationMs({
        moment: 'correct',
        text: '答对啦。还差一题开宝箱。',
      }),
    ).toBeGreaterThanOrEqual(1400);
  });
});
