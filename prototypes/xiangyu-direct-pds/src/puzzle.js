// Hardcoded prototype puzzle. Team-authored (original fill and clues), so there is
// no republishing-permission question. Daily selection is out of scope for prototypes.
//
// Shape matches prototype/result-contract: row-major `cells`, null = block,
// clue lists of { number, text }.

export const PUZZLE = Object.freeze({
  id: 'proto-mini-001',
  title: 'Prototype mini #1',
  width: 5,
  height: 5,
  cells: [
    null, null, 'S', 'P', 'A',
    null, 'S', 'T', 'O', 'P',
    'W', 'H', 'O', 'S', 'E',
    'H', 'I', 'N', 'T', null,
    'O', 'N', 'E', null, null,
  ],
  across: [
    { number: 1, text: 'Place for a mud bath' },
    { number: 4, text: 'Word on a red octagon' },
    { number: 5, text: '"___ turn is it?"' },
    { number: 6, text: 'Small nudge toward an answer' },
    { number: 7, text: 'Smallest positive whole number' },
  ],
  down: [
    { number: 1, text: 'Pebble, essentially' },
    { number: 2, text: 'Share on Bluesky, say' },
    { number: 3, text: 'Gorilla or chimp' },
    { number: 4, text: 'Front of the lower leg' },
    { number: 5, text: '"___ goes there?"' },
  ],
});

/** Standard crossword numbering plus the list of entries (words) with their cells. */
export function buildEntries(puzzle) {
  const { width: W, height: H, cells } = puzzle;
  const white = (r, c) => r >= 0 && r < H && c >= 0 && c < W && cells[r * W + c] !== null;
  const clueText = (dir, number) => {
    const clue = puzzle[dir].find((entry) => entry.number === number);
    if (!clue) throw new Error(`Missing ${dir} clue ${number}`);
    return clue.text;
  };

  const numbers = new Array(W * H).fill(null);
  const across = [];
  const down = [];
  let n = 0;
  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      if (!white(r, c)) continue;
      const startsAcross = !white(r, c - 1) && white(r, c + 1);
      const startsDown = !white(r - 1, c) && white(r + 1, c);
      if (!startsAcross && !startsDown) continue;
      numbers[r * W + c] = ++n;
      if (startsAcross) {
        const idx = [];
        for (let cc = c; white(r, cc); cc++) idx.push(r * W + cc);
        across.push({ dir: 'across', number: n, cells: idx });
      }
      if (startsDown) {
        const idx = [];
        for (let rr = r; white(rr, c); rr++) idx.push(rr * W + c);
        down.push({ dir: 'down', number: n, cells: idx });
      }
    }
  }
  const entries = [...across, ...down].map((entry) => ({
    ...entry,
    answer: entry.cells.map((i) => cells[i]).join(''),
    clue: clueText(entry.dir, entry.number),
  }));
  if (entries.length !== puzzle.across.length + puzzle.down.length) {
    throw new Error('Clue count does not match grid entries');
  }
  return { numbers, entries };
}

/** Same canonical serialization as prototype/result-contract's puzzleRevision(),
 * so both prototypes produce the identical `sha256:<hex>` for the same puzzle. */
export async function puzzleRevision(puzzle) {
  const clues = (list) => list.map(({ number, text }) => [number, text]).sort((a, b) => a[0] - b[0]);
  const canonical = JSON.stringify([
    'bsky-xword-puzzle-v1', puzzle.width, puzzle.height, puzzle.cells,
    clues(puzzle.across), clues(puzzle.down),
  ]);
  return 'sha256:' + await sha256Hex(canonical);
}

export async function sha256Hex(text) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
