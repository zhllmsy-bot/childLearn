import { useRef, type CSSProperties } from 'react';
import { ChevronDown, ChevronUp, GripVertical } from 'lucide-react';
import { CSS } from '@dnd-kit/utilities';
import { useSortable } from '@dnd-kit/sortable';
import type { Block } from '../../programming/engine/types';
import { ProgrammingBlockGlyph } from './ProgrammingBlockGlyph';
import { COMMAND_THEME_VAR, blockLabel } from './programmingUiConfig';

interface ProgrammingProgramBlockProps {
  active: boolean;
  block: Block;
  disabled: boolean;
  index: number;
  onAdjustRepeat: (blockId: string, delta: -1 | 1) => void;
  onDuplicate: (blockId: string) => void;
  onMove: (blockId: string, delta: -1 | 1) => void;
  onRemove: (blockId: string) => void;
  total: number;
}

export function ProgrammingProgramBlock({
  active,
  block,
  disabled,
  index,
  onAdjustRepeat,
  onDuplicate,
  onMove,
  onRemove,
  total,
}: ProgrammingProgramBlockProps) {
  const swipeRef = useRef<{ x: number; y: number } | null>(null);
  const theme = COMMAND_THEME_VAR[block.kind];
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
    data: { type: 'program', blockId: block.id },
    disabled,
  });

  return (
    <li
      ref={setNodeRef}
      aria-posinset={index + 1}
      aria-setsize={total}
      className="shrink-0 list-none"
      role="listitem"
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <div
        className={`programming-gummy-block programming-gummy-block--wide flex h-[88px] items-center gap-3 px-3 text-white transition-transform duration-300${active ? ' programming-gummy-block--pressed' : ''}`}
        onDoubleClick={() => onDuplicate(block.id)}
        onPointerDown={(event) => {
          swipeRef.current = { x: event.clientX, y: event.clientY };
        }}
        onPointerUp={(event) => {
          const start = swipeRef.current;
          if (!start || disabled) {
            return;
          }
          const deltaX = Math.abs(event.clientX - start.x);
          const deltaY = event.clientY - start.y;
          if (deltaY > 48 && deltaY > deltaX) {
            onRemove(block.id);
          }
        }}
        style={{
          '--command-accent': theme.accent,
          '--command-accent-dark': theme.accentDark,
          '--command-accent-light': theme.accentLight,
          opacity: isDragging ? 0.72 : 1,
          transform: active ? 'scale(1.08)' : 'scale(1)',
        } as CSSProperties}
      >
        <button
          {...attributes}
          {...listeners}
          aria-grabbed={isDragging}
          aria-label={`拖动第 ${index + 1} 块积木`}
          className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-white/20 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
          role="button"
          type="button"
        >
          <GripVertical size={20} strokeWidth={2.8} />
        </button>
        <button
          aria-label={`第 ${index + 1} 块，${blockLabel(block)}`}
          className="min-w-0 flex-1 text-left focus-visible:outline-none"
          disabled={disabled}
          onKeyDown={(event) => {
            if (event.key === 'ArrowUp') {
              event.preventDefault();
              onMove(block.id, -1);
            }
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              onMove(block.id, 1);
            }
            if (event.key === 'Delete' || event.key === 'Backspace') {
              event.preventDefault();
              onRemove(block.id);
            }
          }}
          type="button"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-[16px] bg-white/20">
              <ProgrammingBlockGlyph kind={block.kind} small />
            </span>
            <span className="min-w-0">
              <span className="programming-gummy-block__label block truncate text-[17px] font-semibold leading-[1.5]">
                {blockLabel(block)}
              </span>
              <span className="block truncate text-[14px] font-medium leading-[1.4] text-white/90">
                第 {index + 1} 步
              </span>
            </span>
          </div>
        </button>
        {block.kind === 'repeat' ? (
          <div className="flex items-center gap-1">
            <button
              aria-label="减少重复次数"
              className="flex h-10 w-10 items-center justify-center rounded-[16px] bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
              disabled={disabled}
              onClick={() => onAdjustRepeat(block.id, -1)}
              type="button"
            >
              <ChevronDown size={18} strokeWidth={2.8} />
            </button>
            <span className="w-8 text-center text-[18px] font-bold leading-none tracking-[0]">
              {block.params?.n ?? 2}
            </span>
            <button
              aria-label="增加重复次数"
              className="flex h-10 w-10 items-center justify-center rounded-[16px] bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
              disabled={disabled}
              onClick={() => onAdjustRepeat(block.id, 1)}
              type="button"
            >
              <ChevronUp size={18} strokeWidth={2.8} />
            </button>
          </div>
        ) : null}
      </div>
    </li>
  );
}
