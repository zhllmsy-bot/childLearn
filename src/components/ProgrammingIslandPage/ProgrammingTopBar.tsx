import type { ReactNode } from 'react';
import { ArrowLeft, Settings2, Volume2, VolumeX } from 'lucide-react';
import { ProgrammingSettingsMenu } from './ProgrammingSettingsMenu';
import type { PlaybackPace } from './programmingViewTypes';

interface ProgrammingTopBarProps {
  isMuted: boolean;
  onBack: () => void;
  onPaceChange: (pace: PlaybackPace) => void;
  onToggleMute: () => void;
  onToggleSettings: () => void;
  pace: PlaybackPace;
  progressDots: boolean[];
  settingsOpen: boolean;
  title: string;
}

function IconButton({
  ariaLabel,
  children,
  onClick,
}: {
  ariaLabel: string;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={ariaLabel}
      className="flex h-12 w-12 items-center justify-center rounded-[20px] text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
      onClick={onClick}
      type="button"
    >
      <div className="programming-icon-button flex h-10 w-10 items-center justify-center rounded-[20px]">
        {children}
      </div>
    </button>
  );
}

export function ProgrammingTopBar({
  isMuted,
  onBack,
  onPaceChange,
  onToggleMute,
  onToggleSettings,
  pace,
  progressDots,
  settingsOpen,
  title,
}: ProgrammingTopBarProps) {
  return (
    <header className="programming-topbar relative z-40 flex h-14 items-center gap-4">
      <IconButton ariaLabel="返回首页" onClick={onBack}>
        <ArrowLeft size={20} strokeWidth={2.8} />
      </IconButton>
      <div className="min-w-0 flex-1">
        <h1 className="programming-title truncate text-[28px] font-extrabold leading-[1.2]">
          {title}
        </h1>
      </div>
      <div
        aria-label="关卡进度"
        className="programming-progress-pill programming-progress-dots flex items-center gap-2 rounded-[999px] px-4 py-2"
        role="img"
      >
        {progressDots.map((filled, index) => (
          <span
            key={`dot-${index + 1}`}
            className="h-2 w-2 rounded-full"
            style={{ background: filled ? 'var(--brand-primary)' : 'var(--border-default)' }}
          />
        ))}
      </div>
      <div className="relative">
        <IconButton ariaLabel="打开设置" onClick={onToggleSettings}>
          <Settings2 size={20} strokeWidth={2.8} />
        </IconButton>
        {settingsOpen ? (
          <ProgrammingSettingsMenu
            onClose={onToggleSettings}
            onPaceChange={onPaceChange}
            pace={pace}
          />
        ) : null}
      </div>
      <IconButton ariaLabel={isMuted ? '打开声音' : '关闭声音'} onClick={onToggleMute}>
        {isMuted ? <VolumeX size={20} strokeWidth={2.8} /> : <Volume2 size={20} strokeWidth={2.8} />}
      </IconButton>
    </header>
  );
}
