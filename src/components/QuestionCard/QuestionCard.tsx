import { memo, useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Flag, RotateCcw, Star } from 'lucide-react';
import type { Question } from '../../curriculum/types';
import { SPRING } from '../../theme/springs';
import {
  ACCENT,
  CARD,
  SEMANTIC,
  SHADOW,
  TEXT_GRADIENT,
  linearGradient,
} from '../../theme/tokens';
import { Badge } from '../_primitives/Badge';

interface QuestionCardProps {
  question: Question;
  answered: boolean;
  reasoningState?: {
    currentStepIndex: number;
    hintText?: string | null;
    mode: 'multiStep' | 'narration';
    stepStem: string;
    totalSteps: number;
    title: string;
  } | null;
}

const VARIANT_LABEL = {
  matching: '数量配对',
  compare: '比大小',
  makeTen: '凑十',
  missing: '填空',
  story: '故事题',
  numberLine: '数轴跳跃',
} as const;

const CARD_SUCCESS_MOTION = {
  scale: [1, 1.06, 1],
  x: 0,
  y: 0,
  rotate: [0, -1, 0],
};

const CARD_SUCCESS_TIMING = {
  duration: 0.32,
  times: [0, 0.55, 1],
  ease: [0.2, 0.8, 0.2, 1] as const,
};

const CARD_BODY_SUCCESS_MOTION = {
  opacity: 1,
  scale: [1, 1.02, 1],
  filter: 'blur(0px)',
};

const OBJECT_TOKEN_STYLE = [
  {
    backgroundImage: linearGradient([...ACCENT.success].reverse() as [string, string], '135deg'),
    boxShadow: `0 12px 22px ${SEMANTIC.correct.shadow}`,
  },
  {
    backgroundImage: linearGradient([...ACCENT.gold].reverse() as [string, string], '135deg'),
    boxShadow: `0 12px 22px ${SEMANTIC.hint.shadow}`,
  },
  {
    backgroundImage: linearGradient([...ACCENT.primary].reverse() as [string, string], '135deg'),
    boxShadow: `0 12px 22px ${SEMANTIC.primary.shadow}`,
  },
  {
    backgroundImage: linearGradient([...ACCENT.danger].reverse() as [string, string], '135deg'),
    boxShadow: `0 12px 22px ${SEMANTIC.wrong.shadow}`,
  },
] as const;

function ObjectToken({ index }: { index: number }) {
  return (
    <span
      className="inline-block h-11 w-11 rounded-full shadow-lg ring-2 ring-white md:h-12 md:w-12"
      style={OBJECT_TOKEN_STYLE[index % OBJECT_TOKEN_STYLE.length]}
      aria-hidden="true"
    />
  );
}

function ObjectTokenGroup({ count }: { count: number }) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {Array.from({ length: count }, (_, index) => (
        <ObjectToken key={index} index={index} />
      ))}
    </div>
  );
}

function ConcreteView({ question }: { question: Question }) {
  if (question.comparePair) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl bg-emerald-50/80 p-4 ring-2 ring-white">
          <ObjectTokenGroup count={question.comparePair.left} />
        </div>
        <div className="rounded-3xl bg-amber-50/80 p-4 ring-2 ring-white">
          <ObjectTokenGroup count={question.comparePair.right} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex max-w-xl flex-wrap justify-center gap-2">
      {question.objects.map((item, index) => (
        <ObjectToken key={`${item}-${index}`} index={index} />
      ))}
    </div>
  );
}

function CountingBasketView({ question }: { question: Question }) {
  return (
    <div className="relative w-full max-w-xl pt-8">
      <div className="absolute left-1/2 top-0 h-20 w-56 -translate-x-1/2 rounded-t-full border-8 border-amber-300 border-b-0 bg-transparent" />
      <div className="relative mx-auto flex min-h-32 w-full max-w-md flex-wrap items-center justify-center gap-2 rounded-b-3xl rounded-t-xl bg-gradient-to-b from-amber-100 to-orange-200 p-5 shadow-xl shadow-amber-500/20 ring-4 ring-white">
        {question.objects.map((item, index) => (
          <ObjectToken key={`${item}-${index}`} index={index} />
        ))}
      </div>
    </div>
  );
}

function PictorialView({ question }: { question: Question }) {
  if (question.comparePair) {
    return (
      <div className="grid w-full max-w-xl gap-4 md:grid-cols-2">
        {[question.comparePair.left, question.comparePair.right].map((count, row) => (
          <div
            key={`${count}-${row}`}
            className="flex min-h-24 flex-wrap justify-center gap-2 rounded-3xl bg-white/70 p-4 shadow-xl shadow-emerald-500/20 ring-2 ring-white"
          >
            {Array.from({ length: count }, (_, index) => (
              <span
                key={`${row}-${index}`}
                className="h-8 w-8 rounded-full bg-gradient-to-br from-emerald-300 to-teal-500 shadow-xl shadow-emerald-400/40 ring-2 ring-white"
              />
            ))}
          </div>
        ))}
      </div>
    );
  }

  const visibleCount = Math.max(question.objects.length, 1);

  return (
    <div className="flex max-w-xl flex-wrap justify-center gap-3">
      {Array.from({ length: visibleCount }, (_, index) => index + 1).map((dot) => (
        <span
          key={dot}
          className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-300 to-teal-500 shadow-xl shadow-emerald-400/40 ring-2 ring-white"
        />
      ))}
    </div>
  );
}

type BarTone = 'emerald' | 'amber' | 'rose';
type SegmentTone = BarTone | 'empty' | 'ghost';

const SEGMENT_CLASS: Record<SegmentTone, string> = {
  emerald: 'bg-gradient-to-br from-emerald-300 to-teal-500 shadow-emerald-400/30',
  amber: 'bg-gradient-to-br from-amber-300 to-orange-400 shadow-amber-400/30',
  rose: 'bg-gradient-to-br from-rose-300 to-pink-400 shadow-rose-400/30',
  empty: 'border-2 border-dashed border-amber-300 bg-amber-100/35',
  ghost: 'bg-white/35',
};

function TickRow({ max }: { max: number }) {
  return (
    <div
      className="mt-1 grid gap-1 px-1 text-center text-base font-bold leading-none text-emerald-950/65"
      style={{ gridTemplateColumns: `repeat(${max}, minmax(0, 1fr))` }}
      aria-hidden="true"
    >
      {Array.from({ length: max }, (_, index) => (
        <span key={index}>{index + 1}</span>
      ))}
    </div>
  );
}

function SegmentedCells({ tones, max }: { tones: SegmentTone[]; max: number }) {
  return (
    <div
      className="grid gap-1 rounded-2xl bg-white/70 p-1 shadow-inner shadow-emerald-900/5 ring-1 ring-white"
      style={{ gridTemplateColumns: `repeat(${max}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: max }, (_, index) => (
        <span
          key={index}
          className={`flex h-10 items-center justify-center rounded-lg text-base font-bold text-emerald-950/65 shadow-sm md:h-14 ${SEGMENT_CLASS[tones[index] ?? 'ghost']}`}
        >
          {index + 1}
        </span>
      ))}
    </div>
  );
}

function SegmentedBar({
  label,
  count,
  max,
  tone,
  unknown,
  showTicks = false,
}: {
  label: string;
  count: number;
  max: number;
  tone: BarTone;
  unknown?: boolean;
  showTicks?: boolean;
}) {
  const safeCount = Math.min(Math.max(count, 0), max);
  const tones = Array.from({ length: max }, (_, index): SegmentTone => {
    if (index >= safeCount) {
      return 'ghost';
    }

    return unknown ? 'empty' : tone;
  });

  return (
    <div className="rounded-2xl bg-white/55 p-2 ring-1 ring-white/80">
      <div className="mb-1 flex items-center justify-between gap-3 text-base font-bold text-emerald-900/75">
        <span>{label}</span>
        <span className="rounded-full bg-white px-2 py-0.5 text-base text-emerald-950 shadow-sm ring-1 ring-emerald-900/10">
          {unknown ? '?' : safeCount}
        </span>
      </div>
      <SegmentedCells tones={tones} max={max} />
      {showTicks ? <TickRow max={max} /> : null}
    </div>
  );
}

function TotalBar({
  first,
  second,
  max,
  unknownSecond,
}: {
  first: number;
  second: number;
  max: number;
  unknownSecond: boolean;
}) {
  const tones = Array.from({ length: max }, (_, index): SegmentTone => {
    if (index < first) {
      return 'emerald';
    }

    if (index < first + second) {
      return unknownSecond ? 'empty' : 'amber';
    }

    return 'ghost';
  });

  return (
    <div className="rounded-2xl bg-white/65 p-2 ring-2 ring-emerald-100">
      <div className="mb-1 flex items-center justify-between gap-3 text-base font-bold text-emerald-900/75">
        <span>一共</span>
        <span className="rounded-full bg-white px-2 py-0.5 text-base text-emerald-950 shadow-sm ring-1 ring-emerald-900/10">
          {first + second}
        </span>
      </div>
      <SegmentedCells tones={tones} max={max} />
      <TickRow max={max} />
    </div>
  );
}

function CountingBarView({ count }: { count: number }) {
  const max = Math.max(count, 1);

  return (
    <div className="w-full max-w-xl rounded-3xl bg-white/75 p-3 shadow-xl shadow-emerald-500/20 ring-2 ring-white">
      <SegmentedCells
        max={max}
        tones={Array.from({ length: max }, () => 'emerald' as const)}
      />
      <TickRow max={max} />
    </div>
  );
}

function BarModelView({ question }: { question: Question }) {
  if (question.variant === 'matching') {
    return <CountingBarView count={question.answer} />;
  }

  const [first = 0, second = 0] = question.barModel;

  if (question.variant === 'compare' && question.comparePair) {
    const max = Math.max(question.comparePair.left, question.comparePair.right, 1);
    return (
      <div className="w-full max-w-xl space-y-2 rounded-3xl bg-white/55 p-3 shadow-xl shadow-emerald-500/20 ring-2 ring-white">
        <SegmentedBar label="左边" count={question.comparePair.left} max={max} tone="emerald" />
        <SegmentedBar
          label="右边"
          count={question.comparePair.right}
          max={max}
          tone="amber"
          showTicks
        />
      </div>
    );
  }

  const total = Math.max(first + second, 1);
  const max = question.variant === 'makeTen' ? 10 : total;
  const unknownSecond = question.variant === 'makeTen' || question.variant === 'missing';
  const secondLabel = unknownSecond ? '还差' : '又来';

  return (
    <div className="w-full max-w-xl space-y-2 rounded-3xl bg-white/55 p-3 shadow-xl shadow-emerald-500/20 ring-2 ring-white">
      <SegmentedBar label="先有" count={first} max={max} tone="emerald" />
      <SegmentedBar label={secondLabel} count={second} max={max} tone="amber" unknown={unknownSecond} />
      <TotalBar first={first} second={second} max={max} unknownSecond={unknownSecond} />
    </div>
  );
}

function MakeTenBridgeView({
  question,
  reasoningState,
}: {
  question: Question;
  reasoningState: QuestionCardProps['reasoningState'];
}) {
  const [first = 0, second = 0] = question.barModel;
  const bridge = first < 10 ? Math.min(Math.max(10 - first, 0), second) : 0;
  const isInteractiveSplit =
    reasoningState?.mode === 'multiStep' && reasoningState.currentStepIndex === 0;
  const [movedCount, setMovedCount] = useState(0);
  const targetRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMovedCount(0);
  }, [isInteractiveSplit, question.id, reasoningState?.currentStepIndex]);

  const previewBridge = isInteractiveSplit ? Math.min(movedCount, bridge) : bridge;
  const leftover = Math.max(second - previewBridge, 0);
  const dropIntoBridge = (x: number, y: number) => {
    const bounds = targetRef.current?.getBoundingClientRect();
    if (!bounds || movedCount >= bridge) {
      return;
    }

    if (x >= bounds.left && x <= bounds.right && y >= bounds.top && y <= bounds.bottom) {
      setMovedCount((current) => Math.min(current + 1, bridge));
    }
  };

  return (
    <div
      className="w-full max-w-xl space-y-3 rounded-3xl bg-white/60 p-4 shadow-xl shadow-emerald-500/20 ring-2 ring-white"
      data-testid="make-ten-bridge"
    >
      <SegmentedBar label="先有" count={first} max={10} tone="emerald" showTicks />
      <div className="grid gap-3 md:grid-cols-[1.15fr,0.85fr]">
        <div
          ref={targetRef}
          className="rounded-3xl bg-white/75 p-3 shadow-inner shadow-emerald-900/5 ring-2 ring-white"
          data-testid="make-ten-bridge-target"
        >
          <div className="mb-2 flex items-center justify-between gap-3 text-sm font-black text-emerald-900/70 md:text-base">
            <span>把橙色拖过来，先把它凑到 10</span>
            {isInteractiveSplit ? (
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-sm font-black text-emerald-900 shadow-sm ring-1 ring-emerald-100"
                onClick={() => setMovedCount(0)}
                data-testid="make-ten-bridge-reset"
              >
                <RotateCcw size={14} strokeWidth={2.8} />
                重来
              </button>
            ) : null}
          </div>
          <SegmentedCells
            max={10}
            tones={Array.from({ length: 10 }, (_, index) => {
              if (index < first) {
                return 'emerald' as const;
              }
              if (index < first + previewBridge) {
                return 'amber' as const;
              }
              return 'empty' as const;
            })}
          />
          <TickRow max={10} />
        </div>
        <div className="rounded-3xl bg-amber-50/90 p-3 shadow-lg shadow-amber-400/10 ring-2 ring-white">
          <div className="mb-2 text-left text-sm font-black text-amber-900/75 md:text-base">
            剩下的小果子
          </div>
          <div className="flex min-h-28 flex-wrap justify-center gap-2">
            {Array.from({ length: Math.max(leftover, 0) }, (_, index) => (
              <motion.button
                key={`${question.id}-leftover-${index}`}
                type="button"
                drag={isInteractiveSplit}
                dragSnapToOrigin
                dragMomentum={false}
                whileTap={{ scale: 0.94 }}
                whileHover={isInteractiveSplit ? { scale: 1.06, y: -4 } : undefined}
                onClick={() => {
                  if (!isInteractiveSplit) {
                    return;
                  }
                  setMovedCount((current) => Math.min(current + 1, bridge));
                }}
                onDragEnd={(_, info) => dropIntoBridge(info.point.x, info.point.y)}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-orange-400 shadow-lg shadow-amber-300/40 ring-2 ring-white md:h-12 md:w-12"
                aria-label="拖动或轻点小果子去凑十"
                data-testid="make-ten-leftover-token"
              />
            ))}
          </div>
          <p
            className="mt-3 rounded-2xl bg-white/72 px-3 py-2 text-sm font-black leading-snug text-amber-900 shadow-sm ring-1 ring-white/90"
            data-testid="make-ten-bridge-status"
          >
            {isInteractiveSplit
              ? previewBridge >= bridge
                ? `刚好凑到 10 啦，还剩 ${leftover} 个。`
                : `先试试看，要拖几个过去才刚刚好？`
              : `先用 ${bridge} 个把它凑到 10，再剩下 ${leftover} 个。`}
          </p>
        </div>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        <div className="rounded-2xl bg-emerald-50/90 px-4 py-3 text-left shadow-lg shadow-emerald-500/10 ring-2 ring-white">
          <div className="text-sm font-black text-emerald-900/65">先凑到 10</div>
          <div className="mt-1 text-2xl font-black text-emerald-950">{previewBridge}</div>
        </div>
        <div className="rounded-2xl bg-amber-50/90 px-4 py-3 text-left shadow-lg shadow-amber-500/10 ring-2 ring-white">
          <div className="text-sm font-black text-amber-900/70">还剩下</div>
          <div className="mt-1 text-2xl font-black text-amber-950">{leftover}</div>
        </div>
      </div>
    </div>
  );
}

function NumberLineView({ question }: { question: Question }) {
  if (!question.numberLine) {
    return null;
  }

  const steps = Array.from(
    { length: question.numberLine.end - question.numberLine.start + 1 },
    (_, index) => question.numberLine!.start + index,
  );

  return (
    <div className="w-full max-w-xl rounded-3xl bg-white/70 p-5 shadow-xl shadow-emerald-500/20 ring-2 ring-white">
      <div className="flex items-center justify-between">
        {steps.map((step) => (
          <div key={step} className="flex flex-col items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center text-child-leaf" aria-hidden="true">
              {step === question.numberLine!.start ? (
                <Flag size={26} strokeWidth={3} fill="currentColor" />
              ) : step === question.numberLine!.end ? (
                <Star size={26} strokeWidth={3} fill="currentColor" />
              ) : (
                <span className="h-2.5 w-2.5 rounded-full bg-current" />
              )}
            </span>
            <span className="text-base font-black text-emerald-900">{step}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LearningRepresentation({ question }: { question: Question }) {
  if (question.reasoning?.kind === 'multiStep' && question.reasoning.strategy === 'makeTen') {
    return <MakeTenBridgeView question={question} reasoningState={null} />;
  }

  if (question.reasoning?.kind === 'narration' && question.reasoning.strategy === 'makeTen') {
    return <MakeTenBridgeView question={question} reasoningState={null} />;
  }

  if (question.variant === 'numberLine') {
    return <NumberLineView question={question} />;
  }

  if (question.variant === 'matching') {
    return (
      <div className="flex w-full flex-col items-center gap-4">
        <CountingBasketView question={question} />
        {question.level >= 2 ? <PictorialView question={question} /> : null}
        {question.level >= 3 ? <CountingBarView count={question.answer} /> : null}
      </div>
    );
  }

  if (question.level === 1) {
    return <ConcreteView question={question} />;
  }

  if (question.level === 2) {
    return <PictorialView question={question} />;
  }

  return <BarModelView question={question} />;
}

function ReasoningPanel({
  reasoningState,
}: {
  reasoningState: NonNullable<QuestionCardProps['reasoningState']>;
}) {
  return (
    <div
      className="w-full max-w-3xl rounded-3xl bg-white/72 p-4 text-left shadow-xl shadow-amber-500/10 ring-2 ring-white md:p-5"
      data-testid="reasoning-panel"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 text-base font-black text-emerald-950/70 md:text-lg">
        <span>{reasoningState.title}</span>
        <span>
          {reasoningState.mode === 'multiStep'
            ? `${reasoningState.currentStepIndex + 1}/${reasoningState.totalSteps}`
            : '说一说'}
        </span>
      </div>
      <div
        className="mt-3 grid gap-2"
        style={{
          gridTemplateColumns: `repeat(${Math.max(reasoningState.totalSteps, 1)}, minmax(0, 1fr))`,
        }}
      >
        {Array.from({ length: reasoningState.totalSteps }, (_, index) => (
          <span
            key={index}
            className={`h-3 rounded-full ring-1 ring-white ${
              index <= reasoningState.currentStepIndex ? 'bg-child-sun' : 'bg-child-mint'
            }`}
          />
        ))}
      </div>
      <p className="mt-4 text-2xl font-black leading-tight text-emerald-950 md:text-3xl">
        {reasoningState.stepStem}
      </p>
      {reasoningState.hintText ? (
        <p className="mt-4 rounded-2xl bg-orange-100/90 px-4 py-3 text-lg font-black leading-snug text-orange-900 shadow-lg shadow-orange-300/10 ring-2 ring-white/90">
          {reasoningState.hintText}
        </p>
      ) : null}
    </div>
  );
}

function QuestionCardComponent({ question, answered, reasoningState = null }: QuestionCardProps) {
  const reduceMotion = useReducedMotion();
  const shouldCelebrate = answered && !reduceMotion;

  return (
    <motion.div
      key={question.id}
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.86, y: 32 }}
      animate={
        shouldCelebrate
          ? {
              opacity: 1,
              ...CARD_SUCCESS_MOTION,
            }
          : { opacity: 1, scale: 1, x: 0, y: 0, rotate: 0 }
      }
      transition={shouldCelebrate ? CARD_SUCCESS_TIMING : SPRING.enter}
      className="ipad-question-card relative mx-auto w-full max-w-4xl"
    >
      <motion.div
        animate={shouldCelebrate ? CARD_BODY_SUCCESS_MOTION : { opacity: 1, scale: 1 }}
        transition={shouldCelebrate ? CARD_SUCCESS_TIMING : SPRING.enter}
        style={{ boxShadow: SHADOW.mint }}
        className={`${CARD} flex w-full flex-col items-center gap-5 rounded-3xl p-5 text-center ring-2 ring-white md:gap-6 md:p-8`}
      >
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Badge>Level {question.level}</Badge>
          <Badge>{VARIANT_LABEL[question.variant]}</Badge>
        </div>

        {question.reasoning?.strategy === 'makeTen' ? (
          <MakeTenBridgeView question={question} reasoningState={reasoningState} />
        ) : (
          <LearningRepresentation question={question} />
        )}

        <motion.h1
          key={question.expression}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={SPRING.bounce}
          className={`break-words text-5xl font-extrabold leading-tight tracking-normal md:text-6xl ${TEXT_GRADIENT}`}
        >
          {question.expression}
        </motion.h1>

        <p className="max-w-3xl rounded-full bg-white/70 px-5 py-2 text-lg font-black leading-tight text-emerald-950/80 ring-2 ring-white/80 md:text-2xl">
          {question.prompt}
        </p>

        {reasoningState ? <ReasoningPanel reasoningState={reasoningState} /> : null}
      </motion.div>
    </motion.div>
  );
}

export const QuestionCard = memo(QuestionCardComponent);
