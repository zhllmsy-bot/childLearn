import { AnimatePresence, motion } from 'framer-motion';
import type { Question } from '../types';
import { SPRING } from '../../theme/springs';

interface HintLadderProps {
  question: Question;
  stage: number;
}

export function HintLadder({ question, stage }: HintLadderProps) {
  const text =
    stage >= 3
      ? question.principleText
      : stage >= 2
        ? '看看发光的数字，它们离答案更近。'
        : stage >= 1
          ? question.scaffoldText
          : '';

  return (
    <AnimatePresence>
      {stage > 0 ? (
        <motion.div
          key={`${question.id}-${stage}`}
          initial={{ opacity: 0, y: 16, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.96 }}
          transition={SPRING.enter}
          className="mx-auto max-w-3xl rounded-3xl bg-white/80 px-6 py-4 text-center text-2xl font-black leading-tight text-emerald-950 shadow-xl shadow-emerald-500/20 ring-2 ring-white backdrop-blur-xl"
        >
          {text}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
