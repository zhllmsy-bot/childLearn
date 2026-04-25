import { useCallback, useMemo, useState } from 'react';
import { scheduleLearningStateSync } from '../../sync/learningStateSync';
import { track } from '../../telemetry/track';
import ultraStickerCatalog from './ultraStickers.json';

export interface Sticker {
  id: string;
  emoji: string;
  name: string;
  shortName: string;
  imageSrc: string;
  signatureMove: string;
  actionDescription: string;
  voiceLine: string;
  group: string;
  accent: string;
}

const STORAGE_KEY = 'childlearn.m78-stickers';
export const STICKER_UNLOCK_COMBO_INTERVAL = 4;

export function shouldOfferStickerUnlock({
  combo,
  firstAttemptCorrect,
}: {
  combo: number;
  firstAttemptCorrect: boolean;
}) {
  return (
    firstAttemptCorrect &&
    combo > 0 &&
    combo % STICKER_UNLOCK_COMBO_INTERVAL === 0
  );
}

const LEGACY_STICKER_LIBRARY: Sticker[] = [
  {
    id: 'm78-ultraman',
    emoji: '初',
    shortName: '初',
    name: '初代奥特曼',
    imageSrc: '/stickers/m78/ultraman.jpg',
    signatureMove: '斯派修姆光线',
    actionDescription: '双臂交叉蓄力，向前打出银红色光线。',
    voiceLine: '初代奥特曼，斯派修姆光线！',
    group: '奥特兄弟',
    accent: 'from-rose-500 to-slate-200',
  },
  {
    id: 'm78-zoffy',
    emoji: '佐',
    shortName: '佐',
    name: '佐菲',
    imageSrc: '/stickers/m78/zoffy.jpg',
    signatureMove: 'M87 光线',
    actionDescription: '抬臂集中能量，释放宇宙警备队队长的强力光线。',
    voiceLine: '佐菲，M八七光线！',
    group: '宇宙警备队',
    accent: 'from-red-500 to-amber-300',
  },
  {
    id: 'm78-ultraseven',
    emoji: '7',
    shortName: '7',
    name: '赛文',
    imageSrc: '/stickers/m78/seven.jpg',
    signatureMove: '艾梅利姆光线',
    actionDescription: '额头能量灯闪亮，快速射出精准光线。',
    voiceLine: '赛文，艾梅利姆光线！',
    group: '奥特兄弟',
    accent: 'from-red-600 to-emerald-300',
  },
  {
    id: 'm78-jack',
    emoji: '杰',
    shortName: '杰',
    name: '杰克',
    imageSrc: '/stickers/m78/jack.jpg',
    signatureMove: '奥特手镯',
    actionDescription: '举起奥特手镯，变出光刃一样的救援力量。',
    voiceLine: '杰克，奥特手镯！',
    group: '奥特兄弟',
    accent: 'from-red-500 to-sky-200',
  },
  {
    id: 'm78-ace',
    emoji: 'A',
    shortName: 'A',
    name: '艾斯',
    imageSrc: '/stickers/m78/ace.jpg',
    signatureMove: '梅塔利姆光线',
    actionDescription: '双臂张开再交叉，打出闪亮的必杀光线。',
    voiceLine: '艾斯，梅塔利姆光线！',
    group: '奥特兄弟',
    accent: 'from-rose-500 to-cyan-200',
  },
  {
    id: 'm78-taro',
    emoji: '泰',
    shortName: '泰',
    name: '泰罗',
    imageSrc: '/stickers/m78/taro.jpg',
    signatureMove: '斯特利姆光线',
    actionDescription: '摆出 T 字蓄力姿势，释放热烈的光之能量。',
    voiceLine: '泰罗，斯特利姆光线！',
    group: '奥特兄弟',
    accent: 'from-red-500 to-orange-300',
  },
  {
    id: 'm78-father',
    emoji: '父',
    shortName: '父',
    name: '奥特之父',
    imageSrc: '/stickers/m78/father.jpg',
    signatureMove: '父亲射线',
    actionDescription: '稳稳站定，张开双臂守护光之国。',
    voiceLine: '奥特之父，父亲射线！',
    group: '光之国',
    accent: 'from-amber-500 to-red-400',
  },
  {
    id: 'm78-mother',
    emoji: '母',
    shortName: '母',
    name: '奥特之母',
    imageSrc: '/stickers/m78/mother.jpg',
    signatureMove: '治愈光线',
    actionDescription: '举起双手洒下温柔光芒，给伙伴恢复力量。',
    voiceLine: '奥特之母，治愈光线！',
    group: '光之国',
    accent: 'from-pink-400 to-red-300',
  },
  {
    id: 'm78-80',
    emoji: '80',
    shortName: '80',
    name: '爱迪',
    imageSrc: '/stickers/m78/eighty.jpg',
    signatureMove: '沙库修姆光线',
    actionDescription: '快速摆出战斗姿势，打出干净利落的光线。',
    voiceLine: '爱迪，沙库修姆光线！',
    group: '奥特兄弟',
    accent: 'from-red-500 to-lime-300',
  },
  {
    id: 'm78-yullian',
    emoji: '尤',
    shortName: '尤',
    name: '尤莉安',
    imageSrc: '/stickers/m78/yullian.jpg',
    signatureMove: '公主光线',
    actionDescription: '用优雅姿势聚起光芒，守护同伴。',
    voiceLine: '尤莉安，公主光线！',
    group: '光之国',
    accent: 'from-sky-400 to-pink-300',
  },
  {
    id: 'm78-mebius',
    emoji: '梦',
    shortName: '梦',
    name: '梦比优斯',
    imageSrc: '/stickers/m78/mebius.jpg',
    signatureMove: '梦比姆射线',
    actionDescription: '梦比姆气息亮起，向前挥出炽热光线。',
    voiceLine: '梦比优斯，梦比姆射线！',
    group: '奥特兄弟',
    accent: 'from-red-500 to-violet-300',
  },
  {
    id: 'm78-hikari',
    emoji: '希',
    shortName: '希',
    name: '希卡利',
    imageSrc: '/stickers/m78/hikari.jpg',
    signatureMove: '骑士射线',
    actionDescription: '蓝色骑士能量汇聚，打出清亮的光线。',
    voiceLine: '希卡利，骑士射线！',
    group: '宇宙科学技术局',
    accent: 'from-blue-500 to-cyan-300',
  },
  {
    id: 'm78-zero',
    emoji: '零',
    shortName: '零',
    name: '赛罗',
    imageSrc: '/stickers/m78/zero.jpg',
    signatureMove: '赛罗飞踢',
    actionDescription: '跃起旋身，从空中踢出最有气势的一击。',
    voiceLine: '赛罗，赛罗飞踢！',
    group: '新生代前辈',
    accent: 'from-blue-600 to-red-400',
  },
  {
    id: 'm78-taiga',
    emoji: '迦',
    shortName: '迦',
    name: '泰迦',
    imageSrc: '/stickers/m78/taiga.jpg',
    signatureMove: '斯特利姆爆冲',
    actionDescription: '点燃年轻的光，向前打出明亮冲击。',
    voiceLine: '泰迦，斯特利姆爆冲！',
    group: '新生代',
    accent: 'from-red-500 to-purple-300',
  },
  {
    id: 'm78-z',
    emoji: 'Z',
    shortName: 'Z',
    name: '泽塔',
    imageSrc: '/stickers/m78/z.jpg',
    signatureMove: '泽斯蒂姆光线',
    actionDescription: '双臂摆成 Z 字，放出闪耀光线。',
    voiceLine: '泽塔，泽斯蒂姆光线！',
    group: '新生代',
    accent: 'from-blue-500 to-red-300',
  },
  {
    id: 'm78-ribut',
    emoji: '利',
    shortName: '利',
    name: '利布特',
    imageSrc: '/stickers/m78/ribut.jpg',
    signatureMove: 'G 闪光',
    actionDescription: '银河救援队出动，举起手臂释放救援之光。',
    voiceLine: '利布特，G 闪光！',
    group: '银河救援队',
    accent: 'from-sky-500 to-amber-300',
  },
];

export const STICKER_LIBRARY = ultraStickerCatalog as Sticker[];

export function findStickerById(id: string | null | undefined) {
  if (!id) {
    return null;
  }

  return STICKER_LIBRARY.find((sticker) => sticker.id === id) ?? null;
}

function readStoredStickerIds() {
  if (typeof window === 'undefined') {
    return new Set<string>();
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]');
    return new Set(Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : []);
  } catch {
    return new Set<string>();
  }
}

function writeStoredStickerIds(ids: Set<string>) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  scheduleLearningStateSync('stickers');
}

export function useStickers() {
  const [collectedIds, setCollectedIds] = useState<Set<string>>(readStoredStickerIds);

  const collectBySeed = useCallback((seed: number) => {
    const sticker = STICKER_LIBRARY[seed % STICKER_LIBRARY.length];
    const didCollect = !collectedIds.has(sticker.id);

    if (!didCollect) {
      track('sticker.collect_skipped', {
        stickerId: sticker.id,
        reason: 'duplicate',
      });
      return null;
    }

    setCollectedIds((previous) => {
      if (previous.has(sticker.id)) {
        return previous;
      }

      const next = new Set(previous);
      next.add(sticker.id);
      writeStoredStickerIds(next);
      track('sticker.collect', {
        stickerId: sticker.id,
        totalCollected: next.size,
      });
      return next;
    });
    return sticker;
  }, [collectedIds]);

  const reset = useCallback(() => {
    writeStoredStickerIds(new Set());
    setCollectedIds(new Set());
  }, []);

  const collected = useMemo(
    () =>
      [...collectedIds]
        .map((id) => findStickerById(id))
        .filter((sticker): sticker is Sticker => Boolean(sticker)),
    [collectedIds],
  );

  return useMemo(
    () => ({
      collected,
      total: STICKER_LIBRARY.length,
      collectBySeed,
      reset,
    }),
    [collectBySeed, collected, reset],
  );
}
