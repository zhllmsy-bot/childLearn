import { memo } from 'react';
import { motion } from 'framer-motion';
import { Flag, Gem } from 'lucide-react';
import type { ProgrammingLevel, ProgrammingPosition } from '../../programming/programmingLevels';
import { positionKey, samePosition } from '../../programming/engine/worldOps';
import { SPRING } from '../../theme/springs';
import { DIRECTION_ARROW, DIRECTION_ROTATE, type BotViewState, type RunStatus } from './programmingViewTypes';

interface ProgrammingBoardProps {
  level: ProgrammingLevel;
  bot: BotViewState;
  status: RunStatus;
  visitedKeys: Set<string>;
  remainingGems: ProgrammingPosition[];
}

function LightHeroModel({
  direction,
  status,
}: {
  direction: BotViewState['direction'];
  status: RunStatus;
}) {
  return (
    <motion.div
      aria-label="小满模型"
      initial={false}
      animate={{
        rotate: DIRECTION_ROTATE[direction],
        scale: status === 'success' ? 1.08 : status === 'blocked' ? 0.94 : 1,
      }}
      transition={SPRING.bounce}
      className="relative h-full w-full"
    >
      <div className="absolute left-1/2 top-[6%] h-[78%] w-[58%] -translate-x-1/2 rounded-b-[42%] rounded-t-[48%] bg-gradient-to-b from-slate-50 via-slate-200 to-slate-400 shadow-[inset_0_-10px_18px_rgba(15,23,42,0.18)] ring-2 ring-white" />
      <div className="absolute left-1/2 top-[8%] h-[34%] w-[42%] -translate-x-1/2 rounded-[45%] bg-gradient-to-b from-slate-50 to-slate-300 shadow-sm ring-2 ring-white">
        <div className="absolute left-[18%] top-[38%] h-[16%] w-[24%] rounded-full bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.85)]" />
        <div className="absolute right-[18%] top-[38%] h-[16%] w-[24%] rounded-full bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.85)]" />
      </div>
      <div className="absolute left-[18%] top-[42%] h-[32%] w-[18%] -rotate-12 rounded-full bg-gradient-to-b from-rose-400 to-red-500 ring-2 ring-white" />
      <div className="absolute right-[18%] top-[42%] h-[32%] w-[18%] rotate-12 rounded-full bg-gradient-to-b from-rose-400 to-red-500 ring-2 ring-white" />
      <div className="absolute left-1/2 top-[40%] h-[40%] w-[30%] -translate-x-1/2 rounded-b-[45%] bg-gradient-to-b from-red-500 via-rose-500 to-red-700 ring-2 ring-white" />
      <div className="absolute left-1/2 top-[48%] h-[16%] w-[16%] -translate-x-1/2 rounded-full bg-cyan-300 shadow-[0_0_16px_rgba(34,211,238,0.95)] ring-2 ring-white" />
      <div className="absolute left-[34%] top-[78%] h-[18%] w-[13%] rounded-full bg-slate-300 ring-2 ring-white" />
      <div className="absolute right-[34%] top-[78%] h-[18%] w-[13%] rounded-full bg-slate-300 ring-2 ring-white" />
      <motion.div
        animate={{ opacity: status === 'running' ? [0.35, 1, 0.35] : 0.55 }}
        transition={{ duration: 0.9, repeat: status === 'running' ? Infinity : 0 }}
        className="absolute left-1/2 top-[-18%] h-[30%] w-[16%] -translate-x-1/2 rounded-full bg-cyan-200 blur-sm"
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
                className="absolute inset-1 flex items-center justify-center rounded-[1rem] bg-gradient-to-b from-white to-sky-50 shadow-lg shadow-sky-300/40 ring-2 ring-sky-200"
              >
                <div className="relative h-[82%] w-[82%]">
                  <LightHeroModel direction={bot.direction} status={status} />
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
