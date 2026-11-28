import type { Puzzle } from '../../types';

/** Bump when the saved shape changes; older saves are then ignored (ADR 0013). */
export const PROGRESS_VERSION = 2;

const KEY_PREFIX = 'bsky-xword:progress:';

/** Everything needed to pick a puzzle back up after a reload (ADR 0008, 0013). */
export interface SavedProgress {
  version: typeof PROGRESS_VERSION;
  date: string;
  /** The account this progress belongs to; two players in one browser keep separate saves. */
  did: string;
  grid: string[][];
  revealed: boolean[][];
  incorrect: boolean[][];
  elapsedSeconds: number;
  penaltySeconds: number;
  revealCount: number;
  checkCount: number;
  completed: boolean;
  /** The frozen first completion time, or null before the first completion. */
  finalSeconds: number | null;
}

export function progressKey(date: string, did: string): string {
  return `${KEY_PREFIX}${date}:${did}`;
}

/** The browser's localStorage, or null when the user has blocked it. */
export function browserStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** The account's saved progress for the puzzle, or null when there is none or it doesn't fit. */
export function loadProgress(puzzle: Puzzle, did: string, storage = browserStorage()): SavedProgress | null {
  try {
    const raw = storage?.getItem(progressKey(puzzle.date, did));
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    return isProgressFor(puzzle, value) && value.did === did ? value : null;
  } catch {
    return null;
  }
}

/**
 * Save progress; does nothing when storage is blocked or full. A finished
 * puzzle is never replaced by an unfinished one, so a stale second tab cannot
 * undo a completion (ADR 0008: one attempt).
 */
export function saveProgress(progress: SavedProgress, storage = browserStorage()): void {
  try {
    if (!storage) return;
    const key = progressKey(progress.date, progress.did);
    if (!progress.completed && isFinishedSave(storage.getItem(key))) return;
    storage.setItem(key, JSON.stringify(progress));
  } catch {
    // Playing on without saving is better than failing the game.
  }
}

/** True when a stored value is a readable save of a finished puzzle. */
function isFinishedSave(raw: string | null): boolean {
  if (!raw) return false;
  try {
    return JSON.parse(raw)?.completed === true;
  } catch {
    return false;
  }
}

/** Remove progress saved for any other puzzle date, for every account. Other keys are left alone. */
export function clearStaleProgress(date: string, storage = browserStorage()): void {
  try {
    if (!storage) return;
    const stale: string[] = [];
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key?.startsWith(KEY_PREFIX) && !key.startsWith(`${KEY_PREFIX}${date}:`)) stale.push(key);
    }
    stale.forEach((key) => storage.removeItem(key));
  } catch {
    // Stale entries are small; leaving them is harmless.
  }
}

function isProgressFor(puzzle: Puzzle, value: unknown): value is SavedProgress {
  if (typeof value !== 'object' || value === null) return false;
  const p = value as Record<string, unknown>;
  const isCount = (n: unknown) => typeof n === 'number' && Number.isInteger(n) && n >= 0;
  const isSquare = <T>(rows: unknown, isCell: (cell: unknown) => cell is T) =>
    Array.isArray(rows) && rows.length === puzzle.size &&
    rows.every((row) => Array.isArray(row) && row.length === puzzle.size && row.every(isCell));
  return (
    p.version === PROGRESS_VERSION &&
    p.date === puzzle.date &&
    typeof p.did === 'string' &&
    isSquare(p.grid, (cell): cell is string => typeof cell === 'string') &&
    isSquare(p.revealed, (cell): cell is boolean => typeof cell === 'boolean') &&
    isSquare(p.incorrect, (cell): cell is boolean => typeof cell === 'boolean') &&
    isCount(p.elapsedSeconds) &&
    isCount(p.penaltySeconds) &&
    isCount(p.revealCount) &&
    isCount(p.checkCount) &&
    typeof p.completed === 'boolean' &&
    (p.finalSeconds === null || isCount(p.finalSeconds))
  );
}
