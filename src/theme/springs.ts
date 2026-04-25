export const SPRING = {
  enter: { type: 'spring', stiffness: 260, damping: 20 },
  bounce: { type: 'spring', stiffness: 400, damping: 10 },
  smooth: { type: 'spring', stiffness: 200, damping: 30 },
  jelly: { type: 'spring', stiffness: 500, damping: 15 },
} as const;
