import { describe, expect, it } from 'vitest';
import { mergeLearningStorage } from './learningStateSync';

describe('mergeLearningStorage', () => {
  it('unions collected stickers', () => {
    const result = mergeLearningStorage(
      { 'childlearn.m78-stickers': JSON.stringify(['ultraman-zero']) },
      { 'childlearn.m78-stickers': JSON.stringify(['ultraman-tiga']) },
    );

    expect(JSON.parse(result.storage['childlearn.m78-stickers'] ?? '[]')).toEqual([
      'ultraman-zero',
      'ultraman-tiga',
    ]);
    expect(result.changedKeys).toContain('childlearn.m78-stickers');
  });

  it('keeps monotonic progress by max value', () => {
    const result = mergeLearningStorage(
      {
        'childlearn.rank-stars': '6',
        'childlearn.number-spirits': JSON.stringify({ '3': 1, '4': 5 }),
      },
      {
        'childlearn.rank-stars': '4',
        'childlearn.number-spirits': JSON.stringify({ '3': 3, '5': 2 }),
      },
    );

    expect(result.storage['childlearn.rank-stars']).toBe('6');
    expect(JSON.parse(result.storage['childlearn.number-spirits'] ?? '{}')).toEqual({
      '3': 3,
      '4': 5,
      '5': 2,
    });
  });

  it('merges garden rewards without losing badges', () => {
    const result = mergeLearningStorage(
      {
        'childlearn.reward-garden': JSON.stringify({
          lastWateredDay: '2026-04-24',
          streak: 2,
          totalWaterings: 3,
          fruitCoins: 7,
          badges: ['daily-water'],
        }),
      },
      {
        'childlearn.reward-garden': JSON.stringify({
          lastWateredDay: '2026-04-25',
          streak: 1,
          totalWaterings: 4,
          fruitCoins: 5,
          badges: ['perfect'],
        }),
      },
    );

    expect(JSON.parse(result.storage['childlearn.reward-garden'] ?? '{}')).toEqual({
      lastWateredDay: '2026-04-25',
      streak: 2,
      totalWaterings: 4,
      fruitCoins: 7,
      badges: ['daily-water', 'perfect'],
    });
  });

  it('uses the remote app snapshot for active session state', () => {
    const result = mergeLearningStorage(
      { 'childlearn.app-state-v1': '{"updatedAt":1,"scene":"home"}' },
      { 'childlearn.app-state-v1': '{"updatedAt":2,"scene":"result"}' },
    );

    expect(result.storage['childlearn.app-state-v1']).toBe(
      '{"updatedAt":2,"scene":"result"}',
    );
  });

  it('keeps a newer local app snapshot over an older remote copy', () => {
    const result = mergeLearningStorage(
      { 'childlearn.app-state-v1': '{"updatedAt":3,"scene":"practice"}' },
      { 'childlearn.app-state-v1': '{"updatedAt":2,"scene":"home"}' },
    );

    expect(result.storage['childlearn.app-state-v1']).toBe(
      '{"updatedAt":3,"scene":"practice"}',
    );
    expect(result.changedKeys).not.toContain('childlearn.app-state-v1');
  });
});
