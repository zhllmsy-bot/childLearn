import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useCallback, useMemo } from 'react';
import type { ProgrammingLevel } from '../../programming/programmingLevels';
import { PROGRAMMING_SIZES, PROGRAMMING_PAGE_THEME_VARS, PROGRAMMING_FONT_STACK } from '../../theme/tokens';
import { useTopBarConfig, type AppTopBarConfig } from '../AppTopBar/AppTopBar';
import { ProgrammingAmbience } from './ProgrammingAmbience';
import { ProgrammingBlockDrawer } from './ProgrammingBlockDrawer';
import { ProgrammingGridStage } from './ProgrammingGridStage';
import { ProgrammingProgramSlot } from './ProgrammingProgramSlot';
import { ProgrammingSettingsMenu } from './ProgrammingSettingsMenu';
import { useProgrammingSession } from './useProgrammingSession';

interface ProgrammingIslandPageProps {
  completedLevelIds: string[];
  initialLevelId: string | null;
  onBack: () => void;
  onCompleteLevel: (
    level: ProgrammingLevel,
    result: ProgrammingCompletionResult,
  ) => void;
  onSpeak: (text: string) => void;
  unlockedLevelCount: number;
}

export interface ProgrammingCompletionResult {
  blockedReason?: string;
  optimalSteps: number | null;
  requiredCommandSatisfied: boolean;
  stars: 1 | 2 | 3;
  usedSteps: number;
}

export function ProgrammingIslandPage({
  completedLevelIds,
  initialLevelId,
  onBack,
  onCompleteLevel,
  onSpeak,
  unlockedLevelCount,
}: ProgrammingIslandPageProps) {
  const session = useProgrammingSession({
    completedLevelIds,
    initialLevelId,
    onCompleteLevel,
    onSpeak,
    unlockedLevelCount,
  });
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragStart = useCallback((_event: DragStartEvent) => {
    navigator.vibrate?.(10);
  }, []);

  const handleDragEnd = useCallback(
    ({ active, over }: DragEndEvent) => {
      if (!over) {
        return;
      }
      const activeType = active.data.current?.type;
      if (activeType === 'drawer') {
        const templateId = active.data.current?.templateId;
        if (!templateId) {
          return;
        }
        const overIndex =
          over.id === 'program-slot'
            ? session.program.length
            : session.program.findIndex((block) => block.id === over.id);
        session.insertTemplate(templateId, overIndex < 0 ? session.program.length : overIndex);
        return;
      }
      if (activeType === 'program' && over.id !== 'program-slot' && active.id !== over.id) {
        const oldIndex = session.program.findIndex((block) => block.id === active.id);
        const newIndex = session.program.findIndex((block) => block.id === over.id);
        if (oldIndex >= 0 && newIndex >= 0) {
          session.reorderProgram(arrayMove(session.program, oldIndex, newIndex));
        }
      }
    },
    [session],
  );
  const topBarConfig = useMemo<AppTopBarConfig>(
    () => ({
      actions: [
        {
          ariaLabel: '打开设置',
          icon: 'settings',
          id: 'programming-settings',
          onClick: () => session.setSettingsOpen(!session.settingsOpen),
          popover: session.settingsOpen ? (
            <ProgrammingSettingsMenu
              onClose={() => session.setSettingsOpen(false)}
              onPaceChange={session.setPace}
              pace={session.pace}
            />
          ) : null,
          pressed: session.settingsOpen,
        },
        {
          ariaLabel: session.isMuted ? '打开声音' : '关闭声音',
          icon: session.isMuted ? 'mute' : 'sound',
          id: 'programming-sound',
          onClick: () => session.setIsMuted((current) => !current),
          pressed: session.isMuted,
        },
      ],
      leadingAction: {
        ariaLabel: '首页',
        icon: 'home',
        id: 'programming-home',
        onClick: onBack,
      },
      progressDots: session.progressDots,
      title: session.level.title,
    }),
    [
      onBack,
      session.isMuted,
      session.level.title,
      session.pace,
      session.progressDots,
      session.settingsOpen,
      session.setIsMuted,
      session.setPace,
      session.setSettingsOpen,
    ],
  );

  useTopBarConfig(topBarConfig, 10);

  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      onDragStart={handleDragStart}
      sensors={sensors}
    >
      <section
        className="programming-page relative isolate min-h-screen overflow-x-hidden"
        style={{
          ...PROGRAMMING_PAGE_THEME_VARS,
          fontFamily: PROGRAMMING_FONT_STACK,
          letterSpacing: '0',
          paddingBottom: `calc(var(--safe-bottom) + ${PROGRAMMING_SIZES.blockDrawerHeight + 24}px)`,
          paddingLeft: 'calc(var(--safe-left) + clamp(12px, 2vw, 24px))',
          paddingRight: 'calc(var(--safe-right) + clamp(12px, 2vw, 24px))',
          paddingTop: 'clamp(12px, 2vw, 24px)',
        }}
      >
        <ProgrammingAmbience />
        <div className="relative z-10">
          <div className="programming-workspace grid gap-6 lg:grid-cols-[minmax(0,1.27fr)_minmax(0,1fr)]">
            <ProgrammingGridStage
              bot={session.bot}
              emotion={session.emotion}
              level={session.level}
              onSpeak={session.speakMessage}
              previewPath={session.previewPath}
              remainingGems={session.remainingGems}
              status={session.status}
              taskText={session.message}
              visitedKeys={session.visitedKeys}
            />
            <ProgrammingProgramSlot
              activeBlockId={session.activeBlockId}
              canAdvanceLevel={session.canAdvanceLevel}
              celebrationStars={session.celebrationStars}
              hintUsesLeft={session.hintUsesLeft}
              locked={session.isProgramLocked}
              onAdjustRepeat={session.adjustRepeat}
              onDuplicate={session.duplicateBlockToEnd}
              onHint={session.useHint}
              onMove={session.moveBlockByKeyboard}
              onNextLevel={session.goToNextLevel}
              onRemove={session.removeBlock}
              onReset={session.resetProgram}
              onStart={session.startProgram}
              onStep={session.stepProgram}
              program={session.program}
              runNote={session.runNote}
              status={session.status}
            />
          </div>
        </div>

        <ProgrammingBlockDrawer
          allowedCommands={session.sortedAllowedCommands}
          canAddCommand={session.canAddCommand}
          hoveredTemplateId={session.hoveredTemplateId}
          onAppend={(templateId) => session.insertTemplate(templateId)}
          onHoverChange={session.setHoveredTemplateId}
        />
      </section>
    </DndContext>
  );
}
