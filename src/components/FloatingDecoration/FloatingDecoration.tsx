import { motion } from 'framer-motion';

interface FloatingDecorationProps {
  emoji: string;
  className: string;
  delay?: number;
}

export function FloatingDecoration({
  emoji,
  className,
  delay = 0,
}: FloatingDecorationProps) {
  return (
    <motion.div
      aria-hidden="true"
      initial={{ opacity: 0, y: 12, rotate: -8 }}
      animate={{ opacity: 1, y: [0, -18, 0], rotate: [-4, 5, -4] }}
      transition={{
        opacity: { duration: 0.5, delay },
        y: { duration: 5, repeat: Infinity, ease: 'easeInOut', delay },
        rotate: { duration: 5, repeat: Infinity, ease: 'easeInOut', delay },
      }}
      className={`pointer-events-none fixed select-none ${className}`}
    >
      {emoji}
    </motion.div>
  );
}
