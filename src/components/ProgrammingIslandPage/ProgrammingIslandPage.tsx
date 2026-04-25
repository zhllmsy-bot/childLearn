import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  CheckCircle2,
  Lightbulb,
  Route,
  Sparkles,
  Volume2,
} from 'lucide-react';
import {
  PROGRAMMING_LEVELS,
  type ProgrammingLevel,
} from '../../programming/programmingLevels';
import { buildExecutionFrames } from '../../programming/engine/interpreter';
import type { Block, BlockedReason, ExecutionStep, InterpreterWorld } from '../../programming/engine/types';
import { cloneBlock, containsKind, createBlockFromTemplate, type ProgrammingBlockTemplateId } from '../../programming/blocks';
import { evaluateStars } from '../../programming/engine/starEvaluator';
import { positionKey } from '../../programming/engine/worldOps';
import { SPRING } from '../../theme/springs';
import { ProgrammingBoard } from './ProgrammingBoard';
import { ProgrammingEditor } from './ProgrammingEditor';
import { ProgrammingLevelPicker } from './ProgrammingLevelPicker';
import type { BotViewState, PlaybackSpeed, RunStatus } from './programmingViewTypes';

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
  blockedReason?: BlockedReason;
}

interface RunSummary {
  usedSteps: number;
  stars: 1 | 2 | 3;
}

const BASE_STEP_DELAY_MS = 620;

function createStartBot(level: ProgrammingLevel): BotViewState {
  return {
    position: level.start,
    direction: level.direction,
  };
}

function getLevelIndexById(levelId: string | null) {
  const index = PROGRAMMING_LEVELS.findIndex((item) => item.id === levelId);
  return index >= 0 ? index : 0;
}

function formatStarSummary(stars: 1 | 2 | 3) {
  const filled = '★★★'.slice(0, stars);
  const empty = '☆☆☆'.slice(stars);
  return `${filled}${empty}`;
}

function computeStepDelay(speed: PlaybackSpeed) {
  return Math.round(BASE_STEP_DELAY_MS / speed);
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function describeBlocked(reason: BlockedReason | undefined, level: ProgrammingLevel) {
  if (reason === 'missingGem') {
    return '这里没有能量星，先走到星星格子再收集。';
  }
  if (reason === 'unknownProcedure') {
    return '这张小路卡还没有准备好。';
  }
  if (reason === 'maxSteps') {
    return '小满走太久了，先暂停，看看循环里是不是少了出口。';
  }
  return level.hintVoice;
}

function describeExecutionMessage(
  frame: ExecutionStep,
  level: ProgrammingLevel,
  hasRequiredCommand: boolean,
) {
  if (frame.status === 'blocked') {
    return describeBlocked(frame.blockedReason, level);
  }

  if (frame.status === 'success') {
    return hasRequiredCommand ? level.successVoice : level.requiredCommandMessage ?? level.successVoice;
  }

  if (frame.command === 'turnLeft' || frame.command === 'turnRight') {
    return '小满换了一个方向。';
  }
  if (frame.command === 'collect') {
    return '能量星收进口袋了。';
  }
  if (frame.command === 'jump') {
    return '小满跳过了一格。';
  }

  return '小满照着程序走了一步。';
}

function buildWorld(level: ProgrammingLevel): InterpreterWorld {
  return {
    width: level.width ?? 5,
    height: level.height ?? 5,
    start: level.start,
    direction: level.direction,
    target: level.target,
    obstacles: level.obstacles,
    gems: level.gems ?? [],
    requiresAllGems: level.requiresAllGems,
    procedures: level.procedures,
    maxSteps: 120,
  };
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
  const [program, setProgram] = useState<Block[]>([]);
  const [bot, setBot] = useState<BotViewState>(() => createStartBot(level));
  const [visitedKeys, setVisitedKeys] = useState<Set<string>>(
    () => new Set([positionKey(level.start)]),
  );
  const [remainingGems, setRemainingGems] = useState(() => level.gems ?? []);
  const [status, setStatus] = useState<RunStatus>('idle');
  const [message, setMessage] = useState(level.prompt);
  const [playbackSpeed, setPlaybackSpeed] = useState<PlaybackSpeed>(1);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [executionFrames, setExecutionFrames] = useState<ExecutionStep[]>([]);
  const [frameCursor, setFrameCursor] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [runSummary, setRunSummary] = useState<RunSummary | null>(null);
  const runIdRef = useRef(0);
  const blockCounterRef = useRef(0);
  const playbackActiveRef = useRef(false);

  const completedSet = useMemo(() => new Set(completedLevelIds), [completedLevelIds]);
  const totalLevels = PROGRAMMING_LEVELS.length;
  const completedCount = PROGRAMMING_LEVELS.filter((item) =>
    completedSet.has(item.id),
  ).length;
  const visibleUnlockedLevelCount = Math.min(
    totalLevels,
    Math.max(1, unlockedLevelCount, status === 'success' ? levelIndex + 2 : 0),
  );
  const progressLabel = `${levelIndex + 1}/${totalLevels}`;
  const isCurrentLevelCompleted = completedSet.has(level.id);
  const requiredKinds = level.requiredKinds ?? [];
  const hasRequiredCommand = requiredKinds.every((kind) => containsKind(program, kind));
  const world = useMemo(() => buildWorld(level), [level]);
  const progress =
    executionFrames.length > 0
      ? { current: frameCursor, total: executionFrames.length }
      : null;
  const isPlaybackPrepared =
    status === 'running' && frameCursor > 0 && frameCursor < executionFrames.length;
  const isProgramLocked = isPlaying || isPlaybackPrepared;
  const canAddCommand = !isProgramLocked && program.length < level.maxCommands;

  const evaluateRunStars = useCallback(
    (steps: number): 1 | 2 | 3 => {
      if (!level.starThresholds || !Number.isFinite(steps) || steps < 0) {
        return 1;
      }

      return evaluateStars(Math.round(steps), level.starThresholds);
    },
    [level.starThresholds],
  );

  const resetLevelState = useCallback(
    (nextLevel: ProgrammingLevel) => {
      runIdRef.current += 1;
      playbackActiveRef.current = false;
      setProgram([]);
      setBot(createStartBot(nextLevel));
      setVisitedKeys(new Set([positionKey(nextLevel.start)]));
      setRemainingGems(nextLevel.gems ?? []);
      setStatus('idle');
      setActiveBlockId(null);
      setExecutionFrames([]);
      setFrameCursor(0);
      setIsPlaying(false);
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

  const resetExecutionState = useCallback(() => {
    runIdRef.current += 1;
    playbackActiveRef.current = false;
    setBot(createStartBot(level));
    setVisitedKeys(new Set([positionKey(level.start)]));
    setRemainingGems(level.gems ?? []);
    setStatus('idle');
    setActiveBlockId(null);
    setExecutionFrames([]);
    setFrameCursor(0);
    setIsPlaying(false);
    setRunSummary(null);
  }, [level]);

  const addTemplate = useCallback(
    (templateId: ProgrammingBlockTemplateId) => {
      if (!canAddCommand) {
        return;
      }

      blockCounterRef.current += 1;
      const block = createBlockFromTemplate(
        templateId,
        `cmd-${Date.now().toString(36)}-${blockCounterRef.current}`,
        { procedureId: level.defaultProcedureId },
      );
      setProgram((current) => [...current, block]);
      resetExecutionState();
      setMessage('很好，把下一块也放进程序里。');
    },
    [canAddCommand, level.defaultProcedureId, resetExecutionState],
  );

  const removeBlock = useCallback(
    (blockId: string) => {
      if (isProgramLocked) {
        return;
      }

      setProgram((current) => current.filter((block) => block.id !== blockId));
      resetExecutionState();
      setMessage('程序改好了，可以再运行一次。');
    },
    [isProgramLocked, resetExecutionState],
  );

  const reorderProgram = useCallback(
    (nextProgram: Block[]) => {
      if (isProgramLocked) {
        return;
      }

      setProgram(nextProgram.map(cloneBlock));
      resetExecutionState();
      setMessage('顺序调好了，可以再运行一次。');
    },
    [isProgramLocked, resetExecutionState],
  );

  const updateBlock = useCallback(
    (blockId: string, updater: (block: Block) => Block) => {
      if (isProgramLocked) {
        return;
      }

      setProgram((current) =>
        current.map((block) => (block.id === blockId ? updater(block) : block)),
      );
      resetExecutionState();
      setMessage('参数调好了，可以运行看看。');
    },
    [isProgramLocked, resetExecutionState],
  );

  const clearProgram = useCallback(() => {
    if (isProgramLocked) {
      return;
    }

    setProgram([]);
    resetExecutionState();
    setMessage(level.prompt);
  }, [isProgramLocked, level.prompt, resetExecutionState]);

  const applyFrame = useCallback(
    (frame: ExecutionStep) => {
      setBot({ position: frame.bot.position, direction: frame.bot.direction });
      setRemainingGems(frame.world.remainingGems);
      setActiveBlockId(frame.activeBlockId);
      setVisitedKeys((current) => {
        const next = new Set(current);
        next.add(positionKey(frame.bot.position));
        return next;
      });
      setMessage(describeExecutionMessage(frame, level, hasRequiredCommand));
      setStatus(frame.status);
    },
    [hasRequiredCommand, level],
  );

  const prepareExecution = useCallback(() => {
    if (program.length === 0) {
      const emptyMessage = '先放一块指令，再让小满运行。';
      setMessage(emptyMessage);
      onSpeak(emptyMessage);
      return null;
    }

    const frames = buildExecutionFrames(program, world);
    setExecutionFrames(frames);
    setFrameCursor(0);
    setBot(createStartBot(level));
    setVisitedKeys(new Set([positionKey(level.start)]));
    setRemainingGems(level.gems ?? []);
    setActiveBlockId(null);
    setRunSummary(null);
    setStatus('running');
    setMessage('小满开始照着程序走。');
    return frames;
  }, [level, onSpeak, program, world]);

  const completeExecution = useCallback(
    (frames: ExecutionStep[]) => {
      const finalFrame = frames[frames.length - 1];
      const usedSteps = frames.length;
      const finalStars =
        finalFrame?.status === 'success' && hasRequiredCommand
          ? evaluateRunStars(usedSteps)
          : 1;
      const finalStatus =
        finalFrame?.status === 'success' && hasRequiredCommand ? 'success' : 'blocked';
      const finalMessage =
        finalStatus === 'success'
          ? level.successVoice
          : hasRequiredCommand
            ? describeBlocked(finalFrame?.blockedReason, level)
            : level.requiredCommandMessage ?? level.successVoice;

      setStatus(finalStatus);
      setActiveBlockId(finalFrame?.activeBlockId ?? null);
      setMessage(finalMessage);
      setFrameCursor(frames.length);

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
    },
    [evaluateRunStars, hasRequiredCommand, level, onCompleteLevel, onSpeak],
  );

  const runProgram = useCallback(async () => {
    if (isPlaying) {
      return;
    }

    const shouldResume =
      status === 'running' &&
      executionFrames.length > 0 &&
      frameCursor > 0 &&
      frameCursor < executionFrames.length;
    const frames = shouldResume ? executionFrames : prepareExecution();
    if (!frames || frames.length === 0) {
      return;
    }

    const startCursor = shouldResume ? frameCursor : 0;
    const runId = runIdRef.current + 1;
    runIdRef.current = runId;
    playbackActiveRef.current = true;
    setIsPlaying(true);

    for (let index = startCursor; index < frames.length; index += 1) {
      await wait(computeStepDelay(playbackSpeed));
      if (!playbackActiveRef.current || runIdRef.current !== runId) {
        return;
      }

      const frame = frames[index];
      applyFrame(frame);
      setFrameCursor(index + 1);
    }

    playbackActiveRef.current = false;
    setIsPlaying(false);
    completeExecution(frames);
  }, [
    applyFrame,
    completeExecution,
    executionFrames,
    frameCursor,
    isPlaying,
    playbackSpeed,
    prepareExecution,
    status,
  ]);

  const pauseProgram = useCallback(() => {
    playbackActiveRef.current = false;
    runIdRef.current += 1;
    setIsPlaying(false);
    setMessage('已暂停。可以单步看下一块，或继续运行。');
  }, []);

  const stepProgram = useCallback(() => {
    if (isPlaying) {
      return;
    }

    const shouldContinue =
      status === 'running' &&
      executionFrames.length > 0 &&
      frameCursor < executionFrames.length;
    const frames = shouldContinue ? executionFrames : prepareExecution();
    const cursor = shouldContinue ? frameCursor : 0;
    if (!frames || frames.length === 0 || cursor >= frames.length) {
      return;
    }

    const frame = frames[cursor];
    applyFrame(frame);
    const nextCursor = cursor + 1;
    setFrameCursor(nextCursor);
    if (nextCursor >= frames.length) {
      completeExecution(frames);
    }
  }, [
    applyFrame,
    completeExecution,
    executionFrames,
    frameCursor,
    isPlaying,
    prepareExecution,
    status,
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

            <ProgrammingBoard
              level={level}
              bot={bot}
              status={status}
              visitedKeys={visitedKeys}
              remainingGems={remainingGems}
            />

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

          <ProgrammingEditor
            allowedCommands={level.allowedCommands}
            program={program}
            activeBlockId={activeBlockId}
            locked={isProgramLocked}
            canAddCommand={canAddCommand}
            requiredKinds={requiredKinds}
            playbackSpeed={playbackSpeed}
            isPlaying={isPlaying}
            progress={progress}
            onAddTemplate={addTemplate}
            onRemoveBlock={removeBlock}
            onReorderProgram={reorderProgram}
            onUpdateBlock={updateBlock}
            onClearProgram={clearProgram}
            onRunProgram={runProgram}
            onPauseProgram={pauseProgram}
            onStepProgram={stepProgram}
            onSpeedChange={setPlaybackSpeed}
            onSpeakHint={() => onSpeak(level.hintVoice)}
          />
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={() => goToLevel(levelIndex + 1)}
            disabled={
              (!isCurrentLevelCompleted && status !== 'success') ||
              levelIndex >= PROGRAMMING_LEVELS.length - 1 ||
              isPlaying
            }
            className="inline-flex min-h-16 items-center justify-center gap-2 rounded-[1.5rem] bg-white px-5 text-lg font-black text-emerald-800 shadow-sm ring-1 ring-emerald-100 disabled:opacity-45"
          >
            <CheckCircle2 size={22} strokeWidth={3.2} />
            下一关
          </button>
        </div>
      </section>

      <ProgrammingLevelPicker
        levelIndex={levelIndex}
        visibleUnlockedLevelCount={visibleUnlockedLevelCount}
        completedLevelIds={completedSet}
        onGoToLevel={goToLevel}
      />
    </motion.section>
  );
}
