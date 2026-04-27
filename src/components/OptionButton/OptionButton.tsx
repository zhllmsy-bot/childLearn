import { memo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
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
  paletteIndex?: number;
  visualEmoji?: string;
  onSelect: (option: QuestionOption) => void;
}

const IDLE_PALETTE = [
  'bg-child-sky text-child-ocean shadow-child-blue/20 ring-child-sky-mid',
  'bg-child-mint text-child-leaf-dark shadow-child-leaf/20 ring-child-mint-deep',
  'bg-child-cream-warm text-child-amber-ink shadow-child-gold/25 ring-child-sun',
  'bg-orange-50 text-child-coral-ink shadow-child-coral/20 ring-child-peach',
] as const;

const stateClass: Record<Exclude<OptionVisualState, 'idle'>, string> = {
  correct:
    'bg-gradient-to-br from-emerald-300 to-teal-500 text-white shadow-emerald-400/60 ring-emerald-100',
  wrong:
    'bg-gradient-to-br from-orange-300 to-amber-400 text-white shadow-orange-300/50 ring-orange-100',
  disabled:
    'bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400 opacity-50 shadow-slate-300/30 ring-slate-100',
  hint: 'bg-gradient-to-br from-yellow-300 to-amber-400 text-white shadow-amber-400/60 ring-white',
};

function OptionButtonComponent({
  option,
  state,
  paletteIndex = 0,
  visualEmoji = '•',
  onSelect,
}: OptionButtonProps) {
  const reduceMotion = useReducedMotion();
  const disabled = state === 'disabled';
  const isIdle = state === 'idle' || state === 'hint';
  const visualClass =
    state === 'idle'
      ? IDLE_PALETTE[paletteIndex % IDLE_PALETTE.length]
      : stateClass[state];
  const label = option.label.trim();
  const labelClass =
    label.length <= 4
      ? 'text-5xl md:text-6xl'
      : label.length <= 10
        ? 'text-3xl leading-tight md:text-4xl'
        : 'text-xl leading-snug md:text-2xl';

  return (
    <motion.button
      type="button"
      layout
      whileHover={isIdle && !reduceMotion ? { scale: 1.08, y: -6 } : undefined}
      whileTap={isIdle && !reduceMotion ? { scale: 0.92 } : undefined}
      animate={
        reduceMotion
          ? { x: 0, scale: 1, rotate: 0 }
          : state === 'wrong'
          ? { x: [-4, 4, -3, 3, 0], rotate: [-1.5, 1.5, -1, 1, 0] }
          : state === 'correct'
            ? { scale: [1, 1.08, 1], rotate: [0, -2, 1, 0] }
            : { x: 0, scale: 1 }
      }
      transition={state === 'correct' ? SPRING.celebrate : SPRING.bounce}
      disabled={disabled}
      onClick={() => onSelect(option)}
      aria-label={`选择答案 ${option.label}${state === 'hint' ? '，接近正确答案' : ''}`}
      aria-pressed={state === 'correct'}
      className={`ipad-option-button relative flex h-32 flex-col items-center justify-center gap-1 rounded-3xl px-8 py-5 shadow-xl ring-2 outline-none focus-visible:ring-4 focus-visible:ring-emerald-900 md:h-44 ${visualClass}`}
    >
      {state === 'hint' ? (
        <span className="absolute right-3 top-3 rounded-full bg-white/88 px-2 py-1 text-base font-bold text-amber-800 shadow-sm ring-1 ring-amber-100">
          接近
        </span>
      ) : null}
      <span className="text-2xl text-current/70" aria-hidden="true">
        {visualEmoji}
      </span>
      <span className={`whitespace-normal break-words px-2 text-center font-black text-current ${labelClass}`}>
        {label}
      </span>
    </motion.button>
  );
}

export const OptionButton = memo(OptionButtonComponent);
