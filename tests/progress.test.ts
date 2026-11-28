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
const DID = 'did:plc:alice';
const saved: SavedProgress = {
  version: 2,
  date: EASY_PUZZLE.date,
  did: DID,
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
  it('keys progress by puzzle date and account', () => {
    expect(progressKey('2026-11-18', DID)).toBe('bsky-xword:progress:2026-11-18:did:plc:alice');
  });

  it('keeps each account\'s progress separate', () => {
    const storage = memoryStorage();
    saveProgress(saved, storage);
    expect(loadProgress(EASY_PUZZLE, 'did:plc:bob', storage)).toBeNull();
    expect(loadProgress(EASY_PUZZLE, DID, DID, storage)).toEqual(saved);
  });

  it('ignores a save that names a different account than its key', () => {
    const storage = memoryStorage({ [progressKey(EASY_PUZZLE.date, DID)]: JSON.stringify({ ...saved, did: 'did:plc:bob' }) });
    expect(loadProgress(EASY_PUZZLE, DID, DID, storage)).toBeNull();
  });

  it('loads what it saved', () => {
    const storage = memoryStorage();
    saveProgress(saved, storage);
    expect(loadProgress(EASY_PUZZLE, DID, storage)).toEqual(saved);
  });

  it('returns null when nothing is saved', () => {
    expect(loadProgress(EASY_PUZZLE, DID, memoryStorage())).toBeNull();
  });

  it.each([
    ['another date', { ...saved, date: '2026-11-17' }],
    ['an older version', { ...saved, version: 1 }],
    ['a grid of the wrong size', { ...saved, grid: emptyGrid(size + 1) }],
    ['marks of the wrong size', { ...saved, revealed: emptyMarks(size - 1) }],
    ['a non-numeric time', { ...saved, elapsedSeconds: 'soon' }],
    ['a negative penalty', { ...saved, penaltySeconds: -10 }],
    ['a missing field', { ...saved, checkCount: undefined }],
  ])('ignores progress with %s', (_, value) => {
    const storage = memoryStorage({ [progressKey(EASY_PUZZLE.date, DID)]: JSON.stringify(value) });
    expect(loadProgress(EASY_PUZZLE, DID, storage)).toBeNull();
  });

  it('ignores progress that is not valid JSON', () => {
    const storage = memoryStorage({ [progressKey(EASY_PUZZLE.date, DID)]: '{not json' });
    expect(loadProgress(EASY_PUZZLE, DID, storage)).toBeNull();
  });

  it('removes progress for other dates, for every account, and leaves other keys alone', () => {
    const storage = memoryStorage({
      [progressKey('2026-11-17', DID)]: '{}',
      [progressKey('2026-11-16', 'did:plc:bob')]: '{}',
      'bsky-xword:progress:2026-11-15': '{}',
      [progressKey(EASY_PUZZLE.date, DID)]: JSON.stringify(saved),
      [progressKey(EASY_PUZZLE.date, 'did:plc:bob')]: JSON.stringify({ ...saved, did: 'did:plc:bob' }),
      'someone-else': 'keep',
    });
    clearStaleProgress(EASY_PUZZLE.date, storage);

    expect(storage.getItem(progressKey('2026-11-17', DID))).toBeNull();
    expect(storage.getItem(progressKey('2026-11-16', 'did:plc:bob'))).toBeNull();
    expect(storage.getItem('bsky-xword:progress:2026-11-15')).toBeNull();
    expect(storage.getItem(progressKey(EASY_PUZZLE.date, DID))).not.toBeNull();
    expect(storage.getItem(progressKey(EASY_PUZZLE.date, 'did:plc:bob'))).not.toBeNull();
    expect(storage.getItem('someone-else')).toBe('keep');
  });

  it('carries on without saving when storage is blocked or missing', () => {
    for (const storage of [blockedStorage, null]) {
      expect(() => saveProgress(saved, storage)).not.toThrow();
      expect(loadProgress(EASY_PUZZLE, DID, storage)).toBeNull();
      expect(() => clearStaleProgress(EASY_PUZZLE.date, storage)).not.toThrow();
    }
  });

  it('never overwrites a finished puzzle with an unfinished one', () => {
    // A second tab that loaded before the first one finished keeps saving its
    // own stale state every second (reported on #65).
    const storage = memoryStorage();
    const finished = { ...saved, completed: true, finalSeconds: 95 };
    saveProgress(finished, storage);
    saveProgress(saved, storage);

    expect(loadProgress(EASY_PUZZLE, DID, storage)).toEqual(finished);
  });

  it('still updates a finished save with another finished one', () => {
    const storage = memoryStorage();
    saveProgress({ ...saved, completed: true, finalSeconds: 95 }, storage);
    saveProgress({ ...saved, completed: true, finalSeconds: 95, elapsedSeconds: 60 }, storage);

    expect(loadProgress(EASY_PUZZLE, DID, storage)?.elapsedSeconds).toBe(60);
  });

  it('replaces a corrupt save instead of giving up on saving', () => {
    const storage = memoryStorage({ [progressKey(EASY_PUZZLE.date, DID)]: '{not json' });
    saveProgress(saved, storage);

    expect(loadProgress(EASY_PUZZLE, DID, storage)).toEqual(saved);
  });

  it('carries on when storage is full', () => {
    const full = memoryStorage();
    full.setItem = () => { throw new DOMException('full', 'QuotaExceededError'); };
    expect(() => saveProgress(saved, full)).not.toThrow();
  });
});
