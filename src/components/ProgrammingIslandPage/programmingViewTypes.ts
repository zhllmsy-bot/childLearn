import type {
  ProgrammingDirection,
  ProgrammingPosition,
} from '../../programming/programmingLevels';

export type RunStatus = 'idle' | 'running' | 'success' | 'blocked';

export interface BotViewState {
  position: ProgrammingPosition;
  direction: ProgrammingDirection;
}

export type PlaybackSpeed = 0.5 | 1 | 2;

export const SPEED_OPTIONS: Array<{ label: string; value: PlaybackSpeed }> = [
  { label: '0.5x', value: 0.5 },
  { label: '1x', value: 1 },
  { label: '2x', value: 2 },
];

export const DIRECTION_ARROW: Record<ProgrammingDirection, string> = {
  north: '↑',
  east: '→',
  south: '↓',
  west: '←',
};

export const DIRECTION_ROTATE: Record<ProgrammingDirection, number> = {
  north: 0,
  east: 90,
  south: 180,
  west: -90,
};
