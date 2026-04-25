import type { CSSProperties } from 'react';

export type GradientStops = readonly [string, string] | readonly [string, string, string];

export const PALETTE = {
  cream: '#FFF9EF',
  mint: '#EAF9E6',
  mintDeep: '#C8EDBC',
  leaf: '#3EA02D',
  leafDark: '#1E6B13',
  sky: '#EAF4FF',
  skyMid: '#C2E0FF',
  ocean: '#1457AE',
  blue: '#2E8CF0',
  blueSoft: '#7BBBFF',
  creamWarm: '#FFF7E1',
  sun: '#FFECB0',
  gold: '#FFB200',
  goldSoft: '#FFD257',
  amberInk: '#7A5100',
  peach: '#FFD9C2',
  coral: '#F77444',
  coralSoft: '#FFA47A',
  coralInk: '#8F3514',
  plum: '#7F2C71',
  magic: '#C85AB5',
  magicSoft: '#EC8FDE',
  roseMist: '#F7CFEF',
  ink: '#183024',
  moss: '#556B5A',
} as const;

export const BG = {
  mint: [PALETTE.cream, PALETTE.mint, PALETTE.sun],
  sky: [PALETTE.sky, PALETTE.skyMid, PALETTE.mint],
  sunset: ['#FFF1EA', PALETTE.peach, PALETTE.sun],
  candy: ['#FCEEFA', PALETTE.peach, PALETTE.sky],
  forest: [PALETTE.mint, PALETTE.mintDeep, PALETTE.sky],
  space: [PALETTE.ink, '#1457AE', PALETTE.plum],
} as const satisfies Record<string, GradientStops>;

export const ACCENT = {
  primary: [PALETTE.blue, PALETTE.blueSoft],
  success: [PALETTE.leaf, '#7FC86A'],
  danger: [PALETTE.coral, PALETTE.coralSoft],
  gold: [PALETTE.gold, PALETTE.goldSoft],
  magic: [PALETTE.magic, PALETTE.magicSoft],
} as const satisfies Record<string, readonly [string, string]>;

export const SHADOW = {
  card: '0 24px 60px rgba(16, 185, 129, 0.16)',
  mint: '0 24px 60px rgba(16, 185, 129, 0.20)',
  glow: '0 18px 38px rgba(251, 191, 36, 0.50)',
  hot: '0 24px 60px rgba(52, 211, 153, 0.60)',
  danger: '0 24px 60px rgba(247, 116, 68, 0.45)',
  combo: '0 18px 38px rgba(249, 115, 22, 0.50)',
} as const;

export const RADIUS = {
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  pill: 999,
} as const;

export const TYPE = {
  hero: { fontSize: 56, lineHeight: 1.05, weight: 800 },
  display: { fontSize: 44, lineHeight: 1.08, weight: 800 },
  title: { fontSize: 32, lineHeight: 1.12, weight: 800 },
  body: { fontSize: 20, lineHeight: 1.35, weight: 700 },
  caption: { fontSize: 16, lineHeight: 1.35, weight: 700 },
} as const;

export const SPACE = {
  xs: 8,
  sm: 16,
  md: 24,
  lg: 32,
} as const;

export const ELEV = {
  soft: '0 16px 34px rgba(16, 185, 129, 0.15)',
  card: '0 24px 60px rgba(16, 185, 129, 0.20)',
  hero:
    '0 28px 60px -12px rgba(16, 185, 129, 0.35), 0 12px 24px -8px rgba(251, 191, 36, 0.25)',
  press: '0 10px 22px rgba(6, 78, 59, 0.10)',
} as const;

export const SCENE = {
  calm: ['#D1FAE5', '#F0FDFA', '#E0F2FE'],
  focus: ['#FFFBEB', '#ECFCCB', '#D1FAE5'],
  celebrate: [PALETTE.sun, PALETTE.peach, PALETTE.mint],
  challenge: [PALETTE.sky, PALETTE.skyMid, PALETTE.mint],
  night: ['#1E293B', '#312E81', '#3B0764'],
} as const satisfies Record<string, GradientStops>;

export const SEMANTIC = {
  correct: { bg: PALETTE.leaf, ring: PALETTE.mintDeep, shadow: '#3EA02D66' },
  wrong: { bg: PALETTE.coral, ring: PALETTE.peach, shadow: '#F7744466' },
  hint: { bg: PALETTE.gold, ring: PALETTE.sun, shadow: '#FFB20066' },
  primary: { bg: PALETTE.blue, ring: PALETTE.skyMid, shadow: '#2E8CF055' },
} as const;

export const CARD = 'bg-child-cream/90 backdrop-blur-xl';

export const TEXT_GRADIENT =
  'bg-gradient-to-r from-child-leaf via-child-blue to-child-gold bg-clip-text text-transparent';

export function linearGradient(
  stops: GradientStops,
  direction = '180deg',
): string {
  return `linear-gradient(${direction}, ${stops.join(', ')})`;
}

export function gradientStyle(stops: GradientStops, direction = '180deg'): CSSProperties {
  return {
    backgroundImage: linearGradient(stops, direction),
  };
}
