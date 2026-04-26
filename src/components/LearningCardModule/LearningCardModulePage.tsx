import { motion } from 'framer-motion';
import { BookOpen, CheckCircle2, MessageCircle, Sparkles } from 'lucide-react';
import type { LearningCard } from '../../learningCards/types';
import { SPRING } from '../../theme/springs';
import { BigButton } from '../_primitives/BigButton';

interface LearningCardModuleLabels {
  moduleEyebrow: string;
  moduleTitle: string;
  countLabel: string;
  primaryLabel: string;
  phoneticLabel: string;
  graphicLabel: string;
  wordsLabel: string;
  gridEyebrow: string;
  gridTitle: string;
  speakLabel: string;
}

interface LearningCardModulePageProps<TCard extends LearningCard> {
  cards: TCard[];
  selectedCard: TCard;
  labels: LearningCardModuleLabels;
  onSelectCard: (card: TCard) => void;
  onSpeakCard: (card: TCard) => void;
}

function WordChip({ text, pinyin, phonetic }: LearningCard['words'][number]) {
  return (
    <div className="rounded-2xl bg-white/86 p-4 shadow-sm ring-1 ring-emerald-900/10">
      <div className="text-3xl font-black leading-none text-emerald-950">{text}</div>
      <div className="mt-2 text-lg font-black tracking-normal text-emerald-700/78">
        {pinyin ?? phonetic}
      </div>
    </div>
  );
}

function GlyphCard<TCard extends LearningCard>({
  card,
  active,
  onSelect,
}: {
  card: TCard;
  active: boolean;
  onSelect: (card: TCard) => void;
}) {
  return (
    <motion.button
      type="button"
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.97 }}
      transition={SPRING.bounce}
      onClick={() => onSelect(card)}
      aria-pressed={active}
      className={`relative flex min-h-36 flex-col overflow-hidden rounded-[1.5rem] bg-gradient-to-br ${card.tone} p-4 text-left shadow-sm ring-2 ${
        active ? 'ring-emerald-500 shadow-emerald-300/35' : 'ring-white/80'
      }`}
    >
      <span className="absolute right-3 top-3 text-4xl">{card.graphic}</span>
      <span className="text-5xl font-black leading-none text-emerald-950">
        {card.glyph}
      </span>
      <span className="mt-2 text-base font-black tracking-normal text-emerald-700/85">
        {card.phonetic}
      </span>
      <span className="mt-auto inline-flex w-fit items-center rounded-full bg-white/82 px-3 py-1 text-sm font-black text-emerald-800 ring-1 ring-white">
        {card.words[0]?.text}
      </span>
      {active ? (
        <span className="absolute bottom-3 right-3 text-emerald-700">
          <CheckCircle2 size={22} strokeWidth={3} />
        </span>
      ) : null}
    </motion.button>
  );
}

export function LearningCardModulePage<TCard extends LearningCard>({
  cards,
  selectedCard,
  labels,
  onSelectCard,
  onSpeakCard,
}: LearningCardModulePageProps<TCard>) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={SPRING.smooth}
      className="relative z-10 mx-auto w-full max-w-7xl pb-24"
    >
      <section className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-white/88 p-5 shadow-[0_24px_80px_rgba(15,118,110,0.14)] ring-1 ring-emerald-900/5 backdrop-blur-xl md:p-6">
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-black text-emerald-700/80">
              {labels.moduleEyebrow}
            </div>
            <h1 className="truncate text-4xl font-black leading-tight text-emerald-950">
              {labels.moduleTitle}
            </h1>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-base font-black text-emerald-800 ring-1 ring-emerald-100">
            <BookOpen size={20} strokeWidth={3.2} />
            {labels.countLabel} {cards.length} 张
          </div>
        </div>

        <div className="relative mt-5 grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
          <div
            className={`rounded-[2rem] bg-gradient-to-br ${selectedCard.tone} p-5 shadow-sm ring-1 ring-white/80`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-sm font-black text-emerald-700/85">
                  <Sparkles size={18} strokeWidth={3} />
                  {labels.primaryLabel}
                </div>
                <h1 className="mt-3 text-[9rem] font-black leading-none tracking-normal text-emerald-950 md:text-[12rem]">
                  {selectedCard.glyph}
                </h1>
              </div>
              <div className="rounded-[2rem] bg-white/70 px-4 py-3 text-center shadow-sm ring-1 ring-white">
                <div className="text-sm font-black text-emerald-700/75">
                  {labels.phoneticLabel}
                </div>
                <div className="mt-1 text-4xl font-black tracking-normal text-emerald-950">
                  {selectedCard.phonetic}
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-[1.5rem] bg-white/58 p-4 text-2xl font-black leading-snug text-emerald-950 ring-1 ring-white/80">
              {selectedCard.sentence}
            </div>

            <BigButton
              type="button"
              tone="success"
              onClick={() => onSpeakCard(selectedCard)}
              className="mt-5 flex w-full items-center justify-center gap-3 rounded-[1.5rem] bg-emerald-600 px-6 py-4 text-2xl text-white shadow-lg shadow-emerald-900/15 ring-white"
            >
              <MessageCircle size={30} strokeWidth={3.2} />
              {labels.speakLabel}
            </BigButton>
          </div>

          <div className="grid min-w-0 gap-4">
            <div className="rounded-[2rem] bg-white/88 p-5 shadow-sm ring-1 ring-emerald-900/10">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-black text-emerald-700/80">
                    {labels.graphicLabel}
                  </div>
                  <h2 className="text-4xl font-black text-emerald-950">
                    {selectedCard.imageLabel}
                  </h2>
                </div>
                <div className="flex h-32 w-32 items-center justify-center rounded-[2rem] bg-emerald-50 text-5xl shadow-inner ring-1 ring-emerald-100">
                  {selectedCard.graphic}
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] bg-white/88 p-5 shadow-sm ring-1 ring-emerald-900/10">
              <div className="text-sm font-black text-emerald-700/80">
                {labels.wordsLabel}
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                {selectedCard.words.map((word) => (
                  <WordChip
                    key={`${selectedCard.id}-${word.text}`}
                    text={word.text}
                    pinyin={word.pinyin}
                    phonetic={word.phonetic}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-4 rounded-[2rem] border border-white/70 bg-white/90 p-5 shadow-sm ring-1 ring-emerald-900/10 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-black text-emerald-700/80">
              {labels.gridEyebrow}
            </div>
            <h2 className="text-4xl font-black text-emerald-950">
              {labels.gridTitle}
            </h2>
          </div>
          <div className="rounded-full bg-emerald-50 px-4 py-2 text-base font-black text-emerald-800 ring-1 ring-emerald-100">
            {cards.findIndex((card) => card.id === selectedCard.id) + 1}/{cards.length}
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {cards.map((card) => (
            <GlyphCard
              key={card.id}
              card={card}
              active={card.id === selectedCard.id}
              onSelect={onSelectCard}
            />
          ))}
        </div>
      </section>
    </motion.section>
  );
}
