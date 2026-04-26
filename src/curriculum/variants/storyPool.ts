export type StoryFrame = 'collect' | 'gift' | 'combine' | 'arrive';

interface StorySceneDefinition {
  actors: string[];
  colorHint: 'amber' | 'lime' | 'orange' | 'pink' | 'rose' | 'violet';
  emoji: string;
  item: string;
  verb: string;
}

export interface StoryContext {
  actor: string;
  colorHint: StorySceneDefinition['colorHint'];
  emoji: string;
  frame: StoryFrame;
  item: string;
  verb: string;
}

const STORY_SCENES: StorySceneDefinition[] = [
  {
    actors: ['小兔子', '小松鼠', '小狐狸'],
    colorHint: 'lime',
    emoji: '🌰',
    item: '松果',
    verb: '捡',
  },
  {
    actors: ['小熊', '小猫', '小狗'],
    colorHint: 'orange',
    emoji: '🍪',
    item: '饼干',
    verb: '准备',
  },
  {
    actors: ['小海豚', '小螃蟹', '小海星'],
    colorHint: 'amber',
    emoji: '🐚',
    item: '贝壳',
    verb: '收集',
  },
  {
    actors: ['小鸭子', '小青蛙', '小刺猬'],
    colorHint: 'rose',
    emoji: '🎈',
    item: '气球',
    verb: '拿',
  },
  {
    actors: ['小鹿', '小羊', '小马'],
    colorHint: 'pink',
    emoji: '🧱',
    item: '积木',
    verb: '搬',
  },
  {
    actors: ['小熊猫', '小兔子', '小猫'],
    colorHint: 'violet',
    emoji: '🍇',
    item: '葡萄',
    verb: '摘',
  },
  {
    actors: ['小企鹅', '小海豹', '小鲸鱼'],
    colorHint: 'amber',
    emoji: '⭐',
    item: '小星星贴纸',
    verb: '贴',
  },
  {
    actors: ['小象', '小长颈鹿', '小斑马'],
    colorHint: 'orange',
    emoji: '🥕',
    item: '胡萝卜',
    verb: '运',
  },
];

const STORY_FRAMES: StoryFrame[] = ['collect', 'gift', 'combine', 'arrive'];

function randomInt(maxExclusive: number, rng: () => number) {
  return Math.floor(rng() * maxExclusive);
}

export function pickStoryContext(rng: () => number): StoryContext {
  const scene = STORY_SCENES[randomInt(STORY_SCENES.length, rng)] ?? STORY_SCENES[0];
  const actor = scene.actors[randomInt(scene.actors.length, rng)] ?? scene.actors[0];
  const frame = STORY_FRAMES[randomInt(STORY_FRAMES.length, rng)] ?? STORY_FRAMES[0];

  return {
    actor,
    colorHint: scene.colorHint,
    emoji: scene.emoji,
    frame,
    item: scene.item,
    verb: scene.verb,
  };
}
