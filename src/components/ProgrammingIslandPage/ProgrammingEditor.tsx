import { memo, useMemo } from 'react';
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  CornerUpLeft,
  CornerUpRight,
  Footprints,
  Gem,
  GripVertical,
  GitBranch,
  MoveRight,
  Pause,
  Play,
  Plus,
  Repeat2,
  RotateCcw,
  StepForward,
  Trash2,
  Waypoints,
} from 'lucide-react';
import type { Block, CommandKind } from '../../programming/engine/types';
import type { ProgrammingBlockTemplateId } from '../../programming/blocks';
import {
  PROGRAMMING_BLOCK_TEMPLATES,
  containsKind,
} from '../../programming/blocks';
import { SPRING } from '../../theme/springs';
import { BigButton } from '../_primitives/BigButton';
import { motion } from 'framer-motion';
import { SPEED_OPTIONS, type PlaybackSpeed } from './programmingViewTypes';

const COMMAND_ICON: Record<CommandKind, typeof StepForward> = {
  forward: StepForward,
  turnLeft: CornerUpLeft,
  turnRight: CornerUpRight,
  jump: Footprints,
  collect: Gem,
  repeat: Repeat2,
  procCall: Waypoints,
  ifPath: GitBranch,
  ifGem: Gem,
  whileNotGoal: MoveRight,
};

const COMMAND_TONE: Record<CommandKind, string> = {
  forward: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  turnLeft: 'bg-sky-50 text-sky-800 ring-sky-200',
  turnRight: 'bg-amber-50 text-amber-800 ring-amber-200',
  jump: 'bg-violet-50 text-violet-800 ring-violet-200',
  collect: 'bg-cyan-50 text-cyan-800 ring-cyan-200',
  repeat: 'bg-rose-50 text-rose-800 ring-rose-200',
  procCall: 'bg-indigo-50 text-indigo-800 ring-indigo-200',
  ifPath: 'bg-lime-50 text-lime-800 ring-lime-200',
  ifGem: 'bg-teal-50 text-teal-800 ring-teal-200',
  whileNotGoal: 'bg-orange-50 text-orange-800 ring-orange-200',
};

interface ProgrammingEditorProps {
  allowedCommands: ProgrammingBlockTemplateId[];
  program: Block[];
  activeBlockId: string | null;
  locked: boolean;
  canAddCommand: boolean;
  requiredKinds: CommandKind[];
  playbackSpeed: PlaybackSpeed;
  isPlaying: boolean;
  progress: { current: number; total: number } | null;
  onAddTemplate: (templateId: ProgrammingBlockTemplateId) => void;
  onRemoveBlock: (blockId: string) => void;
  onReorderProgram: (nextProgram: Block[]) => void;
  onUpdateBlock: (blockId: string, updater: (block: Block) => Block) => void;
  onClearProgram: () => void;
  onRunProgram: () => void;
  onPauseProgram: () => void;
  onStepProgram: () => void;
  onSpeedChange: (speed: PlaybackSpeed) => void;
  onSpeakHint: () => void;
}

function blockTitle(block: Block) {
  const template = PROGRAMMING_BLOCK_TEMPLATES[block.kind];
  if (block.kind === 'repeat') {
    return `${template.shortLabel} x${block.params?.n ?? 2}`;
  }
  if (block.kind === 'procCall') {
    return `${template.shortLabel} ${block.params?.procedureId ?? 'helper'}`;
  }
  return template.shortLabel;
}

function NestedPreview({ block }: { block: Block }) {
  const body = block.body ?? [];
  const branchTrue = block.branchTrue ?? [];
  const branchFalse = block.branchFalse ?? [];

  if (block.kind === 'repeat' || block.kind === 'whileNotGoal') {
    return (
      <span className="block truncate text-xs font-black opacity-70">
        内部：{body.map(blockTitle).join('、') || '空'}
      </span>
    );
  }

  if (block.kind === 'ifPath' || block.kind === 'ifGem') {
    return (
      <span className="block truncate text-xs font-black opacity-70">
        是：{branchTrue.map(blockTitle).join('、') || '空'} / 否：
        {branchFalse.map(blockTitle).join('、') || '空'}
      </span>
    );
  }

  return null;
}

function PaletteCommand({
  templateId,
  disabled,
  onAddTemplate,
}: {
  templateId: ProgrammingBlockTemplateId;
  disabled: boolean;
  onAddTemplate: (templateId: ProgrammingBlockTemplateId) => void;
}) {
  const template = PROGRAMMING_BLOCK_TEMPLATES[templateId];
  const Icon = COMMAND_ICON[template.kind];
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `palette-${templateId}`,
    data: { type: 'palette', templateId },
    disabled,
  });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <motion.button
      ref={setNodeRef}
      type="button"
      whileHover={disabled ? undefined : { y: -3 }}
      whileTap={disabled ? undefined : { scale: 0.96 }}
      transition={SPRING.bounce}
      disabled={disabled}
      onClick={() => onAddTemplate(templateId)}
      style={style}
      {...listeners}
      {...attributes}
      className={`flex min-h-20 items-center justify-between gap-3 rounded-[1.25rem] px-4 text-left text-lg font-black shadow-sm ring-1 disabled:opacity-45 ${
        isDragging ? 'opacity-60' : ''
      } ${COMMAND_TONE[template.kind]}`}
    >
      <span className="flex min-w-0 items-center gap-3">
        <Icon size={28} strokeWidth={3.2} />
        <span className="min-w-0">
          <span className="block truncate">{template.label}</span>
          <span className="block truncate text-xs opacity-70">{template.description}</span>
        </span>
      </span>
      <Plus size={22} strokeWidth={3.2} />
    </motion.button>
  );
}

function SortableProgramBlock({
  block,
  index,
  disabled,
  active,
  onRemoveBlock,
  onUpdateBlock,
}: {
  block: Block;
  index: number;
  disabled: boolean;
  active: boolean;
  onRemoveBlock: (blockId: string) => void;
  onUpdateBlock: (blockId: string, updater: (block: Block) => Block) => void;
}) {
  const template = PROGRAMMING_BLOCK_TEMPLATES[block.kind];
  const Icon = COMMAND_ICON[block.kind];
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: block.id,
    data: { type: 'program', blockId: block.id },
    disabled,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  const repeatCount = block.params?.n ?? 2;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`inline-flex min-h-16 shrink-0 items-stretch overflow-hidden rounded-2xl text-base font-black shadow-sm ring-1 ${
        active ? 'scale-105 ring-4 ring-amber-400' : ''
      } ${isDragging ? 'opacity-70' : ''} ${COMMAND_TONE[block.kind]}`}
    >
      <button
        type="button"
        disabled={disabled}
        className="flex w-10 items-center justify-center bg-white/55 disabled:opacity-45"
        aria-label={`移动第 ${index + 1} 步 ${template.shortLabel}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical size={18} strokeWidth={3.2} />
      </button>
      <div className="flex min-w-[9rem] items-center gap-2 px-3 py-2">
        <span className="rounded-full bg-white/75 px-2 py-0.5 text-sm">{index + 1}</span>
        <Icon size={20} strokeWidth={3.2} />
        <span className="min-w-0">
          <span className="block truncate">{blockTitle(block)}</span>
          <NestedPreview block={block} />
        </span>
      </div>
      {block.kind === 'repeat' ? (
        <div className="flex items-center border-l border-current/10 bg-white/40">
          <button
            type="button"
            disabled={disabled || repeatCount <= 2}
            className="h-full px-2 disabled:opacity-35"
            aria-label="减少重复次数"
            onClick={() =>
              onUpdateBlock(block.id, (current) => ({
                ...current,
                params: { ...current.params, n: Math.max(2, (current.params?.n ?? 2) - 1) },
              }))
            }
          >
            -
          </button>
          <button
            type="button"
            disabled={disabled || repeatCount >= 10}
            className="h-full px-2 disabled:opacity-35"
            aria-label="增加重复次数"
            onClick={() =>
              onUpdateBlock(block.id, (current) => ({
                ...current,
                params: { ...current.params, n: Math.min(10, (current.params?.n ?? 2) + 1) },
              }))
            }
          >
            +
          </button>
        </div>
      ) : null}
      <button
        type="button"
        disabled={disabled}
        onClick={() => onRemoveBlock(block.id)}
        aria-label={`删除第 ${index + 1} 步 ${template.shortLabel}`}
        className="flex w-12 items-center justify-center border-l border-current/10 bg-white/45 disabled:opacity-45"
      >
        <Trash2 size={18} strokeWidth={3.2} />
      </button>
    </div>
  );
}

function ProgramDropZone({ children }: { children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'program-dropzone' });

  return (
    <div
      ref={setNodeRef}
      className={`mt-5 min-h-28 rounded-[1.5rem] p-3 ring-1 ${
        isOver ? 'bg-emerald-100 ring-emerald-300' : 'bg-emerald-50/70 ring-emerald-100'
      }`}
    >
      {children}
    </div>
  );
}

function ProgrammingEditorComponent({
  allowedCommands,
  program,
  activeBlockId,
  locked,
  canAddCommand,
  requiredKinds,
  playbackSpeed,
  isPlaying,
  progress,
  onAddTemplate,
  onRemoveBlock,
  onReorderProgram,
  onUpdateBlock,
  onClearProgram,
  onRunProgram,
  onPauseProgram,
  onStepProgram,
  onSpeedChange,
  onSpeakHint,
}: ProgrammingEditorProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const programIds = useMemo(() => program.map((block) => block.id), [program]);
  const requiredLabel = requiredKinds
    .map((kind) => PROGRAMMING_BLOCK_TEMPLATES[kind].label)
    .join('、');
  const allRequiredSatisfied = requiredKinds.every((kind) => containsKind(program, kind));

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    const activeType = active.data.current?.type;
    if (activeType === 'palette') {
      const templateId = active.data.current?.templateId as ProgrammingBlockTemplateId;
      onAddTemplate(templateId);
      return;
    }

    if (activeType === 'program' && over?.id && active.id !== over.id) {
      const oldIndex = program.findIndex((block) => block.id === active.id);
      const newIndex = program.findIndex((block) => block.id === over.id);
      if (oldIndex >= 0 && newIndex >= 0) {
        onReorderProgram(arrayMove(program, oldIndex, newIndex));
      }
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="grid min-w-0 gap-4">
        <div className="rounded-[2rem] bg-white/88 p-5 shadow-sm ring-1 ring-emerald-900/10">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-black text-emerald-700/80">
                指令积木
              </div>
              <h2 className="text-4xl font-black text-emerald-950">点击或拖进程序</h2>
            </div>
            <div className="rounded-full bg-emerald-50 px-4 py-2 text-base font-black text-emerald-800 ring-1 ring-emerald-100">
              {program.length}
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {allowedCommands.map((templateId) => (
              <PaletteCommand
                key={templateId}
                templateId={templateId}
                onAddTemplate={onAddTemplate}
                disabled={!canAddCommand}
              />
            ))}
          </div>

          {requiredKinds.length > 0 ? (
            <div
              className={`mt-4 flex items-center gap-3 rounded-[1.5rem] p-4 text-base font-black ring-1 ${
                allRequiredSatisfied
                  ? 'bg-emerald-50 text-emerald-800 ring-emerald-200'
                  : 'bg-rose-50 text-rose-800 ring-rose-200'
              }`}
            >
              <Repeat2 size={24} strokeWidth={3.2} />
              本关目标：用一次 {requiredLabel}
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
                onClick={onClearProgram}
                disabled={locked || program.length === 0}
                className="inline-flex h-12 items-center gap-2 rounded-2xl bg-slate-50 px-4 text-base font-black text-slate-700 shadow-sm ring-1 ring-slate-200 disabled:opacity-45"
              >
                <RotateCcw size={20} strokeWidth={3.2} />
                重来
              </button>
              <button
                type="button"
                onClick={onSpeakHint}
                className="inline-flex h-12 items-center gap-2 rounded-2xl bg-amber-50 px-4 text-base font-black text-amber-800 shadow-sm ring-1 ring-amber-200"
              >
                提示
              </button>
            </div>
          </div>

          <SortableContext items={programIds} strategy={horizontalListSortingStrategy}>
            <ProgramDropZone>
              {program.length === 0 ? (
                <div className="flex h-20 items-center justify-center text-lg font-black text-emerald-800/60">
                  指令会排在这里
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {program.map((block, index) => (
                    <SortableProgramBlock
                      key={block.id}
                      block={block}
                      index={index}
                      active={Boolean(
                        activeBlockId &&
                          (activeBlockId === block.id || activeBlockId.startsWith(`${block.id}:`)),
                      )}
                      disabled={locked}
                      onRemoveBlock={onRemoveBlock}
                      onUpdateBlock={onUpdateBlock}
                    />
                  ))}
                </div>
              )}
            </ProgramDropZone>
          </SortableContext>

          <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
            <div className="grid grid-cols-3 gap-2">
              {SPEED_OPTIONS.map((option) => (
                <button
                  type="button"
                  key={option.value}
                  onClick={() => onSpeedChange(option.value)}
                  disabled={locked}
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
            <button
              type="button"
              onClick={onStepProgram}
              disabled={isPlaying}
              className="inline-flex min-h-16 items-center justify-center gap-2 rounded-[1.5rem] bg-white px-5 text-lg font-black text-emerald-800 shadow-sm ring-1 ring-emerald-100 disabled:opacity-45"
            >
              <StepForward size={22} strokeWidth={3.2} />
              单步
            </button>
            <BigButton
              type="button"
              tone="success"
              disabled={false}
              onClick={isPlaying ? onPauseProgram : onRunProgram}
              className="flex items-center justify-center gap-3 rounded-[1.5rem] bg-emerald-600 px-6 py-4 text-2xl text-white shadow-lg shadow-emerald-900/15 ring-white"
            >
              {isPlaying ? (
                <Pause size={30} fill="currentColor" strokeWidth={3.2} />
              ) : (
                <Play size={30} fill="currentColor" strokeWidth={3.2} />
              )}
              {isPlaying ? '暂停' : '运行'}
            </BigButton>
          </div>

          {progress ? (
            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between text-sm font-black text-emerald-800/80">
                <span>执行进度</span>
                <span>
                  {progress.current}/{progress.total}
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-emerald-100">
                <div
                  className="h-full rounded-full bg-emerald-600 transition-all"
                  style={{
                    width:
                      progress.total > 0
                        ? `${Math.min(100, (progress.current / progress.total) * 100)}%`
                        : '0%',
                  }}
                />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </DndContext>
  );
}

export const ProgrammingEditor = memo(ProgrammingEditorComponent);
