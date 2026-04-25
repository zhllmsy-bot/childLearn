import { ArrowLeft, BookOpen, Lock, Sparkles, Star, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import {
  getStickerMeta,
  type Sticker,
  type StickerSeriesProgress,
} from '../../engagement/collection/useStickers';
import { SPRING } from '../../theme/springs';
import { StickerArtwork } from '../_primitives/StickerArtwork';

interface StickerAlbumPageProps {
  stickers: Sticker[];
  stickerTotal: number;
  seriesProgress: StickerSeriesProgress[];
  onBack: () => void;
  onInspectSticker: (sticker: Sticker) => void;
}

function AlbumMetric({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-[1.5rem] bg-gradient-to-br from-emerald-50 via-lime-50 to-yellow-50 p-4 ring-1 ring-emerald-200/80">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="text-sm font-black text-emerald-700/80">{label}</div>
          <div className="mt-1 truncate text-3xl font-black text-emerald-950">
            {value}
          </div>
        </div>
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white text-emerald-700 shadow-sm ring-1 ring-emerald-100">
          {icon}
        </div>
      </div>
    </div>
  );
}

export function StickerAlbumPage({
  stickers,
  stickerTotal,
  seriesProgress,
  onBack,
  onInspectSticker,
}: StickerAlbumPageProps) {
  const recentStickers = [...stickers].reverse();
  const latestSticker = recentStickers[0];
  const stickerProgress =
    stickerTotal === 0 ? 0 : Math.min((stickers.length / stickerTotal) * 100, 100);

  return (
    <motion.section
      key="stickers"
      initial={{ opacity: 0, y: 26 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={SPRING.smooth}
      className="relative z-10 mx-auto w-full max-w-7xl pb-24"
    >
      <section className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-white/88 p-5 shadow-[0_24px_80px_rgba(15,118,110,0.14)] ring-1 ring-emerald-900/5 backdrop-blur-xl md:p-6">
        <div className="sticker-album-summary-grid relative grid gap-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={onBack}
                className="inline-flex h-14 items-center gap-2 rounded-2xl bg-emerald-50 px-4 text-base font-black text-emerald-800 shadow-sm ring-1 ring-emerald-100"
              >
                <ArrowLeft size={22} strokeWidth={3.2} />
                返回
              </button>
              <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-4 py-2 text-base font-black text-emerald-900 ring-1 ring-sky-200">
                <BookOpen size={18} strokeWidth={3} />
                {stickers.length}/{stickerTotal}
              </div>
            </div>

            <div className="mt-5">
              <div className="flex items-center gap-2 text-sm font-black text-emerald-700/85">
                <Sparkles size={18} strokeWidth={3} />
                伙伴收藏册
              </div>
              <h1 className="mt-2 text-5xl font-black leading-none text-emerald-950 md:text-6xl">
                贴纸图鉴
              </h1>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-[1.5rem] bg-gradient-to-br from-emerald-50 via-lime-50 to-yellow-50 p-4 ring-1 ring-emerald-200/80">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-sm font-black text-emerald-700">
                      收集进度
                    </div>
                    <div className="mt-1 truncate text-3xl font-black text-emerald-950">
                      已获得 {stickers.length} 张
                    </div>
                  </div>
                  <div className="rounded-full bg-white px-4 py-2 text-base font-black text-emerald-800 shadow-sm ring-1 ring-emerald-900/10">
                    {Math.round(stickerProgress)}%
                  </div>
                </div>
                <div className="mt-4 h-4 overflow-hidden rounded-full bg-white/80 ring-1 ring-emerald-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-lime-400"
                    style={{ width: `${stickerProgress}%` }}
                  />
                </div>
              </div>

              <AlbumMetric
                label="最新获得"
                value={latestSticker?.name ?? '待解锁'}
                icon={
                  latestSticker ? (
                    <Star size={34} strokeWidth={3.2} />
                  ) : (
                    <Lock size={32} strokeWidth={3} />
                  )
                }
              />
            </div>
            {seriesProgress.length > 0 ? (
              <div className="mt-4 grid gap-2 md:grid-cols-2">
                {seriesProgress.slice(0, 4).map((series) => (
                  <div
                    key={series.series}
                    className="rounded-[1.25rem] bg-white/74 p-3 ring-1 ring-emerald-900/10"
                  >
                    <div className="flex items-center justify-between gap-3 text-sm font-black text-emerald-800">
                      <span className="truncate">{series.series}</span>
                      <span>{series.collected}/{series.total}</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-emerald-50">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-sky-400 to-emerald-400"
                        style={{
                          width: `${Math.min((series.collected / series.total) * 100, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <aside className="flex min-w-0 flex-col justify-between gap-3 rounded-[1.5rem] bg-gradient-to-br from-child-blue to-child-leaf p-4 text-white shadow-xl shadow-sky-500/25">
            {latestSticker ? (
              <motion.button
                type="button"
                onClick={() => onInspectSticker(latestSticker)}
                whileHover={{ y: -4, rotate: 1 }}
                whileTap={{ scale: 0.97 }}
                transition={SPRING.bounce}
                className="min-w-0 rounded-[1.25rem] bg-white/18 p-3 text-left ring-1 ring-white/25"
              >
                <StickerArtwork
                  sticker={latestSticker}
                  className="aspect-[4/3] w-full rounded-[1rem] shadow-xl shadow-emerald-950/20"
                  imageClassName="object-cover"
                />
                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-black text-white/80">最新获得</div>
                    <div className="truncate text-3xl font-black">
                      {latestSticker.name}
                    </div>
                  </div>
                  <Zap className="shrink-0" size={30} fill="currentColor" strokeWidth={3} />
                </div>
              </motion.button>
            ) : (
              <div className="flex min-h-64 items-center justify-center rounded-[1.25rem] bg-white/18 ring-1 ring-white/25">
                <Lock size={42} strokeWidth={3} />
              </div>
            )}
          </aside>
        </div>
      </section>

      <section className="mt-4 rounded-[2rem] border border-white/70 bg-white/90 p-5 shadow-sm ring-1 ring-emerald-900/10 backdrop-blur-xl md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-sm font-black text-emerald-700/80">全部已获得</div>
            <h2 className="text-4xl font-black text-emerald-950">贴纸墙</h2>
          </div>
          <div className="rounded-full bg-emerald-50 px-4 py-2 text-base font-black text-emerald-800 ring-1 ring-emerald-100">
            {stickers.length} 张
          </div>
        </div>

        {recentStickers.length > 0 ? (
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
            {recentStickers.map((sticker, index) => (
              <motion.button
                type="button"
                key={sticker.id}
                onClick={() => onInspectSticker(sticker)}
                whileHover={{ y: -5 }}
                whileTap={{ scale: 0.97 }}
                transition={SPRING.bounce}
                className="min-w-0 rounded-[1.35rem] bg-white p-3 text-left shadow-sm ring-1 ring-emerald-900/10"
              >
                <StickerArtwork
                  sticker={sticker}
                  className="aspect-[4/3] w-full rounded-[1rem] shadow-md shadow-sky-200/50"
                  imageClassName="object-cover"
                />
                <div className="mt-3 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-xl font-black text-emerald-950">
                      {sticker.name}
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 truncate text-base font-bold text-emerald-700/78">
                      <Zap size={16} fill="currentColor" strokeWidth={3} />
                      {sticker.signatureMove}
                    </div>
                    <div className="mt-1 text-base font-bold text-sky-700">
                      {getStickerMeta(sticker).rarityLabel} · {getStickerMeta(sticker).series}
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-2 py-1 text-base font-bold text-emerald-800 ring-1 ring-emerald-100">
                    #{recentStickers.length - index}
                  </span>
                </div>
              </motion.button>
            ))}
          </div>
        ) : (
          <div className="mt-5 flex min-h-64 flex-col items-center justify-center rounded-[1.5rem] bg-emerald-50/80 text-center ring-1 ring-emerald-100">
            <Sparkles size={42} strokeWidth={3} className="text-emerald-600" />
            <div className="mt-3 text-2xl font-black text-emerald-950">
              还没有获得贴纸
            </div>
          </div>
        )}
      </section>
    </motion.section>
  );
}
