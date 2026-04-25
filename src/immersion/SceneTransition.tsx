import type { PropsWithChildren } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { SPRING } from '../theme/springs';

export function SceneTransition({ children }: PropsWithChildren) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -18 }}
        transition={SPRING.smooth}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
