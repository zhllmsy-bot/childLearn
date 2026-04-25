import { Home, Volume2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { SPRING } from '../../theme/springs';
import { XiaomanSprite } from '../_primitives/XiaomanSprite';

interface TopBarProps {
  combo: number;
  themeName: string;
  onHome: () => void;
  onSound: () => void;
}

export function TopBar({ combo, themeName, onHome, onSound }: TopBarProps) {
  return (
    <>
      <motion.button
        type="button"
        onClick={onHome}
        whileHover={{ scale: 1.1, rotate: -5 }}
        whileTap={{ scale: 0.9 }}
        transition={SPRING.bounce}
        aria-label="回到首页"
        className="safe-control-top-left ipad-floating-button fixed z-30 flex h-14 w-14 items-center justify-center rounded-full bg-white text-emerald-700 shadow-xl shadow-emerald-500/30 ring-2 ring-white"
      >
        <Home size={30} strokeWidth={3.5} />
      </motion.button>

      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={SPRING.enter}
        className="safe-control-top-right safe-theme-pill fixed z-30 flex items-center gap-3 rounded-full bg-white px-5 py-2.5 text-base font-black text-emerald-950 shadow-xl shadow-emerald-500/20 ring-2 ring-white md:text-2xl"
      >
        <span className="shrink-0" aria-hidden="true">
          <XiaomanSprite emotion="idle" className="h-8 w-8" alt="" />
        </span>
        <span className="min-w-0 truncate">{themeName}</span>
      </motion.div>

      <motion.button
        type="button"
        onClick={onSound}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        transition={SPRING.bounce}
        aria-label="播放语音"
        className="safe-control-top-left-stack ipad-floating-button fixed z-30 flex h-14 w-14 items-center justify-center rounded-full bg-white text-amber-600 shadow-xl shadow-amber-500/30 ring-2 ring-white"
      >
        <Volume2 size={30} strokeWidth={3.5} />
      </motion.button>

      {combo > 0 ? (
        <motion.div
          key={combo}
          initial={{ scale: 0, x: 20 }}
          animate={{ scale: 1, x: 0 }}
          exit={{ scale: 0 }}
          transition={SPRING.bounce}
          className="safe-control-top-right-stack fixed z-30 max-w-[calc(100vw-8rem)] whitespace-nowrap rounded-full bg-[#FFECB0] px-4 py-2 text-base font-black text-[#183024] shadow-xl shadow-[#FFB200]/30 ring-2 ring-white md:text-2xl"
        >
          连对 {combo}
        </motion.div>
      ) : null}
    </>
  );
}
