import { describe, expect, it } from 'vitest';
import fixture from '../../puzzles/2026-11-18.json';
import { isPuzzleDate, parsePuzzle } from '../../lib/puzzles/parse';

const fresh = () => structuredClone(fixture);

describe('parsePuzzle', () => {
  it('derives the prototype numbering, clue positions and answers', () => {
    const puzzle = parsePuzzle(fixture, '2026-11-18');
    expect(puzzle.numbers).toEqual([
      [1, 2, 3, 4, null], [5, null, null, null, 6],
      [7, null, null, null, null], [8, null, null, null, null],
      [null, 9, null, null, null],
    ]);
    expect(puzzle.clues.across.map(({ number, answer, row, col, length }) =>
      [number, answer, row, col, length])).toEqual([
      [1, 'CHEF', 0, 0, 4], [5, 'RAVER', 1, 0, 5], [7, 'ABODE', 2, 0, 5],
      [8, 'BIKES', 3, 0, 5], [9, 'TEXT', 4, 1, 4],
    ]);
    expect(puzzle.clues.down.map(({ number, answer, row, col, length }) =>
      [number, answer, row, col, length])).toEqual([
      [1, 'CRAB', 0, 0, 4], [2, 'HABIT', 0, 1, 5], [3, 'EVOKE', 0, 2, 5],
      [4, 'FEDEX', 0, 3, 5], [6, 'REST', 1, 4, 4],
    ]);
    expect(puzzle.date).toBe('2026-11-18');
    expect(puzzle.solution[0]).toEqual(['C', 'H', 'E', 'F', '#']);
  });

  it.each([
    ['bad row count', (f: ReturnType<typeof fresh>) => { f.grid.pop(); }, /five rows/],
    ['bad row width', (f: ReturnType<typeof fresh>) => { f.grid[0] = 'CHEF'; }, /five rows/],
    ['bad character', (f: ReturnType<typeof fresh>) => { f.grid[0] = 'chef#'; }, /only A-Z/],
    ['missing clue', (f: ReturnType<typeof fresh>) => { delete (f.clues.across as Record<string, string>).CHEF; }, /missing across clue for CHEF/],
    ['extra clue', (f: ReturnType<typeof fresh>) => { (f.clues.down as Record<string, string>).EXTRA = 'Extra'; }, /extra down clue for EXTRA/],
    ['empty clue', (f: ReturnType<typeof fresh>) => { f.clues.down.CRAB = ' '; }, /non-empty text/],
    ['one-letter entry', (f: ReturnType<typeof fresh>) => { f.grid[0] = 'C#EF#'; }, /at least 2 letters/],
    ['all black grid', (f: ReturnType<typeof fresh>) => { f.grid = Array(5).fill('#####'); }, /at least one answer/],
  ])('rejects %s', (_name, mutate, message) => {
    const file = fresh();
    mutate(file);
    expect(() => parsePuzzle(file, '2026-11-18')).toThrow(message);
  });

  it('rejects duplicate answers within a direction', () => {
    expect(() => parsePuzzle({
      id: 'duplicate', grid: Array(5).fill('ABCDE'),
      clues: { across: { ABCDE: 'A row' }, down: {
        AAAAA: 'A', BBBBB: 'B', CCCCC: 'C', DDDDD: 'D', EEEEE: 'E',
      } },
    }, '2026-11-18')).toThrow(/duplicate across answer ABCDE/);
  });

  it('validates the top-level shape and optional metadata', () => {
    expect(() => parsePuzzle(null, '2026-11-18')).toThrow(/expected an object/);
    expect(() => parsePuzzle({ ...fixture, id: '' }, '2026-11-18')).toThrow(/id/);
    expect(() => parsePuzzle({ ...fixture, author: 4 }, '2026-11-18')).toThrow(/author/);
    expect(() => parsePuzzle({ ...fixture, clues: {} }, '2026-11-18')).toThrow(/across/);
    const { title: _title, author: _author, ...withoutMetadata } = fixture;
    expect(parsePuzzle(withoutMetadata, '2026-11-18').title).toBe('Daily Mini');
  });

  it('validates actual calendar dates, including leap years', () => {
    expect(isPuzzleDate('2024-02-29')).toBe(true);
    for (const date of ['2026-02-29', '2026-11-31', '2026-1-01', 'garbage']) {
      expect(isPuzzleDate(date)).toBe(false);
      expect(() => parsePuzzle(fixture, date)).toThrow(/real YYYY-MM-DD/);
    }
  });
});
