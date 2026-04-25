import confetti from 'canvas-confetti';

export type CelebrationLevel = 'correct' | 'great' | 'amazing';

const PALETTE = {
  gold: ['#FFB200', '#FFD257', '#FFECB0'],
  candy: ['#F77444', '#FFB200', '#3EA02D', '#2E8CF0'],
  emerald: ['#3EA02D', '#7FC86A', '#C8EDBC', '#FFB200'],
  party: ['#FFD9C2', '#FFECB0', '#C8EDBC', '#C2E0FF'],
} as const;

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
  const main = level === 'amazing' ? PALETTE.party : PALETTE.candy;

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
      colors: [...PALETTE.gold],
      scalar,
      zIndex: 9999,
    });
  }
}
