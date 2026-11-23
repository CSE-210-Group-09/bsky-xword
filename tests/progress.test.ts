import { describe, expect, it } from 'vitest';
import {
  clearStaleProgress, loadProgress, progressKey, saveProgress, type SavedProgress,
} from '../lib/puzzles/progress';
import { emptyGrid, emptyMarks } from '../lib/puzzles/grid';
import { EASY_PUZZLE } from '../lib/puzzles/puzzleData';

/** An in-memory Storage, like the browser's but without the browser. */
function memoryStorage(entries: Record<string, string> = {}): Storage {
  const data = new Map(Object.entries(entries));
  return {
    get length() { return data.size; },
    key: (i) => [...data.keys()][i] ?? null,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => { data.set(k, String(v)); },
    removeItem: (k) => { data.delete(k); },
    clear: () => data.clear(),
  };
}

/** A Storage that throws on every call, as when the user blocks site data. */
const blockedStorage = new Proxy({} as Storage, {
  get() { throw new DOMException('blocked', 'SecurityError'); },
});

const size = EASY_PUZZLE.size;
const saved: SavedProgress = {
  version: 1,
  date: EASY_PUZZLE.date,
  grid: emptyGrid(size).map((row, r) => row.map((_, c) => (r === 0 && c === 0 ? 'A' : ''))),
  revealed: emptyMarks(size),
  incorrect: emptyMarks(size),
  elapsedSeconds: 42,
  penaltySeconds: 10,
  revealCount: 1,
  checkCount: 0,
  completed: false,
  finalSeconds: null,
};

describe('saved progress (#29)', () => {
  it('keys progress by puzzle date', () => {
    expect(progressKey('2026-11-18')).toBe('bsky-xword:progress:2026-11-18');
  });

  it('loads what it saved', () => {
    const storage = memoryStorage();
    saveProgress(saved, storage);
    expect(loadProgress(EASY_PUZZLE, storage)).toEqual(saved);
  });

  it('returns null when nothing is saved', () => {
    expect(loadProgress(EASY_PUZZLE, memoryStorage())).toBeNull();
  });

  it.each([
    ['another date', { ...saved, date: '2026-11-17' }],
    ['another version', { ...saved, version: 2 }],
    ['a grid of the wrong size', { ...saved, grid: emptyGrid(size + 1) }],
    ['marks of the wrong size', { ...saved, revealed: emptyMarks(size - 1) }],
    ['a non-numeric time', { ...saved, elapsedSeconds: 'soon' }],
    ['a negative penalty', { ...saved, penaltySeconds: -10 }],
    ['a missing field', { ...saved, checkCount: undefined }],
  ])('ignores progress with %s', (_, value) => {
    const storage = memoryStorage({ [progressKey(EASY_PUZZLE.date)]: JSON.stringify(value) });
    expect(loadProgress(EASY_PUZZLE, storage)).toBeNull();
  });

  it('ignores progress that is not valid JSON', () => {
    const storage = memoryStorage({ [progressKey(EASY_PUZZLE.date)]: '{not json' });
    expect(loadProgress(EASY_PUZZLE, storage)).toBeNull();
  });

  it('removes progress for other dates and leaves other keys alone', () => {
    const storage = memoryStorage({
      [progressKey('2026-11-17')]: '{}',
      [progressKey('2026-11-16')]: '{}',
      [progressKey(EASY_PUZZLE.date)]: JSON.stringify(saved),
      'someone-else': 'keep',
    });
    clearStaleProgress(EASY_PUZZLE.date, storage);

    expect(storage.getItem(progressKey('2026-11-17'))).toBeNull();
    expect(storage.getItem(progressKey('2026-11-16'))).toBeNull();
    expect(storage.getItem(progressKey(EASY_PUZZLE.date))).not.toBeNull();
    expect(storage.getItem('someone-else')).toBe('keep');
  });

  it('carries on without saving when storage is blocked or missing', () => {
    for (const storage of [blockedStorage, null]) {
      expect(() => saveProgress(saved, storage)).not.toThrow();
      expect(loadProgress(EASY_PUZZLE, storage)).toBeNull();
      expect(() => clearStaleProgress(EASY_PUZZLE.date, storage)).not.toThrow();
    }
  });

  it('carries on when storage is full', () => {
    const full = memoryStorage();
    full.setItem = () => { throw new DOMException('full', 'QuotaExceededError'); };
    expect(() => saveProgress(saved, full)).not.toThrow();
  });
});
