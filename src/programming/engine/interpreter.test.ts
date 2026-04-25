import { describe, expect, it } from 'vitest';
import { buildExecutionFrames } from './interpreter';
import type { Block } from './types';

const BASE_WORLD = {
  width: 3,
  height: 3,
  obstacles: [{ x: 2, y: 2 }],
  direction: 'east' as const,
  start: { x: 1, y: 1 },
  target: { x: 0, y: 1 },
};

describe('interpreter', () => {
  it('moves forward and reaches target', () => {
    const program: Block[] = [
      { id: 'cmd-0', kind: 'forward' },
      { id: 'cmd-1', kind: 'forward' },
    ];

    const frames = buildExecutionFrames(program, {
      ...BASE_WORLD,
      start: { x: 2, y: 1 },
      direction: 'west',
      target: { x: 0, y: 1 },
    });

    expect(frames).toHaveLength(2);
    expect(frames[0]).toMatchObject({
      activeBlockId: 'cmd-0',
      status: 'running',
      bot: { position: { x: 1, y: 1 }, direction: 'west' },
    });
    expect(frames[1]).toMatchObject({
      activeBlockId: 'cmd-1',
      status: 'success',
      bot: { position: { x: 0, y: 1 }, direction: 'west' },
    });
  });

  it('supports repeat blocks with nested bodies', () => {
    const program: Block[] = [
      {
        id: 'repeat-0',
        kind: 'repeat',
        params: { n: 2 },
        body: [{ id: 'repeat-0:body.0', kind: 'forward' }],
      },
    ];

    const frames = buildExecutionFrames(program, {
      ...BASE_WORLD,
      start: { x: 2, y: 1 },
      direction: 'west',
      target: { x: 0, y: 1 },
    });

    expect(frames).toHaveLength(2);
    expect(frames[0]).toMatchObject({
      activeBlockId: 'repeat-0:body.0',
      status: 'running',
      bot: { position: { x: 1, y: 1 } },
    });
    expect(frames[1]).toMatchObject({
      activeBlockId: 'repeat-0:body.0',
      status: 'success',
      bot: { position: { x: 0, y: 1 } },
    });
  });

  it('stops on obstacle and reports blocked', () => {
    const program: Block[] = [
      { id: 'cmd-0', kind: 'forward' },
    ];

    const frames = buildExecutionFrames(program, {
      ...BASE_WORLD,
      start: { x: 1, y: 1 },
      obstacles: [{ x: 0, y: 1 }],
      direction: 'west',
    });

    expect(frames).toHaveLength(1);
    expect(frames[0]).toMatchObject({
      activeBlockId: 'cmd-0',
      status: 'blocked',
      blockedReason: 'obstacle',
      bot: { position: { x: 1, y: 1 }, direction: 'west' },
    });
  });
});
