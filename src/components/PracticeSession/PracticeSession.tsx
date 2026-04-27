import { Award, Gem, Sparkles, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Question, QuestionOption } from '../../curriculum/types';
import { HintLadder } from '../../curriculum/scaffolding/HintLadder';
import { SPRING } from '../../theme/springs';
import { OptionButton, type OptionVisualState } from '../OptionButton/OptionButton';
import { QuestionCard } from '../QuestionCard/QuestionCard';
import { Stat } from '../Stat/Stat';

interface PracticeSessionProps {
  question: Question;
  answered: boolean;
  hintStage: number;
  reasoningState?: {
    currentStepIndex: number;
    hintText?: string | null;
    mode: 'multiStep' | 'narration';
    stepStem: string;
    totalSteps: number;
    title: string;
  } | null;
  levelProgress: number;
  levelQuestionGoal: number;
  optionStates: { option: QuestionOption; state: OptionVisualState }[];
  rankName: string;
  rankStars: string;
  stickerCount: number;
  stickerTotal: number;
  difficulty: number;
  onSelect: (option: QuestionOption) => void;
}

function LevelProgressStrip({ current, total }: { current: number; total: number }) {
  const safeCurrent = Math.min(Math.max(current, 0), total);

  return (
    <div className="mx-auto w-full rounded-3xl bg-white/88 p-4 shadow-lg shadow-emerald-500/10 ring-2 ring-white backdrop-blur-xl">
      <div className="mb-3 flex items-center justify-between gap-3 text-base font-black text-child-ink">
        <span>本关</span>
        <span>{safeCurrent}/{total}</span>
      </div>
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: total }, (_, index) => (
          <span
            key={index}
            className={`h-5 rounded-full ring-1 ring-white ${
              index < safeCurrent ? 'bg-child-leaf' : 'bg-child-mint'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

export function PracticeSession({
  question,
  answered,
  hintStage,
  reasoningState = null,
  levelProgress,
  levelQuestionGoal,
  optionStates,
  rankName,
  rankStars,
  stickerCount,
  stickerTotal,
  difficulty,
  onSelect,
}: PracticeSessionProps) {
  return (
    <motion.section
      key="practice"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -14 }}
      transition={SPRING.smooth}
      className="ipad-practice-grid relative z-10 mx-auto grid w-full max-w-7xl gap-5 pb-24"
    >
      <div className="flex min-w-0 flex-col gap-5">
        <QuestionCard
          question={question}
          answered={answered}
          reasoningState={reasoningState}
        />
        <HintLadder question={question} stage={hintStage} />
      </div>

      <aside className="ipad-answer-rail flex min-w-0 flex-col gap-4">
        <LevelProgressStrip current={levelProgress} total={levelQuestionGoal} />

        <div className="ipad-options-grid mx-auto grid w-full gap-4">
          {optionStates.map(({ option, state }, index) => (
            <OptionButton
              key={`${question.id}-${option.id}`}
              option={option}
              state={state}
              paletteIndex={index}
              visualEmoji="•"
              onSelect={onSelect}
            />
          ))}
        </div>

        <div className="ipad-session-stats mx-auto grid w-full gap-3">
          <Stat label="段位" value={rankName}>
            <Award size={28} strokeWidth={3.2} />
          </Stat>
          <Stat label="小星" value={rankStars}>
            <Star size={28} strokeWidth={3.2} />
          </Stat>
          <Stat label="伙伴贴纸" value={`${stickerCount}/${stickerTotal}`}>
            <Sparkles size={28} strokeWidth={3.2} />
          </Stat>
          <Stat label="难度" value={String(difficulty)}>
            <Gem size={28} strokeWidth={3.2} />
          </Stat>
        </div>
      </aside>
    </motion.section>
  );
}
