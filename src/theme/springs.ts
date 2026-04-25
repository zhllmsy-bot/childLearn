export const SPRING = {
  enter: { type: 'spring', stiffness: 260, damping: 20 },
  bounce: { type: 'spring', stiffness: 400, damping: 10 },
  smooth: { type: 'spring', stiffness: 200, damping: 30 },
  jelly: { type: 'spring', stiffness: 500, damping: 15 },
  squish: { type: 'spring', stiffness: 650, damping: 12, mass: 0.6 },
  pop: { type: 'spring', stiffness: 800, damping: 14, mass: 0.4 },
  sway: { type: 'spring', stiffness: 120, damping: 14 },
  settle: { type: 'spring', stiffness: 340, damping: 32 },
  celebrate: { type: 'spring', stiffness: 480, damping: 18, mass: 0.5 },
} as const;
