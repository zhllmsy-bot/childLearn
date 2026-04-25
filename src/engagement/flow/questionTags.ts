import type { Question } from '../../curriculum/types';
import type {
  DifficultyLevel,
  NumberRange,
  OperationType,
  OptionDistance,
  PresentationType,
  QuestionDifficultyTags,
  VisualSupport,
} from './types';

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function numberRangeFor(value: number): NumberRange {
  if (value <= 5) {
    return 'within_5';
  }

  if (value <= 10) {
    return 'within_10';
  }

  if (value <= 20) {
    return 'within_20';
  }

  return 'within_30';
}

function operationTypeFor(question: Question): OperationType {
  if (question.variant === 'matching') {
    return 'matching';
  }

  if (question.variant === 'compare') {
    return 'compare';
  }

  if (question.variant === 'numberLine') {
    return 'subtraction';
  }

  return 'addition';
}

function presentationTypeFor(question: Question): PresentationType {
  if (question.variant === 'story') {
    return 'story';
  }

  if (question.variant === 'numberLine') {
    return 'number_line';
  }

  if (question.variant === 'matching' || question.variant === 'compare') {
    return 'visual';
  }

  return 'semi_visual';
}

function visualSupportFor(question: Question): VisualSupport {
  if (question.variant === 'matching' || question.variant === 'compare') {
    return 'strong';
  }

  if (question.variant === 'story' || question.variant === 'numberLine') {
    return 'medium';
  }

  if (question.objects.length > 0 || question.barModel.length > 0) {
    return 'medium';
  }

  return 'none';
}

function optionDistanceFor(question: Question): OptionDistance {
  const values = [...new Set(question.options.map((option) => option.value))].sort(
    (left, right) => left - right,
  );

  if (values.length < 2) {
    return 'wide';
  }

  const minGap = values.slice(1).reduce((smallest, value, index) => {
    const gap = value - values[index];
    return Math.min(smallest, gap);
  }, Number.POSITIVE_INFINITY);

  if (minGap <= 1) {
    return 'close';
  }

  if (minGap <= 3) {
    return 'medium';
  }

  return 'wide';
}

function crossesTen(question: Question) {
  if (question.numberLine) {
    return question.numberLine.start < 10 && question.numberLine.end >= 10;
  }

  const total = question.barModel.reduce((sum, part) => sum + part, 0);
  const startsBelowTen = question.barModel.some((part) => part < 10);

  return startsBelowTen && total >= 10;
}

function hasCarryOrBorrow(question: Question, operationType: OperationType) {
  if (operationType === 'subtraction') {
    return false;
  }

  const total = question.barModel.reduce((sum, part) => sum + part, 0);
  return question.barModel.length >= 2 && total >= 10;
}

function difficultyLevelFor(question: Question): DifficultyLevel {
  const presentationLoad =
    question.variant === 'story' || question.variant === 'missing' ? 1 : 0;
  const optionLoad = optionDistanceFor(question) === 'close' ? 1 : 0;
  const raw = question.level + presentationLoad + optionLoad - 1;

  return clamp(raw, 0, 7) as DifficultyLevel;
}

export function deriveQuestionDifficultyTags(
  question: Question,
): QuestionDifficultyTags {
  const operationType = operationTypeFor(question);
  const maxValue = Math.max(
    question.answer,
    ...question.options.map((option) => option.value),
    ...question.barModel,
    question.comparePair?.left ?? 0,
    question.comparePair?.right ?? 0,
    question.numberLine?.end ?? 0,
  );

  return {
    numberRange: numberRangeFor(maxValue),
    operationType,
    presentationType: presentationTypeFor(question),
    visualSupport: visualSupportFor(question),
    crossTen: crossesTen(question),
    carryOrBorrow: hasCarryOrBorrow(question, operationType),
    optionDistance: optionDistanceFor(question),
    difficultyLevel: difficultyLevelFor(question),
  };
}
