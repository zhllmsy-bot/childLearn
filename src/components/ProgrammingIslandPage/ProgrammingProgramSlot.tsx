import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { ArrowRight, Eye, Lightbulb, Play, RotateCcw, Star } from 'lucide-react';
import type { Block } from '../../programming/engine/types';
import type { RunStatus } from './programmingViewTypes';
import { ProgrammingProgramBlock } from './ProgrammingProgramBlock';

interface ProgrammingProgramSlotProps {
  activeBlockId: string | null;
  canAdvanceLevel: boolean;
  celebrationStars: number;
  hintUsesLeft: number;
  locked: boolean;
  onAdjustRepeat: (blockId: string, delta: -1 | 1) => void;
  onDuplicate: (blockId: string) => void;
  onHint: () => void;
  onMove: (blockId: string, delta: -1 | 1) => void;
  onNextLevel: () => void;
  onRemove: (blockId: string) => void;
  onReset: () => void;
  onStart: () => void;
  onStep: () => void;
  program: Block[];
  runNote: string;
  status: RunStatus;
}

export function ProgrammingProgramSlot({
  activeBlockId,
  canAdvanceLevel,
  celebrationStars,
  hintUsesLeft,
  locked,
  onAdjustRepeat,
  onDuplicate,
  onHint,
  onMove,
  onNextLevel,
  onRemove,
  onReset,
  onStart,
  onStep,
  program,
  runNote,
  status,
}: ProgrammingProgramSlotProps) {
  const { isOver, setNodeRef } = useDroppable({ id: 'program-slot' });
  const itemIds = program.map((block) => block.id);
  const showSuccess = status === 'success';

  return (
    <section className="programming-card flex min-h-0 flex-col p-6">
      <div className="programming-slot-header flex items-start justify-between gap-4">
        <div>
          <p className="text-[14px] font-medium leading-[1.4] text-[var(--text-secondary)]">
            程序槽
          </p>
          <h2 className="programming-title text-[22px] font-bold leading-[1.3]">
            把积木排成一队
          </h2>
        </div>
        <div className="programming-slot-actions flex items-center gap-3">
          <button
            aria-label={`想一想，还剩 ${hintUsesLeft} 次`}
            className={`programming-chip programming-control-chip flex h-12 items-center gap-2 px-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]${hintUsesLeft > 0 ? '' : ' programming-chip--disabled'}`}
            onClick={onHint}
            type="button"
          >
            <Lightbulb size={18} strokeWidth={2.6} />
            <span className="text-[17px] font-bold leading-[1.5]">
              想一想 {hintUsesLeft}/3
            </span>
          </button>
          <button
            aria-label="再试一次"
            className="programming-chip programming-control-chip flex h-12 items-center gap-2 px-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
            onClick={onReset}
            type="button"
          >
            <RotateCcw size={18} strokeWidth={2.6} />
            <span className="text-[17px] font-bold leading-[1.5]">再试一次</span>
          </button>
        </div>
      </div>

      <div
        ref={setNodeRef}
        aria-label="程序槽"
        className="programming-program-slot mt-6 min-h-[120px] rounded-[24px] px-4 py-6"
        role="group"
        style={{
          border: isOver ? '2px dashed var(--brand-primary)' : '0',
        }}
      >
        <SortableContext items={itemIds} strategy={horizontalListSortingStrategy}>
          {program.length === 0 ? (
            <div className="flex items-center gap-3" role="list">
              {Array.from({ length: 3 }, (_, index) => (
                <div
                  key={`placeholder-${index + 1}`}
                  className="programming-placeholder-block h-[72px] w-[72px] rounded-[16px]"
                  role="listitem"
                />
              ))}
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto overflow-y-hidden" role="list">
              {program.map((block, index) => (
                <ProgrammingProgramBlock
                  key={block.id}
                  active={Boolean(activeBlockId && activeBlockId.startsWith(block.id))}
                  block={block}
                  disabled={locked}
                  index={index}
                  onAdjustRepeat={onAdjustRepeat}
                  onDuplicate={onDuplicate}
                  onMove={onMove}
                  onRemove={onRemove}
                  total={program.length}
                />
              ))}
            </div>
          )}
        </SortableContext>
      </div>

      <div className="mt-6 flex flex-wrap gap-4">
        <button
          className="programming-primary-cta flex min-h-12 min-w-[180px] flex-1 items-center justify-center gap-2 rounded-[20px] px-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
          onClick={onStart}
          type="button"
        >
          <Play size={20} strokeWidth={2.6} />
          <span className="text-[20px] font-semibold leading-[1.45]">开始</span>
        </button>
        <button
          className="programming-secondary-cta flex min-h-12 min-w-[180px] flex-1 items-center justify-center gap-2 rounded-[20px] px-6 text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
          onClick={onStep}
          type="button"
        >
          <Eye size={20} strokeWidth={2.6} />
          <span className="text-[20px] font-semibold leading-[1.45]">一步一步看</span>
        </button>
      </div>

      <div className="programming-run-note mt-6 flex flex-wrap items-center justify-between gap-4 rounded-[20px] px-4 py-3">
        <div className="flex items-center gap-2 text-[17px] font-medium leading-[1.5] text-[var(--text-primary)]">
          <span>{runNote || '准备好了就开始。'}</span>
          {showSuccess ? (
            <div className="flex items-center gap-2">
              {[1, 2, 3].map((starIndex) => (
                <Star
                  key={`star-${starIndex}`}
                  fill={celebrationStars >= starIndex ? 'var(--state-warning)' : 'transparent'}
                  size={18}
                  stroke="var(--state-warning)"
                  strokeWidth={2.4}
                />
              ))}
            </div>
          ) : null}
        </div>
        {showSuccess && canAdvanceLevel ? (
          <button
            className="programming-chip flex h-12 items-center gap-2 px-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
            onClick={onNextLevel}
            type="button"
          >
            <span className="text-[17px] font-medium leading-[1.5]">下一关</span>
            <ArrowRight size={18} strokeWidth={2.6} />
          </button>
        ) : null}
      </div>
    </section>
  );
}
