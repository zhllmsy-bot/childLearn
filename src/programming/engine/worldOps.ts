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

export function samePosition(left: ProgrammingPosition, right: ProgrammingPosition) {
  return left.x === right.x && left.y === right.y;
}

export function isObstacle(world: InterpreterWorld, position: ProgrammingPosition) {
  return world.obstacles.some((obstacle) => samePosition(obstacle, position));
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

export function jumpPosition(position: ProgrammingPosition, direction: ProgrammingDirection) {
  return nextPosition(nextPosition(position, direction), direction);
}

export function canOccupy(world: InterpreterWorld, position: ProgrammingPosition) {
  return isInsideWorld(world, position) && !isObstacle(world, position);
}

export function canGoForward(world: InterpreterWorld, bot: BotState) {
  return canOccupy(world, nextPosition(bot.position, bot.direction));
}

export function hasGemAt(gems: ProgrammingPosition[], position: ProgrammingPosition) {
  return gems.some((gem) => samePosition(gem, position));
}

export function collectGemAt(gems: ProgrammingPosition[], position: ProgrammingPosition) {
  return gems.filter((gem) => !samePosition(gem, position));
}

export function hasReachedTarget(world: InterpreterWorld, bot: BotState) {
  return samePosition(bot.position, world.target);
}
