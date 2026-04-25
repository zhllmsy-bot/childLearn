import type { Sticker } from '../../engagement/collection/useStickers';

interface StickerArtworkProps {
  sticker: Sticker;
  className?: string;
  imageClassName?: string;
  fit?: 'cover' | 'contain';
}

export function StickerArtwork({
  sticker,
  className = '',
  imageClassName = '',
  fit = 'cover',
}: StickerArtworkProps) {
  const fitClassName = fit === 'contain' ? 'object-contain' : 'object-cover';

  return (
    <div
      title={sticker.name}
      className={`overflow-hidden rounded-2xl bg-white shadow-lg ring-4 ring-white ${className}`}
    >
      <img
        src={sticker.imageSrc}
        alt={sticker.name}
        draggable={false}
        loading="lazy"
        className={`h-full w-full ${fitClassName} ${imageClassName}`}
      />
    </div>
  );
}
