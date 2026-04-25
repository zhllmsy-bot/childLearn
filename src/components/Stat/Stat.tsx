import type { PropsWithChildren } from 'react';

interface StatProps {
  label: string;
  value: string;
}

export function Stat({ label, value, children }: PropsWithChildren<StatProps>) {
  return (
    <div className="rounded-2xl bg-white/80 px-4 py-3 shadow-sm ring-1 ring-emerald-900/10 backdrop-blur-xl">
      <div className="text-sm font-bold text-emerald-800/80">{label}</div>
      <div className="flex items-center gap-2 text-2xl font-black text-emerald-950">
        {children}
        {value}
      </div>
    </div>
  );
}
