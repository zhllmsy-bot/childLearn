import confetti from 'canvas-confetti';
import { CONFETTI_PALETTE } from './tokens';

export type CelebrationLevel = 'correct' | 'great' | 'amazing';

function shouldReduceMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );
}

export function celebrate(level: CelebrationLevel = 'correct') {
  if (shouldReduceMotion()) {
    return;
  }

  const scalar = level === 'amazing' ? 1.08 : level === 'great' ? 1.04 : 1;
  const count = level === 'amazing' ? 16 : level === 'great' ? 12 : 8;
  const main = level === 'amazing' ? CONFETTI_PALETTE.party : CONFETTI_PALETTE.candy;

  confetti({
    particleCount: count,
    spread: 52,
    startVelocity: 20,
    decay: 0.92,
    gravity: 0.75,
    ticks: 120,
    origin: { x: 0.5, y: 0.55 },
    colors: [...main],
    scalar,
    shapes: ['circle', 'square'],
    zIndex: 9999,
  });

  if (level === 'amazing') {
    confetti({
      particleCount: 8,
      spread: 90,
      startVelocity: 18,
      gravity: 0.7,
      origin: { x: 0.5, y: 0.5 },
      colors: [...CONFETTI_PALETTE.gold],
      scalar,
      zIndex: 9999,
    });
  }
}
