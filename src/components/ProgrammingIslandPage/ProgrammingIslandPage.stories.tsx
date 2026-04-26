import type { Meta, StoryObj } from '@storybook/react';
import { useEffect, type ReactNode } from 'react';
import { PROGRAMMING_PAGE_THEME_VARS, PROGRAMMING_FONT_STACK } from '../../theme/tokens';
import {
  AppTopBar,
  AppTopBarProvider,
  useTopBarConfig,
  type AppTopBarConfig,
} from '../AppTopBar/AppTopBar';
import { ProgrammingIslandPage } from './ProgrammingIslandPage';
import { ProgrammingDrawerBlock } from './ProgrammingDrawerBlock';
import { ProgrammingProgramBlock } from './ProgrammingProgramBlock';

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

function AppChrome({ children }: { children: ReactNode }) {
  return (
    <AppTopBarProvider>
      <AppTopBar />
      {children}
    </AppTopBarProvider>
  );
}

function TopBarFixture({ config }: { config: AppTopBarConfig }) {
  useTopBarConfig(config, 10);
  return <AppTopBar />;
}

export const Default: Story = {
  render: () => (
    <AppChrome>
      <ProgrammingIslandPage
        completedLevelIds={[]}
        initialLevelId="sequence-apple"
        onBack={() => undefined}
        onCompleteLevel={() => undefined}
        onSpeak={() => undefined}
        unlockedLevelCount={1}
      />
    </AppChrome>
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
    <AppTopBarProvider>
      <TopBarFixture
        config={{
          actions: [
            {
              ariaLabel: '打开设置',
              icon: 'settings',
              id: 'settings',
              onClick: () => undefined,
            },
            {
              ariaLabel: '关闭声音',
              icon: 'sound',
              id: 'sound',
              onClick: () => undefined,
            },
          ],
          leadingAction: {
            ariaLabel: '首页',
            icon: 'home',
            id: 'home',
            onClick: () => undefined,
          },
          progressDots: [true, true, false, false, false, false],
          title: '第一条小路',
        }}
      />
      <Surface>
        <div className="programming-card p-6">TopBar 聚焦态</div>
      </Surface>
    </AppTopBarProvider>
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
      <AppChrome>
      <ProgrammingIslandPage
        completedLevelIds={[]}
        initialLevelId="sequence-apple"
        onBack={() => undefined}
        onCompleteLevel={() => undefined}
        onSpeak={() => undefined}
        unlockedLevelCount={1}
      />
      </AppChrome>
    );
  },
};

export const Dark: Story = {
  parameters: { backgrounds: { default: 'dark' } },
  render: () => (
    <AppTopBarProvider>
      <TopBarFixture
        config={{
          actions: [
            {
              ariaLabel: '打开设置',
              icon: 'settings',
              id: 'settings',
              onClick: () => undefined,
            },
            {
              ariaLabel: '打开声音',
              icon: 'mute',
              id: 'sound',
              onClick: () => undefined,
              pressed: true,
            },
          ],
          leadingAction: {
            ariaLabel: '首页',
            icon: 'home',
            id: 'home',
            onClick: () => undefined,
          },
          progressDots: [true, true, true, false, false, false],
          title: '拐个小弯',
        }}
      />
      <Surface>
        <div className="programming-card p-6">夜色背景预览</div>
      </Surface>
    </AppTopBarProvider>
  ),
};
