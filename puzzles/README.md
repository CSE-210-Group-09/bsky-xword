# Puzzle files

Add one `YYYY-MM-DD.json` file per day. The filename must be a real calendar date.
The daily API chooses the date in `America/Los_Angeles`; the parser receives that
date explicitly, independently of the stable puzzle `id`. Keep published puzzles
unchanged so all players solve the same grid.

Use `2026-11-18.json` as an example. Authors write:

- `id`: a non-empty stable identifier, not necessarily the date.
- `title` and `author`: optional non-empty strings. The default title is `Daily Mini`.
- `grid`: exactly five strings of five characters, using uppercase `A-Z` and `#`
  for black squares.
- `clues.across` and `clues.down`: objects mapping each answer to its clue text.
  Every contiguous entry needs exactly one non-empty clue, with no extra clues.

Entries must contain at least two letters in both directions. One-letter runs and
all-black grids are rejected. Answers must be unique within each direction because
the answer is the clue key; the same answer may appear once across and once down.
Do not repeat JSON keys, because JSON readers retain only the last value.

`parsePuzzle(file, date)` in `lib/puzzles/parse.ts` returns the existing `Puzzle`
shape used by the solver. It scans left to right, top to bottom, numbering any
white cell that starts an across or down entry. A cell that starts both receives
one number. Positions are zero-based. Answers, lengths, positions, numbers, and
the solution matrix are derived from the grid.

Run `npm run validate-puzzles` with Node 22.18+ or Node 24 before opening a PR.
It checks every entry in this directory except this README, reports file-specific
errors, and exits unsuccessfully if any file is invalid. CI runs the same command
through the workflow added in #21. The script uses Node's TypeScript stripping;
the application itself continues to use Vite and TypeScript.

The converted prototype fixture is dated 2026-11-18. `puzzleData.ts` still exports
`EASY_PUZZLE` for the current UI; choosing today's puzzle through the API is #34
and #35. There is no fallback puzzle in the daily API contract.
