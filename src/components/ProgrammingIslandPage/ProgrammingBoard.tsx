import { memo } from 'react';
import { motion } from 'framer-motion';
import { Flag, Gem } from 'lucide-react';
import type { ProgrammingLevel, ProgrammingPosition } from '../../programming/programmingLevels';
import { positionKey, samePosition } from '../../programming/engine/worldOps';
import { SPRING } from '../../theme/springs';
import { XiaomanSprite, type XiaomanEmotion } from '../_primitives/XiaomanSprite';
import { DIRECTION_ARROW, DIRECTION_ROTATE, type BotViewState, type RunStatus } from './programmingViewTypes';

interface ProgrammingBoardProps {
  level: ProgrammingLevel;
  bot: BotViewState;
  status: RunStatus;
  visitedKeys: Set<string>;
  remainingGems: ProgrammingPosition[];
}

function XiaomanBoardSprite({
  direction,
  status,
}: {
  direction: BotViewState['direction'];
  status: RunStatus;
}) {
  const emotion: XiaomanEmotion =
    status === 'success'
      ? 'cheer'
      : status === 'blocked'
        ? 'thinking'
        : status === 'running'
          ? 'happy'
          : 'idle';

  return (
    <motion.div
      aria-label="小满模型"
      initial={false}
      animate={{
        rotate: DIRECTION_ROTATE[direction],
        scale: status === 'success' ? 1.08 : status === 'blocked' ? 0.94 : 1,
      }}
      transition={SPRING.bounce}
      className="relative flex h-full w-full items-center justify-center"
    >
      <XiaomanSprite emotion={emotion} className="h-full w-full object-contain drop-shadow-md" />
      <motion.div
        animate={{ opacity: status === 'running' ? [0.35, 1, 0.35] : 0.55 }}
        transition={{ duration: 0.9, repeat: status === 'running' ? Infinity : 0 }}
        className="absolute left-1/2 top-[-12%] h-[24%] w-[16%] -translate-x-1/2 rounded-full bg-cyan-200 blur-sm"
      />
    </motion.div>
  );
}

function ProgrammingBoardComponent({
  level,
  bot,
  status,
  visitedKeys,
  remainingGems,
}: ProgrammingBoardProps) {
  const width = level.width ?? 5;
  const height = level.height ?? 5;
  const obstacleKeys = new Set(level.obstacles.map(positionKey));
  const gemKeys = new Set(remainingGems.map(positionKey));
  const cells = Array.from({ length: width * height }, (_, index) => ({
    x: index % width,
    y: Math.floor(index / width),
  }));

  return (
    <div
      className="mt-4 grid max-w-[34rem] gap-2"
      style={{ gridTemplateColumns: `repeat(${width}, minmax(0, 1fr))` }}
    >
      {cells.map((cell) => {
        const key = positionKey(cell);
        const hasBot = samePosition(cell, bot.position);
        const hasTarget = samePosition(cell, level.target);
        const hasObstacle = obstacleKeys.has(key);
        const hasVisited = visitedKeys.has(key);
        const hasGem = gemKeys.has(key);

        return (
          <div
            key={key}
            className={`relative aspect-square rounded-[1.2rem] border text-center shadow-sm ring-1 ${
              hasObstacle
                ? 'border-slate-300 bg-slate-200 text-slate-600 ring-slate-300'
                : hasTarget
                  ? 'border-amber-200 bg-amber-100 text-amber-700 ring-amber-200'
                  : hasVisited
                    ? 'border-emerald-200 bg-emerald-100 text-emerald-700 ring-emerald-200'
                    : 'border-white bg-white/78 text-emerald-900 ring-white'
            }`}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              {hasObstacle ? (
                <span className="text-3xl">◆</span>
              ) : hasGem ? (
                <Gem size={30} strokeWidth={3.1} className="text-sky-600" />
              ) : hasTarget ? (
                <Flag size={28} strokeWidth={3.2} />
              ) : null}
            </div>
            {hasBot ? (
              <motion.div
                layoutId="programming-bot"
                transition={SPRING.bounce}
                className={`absolute inset-1 flex items-center justify-center rounded-[1rem] bg-gradient-to-b from-white to-sky-50 shadow-lg shadow-sky-300/40 ring-2 ${
                  status === 'blocked' ? 'ring-4 ring-orange-300' : 'ring-sky-200'
                }`}
              >
                <div className="relative h-[82%] w-[82%]">
                  <XiaomanBoardSprite direction={bot.direction} status={status} />
                  <div className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-sky-600 text-sm font-black text-white shadow-sm ring-2 ring-white">
                    {DIRECTION_ARROW[bot.direction]}
                  </div>
                </div>
              </motion.div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export const ProgrammingBoard = memo(ProgrammingBoardComponent);
