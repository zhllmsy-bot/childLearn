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

export const PROGRAMMING_FONT_STACK =
  '"方圆体", "Rounded Mplus 1c", "PingFang SC Rounded", "PingFang SC", "Baloo 2", "Fredoka", "Nunito", ui-rounded, sans-serif';

export const PROGRAMMING_ALLOWED_SPACING = [4, 8, 12, 16, 24, 32, 40, 48, 64] as const;
export const PROGRAMMING_ALLOWED_RADII = [8, 12, 16, 20, 24, 999] as const;
export const PROGRAMMING_ALLOWED_BORDERS = [0, 1, 2] as const;
export const PROGRAMMING_ALLOWED_DURATIONS = [120, 200, 300, 500, 800] as const;

export const PROGRAMMING_COLORS = {
  bgCanvas: '#F7FBF4',
  bgSurface: '#FFFFFF',
  bgSurfaceEnd: '#F7FBF4',
  bgSurfaceSunken: '#EAF7E3',
  bgWarmGlow: '#FFF4D6',
  brandPrimary: '#2F9E5E',
  brandPrimaryLight: '#5BC98C',
  brandPrimaryHover: '#26824D',
  brandPrimaryActive: '#1E6A3E',
  accentForward: '#4FD39F',
  accentForwardLight: '#8EF0C2',
  accentForwardDark: '#2F9E5E',
  accentLeft: '#68A7FF',
  accentLeftLight: '#9FCAFF',
  accentLeftDark: '#2E69BE',
  accentRight: '#FFC85B',
  accentRightLight: '#FFE191',
  accentRightDark: '#D78A13',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textTertiary: '#94A3B8',
  borderDefault: 'rgba(255,255,255,0.72)',
  borderFocus: '#1E3A8A',
  stateSuccess: '#16A34A',
  stateWarning: '#F59E0B',
  chipTop: '#FFF9DB',
  chipBottom: '#FFE9A8',
  chipInk: '#8A5A00',
  chipEdge: '#D6A73E',
  stoneLight: '#B4BCC5',
  stoneDark: '#8794A1',
  stoneStroke: '#6B7683',
  flagGold: '#FACC15',
  flagOrange: '#F59E0B',
  flagWood: '#9A6A2F',
  flagWoodDark: '#6B421C',
} as const;

export const PROGRAMMING_SHADOWS = {
  sm: '0 2px 0 rgba(0,0,0,0.05), 0 4px 8px rgba(15,23,42,0.08)',
  md:
    '0 2px 0 rgba(0,0,0,0.06), 0 8px 16px -4px rgba(15,23,42,0.10), 0 24px 48px -12px rgba(15,23,42,0.06)',
  float:
    '0 2px 0 rgba(0,0,0,0.06), 0 8px 16px -4px rgba(15,23,42,0.10), 0 24px 48px -12px rgba(15,23,42,0.06)',
} as const;

export const PROGRAMMING_SPACE = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
  xxxl: 48,
  jumbo: 64,
} as const;

export const PROGRAMMING_RADIUS = {
  sm: 8,
  md: 12,
  block: 16,
  button: 20,
  card: 24,
  pill: 999,
} as const;

export const PROGRAMMING_TYPE = {
  display: { fontSize: 28, fontWeight: 800, lineHeight: 1.2, letterSpacing: '0.02em' },
  title: { fontSize: 22, fontWeight: 700, lineHeight: 1.3, letterSpacing: '0.02em' },
  bodyLg: { fontSize: 20, fontWeight: 600, lineHeight: 1.45, letterSpacing: '0.02em' },
  body: { fontSize: 17, fontWeight: 500, lineHeight: 1.5, letterSpacing: '0.02em' },
  caption: { fontSize: 14, fontWeight: 500, lineHeight: 1.4, letterSpacing: '0.02em' },
  monoNum: { fontSize: 18, fontWeight: 700, lineHeight: 1, letterSpacing: '0' },
} as const;

export const PROGRAMMING_SIZES = {
  topBarHeight: 56,
  blockDrawerHeight: 128,
  iconButton: 40,
  speakerButton: 40,
  gridCellMin: 52,
  gridCellMax: 96,
  blockTile: 96,
  touchBlockTile: 112,
  directionArrow: 20,
  taskBubbleMin: 200,
  taskBubbleMax: 360,
  drawerTopBorder: 1,
  progressDot: 8,
} as const;

export const PROGRAMMING_PAGE_THEME_VARS = {
  '--bg-canvas': PROGRAMMING_COLORS.bgCanvas,
  '--bg-surface': PROGRAMMING_COLORS.bgSurface,
  '--bg-surface-end': PROGRAMMING_COLORS.bgSurfaceEnd,
  '--bg-surface-sunken': PROGRAMMING_COLORS.bgSurfaceSunken,
  '--bg-warm-glow': PROGRAMMING_COLORS.bgWarmGlow,
  '--brand-primary': PROGRAMMING_COLORS.brandPrimary,
  '--brand-primary-light': PROGRAMMING_COLORS.brandPrimaryLight,
  '--brand-primary-hover': PROGRAMMING_COLORS.brandPrimaryHover,
  '--brand-primary-active': PROGRAMMING_COLORS.brandPrimaryActive,
  '--accent-forward': PROGRAMMING_COLORS.accentForward,
  '--accent-forward-light': PROGRAMMING_COLORS.accentForwardLight,
  '--accent-forward-dark': PROGRAMMING_COLORS.accentForwardDark,
  '--accent-left': PROGRAMMING_COLORS.accentLeft,
  '--accent-left-light': PROGRAMMING_COLORS.accentLeftLight,
  '--accent-left-dark': PROGRAMMING_COLORS.accentLeftDark,
  '--accent-right': PROGRAMMING_COLORS.accentRight,
  '--accent-right-light': PROGRAMMING_COLORS.accentRightLight,
  '--accent-right-dark': PROGRAMMING_COLORS.accentRightDark,
  '--text-primary': PROGRAMMING_COLORS.textPrimary,
  '--text-secondary': PROGRAMMING_COLORS.textSecondary,
  '--text-tertiary': PROGRAMMING_COLORS.textTertiary,
  '--border-default': PROGRAMMING_COLORS.borderDefault,
  '--border-focus': PROGRAMMING_COLORS.borderFocus,
  '--state-success': PROGRAMMING_COLORS.stateSuccess,
  '--state-warning': PROGRAMMING_COLORS.stateWarning,
  '--chip-top': PROGRAMMING_COLORS.chipTop,
  '--chip-bottom': PROGRAMMING_COLORS.chipBottom,
  '--chip-ink': PROGRAMMING_COLORS.chipInk,
  '--chip-edge': PROGRAMMING_COLORS.chipEdge,
  '--stone-light': PROGRAMMING_COLORS.stoneLight,
  '--stone-dark': PROGRAMMING_COLORS.stoneDark,
  '--stone-stroke': PROGRAMMING_COLORS.stoneStroke,
  '--flag-gold': PROGRAMMING_COLORS.flagGold,
  '--flag-orange': PROGRAMMING_COLORS.flagOrange,
  '--flag-wood': PROGRAMMING_COLORS.flagWood,
  '--flag-wood-dark': PROGRAMMING_COLORS.flagWoodDark,
  '--shadow-sm': PROGRAMMING_SHADOWS.sm,
  '--shadow-md': PROGRAMMING_SHADOWS.md,
  '--shadow-float': PROGRAMMING_SHADOWS.float,
  '--brand-primary-tint': 'rgba(47, 158, 94, 0.08)',
} as CSSProperties;
