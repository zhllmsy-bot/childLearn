import type { PropsWithChildren } from 'react';
import { CARD, SHADOW } from '../../theme/tokens';

interface CardProps {
  className?: string;
}

export function Card({ children, className = '' }: PropsWithChildren<CardProps>) {
  return (
    <section
      className={`${CARD} ${SHADOW.card} rounded-3xl ring-2 ring-white ${className}`}
    >
      {children}
    </section>
  );
}
