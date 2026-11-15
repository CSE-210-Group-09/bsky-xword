# Prototype: direct-PDS friend leaderboard (Xiangyu)

A playable 5×5 mini plus a friend leaderboard that has **no backend at all**: the browser
reads each followed account's result record straight from that account's own PDS.

It answers the open question from the Nov 13 meeting, *"our own database vs. querying friends'
PDSs directly"*, with a working implementation and measured request costs, so we can compare
it against the index-based design in the proposal (`prototype/friend-leaderboard`, PR #18).

## Run it

No Node needed. Plain HTML + ES modules, no build step.

```bash
python prototypes/xiangyu-direct-pds/serve.py
```

Then open <http://127.0.0.1:8123>. Tests: <http://127.0.0.1:8123/tests.html> (11 browser tests).
Any static server works too (`npx serve prototypes/xiangyu-direct-pds`). Opening the file
directly with `file://` does **not** work, because ES modules and `crypto.subtle` need http(s).

## What it demonstrates

| Area | Behavior | Source of the rule |
|---|---|---|
| Puzzle | One hardcoded, team-authored 5×5 (no daily logic) | Nov 13: hardcode one puzzle for prototypes |
| Solving | Timer starts on **Start**; pauses and hides the grid when the tab is hidden | 11/9 user story "pause timer when leaving tab" |
| Checking | No per-letter checks; once every square is filled: "at least one square is wrong" or solved | Nov 13 MVP decision |
| Give up | Two-step **Give up** reveals answers and records `assisted: true` | Nov 13: baseline is "finish or give up", no hints/reveal |
| Result record | Exact shape and record key from `prototype/result-contract` (`puzzleId`, `puzzleRevision`, `durationMs`, `assisted`, `completedAt`; rkey = sha256 of puzzle id + revision) | PR #17 |
| First completion only | Your first result is kept; **Practice replay** never changes it | Proposal: replays don't improve a score |
| Ranking | Ported unchanged from `friends.mjs`: unassisted by time, ties share rank, gave-up listed separately, unfollowed excluded, earliest completion wins | PR #18 |
| Sharing | Spoiler-free text (grid shape + time, no letters) opened in the Bluesky compose intent; nothing posts automatically | Proposal: spoiler-free compose flow |
| Live leaderboard | Enter any handle: `getProfile` → paginated `getFollows` → DID doc per friend → `getRecord` on each friend's PDS | This prototype's experiment |

**Demo data** tab: fixture accounts covering every rule above (tie, gave-up, unfollowed account,
faster replay, friend who hasn't played). **Live Bluesky** tab: real network, read-only, no login.

Not included on purpose: Bluesky OAuth and writing the record (issue #6), Crosshare integration
(PR #16), daily puzzle selection. The record you'd publish is shown in the result card.

## Measured cost (live, Nov 15 2026)

Handle `bsky.app`, 8 parallel requests:

| Metric | Value |
|---|---|
| Follows checked | 43 |
| HTTP requests | 90 (1 getProfile + 1 getFollows page + 44 DID documents + 44 getRecord) |
| Distinct PDS hosts contacted | 25 |
| Failed lookups | 0 (every PDS allowed cross-origin reads) |
| Wall time | 2.1 s |

Cost formula: `1 + ceil(F/100) + 2(F+1)` requests per leaderboard view, so about **1,008 for 500 follows**.
The browser console shows one `400` per friend without a result: that is the PDS answering
`RecordNotFound`, which is expected.

## Trade-offs vs. the server-side index (for the trade-offs doc)

| | Direct PDS (this prototype) | Derived index (proposal, PR #18) |
|---|---|---|
| Infrastructure | Static files only | Server + database + reconciliation job |
| Requests per view | ~2 per follow (90 for 43; ~1,000 for 500) | 1 to our API |
| Latency | Grows with follow count and the slowest PDS | Roughly constant |
| Freshness | Always live; a new record appears on the next load | Depends on read-back at publish and reconciliation |
| Author provenance | Record comes from the author's own repo, so attribution follows the DID | Server must read back and verify before indexing |
| Results from other clients | Found automatically if they use the same collection + rkey | Only if indexed (Jetstream later) |
| Failure modes | Many third-party hosts; plc.directory and PDS rate limits | One service to monitor and cache |
| Privacy | Viewer's browser contacts every friend's PDS (they see the viewer's IP) | Only our server does |
| Past days | Same cost per view | Cheap query |

A possible hybrid: the index as the main path, with direct-PDS reads to verify results or as a
fallback when the index is stale. Caching DID → PDS lookups would also cut requests by about half.

## Files

```
index.html, styles.css   UI (black / white / yellow, per the Canva board notes)
src/puzzle.js            puzzle data, numbering, revision hash (same as result-contract)
src/game.js              grid, timer, check-when-full, give up, practice replay
src/result.js            record shape, validation, deterministic record key
src/ranking.js           friendLeaderboard() ported from friend-leaderboard
src/atproto.js           public AT Protocol reads + request metrics
src/share.js             spoiler-free share text + compose intent
src/demo-data.js         fixture accounts for the demo tab
src/main.js              wiring
src/tests.js, tests.html browser tests
serve.py                 static server with correct MIME types
```
