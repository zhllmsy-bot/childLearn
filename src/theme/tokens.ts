import type { CSSProperties } from 'react';

export type GradientStops = readonly [string, string] | readonly [string, string, string];

export const SPACING = [0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80] as const;
export const RADIUS = [0, 8, 12, 16, 20, 22, 24, 28, 999] as const;
export const STROKE = [0, 1, 1.5, 2, 2.5, 3] as const;
export const FONT_SIZE = [14, 17, 18, 20, 22, 28, 36, 48] as const;
export const FONT_WEIGHT = [500, 600, 700, 800] as const;
export const LINE_HEIGHT = [1, 1.2, 1.3, 1.4, 1.45, 1.5] as const;
export const DURATION_MS = [120, 200, 300, 400, 500, 800, 1200, 2000, 2800] as const;

export const PALETTE = {
  'bg-canvas-top': '#EAF7E3',
  'bg-canvas-bottom': '#FFF4D6',
  'bg-canvas-base': '#F7FBF4',
  'bg-surface': '#FFFFFF',
  'bg-surface-sunken': '#F0F5EB',
  'bg-grass': '#EAF7E3',
  'brand-light': '#7FDDA9',
  'brand-primary': '#4FC98C',
  'brand-deep': '#2F9E5E',
  'brand-dark': '#1E6A3E',
  'forward-light': '#7FE3C3',
  forward: '#10B981',
  'forward-deep': '#047857',
  'left-light': '#93C5FD',
  left: '#3B82F6',
  'left-deep': '#1D4ED8',
  'right-light': '#FCD34D',
  right: '#F59E0B',
  'right-deep': '#B45309',
  'text-primary': '#0F172A',
  'text-secondary': '#475569',
  'text-tertiary': '#94A3B8',
  'text-on-brand': '#FFFFFF',
  'border-soft': '#E2E8F0',
  'border-focus': '#1E3A8A',
  'highlight-inner': 'rgba(255,255,255,0.8)',
  'shadow-cool': 'rgba(15,23,42,0.10)',
  'chip-cream-top': '#FFF9DB',
  'chip-cream-bottom': '#FFE9A8',
  'chip-cream-deep': '#D6A73E',
  'chip-cream-text': '#8A5A00',
  'chip-cream-dark': '#5F3C00',
  'grass-cream': '#F4FBEE',
  'grass-light': '#EEF9E9',
  'grass-visited-top': '#DDF4D4',
  'grass-visited-bottom': '#CFEBC5',
  'stone-light': '#B4BCC5',
  'stone-dark': '#8794A1',
  'stone-stroke': '#6B7683',
  'flag-gold': '#FACC15',
  'flag-orange': '#F59E0B',
  'flag-wood-light': '#C48A45',
  'flag-wood': '#9A6A2F',
  'flag-wood-dark': '#6B421C',

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
  rainbowSky: '#BAE6FD',
  rainbowBlue: '#93C5FD',
  rainbowViolet: '#818CF8',
  candyPink: '#FBCFE8',
  candyViolet: '#C4B5FD',
  forestMint: '#A7F3D0',
  forestTeal: '#5EEAD4',
  forestCyan: '#22D3EE',
  nightInk: '#0F172A',
  nightPurple: '#581C87',
  nightIndigo: '#312E81',
  sunsetPeach: '#FED7AA',
  sunsetPink: '#F9A8D4',
  sunsetRose: '#FB7185',
} as const;

export const BG = {
  mint: [PALETTE.cream, PALETTE.mint, PALETTE.sun],
  sky: [PALETTE.sky, PALETTE.skyMid, PALETTE.mint],
  sunset: [PALETTE.creamWarm, PALETTE.peach, PALETTE.sun],
  candy: [PALETTE.roseMist, PALETTE.peach, PALETTE.sky],
  forest: [PALETTE.mint, PALETTE.mintDeep, PALETTE.sky],
  space: [PALETTE.ink, PALETTE.ocean, PALETTE.plum],
} as const satisfies Record<string, GradientStops>;

export const ACCENT = {
  primary: [PALETTE.blue, PALETTE.blueSoft],
  success: [PALETTE.forward, PALETTE['forward-light']],
  danger: [PALETTE.right, PALETTE['right-light']],
  gold: [PALETTE.gold, PALETTE.goldSoft],
  magic: [PALETTE.magic, PALETTE.magicSoft],
} as const satisfies Record<string, readonly [string, string]>;

export const SHADOW = {
  card: '0 24px 60px rgba(16, 185, 129, 0.16)',
  mint: '0 24px 60px rgba(16, 185, 129, 0.20)',
  glow: '0 18px 38px rgba(251, 191, 36, 0.50)',
  hot: '0 24px 60px rgba(52, 211, 153, 0.60)',
  danger: '0 24px 60px rgba(245, 158, 11, 0.45)',
  combo: '0 18px 38px rgba(249, 115, 22, 0.50)',
} as const;

export const RADIUS_SCALE = {
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
  calm: [PALETTE.mint, PALETTE.sky, PALETTE.skyMid],
  focus: [PALETTE.creamWarm, PALETTE.mintDeep, PALETTE.mint],
  celebrate: [PALETTE.sun, PALETTE.peach, PALETTE.mint],
  challenge: [PALETTE.sky, PALETTE.skyMid, PALETTE.mint],
  night: [PALETTE.nightInk, PALETTE.nightIndigo, PALETTE.nightPurple],
} as const satisfies Record<string, GradientStops>;

export const SEMANTIC = {
  correct: { bg: PALETTE.forward, ring: PALETTE['forward-light'], shadow: 'rgba(16,185,129,0.40)' },
  wrong: { bg: PALETTE.right, ring: PALETTE['right-light'], shadow: 'rgba(245,158,11,0.40)' },
  hint: { bg: PALETTE.gold, ring: PALETTE.sun, shadow: 'rgba(255,178,0,0.40)' },
  primary: { bg: PALETTE.blue, ring: PALETTE.skyMid, shadow: 'rgba(46,140,240,0.34)' },
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

export const SPRING = {
  soft: { stiffness: 180, damping: 22, mass: 0.9 },
  pop: { stiffness: 300, damping: 18, mass: 0.8 },
  drag: { stiffness: 400, damping: 30, mass: 0.6 },
} as const;

export const EASING = {
  'out-quart': 'cubic-bezier(0.25, 1, 0.5, 1)',
  'in-out-quart': 'cubic-bezier(0.76, 0, 0.24, 1)',
} as const;

export const PROGRAMMING_ALLOWED_SPACING = SPACING;
export const PROGRAMMING_ALLOWED_RADII = RADIUS;
export const PROGRAMMING_ALLOWED_BORDERS = STROKE;
export const PROGRAMMING_ALLOWED_DURATIONS = DURATION_MS;

export const PROGRAMMING_COLORS = {
  bgCanvas: PALETTE['bg-canvas-base'],
  bgSurface: PALETTE['bg-surface'],
  bgSurfaceEnd: PALETTE['bg-canvas-base'],
  bgSurfaceSunken: PALETTE['bg-surface-sunken'],
  bgWarmGlow: PALETTE['bg-canvas-bottom'],
  brandPrimary: PALETTE['brand-primary'],
  brandPrimaryLight: PALETTE['brand-light'],
  brandPrimaryHover: PALETTE['brand-deep'],
  brandPrimaryActive: PALETTE['brand-dark'],
  accentForward: PALETTE.forward,
  accentForwardLight: PALETTE['forward-light'],
  accentForwardDark: PALETTE['forward-deep'],
  accentLeft: PALETTE.left,
  accentLeftLight: PALETTE['left-light'],
  accentLeftDark: PALETTE['left-deep'],
  accentRight: PALETTE.right,
  accentRightLight: PALETTE['right-light'],
  accentRightDark: PALETTE['right-deep'],
  textPrimary: PALETTE['text-primary'],
  textSecondary: PALETTE['text-secondary'],
  textTertiary: PALETTE['text-tertiary'],
  borderDefault: 'rgba(255,255,255,0.72)',
  borderFocus: PALETTE['border-focus'],
  stateSuccess: PALETTE.forward,
  stateWarning: PALETTE.right,
  chipTop: PALETTE['chip-cream-top'],
  chipBottom: PALETTE['chip-cream-bottom'],
  chipInk: PALETTE['chip-cream-text'],
  chipEdge: PALETTE['chip-cream-deep'],
  stoneLight: PALETTE['stone-light'],
  stoneDark: PALETTE['stone-dark'],
  stoneStroke: PALETTE['stone-stroke'],
  flagGold: PALETTE['flag-gold'],
  flagOrange: PALETTE['flag-orange'],
  flagWood: PALETTE['flag-wood'],
  flagWoodDark: PALETTE['flag-wood-dark'],
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
  '--bg-canvas-top': PALETTE['bg-canvas-top'],
  '--bg-canvas-bottom': PALETTE['bg-canvas-bottom'],
  '--bg-canvas-base': PALETTE['bg-canvas-base'],
  '--bg-canvas': PROGRAMMING_COLORS.bgCanvas,
  '--bg-surface': PROGRAMMING_COLORS.bgSurface,
  '--bg-surface-end': PROGRAMMING_COLORS.bgSurfaceEnd,
  '--bg-surface-sunken': PROGRAMMING_COLORS.bgSurfaceSunken,
  '--bg-warm-glow': PROGRAMMING_COLORS.bgWarmGlow,
  '--brand-light': PALETTE['brand-light'],
  '--brand-primary': PROGRAMMING_COLORS.brandPrimary,
  '--brand-primary-light': PROGRAMMING_COLORS.brandPrimaryLight,
  '--brand-primary-hover': PROGRAMMING_COLORS.brandPrimaryHover,
  '--brand-primary-active': PROGRAMMING_COLORS.brandPrimaryActive,
  '--brand-deep': PALETTE['brand-deep'],
  '--brand-dark': PALETTE['brand-dark'],
  '--forward': PALETTE.forward,
  '--forward-light': PALETTE['forward-light'],
  '--forward-deep': PALETTE['forward-deep'],
  '--left': PALETTE.left,
  '--left-light': PALETTE['left-light'],
  '--left-deep': PALETTE['left-deep'],
  '--right': PALETTE.right,
  '--right-light': PALETTE['right-light'],
  '--right-deep': PALETTE['right-deep'],
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
  '--chip-dark': PALETTE['chip-cream-dark'],
  '--grass-cream': PALETTE['grass-cream'],
  '--grass-light': PALETTE['grass-light'],
  '--grass-visited-top': PALETTE['grass-visited-top'],
  '--grass-visited-bottom': PALETTE['grass-visited-bottom'],
  '--stone-light': PROGRAMMING_COLORS.stoneLight,
  '--stone-dark': PROGRAMMING_COLORS.stoneDark,
  '--stone-stroke': PROGRAMMING_COLORS.stoneStroke,
  '--flag-gold': PROGRAMMING_COLORS.flagGold,
  '--flag-orange': PROGRAMMING_COLORS.flagOrange,
  '--flag-wood-light': PALETTE['flag-wood-light'],
  '--flag-wood': PROGRAMMING_COLORS.flagWood,
  '--flag-wood-dark': PROGRAMMING_COLORS.flagWoodDark,
  '--shadow-sm': PROGRAMMING_SHADOWS.sm,
  '--shadow-md': PROGRAMMING_SHADOWS.md,
  '--shadow-float': PROGRAMMING_SHADOWS.float,
  '--brand-primary-tint': 'rgba(47, 158, 94, 0.08)',
} as CSSProperties;

export const DESIGN_SOUL_CSS_VARS = {
  ...PROGRAMMING_PAGE_THEME_VARS,
  '--font-rounded': PROGRAMMING_FONT_STACK,
  '--font-number': '"Baloo 2", "Fredoka", "Nunito", ui-rounded, sans-serif',
  '--kid-bg': PALETTE['bg-canvas-base'],
  '--kid-ink': PALETTE['text-primary'],
  '--kid-grass': PALETTE['brand-deep'],
  '--kid-grass-soft': PALETTE['bg-grass'],
  '--kid-sun': PALETTE.right,
  '--kid-sun-soft': PALETTE['right-light'],
  '--kid-peach': PALETTE.right,
  '--kid-peach-soft': PALETTE['bg-canvas-bottom'],
  '--kid-sky': PALETTE.left,
  '--kid-sky-soft': PALETTE['left-light'],
  '--focus-ring': PALETTE['brand-dark'],
  '--border-soft': PALETTE['border-soft'],
  '--text-on-brand': PALETTE['text-on-brand'],
  '--shadow-cool': PALETTE['shadow-cool'],
} as CSSProperties;

export const CONFETTI_PALETTE = {
  gold: [PALETTE.gold, PALETTE.goldSoft, PALETTE.sun],
  candy: [PALETTE.right, PALETTE.gold, PALETTE.forward, PALETTE.left],
  emerald: [PALETTE.forward, PALETTE['forward-light'], PALETTE.mintDeep, PALETTE.gold],
  party: [PALETTE.peach, PALETTE.sun, PALETTE.mintDeep, PALETTE.skyMid],
} as const;

export const SKIN_GRADIENTS = {
  rainbow: [PALETTE.rainbowSky, PALETTE.rainbowBlue, PALETTE.rainbowViolet],
  candy: [PALETTE.candyPink, PALETTE.candyViolet, PALETTE.rainbowViolet],
  forest: [PALETTE.forestMint, PALETTE.forestTeal, PALETTE.forestCyan],
  space: [PALETTE.nightInk, PALETTE.nightPurple, PALETTE.nightIndigo],
  sunset: [PALETTE.sunsetPeach, PALETTE.sunsetPink, PALETTE.sunsetRose],
} as const satisfies Record<string, GradientStops>;
