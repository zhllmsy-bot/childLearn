import { Volume2 } from 'lucide-react';

interface ProgrammingTaskBubbleProps {
  left: number;
  maxWidth: number;
  onSpeak: () => void;
  text: string;
  top: number;
}

export function ProgrammingTaskBubble({
  left,
  maxWidth,
  onSpeak,
  text,
  top,
}: ProgrammingTaskBubbleProps) {
  return (
    <div
      className="pointer-events-none absolute z-10"
      style={{ left, maxWidth, minWidth: 200, top, width: `min(${maxWidth}px, 100%)` }}
    >
      <div
        className="programming-task-bubble pointer-events-auto relative rounded-[24px] px-4 pb-14 pt-4 text-[17px] font-medium leading-[1.5] text-[var(--text-primary)]"
      >
        <div className="max-h-[120px] overflow-y-auto pr-2">{text}</div>
        <button
          type="button"
          aria-label="播放任务语音"
          onClick={onSpeak}
          className="programming-icon-button absolute bottom-4 right-4 flex h-10 w-10 items-center justify-center rounded-[20px] text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
        >
          <Volume2 size={20} strokeWidth={2.6} />
        </button>
        <div className="programming-task-tail absolute bottom-[-8px] left-8 h-4 w-4 rotate-45" />
      </div>
    </div>
  );
}
