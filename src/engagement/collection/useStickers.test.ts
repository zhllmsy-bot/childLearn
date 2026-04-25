import { describe, expect, it } from 'vitest';
import {
  STICKER_UNLOCK_COMBO_INTERVAL,
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
});
