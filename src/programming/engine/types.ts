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
    procedureId?: string;
  };
  body?: Block[];
  branchTrue?: Block[];
  branchFalse?: Block[];
}

export type Program = Block[];
export type Procedures = Record<string, Program>;

export interface InterpreterWorld {
  width: number;
  height: number;
  start: ProgrammingPosition;
  direction: ProgrammingDirection;
  target: ProgrammingPosition;
  obstacles: ProgrammingPosition[];
  gems?: ProgrammingPosition[];
  requiresAllGems?: boolean;
  procedures?: Procedures;
  maxSteps?: number;
  maxOperations?: number;
  maxCallDepth?: number;
}

export interface BotState {
  position: ProgrammingPosition;
  direction: ProgrammingDirection;
}

export type ExecutionStatus = 'running' | 'blocked' | 'success';
export type BlockedReason =
  | 'wall'
  | 'obstacle'
  | 'missingGem'
  | 'unknownProcedure'
  | 'maxSteps'
  | 'maxCallDepth';

export interface RuntimeWorldState {
  remainingGems: ProgrammingPosition[];
}

export interface ExecutionStep {
  activeBlockId: string;
  command: CommandKind;
  status: ExecutionStatus;
  bot: BotState;
  world: RuntimeWorldState;
  blockedReason?: BlockedReason;
}

export interface WorldFrameEvent {
  status: ExecutionStatus;
  message: string;
  activeBlockId: string;
  bot: BotState;
}
