import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const srcRoot = path.join(root, 'src');
const allowedTopBarDir = path.join(srcRoot, 'components', 'AppTopBar');
const failures = [];

const forbiddenLucideIcons = ['ArrowLeft', 'Home', 'Settings2', 'Volume2', 'VolumeX'];
const legacyFloatingTokens = [
  'app-topbar fixed',
  'app-topbar-touch',
  'ipad-floating-button',
  'ipad-parent-gate',
  'safe-control-bottom-right',
  'safe-control-top-left',
  'safe-control-top-left-stack',
  'safe-control-top-right',
  'safe-control-top-right-stack',
];

function fail(message) {
  failures.push(message);
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

function isInsideAllowedTopBar(fullPath) {
  return fullPath.startsWith(allowedTopBarDir + path.sep);
}

const sourceFiles = listFiles(srcRoot, (file) => /\.(ts|tsx|css)$/.test(file));
const appTopBarPath = path.join(allowedTopBarDir, 'AppTopBar.tsx');
const cssPath = path.join(srcRoot, 'styles', 'index.css');

if (!fs.existsSync(appTopBarPath)) {
  fail('src/components/AppTopBar/AppTopBar.tsx: unified AppTopBar is required');
}

for (const file of sourceFiles) {
  const text = fs.readFileSync(file, 'utf8');
  const relative = rel(file);

  if (!isInsideAllowedTopBar(file) && file.endsWith('.tsx')) {
    const lucideImports = [...text.matchAll(/import\s*\{([^}]+)\}\s*from\s*['"]lucide-react['"]/g)];
    for (const [, specifiers] of lucideImports) {
      const importedIcons = specifiers
        .split(',')
        .map((specifier) => specifier.trim().split(/\s+as\s+/)[0])
        .filter(Boolean);
      const matches = importedIcons.filter((icon) => forbiddenLucideIcons.includes(icon));
      if (matches.length > 0) {
        fail(
          `${relative}: ${matches.join(', ')} must render through src/components/AppTopBar/AppTopBar.tsx`,
        );
      }
    }
  }

  for (const token of legacyFloatingTokens) {
    if (text.includes(token)) {
      fail(`${relative}: legacy floating TopBar token '${token}' is banned`);
    }
  }
}

if (fs.existsSync(cssPath)) {
  const css = fs.readFileSync(cssPath, 'utf8');
  const appTopBarRules = [...css.matchAll(/\.app-topbar\s*\{[\s\S]*?\n\}/g)].map(
    ([rule]) => rule,
  );
  if (!appTopBarRules.some((rule) => rule.includes('position: sticky'))) {
    fail('src/styles/index.css: .app-topbar must use position: sticky');
  }
  if (appTopBarRules.some((rule) => /position:\s*fixed/.test(rule))) {
    fail('src/styles/index.css: .app-topbar must not use position: fixed');
  }
}

if (failures.length > 0) {
  console.error('TopBar architecture check failed:\n');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('TopBar architecture check passed.');
