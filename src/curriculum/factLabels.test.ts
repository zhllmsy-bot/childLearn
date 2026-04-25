import { describe, expect, it } from 'vitest';
import { describeFactId } from './factLabels';

describe('describeFactId', () => {
  it('turns internal fact ids into parent-friendly text', () => {
    expect(describeFactId('5+3')).toBe('5 和 3 合起来是 8');
    expect(describeFactId('make-ten-6')).toBe('6 再补 4 个凑成 10');
    expect(describeFactId('jump-4-9')).toBe('从 4 跳到 9，距离是 5');
  });
});
