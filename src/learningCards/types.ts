export interface LearningWord {
  text: string;
  pinyin?: string;
  phonetic?: string;
}

export interface LearningCard {
  id: string;
  glyph: string;
  title: string;
  phonetic: string;
  graphic: string;
  imageLabel: string;
  words: LearningWord[];
  sentence: string;
  tone: string;
}
