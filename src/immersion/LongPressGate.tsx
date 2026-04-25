import { ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { useRef, useState } from 'react';
import { SPRING } from '../theme/springs';

interface LongPressGateProps {
  onOpen: () => void;
}

const HOLD_MS = 3000;

export function LongPressGate({ onOpen }: LongPressGateProps) {
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<number | null>(null);
  const frameRef = useRef<number | null>(null);
  const startedAtRef = useRef(0);

  const clear = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
    }
    timerRef.current = null;
    frameRef.current = null;
    setProgress(0);
  };

  const tick = () => {
    const elapsed = Date.now() - startedAtRef.current;
    setProgress(Math.min(elapsed / HOLD_MS, 1));
    if (elapsed < HOLD_MS) {
      frameRef.current = window.requestAnimationFrame(tick);
    }
  };

  const begin = () => {
    clear();
    startedAtRef.current = Date.now();
    frameRef.current = window.requestAnimationFrame(tick);
    timerRef.current = window.setTimeout(() => {
      clear();
      onOpen();
    }, HOLD_MS);
  };

  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={SPRING.bounce}
      onPointerDown={begin}
      onPointerUp={clear}
      onPointerLeave={clear}
      onPointerCancel={clear}
      className="safe-control-bottom-right ipad-parent-gate fixed z-30 flex h-16 w-16 items-center justify-center rounded-full bg-white text-emerald-700 shadow-xl shadow-emerald-500/30 ring-2 ring-white"
      aria-label="长按打开家长报告"
    >
      <span
        className="absolute inset-1 rounded-full"
        style={{
          background: `conic-gradient(#f59e0b ${progress * 360}deg, transparent 0deg)`,
        }}
      />
      <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-white">
        <ShieldCheck size={28} strokeWidth={3.2} />
      </span>
    </motion.button>
  );
}
