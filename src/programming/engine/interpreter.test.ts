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

  it('collects gems before completing gem-gated worlds', () => {
    const program: Block[] = [
      { id: 'cmd-0', kind: 'forward' },
      { id: 'cmd-1', kind: 'collect' },
      { id: 'cmd-2', kind: 'forward' },
    ];

    const frames = buildExecutionFrames(program, {
      width: 3,
      height: 3,
      start: { x: 0, y: 1 },
      direction: 'east',
      target: { x: 2, y: 1 },
      obstacles: [],
      gems: [{ x: 1, y: 1 }],
      requiresAllGems: true,
    });

    expect(frames).toHaveLength(3);
    expect(frames[1]).toMatchObject({
      activeBlockId: 'cmd-1',
      command: 'collect',
      status: 'running',
      world: { remainingGems: [] },
    });
    expect(frames[2]).toMatchObject({ status: 'success' });
  });

  it('branches on ifGem and ifPath', () => {
    const program: Block[] = [
      {
        id: 'gem',
        kind: 'ifGem',
        branchTrue: [{ id: 'gem:true.0', kind: 'collect' }],
        branchFalse: [{ id: 'gem:false.0', kind: 'forward' }],
      },
      {
        id: 'path',
        kind: 'ifPath',
        branchTrue: [{ id: 'path:true.0', kind: 'forward' }],
        branchFalse: [{ id: 'path:false.0', kind: 'turnLeft' }],
      },
      { id: 'cmd-2', kind: 'forward' },
    ];

    const frames = buildExecutionFrames(program, {
      width: 3,
      height: 3,
      start: { x: 0, y: 1 },
      direction: 'east',
      target: { x: 0, y: 0 },
      obstacles: [{ x: 1, y: 1 }],
      gems: [{ x: 0, y: 1 }],
      requiresAllGems: true,
    });

    expect(frames.map((frame) => frame.activeBlockId)).toEqual([
      'gem:true.0',
      'path:false.0',
      'cmd-2',
    ]);
    expect(frames[2]).toMatchObject({
      status: 'success',
      bot: { position: { x: 0, y: 0 }, direction: 'north' },
    });
  });

  it('supports whileNotGoal, jump, and procCall', () => {
    const jumpFrames = buildExecutionFrames(
      [
        { id: 'jump-0', kind: 'jump' },
        { id: 'jump-1', kind: 'jump' },
      ],
      {
        width: 5,
        height: 5,
        start: { x: 0, y: 4 },
        direction: 'east',
        target: { x: 4, y: 4 },
        obstacles: [
          { x: 1, y: 4 },
          { x: 3, y: 4 },
        ],
      },
    );

    expect(jumpFrames[jumpFrames.length - 1]).toMatchObject({ status: 'success' });

    const whileFrames = buildExecutionFrames(
      [
        {
          id: 'while',
          kind: 'whileNotGoal',
          body: [{ id: 'while:body.0', kind: 'forward' }],
        },
      ],
      {
        width: 5,
        height: 1,
        start: { x: 0, y: 0 },
        direction: 'east',
        target: { x: 4, y: 0 },
        obstacles: [],
      },
    );

    expect(whileFrames).toHaveLength(4);
    expect(whileFrames[whileFrames.length - 1]).toMatchObject({ status: 'success' });

    const procFrames = buildExecutionFrames(
      [{ id: 'call', kind: 'procCall', params: { procedureId: 'helper' } }],
      {
        width: 3,
        height: 3,
        start: { x: 0, y: 2 },
        direction: 'east',
        target: { x: 2, y: 0 },
        obstacles: [],
        procedures: {
          helper: [
            { id: 'helper-0', kind: 'forward' },
            { id: 'helper-1', kind: 'forward' },
            { id: 'helper-2', kind: 'turnLeft' },
            { id: 'helper-3', kind: 'forward' },
            { id: 'helper-4', kind: 'forward' },
          ],
        },
      },
    );

    expect(procFrames[procFrames.length - 1]).toMatchObject({ status: 'success' });
  });

  it('guards runaway loops with maxSteps', () => {
    const frames = buildExecutionFrames(
      [
        {
          id: 'while',
          kind: 'whileNotGoal',
          body: [{ id: 'while:body.0', kind: 'turnLeft' }],
        },
      ],
      {
        width: 5,
        height: 1,
        start: { x: 0, y: 0 },
        direction: 'east',
        target: { x: 4, y: 0 },
        obstacles: [],
        maxSteps: 3,
      },
    );

    expect(frames[frames.length - 1]).toMatchObject({
      status: 'blocked',
      blockedReason: 'maxSteps',
    });
  });

  it('guards recursive procedure calls with maxCallDepth', () => {
    const frames = buildExecutionFrames(
      [{ id: 'call', kind: 'procCall', params: { procedureId: 'loop' } }],
      {
        width: 3,
        height: 3,
        start: { x: 0, y: 0 },
        direction: 'east',
        target: { x: 2, y: 2 },
        obstacles: [],
        maxCallDepth: 2,
        procedures: {
          loop: [{ id: 'loop-call', kind: 'procCall', params: { procedureId: 'loop' } }],
        },
      },
    );

    expect(frames[frames.length - 1]).toMatchObject({
      activeBlockId: 'loop-call',
      status: 'blocked',
      blockedReason: 'maxCallDepth',
    });
  });
});
