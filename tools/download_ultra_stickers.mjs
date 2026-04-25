#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const PROJECT_ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const PUBLIC_STICKER_DIR = path.join(PROJECT_ROOT, 'public', 'stickers', 'm78');
const CATALOG_PATH = path.join(
  PROJECT_ROOT,
  'src',
  'engagement',
  'collection',
  'ultraStickers.json',
);
const SOURCE_MANIFEST_PATH = path.join(PUBLIC_STICKER_DIR, 'sources.json');
const TEMPLATE_API =
  'https://tsuburaya.miraheze.org/w/api.php?action=parse&page=Template:Ultras&prop=wikitext&format=json&origin=*';
const OFFICIAL_BASE_URL = 'https://tsuburaya-prod.com';
const FANDOM_SOURCES = [
  {
    apiUrl: 'https://ultra.fandom.com/api.php',
    pageBaseUrl: 'https://ultra.fandom.com/wiki',
    source: 'ultraman-wiki',
  },
  {
    apiUrl: 'https://ultraseries.fandom.com/api.php',
    pageBaseUrl: 'https://ultraseries.fandom.com/wiki',
    source: 'ultra-series-wiki',
  },
];
const TARGET_COUNT = 100;

const ACCENTS = [
  'from-red-500 to-slate-200',
  'from-rose-500 to-amber-300',
  'from-red-600 to-emerald-300',
  'from-sky-500 to-red-300',
  'from-blue-600 to-red-400',
  'from-violet-500 to-cyan-300',
  'from-emerald-500 to-lime-300',
  'from-pink-500 to-red-300',
  'from-orange-500 to-yellow-300',
  'from-indigo-500 to-purple-300',
];

const EXISTING_STICKERS = new Map(
  [
    {
      target: 'Ultraman',
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
      target: 'Zoffy',
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
      target: 'Ultraseven',
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
      target: 'Ultraman Jack',
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
      target: 'Ultraman Ace',
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
      target: 'Ultraman Taro',
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
      target: 'Father of Ultra',
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
      target: 'Mother of Ultra',
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
      target: 'Ultraman 80',
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
      target: 'Yullian',
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
      target: 'Ultraman Mebius',
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
      target: 'Ultraman Hikari',
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
      target: 'Ultraman Zero',
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
      target: 'Ultraman Taiga',
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
      target: 'Ultraman Z',
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
      target: 'Ultraman Ribut',
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
  ].map((sticker) => [sticker.target, sticker]),
);

const NAME_ZH = new Map(
  Object.entries({
    'Ultraman/A Type': '初代奥特曼 A 型',
    'Ultraman/B Type': '初代奥特曼 B 型',
    'Ultraman/C Type': '初代奥特曼 C 型',
    "Seven's Superior": '赛文上司',
    'Ultraman Leo': '雷欧',
    Astra: '阿斯特拉',
    'Ultraman King': '奥特之王',
    'Ultraman Joneus': '乔尼亚斯',
    Loto: '洛托',
    Elek: '艾雷克',
    Amia: '阿米娅',
    'Ultraman Zearth': '哉阿斯',
    'Ultraman Tiga': '迪迦',
    'Ultraman Dyna': '戴拿',
    'Ultraman Gaia': '盖亚',
    'Ultraman Agul': '阿古茹',
    'Ultraman Nice': '纳伊斯',
    'Ultraman Neos': '奈欧斯',
    'Ultraseven 21': '赛文21',
    'Ultraman Cosmos': '高斯',
    'Ultraman Justice': '杰斯提斯',
    'Ultraman Legend': '雷杰多',
    'Ultraman Boy': '博伊',
    'Ultraman the Next': '奈克斯特',
    'Ultraman Nexus': '奈克瑟斯',
    'Ultraman Noa': '诺亚',
    'Ultraman Max': '麦克斯',
    'Ultraman Saga': '赛迦',
    'Ultraman Ginga': '银河',
    'Ultraman Victory': '维克特利',
    'Ultraman Ginga Victory': '银河维克特利',
    'Ultraman X': '艾克斯',
    'Ultraman Orb': '欧布',
    'Ultraman Geed': '捷德',
    'Ultraman Rosso': '罗索',
    'Ultraman Blu': '布鲁',
    'Ultraman Ruebe': '罗布',
    'Ultrawoman Grigio': '格丽乔',
    'Ultraman Groob': '格罗布',
    'Ultraman Titas': '泰塔斯',
    'Ultraman Fuma': '风马',
    'Ultraman Reiga': '令迦',
    Sora: '索拉',
    'Ultraman Trigger': '特利迦',
    'Ultraman Regulos': '雷古洛思',
    'Ultraman Decker': '德凯',
    'Ultraman Dinas': '帝纳斯',
    'Ultraman Blazar': '布莱泽',
    'Ultraman Omega': '欧米伽',
    'Alien Zarab': '假初代奥特曼',
    'Evil Tiga': '邪恶迪迦',
    Camearra: '卡蜜拉',
    Darramb: '达拉姆',
    Hudra: '希特拉',
    'Dark Faust': '黑暗浮士德',
    'Dark Mephisto': '黑暗梅菲斯特',
    'Dark Mephisto Zwei': '黑暗梅菲斯特二世',
    'Dark Zagi': '黑暗扎基',
    'Ultraman Belial': '贝利亚',
    'Darklops Zero': '黑暗洛普斯赛罗',
    Darklops: '黑暗洛普斯',
    'Ultraman Zero Darkness': '黑暗赛罗',
    'Ultraman Orb Dark': '欧布黑暗',
    'Ultraman Tregear': '托雷基亚',
    'Imit-Ultraman Belial': '假贝利亚',
    'Ultraman X Darkness': '黑暗艾克斯',
    'Ultraman Orb Darkness': '黑暗欧布',
    'Ultraman Geed Darkness': '黑暗捷德',
    'Ultrawoman Grigio Darkness': '黑暗格丽乔',
    Carmeara: '卡尔蜜拉',
    Darrgon: '达贡',
    Hudram: '希特拉姆',
    'Evil Trigger': '邪恶特利迦',
    'Ultraman Scott': '史考特',
    'Ultraman Chuck': '查克',
    'Ultrawoman Beth': '贝斯',
    'Ultraman Great': '葛雷',
    'Ultraman Powered': '帕瓦特',
    'Imitation Ultraseven': '假赛文',
    'Ace-Robot': '艾斯机器人',
    'Alien Babarue': '假阿斯特拉',
    'Delusion Ultraseven': '妄想赛文',
    'Imitation Ultraman Joneus': '假乔尼亚斯',
    'Ultraman Shadow': '影子奥特曼',
  }),
);

const OFFICIAL_SLUG_ALIASES = new Map(
  Object.entries({
    Ultraman: 'ultraman',
    'Ultraman/A Type': 'ultraman',
    'Ultraman/B Type': 'ultraman',
    'Ultraman/C Type': 'ultraman',
    Ultraseven: 'ultraseven',
    'Ultraman 80': 'ultraman-80',
    Yullian: 'yullian',
  }),
);

const OFFICIAL_TITLES = new Set([
  'Ultraman',
  'Zoffy',
  'Ultraseven',
  'Ultraman Jack',
  'Ultraman Ace',
  'Father of Ultra',
  'Mother of Ultra',
  'Ultraman Taro',
  'Ultraman Leo',
  'Astra',
  'Ultraman King',
  'Ultraman Joneus',
  'Ultraman 80',
  'Yullian',
  'Ultraman Scott',
  'Ultraman Chuck',
  'Ultrawoman Beth',
  'Ultraman Great',
  'Ultraman Powered',
  'Ultraman Tiga',
  'Ultraman Dyna',
  'Ultraman Gaia',
  'Ultraman Agul',
  'Ultraman Neos',
  'Ultraseven 21',
  'Ultraman Cosmos',
  'Ultraman Justice',
  'Ultraman Nexus',
  'Ultraman Max',
  'Ultraman Xenon',
  'Ultraman Mebius',
  'Ultraman Hikari',
  'Ultraman Zero',
  'Ultraman Ginga',
  'Ultraman Victory',
  'Ultraman X',
  'Ultraman Orb',
  'Ultraman Geed',
  'Ultraman Rosso',
  'Ultraman Blu',
  'Ultrawoman Grigio',
  'Ultraman Taiga',
  'Ultraman Titas',
  'Ultraman Fuma',
  'Ultraman Z',
  'Ultraman Ribut',
  'Ultraman Trigger',
  'Ultraman Regulos',
  'Ultraman Decker',
  'Ultraman Blazar',
  'Ultraman Omega',
]);

const FANDOM_TITLE_ALIASES = new Map(
  Object.entries({
    Ultraman: 'Ultraman (character)',
    'Ultraman/A Type': 'Ultraman (character)',
    'Ultraman/B Type': 'Ultraman (character)',
    'Ultraman/C Type': 'Ultraman (character)',
    'Ultraman Groob': 'Ultraman Gruebe',
    'Dark Mephisto Zwei': 'Dark Mephisto (Zwei)',
    'Imitation Ultraman Joneus': 'Ultraman Joneus',
  }),
);

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function normalizeUrl(url, baseUrl) {
  return new URL(url, baseUrl).href;
}

async function fetchText(url) {
  const response = await fetchWithRetry(url);
  if (!response.ok) {
    throw new Error(`GET ${url} failed: ${response.status}`);
  }
  return response.text();
}

async function fetchJson(url) {
  const response = await fetchWithRetry(url);
  if (!response.ok) {
    throw new Error(`GET ${url} failed: ${response.status}`);
  }
  return response.json();
}

async function fetchWithRetry(url, attempts = 3) {
  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fetch(url, {
        headers: {
          'User-Agent': 'ChildLearn local sticker downloader',
        },
        signal: AbortSignal.timeout(20_000),
      });
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 600));
      }
    }
  }

  throw lastError;
}

function parseTemplateEntries(wikitext) {
  const entries = [];
  const listBlocks = [
    ...wikitext.matchAll(/\|list\d+\s*=\s*\{\{Small\|([\s\S]*?)(?=\n\|group\d|\n\}\}|$)/g),
  ];

  for (const listBlock of listBlocks) {
    const block = listBlock[1];
    for (const link of block.matchAll(/\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]+))?\]\]/g)) {
      const target = link[1].trim();
      const label = (link[2] || target)
        .replace(/<[^>]+>/g, '')
        .replace(/\{\{[^}]+\}\}/g, '')
        .trim();
      if (target.includes(':')) {
        continue;
      }
      if (entries.some((entry) => entry.target === target)) {
        continue;
      }
      entries.push({ target, label });
      if (entries.length >= TARGET_COUNT) {
        return entries;
      }
    }
  }

  return entries.slice(0, TARGET_COUNT);
}

function pickOfficialImage(html) {
  const imageUrls = [...html.matchAll(/data-src="([^"]+\.(?:png|jpg|jpeg|webp))"/gi)].map(
    (match) => match[1],
  );
  return (
    imageUrls.find((url) =>
      /\/wp-content\/uploads\//.test(url) &&
      !/(name|logo|movie|thumbnail|icon|bnr|dsg|art_|chara_kaiju)/i.test(url),
    ) ?? null
  );
}

async function findOfficialImage(entry) {
  if (!OFFICIAL_TITLES.has(entry.target) && !OFFICIAL_SLUG_ALIASES.has(entry.target)) {
    return null;
  }

  const slug = OFFICIAL_SLUG_ALIASES.get(entry.target) ?? slugify(entry.target);
  const url = `${OFFICIAL_BASE_URL}/heroes/${slug}`;

  try {
    const html = await fetchText(url);
    const imageUrl = pickOfficialImage(html);
    if (!imageUrl) {
      return null;
    }
    return {
      pageUrl: url,
      imageUrl: normalizeUrl(imageUrl, OFFICIAL_BASE_URL),
      source: 'tsuburaya-official',
    };
  } catch {
    return null;
  }
}

function pickFandomFile(wikitext) {
  const imageField = wikitext.match(/\|\s*(?:altimage|image)\s*=\s*([\s\S]{0,1600}?)(?=\n\|[A-Za-z]|$)/i);
  const candidateBlock = imageField?.[1] ?? wikitext.slice(0, 3000);
  const plainFile = candidateBlock.trim().match(/^([^|\n<>]+\.(?:png|jpg|jpeg|webp))$/i);
  if (plainFile) {
    return plainFile[1].trim();
  }

  const galleryFile = candidateBlock.match(/(?:^|\n)\s*([^|\n<>]+\.(?:png|jpg|jpeg|webp))(?:\||\n)/i);
  if (galleryFile) {
    return galleryFile[1].trim();
  }

  const linkedFile = candidateBlock.match(/\[\[File:([^|\]]+\.(?:png|jpg|jpeg|webp))/i);
  if (linkedFile) {
    return linkedFile[1].trim();
  }

  const anyFile = wikitext.match(/\[\[File:([^|\]]+\.(?:png|jpg|jpeg|webp))/i);
  return anyFile?.[1]?.trim() ?? null;
}

async function getFandomFileUrl(source, fileName) {
  const url = `${source.apiUrl}?action=query&titles=${encodeURIComponent(
    `File:${fileName}`,
  )}&prop=imageinfo&iiprop=url&format=json&origin=*`;
  const json = await fetchJson(url);
  const page = Object.values(json.query?.pages ?? {})[0];
  return page?.imageinfo?.[0]?.url ?? null;
}

async function findFandomImage(entry) {
  const title = FANDOM_TITLE_ALIASES.get(entry.target) ?? entry.target;

  for (const source of FANDOM_SOURCES) {
    const parseUrl = `${source.apiUrl}?action=parse&page=${encodeURIComponent(
      title,
    )}&prop=wikitext&format=json&origin=*`;

    try {
      const json = await fetchJson(parseUrl);
      const wikitext = json.parse?.wikitext?.['*'] ?? '';
      const fileName = pickFandomFile(wikitext);
      if (!fileName) {
        continue;
      }
      const imageUrl = await getFandomFileUrl(source, fileName);
      if (!imageUrl) {
        continue;
      }
      return {
        pageUrl: `${source.pageBaseUrl}/${encodeURIComponent(title.replaceAll(' ', '_'))}`,
        imageUrl,
        source: source.source,
      };
    } catch {
      continue;
    }
  }

  return null;
}

async function findImage(entry) {
  return (await findFandomImage(entry)) ?? (await findOfficialImage(entry));
}

function extensionFor(contentType, url) {
  if (/png/i.test(contentType)) {
    return '.png';
  }
  if (/webp/i.test(contentType)) {
    return '.webp';
  }
  if (/jpe?g/i.test(contentType)) {
    return '.jpg';
  }
  const ext = path.extname(new URL(url).pathname).toLowerCase();
  return ['.png', '.jpg', '.jpeg', '.webp'].includes(ext) ? ext.replace('.jpeg', '.jpg') : '.jpg';
}

async function findExistingDownload(baseName) {
  for (const extension of ['.png', '.jpg', '.webp']) {
    const existingPath = path.join(PUBLIC_STICKER_DIR, `${baseName}${extension}`);
    if (existsSync(existingPath)) {
      const bytes = await readFile(existingPath);
      return {
        fileName: `${baseName}${extension}`,
        size: bytes.length,
        sha256: createHash('sha256').update(bytes).digest('hex'),
      };
    }
  }

  return null;
}

async function downloadImage(url, baseName) {
  const existing = await findExistingDownload(baseName);
  if (existing) {
    return existing;
  }

  const response = await fetchWithRetry(url);
  if (!response.ok) {
    throw new Error(`download failed: ${response.status}`);
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  const extension = extensionFor(response.headers.get('content-type') ?? '', url);
  const fileName = `${baseName}${extension}`;
  const filePath = path.join(PUBLIC_STICKER_DIR, fileName);

  if (!existsSync(filePath)) {
    await writeFile(filePath, bytes);
  }

  return {
    fileName,
    size: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  };
}

function makeSticker(entry, index, imageSrc) {
  const existing = EXISTING_STICKERS.get(entry.target);
  if (existing) {
    return existing;
  }

  const name = NAME_ZH.get(entry.target) ?? entry.label;
  const shortName = /^[A-Za-z]/.test(name) ? name.replace(/^Ultraman\s*/i, '').slice(0, 2) : name.slice(0, 2);
  const isDark = /dark|evil|imitation|imit-|belial|tregear|carmeara|darrgon|hudram/i.test(
    entry.target,
  );
  const group = isDark ? '黑暗与仿制奥特' : index < 21 ? '昭和奥特' : index < 42 ? '平成奥特' : '新世代与特别奥特';

  return {
    id: `m78-${slugify(entry.target)}`,
    emoji: shortName,
    shortName,
    name,
    imageSrc,
    signatureMove: isDark ? '黑暗冲击' : '光之必杀',
    actionDescription: isDark
      ? '摆出压迫感十足的姿势，释放一束暗色能量。'
      : '举起手臂汇聚光能量，向前释放守护伙伴的光线。',
    voiceLine: `${name}，${isDark ? '黑暗冲击' : '光之必杀'}！`,
    group,
    accent: ACCENTS[index % ACCENTS.length],
  };
}

async function main() {
  await mkdir(PUBLIC_STICKER_DIR, { recursive: true });

  const templateJson = await fetchJson(TEMPLATE_API);
  const entries = parseTemplateEntries(templateJson.parse.wikitext['*']);
  const manifest = {
    generatedAt: new Date().toISOString(),
    sources: [
      'https://tsuburaya-prod.com/heroeslist?mobile-app=true&theme=false',
      'https://tsuburaya.miraheze.org/wiki/Template:Ultras',
      'https://ultra.fandom.com/wiki/Category:Ultras',
      'https://ultraseries.fandom.com/wiki/Seven%27s_Superior',
    ],
    items: [],
  };
  const stickers = [];

  for (const [index, entry] of entries.entries()) {
    const existing = EXISTING_STICKERS.get(entry.target);
    if (existing) {
      stickers.push(existing);
      manifest.items.push({
        target: entry.target,
        label: entry.label,
        imageSrc: existing.imageSrc,
        source: 'existing-local',
      });
      console.log(`${index + 1}/${entries.length} kept ${entry.target}`);
      continue;
    }

    const baseName = slugify(entry.target);
    const existingDownload = await findExistingDownload(baseName);
    if (existingDownload) {
      const imageSrc = `/stickers/m78/${existingDownload.fileName}`;
      stickers.push(makeSticker(entry, index, imageSrc));
      manifest.items.push({
        target: entry.target,
        label: entry.label,
        imageSrc,
        source: 'existing-generated',
        sha256: existingDownload.sha256,
        size: existingDownload.size,
      });
      console.log(`${index + 1}/${entries.length} kept generated ${entry.target}`);
      continue;
    }

    let image = await findImage(entry);
    if (!image) {
      throw new Error(`No image found for ${entry.target}`);
    }

    let downloaded;
    try {
      downloaded = await downloadImage(image.imageUrl, baseName);
    } catch (error) {
      if (image.source !== 'tsuburaya-official') {
        throw error;
      }
      const fallbackImage = await findFandomImage(entry);
      if (!fallbackImage) {
        throw error;
      }
      image = fallbackImage;
      downloaded = await downloadImage(image.imageUrl, baseName);
    }
    const imageSrc = `/stickers/m78/${downloaded.fileName}`;
    stickers.push(makeSticker(entry, index, imageSrc));
    manifest.items.push({
      target: entry.target,
      label: entry.label,
      imageSrc,
      source: image.source,
      pageUrl: image.pageUrl,
      imageUrl: image.imageUrl,
      sha256: downloaded.sha256,
      size: downloaded.size,
    });
    console.log(`${index + 1}/${entries.length} downloaded ${entry.target} <- ${image.source}`);
  }

  await writeFile(CATALOG_PATH, `${JSON.stringify(stickers, null, 2)}\n`);
  await writeFile(SOURCE_MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);

  const catalog = JSON.parse(await readFile(CATALOG_PATH, 'utf8'));
  console.log(`Wrote ${catalog.length} stickers to ${CATALOG_PATH}`);
  console.log(`Wrote source manifest to ${SOURCE_MANIFEST_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
