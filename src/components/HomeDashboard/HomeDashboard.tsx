import { BookOpen, Code2, Gift, Play, Sparkles, Star, Trophy } from 'lucide-react';
import { motion } from 'framer-motion';
import { memo, type ReactNode } from 'react';
import type { Sticker } from '../../engagement/collection/useStickers';
import type { NumberSpirit } from '../../engagement/reward/useNumberSpirits';
import type { GardenState } from '../../engagement/reward/useRewardGarden';
import type { Skin } from '../../engagement/skin/useSkinUnlock';
import type { LearningCard } from '../../learningCards/types';
import { zhCN } from '../../i18n/zh-CN';
import { SPRING } from '../../theme/springs';
import { BigButton } from '../_primitives/BigButton';
import { StickerArtwork } from '../_primitives/StickerArtwork';
import { XiaomanSprite } from '../_primitives/XiaomanSprite';

interface HomeDashboardProps {
  rankName: string;
  stars: string;
  currentCombo: number;
  maxCombo: number;
  correct: number;
  attempted: number;
  difficulty: number;
  stickers: Sticker[];
  stickerTotal: number;
  duplicateShards: number;
  skins: Skin[];
  levelProgress: number;
  levelGoal: number;
  garden: GardenState;
  spirits: NumberSpirit[];
  literacyPreview: LearningCard[];
  englishPreview: LearningCard[];
  programmingCompleted: number;
  programmingTotal: number;
  programmingNextTitle: string;
  onStart: () => void;
  onOpenProgramming: () => void;
  onOpenLiteracy: () => void;
  onOpenEnglish: () => void;
  onOpenStickerAlbum: () => void;
  onInspectSticker: (sticker: Sticker) => void;
}

function progressPercent(current: number, total: number) {
  return total <= 0 ? 0 : Math.min(Math.max((current / total) * 100, 0), 100);
}

function MapButton({
  icon,
  label,
  meta,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  meta: string;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.97 }}
      transition={SPRING.smooth}
      className="flex min-h-[88px] items-center gap-4 rounded-[1.75rem] bg-child-cream px-5 py-4 text-left shadow-child-ink/10 ring-2 ring-white"
    >
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.25rem] bg-child-mint text-child-leaf-dark ring-1 ring-child-mint-deep">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-2xl font-black leading-tight text-child-ink">
          {label}
        </span>
        <span className="mt-1 block truncate text-base font-bold text-child-moss">
          {meta}
        </span>
      </span>
    </motion.button>
  );
}

function HomeDashboardComponent({
  rankName,
  stars,
  currentCombo,
  maxCombo,
  correct,
  attempted,
  difficulty,
  stickers,
  stickerTotal,
  duplicateShards,
  skins,
  levelProgress,
  levelGoal,
  garden,
  spirits,
  literacyPreview,
  englishPreview,
  programmingCompleted,
  programmingTotal,
  programmingNextTitle,
  onStart,
  onOpenProgramming,
  onOpenLiteracy,
  onOpenEnglish,
  onOpenStickerAlbum,
  onInspectSticker,
}: HomeDashboardProps) {
  const latestSticker = stickers[stickers.length - 1] ?? null;
  const unlockedSpiritCount = spirits.filter((spirit) => spirit.unlocked).length;
  const unlockedSkinCount = skins.filter((skin) => skin.unlocked).length;
  const accuracy = attempted === 0 ? 100 : Math.round((correct / attempted) * 100);
  const safeLevelProgress = Math.min(Math.max(levelProgress, 0), levelGoal);
  const remaining = Math.max(levelGoal - safeLevelProgress, 0);
  const languageCount = literacyPreview.length + englishPreview.length;
  const programmingSafeTotal = Math.max(programmingTotal, 1);

  return (
    <motion.section
      key="home"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -14 }}
      transition={SPRING.smooth}
      className="ipad-home-dashboard relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-5 pb-24"
    >
      <section className="kid-surface relative overflow-hidden rounded-[2rem] p-5 shadow-[0_4px_0_rgba(24,48,36,.06),0_18px_44px_rgba(24,48,36,.12)] ring-2 ring-white md:p-7">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-center">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-child-mint px-4 py-2 text-base font-black text-child-leaf-dark ring-1 ring-child-mint-deep">
              <Sparkles size={19} strokeWidth={3} />
              果园伙伴 小满
            </div>
            <h1 className="mt-4 text-5xl font-black leading-[1.05] tracking-normal text-child-ink md:text-6xl">
              今天练 5 道？
            </h1>
            <p className="mt-3 max-w-2xl text-lg font-bold leading-relaxed text-child-moss md:text-xl">
              Lv.{difficulty} · {rankName} · 小星 {stars}
            </p>

            <div className="mt-5 max-w-xl">
              <div className="flex items-center justify-between gap-3 text-base font-black text-child-leaf-dark">
                <span>本轮进度</span>
                <span>{safeLevelProgress}/{levelGoal}</span>
              </div>
              <div className="mt-2 h-4 overflow-hidden rounded-full bg-white ring-1 ring-child-mint-deep">
                <div
                  className="h-full rounded-full bg-child-leaf"
                  style={{ width: `${progressPercent(safeLevelProgress, levelGoal)}%` }}
                />
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <BigButton
                type="button"
                tone="success"
                onClick={onStart}
                className="flex min-h-[88px] items-center justify-center gap-3 rounded-[2.25rem] px-8 py-5 text-3xl shadow-[0_4px_0_rgba(30,107,19,.22),0_16px_32px_rgba(62,160,45,.18)]"
              >
                <Play size={34} fill="currentColor" strokeWidth={3.2} />
                {zhCN.home.primaryAction}
              </BigButton>
              <span className="rounded-full bg-white px-4 py-2 text-base font-black text-child-moss ring-1 ring-child-mint-deep">
                还差 {remaining} 题
              </span>
            </div>
          </div>

          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut' }}
            className="mx-auto flex w-full max-w-[18rem] justify-center lg:pr-6"
          >
            <XiaomanSprite emotion="happy" className="w-full drop-shadow-xl" />
          </motion.div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <MapButton
          icon={<Gift size={30} strokeWidth={3.1} />}
          label="奖励屋"
          meta={`${stickers.length}/${stickerTotal} 张伙伴贴纸`}
          onClick={onOpenStickerAlbum}
        />
        <MapButton
          icon={<BookOpen size={30} strokeWidth={3.1} />}
          label="语言乐园"
          meta={`${languageCount} 张卡片 · 识字/英语`}
          onClick={onOpenLiteracy}
        />
        <MapButton
          icon={<Code2 size={30} strokeWidth={3.1} />}
          label="编程岛"
          meta={`${programmingCompleted}/${programmingSafeTotal} · ${programmingNextTitle}`}
          onClick={onOpenProgramming}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="rounded-[1.75rem] bg-white/88 p-5 shadow-sm ring-1 ring-child-mint-deep">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black text-child-ink">今日状态</h2>
              <p className="mt-1 text-base font-bold text-child-moss">
                正确率 {accuracy}% · 最佳连击 {Math.max(currentCombo, maxCombo)}
              </p>
            </div>
            <div className="rounded-full bg-child-mint px-4 py-2 text-base font-black text-child-leaf-dark ring-1 ring-child-mint-deep">
              果灵 {unlockedSpiritCount}/10
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-[1.25rem] bg-child-mint p-4 text-child-ink ring-1 ring-child-mint-deep">
              <Star size={26} strokeWidth={3} />
              <div className="mt-2 text-xl font-black">{rankName}</div>
              <div className="text-sm font-bold text-child-moss">段位</div>
            </div>
            <div className="rounded-[1.25rem] bg-child-sun p-4 text-child-ink ring-1 ring-child-gold-soft">
              <Trophy size={26} strokeWidth={3} />
              <div className="mt-2 text-xl font-black">{garden.treeStage.name}</div>
              <div className="text-sm font-bold text-child-moss">
                连续 {garden.streak} 天
              </div>
            </div>
            <div className="rounded-[1.25rem] bg-child-sky p-4 text-child-ink ring-1 ring-child-sky-mid">
              <Sparkles size={26} strokeWidth={3} />
              <div className="mt-2 text-xl font-black">{unlockedSkinCount}</div>
              <div className="text-sm font-bold text-child-moss">主题已解锁</div>
            </div>
          </div>
        </div>

        <div className="rounded-[1.75rem] bg-white/88 p-5 shadow-sm ring-1 ring-child-mint-deep">
          <div className="text-base font-black text-child-leaf-dark">最近贴纸</div>
          {latestSticker ? (
            <button
              type="button"
              onClick={() => onInspectSticker(latestSticker)}
              aria-label={`查看最新贴纸 ${latestSticker.name}`}
              className="mt-3 flex w-full items-center gap-3 rounded-[1.25rem] bg-child-cream p-3 text-left ring-1 ring-child-sun"
            >
              <StickerArtwork sticker={latestSticker} className="h-16 w-16 rounded-2xl" />
              <span className="min-w-0">
                <span className="block truncate text-lg font-black text-child-ink">
                  {latestSticker.name}
                </span>
                <span className="text-sm font-bold text-child-moss">
                  重复光片 {duplicateShards}
                </span>
              </span>
            </button>
          ) : (
            <div className="mt-3 rounded-[1.25rem] bg-child-cream p-4 text-base font-bold text-child-moss ring-1 ring-child-sun">
              完成一次挑战后，小满会把新贴纸放到这里。
            </div>
          )}
        </div>
      </section>
    </motion.section>
  );
}

export const HomeDashboard = memo(HomeDashboardComponent);
