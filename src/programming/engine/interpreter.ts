import type { Block, ExecutionStep, InterpreterWorld, Program, ProgrammingDirection } from './types';
import { hasReachedTarget, isInsideWorld, isObstacle, nextPosition, turnLeft, turnRight } from './worldOps';

interface FrameState {
  blocks: Block[];
  index: number;
  loopLeft?: number;
}

function samePosition(left: { x: number; y: number }, right: { x: number; y: number }) {
  return left.x === right.x && left.y === right.y;
}

function normalizeRepeatCount(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return 0;
  }
  return Math.max(0, Math.floor(n));
}

function moveForward(world: InterpreterWorld, bot: { position: { x: number; y: number }; direction: ProgrammingDirection }) {
  const candidate = nextPosition(bot.position, bot.direction);

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

function executeRepeat(block: Block, frames: FrameState[]) {
  const loops = normalizeRepeatCount(block.params?.n);
  if (loops <= 0) {
    return;
  }

  frames.push({
    blocks: block.body ?? [],
    index: 0,
    loopLeft: loops,
  });
}

function executeIfPath(bot: { position: { x: number; y: number }; direction: ProgrammingDirection }, block: Block, world: InterpreterWorld, frames: FrameState[]) {
  const next = nextPosition(bot.position, bot.direction);
  const canGo =
    isInsideWorld(world, next) &&
    !isObstacle(world, next);
  frames.push({
    blocks: canGo ? block.branchTrue ?? [] : block.branchFalse ?? [],
    index: 0,
  });
}

export function* interpret(program: Program, world: InterpreterWorld): Generator<ExecutionStep> {
  const stack: FrameState[] = [{ blocks: program, index: 0 }];
  let bot = {
    position: world.start,
    direction: world.direction,
  };

  while (stack.length) {
    const top = stack[stack.length - 1];

    if (top.index >= top.blocks.length) {
      if (top.loopLeft !== undefined && top.loopLeft > 1) {
        top.loopLeft -= 1;
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

    if (block.kind === 'forward') {
      const moveResult = moveForward(world, bot);
      if (!moveResult.blocked) {
        bot = moveResult.bot;
        yield {
          activeBlockId: block.id,
          command: 'forward',
          status: hasReachedTarget(world, bot) ? 'success' : 'running',
          bot,
        };
        if (hasReachedTarget(world, bot)) {
          return;
        }
      } else {
        yield {
          activeBlockId: block.id,
          command: 'forward',
          status: 'blocked',
          bot,
          blockedReason: moveResult.blockedReason,
        };
        return;
      }
      continue;
    }

    if (block.kind === 'turnLeft') {
      bot = {
        ...bot,
        direction: turnLeft(bot.direction),
      };
      yield {
        activeBlockId: block.id,
        command: 'turnLeft',
        status: 'running',
        bot,
      };
      continue;
    }

    if (block.kind === 'turnRight') {
      bot = {
        ...bot,
        direction: turnRight(bot.direction),
      };
      yield {
        activeBlockId: block.id,
        command: 'turnRight',
        status: 'running',
        bot,
      };
      continue;
    }

    if (block.kind === 'repeat') {
      executeRepeat(block, stack);
      continue;
    }

    if (block.kind === 'ifPath') {
      executeIfPath(bot, block, world, stack);
      continue;
    }

    if (block.kind === 'ifGem' || block.kind === 'collect') {
      yield {
        activeBlockId: block.id,
        command: block.kind,
        status: 'running',
        bot,
      };
      continue;
    }

    if (block.kind === 'procCall' || block.kind === 'whileNotGoal' || block.kind === 'jump') {
      // Reserved for later stages.
      continue;
    }
  }
}

export function buildExecutionFrames(program: Block[], world: InterpreterWorld): ExecutionStep[] {
  return Array.from(interpret(program, world));
}

