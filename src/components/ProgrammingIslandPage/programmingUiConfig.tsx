import type { ProgrammingBlockTemplateId } from '../../programming/blocks';
import type { Block, CommandKind } from '../../programming/engine/types';

export const BLOCK_DRAWER_ORDER: ProgrammingBlockTemplateId[] = [
  'forward',
  'turnLeft',
  'turnRight',
  'collect',
  'jump',
  'repeat',
  'whileNotGoal',
  'ifPath',
  'ifGem',
  'procCall',
];

export interface CommandThemeVars {
  accent: string;
  accentDark: string;
  accentLight: string;
}

export const COMMAND_THEME_VAR: Record<CommandKind, CommandThemeVars> = {
  collect: commandTheme('forward'),
  forward: commandTheme('forward'),
  ifGem: commandTheme('forward'),
  ifPath: commandTheme('left'),
  jump: commandTheme('forward'),
  procCall: commandTheme('left'),
  repeat: commandTheme('right'),
  turnLeft: commandTheme('left'),
  turnRight: commandTheme('right'),
  whileNotGoal: commandTheme('right'),
};

function commandTheme(name: 'forward' | 'left' | 'right'): CommandThemeVars {
  return {
    accent: `var(--accent-${name})`,
    accentDark: `var(--accent-${name}-dark)`,
    accentLight: `var(--accent-${name}-light)`,
  };
}

export function blockLabel(block: Block, short = false) {
  if (block.kind === 'repeat') {
    return short ? `重复 ${block.params?.n ?? 2}` : `重复 ${block.params?.n ?? 2} 次`;
  }
  if (block.kind === 'whileNotGoal') {
    return short ? '循环' : '直到终点';
  }
  if (block.kind === 'ifPath') {
    return short ? '前面有路' : '如果前面有路';
  }
  if (block.kind === 'ifGem') {
    return short ? '脚下有星' : '如果脚下有星';
  }
  if (block.kind === 'procCall') {
    return short ? '小路卡' : '调用小路';
  }
  if (block.kind === 'jump') {
    return '跳一跳';
  }
  if (block.kind === 'collect') {
    return '收起来';
  }
  if (block.kind === 'turnLeft') {
    return '左转';
  }
  if (block.kind === 'turnRight') {
    return '右转';
  }
  return '前进';
}
