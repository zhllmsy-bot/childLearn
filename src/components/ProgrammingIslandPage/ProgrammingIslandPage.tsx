import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  CheckCircle2,
  CornerUpLeft,
  CornerUpRight,
  Flag,
  Lightbulb,
  Lock,
  Play,
  Plus,
  Repeat2,
  RotateCcw,
  Route,
  Sparkles,
  StepForward,
  Trash2,
  Volume2,
} from 'lucide-react';
import {
  PROGRAMMING_LEVELS,
  type ProgrammingCommandId,
  type ProgrammingDirection,
  type ProgrammingLevel,
  type ProgrammingPosition,
} from '../../programming/programmingLevels';
import { buildExecutionFrames } from '../../programming/engine/interpreter';
import type { Block, ExecutionStep } from '../../programming/engine/types';
import { evaluateStars } from '../../programming/engine/starEvaluator';
import { SPRING } from '../../theme/springs';
import { BigButton } from '../_primitives/BigButton';

type RunStatus = 'idle' | 'running' | 'success' | 'blocked';

interface ProgrammingIslandPageProps {
  onBack: () => void;
  onSpeak: (text: string) => void;
  onCompleteLevel: (
    level: ProgrammingLevel,
    result: ProgrammingCompletionResult,
  ) => void;
  completedLevelIds: string[];
  unlockedLevelCount: number;
  initialLevelId: string | null;
}

export interface ProgrammingCompletionResult {
  usedSteps: number;
  stars: 1 | 2 | 3;
  optimalSteps: number | null;
  requiredCommandSatisfied: boolean;
  blockedReason?: 'wall' | 'obstacle';
}

type ExecutionFrame = ExecutionStep;

interface BotState {
  position: ProgrammingPosition;
  direction: ProgrammingDirection;
}

interface RunSummary {
  usedSteps: number;
  stars: 1 | 2 | 3;
}

const BOARD_SIZE = 5;
const BASE_STEP_DELAY_MS = 620;
type PlaybackSpeed = 0.5 | 1 | 2;
const SPEED_OPTIONS: Array<{ label: string; value: PlaybackSpeed }> = [
  { label: '0.5×', value: 0.5 },
  { label: '1×', value: 1 },
  { label: '2×', value: 2 },
];

const DIRECTION_ARROW: Record<ProgrammingDirection, string> = {
  north: '↑',
  east: '→',
  south: '↓',
  west: '←',
};

const DIRECTION_ROTATE: Record<ProgrammingDirection, number> = {
  north: 0,
  east: 90,
  south: 180,
  west: -90,
};

const COMMAND_META: Record<
  ProgrammingCommandId,
  {
    label: string;
    shortLabel: string;
    icon: typeof StepForward;
    tone: string;
  }
> = {
  forward: {
    label: '前进',
    shortLabel: '前进',
    icon: StepForward,
    tone: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  },
  turnLeft: {
    label: '左转',
    shortLabel: '左转',
    icon: CornerUpLeft,
    tone: 'bg-sky-50 text-sky-800 ring-sky-200',
  },
  turnRight: {
    label: '右转',
    shortLabel: '右转',
    icon: CornerUpRight,
    tone: 'bg-amber-50 text-amber-800 ring-amber-200',
  },
  repeatForward2: {
    label: '重复前进 2 次',
    shortLabel: '前进×2',
    icon: Repeat2,
    tone: 'bg-rose-50 text-rose-800 ring-rose-200',
  },
};

function samePosition(left: ProgrammingPosition, right: ProgrammingPosition) {
  return left.x === right.x && left.y === right.y;
}

function positionKey(position: ProgrammingPosition) {
  return `${position.x}:${position.y}`;
}

function createStartBot(level: ProgrammingLevel): BotState {
  return {
    position: level.start,
    direction: level.direction,
  };
}

function getLevelIndexById(levelId: string | null) {
  const index = PROGRAMMING_LEVELS.findIndex((item) => item.id === levelId);
  return index >= 0 ? index : 0;
}

function commandToBlock(command: ProgrammingCommandId, index: number): Block {
  const blockId = `cmd-${index}`;

  if (command === 'repeatForward2') {
    return {
      id: blockId,
      kind: 'repeat',
      params: { n: 2 },
      body: [
        {
          id: `${blockId}:body.0`,
          kind: 'forward',
        },
      ],
    };
  }

  return {
    id: blockId,
    kind: command,
  };
}

function buildProgramBlocks(program: ProgrammingCommandId[]): Block[] {
  return program.map((command, index) => commandToBlock(command, index));
}

function describeExecutionMessage(
  frame: ExecutionFrame,
  level: ProgrammingLevel,
  hasRequiredCommand: boolean,
): string {
  if (frame.status === 'blocked') {
    return level.hintVoice;
  }

  if (frame.status === 'success') {
    return hasRequiredCommand ? level.successVoice : level.requiredCommandMessage ?? level.successVoice;
  }

  if (frame.command === 'turnLeft' || frame.command === 'turnRight') {
    return '小满换了一个方向。';
  }

  return '小满照着程序走了一步。';
}

function formatStarSummary(stars: 1 | 2 | 3) {
  const filled = '★★★★★'.slice(0, stars);
  const empty = '☆☆☆'.slice(stars);
  return `${filled}${empty}`;
}

function computeStepDelay(speed: PlaybackSpeed) {
  return Math.round(BASE_STEP_DELAY_MS / speed);
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function LightHeroModel({
  direction,
  status,
}: {
  direction: ProgrammingDirection;
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

function CommandButton({
  command,
  onAdd,
  disabled,
}: {
  command: ProgrammingCommandId;
  onAdd: (command: ProgrammingCommandId) => void;
  disabled: boolean;
}) {
  const meta = COMMAND_META[command];
  const Icon = meta.icon;

  return (
    <motion.button
      type="button"
      whileHover={disabled ? undefined : { y: -3 }}
      whileTap={disabled ? undefined : { scale: 0.96 }}
      transition={SPRING.bounce}
      disabled={disabled}
      onClick={() => onAdd(command)}
      className={`flex min-h-20 items-center justify-between gap-3 rounded-[1.25rem] px-4 text-left text-lg font-black shadow-sm ring-1 disabled:opacity-45 ${meta.tone}`}
    >
      <span className="flex items-center gap-3">
        <Icon size={28} strokeWidth={3.2} />
        {meta.label}
      </span>
      <Plus size={22} strokeWidth={3.2} />
    </motion.button>
  );
}

function ProgramStep({
  command,
  index,
  disabled,
  onRemove,
  active,
}: {
  command: ProgrammingCommandId;
  index: number;
  disabled: boolean;
  onRemove: (index: number) => void;
  active: boolean;
}) {
  const meta = COMMAND_META[command];
  const Icon = meta.icon;

  return (
    <motion.button
      type="button"
      layout
      whileTap={disabled ? undefined : { scale: 0.95 }}
      disabled={disabled}
      onClick={() => onRemove(index)}
      aria-label={`删除第 ${index + 1} 步 ${meta.shortLabel}`}
      className={`inline-flex h-14 shrink-0 items-center gap-2 rounded-2xl px-4 text-base font-black shadow-sm ring-1 ${
        active ? 'ring-4 ring-amber-400 scale-105' : ''
      } ${meta.tone}`}
    >
      <span className="rounded-full bg-white/75 px-2 py-0.5 text-sm">{index + 1}</span>
      <Icon size={20} strokeWidth={3.2} />
      {meta.shortLabel}
      <Trash2 size={18} strokeWidth={3.2} />
    </motion.button>
  );
}

export function ProgrammingIslandPage({
  onBack,
  onSpeak,
  onCompleteLevel,
  completedLevelIds,
  unlockedLevelCount,
  initialLevelId,
}: ProgrammingIslandPageProps) {
  const [levelIndex, setLevelIndex] = useState(() => getLevelIndexById(initialLevelId));
  const level = PROGRAMMING_LEVELS[levelIndex];
  const [program, setProgram] = useState<ProgrammingCommandId[]>([]);
  const [bot, setBot] = useState<BotState>(() => createStartBot(level));
  const [visitedKeys, setVisitedKeys] = useState<Set<string>>(
    () => new Set([positionKey(level.start)]),
  );
  const [status, setStatus] = useState<RunStatus>('idle');
  const [message, setMessage] = useState(level.prompt);
  const [playbackSpeed, setPlaybackSpeed] = useState<PlaybackSpeed>(1);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [runSummary, setRunSummary] = useState<RunSummary | null>(null);
  const runIdRef = useRef(0);

  const isRunning = status === 'running';
  const canAddCommand = !isRunning && program.length < level.maxCommands;
  const completedSet = useMemo(
    () => new Set(completedLevelIds),
    [completedLevelIds],
  );
  const totalLevels = PROGRAMMING_LEVELS.length;
  const completedCount = PROGRAMMING_LEVELS.filter((item) =>
    completedSet.has(item.id),
  ).length;
  const visibleUnlockedLevelCount = Math.min(
    totalLevels,
    Math.max(
      1,
      unlockedLevelCount,
      status === 'success' ? levelIndex + 2 : 0,
    ),
  );
  const progressLabel = `${levelIndex + 1}/${totalLevels}`;
  const isCurrentLevelCompleted = completedSet.has(level.id);
  const programBlocks = useMemo(() => buildProgramBlocks(program), [program]);
  const hasRequiredCommand =
    !level.requiredCommand || program.includes(level.requiredCommand);
  const world = useMemo(
    () => ({
      width: BOARD_SIZE,
      height: BOARD_SIZE,
      start: level.start,
      direction: level.direction,
      target: level.target,
      obstacles: level.obstacles,
    }),
    [level],
  );
  const activeProgramStepIndex = useMemo(() => {
    if (!activeBlockId) {
      return null;
    }

    const match = programBlocks.findIndex(
      (block) =>
        block.id === activeBlockId || activeBlockId.startsWith(`${block.id}:`),
    );
    return match >= 0 ? match : null;
  }, [activeBlockId, programBlocks]);
  const currentStarThresholds = level.starThresholds ?? null;
  const evaluateRunStars = useCallback(
    (steps: number): 1 | 2 | 3 => {
      if (!currentStarThresholds || !Number.isFinite(steps) || steps < 0) {
        return 1;
      }

      return evaluateStars(Math.round(steps), currentStarThresholds);
    },
    [currentStarThresholds],
  );

  const resetLevelState = useCallback(
    (nextLevel: ProgrammingLevel) => {
      runIdRef.current += 1;
      setProgram([]);
      setBot(createStartBot(nextLevel));
      setVisitedKeys(new Set([positionKey(nextLevel.start)]));
      setStatus('idle');
      setActiveBlockId(null);
      setRunSummary(null);
      setMessage(nextLevel.prompt);
    },
    [],
  );

  useEffect(() => {
    resetLevelState(level);
    const timeoutId = window.setTimeout(
      () => onSpeak(`${level.prompt} ${level.guide}`),
      260,
    );
    return () => window.clearTimeout(timeoutId);
  }, [level, onSpeak, resetLevelState]);

  const obstacleKeys = useMemo(
    () => new Set(level.obstacles.map(positionKey)),
    [level.obstacles],
  );

  const addCommand = useCallback(
    (command: ProgrammingCommandId) => {
      if (!canAddCommand) {
        return;
      }

      setProgram((current) => [...current, command]);
      setStatus('idle');
      setActiveBlockId(null);
      setMessage('很好，把下一块也放进程序里。');
    },
    [canAddCommand],
  );

  const removeCommand = useCallback((index: number) => {
    if (isRunning) {
      return;
    }

    setProgram((current) => current.filter((_, itemIndex) => itemIndex !== index));
    setStatus('idle');
    setActiveBlockId(null);
    setMessage('程序改好了，可以再运行一次。');
  }, [isRunning]);

  const clearProgram = useCallback(() => {
    if (isRunning) {
      return;
    }

    setProgram([]);
    setBot(createStartBot(level));
    setVisitedKeys(new Set([positionKey(level.start)]));
    setStatus('idle');
    setActiveBlockId(null);
    setRunSummary(null);
    setMessage(level.prompt);
  }, [isRunning, level]);

  const runProgram = useCallback(async () => {
    if (isRunning) {
      return;
    }

    if (program.length === 0) {
      setMessage('先放一块指令，再让小满运行。');
      onSpeak('先放一块指令，再让小满运行。');
      return;
    }

    const runId = runIdRef.current + 1;
    runIdRef.current = runId;
    setStatus('running');
    setActiveBlockId(null);
    setRunSummary(null);
    setBot(createStartBot(level));
    setVisitedKeys(new Set([positionKey(level.start)]));
    setMessage('小满开始照着程序走。');

    const frames = buildExecutionFrames(programBlocks, world);
    const finalFrame = frames[frames.length - 1];
    const usedSteps = frames.length;
    const finalStars = finalFrame?.status === 'success' && hasRequiredCommand
      ? evaluateRunStars(usedSteps)
      : 1;

    for (const frame of frames) {
      await wait(computeStepDelay(playbackSpeed));
      if (runIdRef.current !== runId) {
        return;
      }

      setBot({ position: frame.bot.position, direction: frame.bot.direction });
      setActiveBlockId(frame.activeBlockId);
      setVisitedKeys((current) => {
        const next = new Set(current);
        next.add(positionKey(frame.bot.position));
        return next;
      });
      setMessage(describeExecutionMessage(frame, level, hasRequiredCommand));
      setStatus(frame.status);
    }

    const finalStatus =
      finalFrame?.status === 'success' && hasRequiredCommand ? 'success' : 'blocked';
    const finalMessage =
      finalStatus === 'success'
        ? level.successVoice
        : hasRequiredCommand
          ? level.hintVoice
          : level.requiredCommandMessage ?? level.successVoice;

    setStatus(finalStatus);
    setActiveBlockId(finalFrame?.activeBlockId ?? null);
    setMessage(finalMessage);

    if (finalStatus === 'success') {
      setRunSummary({ usedSteps, stars: finalStars });
      onSpeak(level.successVoice);
      onCompleteLevel(level, {
        usedSteps,
        stars: finalStars,
        optimalSteps: level.optimalSteps ?? null,
        requiredCommandSatisfied: hasRequiredCommand,
        blockedReason: finalFrame?.blockedReason,
      });
      return;
    }

    setRunSummary(null);
    onSpeak(finalMessage);
  }, [
    hasRequiredCommand,
    evaluateRunStars,
    isRunning,
    level,
    onCompleteLevel,
    onSpeak,
    playbackSpeed,
    programBlocks,
    world,
  ]);

  const goToLevel = useCallback(
    (nextIndex: number) => {
      const boundedIndex = Math.min(
        Math.max(nextIndex, 0),
        PROGRAMMING_LEVELS.length - 1,
      );
      if (boundedIndex >= visibleUnlockedLevelCount) {
        const lockedMessage = '先完成前一关，下一关就会亮起来。';
        setMessage(lockedMessage);
        onSpeak(lockedMessage);
        return;
      }

      setLevelIndex(boundedIndex);
    },
    [onSpeak, visibleUnlockedLevelCount],
  );

  const boardCells = useMemo(
    () =>
      Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, index) => ({
        x: index % BOARD_SIZE,
        y: Math.floor(index / BOARD_SIZE),
      })),
    [],
  );

  return (
    <motion.section
      key="programming"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={SPRING.smooth}
      className="relative z-10 mx-auto w-full max-w-7xl pb-24"
    >
      <section className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-white/88 p-5 shadow-[0_24px_80px_rgba(15,118,110,0.14)] ring-1 ring-emerald-900/5 backdrop-blur-xl md:p-6">
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex h-14 items-center gap-2 rounded-2xl bg-white px-4 text-base font-black text-emerald-900 shadow-sm ring-1 ring-emerald-100"
          >
            <ArrowLeft size={22} strokeWidth={3.2} />
            回首页
          </button>
          <div className="min-w-0 flex-1 text-center">
            <div className="text-sm font-black text-emerald-700/80">
              编程岛 · {level.concept}
            </div>
            <h1 className="truncate text-4xl font-black leading-tight text-emerald-950">
              {level.title}
            </h1>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-base font-black text-emerald-800 ring-1 ring-emerald-100">
            <Route size={20} strokeWidth={3.2} />
            {progressLabel} · 已通关 {completedCount}/{totalLevels}
          </div>
        </div>

        <div className="relative mt-5 grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[2rem] bg-gradient-to-br from-sky-50 via-emerald-50 to-lime-50 p-4 ring-1 ring-emerald-200/70">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-sm font-black text-emerald-700/85">
                  <Sparkles size={18} strokeWidth={3} />
                  任务
                </div>
                <h2 className="mt-2 text-3xl font-black leading-tight text-emerald-950">
                  {level.prompt}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onSpeak(level.guide)}
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-emerald-800 shadow-sm ring-1 ring-emerald-100"
                aria-label="播放编程提示"
              >
                <Volume2 size={26} strokeWidth={3.2} />
              </button>
            </div>

            <div className="mt-4 grid max-w-[34rem] grid-cols-5 gap-2">
              {boardCells.map((cell) => {
                const key = positionKey(cell);
                const hasBot = samePosition(cell, bot.position);
                const hasTarget = samePosition(cell, level.target);
                const hasObstacle = obstacleKeys.has(key);
                const hasVisited = visitedKeys.has(key);

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

              <div
                className={`mt-4 rounded-[1.5rem] p-4 text-xl font-black leading-snug ring-1 ${
                  status === 'success'
                    ? 'bg-emerald-50 text-emerald-900 ring-emerald-200'
                    : status === 'blocked'
                    ? 'bg-amber-50 text-amber-900 ring-amber-200'
                    : 'bg-white/78 text-emerald-950 ring-white'
                }`}
              >
                {message}
              </div>
              {runSummary ? (
                <div className="mt-3 rounded-[1.5rem] bg-emerald-50 px-4 py-3 text-base font-black text-emerald-800 ring-1 ring-emerald-100">
                  本次运行 {runSummary.usedSteps} 步，成绩：{formatStarSummary(runSummary.stars)}
                  {level.optimalSteps ? `（最优 ${level.optimalSteps} 步）` : ''}
                </div>
              ) : null}
            </div>

          <div className="grid min-w-0 gap-4">
            <div className="rounded-[2rem] bg-white/88 p-5 shadow-sm ring-1 ring-emerald-900/10">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-black text-emerald-700/80">
                    指令积木
                  </div>
                  <h2 className="text-4xl font-black text-emerald-950">点一下加入程序</h2>
                </div>
                <div className="rounded-full bg-emerald-50 px-4 py-2 text-base font-black text-emerald-800 ring-1 ring-emerald-100">
                  {program.length}/{level.maxCommands}
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {level.allowedCommands.map((command) => (
                  <CommandButton
                    key={command}
                    command={command}
                    onAdd={addCommand}
                    disabled={!canAddCommand}
                  />
                ))}
              </div>

              {level.requiredCommand ? (
                <div className="mt-4 flex items-center gap-3 rounded-[1.5rem] bg-rose-50 p-4 text-base font-black text-rose-800 ring-1 ring-rose-200">
                  <Repeat2 size={24} strokeWidth={3.2} />
                  本关目标：用一次 {COMMAND_META[level.requiredCommand].label}
                </div>
              ) : null}
            </div>

            <div className="rounded-[2rem] bg-white/88 p-5 shadow-sm ring-1 ring-emerald-900/10">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-black text-emerald-700/80">
                    程序
                  </div>
                  <h2 className="text-4xl font-black text-emerald-950">运行顺序</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={clearProgram}
                    disabled={isRunning || program.length === 0}
                    className="inline-flex h-12 items-center gap-2 rounded-2xl bg-slate-50 px-4 text-base font-black text-slate-700 shadow-sm ring-1 ring-slate-200 disabled:opacity-45"
                  >
                    <RotateCcw size={20} strokeWidth={3.2} />
                    重来
                  </button>
                  <button
                    type="button"
                    onClick={() => onSpeak(level.hintVoice)}
                    className="inline-flex h-12 items-center gap-2 rounded-2xl bg-amber-50 px-4 text-base font-black text-amber-800 shadow-sm ring-1 ring-amber-200"
                  >
                    <Lightbulb size={20} strokeWidth={3.2} />
                    提示
                  </button>
                </div>
              </div>

              <div className="mt-5 min-h-24 rounded-[1.5rem] bg-emerald-50/70 p-3 ring-1 ring-emerald-100">
                {program.length === 0 ? (
                  <div className="flex h-20 items-center justify-center text-lg font-black text-emerald-800/60">
                    指令会排在这里
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {program.map((command, index) => (
                      <ProgramStep
                        key={`${command}-${index}`}
                        command={command}
                        index={index}
                        active={activeProgramStepIndex === index}
                        disabled={isRunning}
                        onRemove={removeCommand}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
                <div className="grid grid-cols-3 gap-2">
                  {SPEED_OPTIONS.map((option) => (
                    <button
                      type="button"
                      key={option.value}
                      onClick={() => setPlaybackSpeed(option.value)}
                      disabled={isRunning}
                      className={`inline-flex h-12 items-center justify-center rounded-xl border px-3 text-base font-black shadow-sm transition ${
                        playbackSpeed === option.value
                          ? 'border-emerald-400 bg-emerald-600 text-white ring-2 ring-emerald-300'
                          : 'border-emerald-100 bg-white text-emerald-800'
                      } disabled:opacity-45`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <BigButton
                  type="button"
                  tone="success"
                  disabled={isRunning}
                  onClick={runProgram}
                  className="flex items-center justify-center gap-3 rounded-[1.5rem] bg-emerald-600 px-6 py-4 text-2xl text-white shadow-lg shadow-emerald-900/15 ring-white"
                >
                  <Play size={30} fill="currentColor" strokeWidth={3.2} />
                  运行
                </BigButton>
                <button
                  type="button"
                  onClick={() => goToLevel(levelIndex + 1)}
                  disabled={
                    (!isCurrentLevelCompleted && status !== 'success') ||
                    levelIndex >= PROGRAMMING_LEVELS.length - 1 ||
                    isRunning
                  }
                  className="inline-flex min-h-16 items-center justify-center gap-2 rounded-[1.5rem] bg-white px-5 text-lg font-black text-emerald-800 shadow-sm ring-1 ring-emerald-100 disabled:opacity-45"
                >
                  <CheckCircle2 size={22} strokeWidth={3.2} />
                  下一关
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-4 rounded-[2rem] border border-white/70 bg-white/90 p-5 shadow-sm ring-1 ring-emerald-900/10 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-black text-emerald-700/80">关卡</div>
            <h2 className="text-4xl font-black text-emerald-950">编程概念</h2>
          </div>
          <div className="rounded-full bg-emerald-50 px-4 py-2 text-base font-black text-emerald-800 ring-1 ring-emerald-100">
            顺序 · 转向 · 调试 · 重复
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PROGRAMMING_LEVELS.map((item, index) => {
            const isActive = index === levelIndex;
            const isCompleted = completedSet.has(item.id);
            const isLocked = index >= visibleUnlockedLevelCount;

            return (
              <motion.button
                key={item.id}
                type="button"
                whileHover={isLocked ? undefined : { y: -4 }}
                whileTap={isLocked ? undefined : { scale: 0.97 }}
                transition={SPRING.bounce}
                onClick={() => goToLevel(index)}
                aria-disabled={isLocked}
                className={`min-h-32 rounded-[1.5rem] p-4 text-left shadow-sm ring-2 ${
                  isActive
                    ? 'bg-emerald-600 text-white ring-emerald-300'
                    : isLocked
                      ? 'bg-slate-50/82 text-slate-500 ring-slate-100'
                      : isCompleted
                        ? 'bg-emerald-50 text-emerald-950 ring-emerald-200'
                        : 'bg-white/82 text-emerald-950 ring-white'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-black opacity-75">
                    第 {index + 1} 关
                  </div>
                  {isLocked ? (
                    <Lock size={20} strokeWidth={3.2} />
                  ) : isCompleted ? (
                    <CheckCircle2 size={20} strokeWidth={3.2} />
                  ) : (
                    <Route size={20} strokeWidth={3.2} />
                  )}
                </div>
                <div className="mt-2 text-2xl font-black">{item.title}</div>
                <div className="mt-3 inline-flex rounded-full bg-white/30 px-3 py-1 text-sm font-black ring-1 ring-current/20">
                  {isLocked ? '未解锁' : item.concept}
                </div>
              </motion.button>
            );
          })}
        </div>
      </section>
    </motion.section>
  );
}
