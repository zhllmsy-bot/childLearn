import type { Meta, StoryObj } from '@storybook/react';
import { useEffect, type ReactNode } from 'react';
import { PROGRAMMING_PAGE_THEME_VARS, PROGRAMMING_FONT_STACK } from '../../theme/tokens';
import { ProgrammingIslandPage } from './ProgrammingIslandPage';
import { ProgrammingDrawerBlock } from './ProgrammingDrawerBlock';
import { ProgrammingProgramBlock } from './ProgrammingProgramBlock';
import { ProgrammingTopBar } from './ProgrammingTopBar';

const baseArgs = {
  completedLevelIds: [],
  initialLevelId: 'sequence-apple',
  onBack: () => undefined,
  onCompleteLevel: () => undefined,
  onSpeak: () => undefined,
  unlockedLevelCount: 1,
};

const meta = {
  args: baseArgs,
  component: ProgrammingIslandPage,
  title: 'Programming/Island Page',
} satisfies Meta<typeof ProgrammingIslandPage>;

export default meta;
type Story = StoryObj<typeof meta>;

function Surface({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        ...PROGRAMMING_PAGE_THEME_VARS,
        background: 'var(--bg-canvas)',
        fontFamily: PROGRAMMING_FONT_STACK,
        minHeight: '100vh',
        padding: 24,
      }}
    >
      {children}
    </div>
  );
}

export const Default: Story = {
  render: () => (
    <ProgrammingIslandPage
      completedLevelIds={[]}
      initialLevelId="sequence-apple"
      onBack={() => undefined}
      onCompleteLevel={() => undefined}
      onSpeak={() => undefined}
      unlockedLevelCount={1}
    />
  ),
};

export const Hover: Story = {
  render: () => (
    <Surface>
      <ProgrammingDrawerBlock
        disabled={false}
        isHovered
        onAppend={() => undefined}
        onHoverChange={() => undefined}
        templateId="forward"
      />
    </Surface>
  ),
};

export const Active: Story = {
  render: () => (
    <Surface>
      <ul className="w-fit">
        <ProgrammingProgramBlock
          active
          block={{ id: 'repeat-1', kind: 'repeat', params: { n: 4 } }}
          disabled={false}
          index={0}
          onAdjustRepeat={() => undefined}
          onDuplicate={() => undefined}
          onMove={() => undefined}
          onRemove={() => undefined}
          total={1}
        />
      </ul>
    </Surface>
  ),
};

export const Focus: Story = {
  play: async ({ canvasElement }) => {
    canvasElement.querySelector('button')?.focus();
  },
  render: () => (
    <Surface>
      <ProgrammingTopBar
        isMuted={false}
        onBack={() => undefined}
        onPaceChange={() => undefined}
        onToggleMute={() => undefined}
        onToggleSettings={() => undefined}
        pace="slow"
        progressDots={[true, true, false, false, false, false]}
        settingsOpen={false}
        title="第一条小路"
      />
    </Surface>
  ),
};

export const Disabled: Story = {
  render: () => (
    <Surface>
      <ProgrammingDrawerBlock
        disabled
        isHovered={false}
        onAppend={() => undefined}
        onHoverChange={() => undefined}
        templateId="repeat"
      />
    </Surface>
  ),
};

export const ReducedMotion: Story = {
  render: () => {
    useEffect(() => {
      const original = window.matchMedia;
      window.matchMedia = ((query: string) => ({
        addEventListener() {},
        addListener() {},
        dispatchEvent() {
          return false;
        },
        matches: query.includes('prefers-reduced-motion'),
        media: query,
        onchange: null,
        removeEventListener() {},
        removeListener() {},
      })) as typeof window.matchMedia;
      return () => {
        window.matchMedia = original;
      };
    }, []);

    return (
      <ProgrammingIslandPage
        completedLevelIds={[]}
        initialLevelId="sequence-apple"
        onBack={() => undefined}
        onCompleteLevel={() => undefined}
        onSpeak={() => undefined}
        unlockedLevelCount={1}
      />
    );
  },
};

export const Dark: Story = {
  parameters: { backgrounds: { default: 'dark' } },
  render: () => (
    <Surface>
      <ProgrammingTopBar
        isMuted
        onBack={() => undefined}
        onPaceChange={() => undefined}
        onToggleMute={() => undefined}
        onToggleSettings={() => undefined}
        pace="fast"
        progressDots={[true, true, true, false, false, false]}
        settingsOpen={false}
        title="拐个小弯"
      />
    </Surface>
  ),
};
