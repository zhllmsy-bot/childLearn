import type {
  ProgrammingDirection,
  ProgrammingPosition,
} from '../../programming/programmingLevels';

export type RunStatus = 'idle' | 'running' | 'success' | 'blocked';
export type PlaybackPace = 'slow' | 'fast';
export type ProgrammingEmotion = 'idle' | 'happy' | 'thinking' | 'cheer';

export interface BotViewState {
  position: ProgrammingPosition;
  direction: ProgrammingDirection;
}

export const DIRECTION_ROTATE: Record<ProgrammingDirection, number> = {
  north: 0,
  east: 90,
  south: 180,
  west: -90,
};

export const PLAYBACK_DELAY_MS: Record<PlaybackPace, number> = {
  slow: 800,
  fast: 500,
};
