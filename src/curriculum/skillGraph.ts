export type MathSkillId =
  | 'count_objects_to_5'
  | 'compare_quantities_to_5'
  | 'part_whole_to_5'
  | 'count_objects_to_10'
  | 'compare_quantities_to_10'
  | 'part_whole_to_10'
  | 'make_10'
  | 'result_addition_to_10'
  | 'number_line_distance_to_10'
  | 'compare_quantities_to_20'
  | 'within_20_counting_on'
  | 'within_20_missing_part'
  | 'compare_quantities_to_30'
  | 'within_30_counting_on'
  | 'within_30_missing_part';

export type MathSkillDomain =
  | 'number_sense'
  | 'comparison'
  | 'part_whole'
  | 'addition'
  | 'number_line';

export interface MathSkill {
  id: MathSkillId;
  domain: MathSkillDomain;
  label: string;
  childGoal: string;
  parentSignal: string;
}

export const MATH_SKILLS: MathSkill[] = [
  {
    id: 'count_objects_to_5',
    domain: 'number_sense',
    label: '5以内点数',
    childGoal: '点一点，知道一共有几个。',
    parentSignal: '能手口一致地点数 5 个以内物体。',
  },
  {
    id: 'compare_quantities_to_5',
    domain: 'comparison',
    label: '5以内多少比较',
    childGoal: '看两边，找出哪边更多。',
    parentSignal: '能通过一一对应或点数比较两组小数量。',
  },
  {
    id: 'part_whole_to_5',
    domain: 'part_whole',
    label: '5以内合成分解',
    childGoal: '知道两小堆合起来是多少。',
    parentSignal: '开始理解部分和整体的关系。',
  },
  {
    id: 'count_objects_to_10',
    domain: 'number_sense',
    label: '10以内点数',
    childGoal: '数到 10，最后一个数就是总数。',
    parentSignal: '能稳定点数 10 个以内物体。',
  },
  {
    id: 'compare_quantities_to_10',
    domain: 'comparison',
    label: '10以内多少比较',
    childGoal: '数一数，比一比。',
    parentSignal: '能用点数比较 10 以内两组数量。',
  },
  {
    id: 'part_whole_to_10',
    domain: 'part_whole',
    label: '10以内合成分解',
    childGoal: '把一个数拆成两份，再合起来。',
    parentSignal: '能借助实物理解 10 以内部分-整体关系。',
  },
  {
    id: 'make_10',
    domain: 'part_whole',
    label: '凑十',
    childGoal: '还差几个到 10？',
    parentSignal: '开始形成十框和补数意识。',
  },
  {
    id: 'result_addition_to_10',
    domain: 'addition',
    label: '10以内求和',
    childGoal: '两堆放一起，一共几个？',
    parentSignal: '能借助图像解决 10 以内加法。',
  },
  {
    id: 'number_line_distance_to_10',
    domain: 'number_line',
    label: '10以内数轴距离',
    childGoal: '从小旗跳到星星，数跳了几步。',
    parentSignal: '能把加法/距离和数轴移动联系起来。',
  },
  {
    id: 'compare_quantities_to_20',
    domain: 'comparison',
    label: '20以内多少比较',
    childGoal: '比较更大的两组数量。',
    parentSignal: '能在 20 以内保持点数和比较稳定。',
  },
  {
    id: 'within_20_counting_on',
    domain: 'addition',
    label: '20以内接着数',
    childGoal: '从一个数接着往后数。',
    parentSignal: '从全量点数过渡到 counting-on 策略。',
  },
  {
    id: 'within_20_missing_part',
    domain: 'part_whole',
    label: '20以内缺失部分',
    childGoal: '知道还差几个到总数。',
    parentSignal: '能借助视觉模型处理 20 以内未知加数。',
  },
  {
    id: 'compare_quantities_to_30',
    domain: 'comparison',
    label: '30以内多少比较',
    childGoal: '比较 30 以内数量。',
    parentSignal: '能把 20 以内策略迁移到 30 以内。',
  },
  {
    id: 'within_30_counting_on',
    domain: 'addition',
    label: '30以内接着数',
    childGoal: '在更长的数轴上接着数。',
    parentSignal: '能借助数轴处理 30 以内小步距离。',
  },
  {
    id: 'within_30_missing_part',
    domain: 'part_whole',
    label: '30以内缺失部分',
    childGoal: '看总数和一部分，找出缺的那一部分。',
    parentSignal: '能在强视觉支持下处理 30 以内未知加数。',
  },
];

const SKILL_IDS = new Set<MathSkillId>(MATH_SKILLS.map((skill) => skill.id));

export function isMathSkillId(value: unknown): value is MathSkillId {
  return typeof value === 'string' && SKILL_IDS.has(value as MathSkillId);
}
