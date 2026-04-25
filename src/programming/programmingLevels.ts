export type ProgrammingDirection = 'north' | 'east' | 'south' | 'west';

export type ProgrammingCommandId =
  | 'forward'
  | 'turnLeft'
  | 'turnRight'
  | 'repeatForward2';

export interface ProgrammingPosition {
  x: number;
  y: number;
}

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
  allowedCommands: ProgrammingCommandId[];
  maxCommands: number;
  requiredCommand?: ProgrammingCommandId;
  requiredCommandMessage?: string;
  optimalSteps?: number;
  starThresholds?: [number, number, number];
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
    starThresholds: [3, 4, 5],
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
    optimalSteps: 4,
    starThresholds: [4, 5, 6],
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
    maxCommands: 9,
    optimalSteps: 7,
    starThresholds: [7, 8, 9],
  },
  {
    id: 'repeat-bridge',
    title: '重复两步',
    concept: '重复',
    prompt: '用重复前进，让程序变短一点。',
    guide: '重复前进会让小满连续走两格。相同动作出现很多次，就可以试试重复。',
    successVoice: '对啦。两个前进合在一起，就是一次小小的重复。',
    hintVoice: '这里有连续的直路，可以把两个前进换成重复前进。',
    start: { x: 0, y: 4 },
    direction: 'east',
    target: { x: 4, y: 2 },
    obstacles: [
      { x: 2, y: 4 },
      { x: 2, y: 3 },
    ],
    allowedCommands: ['forward', 'turnLeft', 'turnRight', 'repeatForward2'],
    maxCommands: 7,
    requiredCommand: 'repeatForward2',
    requiredCommandMessage:
      '这关要试一次重复前进。把两个连续前进合成一块，再运行看看。',
    optimalSteps: 5,
    starThresholds: [5, 6, 8],
  },
];
