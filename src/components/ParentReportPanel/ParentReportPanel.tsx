import { AnimatePresence, motion } from 'framer-motion';
import { Printer, X } from 'lucide-react';
import { useMemo } from 'react';
import { describeFactId } from '../../curriculum/factLabels';
import type { ReviewItem } from '../../curriculum/reviewQueue';
import type {
  AbilityAssessment,
  AbilitySkillAssessment,
  AbilitySkillStatus,
} from '../../engagement/ability/abilityProfile';
import type { Skin } from '../../engagement/skin/useSkinUnlock';
import type { Sticker } from '../../engagement/collection/useStickers';
import { createLearningHistorySummary } from '../../engagement/report/learningHistory';
import { zhCN } from '../../i18n/zh-CN';
import { SPRING } from '../../theme/springs';
import { StickerArtwork } from '../_primitives/StickerArtwork';

interface ParentReportPanelProps {
  open: boolean;
  onClose: () => void;
  correct: number;
  attempted: number;
  maxCombo: number;
  rankName: string;
  difficulty: number;
  reviewQueue: ReviewItem[];
  skins: Skin[];
  stickers: Sticker[];
  stickerTotal: number;
  abilityAssessment?: AbilityAssessment;
  flowState?: string | null;
  flowAction?: string | null;
  flowRationale?: string | null;
  flowObserverStatus?: string | null;
  flowObserverReason?: string | null;
  flowObserverIssue?: string | null;
}

const FLOW_STATE_LABELS: Record<string, string> = {
  easy: '偏简单',
  flow: '节奏合适',
  stretch: '略有挑战',
  hard: '明显偏难',
  fatigue: '可能疲劳',
};

const FLOW_ACTION_LABELS: Record<string, string> = {
  increase_challenge_ratio: '增加少量挑战',
  maintain: '保持当前节奏',
  maintain_with_support: '保留目标并增加辅助',
  decrease_pressure: '降低压力并恢复信心',
  fatigue_recovery: '减少压力和题量',
  item_review: '检查题目质量',
};

const FLOW_OBSERVER_STATUS_LABELS: Record<string, string> = {
  unconfigured: '未配置观察员',
  idle: '等待本关完成',
  pending: '观察员分析中',
  ready: '观察员已参与',
  failed: '观察员暂不可用',
};

const FLOW_ISSUE_LABELS: Record<string, string> = {
  skill_gap: '知识点缺口',
  cognitive_load: '认知负担偏高',
  attention_drop: '注意力下降',
  fatigue: '可能疲劳',
  ui_confusion: '界面理解困难',
  item_design_problem: '题目设计需检查',
  careless_or_motor_error: '手滑或粗心',
  uncertain: '证据不足',
};

const ABILITY_STATUS_LABELS: Record<AbilitySkillStatus, string> = {
  mastered: '已稳定',
  stable: '比较稳',
  developing: '正在学习',
  challenging: '偏难',
  observing: '观察中',
};

const ABILITY_STATUS_CLASS: Record<AbilitySkillStatus, string> = {
  mastered: 'bg-emerald-50 text-emerald-900 ring-emerald-100',
  stable: 'bg-sky-50 text-sky-900 ring-sky-100',
  developing: 'bg-amber-50 text-amber-900 ring-amber-100',
  challenging: 'bg-rose-50 text-rose-900 ring-rose-100',
  observing: 'bg-slate-50 text-slate-800 ring-slate-100',
};

const FOCUS_SKILL_LABELS: Record<string, string> = {
  'operation:matching': '数量配对',
  'operation:compare': '比较大小',
  'operation:addition': '加法理解',
  'operation:subtraction': '数轴距离',
  'operation:mixed': '加减混合',
  'presentation:visual': '图形题',
  'presentation:semi_visual': '半图形半数字',
  'presentation:pure_number': '纯数字题',
  'presentation:story': '故事题',
  'presentation:number_line': '数轴题',
  'range:within_5': '5以内数量',
  'range:within_10': '10以内数量',
  'range:within_20': '20以内数量',
  'range:within_30': '30以内数量',
};

function formatDelta(value: number, suffix = '') {
  if (value > 0) {
    return `+${value}${suffix}`;
  }

  return `${value}${suffix}`;
}

function AbilitySkillPill({ skill }: { skill: AbilitySkillAssessment }) {
  return (
    <div
      className={`rounded-2xl px-3 py-2 ring-1 ${ABILITY_STATUS_CLASS[skill.status]}`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-black">{skill.label}</span>
        <span className="shrink-0 text-xs font-black">
          {ABILITY_STATUS_LABELS[skill.status]}
        </span>
      </div>
      <div className="mt-1 text-xs font-bold opacity-80">
        {skill.category} · 首次 {Math.round(skill.firstTryAccuracy * 100)}% ·{' '}
        {skill.attempts} 题
      </div>
    </div>
  );
}

export function ParentReportPanel({
  open,
  onClose,
  correct,
  attempted,
  maxCombo,
  rankName,
  difficulty,
  reviewQueue,
  skins,
  stickers,
  stickerTotal,
  abilityAssessment,
  flowState,
  flowAction,
  flowRationale,
  flowObserverStatus,
  flowObserverReason,
  flowObserverIssue,
}: ParentReportPanelProps) {
  const accuracy = attempted === 0 ? 100 : Math.round((correct / attempted) * 100);
  const unlockedSkins = skins.filter((skin) => skin.unlocked);
  const historySummary = useMemo(
    () => (open ? createLearningHistorySummary() : null),
    [open],
  );
  const suggestedMinutes =
    historySummary && historySummary.today.attempted >= 12
      ? '今天已经够了，明天 8 分钟轻复习'
      : '建议今天 8-12 分钟，优先做巩固包';
  const handlePrint = () => {
    window.print();
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.aside
          initial={{ opacity: 0, x: 80 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 80 }}
          transition={SPRING.smooth}
	          className="parent-report-panel fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col overflow-hidden rounded-l-3xl bg-white/95 shadow-2xl shadow-emerald-500/30 ring-2 ring-white backdrop-blur-xl"
        >
          <div className="flex items-center justify-between gap-4 border-b-4 border-emerald-100 px-6 py-5">
            <div>
	              <div className="text-sm font-bold text-emerald-700">
	                {zhCN.parentReport.todayBrief}
	              </div>
	              <h2 className="text-4xl font-black text-emerald-950">
	                {zhCN.parentReport.title}
	              </h2>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handlePrint}
                aria-label={zhCN.parentReport.printLabel}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-50 text-sky-800 shadow-xl shadow-sky-500/10 ring-2 ring-white"
              >
                <Printer size={24} strokeWidth={3.2} />
              </button>
              <button
                type="button"
                onClick={onClose}
                aria-label="关闭家长报告"
                className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-800 shadow-xl shadow-emerald-500/20 ring-2 ring-white"
              >
                <X size={28} strokeWidth={3.2} />
              </button>
            </div>
          </div>

          <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
            <section className="grid grid-cols-2 gap-3">
              <div className="rounded-3xl bg-emerald-50 p-4 ring-2 ring-emerald-100">
                <div className="text-sm font-bold text-emerald-700">答对</div>
                <div className="text-3xl font-black text-emerald-950">
                  {correct} / {attempted}
                </div>
              </div>
              <div className="rounded-3xl bg-amber-50 p-4 ring-2 ring-amber-100">
                <div className="text-sm font-bold text-amber-700">正确率</div>
                <div className="text-3xl font-black text-amber-950">{accuracy}%</div>
              </div>
              <div className="rounded-3xl bg-rose-50 p-4 ring-2 ring-rose-100">
                <div className="text-sm font-bold text-rose-700">最高连击</div>
                <div className="text-3xl font-black text-rose-950">{maxCombo}</div>
              </div>
              <div className="rounded-3xl bg-sky-50 p-4 ring-2 ring-sky-100">
                <div className="text-sm font-bold text-sky-700">DDA 难度</div>
                <div className="text-3xl font-black text-sky-950">{difficulty}</div>
              </div>
            </section>

            {historySummary ? (
              <section className="space-y-3">
                <h3 className="text-2xl font-black text-emerald-950">
                  {zhCN.parentReport.weeklyProgress}
                </h3>
                <div className="rounded-3xl bg-white p-4 shadow-xl shadow-emerald-500/10 ring-2 ring-emerald-100">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-emerald-50 p-3 ring-1 ring-emerald-100">
                      <div className="text-sm font-bold text-emerald-700">本周完成</div>
                      <div className="text-2xl font-black text-emerald-950">
                        {historySummary.thisWeek.attempted} 题
                      </div>
                      <div className="text-sm font-black text-emerald-700/75">
                        {formatDelta(historySummary.weeklyAttemptDelta, ' 题')} vs 上周
                      </div>
                    </div>
                    <div className="rounded-2xl bg-sky-50 p-3 ring-1 ring-sky-100">
                      <div className="text-sm font-bold text-sky-700">本周正确率</div>
                      <div className="text-2xl font-black text-sky-950">
                        {historySummary.thisWeek.accuracy}%
                      </div>
                      <div className="text-sm font-black text-sky-700/75">
                        {formatDelta(historySummary.weeklyAccuracyDelta, '%')} vs 上周
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 rounded-2xl bg-amber-50 px-3 py-2 text-sm font-black leading-relaxed text-amber-900 ring-1 ring-amber-100">
                    {suggestedMinutes}
                  </div>
                  {historySummary.focusSkills.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {historySummary.focusSkills.map((skill) => (
                        <span
                          key={skill.key}
                          className="rounded-full bg-white px-3 py-1 text-xs font-black text-emerald-800 ring-1 ring-emerald-100"
                        >
                          {FOCUS_SKILL_LABELS[skill.key] ?? skill.key} ×{skill.count}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </section>
            ) : null}

            {flowState || flowAction ? (
              <section className="space-y-3">
                <h3 className="text-2xl font-black text-emerald-950">心流观察</h3>
                <div className="rounded-3xl bg-white p-4 shadow-xl shadow-emerald-500/10 ring-2 ring-emerald-100">
                  <div className="grid gap-3">
                    <div>
                      <div className="text-sm font-bold text-emerald-700">当前状态</div>
                      <div className="text-xl font-black text-emerald-950">
                        {flowState
                          ? (FLOW_STATE_LABELS[flowState] ?? flowState)
                          : '等待本关完成'}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-sky-700">安全策略</div>
                      <div className="text-lg font-black text-sky-950">
                        {flowAction
                          ? (FLOW_ACTION_LABELS[flowAction] ?? flowAction)
                          : '暂未生成'}
                      </div>
                    </div>
                    {flowRationale ? (
                      <p className="text-sm font-bold leading-relaxed text-emerald-800/80">
                        {flowRationale}
                      </p>
                    ) : null}
                    <div className="rounded-2xl bg-emerald-50 px-3 py-2 ring-1 ring-emerald-100">
                      <div className="text-sm font-bold text-emerald-700">
                        大模型观察员
                      </div>
                      <div className="text-base font-black text-emerald-950">
                        {flowObserverStatus
                          ? (FLOW_OBSERVER_STATUS_LABELS[flowObserverStatus] ??
                            flowObserverStatus)
                          : '未配置观察员'}
                      </div>
                      {flowObserverIssue ? (
                        <div className="mt-1 text-sm font-bold text-sky-800">
                          {FLOW_ISSUE_LABELS[flowObserverIssue] ?? flowObserverIssue}
                        </div>
                      ) : null}
                      {flowObserverReason ? (
                        <p className="mt-1 text-sm font-bold leading-relaxed text-emerald-800/80">
                          {flowObserverReason}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              </section>
            ) : null}

            {abilityAssessment ? (
              <section className="space-y-3">
                <h3 className="text-2xl font-black text-emerald-950">能力画像</h3>
                <div className="rounded-3xl bg-white p-4 shadow-xl shadow-emerald-500/10 ring-2 ring-emerald-100">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-bold text-emerald-700">累计完成</div>
                      <div className="text-2xl font-black text-emerald-950">
                        {abilityAssessment.totalCompletedQuestions} 题
                      </div>
                    </div>
                    <div className="rounded-full bg-emerald-50 px-3 py-2 text-sm font-black text-emerald-900 ring-1 ring-emerald-100">
                      {ABILITY_STATUS_LABELS[abilityAssessment.readiness]}
                    </div>
                  </div>

                  <div className="mt-4 space-y-4">
                    {abilityAssessment.mastered.length > 0 ||
                    abilityAssessment.stable.length > 0 ? (
                      <div>
                        <div className="mb-2 text-sm font-black text-emerald-700">
                          稳定能力
                        </div>
                        <div className="grid gap-2">
                          {[...abilityAssessment.mastered, ...abilityAssessment.stable]
                            .slice(0, 4)
                            .map((skill) => (
                              <AbilitySkillPill key={skill.key} skill={skill} />
                            ))}
                        </div>
                      </div>
                    ) : null}

                    {abilityAssessment.focus.length > 0 ? (
                      <div>
                        <div className="mb-2 text-sm font-black text-amber-700">
                          需要关注
                        </div>
                        <div className="grid gap-2">
                          {abilityAssessment.focus.slice(0, 4).map((skill) => (
                            <AbilitySkillPill key={skill.key} skill={skill} />
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {abilityAssessment.observing.length > 0 ? (
                      <div>
                        <div className="mb-2 text-sm font-black text-slate-600">
                          继续观察
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {abilityAssessment.observing.slice(0, 6).map((skill) => (
                            <span
                              key={skill.key}
                              className="rounded-full bg-slate-50 px-3 py-1 text-xs font-black text-slate-700 ring-1 ring-slate-100"
                            >
                              {skill.label}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </section>
            ) : null}

            <section className="space-y-3">
              <h3 className="text-2xl font-black text-emerald-950">段位与皮肤</h3>
              <div className="rounded-3xl bg-white p-4 shadow-xl shadow-emerald-500/10 ring-2 ring-emerald-100">
                <div className="text-xl font-black text-emerald-950">{rankName}</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {unlockedSkins.map((skin) => (
                    <span
                      key={skin.id}
                      className={`rounded-full bg-gradient-to-r ${skin.gradient} px-3 py-1 text-sm font-black text-emerald-950 ring-2 ring-white`}
                    >
                      {skin.name}
                    </span>
                  ))}
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-2xl font-black text-emerald-950">奥特贴纸图鉴</h3>
              <div className="rounded-3xl bg-white p-4 shadow-xl shadow-emerald-500/10 ring-2 ring-emerald-100">
                <div className="text-xl font-black text-emerald-950">
                  {stickers.length} / {stickerTotal}
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-3xl">
                  {stickers.slice(-12).map((sticker) => (
                    <StickerArtwork
                      key={sticker.id}
                      sticker={sticker}
                      className="h-12 w-12 rounded-full"
                    />
                  ))}
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-2xl font-black text-emerald-950">明日巩固包</h3>
              <div className="rounded-3xl bg-white p-4 shadow-xl shadow-emerald-500/10 ring-2 ring-emerald-100">
                {reviewQueue.length === 0 ? (
                  <p className="text-base font-bold text-emerald-700">暂无待巩固事实。</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {reviewQueue.map((item) => (
                      <span
                        key={item.factId}
                        className="rounded-full bg-amber-100 px-3 py-1 text-sm font-black text-amber-900"
                      >
                        {describeFactId(item.factId)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}
