import { describe, expect, it } from 'vitest';
import { buildNumberLineQuestion } from '../../curriculum/variants/numberLine';
import { buildStoryQuestion } from '../../curriculum/variants/story';
import { deriveQuestionDifficultyTags } from './questionTags';

describe('deriveQuestionDifficultyTags', () => {
  it('marks story addition as language-loaded and cross-ten when needed', () => {
    const question = buildStoryQuestion(
      8,
      5,
      3,
      [
        { id: '12', label: '12', value: 12 },
        { id: '13', label: '13', value: 13 },
        { id: '14', label: '14', value: 14 },
      ],
    );

    expect(deriveQuestionDifficultyTags(question)).toMatchObject({
      numberRange: 'within_20',
      operationType: 'addition',
      presentationType: 'story',
      visualSupport: 'medium',
      crossTen: true,
      carryOrBorrow: true,
      optionDistance: 'close',
      difficultyLevel: 4,
    });
  });

  it('marks number-line distance questions as supported subtraction load', () => {
    const question = buildNumberLineQuestion(
      8,
      12,
      2,
      [
        { id: '3', label: '3', value: 3 },
        { id: '4', label: '4', value: 4 },
        { id: '5', label: '5', value: 5 },
      ],
    );

    expect(deriveQuestionDifficultyTags(question)).toMatchObject({
      numberRange: 'within_20',
      operationType: 'subtraction',
      presentationType: 'number_line',
      visualSupport: 'medium',
      crossTen: true,
      carryOrBorrow: false,
      optionDistance: 'close',
    });
  });
});
