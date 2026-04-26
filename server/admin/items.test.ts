import { afterEach, describe, expect, it } from 'vitest';
import {
  handleAdminItemsRequest,
  resetAdminItemStoreForTests,
} from './items';

const CREATE_BODY = {
  authorId: 'expert-1',
  authorRole: 'expert',
  source: 'handcraft',
  tags: ['diagnostic', 'make-ten'],
  draft: {
    skeleton: {
      skill: 'makeTen',
      difficulty: 0.1,
      bloomLevel: 'apply',
      expectedAccuracy: 0.7,
    },
    content: {
      prompt: '小猫已经有 7 个球，还差几个就到 10 个？',
      inputType: 'choice',
      correctAnswer: 3,
      choices: [
        { text: '3', value: 3, isCorrect: true },
        { text: '7', value: 7, isCorrect: false, trapType: 'swap-op' },
        { text: '2', value: 2, isCorrect: false, trapType: 'off-one' },
        { text: '4', value: 4, isCorrect: false, trapType: 'off-one' },
      ],
    },
    presentation: {
      variant: 'makeTen',
      level: 3,
      expression: '7 + ? = 10',
      objects: ['⚽', '⚽', '⚽', '⚽', '⚽', '⚽', '⚽'],
      barModel: [7, 3],
      scaffoldText: '先想 7 到 10 还差几。',
      principleText: '凑十时，想“还差多少”会更快。',
      theme: {
        emoji: '⚽',
        colorHint: 'amber',
      },
    },
    context: {
      scene: 'playground',
    },
    safety: {
      reviewedForBias: false,
      reviewedForSafety: false,
      safetyFlags: [],
    },
  },
};

describe('admin items workflow', () => {
  afterEach(() => {
    resetAdminItemStoreForTests();
  });

  it('creates, submits, reviews, publishes, and searches a runtime draft item', async () => {
    const createResult = await handleAdminItemsRequest(
      'POST',
      '/api/admin/items',
      CREATE_BODY,
    );
    expect(createResult.status).toBe(201);
    const created = (createResult.body as { item: { id: string } }).item;

    const submitResult = await handleAdminItemsRequest(
      'POST',
      `/api/admin/items/${created.id}/submit`,
      null,
    );
    expect(submitResult.status).toBe(200);

    const reviewResult = await handleAdminItemsRequest(
      'POST',
      `/api/admin/items/${created.id}/review`,
      {
        actorRole: 'reviewer',
        approved: true,
        reviewerId: 'reviewer-1',
        reviewedForBias: true,
        reviewedForSafety: true,
      },
    );
    expect(reviewResult.status).toBe(200);

    const publishResult = await handleAdminItemsRequest(
      'POST',
      `/api/admin/items/${created.id}/publish`,
      {
        actorRole: 'admin',
      },
    );
    expect(publishResult.status).toBe(200);

    const searchResult = await handleAdminItemsRequest(
      'GET',
      '/api/admin/items/search?skill=makeTen&status=published',
      null,
    );
    expect(searchResult.status).toBe(200);
    const searched = searchResult.body as { items: Array<{ id: string }> };
    expect(searched.items.some((item) => item.id === created.id)).toBe(true);
  });

  it('accepts bulk import rows from csv', async () => {
    const bulkResult = await handleAdminItemsRequest(
      'POST',
      '/api/admin/items/bulk-import',
      {
        csv: [
          'skill,difficulty,bloom,prompt,correct,trap1,trap1_type,trap2,trap2_type,trap3,trap3_type,scene,tags',
          '"addWithin10",0.2,"apply","小鸭有 4 颗糖，又拿来 3 颗，一共有几颗？",7,4,"partial",8,"off-one",1,"swap-op","garden","story|daily"',
        ].join('\n'),
      },
    );

    expect(bulkResult.status).toBe(200);
    expect(
      (bulkResult.body as { importedCount: number }).importedCount,
    ).toBeGreaterThan(0);
  });
});
