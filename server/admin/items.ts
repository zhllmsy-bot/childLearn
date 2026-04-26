import type { ServerResult } from '../childlearnServer';
import {
  loadGoldenSetItems,
  validateGoldenSetItem,
  type GoldenSetAuthorRole,
  type GoldenSetBloomLevel,
  type GoldenSetChoice,
  type GoldenSetInputType,
  type GoldenSetItem,
  type GoldenSetSource,
} from '../../src/curriculum/goldenSet';
import { canPublish, canReview, normalizeWorkflowRole } from './auth';

type JsonRecord = Record<string, unknown>;

let itemCounter = 0;
let runtimeItems = createInitialStore();

function createInitialStore() {
  return new Map<string, GoldenSetItem>(
    loadGoldenSetItems().map((item) => [item.id, item] as const),
  );
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function finiteNumber(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function stringValue(value: unknown, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string').map((item) => item.trim())
    : [];
}

function choiceArray(value: unknown): GoldenSetChoice[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((choice) => {
    if (!isRecord(choice)) {
      return [];
    }

    const numericValue = Math.round(finiteNumber(choice.value, Number(choice.text)));
    if (!Number.isFinite(numericValue)) {
      return [];
    }

    return [
      {
        text: stringValue(choice.text, String(numericValue)),
        value: numericValue,
        isCorrect: Boolean(choice.isCorrect),
        trapType:
          choice.trapType === 'swap-op' ||
          choice.trapType === 'partial' ||
          choice.trapType === 'off-one' ||
          choice.trapType === 'none'
            ? choice.trapType
            : undefined,
        trapHint: typeof choice.trapHint === 'string' ? choice.trapHint.trim() : undefined,
      },
    ];
  });
}

function normalizeAuthorRole(value: unknown): GoldenSetAuthorRole {
  return value === 'teacher' ||
    value === 'expert' ||
    value === 'parent' ||
    value === 'partner'
    ? value
    : 'teacher';
}

function normalizeSource(value: unknown): GoldenSetSource {
  return value === 'handcraft' ||
    value === 'excel-import' ||
    value === 'parent-contributed' ||
    value === 'llm-seeded'
    ? value
    : 'handcraft';
}

function normalizeBloomLevel(value: unknown): GoldenSetBloomLevel {
  return value === 'remember' ||
    value === 'understand' ||
    value === 'apply' ||
    value === 'analyze'
    ? value
    : 'apply';
}

function normalizeInputType(value: unknown): GoldenSetInputType {
  return value === 'choice' ||
    value === 'numpad' ||
    value === 'drag' ||
    value === 'numberLine'
    ? value
    : 'choice';
}

function nextItemId() {
  itemCounter += 1;
  return `gs_runtime_${Date.now()}_${itemCounter}`;
}

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (character === ',' && !inQuotes) {
      cells.push(current);
      current = '';
      continue;
    }

    current += character;
  }

  cells.push(current);
  return cells.map((cell) => cell.trim());
}

function parseBulkImportCsv(csv: string) {
  const lines = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) {
    return [] as JsonRecord[];
  }

  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return headers.reduce((row, header, index) => {
      row[header] = values[index] ?? '';
      return row;
    }, {} as JsonRecord);
  });
}

function buildDraftItem(body: unknown, existing?: GoldenSetItem): GoldenSetItem {
  const payload = isRecord(body) ? body : {};
  const draft = isRecord(payload.draft) ? payload.draft : {};
  const skeleton = isRecord(draft.skeleton) ? draft.skeleton : {};
  const content = isRecord(draft.content) ? draft.content : {};
  const presentation = isRecord(draft.presentation) ? draft.presentation : {};
  const context = isRecord(draft.context) ? draft.context : {};
  const safety = isRecord(draft.safety) ? draft.safety : {};
  const now = Date.now();

  return {
    id: existing?.id ?? nextItemId(),
    version: existing ? existing.version + 1 : 1,
    status: existing?.status ?? 'draft',
    skeleton: {
      skill: stringValue(skeleton.skill, existing?.skeleton.skill ?? 'addWithin10') as GoldenSetItem['skeleton']['skill'],
      secondarySkills:
        stringArray(skeleton.secondarySkills).length > 0
          ? (stringArray(skeleton.secondarySkills) as GoldenSetItem['skeleton']['secondarySkills'])
          : existing?.skeleton.secondarySkills,
      difficulty: Math.max(-2, Math.min(2, finiteNumber(skeleton.difficulty, existing?.skeleton.difficulty ?? 0))),
      bloomLevel: normalizeBloomLevel(skeleton.bloomLevel ?? existing?.skeleton.bloomLevel),
      expectedAccuracy: Math.max(
        0,
        Math.min(1, finiteNumber(skeleton.expectedAccuracy, existing?.skeleton.expectedAccuracy ?? 0.7)),
      ),
    },
    content: {
      prompt: stringValue(content.prompt, existing?.content.prompt),
      narration: stringValue(content.narration, existing?.content.narration),
      inputType: normalizeInputType(content.inputType ?? existing?.content.inputType),
      choices:
        choiceArray(content.choices).length > 0
          ? choiceArray(content.choices)
          : clone(existing?.content.choices ?? []),
      correctAnswer: Math.round(
        finiteNumber(content.correctAnswer, existing?.content.correctAnswer ?? 0),
      ),
      solutionSteps:
        stringArray(content.solutionSteps).length > 0
          ? stringArray(content.solutionSteps)
          : existing?.content.solutionSteps,
    },
    presentation: {
      variant:
        presentation.variant === 'matching' ||
        presentation.variant === 'compare' ||
        presentation.variant === 'makeTen' ||
        presentation.variant === 'missing' ||
        presentation.variant === 'story' ||
        presentation.variant === 'numberLine'
          ? presentation.variant
          : existing?.presentation.variant ?? 'story',
      level: Math.min(
        Math.max(Math.round(finiteNumber(presentation.level, existing?.presentation.level ?? 1)), 1),
        5,
      ) as GoldenSetItem['presentation']['level'],
      expression: stringValue(presentation.expression, existing?.presentation.expression ?? '?'),
      objects:
        stringArray(presentation.objects).length > 0
          ? stringArray(presentation.objects)
          : clone(existing?.presentation.objects ?? []),
      barModel:
        Array.isArray(presentation.barModel) && presentation.barModel.length > 0
          ? presentation.barModel
              .map((value) => Math.round(finiteNumber(value, 0)))
              .filter((value) => Number.isFinite(value))
          : clone(existing?.presentation.barModel ?? []),
      comparePair:
        isRecord(presentation.comparePair)
          ? {
              left: Math.round(finiteNumber(presentation.comparePair.left, 0)),
              right: Math.round(finiteNumber(presentation.comparePair.right, 0)),
            }
          : existing?.presentation.comparePair,
      numberLine:
        isRecord(presentation.numberLine)
          ? {
              start: Math.round(finiteNumber(presentation.numberLine.start, 0)),
              end: Math.round(finiteNumber(presentation.numberLine.end, 0)),
            }
          : existing?.presentation.numberLine,
      theme: isRecord(presentation.theme)
        ? {
            emoji: stringValue(presentation.theme.emoji, existing?.presentation.theme?.emoji ?? '🍎'),
            colorHint: stringValue(
              presentation.theme.colorHint,
              existing?.presentation.theme?.colorHint ?? 'rose',
            ),
          }
        : existing?.presentation.theme,
      scaffoldText: stringValue(
        presentation.scaffoldText,
        existing?.presentation.scaffoldText ?? '先把题意听清楚，再慢慢试一试。',
      ),
      principleText: stringValue(
        presentation.principleText,
        existing?.presentation.principleText ?? '一步一步数，就能找到答案。',
      ),
    },
    context: {
      scene: stringValue(context.scene, existing?.context.scene),
      actors:
        stringArray(context.actors).length > 0
          ? stringArray(context.actors)
          : existing?.context.actors,
      festival:
        context.festival === 'spring-fes' ||
        context.festival === 'mid-autumn' ||
        context.festival === 'children-day'
          ? context.festival
          : existing?.context.festival,
      emotion:
        context.emotion === 'curious' ||
        context.emotion === 'joyful' ||
        context.emotion === 'calm'
          ? context.emotion
          : existing?.context.emotion,
    },
    meta: {
      authorId: stringValue(payload.authorId, existing?.meta.authorId ?? 'local-author'),
      authorRole: normalizeAuthorRole(payload.authorRole ?? existing?.meta.authorRole),
      reviewerId: existing?.meta.reviewerId,
      reviewedAt: existing?.meta.reviewedAt,
      source: normalizeSource(payload.source ?? existing?.meta.source),
      tags:
        stringArray(payload.tags).length > 0
          ? stringArray(payload.tags)
          : clone(existing?.meta.tags ?? []),
      usedInCount: Math.max(0, Math.round(finiteNumber(existing?.meta.usedInCount, 0))),
      globalAccuracy: Math.max(0, Math.min(1, finiteNumber(existing?.meta.globalAccuracy, 0))),
    },
    safety: {
      reviewedForBias: Boolean(safety.reviewedForBias ?? existing?.safety.reviewedForBias),
      reviewedForSafety: Boolean(safety.reviewedForSafety ?? existing?.safety.reviewedForSafety),
      safetyFlags:
        stringArray(safety.safetyFlags).length > 0
          ? stringArray(safety.safetyFlags)
          : clone(existing?.safety.safetyFlags ?? []),
    },
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

function ok(body: unknown): ServerResult {
  return { status: 200, body };
}

function badRequest(error: string, extra: Record<string, unknown> = {}): ServerResult {
  return { status: 400, body: { error, ...extra } };
}

function parseRequestUrl(requestUrl: string) {
  const url = new URL(requestUrl, 'http://localhost');
  const parts = url.pathname
    .replace(/^\/api\/admin\/items\/?/, '')
    .split('/')
    .filter(Boolean);
  return { parts, url };
}

function searchItems(url: URL) {
  const skill = url.searchParams.get('skill');
  const status = url.searchParams.get('status');
  const tag = url.searchParams.get('tag');
  const source = url.searchParams.get('source');

  const items = [...runtimeItems.values()].filter((item) => {
    if (skill && item.skeleton.skill !== skill) {
      return false;
    }
    if (status && item.status !== status) {
      return false;
    }
    if (tag && !item.meta.tags.includes(tag)) {
      return false;
    }
    if (source && item.meta.source !== source) {
      return false;
    }
    return true;
  });

  return ok({
    items,
    total: items.length,
  });
}

function analyticsForItem(itemId: string) {
  const item = runtimeItems.get(itemId);
  if (!item) {
    return { status: 404, body: { error: 'item_not_found' } } satisfies ServerResult;
  }

  return ok({
    analytics: {
      id: item.id,
      status: item.status,
      skill: item.skeleton.skill,
      difficulty: item.skeleton.difficulty,
      usedInCount: item.meta.usedInCount,
      globalAccuracy: item.meta.globalAccuracy,
      expectedAccuracy: item.skeleton.expectedAccuracy,
      tags: item.meta.tags,
    },
  });
}

function createDraft(body: unknown) {
  const item = buildDraftItem(body);
  const validation = validateGoldenSetItem(item, [...runtimeItems.values()]);
  if (validation.errors.length > 0) {
    return { status: 422, body: { error: 'validation_failed', validation } } satisfies ServerResult;
  }

  runtimeItems.set(item.id, item);
  return { status: 201, body: { item, validation } } satisfies ServerResult;
}

function updateDraft(itemId: string, body: unknown) {
  const existing = runtimeItems.get(itemId);
  if (!existing) {
    return { status: 404, body: { error: 'item_not_found' } } satisfies ServerResult;
  }

  if (existing.status !== 'draft') {
    return badRequest('only_draft_items_can_be_updated', { status: existing.status });
  }

  const item = buildDraftItem(body, existing);
  const validation = validateGoldenSetItem(item, [...runtimeItems.values()]);
  if (validation.errors.length > 0) {
    return { status: 422, body: { error: 'validation_failed', validation } } satisfies ServerResult;
  }

  runtimeItems.set(item.id, item);
  return ok({ item, validation });
}

function submitDraft(itemId: string) {
  const item = runtimeItems.get(itemId);
  if (!item) {
    return { status: 404, body: { error: 'item_not_found' } } satisfies ServerResult;
  }

  if (item.status !== 'draft') {
    return badRequest('item_must_be_in_draft_status', { status: item.status });
  }

  const validation = validateGoldenSetItem(item, [...runtimeItems.values()]);
  if (validation.errors.length > 0) {
    return { status: 422, body: { error: 'validation_failed', validation } } satisfies ServerResult;
  }

  const nextItem = {
    ...item,
    status: 'review' as const,
    updatedAt: Date.now(),
  };
  runtimeItems.set(itemId, nextItem);
  return ok({ item: nextItem, validation });
}

function reviewItem(itemId: string, body: unknown) {
  const item = runtimeItems.get(itemId);
  if (!item) {
    return { status: 404, body: { error: 'item_not_found' } } satisfies ServerResult;
  }

  const payload = isRecord(body) ? body : {};
  const role = normalizeWorkflowRole(payload.actorRole);
  if (!canReview(role)) {
    return { status: 403, body: { error: 'reviewer_role_required' } } satisfies ServerResult;
  }

  if (item.status !== 'review') {
    return badRequest('item_must_be_in_review_status', { status: item.status });
  }

  const approved = Boolean(payload.approved);
  const nextItem: GoldenSetItem = approved
    ? {
        ...item,
        meta: {
          ...item.meta,
          reviewerId: stringValue(payload.reviewerId, item.meta.reviewerId ?? 'reviewer'),
          reviewedAt: Date.now(),
        },
        safety: {
          reviewedForBias: Boolean(payload.reviewedForBias),
          reviewedForSafety: Boolean(payload.reviewedForSafety),
          safetyFlags: stringArray(payload.safetyFlags),
        },
        updatedAt: Date.now(),
      }
    : {
        ...item,
        status: 'draft',
        updatedAt: Date.now(),
      };

  runtimeItems.set(itemId, nextItem);
  return ok({
    item: nextItem,
    review: {
      approved,
      feedback: stringValue(payload.feedback),
    },
  });
}

function publishItem(itemId: string, body: unknown) {
  const item = runtimeItems.get(itemId);
  if (!item) {
    return { status: 404, body: { error: 'item_not_found' } } satisfies ServerResult;
  }

  const payload = isRecord(body) ? body : {};
  const role = normalizeWorkflowRole(payload.actorRole);
  if (!canPublish(role)) {
    return { status: 403, body: { error: 'admin_role_required' } } satisfies ServerResult;
  }

  if (item.status !== 'review') {
    return badRequest('item_must_be_in_review_status', { status: item.status });
  }

  if (!item.meta.reviewerId || !item.safety.reviewedForBias || !item.safety.reviewedForSafety) {
    return badRequest('item_must_complete_three_eyes_review');
  }

  const nextItem = {
    ...item,
    status: 'published' as const,
    updatedAt: Date.now(),
  };
  runtimeItems.set(itemId, nextItem);
  return ok({ item: nextItem });
}

function retireItem(itemId: string, body: unknown) {
  const item = runtimeItems.get(itemId);
  if (!item) {
    return { status: 404, body: { error: 'item_not_found' } } satisfies ServerResult;
  }

  const payload = isRecord(body) ? body : {};
  const role = normalizeWorkflowRole(payload.actorRole);
  if (!canPublish(role)) {
    return { status: 403, body: { error: 'admin_role_required' } } satisfies ServerResult;
  }

  const nextItem = {
    ...item,
    status: 'retired' as const,
    updatedAt: Date.now(),
  };
  runtimeItems.set(itemId, nextItem);
  return ok({ item: nextItem });
}

function buildImportRows(body: unknown) {
  const payload = isRecord(body) ? body : {};
  if (Array.isArray(payload.items)) {
    return payload.items.filter((item): item is JsonRecord => isRecord(item));
  }

  if (typeof payload.csv === 'string') {
    return parseBulkImportCsv(payload.csv);
  }

  return [] as JsonRecord[];
}

function bulkImport(body: unknown) {
  const rows = buildImportRows(body);
  const results = rows.map((row) => {
    const item = buildDraftItem({
      authorId: row.authorId ?? 'bulk-import',
      authorRole: row.authorRole ?? 'partner',
      source: row.source ?? 'excel-import',
      tags: stringValue(row.tags)
        .split('|')
        .map((tag) => tag.trim())
        .filter(Boolean),
      draft: {
        skeleton: {
          skill: row.skill,
          difficulty: finiteNumber(row.difficulty, 0),
          bloomLevel: row.bloom,
          expectedAccuracy: 0.7,
        },
        content: {
          prompt: row.prompt,
          inputType: 'choice',
          correctAnswer: finiteNumber(row.correct, 0),
          choices: [
            { text: String(row.correct ?? ''), value: finiteNumber(row.correct, 0), isCorrect: true },
            { text: String(row.trap1 ?? ''), value: finiteNumber(row.trap1, 0), isCorrect: false, trapType: row.trap1_type },
            { text: String(row.trap2 ?? ''), value: finiteNumber(row.trap2, 0), isCorrect: false, trapType: row.trap2_type },
            { text: String(row.trap3 ?? ''), value: finiteNumber(row.trap3, 0), isCorrect: false, trapType: row.trap3_type },
          ],
        },
        presentation: {
          variant:
            row.skill === 'numberLineDistance'
              ? 'numberLine'
              : row.skill === 'compareWithin5' ||
                  row.skill === 'compareWithin10' ||
                  row.skill === 'compareWithin20'
                ? 'compare'
                : row.skill === 'makeTen' || row.skill === 'crossTenBridge'
                  ? 'makeTen'
                  : row.skill === 'missingAddend'
                    ? 'missing'
                    : 'story',
          level: Math.min(Math.max(Math.round((finiteNumber(row.difficulty, 0) + 2) * 1.25), 1), 5),
          expression: '?',
          objects: [],
          barModel: [finiteNumber(row.correct, 0)],
          scaffoldText: '先把题意听清楚，再慢慢试一试。',
          principleText: '一步一步数，就能找到答案。',
        },
        context: {
          scene: row.scene,
        },
        safety: {
          reviewedForBias: false,
          reviewedForSafety: false,
          safetyFlags: [],
        },
      },
    });
    const validation = validateGoldenSetItem(item, [...runtimeItems.values()]);
    if (validation.errors.length === 0) {
      runtimeItems.set(item.id, item);
    }
    return {
      id: item.id,
      prompt: item.content.prompt,
      imported: validation.errors.length === 0,
      validation,
    };
  });

  return ok({
    importedCount: results.filter((result) => result.imported).length,
    results,
  });
}

export async function handleAdminItemsRequest(
  method: string,
  requestUrl: string,
  body: unknown,
): Promise<ServerResult> {
  const { parts, url } = parseRequestUrl(requestUrl);

  if (method === 'GET' && parts.length === 0) {
    return searchItems(url);
  }

  if (method === 'POST' && parts.length === 0) {
    return createDraft(body);
  }

  if (method === 'GET' && parts.length === 1 && parts[0] === 'search') {
    return searchItems(url);
  }

  if (method === 'POST' && parts.length === 1 && parts[0] === 'bulk-import') {
    return bulkImport(body);
  }

  if (method === 'PUT' && parts.length === 1) {
    return updateDraft(parts[0], body);
  }

  if (parts.length === 2 && parts[1] === 'submit' && method === 'POST') {
    return submitDraft(parts[0]);
  }

  if (parts.length === 2 && parts[1] === 'review' && method === 'POST') {
    return reviewItem(parts[0], body);
  }

  if (parts.length === 2 && parts[1] === 'publish' && method === 'POST') {
    return publishItem(parts[0], body);
  }

  if (parts.length === 2 && parts[1] === 'retire' && method === 'POST') {
    return retireItem(parts[0], body);
  }

  if (parts.length === 2 && parts[1] === 'analytics' && method === 'GET') {
    return analyticsForItem(parts[0]);
  }

  return { status: 404, body: { error: 'not_found' } };
}

export function resetAdminItemStoreForTests() {
  itemCounter = 0;
  runtimeItems = createInitialStore();
}
