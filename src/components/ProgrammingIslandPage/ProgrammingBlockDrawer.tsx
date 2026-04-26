import { AnimatePresence, motion } from 'framer-motion';
import type { ProgrammingBlockTemplateId } from '../../programming/blocks';
import {
  PROGRAMMING_EASE_OUT_QUART,
  PROGRAMMING_SPRING_SOFT,
} from '../../programming/programmingMotion';
import { PROGRAMMING_BLOCK_TEMPLATES } from '../../programming/blocks';
import { ProgrammingDrawerBlock } from './ProgrammingDrawerBlock';

interface ProgrammingBlockDrawerProps {
  allowedCommands: ProgrammingBlockTemplateId[];
  canAddCommand: boolean;
  hoveredTemplateId: ProgrammingBlockTemplateId | null;
  onAppend: (templateId: ProgrammingBlockTemplateId) => void;
  onHoverChange: (templateId: ProgrammingBlockTemplateId | null) => void;
}

export function ProgrammingBlockDrawer({
  allowedCommands,
  canAddCommand,
  hoveredTemplateId,
  onAppend,
  onHoverChange,
}: ProgrammingBlockDrawerProps) {
  const hoveredTemplate = hoveredTemplateId
    ? PROGRAMMING_BLOCK_TEMPLATES[hoveredTemplateId]
    : null;

  return (
    <aside
      className="programming-drawer fixed bottom-0 left-0 right-0 z-30 h-32"
      style={{
        paddingBottom: 'calc(var(--safe-bottom) + 8px)',
        paddingLeft: 'calc(var(--safe-left) + 24px)',
        paddingRight: 'calc(var(--safe-right) + 24px)',
        paddingTop: '8px',
      }}
    >
      <div className="relative flex h-full items-center gap-3 overflow-x-auto">
        <AnimatePresence initial={false}>
          {allowedCommands.map((templateId) => (
            <motion.div
              key={templateId}
              animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 24, scale: 0.92 }}
              initial={{ opacity: 0, x: 24, y: 8, scale: 0.9 }}
              transition={{
                duration: 0.3,
                ease: PROGRAMMING_EASE_OUT_QUART,
                ...PROGRAMMING_SPRING_SOFT,
              }}
            >
              <ProgrammingDrawerBlock
                disabled={!canAddCommand}
                isHovered={hoveredTemplateId === templateId}
                onAppend={onAppend}
                onHoverChange={onHoverChange}
                templateId={templateId}
              />
            </motion.div>
          ))}
        </AnimatePresence>
        {hoveredTemplate ? (
          <div className="programming-card pointer-events-none absolute -top-12 left-0 rounded-[20px] px-4 py-2 text-[14px] font-medium leading-[1.4] text-[var(--text-primary)]">
            {hoveredTemplate.description}
          </div>
        ) : null}
      </div>
    </aside>
  );
}
