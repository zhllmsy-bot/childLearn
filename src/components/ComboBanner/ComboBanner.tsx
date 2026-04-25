import { AnimatePresence, motion } from 'framer-motion';
import { memo } from 'react';

interface ComboBannerProps {
  combo: number;
}

function getComboConfig(combo: number) {
  if (combo >= 15) {
    return {
      text: `连对 ${combo}`,
      tone: 'bg-child-coral text-white ring-child-peach shadow-child-coral/30',
    };
  }

  if (combo >= 10) {
    return {
      text: `连对 ${combo}`,
      tone: 'bg-child-sun text-child-ink ring-child-gold-soft',
    };
  }

  if (combo >= 5) {
    return {
      text: `连对 ${combo}`,
      tone: 'bg-child-mint text-child-leaf-dark ring-child-mint-deep',
    };
  }

  return {
    text: `连对 ${combo}`,
    tone: 'bg-white text-child-leaf-dark ring-child-mint-deep',
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
