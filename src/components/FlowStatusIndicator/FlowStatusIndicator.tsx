import { Cog } from 'lucide-react';
import type { FlowState } from '../../engagement/flow';
import type { FlowObserverStatus } from '../../app/appState';
import type { LearnerFlowState } from '../../ai/learnerModel';

interface FlowStatusIndicatorProps {
  flowState?: FlowState | null;
  learnerFlowState?: LearnerFlowState | null;
  observerStatus?: FlowObserverStatus | null;
}

type FlowTone = 'easy' | 'flow' | 'hard' | 'thinking' | 'fatigue';

const FLOW_TONE_LABELS: Record<FlowTone, string> = {
  easy: '偏易',
  flow: '心流',
  hard: '偏难',
  thinking: '小满在想',
  fatigue: '休息',
};

function resolveTone({
  flowState,
  learnerFlowState,
  observerStatus,
}: FlowStatusIndicatorProps): FlowTone {
  if (observerStatus === 'pending') {
    return 'thinking';
  }

  if (flowState === 'fatigue') {
    return 'fatigue';
  }

  if (flowState === 'easy' || learnerFlowState === 'bored') {
    return 'easy';
  }

  if (
    flowState === 'hard' ||
    flowState === 'stretch' ||
    learnerFlowState === 'anxious'
  ) {
    return 'hard';
  }

  return 'flow';
}

function markerIndexForTone(tone: FlowTone) {
  if (tone === 'easy') {
    return 0;
  }

  if (tone === 'hard' || tone === 'fatigue') {
    return 2;
  }

  return 1;
}

export function FlowStatusIndicator(props: FlowStatusIndicatorProps) {
  const tone = resolveTone(props);
  const markerIndex = markerIndexForTone(tone);
  const label = FLOW_TONE_LABELS[tone];

  return (
    <div
      aria-label={`心流状态：${label}`}
      aria-live="polite"
      className={`flow-status-indicator flow-status-indicator--${tone}`}
      role="status"
    >
      {tone === 'thinking' ? (
        <Cog aria-hidden="true" className="flow-status-gear" size={16} strokeWidth={3} />
      ) : null}
      <span className="flow-status-label">{label}</span>
      <span aria-hidden="true" className="flow-status-track">
        {[0, 1, 2].map((index) => (
          <span
            className={`flow-status-dot${
              index === markerIndex ? ' flow-status-dot--active' : ''
            }`}
            key={index}
          />
        ))}
      </span>
    </div>
  );
}

