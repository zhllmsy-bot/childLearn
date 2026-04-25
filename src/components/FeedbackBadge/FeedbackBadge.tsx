import { AnimatePresence, motion } from 'framer-motion';
import { SPRING } from '../../theme/springs';

export type FeedbackLevel = 'correct' | 'great' | 'amazing' | 'wrong';

interface FeedbackBadgeProps {
  level: FeedbackLevel | null;
}

const config: Record<
  FeedbackLevel,
  {
    text: string;
    className: string;
  }
> = {
  correct: {
    text: '答对啦！',
    className: 'from-emerald-300 to-teal-500 shadow-emerald-400/60',
  },
  great: {
    text: '太棒了！',
    className: 'from-yellow-300 to-amber-500 shadow-amber-400/60',
  },
  amazing: {
    text: '超级厉害！',
    className: 'from-fuchsia-500 via-purple-500 to-indigo-500 shadow-purple-400/60',
  },
  wrong: {
    text: '没关系哦',
    className: 'from-orange-300 to-amber-400 shadow-orange-300/50',
  },
};

export function FeedbackBadge({ level }: FeedbackBadgeProps) {
  const positionClass =
    level === 'great' || level === 'amazing'
      ? 'safe-celebration-badge'
      : 'safe-feedback-badge';

  return (
    <AnimatePresence>
      {level ? (
        <motion.div
          key={level}
          initial={{ opacity: 0, scale: 0.94, rotate: -2, y: 12 }}
          animate={{ opacity: 1, scale: 1, rotate: 0, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -12 }}
          transition={SPRING.jelly}
          className={`${positionClass} fixed left-1/2 z-40 -translate-x-1/2 rounded-full bg-gradient-to-r px-8 py-4 text-4xl font-black text-white shadow-2xl ring-4 ring-white ${config[level].className}`}
        >
          {config[level].text}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
