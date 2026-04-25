import type {
  Block,
  CommandKind,
  Procedures,
  ProgrammingDirection,
  ProgrammingPosition,
} from './engine/types';
import type { StarThresholds } from './engine/starEvaluator';
import type { ProgrammingBlockTemplateId } from './blocks';

export type { ProgrammingDirection, ProgrammingPosition };

export interface ProgrammingLevel {
  id: string;
  title: string;
  concept: string;
  prompt: string;
  guide: string;
  successVoice: string;
  hintVoice: string;
  start: ProgrammingPosition;
  direction: ProgrammingDirection;
  target: ProgrammingPosition;
  obstacles: ProgrammingPosition[];
  gems?: ProgrammingPosition[];
  requiresAllGems?: boolean;
  width?: number;
  height?: number;
  allowedCommands: ProgrammingBlockTemplateId[];
  maxCommands: number;
  requiredKinds?: CommandKind[];
  requiredCommandMessage?: string;
  optimalSteps?: number;
  starThresholds?: StarThresholds;
  procedures?: Procedures;
  defaultProcedureId?: string;
  sampleProgram: Block[];
}

export const PROGRAMMING_LEVELS: ProgrammingLevel[] = [
  {
    id: 'sequence-apple',
    title: '第一条小路',
    concept: '顺序',
    prompt: '让小满一步一步走到能量果。',
    guide: '先从最简单的顺序开始。每点一次前进，小满就往前走一格。',
    successVoice: '走到啦。你把三步按对了，这就是顺序。',
    hintVoice: '小满还没到果子。数一数，中间还差几格。',
    start: { x: 0, y: 4 },
    direction: 'east',
    target: { x: 3, y: 4 },
    obstacles: [],
    allowedCommands: ['forward'],
    maxCommands: 5,
    optimalSteps: 3,
    starThresholds: { threeStarsMaxSteps: 3, twoStarsMaxSteps: 4, oneStarMaxSteps: 5 },
    sampleProgram: [
      { id: 'sample-0', kind: 'forward' },
      { id: 'sample-1', kind: 'forward' },
      { id: 'sample-2', kind: 'forward' },
    ],
  },
  {
    id: 'turn-corner',
    title: '拐个小弯',
    concept: '转向',
    prompt: '先走到转角，再转向上面。',
    guide: '这次要用转向。转向不会移动，只会让小满换一个朝向。',
    successVoice: '很好。你先走，再转向，再继续走，小满听懂了。',
    hintVoice: '想一想，转向这一步要放在走到转角以后。',
    start: { x: 0, y: 4 },
    direction: 'east',
    target: { x: 2, y: 2 },
    obstacles: [],
    allowedCommands: ['forward', 'turnLeft', 'turnRight'],
    maxCommands: 7,
    optimalSteps: 5,
    starThresholds: { threeStarsMaxSteps: 5, twoStarsMaxSteps: 6, oneStarMaxSteps: 7 },
    sampleProgram: [
      { id: 'sample-0', kind: 'forward' },
      { id: 'sample-1', kind: 'forward' },
      { id: 'sample-2', kind: 'turnLeft' },
      { id: 'sample-3', kind: 'forward' },
      { id: 'sample-4', kind: 'forward' },
    ],
  },
  {
    id: 'debug-rocks',
    title: '绕开石头',
    concept: '调试',
    prompt: '路上有石头，帮小满绕过去。',
    guide: '如果撞到石头，就换一条路。编程里这叫调试。',
    successVoice: '漂亮。你绕开了石头，也修好了路线。',
    hintVoice: '前面被石头挡住了。先让小满往没有石头的格子走。',
    start: { x: 0, y: 3 },
    direction: 'east',
    target: { x: 4, y: 1 },
    obstacles: [
      { x: 2, y: 3 },
      { x: 2, y: 2 },
      { x: 3, y: 2 },
    ],
    allowedCommands: ['forward', 'turnLeft', 'turnRight'],
    maxCommands: 10,
    optimalSteps: 8,
    starThresholds: { threeStarsMaxSteps: 8, twoStarsMaxSteps: 9, oneStarMaxSteps: 10 },
    sampleProgram: [
      { id: 'sample-0', kind: 'forward' },
      { id: 'sample-1', kind: 'turnLeft' },
      { id: 'sample-2', kind: 'forward' },
      { id: 'sample-3', kind: 'forward' },
      { id: 'sample-4', kind: 'turnRight' },
      { id: 'sample-5', kind: 'forward' },
      { id: 'sample-6', kind: 'forward' },
      { id: 'sample-7', kind: 'forward' },
    ],
  },
  {
    id: 'repeat-bridge',
    title: '重复四步',
    concept: '重复',
    prompt: '用重复，让小满一口气走过长桥。',
    guide: '重复块会把里面的动作多做几次。相同动作出现很多次，就可以试试重复。',
    successVoice: '对啦。一次重复就走完长桥了。',
    hintVoice: '这里是一条直直的路。试试把前进放进重复里。',
    start: { x: 0, y: 4 },
    direction: 'east',
    target: { x: 4, y: 4 },
    obstacles: [],
    allowedCommands: ['forward', 'repeat'],
    maxCommands: 4,
    requiredKinds: ['repeat'],
    requiredCommandMessage: '这关要试一次重复。把前进放进重复块，再运行看看。',
    optimalSteps: 4,
    starThresholds: { threeStarsMaxSteps: 4, twoStarsMaxSteps: 5, oneStarMaxSteps: 6 },
    sampleProgram: [
      {
        id: 'sample-repeat',
        kind: 'repeat',
        params: { n: 4 },
        body: [{ id: 'sample-repeat:body.0', kind: 'forward' }],
      },
    ],
  },
  {
    id: 'ifpath-stone-gate',
    title: '有路才走',
    concept: '条件',
    prompt: '前面堵住时，先判断有没有路。',
    guide: '如果前面有路，就继续走；如果没路，就先转向。',
    successVoice: '判断成功。小满没有撞上石头。',
    hintVoice: '前面有石头。用“如果有路”让小满先换方向。',
    start: { x: 0, y: 2 },
    direction: 'east',
    target: { x: 2, y: 1 },
    obstacles: [{ x: 1, y: 2 }],
    allowedCommands: ['ifPath', 'forward', 'turnLeft', 'turnRight'],
    maxCommands: 6,
    requiredKinds: ['ifPath'],
    requiredCommandMessage: '这关要用“如果有路”。让小满先判断，再继续走。',
    optimalSteps: 5,
    starThresholds: { threeStarsMaxSteps: 5, twoStarsMaxSteps: 6, oneStarMaxSteps: 7 },
    sampleProgram: [
      {
        id: 'sample-ifpath',
        kind: 'ifPath',
        branchTrue: [{ id: 'sample-ifpath:true.0', kind: 'forward' }],
        branchFalse: [{ id: 'sample-ifpath:false.0', kind: 'turnLeft' }],
      },
      { id: 'sample-1', kind: 'forward' },
      { id: 'sample-2', kind: 'turnRight' },
      { id: 'sample-3', kind: 'forward' },
      { id: 'sample-4', kind: 'forward' },
    ],
  },
  {
    id: 'collect-first-star',
    title: '捡起能量星',
    concept: '收集',
    prompt: '先拿到能量星，再走到终点。',
    guide: '小满站在能量星上时，用收集块把它装进口袋。',
    successVoice: '能量星收好啦。你完成了收集任务。',
    hintVoice: '要站到星星格子上，再放一个收集块。',
    start: { x: 0, y: 4 },
    direction: 'east',
    target: { x: 2, y: 4 },
    obstacles: [],
    gems: [{ x: 1, y: 4 }],
    requiresAllGems: true,
    allowedCommands: ['forward', 'collect'],
    maxCommands: 4,
    requiredKinds: ['collect'],
    requiredCommandMessage: '这关要收集能量星。站到星星上以后点收集。',
    optimalSteps: 3,
    starThresholds: { threeStarsMaxSteps: 3, twoStarsMaxSteps: 4, oneStarMaxSteps: 5 },
    sampleProgram: [
      { id: 'sample-0', kind: 'forward' },
      { id: 'sample-1', kind: 'collect' },
      { id: 'sample-2', kind: 'forward' },
    ],
  },
  {
    id: 'ifgem-pouch',
    title: '看到星星就收',
    concept: '条件收集',
    prompt: '用“如果有星”，让小满自己决定要不要收集。',
    guide: '条件不只会看路，也可以看看脚下有没有能量星。',
    successVoice: '太好了。小满会看见星星再收集。',
    hintVoice: '先走到星星上，再放“如果有星”。',
    start: { x: 0, y: 4 },
    direction: 'east',
    target: { x: 3, y: 4 },
    obstacles: [],
    gems: [{ x: 1, y: 4 }],
    requiresAllGems: true,
    allowedCommands: ['forward', 'ifGem', 'collect'],
    maxCommands: 5,
    requiredKinds: ['ifGem'],
    requiredCommandMessage: '这关要用“如果有星”，让收集动作藏在条件里。',
    optimalSteps: 4,
    starThresholds: { threeStarsMaxSteps: 4, twoStarsMaxSteps: 5, oneStarMaxSteps: 6 },
    sampleProgram: [
      { id: 'sample-0', kind: 'forward' },
      {
        id: 'sample-ifgem',
        kind: 'ifGem',
        branchTrue: [{ id: 'sample-ifgem:true.0', kind: 'collect' }],
        branchFalse: [{ id: 'sample-ifgem:false.0', kind: 'forward' }],
      },
      { id: 'sample-2', kind: 'forward' },
      { id: 'sample-3', kind: 'forward' },
    ],
  },
  {
    id: 'while-runway',
    title: '一直走到终点',
    concept: '循环',
    prompt: '用“直到终点”，让小满自己重复前进。',
    guide: '只要还没到终点，就一直做里面的动作。这是循环。',
    successVoice: '循环跑起来了。小满一直走到了终点。',
    hintVoice: '把前进放在“直到终点”里面。',
    start: { x: 0, y: 0 },
    direction: 'east',
    target: { x: 4, y: 0 },
    obstacles: [],
    allowedCommands: ['whileNotGoal', 'forward'],
    maxCommands: 3,
    requiredKinds: ['whileNotGoal'],
    requiredCommandMessage: '这关要用“直到终点”。它会一直运行里面的前进。',
    optimalSteps: 4,
    starThresholds: { threeStarsMaxSteps: 4, twoStarsMaxSteps: 5, oneStarMaxSteps: 6 },
    sampleProgram: [
      {
        id: 'sample-while',
        kind: 'whileNotGoal',
        body: [{ id: 'sample-while:body.0', kind: 'forward' }],
      },
    ],
  },
  {
    id: 'jump-rocks',
    title: '跳过石头',
    concept: '跳跃',
    prompt: '石头挡住小路，试试跳过去。',
    guide: '跳跃会向前跳两格，可以越过一格石头。',
    successVoice: '跳过去了。小满落在安全格子上。',
    hintVoice: '普通前进会撞石头，这里需要跳跃。',
    start: { x: 0, y: 4 },
    direction: 'east',
    target: { x: 4, y: 4 },
    obstacles: [
      { x: 1, y: 4 },
      { x: 3, y: 4 },
    ],
    allowedCommands: ['jump', 'forward'],
    maxCommands: 4,
    requiredKinds: ['jump'],
    requiredCommandMessage: '这关要用跳跃，越过挡路的石头。',
    optimalSteps: 2,
    starThresholds: { threeStarsMaxSteps: 2, twoStarsMaxSteps: 3, oneStarMaxSteps: 4 },
    sampleProgram: [
      { id: 'sample-0', kind: 'jump' },
      { id: 'sample-1', kind: 'jump' },
    ],
  },
  {
    id: 'procedure-stairs',
    title: '调用小路',
    concept: '过程',
    prompt: '把一段常用路线装成“小路”，需要时调用它。',
    guide: '过程就像一张小路线卡。调用它，小满会照着整段路线走。',
    successVoice: '调用成功。小满照着小路卡走到了终点。',
    hintVoice: '试试调用小路，它已经放好了完整路线。',
    start: { x: 0, y: 4 },
    direction: 'east',
    target: { x: 2, y: 2 },
    obstacles: [],
    allowedCommands: ['procCall', 'forward', 'turnLeft'],
    maxCommands: 4,
    requiredKinds: ['procCall'],
    requiredCommandMessage: '这关要用“调用小路”。它会运行预设的路线。',
    procedures: {
      helper: [
        { id: 'helper-0', kind: 'forward' },
        { id: 'helper-1', kind: 'forward' },
        { id: 'helper-2', kind: 'turnLeft' },
        { id: 'helper-3', kind: 'forward' },
        { id: 'helper-4', kind: 'forward' },
      ],
    },
    defaultProcedureId: 'helper',
    optimalSteps: 5,
    starThresholds: { threeStarsMaxSteps: 5, twoStarsMaxSteps: 6, oneStarMaxSteps: 7 },
    sampleProgram: [
      { id: 'sample-proc', kind: 'procCall', params: { procedureId: 'helper' } },
    ],
  },
];
