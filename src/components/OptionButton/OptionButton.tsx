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
  'from-rose-300 to-rose-400 shadow-rose-400/40',
  'from-sky-300 to-sky-500 shadow-sky-400/40',
  'from-amber-300 to-orange-400 shadow-amber-400/40',
  'from-violet-300 to-purple-500 shadow-violet-400/40',
] as const;

const stateClass: Record<Exclude<OptionVisualState, 'idle'>, string> = {
  correct:
    'bg-gradient-to-br from-emerald-300 to-teal-500 text-white shadow-emerald-400/60 ring-emerald-100',
  wrong:
    'bg-gradient-to-br from-slate-300 to-slate-400 text-white opacity-70 shadow-slate-400/40 ring-slate-100',
  disabled:
    'bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400 opacity-50 shadow-slate-300/30 ring-slate-100',
  hint: 'bg-gradient-to-br from-yellow-300 to-amber-400 text-white shadow-amber-400/60 ring-white',
};

function OptionButtonComponent({
  option,
  state,
  paletteIndex = 0,
  visualEmoji = '✦',
  onSelect,
}: OptionButtonProps) {
  const reduceMotion = useReducedMotion();
  const disabled = state === 'disabled';
  const isIdle = state === 'idle' || state === 'hint';
  const visualClass =
    state === 'idle'
      ? `bg-gradient-to-br ${IDLE_PALETTE[paletteIndex % IDLE_PALETTE.length]} text-white ring-white`
      : stateClass[state];

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
          ? { x: [-12, 12, -12, 12, 0] }
          : state === 'correct'
            ? { scale: [1, 1.18, 1], rotate: [0, -3, 2, 0] }
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
        <span className="absolute right-3 top-3 rounded-full bg-white/88 px-2 py-1 text-xs font-black text-amber-800 shadow-sm ring-1 ring-amber-100">
          接近
        </span>
      ) : null}
      <span className="text-2xl drop-shadow-md" aria-hidden="true">
        {visualEmoji}
      </span>
      <span className="text-5xl font-black text-white drop-shadow-[0_2px_0_rgba(0,0,0,0.15)] md:text-6xl">
        {option.label}
      </span>
    </motion.button>
  );
}

export const OptionButton = memo(OptionButtonComponent);
