# Bluesky Xword (bsky-xword)

A daily 5x5 mini crossword puzzle app built on the **AT Protocol (Bluesky)**. Players solve daily mini puzzles and compare completion times on a personalized leaderboard made up solely of accounts they follow on Bluesky.

---

## Tech Stack

* **Frontend**: Next.js / React, TypeScript, CSS
* **Identity & Social Graph**: AT Protocol (`@atproto/api`), Bluesky OAuth, `app.bsky.graph.getFollows`
* **Storage & Indexing**: SQLite (persisting and querying daily completion records)
* **Puzzles**: Seeded daily 5x5 mini crossword manifest

---

## Repository Structure

```text
bsky-xword/
├── app/                          # Next.js App Router & Server API Handlers
│   └── api/                      # Backend API Route Handlers
│       ├── auth/                 # AT Proto OAuth login & callback endpoints
│       ├── puzzle/               # Daily puzzle delivery endpoints
│       └── leaderboard/          # Results publishing & friend leaderboard endpoints
│
├── components/                   # Modular React UI Components
│   ├── crossword/                # 5x5 Grid, individual cells, clue lists, board controls
│   ├── layout/                   # Header, brand bar, and Login/Auth blur gate
│   ├── leaderboard/              # Friend leaderboard table, user ranking row, empty states
│   ├── modals/                   # Completion/victory modal, inspect grid dialog, share modal
│   └── timer/                    # Live timer display & time penalty badges
│
├── hooks/                        # Custom React Hooks & State Management
│   ├── useCrossword.ts           # Grid state, letter entry, cursor & keyboard navigation
│   ├── useTimer.ts               # Timer countdown/elapsed + square/check penalties
│   ├── useAuth.ts                # Bluesky login state, user DID & handle
│   └── useLeaderboard.ts         # Leaderboard fetching, ranking logic, score freezing
│
├── lib/                          # Core Services, Business Logic & Protocol Clients
│   ├── atproto/                  # Bluesky client, OAuth, follow-graph fetch, record schemas
│   ├── db/                       # SQLite client, migrations/schema, leaderboard SQL queries
│   └── puzzles/                  # Daily puzzle manifests and solution validation engine
│
├── types/                        # Shared TypeScript Definitions
│   ├── puzzle.ts                 # Puzzle, Clue, Cell, and Direction types
│   ├── leaderboard.ts            # LeaderboardEntry and Ranking interfaces
│   ├── atproto.ts                # AT Protocol session and custom record schemas
│   └── api.ts                    # API request & response payload contracts
│
├── data/                         # Local database storage & seed files
│   └── local.db                  # Local SQLite database file (gitignored)
│
├── src/                          # Active Prototype source (Vite + React)
│   ├── App.jsx                   # Interactive prototype single-page solver & leaderboard
│   ├── index.css                 # Prototype layout & styles
│   └── main.jsx                  # Prototype React entry point
│
├── proposal/                     # Product requirements & design documents
│   ├── refined-proposal.md       # Detailed three-week MVP proposal & architecture
│   └── slack-summary.md          # Team alignment & core problem statement
│
├── package.json
└── vite.config.js
```

---

## Detailed Directory Breakdown

### 1. `components/` (Frontend UI)
Modular, reusable React components split by functional domain:
* **`crossword/`**: The core playing experience — the 5x5 grid (`Grid.tsx`), individual cells (`Cell.tsx`), across/down clue lists (`CluesPanel.tsx`), and game buttons (`Controls.tsx` for Reveal Square / Check Puzzle).
* **`layout/`**: Page skeleton components, top navigation (`Header.tsx`), and the **Auth Gate** (`AuthGate.tsx`) which blurs the entire page and shows a login prompt when unauthenticated.
* **`leaderboard/`**: The friend leaderboard panel (`LeaderboardPanel.tsx`) and rows (`LeaderboardRow.tsx`). Hidden until the daily puzzle is completed.
* **`modals/`**: Dialogs including `VictoryModal.tsx` (shown upon puzzle completion) and `ShareModal.tsx` (spoiler-free share snippet & Bluesky compose intent).
* **`timer/`**: `Timer.tsx` displaying current elapsed time (`mm:ss`) and animations for applied time penalties.

### 2. `lib/` (Core Libraries & Backend Integration)
Non-UI logic, protocol adapters, database utilities, and puzzle definitions:
* **`atproto/`**:
  * AT Protocol client setup (`@atproto/api`).
  * Authentication / OAuth session handling.
  * Fetching followed accounts via `app.bsky.graph.getFollows`.
  * Publishing and reading custom AT Protocol result records.
  * Contains `mockFriends.js` for initial prototyping and offline testing.
* **`db/`**:
  * SQLite database client connection (e.g. `better-sqlite3`).
  * Table schema definitions for completed puzzle results and user index.
  * Fast queries to match a user's follow list against today's solve records.
* **`puzzles/`**:
  * Dated daily mini crossword manifests (5x5 grids, clues, and solutions).
  * Contains `puzzleData.js` (seeded test puzzle).
  * Puzzle solution checker and penalty calculation helpers.

### 3. `hooks/` (Game State & Hooks)
Encapsulates React state and side-effects so components remain clean:
* **`useCrossword`**: Manages letter inputs, backspace, arrow keys, cell selection, and checks for completion.
* **`useTimer`**: Handles the live ticking clock, pausing on victory, and applying time penalties (`+10s` for square reveal, `+30s` for check puzzle).
* **`useAuth`**: Provides the current user's Bluesky session, handle, DID, and avatar.
* **`useLeaderboard`**: Merges friends' scores with the current player's frozen first-attempt score and computes ascending rankings.

### 4. `app/api/` (Server Route Handlers)
Next.js server-side endpoints:
* **`/api/auth/*`**: Handles OAuth redirects and session verification.
* **`/api/puzzle/today`**: Returns the current date's 5x5 mini puzzle (without answers leaked to client).
* **`/api/leaderboard`**: Submits user completion records and returns ranked results for accounts followed on Bluesky.

### 5. `types/` (TypeScript Interfaces)
Shared TypeScript type definitions across frontend components and backend handlers.

### 6. `data/` (Local Storage)
Holds the local SQLite `.db` file for development and test fixtures.

---

## MVP Feature Scope

1. **Single-Page Application**: Minimal, distraction-free daily puzzle solver.
2. **5x5 Mini Crossword**: Daily refreshed 5x5 grid with Across & Down clues.
3. **Timer & Time Penalties**:
   * Running timer.
   * **Reveal single square**: Unlimited tries, adds a time penalty per revealed square.
   * **Check whole puzzle**: Unlimited tries, adds a time penalty per check.
4. **Friends-Only Leaderboard**:
   * Hidden until the player completes the puzzle.
   * Displays only accounts the user follows on Bluesky who have completed today's mini.
   * Ranked purely by elapsed time (including penalties).
   * **First-Attempt Rule**: A player's first completion time is frozen; subsequent reattempts do not overwrite the leaderboard score.
5. **Bluesky Integration**:
   * **Login Gate**: If not logged in, blurs the page and prompts login. Top-right shows handle and avatar once authenticated.
   * **Spoiler-Free Share**: Generates a clean result snippet (time, rank, link) and launches a prefilled Bluesky compose window (`bsky.app/intent/compose`).

---

## Running the Prototype Locally

To run the current prototype:

```bash
# 1. Install dependencies
npm install

# 2. Start the dev server
npm run dev
```

Visit `http://localhost:3000/` in your browser. To stop the server at any time, press `Ctrl + C` in your terminal.
