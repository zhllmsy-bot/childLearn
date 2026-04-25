import { AnimatePresence, motion } from 'framer-motion';
import { memo } from 'react';

interface ComboBannerProps {
  combo: number;
}

function getComboConfig(combo: number) {
  if (combo >= 15) {
    return {
      text: `连对 ${combo}`,
      tone: 'bg-[#FFECB0] text-[#183024] ring-[#FFD257]',
    };
  }

  if (combo >= 10) {
    return {
      text: `连对 ${combo}`,
      tone: 'bg-[#FFECB0] text-[#183024] ring-[#FFD257]',
    };
  }

  if (combo >= 5) {
    return {
      text: `连对 ${combo}`,
      tone: 'bg-[#EAF9E6] text-[#1E6B13] ring-[#C8EDBC]',
    };
  }

  return {
    text: `连对 ${combo}`,
    tone: 'bg-white text-[#1E6B13] ring-[#C8EDBC]',
  };
}

function ComboBannerComponent({ combo }: ComboBannerProps) {
  const shouldShow = combo >= 3;
  const cfg = getComboConfig(combo);

  return (
    <AnimatePresence>
      {shouldShow ? (
        <motion.div
          key={combo}
          initial={{ opacity: 0, scale: 0.92, y: -8 }}
          animate={{
            opacity: [0, 1, 1, 0],
            scale: [0.92, 1.04, 1, 1],
            y: [-8, 0, 0, -4],
          }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 1.2, times: [0, 0.22, 0.78, 1] }}
          className={`pointer-events-none fixed left-1/2 top-[calc(var(--safe-top)+5.25rem)] z-40 -translate-x-1/2 rounded-full px-5 py-2 text-center text-xl font-black leading-tight shadow-lg ring-2 md:text-2xl ${cfg.tone}`}
        >
          {cfg.text}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export const ComboBanner = memo(ComboBannerComponent);
