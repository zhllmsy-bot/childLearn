import type {
  Block,
  BotState,
  CommandKind,
  ExecutionStep,
  InterpreterWorld,
  Program,
} from './types';
import {
  canGoForward,
  collectOnTile,
  hasGemAt,
  hasReachedTarget,
  isInsideWorld,
  isObstacle,
  jumpPosition,
  nextPosition,
  turnLeft,
  turnRight,
} from './worldOps';

interface FrameState {
  blocks: Block[];
  index: number;
  loopLeft?: number;
  whileKind?: 'whileNotGoal';
  parentBlockId?: string;
  callDepth?: number;
}

const DEFAULT_MAX_STEPS = 160;
const DEFAULT_MAX_OPERATIONS = 1200;
const DEFAULT_MAX_CALL_DEPTH = 12;

function normalizeRepeatCount(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return 0;
  }
  return Math.max(0, Math.floor(n));
}

function makeWorldFrame(remainingGems: Map<string, { x: number; y: number }>) {
  return {
    remainingGems: [...remainingGems.values()],
  };
}

function gemKey(position: { x: number; y: number }) {
  return `${position.x}:${position.y}`;
}

function makeStep({
  block,
  bot,
  remainingGems,
  status,
  blockedReason,
}: {
  block: Block;
  bot: BotState;
  remainingGems: Map<string, { x: number; y: number }>;
  status: ExecutionStep['status'];
  blockedReason?: ExecutionStep['blockedReason'];
}): ExecutionStep {
  return {
    activeBlockId: block.id,
    command: block.kind,
    status,
    bot,
    world: makeWorldFrame(remainingGems),
    blockedReason,
  };
}

function hasCompleted(world: InterpreterWorld, bot: BotState, remainingGems: Map<string, { x: number; y: number }>) {
  return hasReachedTarget(world, bot) && (!world.requiresAllGems || remainingGems.size === 0);
}

function moveTo(
  world: InterpreterWorld,
  bot: BotState,
  candidate: { x: number; y: number },
) {
  if (!isInsideWorld(world, candidate)) {
    return { bot, blocked: true as const, blockedReason: 'wall' as const };
  }

  if (isObstacle(world, candidate)) {
    return { bot, blocked: true as const, blockedReason: 'obstacle' as const };
  }

  return {
    bot: {
      position: candidate,
      direction: bot.direction,
    },
    blocked: false as const,
  };
}

function pushRepeat(block: Block, frames: FrameState[]) {
  const loops = normalizeRepeatCount(block.params?.n);
  if (loops <= 0) {
    return;
  }

  frames.push({
    blocks: block.body ?? [],
    index: 0,
    loopLeft: loops,
    parentBlockId: block.id,
  });
}

function pushWhile(block: Block, frames: FrameState[]) {
  frames.push({
    blocks: block.body ?? [],
    index: 0,
    whileKind: 'whileNotGoal',
    parentBlockId: block.id,
  });
}

function pushBranch(
  block: Block,
  frames: FrameState[],
  branch: Block[] | undefined,
  callDepth = 0,
) {
  frames.push({
    blocks: branch ?? [],
    index: 0,
    parentBlockId: block.id,
    callDepth,
  });
}

export function* interpret(program: Program, world: InterpreterWorld): Generator<ExecutionStep> {
  const stack: FrameState[] = [{ blocks: program, index: 0 }];
  const remainingGems = new Map(
    (world.gems ?? []).map((gem) => [gemKey(gem), gem]),
  );
  let bot: BotState = {
    position: world.start,
    direction: world.direction,
  };
  let yieldedSteps = 0;
  let operations = 0;
  const maxSteps = world.maxSteps ?? DEFAULT_MAX_STEPS;
  const maxOperations = world.maxOperations ?? DEFAULT_MAX_OPERATIONS;
  const maxCallDepth = world.maxCallDepth ?? DEFAULT_MAX_CALL_DEPTH;
  let lastBlock: Block | null = null;

  while (stack.length) {
    operations += 1;
    if (operations > maxOperations) {
      yield makeStep({
        block: lastBlock ?? { id: 'program', kind: 'whileNotGoal' },
        bot,
        remainingGems,
        status: 'blocked',
        blockedReason: 'maxSteps',
      });
      return;
    }

    const top = stack[stack.length - 1];

    if (top.index >= top.blocks.length) {
      if (top.loopLeft !== undefined && top.loopLeft > 1) {
        top.loopLeft -= 1;
        top.index = 0;
      } else if (top.whileKind === 'whileNotGoal' && !hasCompleted(world, bot, remainingGems)) {
        top.index = 0;
      } else {
        stack.pop();
      }
      continue;
    }

    const block = top.blocks[top.index++];
    if (!block?.id) {
      continue;
    }
    lastBlock = block;

    if (yieldedSteps >= maxSteps) {
      yield makeStep({
        block,
        bot,
        remainingGems,
        status: 'blocked',
        blockedReason: 'maxSteps',
      });
      return;
    }

    const yieldAndMaybeStop = function* (
      status: ExecutionStep['status'],
      blockedReason?: ExecutionStep['blockedReason'],
    ) {
      yieldedSteps += 1;
      yield makeStep({
        block,
        bot,
        remainingGems,
        status,
        blockedReason,
      });
      return status === 'success' || status === 'blocked';
    };

    if (block.kind === 'forward') {
      const moveResult = moveTo(world, bot, nextPosition(bot.position, bot.direction));
      if (moveResult.blocked) {
        yield* yieldAndMaybeStop('blocked', moveResult.blockedReason);
        return;
      }

      bot = moveResult.bot;
      const done = hasCompleted(world, bot, remainingGems);
      yield* yieldAndMaybeStop(done ? 'success' : 'running');
      if (done) {
        return;
      }
      continue;
    }

    if (block.kind === 'jump') {
      const moveResult = moveTo(world, bot, jumpPosition(bot.position, bot.direction));
      if (moveResult.blocked) {
        yield* yieldAndMaybeStop('blocked', moveResult.blockedReason);
        return;
      }

      bot = moveResult.bot;
      const done = hasCompleted(world, bot, remainingGems);
      yield* yieldAndMaybeStop(done ? 'success' : 'running');
      if (done) {
        return;
      }
      continue;
    }

    if (block.kind === 'turnLeft') {
      bot = {
        ...bot,
        direction: turnLeft(bot.direction),
      };
      yield* yieldAndMaybeStop(hasCompleted(world, bot, remainingGems) ? 'success' : 'running');
      if (hasCompleted(world, bot, remainingGems)) {
        return;
      }
      continue;
    }

    if (block.kind === 'turnRight') {
      bot = {
        ...bot,
        direction: turnRight(bot.direction),
      };
      yield* yieldAndMaybeStop(hasCompleted(world, bot, remainingGems) ? 'success' : 'running');
      if (hasCompleted(world, bot, remainingGems)) {
        return;
      }
      continue;
    }

    if (block.kind === 'collect') {
      const collected = collectOnTile([...remainingGems.values()], bot.position);
      if (!collected.collected) {
        yield* yieldAndMaybeStop('blocked', 'missingGem');
        return;
      }

      remainingGems.clear();
      collected.remainingGems.forEach((gem) => remainingGems.set(gemKey(gem), gem));
      const done = hasCompleted(world, bot, remainingGems);
      yield* yieldAndMaybeStop(done ? 'success' : 'running');
      if (done) {
        return;
      }
      continue;
    }

    if (block.kind === 'repeat') {
      pushRepeat(block, stack);
      continue;
    }

    if (block.kind === 'ifPath') {
      pushBranch(block, stack, canGoForward(world, bot) ? block.branchTrue : block.branchFalse);
      continue;
    }

    if (block.kind === 'ifGem') {
      pushBranch(
        block,
        stack,
        hasGemAt([...remainingGems.values()], bot.position)
          ? block.branchTrue
          : block.branchFalse,
      );
      continue;
    }

    if (block.kind === 'whileNotGoal') {
      if (!hasCompleted(world, bot, remainingGems)) {
        pushWhile(block, stack);
      }
      continue;
    }

    if (block.kind === 'procCall') {
      const procedureId = block.params?.procedureId ?? block.params?.commandId ?? 'main';
      const procedure = world.procedures?.[procedureId];
      if (!procedure) {
        yield* yieldAndMaybeStop('blocked', 'unknownProcedure');
        return;
      }

      const nextCallDepth = (top.callDepth ?? 0) + 1;
      if (nextCallDepth > maxCallDepth) {
        yield* yieldAndMaybeStop('blocked', 'maxCallDepth');
        return;
      }

      pushBranch(block, stack, procedure, nextCallDepth);
      continue;
    }

    const _exhaustive: CommandKind = block.kind;
    void _exhaustive;
  }
}

export function buildExecutionFrames(program: Block[], world: InterpreterWorld): ExecutionStep[] {
  return Array.from(interpret(program, world));
}
