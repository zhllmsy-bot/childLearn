import { DURATION_MS, EASING, SPRING as SOUL_SPRING } from './tokens';

const spring = (kind: keyof typeof SOUL_SPRING) => ({
  type: 'spring' as const,
  ...SOUL_SPRING[kind],
});

export const SPRING = {
  enter: spring('soft'),
  bounce: spring('pop'),
  smooth: spring('soft'),
  jelly: spring('pop'),
  squish: spring('drag'),
  pop: spring('pop'),
  sway: spring('soft'),
  settle: spring('soft'),
  celebrate: spring('pop'),
  gentle: {
    type: 'tween' as const,
    duration: DURATION_MS[2] / 1000,
    ease: EASING['out-quart'],
  },
} as const;
