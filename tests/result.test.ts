import { describe, expect, it } from 'vitest';
import { parseResultRecord, RESULT_COLLECTION, validateResultRecord, type ResultRecord } from '../lib/atproto/result';

const valid: ResultRecord = {
  $type: RESULT_COLLECTION,
  puzzleId: 'mini-2026-11-18',
  puzzleDate: '2026-11-18',
  timeSeconds: 83,
  revealCount: 1,
  checkCount: 0,
  completedAt: '2026-11-18T19:20:30.123Z',
};

describe('result record validation', () => {
  it('returns the original record without normalizing its timestamp', () => {
    expect(parseResultRecord(valid)).toBe(valid);
    expect(validateResultRecord(valid)).toEqual({ success: true, value: valid });
  });

  it('allows zero scores and forward-compatible additional fields', () => {
    expect(validateResultRecord({ ...valid, timeSeconds: 0, futureField: true }).success).toBe(true);
  });

  it.each(Object.keys(valid))('rejects missing required field %s', (field) => {
    const record: Record<string, unknown> = { ...valid };
    delete record[field];
    expect(validateResultRecord(record).success).toBe(false);
  });

  it.each([null, [], 'result', 123])('rejects non-record input %j', (value) => {
    expect(validateResultRecord(value).success).toBe(false);
  });

  for (const field of ['timeSeconds', 'revealCount', 'checkCount']) {
    it.each([-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '1', null])(`rejects invalid ${field}: %s`, (value) => {
      expect(validateResultRecord({ ...valid, [field]: value }).success).toBe(false);
    });
  }

  it.each(['2026-2-01', '2026-02-29', '2026-02-30', '2026-00-10', '2026-13-01', '2026-11-00', '2026-11-31', '1900-02-29'])('rejects malformed or impossible date %s', (puzzleDate) => {
    expect(validateResultRecord({ ...valid, puzzleDate }).success).toBe(false);
  });

  it.each(['2024-02-29', '2000-02-29'])('accepts leap date %s', (puzzleDate) => {
    expect(validateResultRecord({ ...valid, puzzleDate }).success).toBe(true);
  });

  it.each(['2026-11-18T19:20:30Z', '2026-11-18T19:20:30.123456789Z', '2026-11-18T19:20:30+05:30'])('accepts AT datetime %s', (completedAt) => {
    expect(validateResultRecord({ ...valid, completedAt }).success).toBe(true);
  });

  it.each(['2026-11-18', '2026-11-18T19:20:30', '2026-02-30T19:20:30Z', '2026-11-18T24:00:00Z', '2026-11-18T19:60:00Z', '2026-11-18T19:20:60Z', '2026-11-18t19:20:30z', '2026-11-18T19:20:30-00:00', '2026-11-18T19:20:30+24:00', '0000-01-01T00:00:00+01:00'])('rejects invalid datetime %s', (completedAt) => {
    expect(validateResultRecord({ ...valid, completedAt }).success).toBe(false);
  });

  it('reports field errors and parse throws when invalid', () => {
    const result = validateResultRecord({ ...valid, puzzleId: '', $type: 'wrong', timeSeconds: -1 });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors).toHaveLength(3);
    expect(() => parseResultRecord({ ...valid, puzzleDate: 'bad' })).toThrow('puzzleDate');
  });
});
