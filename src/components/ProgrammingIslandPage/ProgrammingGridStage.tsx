import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { ProgrammingLevel, ProgrammingPosition } from '../../programming/programmingLevels';
import { positionKey, samePosition } from '../../programming/engine/worldOps';
import { PROGRAMMING_MOTION, PROGRAMMING_SPRING_POP } from '../../programming/programmingMotion';
import { PROGRAMMING_SIZES, PROGRAMMING_SPACE } from '../../theme/tokens';
import { XiaomanSprite } from '../_primitives/XiaomanSprite';
import type { BotViewState, ProgrammingEmotion, RunStatus } from './programmingViewTypes';
import { DIRECTION_ROTATE } from './programmingViewTypes';
import { ProgrammingTaskBubble } from './ProgrammingTaskBubble';
import { useViewportHeight } from './useViewportHeight';

interface ProgrammingGridStageProps {
  bot: BotViewState;
  emotion: ProgrammingEmotion;
  level: ProgrammingLevel;
  onSpeak: () => void;
  previewPath: ProgrammingPosition[];
  remainingGems: ProgrammingPosition[];
  status: RunStatus;
  taskText: string;
  visitedKeys: Set<string>;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max));
}

export function ProgrammingGridStage({
  bot,
  emotion,
  level,
  onSpeak,
  previewPath,
  remainingGems,
  status,
  taskText,
  visitedKeys,
}: ProgrammingGridStageProps) {
  const prefersReducedMotion = useReducedMotion();
  const viewportHeight = useViewportHeight();
  const width = level.width ?? 5;
  const height = level.height ?? 5;
  const obstacleKeys = useMemo(() => new Set(level.obstacles.map(positionKey)), [level.obstacles]);
  const gemKeys = useMemo(() => new Set(remainingGems.map(positionKey)), [remainingGems]);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [stageWidth, setStageWidth] = useState(
    width * PROGRAMMING_SIZES.gridCellMax + (width - 1) * PROGRAMMING_SPACE.sm,
  );
  const gap = PROGRAMMING_SPACE.sm;

  useEffect(() => {
    const node = containerRef.current;
    if (!node) {
      return;
    }
    const observer = new ResizeObserver(([entry]) => {
      setStageWidth(entry.contentRect.width);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const cellSize = Math.min(
    clamp(Math.floor((stageWidth - gap * (width - 1)) / width), PROGRAMMING_SIZES.gridCellMin, PROGRAMMING_SIZES.gridCellMax),
    clamp(Math.floor((viewportHeight - 372 - gap * (height - 1)) / height), PROGRAMMING_SIZES.gridCellMin, PROGRAMMING_SIZES.gridCellMax),
  );
  const gridWidth = cellSize * width + gap * (width - 1);
  const cells = Array.from({ length: width * height }, (_, index) => ({
    x: index % width,
    y: Math.floor(index / width),
  }));
  const bubbleWidth = Math.min(
    PROGRAMMING_SIZES.taskBubbleMax,
    Math.max(PROGRAMMING_SIZES.taskBubbleMin, Math.floor(gridWidth * 0.68)),
  );
  const bubbleLeft = clamp(
    bot.position.x * (cellSize + gap) + cellSize / 2 - bubbleWidth * 0.28,
    0,
    Math.max(0, gridWidth - bubbleWidth),
  );
  const bubbleTop = clamp(bot.position.y * (cellSize + gap) - 112, 8, 56);
  const pathD = previewPath.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x * (cellSize + gap) + cellSize / 2} ${point.y * (cellSize + gap) + cellSize / 2}`).join(' ');

  return (
    <section className="programming-card relative min-h-0 p-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="programming-title text-[22px] font-bold leading-[1.3]">小满出发啦</h2>
        <div className="text-[18px] font-bold leading-none text-[var(--text-secondary)]">
          {width} × {height}
        </div>
      </div>
      <div ref={containerRef} className="programming-stage-wrap relative overflow-x-auto overflow-y-visible p-4">
        <div className="relative mx-auto" style={{ width: gridWidth }}>
          <ProgrammingTaskBubble
            left={bubbleLeft}
            maxWidth={bubbleWidth}
            onSpeak={onSpeak}
            text={taskText}
            top={bubbleTop}
          />
          {previewPath.length > 1 ? (
            <svg
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 z-0"
              height={cellSize * height + gap * (height - 1)}
              width={gridWidth}
            >
              <path
                d={pathD}
                fill="none"
                stroke="var(--brand-primary)"
                strokeDasharray="4 2"
                strokeWidth="3"
              />
            </svg>
          ) : null}
          <div
            className="relative z-[1] grid justify-center"
            style={{ gap, gridTemplateColumns: `repeat(${width}, ${cellSize}px)` }}
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
                  className={`programming-grass-cell relative overflow-visible rounded-[16px]${hasVisited ? ' programming-grass-cell--visited' : ''}`}
                  style={{
                    height: cellSize,
                    width: cellSize,
                  }}
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    {hasObstacle ? (
                      <img
                        alt=""
                        className="programming-asset h-12 w-12"
                        src={status === 'blocked' ? '/programming/stone-hit.svg' : '/programming/stone.svg'}
                      />
                    ) : null}
                    {hasGem ? <img alt="" className="programming-asset h-11 w-11" src="/programming/gem.svg" /> : null}
                    {hasTarget ? (
                      <motion.img
                        alt=""
                        animate={prefersReducedMotion ? { opacity: 1 } : { scale: [1, 1.05, 1] }}
                        className="programming-flag-asset h-12 w-12"
                        src="/programming/flag.svg"
                        transition={{ duration: 2, repeat: prefersReducedMotion ? 0 : Infinity }}
                      />
                    ) : null}
                  </div>
                  {hasBot ? (
                    <div className="absolute inset-1 flex items-center justify-center rounded-[16px]">
                      <div className="programming-xiaoman-scene">
                        <div className="programming-xiaoman-shadow" />
                        <XiaomanSprite emotion={emotion} className="programming-xiaoman-sprite" />
                        <motion.div
                          animate={{ rotate: DIRECTION_ROTATE[bot.direction], x: '-50%' }}
                          className="programming-direction-sign"
                          transition={{
                            damping: 18,
                            duration: prefersReducedMotion ? 0.12 : PROGRAMMING_MOTION.arrowRotateMs / 1000,
                            stiffness: 300,
                            type: 'spring',
                          }}
                        >
                          <span className="programming-direction-sign__pole" />
                          <span className="programming-direction-sign__plate" />
                        </motion.div>
                      </div>
                    </div>
                  ) : null}
                  {status === 'success' && hasTarget ? (
                    <motion.div
                      animate={prefersReducedMotion ? { opacity: 1 } : { scale: [1, 1.08, 1] }}
                      className="absolute inset-0 rounded-[16px] bg-[var(--state-success)]/10"
                      transition={PROGRAMMING_SPRING_POP}
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
