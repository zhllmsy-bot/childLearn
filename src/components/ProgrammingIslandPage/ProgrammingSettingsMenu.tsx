import { Rabbit, Turtle } from 'lucide-react';
import { PROGRAMMING_UI_SPEC_VERSION } from '../../programming/UI_SPEC_VERSION';
import type { PlaybackPace } from './programmingViewTypes';

interface ProgrammingSettingsMenuProps {
  onClose: () => void;
  onPaceChange: (pace: PlaybackPace) => void;
  pace: PlaybackPace;
}

export function ProgrammingSettingsMenu({
  onClose,
  onPaceChange,
  pace,
}: ProgrammingSettingsMenuProps) {
  return (
    <div className="programming-card absolute right-0 top-14 z-50 w-[224px] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[14px] font-medium leading-[1.4] text-[var(--text-secondary)]">
            播放速度
          </p>
          <h3 className="text-[17px] font-medium leading-[1.5] text-[var(--text-primary)]">
            小满走路节奏
          </h3>
        </div>
        <button
          aria-label="关闭设置"
          className="programming-icon-button flex h-10 w-10 items-center justify-center rounded-[20px] text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
          onClick={onClose}
          type="button"
        >
          ×
        </button>
      </div>
      <div className="mt-4 grid gap-3">
        {[
          { icon: Turtle, label: '慢慢看', value: 'slow' as const },
          { icon: Rabbit, label: '快一点', value: 'fast' as const },
        ].map((item) => {
          const Icon = item.icon;
          const active = pace === item.value;
          return (
            <button
              key={item.value}
              aria-pressed={active}
              className="programming-settings-item flex h-12 items-center gap-3 rounded-[20px] px-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
              onClick={() => onPaceChange(item.value)}
              type="button"
            >
              <Icon size={20} strokeWidth={2.6} />
              <span className="text-[17px] font-medium leading-[1.5]">{item.label}</span>
            </button>
          );
        })}
      </div>
      <p className="programming-version-text mt-4 text-[14px] font-bold leading-[1.4]">
        规范 v{PROGRAMMING_UI_SPEC_VERSION}
      </p>
    </div>
  );
}
