import type { PropsWithChildren } from 'react';

interface BadgeProps {
  className?: string;
}

export function Badge({ children, className = '' }: PropsWithChildren<BadgeProps>) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full bg-white/90 px-4 py-2 text-base font-black shadow-sm ring-1 ring-emerald-900/10 ${className}`}
    >
      {children}
    </span>
  );
}
