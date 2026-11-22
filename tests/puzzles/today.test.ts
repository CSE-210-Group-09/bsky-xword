// @vitest-environment node
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fixture from '../../puzzles/2026-11-18.json';
import { filePuzzleSource, pacificDate, PuzzleUnavailableError } from '../../lib/puzzles/today';

describe('pacificDate', () => {
  it('rolls over at midnight Pacific, not midnight UTC', () => {
    // 2026-11-21 07:59 UTC is 23:59 PST on Nov 20; one minute later it is Nov 21.
    expect(pacificDate(new Date('2026-11-21T07:59:59Z'))).toBe('2026-11-20');
    expect(pacificDate(new Date('2026-11-21T08:00:00Z'))).toBe('2026-11-21');
    // Already Nov 21 in UTC at 04:00 UTC, but still Nov 20 in California.
    expect(pacificDate(new Date('2026-11-21T04:00:00Z'))).toBe('2026-11-20');
  });

  it('uses the summer offset (UTC-7) during daylight saving time', () => {
    // PDT: midnight Pacific on 2026-07-04 is 07:00 UTC.
    expect(pacificDate(new Date('2026-07-04T06:59:59Z'))).toBe('2026-07-03');
    expect(pacificDate(new Date('2026-07-04T07:00:00Z'))).toBe('2026-07-04');
  });

  it('stays correct across the DST changes', () => {
    // Spring forward 2026-03-08: midnight that day is still PST (08:00 UTC),
    // but midnight on 03-09 is PDT (07:00 UTC).
    expect(pacificDate(new Date('2026-03-08T07:59:59Z'))).toBe('2026-03-07');
    expect(pacificDate(new Date('2026-03-08T08:00:00Z'))).toBe('2026-03-08');
    expect(pacificDate(new Date('2026-03-09T06:59:59Z'))).toBe('2026-03-08');
    expect(pacificDate(new Date('2026-03-09T07:00:00Z'))).toBe('2026-03-09');
    // Fall back 2026-11-01: midnight is PDT (07:00 UTC); midnight on 11-02 is PST (08:00 UTC).
    expect(pacificDate(new Date('2026-11-01T07:00:00Z'))).toBe('2026-11-01');
    expect(pacificDate(new Date('2026-11-02T07:59:59Z'))).toBe('2026-11-01');
    expect(pacificDate(new Date('2026-11-02T08:00:00Z'))).toBe('2026-11-02');
  });
});

describe('filePuzzleSource', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'xword-puzzles-'));
    await writeFile(path.join(dir, '2026-11-18.json'), JSON.stringify(fixture));
    await writeFile(path.join(dir, '2026-11-19.json'), JSON.stringify({ ...fixture, grid: ['bad'] }));
    await writeFile(path.join(dir, '2026-11-20.json'), '{not json');
  });
  afterEach(() => rm(dir, { recursive: true }));

  const reasonFor = (date: string) => filePuzzleSource(dir).getPuzzleForDate(date).then(
    () => 'loaded',
    (error: unknown) => (error instanceof PuzzleUnavailableError ? error.reason : error),
  );

  it('loads and parses a valid file, using the filename date', async () => {
    const puzzle = await filePuzzleSource(dir).getPuzzleForDate('2026-11-18');
    expect(puzzle.date).toBe('2026-11-18');
    expect(puzzle.clues.across[0]).toMatchObject({ number: 1, answer: 'CHEF' });
    expect(puzzle.solution[0]).toEqual(['C', 'H', 'E', 'F', '#']);
  });

  it('reports a missing file as missing', async () => {
    expect(await reasonFor('2026-11-21')).toBe('missing');
  });

  it('reports a file that fails validation or is not JSON as invalid', async () => {
    expect(await reasonFor('2026-11-19')).toBe('invalid');
    expect(await reasonFor('2026-11-20')).toBe('invalid');
  });

  it('never reads paths outside the puzzles directory', async () => {
    expect(await reasonFor('../2026-11-18')).toBe('missing');
  });
});
