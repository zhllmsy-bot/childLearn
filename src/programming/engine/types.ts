export type CommandKind =
  | 'forward'
  | 'turnLeft'
  | 'turnRight'
  | 'jump'
  | 'collect'
  | 'repeat'
  | 'procCall'
  | 'ifPath'
  | 'ifGem'
  | 'whileNotGoal';

export type ProgrammingDirection = 'north' | 'east' | 'south' | 'west';

export interface ProgrammingPosition {
  x: number;
  y: number;
}

export interface Block {
  id: string;
  kind: CommandKind;
  params?: {
    n?: number;
    commandId?: string;
  };
  body?: Block[];
  branchTrue?: Block[];
  branchFalse?: Block[];
}

export type Program = Block[];

export interface InterpreterWorld {
  width: number;
  height: number;
  start: ProgrammingPosition;
  direction: ProgrammingDirection;
  target: ProgrammingPosition;
  obstacles: ProgrammingPosition[];
}

export interface BotState {
  position: ProgrammingPosition;
  direction: ProgrammingDirection;
}

export type ExecutionStatus = 'running' | 'blocked' | 'success';

export interface ExecutionStep {
  activeBlockId: string;
  command: CommandKind;
  status: ExecutionStatus;
  bot: BotState;
  blockedReason?: 'wall' | 'obstacle';
}

export interface WorldFrameEvent {
  status: ExecutionStatus;
  message: string;
  activeBlockId: string;
  bot: BotState;
}

