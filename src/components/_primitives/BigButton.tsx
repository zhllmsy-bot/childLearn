import type { PropsWithChildren } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { ACCENT, linearGradient } from '../../theme/tokens';
import { SPRING } from '../../theme/springs';

type ButtonTone = 'primary' | 'success' | 'danger' | 'magic';

interface BigButtonProps extends HTMLMotionProps<'button'> {
  tone?: ButtonTone;
}

const toneShadow: Record<ButtonTone, string> = {
  primary: '0 18px 38px rgba(251, 191, 36, 0.50)',
  success: '0 18px 38px rgba(52, 211, 153, 0.50)',
  danger: '0 18px 38px rgba(251, 113, 133, 0.50)',
  magic: '0 18px 38px rgba(168, 85, 247, 0.50)',
};

export function BigButton({
  children,
  className = '',
  tone = 'primary',
  disabled,
  style,
  ...props
}: PropsWithChildren<BigButtonProps>) {
  return (
    <motion.button
      whileHover={disabled ? undefined : { scale: 1.05, y: -4 }}
      whileTap={disabled ? undefined : { scale: 0.95 }}
      transition={SPRING.bounce}
      style={{
        backgroundImage: linearGradient(ACCENT[tone], '135deg'),
        boxShadow: toneShadow[tone],
        ...style,
      }}
      className={`rounded-2xl px-8 py-5 text-4xl font-black text-white ring-2 ring-white disabled:opacity-50 ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </motion.button>
  );
}
