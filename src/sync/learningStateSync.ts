import { useEffect } from 'react';
import { resolveRuntimeUrl } from '../network/runtimeUrl';
import { track } from '../telemetry/track';

export const LEARNING_STATE_SCHEMA_VERSION = 'childlearn.learning-state.v1';

export const LEARNING_STORAGE_KEYS = [
  'childlearn.session-stats',
  'childlearn.app-state-v1',
  'childlearn.combo-state',
  'childlearn.combo-max',
  'childlearn.rank-stars',
  'childlearn.dda-state',
  'childlearn.number-spirits',
  'childlearn.reward-garden',
  'childlearn.daily-first-win',
  'childlearn.m78-stickers',
  'childlearn.m78-sticker-progress-v2',
  'childlearn.ability-profile-v1',
  'childlearn.programming-progress-v1',
  'childlearn.diagnostic-v1',
  'childlearn.learning-history-v1',
  'childlearn.learner-model-v1',
] as const;

type LearningStorageKey = (typeof LEARNING_STORAGE_KEYS)[number];
type LearningStorage = Partial<Record<LearningStorageKey, string>>;

export interface LearningStateEnvelope {
  schemaVersion: typeof LEARNING_STATE_SCHEMA_VERSION;
  childId: string;
  deviceId: string;
  clientUpdatedAt: number;
  storage: LearningStorage;
}

interface LearningStateServerResponse {
  ok?: boolean;
  state?: LearningStateEnvelope | null;
  revision?: number;
  serverUpdatedAt?: number;
}

export interface MergeResult {
  storage: LearningStorage;
  changedKeys: LearningStorageKey[];
}

const LEARNING_SYNC_URL = import.meta.env.VITE_LEARNING_SYNC_URL?.trim();
const CONFIGURED_CHILD_ID = import.meta.env.VITE_LEARNING_CHILD_ID?.trim();
const CHILD_ID_STORAGE_KEY = 'childlearn.child-id';
const DEVICE_ID_STORAGE_KEY = 'childlearn.device-id';
const PUSH_DEBOUNCE_MS = 800;
const CONFIGURED_SYNC_TOKEN = import.meta.env.VITE_LEARNING_SYNC_TOKEN?.trim();

let pushTimer: number | undefined;
let pendingReason = 'unknown';
let inFlightPush: Promise<void> | null = null;
let lastPushedSignature = '';

function isBrowser() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function getLearningSyncUrl() {
  return resolveRuntimeUrl(LEARNING_SYNC_URL);
}

function createLocalId(prefix: string) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function getOrCreateStorageId(key: string, prefix: string) {
  const existing = window.localStorage.getItem(key);
  if (existing) {
    return existing;
  }

  const next = createLocalId(prefix);
  window.localStorage.setItem(key, next);
  return next;
}

function getChildId() {
  if (!isBrowser()) {
    return CONFIGURED_CHILD_ID || 'local-child';
  }

  if (CONFIGURED_CHILD_ID) {
    window.localStorage.setItem(CHILD_ID_STORAGE_KEY, CONFIGURED_CHILD_ID);
    return CONFIGURED_CHILD_ID;
  }

  return getOrCreateStorageId(CHILD_ID_STORAGE_KEY, 'child');
}

function getDeviceId() {
  return getOrCreateStorageId(DEVICE_ID_STORAGE_KEY, 'device');
}

function parseJson(value: string | undefined) {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function numberFromString(value: string | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function stringifyNumber(value: number) {
  return String(Math.max(0, Math.round(value)));
}

function finiteNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function mergeJsonNumberRecord(localValue: string | undefined, remoteValue: string | undefined) {
  const local = parseJson(localValue);
  const remote = parseJson(remoteValue);
  const merged: Record<string, number> = {};

  if (isPlainRecord(local)) {
    Object.entries(local).forEach(([key, value]) => {
      const numeric = Number(value);
      if (Number.isFinite(numeric)) {
        merged[key] = Math.max(0, numeric);
      }
    });
  }

  if (isPlainRecord(remote)) {
    Object.entries(remote).forEach(([key, value]) => {
      const numeric = Number(value);
      if (Number.isFinite(numeric)) {
        merged[key] = Math.max(merged[key] ?? 0, Math.max(0, numeric));
      }
    });
  }

  return JSON.stringify(merged);
}

function mergeJsonNumberFields(
  localValue: string | undefined,
  remoteValue: string | undefined,
  fieldNames: string[],
) {
  const local = parseJson(localValue);
  const remote = parseJson(remoteValue);
  const merged: Record<string, number> = {};

  fieldNames.forEach((fieldName) => {
    const localNumber = isPlainRecord(local) ? Number(local[fieldName] ?? 0) : 0;
    const remoteNumber = isPlainRecord(remote) ? Number(remote[fieldName] ?? 0) : 0;
    merged[fieldName] = Math.max(
      Number.isFinite(localNumber) ? localNumber : 0,
      Number.isFinite(remoteNumber) ? remoteNumber : 0,
    );
  });

  return JSON.stringify(merged);
}

function mergeComboState(localValue: string | undefined, remoteValue: string | undefined) {
  const local = parseJson(localValue);
  const remote = parseJson(remoteValue);
  const localCurrent = isPlainRecord(local) ? Number(local.current ?? 0) : 0;
  const remoteCurrent = isPlainRecord(remote) ? Number(remote.current ?? 0) : 0;
  const localMax = isPlainRecord(local) ? Number(local.maxEver ?? 0) : 0;
  const remoteMax = isPlainRecord(remote) ? Number(remote.maxEver ?? 0) : 0;

  return JSON.stringify({
    current: Math.max(
      Number.isFinite(localCurrent) ? localCurrent : 0,
      Number.isFinite(remoteCurrent) ? remoteCurrent : 0,
    ),
    maxEver: Math.max(
      Number.isFinite(localMax) ? localMax : 0,
      Number.isFinite(remoteMax) ? remoteMax : 0,
    ),
  });
}

function mergeStickerIds(localValue: string | undefined, remoteValue: string | undefined) {
  const merged = new Set<string>();

  [parseJson(localValue), parseJson(remoteValue)].forEach((value) => {
    if (Array.isArray(value)) {
      value.forEach((id) => {
        if (typeof id === 'string') {
          merged.add(id);
        }
      });
    }
  });

  return JSON.stringify([...merged]);
}

function mergeStickerProgress(localValue: string | undefined, remoteValue: string | undefined) {
  const local = parseJson(localValue);
  const remote = parseJson(remoteValue);
  const ids = new Set<string>();

  [local, remote].forEach((value) => {
    if (!isPlainRecord(value) || !Array.isArray(value.collectedIds)) {
      return;
    }

    value.collectedIds.forEach((id) => {
      if (typeof id === 'string') {
        ids.add(id);
      }
    });
  });

  const localRecord = isPlainRecord(local) ? local : {};
  const remoteRecord = isPlainRecord(remote) ? remote : {};

  return JSON.stringify({
    schemaVersion: 2,
    collectedIds: [...ids],
    pityCounter: Math.max(
      finiteNumber(localRecord.pityCounter),
      finiteNumber(remoteRecord.pityCounter),
    ),
    duplicateShards: Math.max(
      finiteNumber(localRecord.duplicateShards),
      finiteNumber(remoteRecord.duplicateShards),
    ),
  });
}

function mergeGarden(localValue: string | undefined, remoteValue: string | undefined) {
  const local = parseJson(localValue);
  const remote = parseJson(remoteValue);
  const localRecord = isPlainRecord(local) ? local : {};
  const remoteRecord = isPlainRecord(remote) ? remote : {};
  const badges = new Set<string>();

  [localRecord.badges, remoteRecord.badges].forEach((value) => {
    if (Array.isArray(value)) {
      value.forEach((badge) => {
        if (typeof badge === 'string') {
          badges.add(badge);
        }
      });
    }
  });

  const wateredDays = [localRecord.lastWateredDay, remoteRecord.lastWateredDay]
    .filter((value): value is string => typeof value === 'string')
    .sort();
  const lastWateredDay =
    wateredDays.length > 0 ? wateredDays[wateredDays.length - 1] : null;

  return JSON.stringify({
    lastWateredDay,
    streak: Math.max(finiteNumber(localRecord.streak), finiteNumber(remoteRecord.streak), 0),
    totalWaterings: Math.max(
      finiteNumber(localRecord.totalWaterings),
      finiteNumber(remoteRecord.totalWaterings),
      0,
    ),
    fruitCoins: Math.max(
      finiteNumber(localRecord.fruitCoins),
      finiteNumber(remoteRecord.fruitCoins),
      0,
    ),
    badges: [...badges].sort(),
  });
}

function appSnapshotUpdatedAt(value: string | undefined) {
  const parsed = parseJson(value);
  return isPlainRecord(parsed) ? finiteNumber(parsed.updatedAt) : 0;
}

function diagnosticCompletedAt(value: string | undefined) {
  const parsed = parseJson(value);
  return isPlainRecord(parsed) ? finiteNumber(parsed.completedAt) : 0;
}

function mergeAbilityProfile(localValue: string | undefined, remoteValue: string | undefined) {
  const local = parseJson(localValue);
  const remote = parseJson(remoteValue);
  const localRecord = isPlainRecord(local) ? local : {};
  const remoteRecord = isPlainRecord(remote) ? remote : {};
  const localSkills = isPlainRecord(localRecord.skills) ? localRecord.skills : {};
  const remoteSkills = isPlainRecord(remoteRecord.skills) ? remoteRecord.skills : {};
  const skillKeys = new Set([...Object.keys(localSkills), ...Object.keys(remoteSkills)]);
  const skills: Record<string, Record<string, unknown>> = {};
  const numericFields = [
    'attempts',
    'firstTryCorrect',
    'finalCorrect',
    'hintUsed',
    'audioReplayUsed',
    'totalFirstResponseTimeMs',
    'totalTimeMs',
    'slowCount',
    'lastSeenAt',
  ];

  skillKeys.forEach((skillKey) => {
    const localSkill = isPlainRecord(localSkills[skillKey])
      ? localSkills[skillKey]
      : {};
    const remoteSkill = isPlainRecord(remoteSkills[skillKey])
      ? remoteSkills[skillKey]
      : {};
    const mergedSkill: Record<string, unknown> = {
      ...localSkill,
      ...remoteSkill,
      key: skillKey,
      label:
        typeof remoteSkill.label === 'string'
          ? remoteSkill.label
          : localSkill.label ?? skillKey,
      category:
        typeof remoteSkill.category === 'string'
          ? remoteSkill.category
          : localSkill.category ?? '能力点',
    };

    numericFields.forEach((field) => {
      mergedSkill[field] = Math.max(
        finiteNumber(localSkill[field]),
        finiteNumber(remoteSkill[field]),
      );
    });

    skills[skillKey] = mergedSkill;
  });

  return JSON.stringify({
    schemaVersion: 1,
    updatedAt: Math.max(
      finiteNumber(localRecord.updatedAt),
      finiteNumber(remoteRecord.updatedAt),
    ),
    totalCompletedQuestions: Math.max(
      finiteNumber(localRecord.totalCompletedQuestions),
      finiteNumber(remoteRecord.totalCompletedQuestions),
    ),
    skills,
  });
}

function mergeProgrammingProgress(
  localValue: string | undefined,
  remoteValue: string | undefined,
) {
  const local = parseJson(localValue);
  const remote = parseJson(remoteValue);
  const localRecord = isPlainRecord(local) ? local : {};
  const remoteRecord = isPlainRecord(remote) ? remote : {};
  const completed = new Set<string>();

  [localRecord.completedLevelIds, remoteRecord.completedLevelIds].forEach((value) => {
    if (Array.isArray(value)) {
      value.forEach((id) => {
        if (typeof id === 'string') {
          completed.add(id);
        }
      });
    }
  });

  const localUpdatedAt = finiteNumber(localRecord.updatedAt);
  const remoteUpdatedAt = finiteNumber(remoteRecord.updatedAt);
  const latestRecord =
    remoteUpdatedAt >= localUpdatedAt ? remoteRecord : localRecord;
  const sortedCompleted = [...completed].sort();
  const fallbackLastLevelId =
    sortedCompleted[sortedCompleted.length - 1] ?? null;
  const lastLevelId =
    typeof latestRecord.lastLevelId === 'string'
      ? latestRecord.lastLevelId
      : fallbackLastLevelId;

  return JSON.stringify({
    schemaVersion: 1,
    completedLevelIds: sortedCompleted,
    lastLevelId,
    totalCompletions: Math.max(
      finiteNumber(localRecord.totalCompletions),
      finiteNumber(remoteRecord.totalCompletions),
      completed.size,
    ),
    updatedAt: Math.max(localUpdatedAt, remoteUpdatedAt),
  });
}

function mergeLearningHistory(localValue: string | undefined, remoteValue: string | undefined) {
  const local = parseJson(localValue);
  const remote = parseJson(remoteValue);
  const byDay = new Map<string, Record<string, unknown>>();

  [local, remote].forEach((value) => {
    if (!isPlainRecord(value) || !Array.isArray(value.days)) {
      return;
    }

    value.days.forEach((entry) => {
      if (!isPlainRecord(entry) || typeof entry.day !== 'string') {
        return;
      }

      const previous = byDay.get(entry.day) ?? {};
      const focusSkillCounts = {
        ...(isPlainRecord(previous.focusSkillCounts) ? previous.focusSkillCounts : {}),
      } as Record<string, number>;
      const incomingFocus = isPlainRecord(entry.focusSkillCounts)
        ? entry.focusSkillCounts
        : {};

      Object.entries(incomingFocus).forEach(([key, count]) => {
        focusSkillCounts[key] = Math.max(
          Number(focusSkillCounts[key] ?? 0),
          finiteNumber(count),
        );
      });

      byDay.set(entry.day, {
        day: entry.day,
        attempted: Math.max(finiteNumber(previous.attempted), finiteNumber(entry.attempted)),
        correct: Math.max(finiteNumber(previous.correct), finiteNumber(entry.correct)),
        firstTryCorrect: Math.max(
          finiteNumber(previous.firstTryCorrect),
          finiteNumber(entry.firstTryCorrect),
        ),
        hintsUsed: Math.max(finiteNumber(previous.hintsUsed), finiteNumber(entry.hintsUsed)),
        totalTimeMs: Math.max(finiteNumber(previous.totalTimeMs), finiteNumber(entry.totalTimeMs)),
        focusSkillCounts,
        updatedAt: Math.max(finiteNumber(previous.updatedAt), finiteNumber(entry.updatedAt)),
      });
    });
  });

  return JSON.stringify({
    schemaVersion: 1,
    days: [...byDay.values()]
      .sort((left, right) => String(left.day).localeCompare(String(right.day)))
      .slice(-90),
  });
}

function learnerModelUpdatedAt(value: string | undefined) {
  const parsed = parseJson(value);
  return isPlainRecord(parsed) ? finiteNumber(parsed.updatedAt) : 0;
}

function mergeValue(
  key: LearningStorageKey,
  localValue: string | undefined,
  remoteValue: string | undefined,
) {
  if (remoteValue === undefined) {
    return localValue;
  }

  if (localValue === undefined) {
    return remoteValue;
  }

  switch (key) {
    case 'childlearn.combo-max':
    case 'childlearn.rank-stars':
      return stringifyNumber(
        Math.max(numberFromString(localValue), numberFromString(remoteValue)),
      );
    case 'childlearn.session-stats':
      return mergeJsonNumberFields(localValue, remoteValue, [
        'attempted',
        'correct',
        'hintsUsed',
      ]);
    case 'childlearn.combo-state':
      return mergeComboState(localValue, remoteValue);
    case 'childlearn.number-spirits':
      return mergeJsonNumberRecord(localValue, remoteValue);
    case 'childlearn.reward-garden':
      return mergeGarden(localValue, remoteValue);
    case 'childlearn.daily-first-win':
      return [localValue, remoteValue].sort()[1];
    case 'childlearn.m78-stickers':
      return mergeStickerIds(localValue, remoteValue);
    case 'childlearn.m78-sticker-progress-v2':
      return mergeStickerProgress(localValue, remoteValue);
    case 'childlearn.ability-profile-v1':
      return mergeAbilityProfile(localValue, remoteValue);
    case 'childlearn.programming-progress-v1':
      return mergeProgrammingProgress(localValue, remoteValue);
    case 'childlearn.diagnostic-v1':
      return diagnosticCompletedAt(remoteValue) >= diagnosticCompletedAt(localValue)
        ? remoteValue
        : localValue;
    case 'childlearn.learning-history-v1':
      return mergeLearningHistory(localValue, remoteValue);
    case 'childlearn.learner-model-v1':
      return learnerModelUpdatedAt(remoteValue) >= learnerModelUpdatedAt(localValue)
        ? remoteValue
        : localValue;
    case 'childlearn.app-state-v1':
      return appSnapshotUpdatedAt(remoteValue) >= appSnapshotUpdatedAt(localValue)
        ? remoteValue
        : localValue;
    case 'childlearn.dda-state':
      return remoteValue;
  }
}

export function mergeLearningStorage(
  localStorageSnapshot: LearningStorage,
  remoteStorageSnapshot: LearningStorage,
): MergeResult {
  const merged: LearningStorage = { ...localStorageSnapshot };
  const changedKeys: LearningStorageKey[] = [];

  LEARNING_STORAGE_KEYS.forEach((key) => {
    const nextValue = mergeValue(
      key,
      localStorageSnapshot[key],
      remoteStorageSnapshot[key],
    );

    if (nextValue === undefined) {
      return;
    }

    merged[key] = nextValue;
    if (localStorageSnapshot[key] !== nextValue) {
      changedKeys.push(key);
    }
  });

  return { storage: merged, changedKeys };
}

function readLearningStorage(): LearningStorage {
  const storage: LearningStorage = {};

  LEARNING_STORAGE_KEYS.forEach((key) => {
    const value = window.localStorage.getItem(key);
    if (value !== null) {
      storage[key] = value;
    }
  });

  return storage;
}

function writeLearningStorage(storage: LearningStorage, keys: LearningStorageKey[]) {
  keys.forEach((key) => {
    const value = storage[key];
    if (value !== undefined) {
      window.localStorage.setItem(key, value);
    }
  });
}

function createEnvelope(): LearningStateEnvelope {
  return {
    schemaVersion: LEARNING_STATE_SCHEMA_VERSION,
    childId: getChildId(),
    deviceId: getDeviceId(),
    clientUpdatedAt: Date.now(),
    storage: readLearningStorage(),
  };
}

function snapshotSignature(envelope: LearningStateEnvelope) {
  return JSON.stringify({
    childId: envelope.childId,
    storage: envelope.storage,
  });
}

async function pushLearningStateSnapshot(reason: string) {
  const learningSyncUrl = getLearningSyncUrl();
  if (!isBrowser() || !learningSyncUrl) {
    return;
  }

  const envelope = createEnvelope();
  const signature = snapshotSignature(envelope);
  if (signature === lastPushedSignature) {
    return;
  }

  try {
    const response = await fetch(learningSyncUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(CONFIGURED_SYNC_TOKEN ? { Authorization: `Bearer ${CONFIGURED_SYNC_TOKEN}` } : {}),
      },
      body: JSON.stringify({ reason, state: envelope }),
      keepalive: true,
    });

    if (!response.ok) {
      throw new Error(`sync push failed: ${response.status}`);
    }

    lastPushedSignature = signature;
    track('sync.push', {
      childId: envelope.childId,
      keyCount: Object.keys(envelope.storage).length,
      reason,
    });
  } catch {
    track('sync.push_failed', {
      childId: envelope.childId,
      reason,
    });
  }
}

export function scheduleLearningStateSync(reason: string) {
  if (!isBrowser() || !getLearningSyncUrl()) {
    return;
  }

  pendingReason = reason;
  if (pushTimer !== undefined) {
    window.clearTimeout(pushTimer);
  }

  pushTimer = window.setTimeout(() => {
    pushTimer = undefined;
    if (!inFlightPush) {
      inFlightPush = pushLearningStateSnapshot(pendingReason).finally(() => {
        inFlightPush = null;
      });
    }
  }, PUSH_DEBOUNCE_MS);
}

async function pullLearningStateSnapshot() {
  const learningSyncUrl = getLearningSyncUrl();
  if (!isBrowser() || !learningSyncUrl) {
    return [];
  }

  const childId = encodeURIComponent(getChildId());
  const response = await fetch(`${learningSyncUrl}?childId=${childId}`, {
    headers: {
      ...(CONFIGURED_SYNC_TOKEN ? { Authorization: `Bearer ${CONFIGURED_SYNC_TOKEN}` } : {}),
    },
  });
  if (!response.ok) {
    throw new Error(`sync pull failed: ${response.status}`);
  }

  const payload = (await response.json()) as LearningStateServerResponse;
  if (payload.state?.schemaVersion !== LEARNING_STATE_SCHEMA_VERSION) {
    return [];
  }

  const localStorageSnapshot = readLearningStorage();
  const result = mergeLearningStorage(localStorageSnapshot, payload.state.storage ?? {});
  writeLearningStorage(result.storage, result.changedKeys);
  return result.changedKeys;
}

export function useLearningStateSync() {
  useEffect(() => {
    if (!isBrowser() || !getLearningSyncUrl()) {
      return;
    }

    let cancelled = false;

    void pullLearningStateSnapshot()
      .then((changedKeys) => {
        if (cancelled) {
          return;
        }

        if (changedKeys.length > 0) {
          track('sync.pull', {
            childId: getChildId(),
            changedKeyCount: changedKeys.length,
          });

          window.dispatchEvent(
            new CustomEvent('childlearn:learning-state-merged', {
              detail: { changedKeys },
            }),
          );
        }

        scheduleLearningStateSync('startup');
      })
      .catch(() => {
        track('sync.pull_failed', {
          childId: getChildId(),
        });
        scheduleLearningStateSync('startup_after_pull_failed');
      });

    const handleOnline = () => scheduleLearningStateSync('online');
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        scheduleLearningStateSync('visibility_hidden');
      }
    };

    window.addEventListener('online', handleOnline);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
}
