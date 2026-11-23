import type { Clue, Direction, Puzzle } from '../../types/index.js';

export interface PuzzleFile {
  id: string;
  title?: string;
  author?: string;
  grid: string[];
  /** Keys are answers, separately for across and down. Duplicate answers within a direction are rejected. */
  clues: Record<Direction, Record<string, string>>;
}

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isPuzzleDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(`${value}T00:00:00Z`)) &&
    new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}

/** Parse an author's file into the solver's Puzzle shape; date comes from its filename. */
export function parsePuzzle(value: unknown, date: string): Puzzle {
  const fail = (message: string): never => { throw new Error(`Invalid puzzle: ${message}`); };
  if (!isPuzzleDate(date)) fail('date must be a real YYYY-MM-DD date');
  if (!object(value)) return fail('expected an object');
  if (typeof value.id !== 'string' || !value.id.trim()) fail('id must be a non-empty string');
  for (const key of ['title', 'author']) {
    if (value[key] !== undefined && (typeof value[key] !== 'string' || !value[key].trim())) {
      fail(`${key} must be a non-empty string when provided`);
    }
  }
  if (!Array.isArray(value.grid) || value.grid.length !== 5 ||
      value.grid.some(row => typeof row !== 'string' || row.length !== 5)) {
    fail('grid must contain exactly five rows of five characters');
  }
  const grid = value.grid as string[];
  if (grid.some(row => !/^[A-Z#]{5}$/.test(row))) fail('grid may contain only A-Z and #');
  if (grid.every(row => row === '#####')) fail('grid must contain at least one answer');
  if (!object(value.clues)) return fail('clues must contain across and down objects');
  const source = value.clues;
  for (const dir of ['across', 'down'] as const) {
    if (!object(source[dir])) fail(`clues.${dir} must be an object keyed by answer`);
    for (const [answer, text] of Object.entries(source[dir] as Record<string, unknown>)) {
      if (typeof text !== 'string' || !text.trim()) fail(`${dir} clue ${answer} must have non-empty text`);
    }
  }
  const numbers: (number | null)[][] = Array.from({ length: 5 }, () => Array(5).fill(null));
  const clues: Record<Direction, Clue[]> = { across: [], down: [] };
  const used: Record<Direction, Set<string>> = { across: new Set(), down: new Set() };
  let number = 0;
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      if (grid[row][col] === '#') continue;
      const starts = {
        across: col === 0 || grid[row][col - 1] === '#',
        down: row === 0 || grid[row - 1][col] === '#',
      };
      if (starts.across || starts.down) numbers[row][col] = ++number;
      for (const dir of ['across', 'down'] as const) {
        if (!starts[dir]) continue;
        let answer = '';
        let r = row;
        let c = col;
        while (r < 5 && c < 5 && grid[r][c] !== '#') {
          answer += grid[r][c];
          if (dir === 'across') c++; else r++;
        }
        if (answer.length < 2) fail(`${dir} entry at row ${row + 1}, column ${col + 1} must be at least 2 letters`);
        if (used[dir].has(answer)) fail(`duplicate ${dir} answer ${answer}; answer-keyed clues require unique answers per direction`);
        const entries = source[dir] as Record<string, string>;
        if (!Object.hasOwn(entries, answer)) fail(`missing ${dir} clue for ${answer}`);
        used[dir].add(answer);
        clues[dir].push({ number, text: entries[answer], answer, row, col, length: answer.length });
      }
    }
  }
  for (const dir of ['across', 'down'] as const) {
    for (const answer of Object.keys(source[dir] as object)) {
      if (!used[dir].has(answer)) fail(`extra ${dir} clue for ${answer}`);
    }
  }
  return {
    id: value.id as string,
    title: typeof value.title === 'string' ? value.title : 'Daily Mini',
    date,
    size: 5,
    solution: grid.map(row => [...row]),
    numbers,
    clues,
  };
}
