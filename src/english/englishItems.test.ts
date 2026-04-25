import { describe, expect, it } from 'vitest';
import { ENGLISH_ITEMS } from './englishItems';

describe('english items', () => {
  it('keeps every card usable for the english module', () => {
    const ids = new Set<string>();

    expect(ENGLISH_ITEMS.length).toBeGreaterThanOrEqual(26);

    ENGLISH_ITEMS.forEach((item) => {
      ids.add(item.id);
      expect(item.glyph.length).toBeGreaterThan(0);
      expect(item.phonetic.length).toBeGreaterThan(0);
      expect(item.graphic.length).toBeGreaterThan(0);
      expect(item.words.length).toBeGreaterThanOrEqual(3);
      item.words.forEach((word) => {
        expect(word.text.length).toBeGreaterThan(0);
        expect(word.phonetic?.length).toBeGreaterThan(0);
      });
    });

    expect(ids.size).toBe(ENGLISH_ITEMS.length);
  });
});
