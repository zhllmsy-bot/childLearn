import type { Block, CommandKind } from './engine/types';

export type ProgrammingBlockTemplateId = CommandKind;

export interface ProgrammingBlockTemplate {
  id: ProgrammingBlockTemplateId;
  kind: CommandKind;
  label: string;
  shortLabel: string;
  description: string;
}

export const PROGRAMMING_BLOCK_TEMPLATES: Record<
  ProgrammingBlockTemplateId,
  ProgrammingBlockTemplate
> = {
  forward: {
    id: 'forward',
    kind: 'forward',
    label: '前进',
    shortLabel: '前进',
    description: '向当前方向走一格',
  },
  turnLeft: {
    id: 'turnLeft',
    kind: 'turnLeft',
    label: '左转',
    shortLabel: '左转',
    description: '原地转向左边',
  },
  turnRight: {
    id: 'turnRight',
    kind: 'turnRight',
    label: '右转',
    shortLabel: '右转',
    description: '原地转向右边',
  },
  jump: {
    id: 'jump',
    kind: 'jump',
    label: '跳跃',
    shortLabel: '跳',
    description: '向前跳两格，越过一格障碍',
  },
  collect: {
    id: 'collect',
    kind: 'collect',
    label: '收集',
    shortLabel: '收集',
    description: '收起脚下的能量星',
  },
  repeat: {
    id: 'repeat',
    kind: 'repeat',
    label: '重复',
    shortLabel: '重复',
    description: '把里面的动作重复几次',
  },
  procCall: {
    id: 'procCall',
    kind: 'procCall',
    label: '调用小路',
    shortLabel: '调用',
    description: '运行关卡里预设的一段小程序',
  },
  ifPath: {
    id: 'ifPath',
    kind: 'ifPath',
    label: '如果有路',
    shortLabel: '有路?',
    description: '前方能走就前进，否则换方向',
  },
  ifGem: {
    id: 'ifGem',
    kind: 'ifGem',
    label: '如果有星',
    shortLabel: '有星?',
    description: '脚下有能量星就收集',
  },
  whileNotGoal: {
    id: 'whileNotGoal',
    kind: 'whileNotGoal',
    label: '直到终点',
    shortLabel: '直到',
    description: '没到终点时一直做里面的动作',
  },
};

interface CreateBlockOptions {
  repeatCount?: number;
  procedureId?: string;
}

function childId(parentId: string, suffix: string) {
  return `${parentId}:${suffix}`;
}

export function createBlockFromTemplate(
  templateId: ProgrammingBlockTemplateId,
  id: string,
  options: CreateBlockOptions = {},
): Block {
  if (templateId === 'repeat') {
    return {
      id,
      kind: 'repeat',
      params: { n: options.repeatCount ?? 2 },
      body: [
        {
          id: childId(id, 'body.0'),
          kind: 'forward',
        },
      ],
    };
  }

  if (templateId === 'ifPath') {
    return {
      id,
      kind: 'ifPath',
      branchTrue: [
        {
          id: childId(id, 'true.0'),
          kind: 'forward',
        },
      ],
      branchFalse: [
        {
          id: childId(id, 'false.0'),
          kind: 'turnLeft',
        },
      ],
    };
  }

  if (templateId === 'ifGem') {
    return {
      id,
      kind: 'ifGem',
      branchTrue: [
        {
          id: childId(id, 'true.0'),
          kind: 'collect',
        },
      ],
      branchFalse: [
        {
          id: childId(id, 'false.0'),
          kind: 'forward',
        },
      ],
    };
  }

  if (templateId === 'whileNotGoal') {
    return {
      id,
      kind: 'whileNotGoal',
      body: [
        {
          id: childId(id, 'body.0'),
          kind: 'forward',
        },
      ],
    };
  }

  if (templateId === 'procCall') {
    return {
      id,
      kind: 'procCall',
      params: { procedureId: options.procedureId ?? 'helper' },
    };
  }

  return {
    id,
    kind: templateId,
  };
}

export function cloneBlock(block: Block): Block {
  return {
    ...block,
    params: block.params ? { ...block.params } : undefined,
    body: block.body?.map(cloneBlock),
    branchTrue: block.branchTrue?.map(cloneBlock),
    branchFalse: block.branchFalse?.map(cloneBlock),
  };
}

export function containsKind(program: Block[], kind: CommandKind): boolean {
  return program.some((block) => {
    if (block.kind === kind) {
      return true;
    }

    return (
      containsKind(block.body ?? [], kind) ||
      containsKind(block.branchTrue ?? [], kind) ||
      containsKind(block.branchFalse ?? [], kind)
    );
  });
}
