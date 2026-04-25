import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, 'flow_observer_server.py'), 'utf8');
const prompt = source.match(/SYSTEM_PROMPT = """\\\n([\s\S]*?)\n"""/)?.[1] ?? '';

describe('flow observer system prompt', () => {
  it('keeps the LLM role focused on flow observation instead of question generation', () => {
    expect(prompt).toContain('adaptive flow layer');
    expect(prompt).toContain('You are not the final decision system');
    expect(prompt).toContain('you must not generate questions');
    expect(prompt).toContain('Analyze only the supplied LearningBatchReport');
  });

  it('encodes the core flow diagnostics for a young non-reader', () => {
    expect(prompt).toContain('Challenge-skill balance');
    expect(prompt).toContain('Clear micro-goal');
    expect(prompt).toContain('Immediate feedback and recovery');
    expect(prompt).toContain('Sense of control');
    expect(prompt).toContain('Concentration and tempo');
    expect(prompt).toContain('4.5-year-old non-reader');
  });

  it('requires conservative one-dimension recommendations', () => {
    expect(prompt).toContain('One-dimension adjustment');
    expect(prompt).toContain('Never recommend jumping multiple levels');
    expect(prompt).toContain('Prefer presentation_type, visual_support, option_distance');
    expect(prompt).toContain('A single batch can tune the next few questions');
  });
});
