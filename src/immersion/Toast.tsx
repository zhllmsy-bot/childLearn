import { AnimatePresence, motion } from 'framer-motion';
import { SPRING } from '../theme/springs';

export interface ToastMessage {
  id: number;
  text: string;
}

interface ToastStackProps {
  messages: ToastMessage[];
}

export function ToastStack({ messages }: ToastStackProps) {
  return (
    <div className="safe-toast-stack pointer-events-none fixed left-1/2 z-50 flex w-[min(92vw,32rem)] -translate-x-1/2 flex-col gap-3">
      <AnimatePresence>
        {messages.map((message) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 20, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={SPRING.enter}
            className="rounded-full bg-white/95 px-5 py-3 text-center text-base font-black text-emerald-950 shadow-xl shadow-emerald-500/30 ring-2 ring-white"
          >
            {message.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
