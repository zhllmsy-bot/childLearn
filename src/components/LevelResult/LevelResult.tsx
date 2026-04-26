import { Award, Flame, Gift, RotateCcw, Sparkles, Star, Trophy } from 'lucide-react';
import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import type { Sticker } from '../../engagement/collection/useStickers';
import type { NumberSpirit } from '../../engagement/reward/useNumberSpirits';
import type { GardenReward } from '../../engagement/reward/useRewardGarden';
import { SPRING } from '../../theme/springs';
import { BigButton } from '../_primitives/BigButton';
import { StickerArtwork } from '../_primitives/StickerArtwork';
import { XiaomanSprite } from '../_primitives/XiaomanSprite';

interface LevelResultProps {
  correct: number;
  total: number;
  mistakes: number;
  maxCombo: number;
  starsEarned: number;
  rankName: string;
  difficulty: number;
  sticker: Sticker | null;
  gardenReward: GardenReward;
  newSpirits: NumberSpirit[];
  onRetry: () => void;
  onContinue: () => void;
  onInspectSticker?: (sticker: Sticker) => void;
}

function getRating(mistakes: number) {
  if (mistakes === 0) {
    return 'S';
  }

  if (mistakes <= 2) {
    return 'A';
  }

  if (mistakes <= 4) {
    return 'B';
  }

  return 'C';
}

function ResultTile({
  icon,
  value,
  label,
  className,
}: {
  icon: ReactNode;
  value: string;
  label: string;
  className: string;
}) {
  return (
    <div
      className={`rounded-3xl p-4 text-center text-white shadow-xl ring-2 ring-white ${className}`}
    >
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-white/18">
        {icon}
      </div>
      <div className="mt-2 text-4xl font-black leading-none">{value}</div>
      <div className="mt-1 text-lg font-black opacity-95">{label}</div>
    </div>
  );
}

function RewardChest({
  reward,
  newSpirits,
}: {
  reward: GardenReward;
  newSpirits: NumberSpirit[];
}) {
  const visibleSpirits = newSpirits.slice(0, 6);
  const hiddenSpiritCount = Math.max(newSpirits.length - visibleSpirits.length, 0);
  const chestTone = {
    sprout: 'from-child-mint-deep to-child-mint',
    rainbow: 'from-child-sky-mid to-child-rose-mist',
    sun: 'from-child-sun to-child-peach',
  }[reward.chestTier];

  return (
    <div
      className={`relative mt-4 overflow-hidden rounded-3xl bg-gradient-to-br ${chestTone} p-4 text-left text-child-ink shadow-xl ring-2 ring-white`}
    >
      <div className="relative grid gap-4 md:grid-cols-[1fr_1.1fr] md:items-center">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white/70 text-child-leaf shadow-sm ring-2 ring-white">
            <Gift size={34} strokeWidth={3.2} />
          </div>
          <div>
            <div className="text-sm font-black text-emerald-900/75">
              {reward.chestLabel}
            </div>
            <div className="text-2xl font-black leading-tight">
              +{reward.fruitCoins} 果币
            </div>
            <div className="mt-1 text-sm font-black text-emerald-900/75">
              连续 {reward.streak} 天 · {reward.treeStage.name}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {reward.badges.map((badge) => (
            <span
              key={badge.id}
              className="rounded-full bg-white/80 px-3 py-2 text-base font-black text-emerald-950 ring-1 ring-white"
            >
              {badge.emoji} {badge.label}
            </span>
          ))}
          {visibleSpirits.map((spirit) => (
            <span
              key={spirit.value}
              className="rounded-full bg-white/80 px-3 py-2 text-base font-black text-emerald-950 ring-1 ring-white"
            >
              {spirit.emoji} 数字 {spirit.value}
            </span>
          ))}
          {hiddenSpiritCount > 0 ? (
            <span className="rounded-full bg-white/80 px-3 py-2 text-base font-black text-emerald-950 ring-1 ring-white">
              +{hiddenSpiritCount} 个果灵
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function LevelResult({
  correct,
  total,
  mistakes,
  maxCombo,
  starsEarned,
  rankName,
  difficulty,
  sticker,
  gardenReward,
  newSpirits,
  onRetry,
  onContinue,
  onInspectSticker,
}: LevelResultProps) {
  const rating = getRating(mistakes);
  const earnedStars = mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;

  return (
    <motion.section
      key="level-result"
          initial={{ opacity: 0, scale: 0.96, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: -18 }}
      transition={SPRING.smooth}
      className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center gap-4 pb-16 text-center"
    >
      <div className="relative w-full overflow-hidden rounded-[2rem] border border-white/75 bg-white/88 p-5 shadow-[0_28px_90px_rgba(15,118,110,0.18)] ring-1 ring-emerald-900/5 backdrop-blur-xl md:p-6">
        <div className="relative flex flex-col items-center gap-4">
          <div className="relative flex items-center justify-center">
            <XiaomanSprite emotion="cheer" className="h-32 w-32 drop-shadow-xl" />
            <span className="absolute -right-2 top-2 flex h-14 w-14 items-center justify-center rounded-full bg-child-gold text-3xl font-black text-white shadow-xl ring-4 ring-white">
              {rating}
            </span>
          </div>
          <div>
            <div className="text-base font-black text-emerald-700/80">
              Lv.{difficulty} · {rankName}
            </div>
            <h1 className="mt-1 text-5xl font-black leading-none text-emerald-950 md:text-6xl">
              本关完成
            </h1>
          </div>

          <div className="flex gap-2 text-3xl">
            {Array.from({ length: 3 }, (_, index) => (
              <span
                key={index}
                className={
                  index < earnedStars ? 'text-child-gold' : 'text-child-ink/20'
                }
              >
                <Star size={34} fill="currentColor" strokeWidth={2.8} />
              </span>
            ))}
          </div>
        </div>

        <div className="relative mt-5 grid gap-3 md:grid-cols-4">
          <ResultTile
            icon={<Award size={28} strokeWidth={3.2} />}
            value={`${correct}/${total}`}
            label="答对"
            className="bg-gradient-to-br from-teal-400 to-cyan-500"
          />
          <ResultTile
            icon={<Flame size={28} strokeWidth={3.2} />}
            value={String(maxCombo)}
            label="最高连击"
            className="bg-gradient-to-br from-orange-400 to-rose-500"
          />
          <ResultTile
            icon={<Sparkles size={28} strokeWidth={3.2} />}
            value={String(mistakes)}
            label="失误"
            className="bg-gradient-to-br from-sky-400 to-indigo-500"
          />
          <ResultTile
            icon={<Star size={28} strokeWidth={3.2} />}
            value={`+${starsEarned}`}
            label="段位星"
            className="bg-gradient-to-br from-lime-400 to-emerald-500"
          />
        </div>

        <RewardChest reward={gardenReward} newSpirits={newSpirits} />

        {sticker ? (
          <div className="relative mt-5 flex items-center justify-center gap-3 rounded-3xl bg-gradient-to-r from-sky-100 via-white to-rose-100 px-5 py-4 text-2xl font-black text-emerald-950 shadow-lg ring-2 ring-white md:text-3xl">
            <button
              type="button"
              onClick={() => onInspectSticker?.(sticker)}
              aria-label={`查看 ${sticker.name} 贴纸`}
              className="rounded-2xl"
            >
              <StickerArtwork sticker={sticker} className="h-16 w-16 rounded-2xl" />
            </button>
            新贴纸 {sticker.name}
          </div>
        ) : null}
      </div>

      <div className="grid w-full gap-3 md:grid-cols-2">
        <BigButton
          type="button"
          tone="success"
          onClick={onRetry}
          className="flex items-center justify-center gap-3 rounded-3xl px-6 py-4 text-2xl"
        >
          <RotateCcw size={32} strokeWidth={3.2} />
          再来一次
        </BigButton>
        <BigButton
          type="button"
          tone="magic"
          onClick={onContinue}
          className="flex items-center justify-center gap-3 rounded-3xl px-6 py-4 text-2xl"
        >
          <Trophy size={32} strokeWidth={3.2} />
          继续挑战
        </BigButton>
      </div>
    </motion.section>
  );
}
