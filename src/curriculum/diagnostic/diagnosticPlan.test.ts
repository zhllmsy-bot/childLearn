import { describe, expect, it } from 'vitest';
import {
  DIAGNOSTIC_QUESTION_COUNT,
  getDiagnosticQuestion,
} from './diagnosticPlan';

describe('diagnosticPlan', () => {
  it('keeps a five-question diagnostic run', () => {
    const questions = Array.from({ length: DIAGNOSTIC_QUESTION_COUNT }, (_, serial) =>
      getDiagnosticQuestion(serial, 1001),
    );

    expect(questions).toHaveLength(5);
    expect(questions.every((question) => question.id.startsWith('diagnostic-'))).toBe(true);
  });

  it('varies question order and generated content by run seed', () => {
    const firstRun = Array.from({ length: DIAGNOSTIC_QUESTION_COUNT }, (_, serial) =>
      getDiagnosticQuestion(serial, 1001).id,
    );
    const secondRun = Array.from({ length: DIAGNOSTIC_QUESTION_COUNT }, (_, serial) =>
      getDiagnosticQuestion(serial, 2027).id,
    );

    expect(secondRun).not.toEqual(firstRun);
  });
});
