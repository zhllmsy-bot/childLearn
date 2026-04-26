import { loadGoldenSetItems } from './loader';
import type { GoldenSetItem, GoldenSetValidationResult } from './types';

const MAX_PROMPT_LENGTH = 36;
const BANNED_PHRASES = [
  '打死',
  '杀掉',
  '蠢货',
  '笨蛋',
  '身份证',
  '手机号',
  '详细地址',
] as const;

function normalizeText(text: string) {
  return text.replace(/\s+/g, '').trim();
}

function bigrams(text: string) {
  const normalized = normalizeText(text);
  if (normalized.length < 2) {
    return new Set(normalized ? [normalized] : []);
  }

  return new Set(
    Array.from({ length: normalized.length - 1 }, (_, index) =>
      normalized.slice(index, index + 2),
    ),
  );
}

export function similarityScore(left: string, right: string) {
  const leftBigrams = bigrams(left);
  const rightBigrams = bigrams(right);

  if (leftBigrams.size === 0 || rightBigrams.size === 0) {
    return 0;
  }

  let overlap = 0;
  leftBigrams.forEach((token) => {
    if (rightBigrams.has(token)) {
      overlap += 1;
    }
  });

  return (2 * overlap) / (leftBigrams.size + rightBigrams.size);
}

export function validateGoldenSetItem(
  item: GoldenSetItem,
  existingItems: GoldenSetItem[] = loadGoldenSetItems(),
): GoldenSetValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const prompt = item.content.prompt.trim();

  if (!item.id.startsWith('gs_')) {
    errors.push('id must start with gs_.');
  }

  if (!Number.isInteger(item.version) || item.version < 1) {
    errors.push('version must be a positive integer.');
  }

  if (!prompt) {
    errors.push('prompt is required.');
  } else if (prompt.length > MAX_PROMPT_LENGTH) {
    warnings.push(`prompt is longer than ${MAX_PROMPT_LENGTH} characters.`);
  }

  if (item.content.inputType === 'choice') {
    if (item.content.choices.length !== 4) {
      errors.push('choice questions must include exactly 4 options.');
    }

    const correctChoices = item.content.choices.filter((choice) => choice.isCorrect);
    if (correctChoices.length !== 1) {
      errors.push('choice questions must include exactly 1 correct option.');
    }

    const values = item.content.choices.map((choice) => choice.value);
    if (new Set(values).size !== values.length) {
      errors.push('choice values must be unique.');
    }

    if (!values.includes(item.content.correctAnswer)) {
      errors.push('correctAnswer must be present in choices.');
    }

    if (
      correctChoices.length === 1 &&
      correctChoices[0].value !== item.content.correctAnswer
    ) {
      errors.push('the marked correct choice must match correctAnswer.');
    }
  }

  if (item.presentation.variant === 'compare' && !item.presentation.comparePair) {
    errors.push('compare items must include comparePair.');
  }

  if (item.presentation.variant === 'numberLine' && !item.presentation.numberLine) {
    errors.push('numberLine items must include numberLine.');
  }

  if (item.presentation.barModel.length === 0) {
    warnings.push('barModel is empty; scaffolding will be weaker.');
  }

  if (BANNED_PHRASES.some((phrase) => prompt.includes(phrase))) {
    errors.push('prompt includes blocked child-safety language.');
  }

  const duplicate = existingItems
    .filter((candidate) => candidate.id !== item.id)
    .map((candidate) => ({
      id: candidate.id,
      score: similarityScore(candidate.content.prompt, item.content.prompt),
    }))
    .sort((left, right) => right.score - left.score)[0];

  if (duplicate && duplicate.score >= 0.85) {
    warnings.push(`prompt is highly similar to ${duplicate.id} (${duplicate.score.toFixed(2)}).`);
  }

  return { errors, warnings };
}
