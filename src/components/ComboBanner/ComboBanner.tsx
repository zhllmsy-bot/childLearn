import { AnimatePresence, motion } from 'framer-motion';

interface ComboBannerProps {
  combo: number;
}

function getComboConfig(combo: number) {
  if (combo >= 15) {
    return {
      text: `COMBO ×${combo} 无敌啦！`,
      size: 'text-7xl md:text-9xl',
      gradient: 'from-fuchsia-500 via-purple-500 to-amber-400',
    };
  }

  if (combo >= 10) {
    return {
      text: `COMBO ×${combo} 超级厉害！`,
      size: 'text-7xl md:text-8xl',
      gradient: 'from-amber-400 via-orange-400 to-yellow-300',
    };
  }

  if (combo >= 5) {
    return {
      text: `COMBO ×${combo} 太棒了！`,
      size: 'text-6xl md:text-7xl',
      gradient: 'from-orange-400 to-amber-400',
    };
  }

  return {
    text: `COMBO ×${combo} 不错哟！`,
    size: 'text-5xl md:text-6xl',
    gradient: 'from-amber-400 to-yellow-300',
  };
}

export function ComboBanner({ combo }: ComboBannerProps) {
  const shouldShow = combo >= 3;
  const cfg = getComboConfig(combo);

  return (
    <AnimatePresence>
      {shouldShow ? (
        <motion.div
          key={combo}
          initial={{ opacity: 0, scale: 0.3, rotate: -15, x: -200 }}
          animate={{
            opacity: [0, 1, 1, 0],
            scale: [0.3, 1.3, 1, 1.1],
            rotate: [-15, 5, -3, 0],
            x: [-200, 0, 0, 0],
          }}
          exit={{ opacity: 0, scale: 0.7 }}
          transition={{ duration: 1.8, times: [0, 0.3, 0.7, 1] }}
          className={`pointer-events-none fixed left-[48%] top-[38svh] z-40 max-w-[calc(100vw-3rem)] -translate-x-1/2 -translate-y-1/2 whitespace-normal bg-gradient-to-r bg-clip-text text-center font-black leading-none tracking-wide text-transparent drop-shadow-[0_4px_0_rgba(255,255,255,0.9)] md:top-[35svh] ${cfg.size} ${cfg.gradient}`}
          style={{
            WebkitTextStroke: '3px white',
            textShadow: '6px 6px 0 rgba(0,0,0,0.1)',
          }}
        >
          {cfg.text}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
