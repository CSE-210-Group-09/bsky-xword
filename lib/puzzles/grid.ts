import type { CellPosition, Clue, Direction, Puzzle } from '../../types';

/** A size x size grid of empty strings. */
export function emptyGrid(size: number): string[][] {
  return Array(size).fill(null).map(() => Array(size).fill(''));
}

/** A size x size grid of false, for per-cell marks such as revealed cells. */
export function emptyMarks(size: number): boolean[][] {
  return Array(size).fill(null).map(() => Array(size).fill(false));
}

/** True for black squares and for anything outside the grid. */
export function isBlack(puzzle: Puzzle, r: number, c: number): boolean {
  if (r < 0 || r >= puzzle.size || c < 0 || c >= puzzle.size) return true;
  return puzzle.solution[r][c] === '#';
}

/** True when every white cell matches the solution (case-insensitive). */
export function isSolved(puzzle: Puzzle, grid: string[][]): boolean {
  for (let r = 0; r < puzzle.size; r++) {
    for (let c = 0; c < puzzle.size; c++) {
      if (!isBlack(puzzle, r, c)) {
        if (grid[r][c].toUpperCase() !== puzzle.solution[r][c].toUpperCase()) {
          return false;
        }
      }
    }
  }
  return true;
}

/** Next white cell in the direction, or the same cell if there is none. */
export function nextCell(puzzle: Puzzle, { row, col }: CellPosition, dir: Direction): CellPosition {
  let r = row;
  let c = col;
  if (dir === 'across') {
    c += 1;
    while (c < puzzle.size && isBlack(puzzle, r, c)) c += 1;
    if (c < puzzle.size) return { row: r, col: c };
  } else {
    r += 1;
    while (r < puzzle.size && isBlack(puzzle, r, c)) r += 1;
    if (r < puzzle.size) return { row: r, col: c };
  }
  return { row, col };
}

/** Previous white cell in the direction, or the same cell if there is none. */
export function prevCell(puzzle: Puzzle, { row, col }: CellPosition, dir: Direction): CellPosition {
  let r = row;
  let c = col;
  if (dir === 'across') {
    c -= 1;
    while (c >= 0 && isBlack(puzzle, r, c)) c -= 1;
    if (c >= 0) return { row: r, col: c };
  } else {
    r -= 1;
    while (r >= 0 && isBlack(puzzle, r, c)) r -= 1;
    if (r >= 0) return { row: r, col: c };
  }
  return { row, col };
}

/** True when the cell lies inside the clue's word. */
export function isCellInClue(clue: Clue, dir: Direction, r: number, c: number): boolean {
  if (dir === 'across') {
    return r === clue.row && c >= clue.col && c < clue.col + clue.length;
  }
  return c === clue.col && r >= clue.row && r < clue.row + clue.length;
}

/** The clue containing the cell in the direction, falling back to the first clue. */
export function findActiveClue(puzzle: Puzzle, cell: CellPosition, dir: Direction): Clue | undefined {
  const list = puzzle.clues[dir];
  return list.find((clue) => isCellInClue(clue, dir, cell.row, cell.col)) || list[0];
}
