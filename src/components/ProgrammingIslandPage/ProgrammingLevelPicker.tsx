import { memo } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Lock, Route } from 'lucide-react';
import { PROGRAMMING_LEVELS } from '../../programming/programmingLevels';
import { SPRING } from '../../theme/springs';

interface ProgrammingLevelPickerProps {
  levelIndex: number;
  visibleUnlockedLevelCount: number;
  completedLevelIds: Set<string>;
  onGoToLevel: (index: number) => void;
}

function ProgrammingLevelPickerComponent({
  levelIndex,
  visibleUnlockedLevelCount,
  completedLevelIds,
  onGoToLevel,
}: ProgrammingLevelPickerProps) {
  return (
    <section className="mt-4 rounded-[2rem] border border-white/70 bg-white/90 p-5 shadow-sm ring-1 ring-emerald-900/10 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-sm font-black text-emerald-700/80">关卡</div>
          <h2 className="text-4xl font-black text-emerald-950">编程概念</h2>
        </div>
        <div className="rounded-full bg-emerald-50 px-4 py-2 text-base font-black text-emerald-800 ring-1 ring-emerald-100">
          顺序 · 条件 · 循环 · 过程
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {PROGRAMMING_LEVELS.map((item, index) => {
          const isActive = index === levelIndex;
          const isCompleted = completedLevelIds.has(item.id);
          const isLocked = index >= visibleUnlockedLevelCount;

          return (
            <motion.button
              key={item.id}
              type="button"
              whileHover={isLocked ? undefined : { y: -4 }}
              whileTap={isLocked ? undefined : { scale: 0.97 }}
              transition={SPRING.bounce}
              onClick={() => onGoToLevel(index)}
              aria-disabled={isLocked}
              className={`min-h-32 rounded-[1.5rem] p-4 text-left shadow-sm ring-2 ${
                isActive
                  ? 'bg-emerald-600 text-white ring-emerald-300'
                  : isLocked
                    ? 'bg-slate-50/82 text-slate-500 ring-slate-100'
                    : isCompleted
                      ? 'bg-emerald-50 text-emerald-950 ring-emerald-200'
                      : 'bg-white/82 text-emerald-950 ring-white'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-black opacity-75">
                  第 {index + 1} 关
                </div>
                {isLocked ? (
                  <Lock size={20} strokeWidth={3.2} />
                ) : isCompleted ? (
                  <CheckCircle2 size={20} strokeWidth={3.2} />
                ) : (
                  <Route size={20} strokeWidth={3.2} />
                )}
              </div>
              <div className="mt-2 text-2xl font-black">{item.title}</div>
              <div className="mt-3 inline-flex rounded-full bg-white/30 px-3 py-1 text-sm font-black ring-1 ring-current/20">
                {isLocked ? '未解锁' : item.concept}
              </div>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}

export const ProgrammingLevelPicker = memo(ProgrammingLevelPickerComponent);
