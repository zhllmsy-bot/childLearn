import { describe, expect, it } from 'vitest';
import { LITERACY_ITEMS } from './literacyItems';

describe('literacy items', () => {
  it('keeps every card usable for the literacy module', () => {
    const ids = new Set<string>();

    LITERACY_ITEMS.forEach((item) => {
      ids.add(item.id);
      expect(item.glyph).toHaveLength(1);
      expect(item.phonetic.length).toBeGreaterThan(0);
      expect(item.graphic.length).toBeGreaterThan(0);
      expect(item.words.length).toBeGreaterThanOrEqual(3);
      item.words.forEach((word) => {
        expect(word.text.length).toBeGreaterThan(0);
        expect(word.pinyin?.length).toBeGreaterThan(0);
      });
    });

    expect(ids.size).toBe(LITERACY_ITEMS.length);
  });
});
