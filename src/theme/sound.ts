import type { CelebrationLevel } from './confetti';

type AudioWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

let sharedContext: AudioContext | null = null;

function getAudioContext() {
  if (sharedContext) {
    return sharedContext;
  }

  const audioWindow = window as AudioWindow;
  const Context = audioWindow.AudioContext ?? audioWindow.webkitAudioContext;
  if (!Context) {
    return null;
  }

  sharedContext = new Context();
  return sharedContext;
}

function playTone(frequency: number, duration: number, delay = 0) {
  const context = getAudioContext();
  if (!context) {
    return;
  }

  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const start = context.currentTime + delay;
  oscillator.frequency.setValueAtTime(frequency, start);
  oscillator.type = 'sine';
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(0.16, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

export function playPositiveFeedback(level: CelebrationLevel) {
  const chord =
    level === 'amazing'
      ? [523.25, 659.25, 783.99, 1046.5]
      : level === 'great'
        ? [523.25, 659.25, 783.99]
        : [523.25, 659.25];

  chord.forEach((frequency, index) => playTone(frequency, 0.22, index * 0.045));
  navigator.vibrate?.(level === 'amazing' ? [25, 25, 35] : [20]);
}

export function playTryAgainFeedback() {
  playTone(329.63, 0.12);
  window.setTimeout(() => playTone(392, 0.12), 90);
  navigator.vibrate?.(18);
}
