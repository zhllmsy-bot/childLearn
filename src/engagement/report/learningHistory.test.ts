import { afterEach, describe, expect, it, vi } from 'vitest';
import type { QuestionAttemptRecord } from '../flow';
import {
  LEARNING_HISTORY_STORAGE_KEY,
  createLearningHistorySummary,
  recordLearningHistory,
} from './learningHistory';

class MemoryStorage implements Storage {
  private values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  clear() {
    this.values.clear();
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  key(index: number) {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

function createAttempt(operationType: 'addition' | 'subtraction'): QuestionAttemptRecord {
  return {
    questionId: `q-${operationType}`,
    questionIndex: 0,
    tags: {
      numberRange: 'within_10',
      operationType,
      presentationType: 'visual',
      visualSupport: 'strong',
      crossTen: false,
      carryOrBorrow: false,
      optionDistance: 'medium',
      difficultyLevel: 1,
    },
    stem: operationType === 'addition' ? '2 + 3 = ?' : '5 - 2 = ?',
    choices: ['2', '3', '4', '5'],
    correctAnswer: 5,
    childAnswer: '5',
    firstSelectedAnswer: 4,
    finalSelectedAnswer: 5,
    firstAttemptCorrect: false,
    finalCorrect: true,
    attemptCount: 2,
    reactionTimeMs: 1_200,
    firstResponseTimeMs: 1_200,
    totalTimeMs: 3_200,
    audioReplayCount: 0,
    hintCount: 1,
    idleMs: 0,
    rapidClickCount: 0,
    feedbackInterruptClickCount: 0,
    abandoned: false,
    result: 'wrong_first_then_correct',
  };
}

describe('learningHistory', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('weights recent focus skills above stale 90-day history', () => {
    const localStorage = new MemoryStorage();
    vi.stubGlobal('window', {
      localStorage,
      setTimeout,
      clearTimeout,
    });

    const now = new Date(2026, 3, 25);
    recordLearningHistory(createAttempt('addition'), new Date(2026, 2, 25));
    recordLearningHistory(createAttempt('addition'), new Date(2026, 2, 25));
    recordLearningHistory(createAttempt('addition'), new Date(2026, 2, 25));
    recordLearningHistory(createAttempt('subtraction'), now);

    const summary = createLearningHistorySummary(now);

    expect(localStorage.getItem(LEARNING_HISTORY_STORAGE_KEY)).toContain('2026-04-25');
    expect(summary.focusSkills[0]).toMatchObject({
      key: 'operation:subtraction',
      count: 1,
    });
    expect(summary.focusSkills.some((skill) => skill.key === 'operation:addition')).toBe(false);
  });
});
