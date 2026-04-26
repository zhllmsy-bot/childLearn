import { MessageCircle, X, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Sticker } from '../../engagement/collection/useStickers';
import { SPRING } from '../../theme/springs';
import { StickerArtwork } from '../_primitives/StickerArtwork';

interface StickerActionModalProps {
  sticker: Sticker;
  onClose: () => void;
  onReplayVoice: () => void;
}

export function StickerActionModal({
  sticker,
  onClose,
  onReplayVoice,
}: StickerActionModalProps) {
  return (
    <motion.div
      key={sticker.id}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-emerald-950/55 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.section
        role="dialog"
        aria-modal="true"
        aria-label={`${sticker.name} 贴纸动作`}
        initial={{ opacity: 0, y: 24, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 18, scale: 0.96 }}
        transition={SPRING.smooth}
        onClick={(event) => event.stopPropagation()}
        className="relative flex max-h-[92svh] w-full max-w-4xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl shadow-emerald-950/30 ring-4 ring-white"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="关闭贴纸"
          className="absolute right-4 top-4 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/92 text-emerald-950 shadow-lg ring-1 ring-emerald-900/10"
        >
          <X size={28} strokeWidth={3} />
        </button>

        <div
          className={`relative flex shrink-0 items-center justify-center overflow-hidden bg-gradient-to-br ${sticker.accent} p-5 md:p-6`}
          style={{ height: 'min(58svh, 42rem)', minHeight: '22rem' }}
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(255,255,255,0.7),transparent_34%)]" />
          <motion.div
            initial={{ rotate: -4, scale: 0.88 }}
            animate={{
              rotate: [-4, 1.5, -1],
              scale: [0.88, 1.05, 1],
            }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="relative z-10 flex h-full w-full max-w-3xl items-center justify-center"
          >
            <StickerArtwork
              sticker={sticker}
              fit="contain"
              className="h-full w-full rounded-[1.7rem] bg-white/96 shadow-2xl shadow-emerald-950/25"
              imageClassName="p-2"
            />
          </motion.div>

          <motion.div
            initial={{ x: '-70%', opacity: 0 }}
            animate={{ x: ['-70%', '85%'], opacity: [0, 0.95, 0] }}
            transition={{ duration: 1.1, delay: 0.25, repeat: Infinity, repeatDelay: 1.4 }}
            className="pointer-events-none absolute left-0 top-[58%] h-5 w-2/3 -rotate-6 rounded-full bg-gradient-to-r from-white via-cyan-100 to-rose-200 blur-sm"
          />
        </div>

        <div className="grid min-w-0 gap-4 p-5 md:grid-cols-[minmax(0,1fr)_18rem] md:p-6">
          <div className="min-w-0">
            <div className="text-sm font-black text-emerald-700/80">{sticker.group}</div>
            <h2 className="mt-1 text-4xl font-black leading-tight text-emerald-950 md:text-5xl">
              {sticker.name}
            </h2>
            <p className="mt-3 text-xl font-black leading-relaxed text-emerald-900/75">
              {sticker.actionDescription}
            </p>
            <div className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-emerald-950 ring-1 ring-emerald-100">
              <div className="flex items-center gap-2 text-sm font-black text-emerald-700">
                <Zap size={18} fill="currentColor" strokeWidth={3} />
                招牌动作
              </div>
              <div className="mt-1 text-2xl font-black leading-tight">
                {sticker.signatureMove}
              </div>
            </div>
          </div>

          <div className="flex min-w-0 flex-col justify-end gap-3">
            <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-lg font-black text-emerald-950 ring-1 ring-emerald-100">
              {sticker.voiceLine}
            </div>
            <button
              type="button"
              onClick={onReplayVoice}
              className="flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-teal-500 px-5 py-4 text-2xl font-black text-white shadow-xl shadow-cyan-500/25 ring-2 ring-white"
            >
              <MessageCircle size={30} strokeWidth={3.2} />
              再听一次
            </button>
          </div>
        </div>
      </motion.section>
    </motion.div>
  );
}
