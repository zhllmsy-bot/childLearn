import { memo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Flag, Star } from 'lucide-react';
import type { Question } from '../../curriculum/types';
import { SPRING } from '../../theme/springs';
import { CARD, SHADOW, TEXT_GRADIENT } from '../../theme/tokens';
import { Badge } from '../_primitives/Badge';

interface QuestionCardProps {
  question: Question;
  answered: boolean;
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

const OBJECT_TOKEN_CLASS = [
  'from-[#7FC86A] to-[#3EA02D] shadow-[#3EA02D]/28',
  'from-[#FFD257] to-[#FFB200] shadow-[#FFB200]/30',
  'from-[#7BBBFF] to-[#2E8CF0] shadow-[#2E8CF0]/24',
  'from-[#FFA47A] to-[#F77444] shadow-[#F77444]/22',
] as const;

function ObjectToken({ index }: { index: number }) {
  return (
    <span
      className={`inline-block h-11 w-11 rounded-full bg-gradient-to-br shadow-lg ring-2 ring-white md:h-12 md:w-12 ${
        OBJECT_TOKEN_CLASS[index % OBJECT_TOKEN_CLASS.length]
      }`}
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
            <span className="flex h-8 w-8 items-center justify-center text-[#3EA02D]" aria-hidden="true">
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

function QuestionCardComponent({ question, answered }: QuestionCardProps) {
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
        className={`${CARD} ${SHADOW.mint} flex w-full flex-col items-center gap-5 rounded-3xl p-5 text-center ring-2 ring-white md:gap-6 md:p-8`}
      >
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Badge>Level {question.level}</Badge>
          <Badge>{VARIANT_LABEL[question.variant]}</Badge>
        </div>

        <LearningRepresentation question={question} />

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
      </motion.div>
    </motion.div>
  );
}

export const QuestionCard = memo(QuestionCardComponent);
