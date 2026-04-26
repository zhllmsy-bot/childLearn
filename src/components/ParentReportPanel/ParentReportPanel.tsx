import { AnimatePresence, motion } from 'framer-motion';
import { Printer, RotateCcw, X } from 'lucide-react';
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
import {
  LEARNER_RADAR_SKILLS,
  LEARNER_SKILL_DEFINITIONS,
  type LearnerProfile,
} from '../../ai/learnerModel';
import { StickerArtwork } from '../_primitives/StickerArtwork';
import { PrivacyNotice } from '../PrivacyNotice/PrivacyNotice';
import type { Question } from '../../curriculum/types';

interface ParentReportPanelProps {
  open: boolean;
  onClose: () => void;
  onRestartDiagnostic: () => void;
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
  learnerProfile?: LearnerProfile;
  parentSummary?: string | null;
  parentSummaryStatus?: 'idle' | 'pending' | 'ready' | 'failed';
  privacyHref?: string;
  questionSource?: Question['source'] | null;
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
  unconfigured: '协作助手未接通',
  idle: '等待本关完成',
  pending: '协作助手分析中',
  ready: '协作助手已参与',
  failed: '协作助手暂时断开',
};

const QUESTION_SOURCE_LABELS: Record<Question['source'], string> = {
  golden: '金标准题库',
  llm: '协作助手现生成',
  'pcg+llm': '程序骨架 + AI 润色',
  pcg: '程序生成题库',
  parent: '家长私密题',
  teacher: '老师私密题',
  template: '旧版保底模板',
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

function thetaToRadarRatio(theta: number) {
  return Math.min(Math.max((theta + 2) / 4, 0.12), 1);
}

function radarPoint(index: number, total: number, ratio: number) {
  const angle = -Math.PI / 2 + (Math.PI * 2 * index) / total;
  const radius = 42 * ratio;

  return {
    x: 50 + Math.cos(angle) * radius,
    y: 50 + Math.sin(angle) * radius,
  };
}

function formatTheta(theta: number) {
  return theta > 0 ? `+${theta.toFixed(1)}` : theta.toFixed(1);
}

function LearnerRadar({ profile }: { profile: LearnerProfile }) {
  const skills = LEARNER_RADAR_SKILLS.map((skillKey) => ({
    key: skillKey,
    definition: LEARNER_SKILL_DEFINITIONS[skillKey],
    state: profile.skills[skillKey],
  }));
  const polygon = skills
    .map((skill, index) => {
      const point = radarPoint(
        index,
        skills.length,
        thetaToRadarRatio(skill.state.theta),
      );
      return `${point.x},${point.y}`;
    })
    .join(' ');

  return (
    <div className="grid gap-4 md:grid-cols-[130px_minmax(0,1fr)]">
      <svg
        aria-hidden="true"
        className="mx-auto h-32 w-32"
        viewBox="0 0 100 100"
      >
        {[0.35, 0.65, 1].map((ratio) => (
          <polygon
            key={ratio}
            fill="none"
            points={skills
              .map((_, index) => {
                const point = radarPoint(index, skills.length, ratio);
                return `${point.x},${point.y}`;
              })
              .join(' ')}
            stroke="var(--border-soft)"
            strokeWidth="1.5"
          />
        ))}
        {skills.map((_, index) => {
          const point = radarPoint(index, skills.length, 1);
          return (
            <line
              key={`axis-${index}`}
              stroke="var(--border-soft)"
              strokeWidth="1"
              x1="50"
              x2={point.x}
              y1="50"
              y2={point.y}
            />
          );
        })}
        <polygon
          fill="var(--brand-primary)"
          fillOpacity="0.18"
          points={polygon}
          stroke="var(--brand-deep)"
          strokeLinejoin="round"
          strokeWidth="2.5"
        />
        {skills.map((skill, index) => {
          const point = radarPoint(
            index,
            skills.length,
            thetaToRadarRatio(skill.state.theta),
          );
          return (
            <circle
              cx={point.x}
              cy={point.y}
              fill="var(--right-light)"
              key={skill.key}
              r="2.6"
              stroke="var(--brand-deep)"
              strokeWidth="1"
            />
          );
        })}
      </svg>

      <div className="grid gap-2">
        {skills.map((skill) => (
          <div
            className="flex items-center justify-between gap-3 rounded-2xl bg-emerald-50 px-3 py-2 ring-1 ring-emerald-100"
            key={skill.key}
          >
            <span className="text-base font-black text-emerald-950">
              {skill.definition.label}
            </span>
            <span className="shrink-0 text-sm font-black text-emerald-800">
              θ {formatTheta(skill.state.theta)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

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
        <span className="text-base font-black">{skill.label}</span>
        <span className="shrink-0 text-base font-bold">
          {ABILITY_STATUS_LABELS[skill.status]}
        </span>
      </div>
      <div className="mt-1 text-base font-bold opacity-80">
        {skill.category} · 首次 {Math.round(skill.firstTryAccuracy * 100)}% ·{' '}
        {skill.attempts} 题
      </div>
    </div>
  );
}

export function ParentReportPanel({
  open,
  onClose,
  onRestartDiagnostic,
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
  learnerProfile,
  parentSummary,
  parentSummaryStatus = 'idle',
  privacyHref,
  questionSource,
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
                onClick={onRestartDiagnostic}
                aria-label="重新评估学习起点"
                className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-800 shadow-xl shadow-amber-500/10 ring-2 ring-white"
              >
                <RotateCcw size={23} strokeWidth={3.2} />
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
            <PrivacyNotice href={privacyHref} />

            <section className="space-y-3">
              <h3 className="text-2xl font-black text-emerald-950">今日摘要</h3>
              <div className="rounded-3xl bg-white p-4 shadow-xl shadow-emerald-500/10 ring-2 ring-emerald-100">
                {parentSummaryStatus === 'pending' ? (
                  <p className="text-base font-black leading-relaxed text-child-moss">
                    小满正在整理今天的学习故事……
                  </p>
                ) : parentSummary ? (
                  <p className="text-base font-black leading-relaxed text-emerald-900">
                    {parentSummary}
                  </p>
                ) : (
                  <p className="text-base font-black leading-relaxed text-child-moss">
                    今天的数据还不够多，先继续做几题，我们会把节奏和重点整理给家长。
                  </p>
                )}
              </div>
            </section>

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
                          className="rounded-full bg-white px-3 py-1 text-base font-bold text-emerald-800 ring-1 ring-emerald-100"
                        >
                          {FOCUS_SKILL_LABELS[skill.key] ?? skill.key} ×{skill.count}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </section>
            ) : null}

            {flowState || flowAction || flowObserverStatus || questionSource ? (
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
                        大模型协作助手
                      </div>
                      <div className="text-base font-black text-emerald-950">
                        {flowObserverStatus
                          ? (FLOW_OBSERVER_STATUS_LABELS[flowObserverStatus] ??
                            flowObserverStatus)
                          : '协作助手未接通'}
                      </div>
                      {questionSource ? (
                        <div className="mt-1 text-sm font-bold text-emerald-800">
                          当前出题：{QUESTION_SOURCE_LABELS[questionSource]}
                        </div>
                      ) : null}
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
                      {flowObserverStatus === 'unconfigured' || flowObserverStatus === 'failed' ? (
                        <p className="mt-1 text-sm font-bold leading-relaxed text-emerald-800/80">
                          当前先由本地能力模型和保底题库继续陪练，等协作助手恢复后会重新参与出题和摘要。
                        </p>
                      ) : null}
                      {questionSource === 'pcg' ? (
                        <p className="mt-1 text-sm font-bold leading-relaxed text-emerald-800/80">
                          这一题由程序先算出数学骨架和干扰项，保证正确性和出题速度。
                        </p>
                      ) : null}
                      {questionSource === 'pcg+llm' ? (
                        <p className="mt-1 text-sm font-bold leading-relaxed text-emerald-800/80">
                          这一题先由程序确定数学骨架，再由协作助手只润色故事文案，不参与算数。
                        </p>
                      ) : null}
                      {flowObserverStatus === 'ready' && questionSource === 'template' ? (
                        <p className="mt-1 text-sm font-bold leading-relaxed text-emerald-800/80">
                          这一题来自旧版保底模板，会逐步被新的程序生成题替换。
                        </p>
                      ) : null}
                      {questionSource === 'golden' ? (
                        <p className="mt-1 text-sm font-bold leading-relaxed text-emerald-800/80">
                          这一题来自教研审核通过的金标准题库，主要用于诊断、里程碑和高价值情境题。
                        </p>
                      ) : null}
                      {questionSource === 'parent' || questionSource === 'teacher' ? (
                        <p className="mt-1 text-sm font-bold leading-relaxed text-emerald-800/80">
                          这一题来自私密题库，只在当前孩子或班级范围内使用，不会自动进入公共题库。
                        </p>
                      ) : null}
                      {flowObserverStatus === 'ready' && questionSource === 'llm' ? (
                        <p className="mt-1 text-sm font-bold leading-relaxed text-emerald-800/80">
                          这一题由协作助手完整生成，当前主要保留给实验和兜底链路使用。
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
                              className="rounded-full bg-slate-50 px-3 py-1 text-base font-bold text-slate-700 ring-1 ring-slate-100"
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

            {learnerProfile ? (
              <section className="space-y-3">
                <h3 className="text-2xl font-black text-emerald-950">
                  AI 能力雷达
                </h3>
                <div className="rounded-3xl bg-white p-4 shadow-xl shadow-emerald-500/10 ring-2 ring-emerald-100">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-bold text-emerald-700">
                        多维 θ 画像
                      </div>
                      <div className="text-xl font-black text-emerald-950">
                        {learnerProfile.flowState === 'bored'
                          ? '偏易，准备加一点'
                          : learnerProfile.flowState === 'anxious'
                            ? '偏难，先托一把'
                            : '正在心流区'}
                      </div>
                    </div>
                    <div className="rounded-full bg-amber-50 px-3 py-2 text-sm font-black text-amber-900 ring-1 ring-amber-100">
                      {learnerProfile.recentResponses.length} / 50
                    </div>
                  </div>
                  <LearnerRadar profile={learnerProfile} />
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
              <h3 className="text-2xl font-black text-emerald-950">伙伴贴纸图鉴</h3>
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
