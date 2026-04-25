import type {
  BotState,
  InterpreterWorld,
  ProgrammingDirection,
  ProgrammingPosition,
} from './types';

const DIRECTION_STEPS: Record<ProgrammingDirection, ProgrammingPosition> = {
  north: { x: 0, y: -1 },
  east: { x: 1, y: 0 },
  south: { x: 0, y: 1 },
  west: { x: -1, y: 0 },
};

export function isInsideWorld(world: InterpreterWorld, position: ProgrammingPosition) {
  return (
    position.x >= 0 &&
    position.x < world.width &&
    position.y >= 0 &&
    position.y < world.height
  );
}

export function positionKey(position: ProgrammingPosition) {
  return `${position.x}:${position.y}`;
}

export function isObstacle(world: InterpreterWorld, position: ProgrammingPosition) {
  return world.obstacles.some((obstacle) => position.x === obstacle.x && position.y === obstacle.y);
}

export function turnLeft(direction: ProgrammingDirection): ProgrammingDirection {
  if (direction === 'north') {
    return 'west';
  }
  if (direction === 'west') {
    return 'south';
  }
  if (direction === 'south') {
    return 'east';
  }
  return 'north';
}

export function turnRight(direction: ProgrammingDirection): ProgrammingDirection {
  if (direction === 'north') {
    return 'east';
  }
  if (direction === 'east') {
    return 'south';
  }
  if (direction === 'south') {
    return 'west';
  }
  return 'north';
}

export function nextPosition(position: ProgrammingPosition, direction: ProgrammingDirection) {
  const step = DIRECTION_STEPS[direction];
  return {
    x: position.x + step.x,
    y: position.y + step.y,
  };
}

export function hasReachedTarget(world: InterpreterWorld, bot: BotState) {
  return bot.position.x === world.target.x && bot.position.y === world.target.y;
}

