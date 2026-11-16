export type Dir = "across" | "down";

export interface Cell {
  r: number;
  c: number;
}

export interface Clue {
  id: string; // e.g. "1A"
  num: number;
  dir: Dir;
  text: string;
  answer: string;
  cells: Cell[];
}

export interface PuzzleDef {
  id: string;
  title: string;
  author: string; // handle of the constructor
  date: string; // ISO date the puzzle was published
  daily?: boolean;
  difficulty: "Easy" | "Medium" | "Tricky";
  /** Rows of the solution grid. "#" marks a black square. */
  grid: string[];
  /** Clue text keyed by its (lowercase) answer, so numbering is derived. */
  clues: Record<string, string>;
  likes: number;
  tags: string[];
}

export interface Puzzle extends PuzzleDef {
  size: number;
  numbers: (number | null)[][];
  across: Clue[];
  down: Clue[];
}

export const isBlock = (grid: string[], r: number, c: number) =>
  r < 0 || c < 0 || r >= grid.length || c >= grid[0].length || grid[r][c] === "#";

/** Derive numbering and clue lists from the solution grid, like a printed crossword. */
export function buildPuzzle(def: PuzzleDef): Puzzle {
  const { grid } = def;
  const size = grid.length;
  const numbers: (number | null)[][] = grid.map((row) => row.split("").map(() => null));
  const across: Clue[] = [];
  const down: Clue[] = [];
  let n = 0;

  const run = (r: number, c: number, dr: number, dc: number) => {
    const cells: Cell[] = [];
    while (!isBlock(grid, r, c)) {
      cells.push({ r, c });
      r += dr;
      c += dc;
    }
    return cells;
  };

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (isBlock(grid, r, c)) continue;
      const startsAcross = isBlock(grid, r, c - 1) && !isBlock(grid, r, c + 1);
      const startsDown = isBlock(grid, r - 1, c) && !isBlock(grid, r + 1, c);
      if (!startsAcross && !startsDown) continue;
      numbers[r][c] = ++n;
      for (const [dir, list, dr, dc] of [
        ["across", across, 0, 1],
        ["down", down, 1, 0],
      ] as const) {
        if (dir === "across" ? !startsAcross : !startsDown) continue;
        const cells = run(r, c, dr, dc);
        const answer = cells.map((p) => grid[p.r][p.c]).join("").toUpperCase();
        list.push({
          id: `${n}${dir === "across" ? "A" : "D"}`,
          num: n,
          dir,
          answer,
          cells,
          text: def.clues[answer.toLowerCase()] ?? "(clue missing)",
        });
      }
    }
  }
  return { ...def, size, numbers, across, down };
}

export function formatTime(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** A spoiler-free emoji picture of the grid's shape, for share text. */
export function shapeEmoji(puzzle: Puzzle) {
  return puzzle.grid.map((row) => row.split("").map((ch) => (ch === "#" ? "⬛" : "🟦")).join("")).join("\n");
}
