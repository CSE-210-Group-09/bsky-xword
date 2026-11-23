# Bluesky Xword (bsky-xword)

A daily 5x5 mini crossword built on the **AT Protocol (Bluesky)**. Players log in with Bluesky, solve the day's mini, and compare times on a leaderboard made up of the accounts they follow. Results are saved as records in each player's own AT Protocol repository.

- **Project board:** [bsky-xword MVP](https://github.com/orgs/CSE-210-Group-09/projects/4)
- **Design decisions:** [`docs/adr/`](docs/adr/README.md)
- **MVP requirements:** [`proposal/updated-MVP-requirements.md`](proposal/updated-MVP-requirements.md)

> **Status:** early development. The repo currently contains a frontend-only prototype (Vite + React) with a single hard-coded puzzle and mock leaderboard data. The backend, Bluesky login, and result publishing are tracked as issues on the project board.

---

## MVP scope

A single page with:

1. **5x5 mini crossword**, a new puzzle each day ("today" is Pacific time). If no puzzle exists for the day, the app shows an error.
2. **Timer** that pauses while the tab is hidden.
3. **Reveal square**: unlimited, **+10s** per revealed square.
4. **Check puzzle**: unlimited, **+30s** per check.
5. **Friends leaderboard**: hidden until you finish; shows you plus accounts you follow on Bluesky who have solved today's puzzle, ranked by time including penalties.
6. **Share**: Wordle-style text with your time, rank, and a link, sent to the Bluesky composer or copied to the clipboard.
7. **Login gate**: logged-out users see a blurred page and a Bluesky login popup; logged-in users see their handle in the top right.

Gameplay rules: progress is saved in the browser; one attempt per puzzle, and the first completion is final. Times are reported by the client and trusted (see [ADR 0006](docs/adr/0006-trust-client-reported-results.md)).

---

## Architecture

```text
Browser (Vite + React SPA)
  ├─ Bluesky OAuth ───────────────► user's PDS
  ├─ write result record ─────────► user's PDS  (io.github.cse-210-group-09.xword.result)
  └─ /api ──► Node server (Hono or Express)
                ├─ GET  /api/puzzle/today     reads puzzles/YYYY-MM-DD.json
                ├─ POST /api/results          fetches the record from the user's PDS, validates, indexes
                ├─ GET  /api/leaderboard      getFollows (public AppView) ∩ indexed results
                └─ SQLite                     index of results (rebuildable from repos)
```

| Concern | Decision | ADR |
| --- | --- | --- |
| Base | Standalone app (not a Crosshare fork) | [0002](docs/adr/0002-standalone-app-not-crosshare.md) |
| Stack | Vite + React + TypeScript SPA; small Node + TypeScript server; SQLite | [0003](docs/adr/0003-vite-spa-with-node-server-and-sqlite.md) |
| Identity | Bluesky OAuth (`@atproto/oauth-client-*`) | [0004](docs/adr/0004-bluesky-oauth.md) |
| Results | AT Protocol records in the player's repo, keyed by puzzle date; indexed in SQLite | [0005](docs/adr/0005-results-as-atproto-records.md) |
| Trust | Solution sent to the client; client-reported times | [0006](docs/adr/0006-trust-client-reported-results.md) |
| Puzzles | `puzzles/YYYY-MM-DD.json` in this repo, Pacific time, no fallback | [0007](docs/adr/0007-daily-puzzle-supply.md) |
| Gameplay | Browser-saved progress, one attempt, +10s reveal / +30s check | [0008](docs/adr/0008-gameplay-rules.md) |
| Leaderboard | Self + followed accounts, solvers only | [0009](docs/adr/0009-friends-leaderboard.md) |
| Sharing | Time, rank, and link via Bluesky compose intent or clipboard | [0010](docs/adr/0010-share-format.md) |

Open decisions (hosting, browser vs server OAuth client) are listed in the ADRs and resolved through their issues.

---

## Repository structure

Directories marked *(planned)* do not exist yet or are empty placeholders; see the linked issue.

```text
bsky-xword/
├── src/                 # Vite entry point and the current prototype (App.tsx)
├── components/          # React components (planned split of App.tsx, #20)
│   ├── crossword/       #   grid, cells, clue list, reveal/check controls
│   ├── layout/          #   header, login gate
│   ├── leaderboard/     #   friends leaderboard
│   ├── modals/          #   completion modal
│   └── timer/           #   timer display and penalty feedback
├── hooks/               # useCrossword, useTimer, useAuth, ... (planned, #20)
├── lib/
│   ├── atproto/         # Bluesky/AT Protocol helpers (currently mock friends data)
│   ├── db/              # SQLite access (planned, #39)
│   └── puzzles/         # puzzle parsing/validation (currently a hard-coded test puzzle)
├── types/               # shared TypeScript types
├── app/api/             # placeholder; the server location is decided in #33
├── puzzles/             # daily puzzle files, YYYY-MM-DD.json (planned, #24)
├── lexicons/            # AT Protocol Lexicon for result records (planned, #38)
├── data/                # local SQLite database (gitignored)
├── docs/adr/            # architecture decision records
└── proposal/            # requirements; refined-proposal.md is superseded (Crosshare plan)
```

---

## Running locally

```bash
npm install
npm run dev        # http://localhost:3000
```

Other scripts:

```bash
npm run typecheck  # TypeScript checks
npm run build      # typecheck + production build
npm run preview    # serve the production build
```

Use dedicated Bluesky test accounts, not personal accounts, when testing login and result publishing.

---

## Contributing

- Pick up work from the [project board](https://github.com/orgs/CSE-210-Group-09/projects/4); each issue lists its dependencies and relevant ADRs.
- Work on a branch and open a PR against `main`.
- Changing a recorded decision? Add a new ADR (see [`docs/adr/README.md`](docs/adr/README.md)) rather than editing an accepted one.

## Running tests

Use Node.js 24 LTS, then install dependencies with `npm ci`.

```bash
npm test           # run the test suite once
npm run test:watch # rerun tests while editing
npm run typecheck
npm run build
```

Vitest uses jsdom and React Testing Library for component tests. Tests can import
`describe`, `it`, `expect`, and `vi` from `vitest`; name files `*.test.ts` or
`*.test.tsx`. `src/App.test.tsx` demonstrates a timer test with a fake clock.

Browser tests use Playwright ([ADR 0012](docs/adr/0012-test-layers-and-playwright.md)).
Install the browser once, then run them; each command starts `npm run dev` itself.

```bash
npx playwright install --only-shell chromium
npm run test:integration # tests/integration: one spec per story
npm run test:e2e         # tests/e2e: the whole daily flow
```

Work test first: unit tests on each task branch before its code, the story's
integration spec first on the story branch, and end-to-end tests ahead of the
stories they need. A test written before its feature is marked `test.fail(...)`
with the issue number; the PR that makes it pass deletes the marker.

GitHub Actions runs dependency installation, type checking, the production build,
and tests for every pull request and push to `main`. A failed assertion fails the
CI job. Puzzle file validation also runs once `validate-puzzles` is available, and
the Playwright integration and end-to-end tests run after the unit tests.

## Results database

The API creates the SQLite index and runs versioned SQL migrations automatically
before listening. `DB_PATH` selects the file, defaulting to `data/local.db`; missing
parent directories are created. Keep that file on persistent storage in production.
The build copies migrations into `dist-server` alongside the compiled database module.

`lib/db/index.ts` exposes `openResultsDatabase(path)` with `upsertResult`,
`getResultsForDate`, and `close`, keeping the driver behind one interface. The query
returns only requested DIDs for the specified date, ordered by time. Upsert refreshes
the server's cached copy of a repo record, including CID and indexing timestamp.
The publishing flow enforces first completion; this index does not prevent repo edits.

Run `npm run test:db` for in-memory query/upsert tests and an on-disk migration restart
test. To add a migration, add the next zero-padded SQL file to `lib/db/migrations/`;
applied files are recorded in `schema_migrations` and must not be edited.
