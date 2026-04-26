import { describe, expect, it } from 'vitest';
import { buildRecentFingerprints, fingerprintStem, normalizeStem } from './fingerprint';

describe('fingerprint', () => {
  it('normalizes structural variants of the same stem together', () => {
    expect(normalizeStem('3 + ? = 8')).toBe('#+?=#');
    expect(fingerprintStem('3 + ? = 8')).toBe(fingerprintStem('4+?=9'));
  });

  it('keeps different structures apart', () => {
    expect(fingerprintStem('3 + ? = 8')).not.toBe(fingerprintStem('8 - 3 = ?'));
  });

  it('builds the latest limited fingerprint window', () => {
    const fingerprints = buildRecentFingerprints(['1+1=?', '', null, '2+2=?'], 2);
    expect(fingerprints).toHaveLength(2);
    expect(fingerprints[0]).toBe(fingerprintStem('1+1=?'));
    expect(fingerprints[1]).toBe(fingerprintStem('2+2=?'));
  });
});
