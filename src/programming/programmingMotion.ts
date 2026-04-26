import { DURATION_MS, SPRING } from '../theme/tokens';

export const PROGRAMMING_SPRING_SOFT = {
  type: 'spring' as const,
  ...SPRING.soft,
} as const;

export const PROGRAMMING_SPRING_POP = {
  type: 'spring' as const,
  ...SPRING.pop,
} as const;

export const PROGRAMMING_EASE_OUT_QUART = [0.25, 1, 0.5, 1] as const;

export const PROGRAMMING_MOTION = {
  stepMs: DURATION_MS[4],
  hoverMs: DURATION_MS[1],
  emotionMs: DURATION_MS[2],
  hintMs: DURATION_MS[5],
  blockedMs: DURATION_MS[5],
  cheerMs: DURATION_MS[6],
  flagBreathMs: DURATION_MS[7],
  arrowRotateMs: DURATION_MS[2],
} as const;
