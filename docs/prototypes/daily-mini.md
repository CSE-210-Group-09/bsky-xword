# Matthew's Monday prototype

Branch: `prototype/matthew-daily-mini`. Start with Node 22 or later:

```sh
node prototypes/daily-mini/server.mjs
# Open http://127.0.0.1:3100
node --test prototypes/*/*.test.mjs
```

No install, credentials, or external services are required. This branch merges the result-contract and friend-leaderboard prototype branches to exercise their contracts in a playable UI. Those PRs remain independent review units.

## Plan from the November 13 meeting

The meeting notes in `context/cse210_meeting_nov13.md` take precedence over earlier exploratory scope. Monday's goal is an individual working prototype with one hardcoded 5×5 puzzle. Validation waits until the board is full. In-progress attempts do not appear on the leaderboard. A completed or abandoned attempt unlocks comparison.

Implemented here:

- Keyboard-accessible grid, across/down clues, arrow navigation, elapsed wall time.
- Full-board validation without per-cell error hints.
- Entries and first completion saved by puzzle ID and content revision in browser storage.
- Completed first time survives reload; the API adapter retains the original record on retry.
- Self and a sample followed solver ranked through the existing leaderboard module; an unrelated sample solver is excluded.
- Abandonment reveals comparison without submitting a score.

Issue coverage is partial. This advances #8's completion UI/persistence and #11's UI integration; it supplies one fixture toward #7. It does not complete those issues. #4 OAuth remains the highest-risk next step, followed by #9 real publication/read-back and #10 durable indexing. The Monday review should choose the solver approach before #5 production integration proceeds.

## Decisions and trade-offs for review

| Decision | Prototype choice | Production follow-up |
| --- | --- | --- |
| Solver | Small standalone mechanics demo | Compare with Crosshare spike #1; proposal still calls for Crosshare reuse. This demo does not settle that decision. |
| Puzzle supply | Ancient public-domain Sator word square, locally written clues | Replace Latin/proper-name-heavy fixture with a team-authored accessible mini. No daily generation. |
| Revision | Existing SHA-256 content revision function | Agree immutable manifest and timezone in #7. This demo is one featured puzzle, not a daily release schedule. |
| Results | Browser persistence and local validation | Browser state and elapsed times are user-controlled. No authentication or anti-cheat claim. |
| Friend comparison | Fixed sample identities and ranking module | Connect complete follows and verified index records. Samples are labeled in the UI. |
| Storage | Derived index preferred over querying every PDS | Keep AT repository records authoritative. #10 handles recovery and reconciliation. No firehose dependency for this prototype. |
| Publication | Disabled, explicitly labeled control | Official OAuth, server-verified author, deliberate public publication, create-only retry and read-back required. |

The meeting summary mentions a firehose while the refined proposal and #10 explicitly exclude it from MVP. Retain bounded participant reconciliation pending team review. This is a documented option, not an approved change to the architecture.

## Monday walkthrough

1. Start and fill a few cells. Reload to verify entries and the running clock remain.
2. Fill all squares incorrectly. Check becomes available and reports only a board-level error.
3. Enter rows `SATOR`, `AREPO`, `TENET`, `OPERA`, `ROTAS`. Check to freeze first completion and reveal the sample comparison.
4. Reload. Confirm the first time remains unchanged.
5. In a separate browser profile, abandon an attempt. No self score should appear.

The answer is documented for review and available in source, as expected for an honor-system fixture. No results leave this local app. To repeat a demo, clear the `mini:` key for this origin in browser storage. The timer includes background/reload time. No pause or hints are implemented.

Validation: 18 Node tests pass, including full-board gating, incorrect-board rejection, immutable retry, self/follow filtering, HTTP metadata and malformed requests. Browser visual QA could not run because the browser access host was unavailable. A GitHub Actions workflow runs the tests on Node 22.
