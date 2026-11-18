# 0008. Gameplay rules: progress, attempts, and penalties

- Status: Accepted
- Date: 2026-11-18

## Context

The MVP requires a timer, unlimited single-square reveals and whole-puzzle checks with time penalties, and a leaderboard hidden until completion.

## Decision

- **Progress:** grid contents, elapsed time, and penalties are saved in browser storage (keyed by puzzle date) and restored on reload.
- **Attempts:** one attempt per puzzle. The first completion is published and is final; there is no reset or replay.
- **Penalties:** +10 seconds per revealed square; +30 seconds per whole-puzzle check. Both actions are unlimited.
- **Timer:** counts only while the puzzle page is visible. It pauses when the tab is hidden (Page Visibility API) or the page is closed, and resumes from the saved value.
- **Displayed time:** elapsed time plus penalties, which is the value published and ranked.
- The prototype's test controls (Quick Fill, Reset, Play Again) are removed or hidden behind a development flag.

## Consequences

- Progress does not follow the user across devices mid-solve. A completed result does, via the repo record ([0005](0005-results-as-atproto-records.md)).
- Clearing browser storage mid-solve restarts the timer. Acceptable under [0006](0006-trust-client-reported-results.md).
- Pausing on hidden tabs lets a player read clues, leave, and think off the clock. Acceptable under [0006](0006-trust-client-reported-results.md).
