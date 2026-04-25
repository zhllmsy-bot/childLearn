export const SPRING = {
  enter: { type: 'spring', stiffness: 220, damping: 22, mass: 1 },
  bounce: { type: 'spring', stiffness: 240, damping: 14, mass: 1 },
  smooth: { type: 'spring', stiffness: 180, damping: 18, mass: 1.1 },
  jelly: { type: 'spring', stiffness: 180, damping: 18, mass: 1.1 },
  squish: { type: 'spring', stiffness: 220, damping: 22, mass: 1 },
  pop: { type: 'spring', stiffness: 240, damping: 14, mass: 1 },
  sway: { type: 'spring', stiffness: 140, damping: 26, mass: 1 },
  settle: { type: 'spring', stiffness: 140, damping: 26, mass: 1 },
  celebrate: { type: 'spring', stiffness: 240, damping: 14, mass: 1 },
  gentle: { type: 'tween', duration: 0.24, ease: [0.2, 0.8, 0.2, 1] },
} as const;
