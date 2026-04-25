import type { PropsWithChildren } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { ACCENT } from '../../theme/tokens';
import { SPRING } from '../../theme/springs';

type ButtonTone = 'primary' | 'success' | 'danger' | 'magic';

interface BigButtonProps extends HTMLMotionProps<'button'> {
  tone?: ButtonTone;
}

const toneClass: Record<ButtonTone, string> = {
  primary: `bg-gradient-to-br ${ACCENT.primary} shadow-amber-400/50`,
  success: `bg-gradient-to-br ${ACCENT.success} shadow-emerald-400/50`,
  danger: `bg-gradient-to-br ${ACCENT.danger} shadow-rose-400/50`,
  magic: `bg-gradient-to-br ${ACCENT.magic} shadow-purple-400/50`,
};

export function BigButton({
  children,
  className = '',
  tone = 'primary',
  disabled,
  ...props
}: PropsWithChildren<BigButtonProps>) {
  return (
    <motion.button
      whileHover={disabled ? undefined : { scale: 1.05, y: -4 }}
      whileTap={disabled ? undefined : { scale: 0.95 }}
      transition={SPRING.bounce}
      className={`rounded-2xl px-8 py-5 text-4xl font-black text-white shadow-xl ring-2 ring-white disabled:opacity-50 ${toneClass[tone]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </motion.button>
  );
}
