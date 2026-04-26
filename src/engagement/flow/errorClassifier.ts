import type { QuestionAttemptRecord } from './types';

export type QuestionErrorPattern = 'swap-op' | 'off-one' | 'partial' | 'timeout';

function numericAnswer(record: QuestionAttemptRecord) {
  const parsed = Number(record.childAnswer);
  if (Number.isFinite(parsed)) {
    return parsed;
  }

  return Number.isFinite(record.finalSelectedAnswer) ? record.finalSelectedAnswer : null;
}

function parseArithmeticStem(stem: string) {
  const normalized = stem.normalize('NFKC').replace(/\s+/g, '').replace(/？/g, '?');

  const resultUnknown = normalized.match(/^(\d+)([+-])(\d+)=\?$/);
  if (resultUnknown) {
    return {
      kind: 'result_unknown' as const,
      left: Number(resultUnknown[1]),
      op: resultUnknown[2] as '+' | '-',
      right: Number(resultUnknown[3]),
    };
  }

  const rightUnknown = normalized.match(/^(\d+)([+-])\?=(\d+)$/);
  if (rightUnknown) {
    return {
      kind: 'right_unknown' as const,
      left: Number(rightUnknown[1]),
      op: rightUnknown[2] as '+' | '-',
      total: Number(rightUnknown[3]),
    };
  }

  return null;
}

export function classifyError(record: QuestionAttemptRecord): QuestionErrorPattern | null {
  if (record.finalCorrect) {
    return null;
  }

  if (
    record.abandoned ||
    record.idleMs >= 12_000 ||
    record.reactionTimeMs >= 12_000 ||
    record.firstResponseTimeMs >= 12_000
  ) {
    return 'timeout';
  }

  const childAnswer = numericAnswer(record);
  if (childAnswer === null) {
    return null;
  }

  const parsed = parseArithmeticStem(record.stem);
  if (parsed?.kind === 'result_unknown') {
    const swapAnswer =
      parsed.op === '+' ? parsed.left - parsed.right : parsed.left + parsed.right;
    if (childAnswer === swapAnswer) {
      return 'swap-op';
    }

    if (childAnswer === parsed.left || childAnswer === parsed.right) {
      return 'partial';
    }
  }

  if (parsed?.kind === 'right_unknown') {
    if (childAnswer === parsed.left || childAnswer === parsed.total) {
      return 'partial';
    }
  }

  if (Math.abs(childAnswer - record.correctAnswer) === 1) {
    return 'off-one';
  }

  return null;
}
