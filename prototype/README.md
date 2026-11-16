# skymini — UI prototype

A clickable prototype of the daily 5×5 mini crossword app for Bluesky / AT Protocol.
Everything is mocked: there is no login, no network calls, and no AT Protocol writes.

```sh
cd prototype
npm install
npm run dev   # http://localhost:3000
```

## Screens

| Route | What it shows |
| --- | --- |
| `/` | Today's daily mini, friends' leaderboard (locked until you solve), streak, friend activity, more minis |
| `/puzzle/[id]` | Timed solver: start/pause overlay, keyboard + on-screen keyboard, check/reveal, completion modal with confetti, publish-result step, friends leaderboard, spoiler-free Bluesky share, likes, comments (locked until solved) |
| `/browse` | Crosshare-style catalog: search, sort (newest / most liked / friends playing), difficulty, unsolved-only, dailies-only |
| `/profile/[handle]` | Stats (solved, best, average, constructed), puzzles built, recent solve times |
| `/create` | Placeholder constructor: editable 5×5 grid, black squares with symmetry, auto-numbered clue slots; publishing is disabled |

## Product rules the UI demonstrates

These follow `../proposal/refined-proposal.md`:

- The leaderboard only includes accounts you follow (`nora.xyz` and `gridqueen.bsky.social` are unfollowed and never appear).
- Unassisted solves rank by time and ties share a rank; solves that used check/reveal are listed separately.
- Only the first completion counts. Replays are allowed but don't change your published time.
- Publishing a result is an explicit step and shows a mock `at://` record URI.
- Share text contains the grid's shape and your time, never answer letters, and opens Bluesky's compose screen instead of posting.

## Where things live

- `lib/crossword.ts` — puzzle model; numbering and clue lists are derived from the solution grid.
- `lib/data.ts` — mock users, follows, puzzles, results, comments. `TODAY` is pinned to 2026-11-15.
- `components/AppState.tsx` — client state (likes, your results, your comments), saved in `localStorage`.
- `components/Solver.tsx` — the solving experience.

To reset your local progress, clear the `bsky-xword-proto-v1` key from localStorage.
