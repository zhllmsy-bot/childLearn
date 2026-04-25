import { describe, expect, it } from 'vitest';
import {
  STICKER_UNLOCK_COMBO_INTERVAL,
  findStickerById,
  getStickerMeta,
  shouldOfferStickerUnlock,
} from './useStickers';

describe('shouldOfferStickerUnlock', () => {
  it('only offers stickers on first-try combo milestones', () => {
    expect(
      shouldOfferStickerUnlock({
        combo: STICKER_UNLOCK_COMBO_INTERVAL - 1,
        firstAttemptCorrect: true,
      }),
    ).toBe(false);

    expect(
      shouldOfferStickerUnlock({
        combo: STICKER_UNLOCK_COMBO_INTERVAL,
        firstAttemptCorrect: true,
      }),
    ).toBe(true);

    expect(
      shouldOfferStickerUnlock({
        combo: STICKER_UNLOCK_COMBO_INTERVAL,
        firstAttemptCorrect: false,
      }),
    ).toBe(false);
  });

  it('uses stable rarity and series metadata instead of index order', () => {
    const common = findStickerById('m78-ultraman');
    const epic = findStickerById('m78-father');
    const legendary = findStickerById('m78-ultraman-king');

    expect(common && getStickerMeta(common)).toMatchObject({
      rarity: 'common',
      series: '奥特兄弟',
    });
    expect(epic && getStickerMeta(epic)).toMatchObject({
      rarity: 'epic',
      series: '光之国',
    });
    expect(legendary && getStickerMeta(legendary)).toMatchObject({
      rarity: 'legendary',
      series: '昭和奥特',
    });
  });
});
