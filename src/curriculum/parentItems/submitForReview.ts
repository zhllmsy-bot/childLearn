import type { ParentItem } from './types';

export async function submitParentItemForReview(item: ParentItem) {
  const response = await fetch('/api/admin/items', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      authorId: item.ownerId,
      authorRole: item.source,
      source: 'parent-contributed',
      tags: ['parent-contributed', item.variant],
      draft: {
        skeleton: {
          skill: item.skill,
          difficulty: Math.max(-2, Math.min(2, ((item.difficulty - 1) / 9) * 4 - 2)),
          bloomLevel: 'apply',
          expectedAccuracy: 0.7,
        },
        content: {
          prompt: item.prompt,
          inputType: 'choice',
          correctAnswer: item.answer,
          choices: [
            { text: String(item.answer), value: item.answer, isCorrect: true },
            ...item.distractors.map((value) => ({
              text: String(value),
              value,
              isCorrect: false,
            })),
          ].slice(0, 4),
        },
        presentation: {
          variant: item.variant,
          level: Math.min(Math.max(Math.round((item.difficulty + 1) / 2), 1), 5),
          expression: '?',
          objects: [],
          barModel: [item.answer],
          scaffoldText: '先把题意听清楚，再慢慢试一试。',
          principleText: '把生活里的数量关系想明白，就能找到答案。',
        },
        context: {},
        safety: {
          reviewedForBias: false,
          reviewedForSafety: false,
          safetyFlags: [],
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error('submit_parent_item_failed');
  }

  return (await response.json()) as { item: unknown };
}
