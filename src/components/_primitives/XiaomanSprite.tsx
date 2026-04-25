export type XiaomanEmotion = 'idle' | 'happy' | 'thinking' | 'cheer';

interface XiaomanSpriteProps {
  emotion?: XiaomanEmotion;
  className?: string;
  alt?: string;
}

const SPRITE_SRC: Record<XiaomanEmotion, string> = {
  idle: '/characters/xiaoman/idle.svg',
  happy: '/characters/xiaoman/happy.svg',
  thinking: '/characters/xiaoman/thinking.svg',
  cheer: '/characters/xiaoman/cheer.svg',
};

export function XiaomanSprite({
  emotion = 'idle',
  className = '',
  alt = '小满',
}: XiaomanSpriteProps) {
  return (
    <img
      src={SPRITE_SRC[emotion]}
      alt={alt}
      draggable={false}
      className={`select-none ${className}`}
    />
  );
}
