export const BG = {
  mint: 'from-[#FFF9EF] via-[#EAF9E6] to-[#FFECB0]',
  sky: 'from-[#EAF4FF] via-[#C2E0FF] to-[#EAF9E6]',
  sunset: 'from-[#FFF1EA] via-[#FFD9C2] to-[#FFECB0]',
  candy: 'from-[#FCEEFA] via-[#FFD9C2] to-[#EAF4FF]',
  forest: 'from-[#EAF9E6] via-[#C8EDBC] to-[#EAF4FF]',
  space: 'from-[#183024] via-[#1457AE] to-[#7F2C71]',
} as const;

export const ACCENT = {
  primary: 'from-[#2E8CF0] to-[#7BBBFF]',
  success: 'from-[#3EA02D] to-[#7FC86A]',
  danger: 'from-[#F77444] to-[#FFA47A]',
  gold: 'from-[#FFB200] to-[#FFD257]',
  magic: 'from-[#C85AB5] to-[#EC8FDE]',
} as const;

export const SHADOW = {
  card: 'shadow-2xl shadow-emerald-500/16',
  mint: 'shadow-2xl shadow-emerald-500/20',
  glow: 'shadow-xl shadow-amber-400/50',
  hot: 'shadow-2xl shadow-emerald-400/60',
  danger: 'shadow-2xl shadow-[#F77444]/45',
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
  hero: 'text-5xl md:text-6xl font-extrabold leading-tight tracking-normal',
  display: 'text-4xl md:text-5xl font-extrabold tracking-normal',
  title: 'text-3xl md:text-4xl font-extrabold tracking-normal',
  body: 'text-lg md:text-xl font-bold tracking-normal',
  caption: 'text-base font-bold tracking-normal',
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
  celebrate: 'from-[#FFECB0] via-[#FFD9C2] to-[#EAF9E6]',
  challenge: 'from-[#EAF4FF] via-[#C2E0FF] to-[#EAF9E6]',
  night: 'from-slate-800 via-indigo-900 to-purple-950',
} as const;

export const SEMANTIC = {
  correct: { bg: '#3EA02D', ring: '#C8EDBC', shadow: '#3EA02D66' },
  wrong: { bg: '#F77444', ring: '#FFD9C2', shadow: '#F7744466' },
  hint: { bg: '#FFB200', ring: '#FFECB0', shadow: '#FFB20066' },
  primary: { bg: '#2E8CF0', ring: '#C2E0FF', shadow: '#2E8CF055' },
} as const;

export const CARD = 'bg-[#FFF9EF]/90 backdrop-blur-xl';

export const TEXT_GRADIENT =
  'bg-gradient-to-r from-[#3EA02D] via-[#2E8CF0] to-[#FFB200] bg-clip-text text-transparent';
