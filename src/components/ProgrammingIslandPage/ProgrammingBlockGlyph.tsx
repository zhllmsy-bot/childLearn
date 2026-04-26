import type { CommandKind } from '../../programming/engine/types';

const GLYPH: Record<CommandKind, string> = {
  collect: '✦',
  forward: '➜',
  ifGem: '✦?',
  ifPath: '↗?',
  jump: '↟',
  procCall: '⌁',
  repeat: '↻',
  turnLeft: '↰',
  turnRight: '↱',
  whileNotGoal: '∞',
};

const GLYPH_LABEL: Record<CommandKind, string> = {
  collect: '收集',
  forward: '前进',
  ifGem: '有星',
  ifPath: '有路',
  jump: '跳跃',
  procCall: '小路',
  repeat: '重复',
  turnLeft: '左转',
  turnRight: '右转',
  whileNotGoal: '循环',
};

interface ProgrammingBlockGlyphProps {
  kind: CommandKind;
  small?: boolean;
}

export function ProgrammingBlockGlyph({
  kind,
  small = false,
}: ProgrammingBlockGlyphProps) {
  return (
    <span
      aria-hidden="true"
      className={`programming-block-glyph programming-block-glyph--${kind}${small ? ' programming-block-glyph--small' : ''}`}
      title={GLYPH_LABEL[kind]}
    >
      <span className="programming-block-glyph__shine" />
      <span className="programming-block-glyph__symbol">{GLYPH[kind]}</span>
    </span>
  );
}
