import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { Puzzle } from '../../types/index.js';
import { isPuzzleDate, parsePuzzle } from './parse.js';

/** Puzzle days roll over at midnight in this time zone (ADR 0007). */
export const PUZZLE_TIME_ZONE = 'America/Los_Angeles';

/** Today's puzzle date (YYYY-MM-DD) in Pacific time, independent of the server's time zone. */
export function pacificDate(now: Date = new Date()): string {
  // en-CA formats dates as YYYY-MM-DD; Intl applies the correct PST/PDT offset.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: PUZZLE_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now);
}

/** Why a puzzle could not be served. Both cases return 404; there is no fallback. */
export class PuzzleUnavailableError extends Error {
  constructor(readonly reason: 'missing' | 'invalid', readonly date: string, options?: ErrorOptions) {
    super(`Puzzle for ${date} is ${reason}`, options);
    this.name = 'PuzzleUnavailableError';
  }
}

/** Where puzzles come from. Files today; generated puzzles can implement this later. */
export interface PuzzleSource {
  /** Resolves the puzzle or rejects with PuzzleUnavailableError. */
  getPuzzleForDate(date: string): Promise<Puzzle>;
}

/** Reads `<directory>/YYYY-MM-DD.json` and validates it with the shared parser. */
export function filePuzzleSource(directory: string): PuzzleSource {
  return {
    async getPuzzleForDate(date) {
      // Checking the date first also stops path tricks like "../secret".
      if (!isPuzzleDate(date)) throw new PuzzleUnavailableError('missing', date);
      let text: string;
      try {
        text = await readFile(path.join(directory, `${date}.json`), 'utf8');
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          throw new PuzzleUnavailableError('missing', date, { cause: error });
        }
        throw error;
      }
      try {
        return parsePuzzle(JSON.parse(text), date);
      } catch (error) {
        throw new PuzzleUnavailableError('invalid', date, { cause: error });
      }
    },
  };
}
