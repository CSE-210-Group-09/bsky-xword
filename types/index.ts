export type Direction = 'across' | 'down';

export type Tab = 'clues' | 'leaderboard';

/** A row/column position on the grid. */
export interface CellPosition {
  row: number;
  col: number;
}

export interface Clue {
  number: number;
  text: string;
  answer: string;
  row: number;
  col: number;
  length: number;
}

export interface Puzzle {
  id: string;
  title: string;
  date: string;
  size: number;
  /** Solution letters; '#' marks a black square. */
  solution: string[][];
  /** Clue numbers per cell (null when the cell has no number). */
  numbers: (number | null)[][];
  clues: Record<Direction, Clue[]>;
}

/** A Bluesky user shown on the leaderboard. Same fields as a leaderboard API entry (#42), minus the rank. */
export interface Friend {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
  /** Seconds taken on the first completion; null if not yet solved. */
  timeSeconds: number | null;
  isCurrentUser?: boolean;
}

/** A friend who has solved the puzzle, with their leaderboard position. */
export interface RankedFriend extends Friend {
  timeSeconds: number;
  rank: number;
}
