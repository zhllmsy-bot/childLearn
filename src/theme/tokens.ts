export const BG = {
  mint: 'from-emerald-200 via-lime-200 to-yellow-200',
  sky: 'from-sky-200 via-blue-300 to-indigo-400',
  sunset: 'from-orange-200 via-pink-300 to-rose-400',
  candy: 'from-pink-200 via-purple-300 to-indigo-400',
  forest: 'from-emerald-200 via-teal-300 to-cyan-400',
  space: 'from-slate-900 via-purple-900 to-indigo-900',
} as const;

export const ACCENT = {
  primary: 'from-amber-400 to-orange-500',
  success: 'from-emerald-300 to-teal-500',
  danger: 'from-rose-300 to-pink-500',
  gold: 'from-yellow-300 to-amber-500',
  magic: 'from-fuchsia-500 via-purple-500 to-indigo-500',
} as const;

export const SHADOW = {
  card: 'shadow-2xl shadow-indigo-500/20',
  mint: 'shadow-2xl shadow-emerald-500/20',
  glow: 'shadow-xl shadow-amber-400/50',
  hot: 'shadow-2xl shadow-emerald-400/60',
  danger: 'shadow-2xl shadow-rose-400/60',
  combo: 'shadow-xl shadow-orange-500/50',
} as const;

export const RADIUS = {
  sm: 'rounded-xl',
  md: 'rounded-2xl',
  lg: 'rounded-3xl',
  xl: 'rounded-[2rem]',
  pill: 'rounded-full',
} as const;

export const TYPE = {
  hero: 'text-7xl md:text-8xl font-black leading-none tracking-normal',
  display: 'text-5xl md:text-6xl font-black tracking-normal',
  title: 'text-3xl md:text-4xl font-black tracking-normal',
  body: 'text-lg md:text-xl font-bold tracking-normal',
  caption: 'text-sm font-black tracking-wide',
} as const;

export const SPACE = {
  xs: 'gap-2',
  sm: 'gap-4',
  md: 'gap-6',
  lg: 'gap-8',
} as const;

export const ELEV = {
  soft: 'shadow-lg shadow-emerald-500/15',
  card: 'shadow-2xl shadow-emerald-500/20',
  hero: 'shadow-[0_28px_60px_-12px_rgba(16,185,129,0.35),0_12px_24px_-8px_rgba(251,191,36,0.25)]',
  press: 'shadow-md shadow-emerald-900/10',
} as const;

export const SCENE = {
  calm: 'from-emerald-100 via-teal-50 to-sky-100',
  focus: 'from-amber-50 via-lime-100 to-emerald-100',
  celebrate: 'from-pink-200 via-amber-200 to-yellow-200',
  challenge: 'from-indigo-200 via-violet-300 to-pink-300',
  night: 'from-slate-800 via-indigo-900 to-purple-950',
} as const;

export const SEMANTIC = {
  correct: { bg: '#58CC02', ring: '#89E219', shadow: '#58CC02AA' },
  wrong: { bg: '#FF4B4B', ring: '#FFA3A3', shadow: '#FF4B4B66' },
  hint: { bg: '#FFC800', ring: '#FFDD66', shadow: '#FFC80066' },
  primary: { bg: '#1CB0F6', ring: '#93DBFF', shadow: '#1CB0F655' },
} as const;

export const CARD = 'bg-white/75 backdrop-blur-xl';

export const TEXT_GRADIENT =
  'bg-gradient-to-r from-emerald-500 via-teal-500 to-amber-500 bg-clip-text text-transparent';
