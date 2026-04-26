export const PROGRAMMING_SPRING_SOFT = {
  type: 'spring',
  stiffness: 180,
  damping: 22,
  mass: 0.9,
} as const;

export const PROGRAMMING_SPRING_POP = {
  type: 'spring',
  stiffness: 300,
  damping: 18,
  mass: 0.8,
} as const;

export const PROGRAMMING_EASE_OUT_QUART = [0.25, 1, 0.5, 1] as const;

export const PROGRAMMING_MOTION = {
  stepMs: 500,
  hoverMs: 200,
  emotionMs: 300,
  hintMs: 800,
  blockedMs: 600,
  cheerMs: 1500,
  flagBreathMs: 2000,
  arrowRotateMs: 300,
} as const;
