import { motion } from 'framer-motion';
import type { QuestionOption } from '../../curriculum/types';
import { SPRING } from '../../theme/springs';

export type OptionVisualState =
  | 'idle'
  | 'correct'
  | 'wrong'
  | 'disabled'
  | 'hint';

interface OptionButtonProps {
  option: QuestionOption;
  state: OptionVisualState;
  onSelect: (option: QuestionOption) => void;
}

const stateClass: Record<OptionVisualState, string> = {
  idle: 'bg-gradient-to-br from-rose-300 to-rose-400 text-white shadow-rose-400/40 ring-white',
  correct:
    'bg-gradient-to-br from-emerald-300 to-teal-500 text-white shadow-emerald-400/60 ring-emerald-100',
  wrong:
    'bg-gradient-to-br from-slate-300 to-slate-400 text-white opacity-70 shadow-slate-400/40 ring-slate-100',
  disabled:
    'bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400 opacity-50 shadow-slate-300/30 ring-slate-100',
  hint: 'bg-gradient-to-br from-yellow-300 to-amber-400 text-white shadow-amber-400/60 ring-white',
};

export function OptionButton({ option, state, onSelect }: OptionButtonProps) {
  const disabled = state === 'disabled';
  const isIdle = state === 'idle' || state === 'hint';

  return (
    <motion.button
      type="button"
      layout
      whileHover={isIdle ? { scale: 1.08, y: -6 } : undefined}
      whileTap={isIdle ? { scale: 0.92 } : undefined}
      animate={
        state === 'wrong'
          ? { x: [-12, 12, -12, 12, 0] }
          : state === 'correct'
            ? { scale: [1, 1.2, 1], rotate: [0, -5, 5, 0] }
            : { x: 0, scale: 1 }
      }
      transition={SPRING.bounce}
      disabled={disabled}
      onClick={() => onSelect(option)}
      className={`ipad-option-button relative flex h-28 flex-col items-center justify-center gap-1 rounded-3xl px-8 py-5 shadow-xl ring-2 md:h-36 ${stateClass[state]}`}
    >
      <span className="text-2xl drop-shadow-md" aria-hidden="true">
        🍎
      </span>
      <span className="text-5xl font-black text-white drop-shadow-[0_2px_0_rgba(0,0,0,0.15)] md:text-6xl">
        {option.label}
      </span>
    </motion.button>
  );
}
