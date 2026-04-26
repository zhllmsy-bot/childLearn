import { arrayMove } from '@dnd-kit/sortable';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  PROGRAMMING_LEVELS,
  type ProgrammingLevel,
} from '../../programming/programmingLevels';
import {
  cloneBlock,
  containsKind,
  createBlockFromTemplate,
  type ProgrammingBlockTemplateId,
} from '../../programming/blocks';
import { buildExecutionFrames } from '../../programming/engine/interpreter';
import { evaluateStars, explainStarRating } from '../../programming/engine/starEvaluator';
import type {
  Block,
  BlockedReason,
  ExecutionStep,
  InterpreterWorld,
} from '../../programming/engine/types';
import { positionKey } from '../../programming/engine/worldOps';
import type { ProgrammingCompletionResult } from './ProgrammingIslandPage';
import type {
  BotViewState,
  PlaybackPace,
  ProgrammingEmotion,
  RunStatus,
} from './programmingViewTypes';
import { BLOCK_DRAWER_ORDER } from './programmingUiConfig';
import { PLAYBACK_DELAY_MS } from './programmingViewTypes';

interface ProgrammingSessionOptions {
  completedLevelIds: string[];
  initialLevelId: string | null;
  onCompleteLevel: (
    level: ProgrammingLevel,
    result: ProgrammingCompletionResult,
  ) => void;
  onRequestHint: (payload: {
    allowedCommands: string[];
    blockedReason?: string;
    currentProgramKinds: string[];
    fallbackHint: string;
    levelId: string;
    levelPrompt: string;
    levelTitle: string;
    remainingGems: number;
    requiredKinds: string[];
    status: string;
  }) => Promise<string | null>;
  onSpeak: (text: string) => void;
  unlockedLevelCount: number;
}

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

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function describeBlocked(reason: BlockedReason | undefined) {
  if (reason === 'missingGem') {
    return '先把星星收起来。';
  }
  if (reason === 'unknownProcedure') {
    return '小路卡还没准备好。';
  }
  if (reason === 'maxSteps') {
    return '再想想呀，路有点长。';
  }
  if (reason === 'obstacle') {
    return '撞到石头啦，换条路。';
  }
  if (reason === 'wall') {
    return '前面没有路啦。';
  }
  return '再想想呀。';
}

function makeStarNote(steps: number, level: ProgrammingLevel) {
  if (!level.starThresholds) {
    return '这条路走通啦。';
  }
  const trace = explainStarRating(steps, level.starThresholds);
  if (trace.stars === 3) {
    return `你用了 ${steps} 步。`;
  }
  return `再少走 ${trace.stepsOverThreeStarTarget} 步会更棒。`;
}

function cloneWithFreshIds(block: Block, makeId: () => string): Block {
  return {
    ...cloneBlock(block),
    id: makeId(),
    body: block.body?.map((item) => cloneWithFreshIds(item, makeId)),
    branchTrue: block.branchTrue?.map((item) => cloneWithFreshIds(item, makeId)),
    branchFalse: block.branchFalse?.map((item) => cloneWithFreshIds(item, makeId)),
  };
}

function collectBlockKinds(blocks: Block[]): string[] {
  return blocks.flatMap((block) => [
    block.kind,
    ...(block.body ? collectBlockKinds(block.body) : []),
    ...(block.branchTrue ? collectBlockKinds(block.branchTrue) : []),
    ...(block.branchFalse ? collectBlockKinds(block.branchFalse) : []),
  ]);
}

export function useProgrammingSession({
  completedLevelIds,
  initialLevelId,
  onCompleteLevel,
  onRequestHint,
  onSpeak,
  unlockedLevelCount,
}: ProgrammingSessionOptions) {
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
  const [pace, setPace] = useState<PlaybackPace>('slow');
  const [emotion, setEmotion] = useState<ProgrammingEmotion>('idle');
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [executionFrames, setExecutionFrames] = useState<ExecutionStep[]>([]);
  const [frameCursor, setFrameCursor] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [hintUsesLeft, setHintUsesLeft] = useState(3);
  const [celebrationStars, setCelebrationStars] = useState(0);
  const [runNote, setRunNote] = useState('');
  const [hoveredTemplateId, setHoveredTemplateId] =
    useState<ProgrammingBlockTemplateId | null>(null);

  const runIdRef = useRef(0);
  const blockCounterRef = useRef(0);
  const playbackActiveRef = useRef(false);
  const timeoutIdsRef = useRef<number[]>([]);

  const completedSet = useMemo(() => new Set(completedLevelIds), [completedLevelIds]);
  const totalLevels = PROGRAMMING_LEVELS.length;
  const visibleUnlockedLevelCount = Math.min(
    totalLevels,
    Math.max(1, unlockedLevelCount, status === 'success' ? levelIndex + 2 : 0),
  );
  const world = useMemo(() => buildWorld(level), [level]);
  const requiredKinds = level.requiredKinds ?? [];
  const canAdvanceLevel = levelIndex + 1 < visibleUnlockedLevelCount;
  const previewFrames = useMemo(
    () => (program.length > 0 ? buildExecutionFrames(program, world) : []),
    [program, world],
  );
  const previewPath = useMemo(
    () => [level.start, ...previewFrames.map((frame) => frame.bot.position)],
    [level.start, previewFrames],
  );
  const sortedAllowedCommands = useMemo(
    () =>
      [...level.allowedCommands].sort(
        (a, b) => BLOCK_DRAWER_ORDER.indexOf(a) - BLOCK_DRAWER_ORDER.indexOf(b),
      ),
    [level.allowedCommands],
  );
  const hasRequiredCommand = requiredKinds.every((kind) => containsKind(program, kind));
  const isPlaybackPrepared =
    status === 'running' && frameCursor > 0 && frameCursor < executionFrames.length;
  const isProgramLocked = isPlaying || isPlaybackPrepared;
  const canAddCommand = !isProgramLocked && program.length < level.maxCommands;

  const clearTimers = useCallback(() => {
    timeoutIdsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    timeoutIdsRef.current = [];
  }, []);

  const schedule = useCallback((callback: () => void, delayMs: number) => {
    const timeoutId = window.setTimeout(callback, delayMs);
    timeoutIdsRef.current.push(timeoutId);
  }, []);

  const setEmotionFor = useCallback(
    (nextEmotion: ProgrammingEmotion, durationMs: number) => {
      clearTimers();
      setEmotion(nextEmotion);
      schedule(() => setEmotion('idle'), durationMs);
    },
    [clearTimers, schedule],
  );

  const speak = useCallback(
    (text: string) => {
      if (!isMuted) {
        onSpeak(text);
      }
    },
    [isMuted, onSpeak],
  );

  const nextBlockId = useCallback(() => {
    blockCounterRef.current += 1;
    return `cmd-${Date.now().toString(36)}-${blockCounterRef.current}`;
  }, []);

  const resetExecutionState = useCallback(
    (nextLevel = level) => {
      runIdRef.current += 1;
      playbackActiveRef.current = false;
      setBot(createStartBot(nextLevel));
      setVisitedKeys(new Set([positionKey(nextLevel.start)]));
      setRemainingGems(nextLevel.gems ?? []);
      setStatus('idle');
      setActiveBlockId(null);
      setExecutionFrames([]);
      setFrameCursor(0);
      setIsPlaying(false);
      setCelebrationStars(0);
      setRunNote('');
      clearTimers();
      setEmotion('idle');
    },
    [clearTimers, level],
  );

  useEffect(() => {
    setProgram([]);
    setHintUsesLeft(3);
    setMessage(level.prompt);
    resetExecutionState(level);
    schedule(() => speak(level.prompt), 200);
    return clearTimers;
  }, [clearTimers, level, resetExecutionState, schedule, speak]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const setNarration = useCallback(
    (text: string, shouldSpeak = false) => {
      setMessage(text);
      if (shouldSpeak) {
        speak(text);
      }
    },
    [speak],
  );

  const insertTemplate = useCallback(
    (templateId: ProgrammingBlockTemplateId, insertIndex = program.length) => {
      if (!canAddCommand) {
        return;
      }
      const block = createBlockFromTemplate(templateId, nextBlockId(), {
        procedureId: level.defaultProcedureId,
      });
      setProgram((current) => {
        const next = [...current];
        next.splice(insertIndex, 0, block);
        return next;
      });
      resetExecutionState();
      setNarration('积木排好啦。');
      setEmotionFor('thinking', 800);
    },
    [canAddCommand, level.defaultProcedureId, nextBlockId, program.length, resetExecutionState, setEmotionFor, setNarration],
  );

  const duplicateBlockToEnd = useCallback(
    (blockId: string) => {
      if (isProgramLocked) {
        return;
      }
      setProgram((current) => {
        const found = current.find((item) => item.id === blockId);
        if (!found) {
          return current;
        }
        return [...current, cloneWithFreshIds(found, nextBlockId)];
      });
      resetExecutionState();
      setNarration('多放了一块。');
      setEmotionFor('thinking', 800);
    },
    [isProgramLocked, nextBlockId, resetExecutionState, setEmotionFor, setNarration],
  );

  const removeBlock = useCallback(
    (blockId: string) => {
      if (isProgramLocked) {
        return;
      }
      setProgram((current) => current.filter((block) => block.id !== blockId));
      resetExecutionState();
      setNarration('少放了一块。');
    },
    [isProgramLocked, resetExecutionState, setNarration],
  );

  const adjustRepeat = useCallback(
    (blockId: string, delta: -1 | 1) => {
      if (isProgramLocked) {
        return;
      }
      setProgram((current) =>
        current.map((block) =>
          block.id === blockId
            ? {
                ...block,
                params: {
                  ...block.params,
                  n: Math.min(8, Math.max(2, (block.params?.n ?? 2) + delta)),
                },
              }
            : block,
        ),
      );
      resetExecutionState();
      setNarration('重复次数改好啦。');
    },
    [isProgramLocked, resetExecutionState, setNarration],
  );

  const reorderProgram = useCallback(
    (nextProgram: Block[]) => {
      if (isProgramLocked) {
        return;
      }
      setProgram(nextProgram.map(cloneBlock));
      resetExecutionState();
      setNarration('顺序调好啦。');
    },
    [isProgramLocked, resetExecutionState, setNarration],
  );

  const moveBlockByKeyboard = useCallback(
    (blockId: string, offset: -1 | 1) => {
      if (isProgramLocked) {
        return;
      }
      const currentIndex = program.findIndex((block) => block.id === blockId);
      const nextIndex = Math.min(Math.max(currentIndex + offset, 0), program.length - 1);
      if (currentIndex < 0 || currentIndex === nextIndex) {
        return;
      }
      reorderProgram(arrayMove(program, currentIndex, nextIndex));
    },
    [isProgramLocked, program, reorderProgram],
  );

  const resetProgram = useCallback(() => {
    if (isProgramLocked) {
      return;
    }
    setProgram([]);
    setHintUsesLeft(3);
    resetExecutionState();
    setNarration(level.prompt);
  }, [isProgramLocked, level.prompt, resetExecutionState, setNarration]);

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
      if (frame.status === 'blocked') {
        setNarration(describeBlocked(frame.blockedReason));
      } else if (frame.status === 'success') {
        setNarration(level.successVoice);
      } else if (frame.command === 'turnLeft' || frame.command === 'turnRight') {
        setNarration('小满转个方向。');
      } else if (frame.command === 'collect') {
        setNarration('星星收好啦。');
      } else {
        setNarration('小满往前走啦。');
      }
      setStatus(frame.status);
    },
    [level.successVoice, setNarration],
  );

  const prepareExecution = useCallback(() => {
    if (program.length === 0) {
      setNarration('先放一块积木呀。', true);
      return null;
    }
    const frames = buildExecutionFrames(program, world);
    setExecutionFrames(frames);
    setFrameCursor(0);
    setBot(createStartBot(level));
    setVisitedKeys(new Set([positionKey(level.start)]));
    setRemainingGems(level.gems ?? []);
    setActiveBlockId(null);
    setCelebrationStars(0);
    setRunNote('');
    setStatus('running');
    setNarration('小满要开始啦。');
    return frames;
  }, [level, program, setNarration, world]);

  const completeExecution = useCallback(
    (frames: ExecutionStep[]) => {
      const finalFrame = frames[frames.length - 1];
      const usedSteps = frames.length;
      const success = finalFrame?.status === 'success' && hasRequiredCommand;
      const finalStars = success
        ? level.starThresholds
          ? evaluateStars(usedSteps, level.starThresholds)
          : 3
        : 1;
      const finalMessage = success
        ? level.successVoice
        : hasRequiredCommand
          ? describeBlocked(finalFrame?.blockedReason)
          : level.requiredCommandMessage ?? '再想想呀。';
      setStatus(success ? 'success' : 'blocked');
      setFrameCursor(frames.length);
      setMessage(finalMessage);
      setRunNote(makeStarNote(usedSteps, level));

      if (success) {
        setEmotion('cheer');
        setCelebrationStars(0);
        [0, 300, 600].forEach((delayMs, index) =>
          schedule(() => setCelebrationStars(index + 1), delayMs),
        );
        schedule(() => setEmotion('idle'), 1500);
        speak(finalMessage);
        onCompleteLevel(level, {
          usedSteps,
          stars: finalStars,
          optimalSteps: level.optimalSteps ?? null,
          requiredCommandSatisfied: hasRequiredCommand,
          blockedReason: finalFrame?.blockedReason,
        });
        return;
      }

      setEmotionFor('thinking', 600);
      speak(finalMessage);
    },
    [hasRequiredCommand, level, onCompleteLevel, schedule, setEmotionFor, speak],
  );

  const startProgram = useCallback(async () => {
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
    setEmotionFor('happy', 300);

    for (let index = startCursor; index < frames.length; index += 1) {
      await wait(PLAYBACK_DELAY_MS[pace]);
      if (!playbackActiveRef.current || runIdRef.current !== runId) {
        return;
      }
      applyFrame(frames[index]);
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
    pace,
    prepareExecution,
    setEmotionFor,
    status,
  ]);

  const stepProgram = useCallback(() => {
    if (isPlaying) {
      return;
    }
    const shouldContinue =
      status === 'running' && executionFrames.length > 0 && frameCursor < executionFrames.length;
    const frames = shouldContinue ? executionFrames : prepareExecution();
    const cursor = shouldContinue ? frameCursor : 0;
    if (!frames || frames.length === 0 || cursor >= frames.length) {
      return;
    }
    setEmotionFor('happy', 300);
    applyFrame(frames[cursor]);
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
    setEmotionFor,
    status,
  ]);

  const useHint = useCallback(() => {
    if (hintUsesLeft <= 0) {
      setNarration('提示用完啦。', true);
      return;
    }
    setHintUsesLeft((current) => Math.max(0, current - 1));
    setNarration('小满正在想办法……', true);
    void onRequestHint({
      allowedCommands: [...level.allowedCommands],
      blockedReason: runNote || undefined,
      currentProgramKinds: collectBlockKinds(program),
      fallbackHint: level.hintVoice,
      levelId: level.id,
      levelPrompt: level.prompt,
      levelTitle: level.title,
      remainingGems: remainingGems.length,
      requiredKinds: [...(level.requiredKinds ?? [])],
      status,
    }).then((hint) => {
      setNarration(hint || level.hintVoice, true);
    });
  }, [
    hintUsesLeft,
    level.allowedCommands,
    level.hintVoice,
    level.id,
    level.prompt,
    level.requiredKinds,
    level.title,
    onRequestHint,
    program,
    remainingGems.length,
    runNote,
    setNarration,
    status,
  ]);

  const goToNextLevel = useCallback(() => {
    if (canAdvanceLevel) {
      setLevelIndex((current) => Math.min(current + 1, PROGRAMMING_LEVELS.length - 1));
    }
  }, [canAdvanceLevel]);

  const progressDots = useMemo(() => {
    const totalDots = 6;
    const filled = Math.max(1, Math.ceil(((levelIndex + 1) / totalLevels) * totalDots));
    return Array.from({ length: totalDots }, (_, index) => index < filled);
  }, [levelIndex, totalLevels]);

  return {
    activeBlockId,
    adjustRepeat,
    bot,
    canAddCommand,
    canAdvanceLevel,
    celebrationStars,
    completedCount: completedSet.size,
    emotion,
    frameCursor,
    goToNextLevel,
    hintUsesLeft,
    hoveredTemplateId,
    insertTemplate,
    isMuted,
    isPlaying,
    isProgramLocked,
    level,
    levelIndex,
    message,
    moveBlockByKeyboard,
    pace,
    previewPath,
    progressDots,
    program,
    remainingGems,
    removeBlock,
    reorderProgram,
    resetProgram,
    runNote,
    setHoveredTemplateId,
    setIsMuted,
    setPace,
    setSettingsOpen,
    settingsOpen,
    sortedAllowedCommands,
    speakMessage: () => speak(message),
    startProgram,
    status,
    stepProgram,
    totalLevels,
    useHint,
    visitedKeys,
    world,
    duplicateBlockToEnd,
  };
}
