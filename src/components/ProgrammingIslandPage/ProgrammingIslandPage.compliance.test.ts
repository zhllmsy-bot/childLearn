import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const folder = path.resolve('src/components/ProgrammingIslandPage');
const componentFiles = fs
  .readdirSync(folder)
  .filter(
    (file) =>
      file.endsWith('.tsx') &&
      !file.endsWith('.stories.tsx') &&
      !file.endsWith('.test.tsx') &&
      file !== 'programmingUiConfig.tsx',
  )
  .sort();

describe('Programming page compliance', () => {
  it('keeps file sizes within the spec budget', () => {
    componentFiles.forEach((file) => {
      const fullPath = path.join(folder, file);
      const lines = fs.readFileSync(fullPath, 'utf8').trimEnd().split('\n').length;
      const max = file === 'ProgrammingIslandPage.tsx' ? 220 : 200;
      expect(lines, `${file} should stay within ${max} lines`).toBeLessThanOrEqual(max);
    });
  });

  it('avoids legacy labels and hard-coded hex colors inside the components', () => {
    const combined = componentFiles
      .map((file: string) => fs.readFileSync(path.join(folder, file), 'utf8'))
      .join('\n');

    ['0.5x', '1x', '2x', '单步', '提示', '编程馆'].forEach((token) => {
      expect(combined).not.toContain(token);
    });
    expect(combined).not.toMatch(/#[0-9A-Fa-f]{3,8}/);
  });

  it('keeps the v2.0 soul constraints wired into CSS and assets', () => {
    const css = fs.readFileSync(path.resolve('src/styles/index.css'), 'utf8');
    const specVersion = fs.readFileSync(
      path.resolve('src/programming/UI_SPEC_VERSION.ts'),
      'utf8',
    );
    const stone = fs.readFileSync(path.resolve('public/programming/stone.svg'), 'utf8');
    const hitStone = fs.readFileSync(path.resolve('public/programming/stone-hit.svg'), 'utf8');
    const gem = fs.readFileSync(path.resolve('public/programming/gem.svg'), 'utf8');
    const flag = fs.readFileSync(path.resolve('public/programming/flag.svg'), 'utf8');
    const viewTypes = fs.readFileSync(
      path.resolve('src/components/ProgrammingIslandPage/programmingViewTypes.ts'),
      'utf8',
    );

    expect(specVersion).toContain('2.0.0');
    expect(css).toContain('.programming-cloud');
    expect(css).toContain('.programming-grassline');
    expect(css).toContain('.programming-butterfly');
    expect(css).toContain('.programming-sparkle');
    expect(css).toContain('xiaoman-breathe');
    expect(css).toContain('programming-gummy-block');
    expect(css).toContain('programming-block-glyph__shine');
    expect(css).toContain('programming-primary-cta');
    expect(css).toContain('@media (max-width: 640px)');
    expect(stone).toContain('linearGradient');
    expect(stone).toContain('stroke="#FFFFFF"');
    expect(hitStone).toContain('被撞到的小石头');
    expect(gem).toContain('linearGradient');
    expect(flag).toContain('flag-wave');
    expect(viewTypes).not.toContain('DIRECTION_ARROW');
  });
});
