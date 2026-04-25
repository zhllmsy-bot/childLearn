import {
  Award,
  BookOpen,
  Bot,
  ChevronRight,
  Code2,
  Flame,
  Gift,
  Lock,
  Medal,
  Play,
  Sparkles,
  Star,
  Trophy,
  Repeat2,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { memo, type ReactNode } from 'react';
import type {
  Sticker,
  StickerSeriesProgress,
} from '../../engagement/collection/useStickers';
import type { NumberSpirit } from '../../engagement/reward/useNumberSpirits';
import type { GardenState } from '../../engagement/reward/useRewardGarden';
import type { Skin } from '../../engagement/skin/useSkinUnlock';
import type { LearningCard } from '../../learningCards/types';
import { zhCN } from '../../i18n/zh-CN';
import { SPRING } from '../../theme/springs';
import { ELEV } from '../../theme/tokens';
import { BigButton } from '../_primitives/BigButton';
import { StickerArtwork } from '../_primitives/StickerArtwork';

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
  stickerSeriesProgress: StickerSeriesProgress[];
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

const CHEST_GOAL = 4;

function MiniMetric({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={SPRING.smooth}
      className="rounded-[1.25rem] bg-white/90 p-3 text-center shadow-sm ring-1 ring-emerald-900/10"
    >
      <div
        className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br ${tone} text-white shadow-lg ring-4 ring-white`}
      >
        {icon}
      </div>
      <div className="mt-2 text-xs font-black text-emerald-700/85">{label}</div>
      <div className="truncate text-xl font-black text-emerald-950">{value}</div>
    </motion.div>
  );
}

function StickerSlot({
  sticker,
  index,
  onInspectSticker,
}: {
  sticker?: Sticker;
  index: number;
  onInspectSticker: (sticker: Sticker) => void;
}) {
  return (
    <motion.button
      type="button"
      disabled={!sticker}
      onClick={() => {
        if (sticker) {
          onInspectSticker(sticker);
        }
      }}
      whileHover={sticker ? { y: -4, rotate: -3 } : undefined}
      whileTap={sticker ? { scale: 0.96 } : undefined}
      transition={SPRING.bounce}
      title={sticker?.name ?? `贴纸位 ${index + 1}`}
      aria-label={sticker ? `查看 ${sticker.name} 贴纸` : `未解锁贴纸位 ${index + 1}`}
      className={`flex aspect-square items-center justify-center rounded-2xl border text-4xl shadow-sm ${
        sticker
          ? 'cursor-pointer border-slate-200 bg-white shadow-sky-200/50'
          : 'border-slate-200/80 bg-slate-50/80 text-slate-500/45'
      }`}
    >
      {sticker ? (
        <StickerArtwork
          sticker={sticker}
          fit="contain"
          className="h-[82%] w-[82%]"
          imageClassName="p-1"
        />
      ) : (
        <Lock size={24} strokeWidth={3} />
      )}
    </motion.button>
  );
}

function DailyGardenPanel({ garden }: { garden: GardenState }) {
  const progressPercent =
    garden.treeStage.goal === 0
      ? 100
      : Math.min((garden.treeStage.progress / garden.treeStage.goal) * 100, 100);

  return (
    <div className="rounded-2xl bg-white/18 p-3 ring-1 ring-white/25">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-black text-white/80">
            {garden.todayWatered ? '今日已浇水' : '今日待浇水'}
          </div>
          <div className="mt-1 truncate text-3xl font-black">
            {garden.treeStage.name}
          </div>
          <div className="mt-1 text-base font-black text-white/80">
            连续 {garden.streak} 天 · 果币 {garden.fruitCoins}
          </div>
        </div>
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-white/18 text-5xl ring-1 ring-white/25">
          {garden.treeStage.emoji}
        </div>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <div className="h-3 flex-1 overflow-hidden rounded-full bg-white/20">
          <div
            className="h-full rounded-full bg-gradient-to-r from-yellow-200 to-lime-200"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <span className="text-sm font-black text-white/85">
          {garden.treeStage.progress}/{garden.treeStage.goal}
        </span>
      </div>
    </div>
  );
}

function NumberSpiritRail({ spirits }: { spirits: NumberSpirit[] }) {
  const unlockedCount = spirits.filter((spirit) => spirit.unlocked).length;

  return (
    <section className="mt-4 rounded-[2rem] border border-white/70 bg-white/90 p-5 shadow-sm ring-1 ring-emerald-900/10 backdrop-blur-xl md:pr-24 xl:pr-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-sm font-black text-emerald-700/80">数字果灵</div>
          <h2 className="text-4xl font-black text-emerald-950">1-10 小伙伴</h2>
        </div>
        <div className="rounded-full bg-emerald-50 px-4 py-2 text-base font-black text-emerald-800 ring-1 ring-emerald-100">
          {unlockedCount}/10
        </div>
      </div>

      <div className="mt-5 grid grid-cols-5 gap-3 xl:grid-cols-10">
        {spirits.map((spirit) => (
          <motion.div
            key={spirit.value}
            whileHover={spirit.unlocked ? { y: -4 } : undefined}
            transition={SPRING.bounce}
            title={spirit.name}
            className={`flex aspect-square min-h-20 flex-col items-center justify-center rounded-2xl text-center shadow-sm ring-1 ${
              spirit.unlocked
                ? 'bg-gradient-to-br from-yellow-100 via-lime-100 to-emerald-100 text-emerald-950 ring-emerald-100'
                : 'bg-emerald-50/70 text-emerald-900/30 ring-emerald-100'
            }`}
          >
            <div className="text-3xl">{spirit.unlocked ? spirit.emoji : '•'}</div>
            <div className="mt-1 text-2xl font-black leading-none">{spirit.value}</div>
            <div className="mt-1 flex gap-0.5">
              {Array.from({ length: 3 }, (_, index) => (
                <span
                  key={index}
                  className={`h-1.5 w-1.5 rounded-full ${
                    index < spirit.level ? 'bg-amber-400' : 'bg-emerald-900/10'
                  }`}
                />
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function LearningPreviewBlock({
  eyebrow,
  title,
  actionLabel,
  items,
  onOpen,
}: {
  eyebrow: string;
  title: string;
  actionLabel: string;
  items: LearningCard[];
  onOpen: () => void;
}) {
  return (
    <div className="min-w-0 rounded-[1.75rem] bg-white/74 p-4 ring-1 ring-emerald-900/10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-sm font-black text-emerald-700/80">{eyebrow}</div>
          <h3 className="text-3xl font-black text-emerald-950">{title}</h3>
        </div>
        <button
          type="button"
          onClick={onOpen}
          className="inline-flex h-14 items-center gap-2 rounded-2xl bg-emerald-50 px-4 text-base font-black text-emerald-800 shadow-sm ring-1 ring-emerald-100"
        >
          <BookOpen size={22} strokeWidth={3.2} />
          {actionLabel}
          <ChevronRight size={20} strokeWidth={3.2} />
        </button>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        {items.map((item) => (
          <motion.button
            key={item.id}
            type="button"
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.97 }}
            transition={SPRING.bounce}
            onClick={onOpen}
            className={`relative min-h-32 overflow-hidden rounded-[1.5rem] bg-gradient-to-br ${item.tone} p-4 text-left shadow-sm ring-1 ring-white/80`}
          >
            <span className="absolute right-4 top-4 text-4xl">{item.graphic}</span>
            <span className="block text-5xl font-black leading-none tracking-normal text-emerald-950">
              {item.glyph}
            </span>
            <span className="mt-2 block text-lg font-black tracking-normal text-emerald-700/85">
              {item.phonetic}
            </span>
            <span className="mt-5 inline-flex rounded-full bg-white/80 px-3 py-1 text-sm font-black text-emerald-800 ring-1 ring-white">
              {item.words[0]?.text}
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

function LanguagePreviewPanel({
  literacyPreview,
  englishPreview,
  onOpenLiteracy,
  onOpenEnglish,
}: {
  literacyPreview: LearningCard[];
  englishPreview: LearningCard[];
  onOpenLiteracy: () => void;
  onOpenEnglish: () => void;
}) {
  return (
    <section className="mt-4 rounded-[2rem] border border-white/70 bg-white/90 p-5 shadow-sm ring-1 ring-emerald-900/10 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-4">
        <div>
	          <div className="text-sm font-black text-emerald-700/80">
	            {zhCN.home.languageModuleEyebrow}
	          </div>
	          <h2 className="text-4xl font-black text-emerald-950">语言乐园</h2>
	        </div>
	        <div className="rounded-full bg-emerald-50 px-4 py-2 text-base font-black text-emerald-800 ring-1 ring-emerald-100">
	          卡片库
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <LearningPreviewBlock
          eyebrow="识字模块"
          title="识字乐园"
          actionLabel="开始认字"
          items={literacyPreview}
          onOpen={onOpenLiteracy}
        />
        <LearningPreviewBlock
          eyebrow="英语模块"
          title="英语乐园"
          actionLabel="开始英语"
          items={englishPreview}
          onOpen={onOpenEnglish}
        />
      </div>
    </section>
  );
}

function ProgrammingPreviewPanel({
  completed,
  total,
  nextTitle,
  onOpenProgramming,
}: {
  completed: number;
  total: number;
  nextTitle: string;
  onOpenProgramming: () => void;
}) {
  const safeTotal = Math.max(total, 1);
  const safeCompleted = Math.min(Math.max(completed, 0), safeTotal);
  const progressPercent = Math.min((safeCompleted / safeTotal) * 100, 100);
  const nextLabel = safeCompleted >= safeTotal ? '全部通关' : nextTitle;

  return (
    <section className="mt-4 overflow-hidden rounded-[2rem] border border-white/70 bg-gradient-to-br from-sky-700 via-teal-600 to-emerald-500 p-5 text-white shadow-xl shadow-sky-500/20 ring-1 ring-white/30">
      <div className="flex flex-wrap items-center justify-between gap-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-black text-white/80">
            <Code2 size={18} strokeWidth={3} />
	            {zhCN.home.programmingModuleEyebrow}
          </div>
          <h2 className="mt-2 text-4xl font-black leading-tight md:text-5xl">
            光之编程馆
          </h2>
          <p className="mt-2 max-w-2xl text-lg font-black leading-snug text-white/82">
            拼前进、转向和重复，让小光按你的程序走到能量果。
          </p>
          <div className="mt-4 max-w-xl">
            <div className="flex items-center justify-between gap-3 text-sm font-black text-white/78">
              <span>下一关：{nextLabel}</span>
              <span>{safeCompleted}/{safeTotal}</span>
            </div>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/18 ring-1 ring-white/20">
              <div
                className="h-full rounded-full bg-white"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        <div className="grid min-w-[16rem] flex-1 grid-cols-3 gap-3 sm:max-w-xl">
          <div className="rounded-[1.5rem] bg-white/16 p-4 ring-1 ring-white/25">
            <Bot size={30} strokeWidth={3.2} />
            <div className="mt-3 text-sm font-black text-white/75">角色</div>
            <div className="text-2xl font-black">小光</div>
          </div>
          <div className="rounded-[1.5rem] bg-white/16 p-4 ring-1 ring-white/25">
            <ChevronRight size={30} strokeWidth={3.2} />
            <div className="mt-3 text-sm font-black text-white/75">概念</div>
            <div className="text-2xl font-black">顺序</div>
          </div>
          <div className="rounded-[1.5rem] bg-white/16 p-4 ring-1 ring-white/25">
            <Repeat2 size={30} strokeWidth={3.2} />
            <div className="mt-3 text-sm font-black text-white/75">进阶</div>
            <div className="text-2xl font-black">重复</div>
          </div>
        </div>

        <BigButton
          type="button"
          tone="primary"
          onClick={onOpenProgramming}
          className="flex shrink-0 items-center justify-center gap-3 rounded-2xl bg-white px-6 py-4 text-2xl text-sky-700 shadow-lg shadow-sky-900/15 ring-white"
        >
          <Code2 size={30} strokeWidth={3.2} />
          去编程
        </BigButton>
      </div>
    </section>
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
  stickerSeriesProgress,
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
  const accuracy = attempted === 0 ? 100 : Math.round((correct / attempted) * 100);
  const unlockedSkins = skins.filter((skin) => skin.unlocked);
  const recentStickers = [...stickers].slice(-10).reverse();
  const latestSticker = recentStickers[0];
  const bestCombo = Math.max(currentCombo, maxCombo);
  const chestProgress = correct % CHEST_GOAL;
  const nextPrizeRemaining = chestProgress === 0 ? CHEST_GOAL : CHEST_GOAL - chestProgress;
  const safeLevelProgress = Math.min(Math.max(levelProgress, 0), levelGoal);
  const levelPercent =
    levelGoal === 0 ? 0 : Math.min((safeLevelProgress / levelGoal) * 100, 100);
  const levelRemaining = Math.max(levelGoal - safeLevelProgress, 0);
  const stickerProgress =
    stickerTotal === 0 ? 0 : Math.min((stickers.length / stickerTotal) * 100, 100);
  const albumSlots = Array.from({ length: 10 }, (_, index) => recentStickers[index]);
  const leadingSeries = stickerSeriesProgress[0];

  return (
    <motion.section
      key="home"
      initial={{ opacity: 0, y: 26 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={SPRING.smooth}
      className="ipad-home-dashboard relative z-10 mx-auto w-full max-w-7xl pb-24"
    >
      <section
        className={`relative overflow-hidden rounded-[2rem] border border-white/70 bg-white/88 p-5 ${ELEV.card} ring-1 ring-emerald-900/5 backdrop-blur-xl md:p-6`}
      >
        <div className="pointer-events-none absolute bottom-2 left-[48%] text-6xl text-rose-400 opacity-10">
          ✦
        </div>

        <div className="home-redesign-grid relative grid gap-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-sm font-black text-emerald-700/85">
                  <Sparkles size={18} strokeWidth={3} />
                  今日首页
                </div>
                <h1 className="mt-2 text-5xl font-black leading-none text-emerald-950 md:text-6xl">
                  光之奖励馆
                </h1>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-base font-black text-emerald-900 ring-1 ring-emerald-200">
                  <Award size={18} strokeWidth={3} />
                  {rankName}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-4 py-2 text-base font-black text-emerald-900 ring-1 ring-sky-200">
                  <Star size={18} strokeWidth={3} />
                  小星 {stars}
                </span>
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="rounded-[1.5rem] bg-gradient-to-br from-emerald-50 via-lime-50 to-yellow-50 p-4 ring-1 ring-emerald-200/80">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-sm font-black text-emerald-700">今日目标</div>
                    <div className="mt-1 truncate text-3xl font-black text-emerald-950">
                      Lv.{difficulty} · {rankName}
                    </div>
                  </div>
                  <div className="rounded-full bg-white px-4 py-2 text-base font-black text-emerald-800 shadow-sm ring-1 ring-emerald-900/10">
                    还差 {levelRemaining}
                  </div>
                </div>
                <div className="mt-4 h-4 overflow-hidden rounded-full bg-white/80 ring-1 ring-emerald-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-lime-400"
                    style={{ width: `${levelPercent}%` }}
                  />
                </div>
                <div className="mt-2 text-sm font-black text-emerald-700/80">
                  {safeLevelProgress}/{levelGoal}
                </div>
              </div>

              <div className="rounded-[1.5rem] bg-gradient-to-br from-yellow-50 to-amber-100 p-4 ring-1 ring-amber-200">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-black text-amber-700">下个宝箱</div>
                    <div className="mt-1 text-3xl font-black text-emerald-950">
                      还差 {nextPrizeRemaining} 题
                    </div>
                  </div>
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-amber-500 shadow-sm ring-1 ring-amber-200">
                    <Gift size={34} strokeWidth={3.2} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <aside className="flex min-w-0 flex-col justify-between gap-3 rounded-[1.5rem] bg-gradient-to-br from-sky-600 via-teal-500 to-rose-500 p-4 text-white shadow-xl shadow-sky-500/25">
            <DailyGardenPanel garden={garden} />
            <div>
              <div className="text-sm font-black text-white/80">继续练习</div>
              <div className="mt-1 text-3xl font-black">点亮下一枚徽章</div>
            </div>
              <div className="rounded-2xl bg-white/18 p-3 ring-1 ring-white/25">
                <div className="flex items-center justify-between text-sm font-black">
                  <span>{leadingSeries?.series ?? '光之贴纸'}</span>
                  <span>{leadingSeries ? `${leadingSeries.collected}/${leadingSeries.total}` : `${stickers.length}/${stickerTotal}`}</span>
                </div>
                <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/20">
                  <div
                    className="h-full rounded-full bg-white"
                    style={{
                      width: `${
                        leadingSeries
                          ? Math.min((leadingSeries.collected / leadingSeries.total) * 100, 100)
                          : stickerProgress
                      }%`,
                    }}
                  />
                </div>
                {duplicateShards > 0 ? (
                  <div className="mt-2 text-xs font-black text-white/75">
                    重复光片 {duplicateShards}
                  </div>
                ) : null}
              </div>
            <BigButton
              type="button"
              tone="success"
              onClick={onStart}
              className="flex w-full items-center justify-center gap-3 rounded-2xl bg-white px-6 py-4 text-2xl text-emerald-700 shadow-lg shadow-emerald-900/15 ring-white"
            >
              <Play size={30} fill="currentColor" strokeWidth={3.2} />
	              {zhCN.home.primaryAction}
            </BigButton>
          </aside>
        </div>
      </section>

      <NumberSpiritRail spirits={spirits} />

      <ProgrammingPreviewPanel
        completed={programmingCompleted}
        total={programmingTotal}
        nextTitle={programmingNextTitle}
        onOpenProgramming={onOpenProgramming}
      />

      <LanguagePreviewPanel
        literacyPreview={literacyPreview}
        englishPreview={englishPreview}
        onOpenLiteracy={onOpenLiteracy}
        onOpenEnglish={onOpenEnglish}
      />

      <section className="mt-4 grid gap-4 lg:grid-cols-[1.08fr_0.92fr]">
        <div className="rounded-[2rem] border border-white/70 bg-white/90 p-5 shadow-sm ring-1 ring-emerald-900/10 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-black text-emerald-700/80">最近获得</div>
              <h2 className="text-4xl font-black text-emerald-950">奥特贴纸</h2>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onOpenStickerAlbum}
                className="inline-flex h-14 items-center gap-2 rounded-2xl bg-emerald-50 px-4 text-base font-black text-emerald-800 shadow-sm ring-1 ring-emerald-100"
              >
                <BookOpen size={22} strokeWidth={3.2} />
                查看全部
                <ChevronRight size={20} strokeWidth={3.2} />
              </button>
              {latestSticker ? (
                <button
                  type="button"
                  onClick={() => onInspectSticker(latestSticker)}
                  aria-label={`查看最新贴纸 ${latestSticker.name}`}
                  className="rounded-2xl"
                >
                  <StickerArtwork
                    sticker={latestSticker}
                    fit="contain"
                    className="h-16 w-16 rounded-2xl shadow-lg shadow-sky-200/70"
                    imageClassName="p-1"
                  />
                </button>
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100">
                  <Sparkles size={32} strokeWidth={3} />
                </div>
              )}
            </div>
          </div>
          <div className="mt-5 grid grid-cols-5 gap-3">
            {albumSlots.map((sticker, index) => (
              <StickerSlot
                key={sticker?.id ?? `slot-${index}`}
                sticker={sticker}
                index={index}
                onInspectSticker={onInspectSticker}
              />
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/70 bg-white/90 p-5 shadow-sm ring-1 ring-emerald-900/10 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-black text-emerald-700/80">奖章盘</div>
              <h2 className="text-4xl font-black text-emerald-950">成就奖章</h2>
            </div>
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-500 ring-1 ring-amber-100">
              <Trophy size={34} strokeWidth={3.2} />
            </div>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-3">
            <MiniMetric
              icon={<Medal size={28} strokeWidth={3.2} />}
              label="段位"
              value={rankName}
              tone="from-yellow-300 to-amber-500"
            />
            <MiniMetric
              icon={<Flame size={28} strokeWidth={3.2} />}
              label="连击"
              value={String(bestCombo)}
              tone="from-orange-300 to-rose-400"
            />
            <MiniMetric
              icon={<Trophy size={28} strokeWidth={3.2} />}
              label="正确率"
              value={`${accuracy}%`}
              tone="from-emerald-300 to-teal-500"
            />
          </div>
        </div>
      </section>

      <div className="mt-4 flex flex-wrap gap-2">
        {unlockedSkins.map((skin) => (
          <span
            key={skin.id}
            className={`rounded-full bg-gradient-to-r ${skin.gradient} px-4 py-2 text-base font-black text-emerald-950 shadow-sm ring-1 ring-white`}
          >
            {skin.name}
          </span>
        ))}
      </div>
    </motion.section>
  );
}

export const HomeDashboard = memo(HomeDashboardComponent);
