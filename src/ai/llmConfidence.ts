function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

interface LlmConfidenceOptions {
  minConfidence?: number;
  fullConfidence?: number;
  maxInfluence?: number;
}

const DEFAULT_MIN_CONFIDENCE = 0.2;
const DEFAULT_FULL_CONFIDENCE = 0.85;

export function llmConfidenceWeight(
  confidence: number,
  {
    minConfidence = DEFAULT_MIN_CONFIDENCE,
    fullConfidence = DEFAULT_FULL_CONFIDENCE,
    maxInfluence = 1,
  }: LlmConfidenceOptions = {},
) {
  if (!Number.isFinite(confidence) || maxInfluence <= 0) {
    return 0;
  }

  if (confidence <= minConfidence) {
    return 0;
  }

  if (confidence >= fullConfidence) {
    return maxInfluence;
  }

  const ratio = (confidence - minConfidence) / (fullConfidence - minConfidence);
  return clamp(ratio, 0, 1) * maxInfluence;
}

export function blendNumbers(
  localValue: number,
  llmValue: number,
  confidence: number,
  options?: LlmConfidenceOptions,
) {
  const llmWeight = llmConfidenceWeight(confidence, options);
  return localValue * (1 - llmWeight) + llmValue * llmWeight;
}

export function shouldPreferLlmChoice(
  confidence: number,
  threshold = 0.45,
  options?: Omit<LlmConfidenceOptions, 'maxInfluence'>,
) {
  return llmConfidenceWeight(confidence, { ...options, maxInfluence: 1 }) >= threshold;
}
