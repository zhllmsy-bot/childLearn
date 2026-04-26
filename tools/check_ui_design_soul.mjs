import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const srcRoot = path.join(root, 'src');
const failures = [];

function fail(message) {
  failures.push(message);
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function listFiles(dir, predicate, results = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      listFiles(fullPath, predicate, results);
    } else if (predicate(fullPath)) {
      results.push(fullPath);
    }
  }
  return results;
}

function rel(fullPath) {
  return path.relative(root, fullPath);
}

function lineCount(relativePath) {
  return read(relativePath).trimEnd().split('\n').length;
}

const sourceFiles = listFiles(srcRoot, (file) => /\.(ts|tsx|css)$/.test(file));
const filesWithoutTokenSource = sourceFiles.filter(
  (file) => rel(file) !== 'src/theme/tokens.ts',
);

for (const file of filesWithoutTokenSource) {
  const text = fs.readFileSync(file, 'utf8');
  const relative = rel(file);

  if (/#[0-9a-fA-F]{3,8}/.test(text)) {
    fail(`${relative}: raw hex color is only allowed in src/theme/tokens.ts`);
  }
  if (/border:\s*1px\s+solid/.test(text)) {
    fail(`${relative}: border: 1px solid is banned for UI surfaces`);
  }
  if (/text-overflow:\s*ellipsis/.test(text) && !/\/\/ @allow-ellipsis/.test(text)) {
    fail(`${relative}: Chinese UI must not be hidden with text-overflow: ellipsis`);
  }
  if (/color:\s*red|#FF0000|#EF4444|#DC2626/i.test(text)) {
    fail(`${relative}: red failure states are banned in child-facing UI`);
  }
  if (/box-shadow:\s*none/.test(text)) {
    fail(`${relative}: box-shadow: none is banned except documented ghost elements`);
  }
  if (/box-shadow:\s*0\s+2px\s+4px/.test(text)) {
    fail(`${relative}: single-layer 0 2px 4px shadow is below the v3 material floor`);
  }
}

const tokens = read('src/theme/tokens.ts');
const requiredTokenSnippets = [
  'export const SPACING = [0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80] as const;',
  'export const RADIUS = [0, 8, 12, 16, 20, 22, 24, 28, 999] as const;',
  'export const STROKE = [0, 1, 1.5, 2, 2.5, 3] as const;',
  'export const FONT_SIZE = [14, 17, 18, 20, 22, 28, 36, 48] as const;',
  'export const FONT_WEIGHT = [500, 600, 700, 800] as const;',
  'export const LINE_HEIGHT = [1, 1.2, 1.3, 1.4, 1.45, 1.5] as const;',
  'export const DURATION_MS = [120, 200, 300, 400, 500, 800, 1200, 2000, 2800] as const;',
  'export const SPRING = {',
  'export const EASING = {',
];

for (const snippet of requiredTokenSnippets) {
  if (!tokens.includes(snippet)) {
    fail(`src/theme/tokens.ts: missing required v3 token snippet: ${snippet}`);
  }
}

const requiredPaletteKeys = [
  'bg-canvas-top',
  'bg-canvas-bottom',
  'bg-canvas-base',
  'bg-surface',
  'bg-surface-sunken',
  'bg-grass',
  'brand-light',
  'brand-primary',
  'brand-deep',
  'brand-dark',
  'forward-light',
  'forward-deep',
  'left-light',
  'left-deep',
  'right-light',
  'right-deep',
  'text-primary',
  'text-secondary',
  'text-tertiary',
  'text-on-brand',
  'border-soft',
  'border-focus',
  'highlight-inner',
  'shadow-cool',
  'chip-cream-top',
  'chip-cream-bottom',
  'chip-cream-deep',
  'chip-cream-text',
];

for (const key of requiredPaletteKeys) {
  if (!tokens.includes(`'${key}'`)) {
    fail(`src/theme/tokens.ts: PALETTE is missing '${key}'`);
  }
}

if (!read('src/programming/UI_SPEC_VERSION.ts').includes('3.1.0')) {
  fail('src/programming/UI_SPEC_VERSION.ts: active UI spec marker must be 3.1.0');
}

if (!exists('docs/ui-design-soul-v3.md')) {
  fail('docs/ui-design-soul-v3.md: v3 design soul document is missing');
}

if (!read('AGENTS.md').includes('childLearn UI Design Soul v3.1')) {
  fail('AGENTS.md: project instructions must name v3.1 as active design authority');
}

for (const requiredFile of [
  '.stylelintrc.json',
  'eslint.config.js',
  'playwright.config.ts',
  'e2e/ui-soul.spec.ts',
]) {
  if (!exists(requiredFile)) {
    fail(`${requiredFile}: required v3 automation file is missing`);
  }
}

const packageJson = JSON.parse(read('package.json'));
for (const scriptName of ['lint:eslint', 'lint:style', 'test:e2e']) {
  if (!packageJson.scripts?.[scriptName]) {
    fail(`package.json: missing ${scriptName} script`);
  }
}

const topBar = read('src/components/AppTopBar/AppTopBar.tsx');
if (!topBar.includes('useTopBarConfig') || !topBar.includes('icon-btn-48')) {
  fail('src/components/AppTopBar/AppTopBar.tsx: pages must configure the unified 56px TopBar through useTopBarConfig');
}

const css = read('src/styles/index.css');
const cssRequired = [
  'radial-gradient(ellipse 800px 600px at 20% 0%',
  'radial-gradient(ellipse 600px 400px at 100% 100%',
  '.app-topbar',
  'height: calc(56px + var(--safe-top))',
  'background: rgba(255,255,255,0.85)',
  'backdrop-filter: blur(12px)',
  '.programming-cloud',
  '.programming-grassline',
  '.programming-butterfly',
  '.programming-sparkle',
  '@media (prefers-reduced-motion: reduce)',
  'translateY(4px)',
  'xiaoman-breathe',
  'xiaoman-shadow-breathe',
  'programming-gummy-block',
  'programming-primary-cta',
];

for (const snippet of cssRequired) {
  if (!css.includes(snippet)) {
    fail(`src/styles/index.css: missing v3 CSS/material hook '${snippet}'`);
  }
}

const stone = read('public/programming/stone.svg');
const hitStone = read('public/programming/stone-hit.svg');
const flag = read('public/programming/flag.svg');

for (const [name, text, snippets] of [
  ['public/programming/stone.svg', stone, ['linearGradient', 'stroke="#FFFFFF"', '睡着的小石头']],
  ['public/programming/stone-hit.svg', hitStone, ['被撞到的小石头', 'linearGradient']],
  ['public/programming/flag.svg', flag, ['flag-wave', 'linearGradient']],
]) {
  for (const snippet of snippets) {
    if (!text.includes(snippet)) {
      fail(`${name}: missing required asset marker '${snippet}'`);
    }
  }
}

if (lineCount('src/App.tsx') > 800) {
  fail('src/App.tsx: must stay at or below 800 lines');
}

if (lineCount('src/components/ProgrammingIslandPage/ProgrammingIslandPage.tsx') > 220) {
  fail('src/components/ProgrammingIslandPage/ProgrammingIslandPage.tsx: must stay at or below 220 lines');
}

if (failures.length > 0) {
  console.error('UI design soul v3 check failed:\n');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('UI design soul v3.1 check passed.');
