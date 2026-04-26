import { motion } from 'framer-motion';
import { useDraggable } from '@dnd-kit/core';
import type { CSSProperties } from 'react';
import { PROGRAMMING_BLOCK_TEMPLATES, type ProgrammingBlockTemplateId } from '../../programming/blocks';
import { PROGRAMMING_SPRING_SOFT } from '../../programming/programmingMotion';
import { ProgrammingBlockGlyph } from './ProgrammingBlockGlyph';
import { COMMAND_THEME_VAR } from './programmingUiConfig';

interface ProgrammingDrawerBlockProps {
  disabled: boolean;
  isHovered: boolean;
  onAppend: (templateId: ProgrammingBlockTemplateId) => void;
  onHoverChange: (templateId: ProgrammingBlockTemplateId | null) => void;
  templateId: ProgrammingBlockTemplateId;
}

export function ProgrammingDrawerBlock({
  disabled,
  isHovered,
  onAppend,
  onHoverChange,
  templateId,
}: ProgrammingDrawerBlockProps) {
  const template = PROGRAMMING_BLOCK_TEMPLATES[templateId];
  const theme = COMMAND_THEME_VAR[template.kind];
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `drawer-${templateId}`,
    data: { type: 'drawer', templateId },
    disabled,
  });

  return (
    <button
      ref={setNodeRef}
      aria-grabbed={isDragging}
      aria-label={`${template.label}积木`}
      className="p-2"
      onClick={() => onAppend(templateId)}
      onPointerEnter={() => onHoverChange(templateId)}
      onPointerLeave={() => onHoverChange(null)}
      style={{
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
      }}
      type="button"
      {...attributes}
      {...listeners}
    >
      <motion.div
        animate={{ scale: isHovered ? 1.02 : 1, y: isHovered ? -4 : 0 }}
        className="programming-gummy-block flex flex-col items-center justify-center gap-1 text-center text-white"
        style={{
          '--command-accent': theme.accent,
          '--command-accent-dark': theme.accentDark,
          '--command-accent-light': theme.accentLight,
          opacity: disabled ? 0.45 : isDragging ? 0.7 : 1,
        } as CSSProperties}
        transition={PROGRAMMING_SPRING_SOFT}
      >
        <ProgrammingBlockGlyph kind={template.kind} />
        <span className="programming-gummy-block__label text-[17px] font-semibold leading-[1.5]">
          {template.label}
        </span>
      </motion.div>
    </button>
  );
}
