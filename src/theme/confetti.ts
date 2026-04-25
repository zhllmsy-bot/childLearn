import confetti from 'canvas-confetti';

export type CelebrationLevel = 'correct' | 'great' | 'amazing';

const PALETTE = {
  gold: ['#FFD700', '#FFA500', '#FF8C00', '#FFEB3B', '#FFC107'],
  candy: ['#FF6B9D', '#C06EFF', '#4EA8FF', '#4ECDC4', '#FFE66D'],
  emerald: ['#10B981', '#34D399', '#6EE7B7', '#A7F3D0', '#FBBF24'],
  party: ['#FFB6C1', '#FFE66D', '#95E1D3', '#F38181', '#AA96DA'],
} as const;

const MAX_EMOJI_RAIN_NODES = 36;
let activeEmojiRainNodes = 0;

function emojiRain() {
  if (activeEmojiRainNodes >= MAX_EMOJI_RAIN_NODES) {
    return;
  }

  activeEmojiRainNodes += 1;
  const node = document.createElement('div');
  const emojis = ['⭐', '🌟', '🎉', '🎊', '🎈'];
  node.textContent = emojis[Math.floor(Math.random() * emojis.length)];
  node.style.cssText = `
    position:fixed; top:-50px; left:${Math.random() * 100}vw;
    font-size:${24 + Math.random() * 32}px;
    z-index:9998; pointer-events:none;
    transition: transform 2.5s linear, opacity 2.5s linear;
  `;
  document.body.appendChild(node);
  requestAnimationFrame(() => {
    node.style.transform = `translateY(110vh) rotate(${Math.random() * 720 - 360}deg)`;
    node.style.opacity = '0';
  });
  window.setTimeout(() => {
    node.remove();
    activeEmojiRainNodes = Math.max(0, activeEmojiRainNodes - 1);
  }, 2600);
}

export function celebrate(level: CelebrationLevel = 'correct') {
  const scalar = level === 'amazing' ? 1.4 : level === 'great' ? 1.2 : 1;
  const count = level === 'amazing' ? 160 : level === 'great' ? 120 : 40;
  const main = level === 'amazing' ? PALETTE.party : PALETTE.candy;

  confetti({
    particleCount: count,
    spread: 90,
    startVelocity: 45,
    decay: 0.9,
    gravity: 0.9,
    ticks: 200,
    origin: { x: 0.5, y: 0.55 },
    colors: [...main],
    scalar,
    shapes: ['circle', 'square'],
    zIndex: 9999,
  });

  if (level === 'correct') {
    return;
  }

  window.setTimeout(() => {
    confetti({
      particleCount: 50,
      angle: 60,
      spread: 55,
      startVelocity: 55,
      origin: { x: 0, y: 0.8 },
      colors: [...PALETTE.gold],
      scalar: scalar * 0.9,
      zIndex: 9999,
    });
    confetti({
      particleCount: 50,
      angle: 120,
      spread: 55,
      startVelocity: 55,
      origin: { x: 1, y: 0.8 },
      colors: [...PALETTE.gold],
      scalar: scalar * 0.9,
      zIndex: 9999,
    });
  }, 150);

  const end = Date.now() + 1000;
  const rain = () => {
    confetti({
      particleCount: 8,
      startVelocity: 0,
      gravity: 0.45,
      ticks: 300,
      spread: 180,
      origin: { x: Math.random(), y: -0.05 },
      colors: [...PALETTE.emerald],
      scalar: 0.8,
      shapes: ['circle'],
      zIndex: 9999,
    });
    if (Date.now() < end) {
      window.setTimeout(rain, 80);
    }
  };
  window.setTimeout(rain, 300);

  if (level === 'great' || level === 'amazing') {
    window.setTimeout(() => {
      const startAt = Date.now();
      const loop = () => {
        emojiRain();
        if (Date.now() - startAt < 1500) {
          window.setTimeout(loop, 100);
        }
      };
      loop();
    }, 500);
  }

  if (level === 'amazing') {
    window.setTimeout(() => {
      confetti({
        particleCount: 40,
        spread: 360,
        startVelocity: 25,
        gravity: 0.6,
        origin: { x: 0.5, y: 0.5 },
        colors: ['#FF4D6D', '#FF85A2', '#FFC2D1'],
        shapes: ['circle'],
        scalar: 1.3,
        zIndex: 9999,
      });
    }, 500);
  }
}
