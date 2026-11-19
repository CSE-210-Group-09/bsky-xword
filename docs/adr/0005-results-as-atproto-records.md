# 0005. Store results as AT Protocol records, indexed in SQLite

- Status: Accepted
- Date: 2026-11-18

## Context

Results could live only in our database, or in each player's AT Protocol repository. Storing them in the user's repo uses AT Protocol more meaningfully and lets users keep a portable record of their own stats. The leaderboard still needs fast queries across many users, which reading every follow's repo on each request cannot provide.

## Decision

- Define a custom Lexicon record type for a puzzle result with NSID `io.github.cse-210-group-09.xword.result`. The team has no domain; the GitHub org controls `cse-210-group-09.github.io` via GitHub Pages, so the NSID sits under a domain we control.
- On completion, write one result record to the player's repo. Use the puzzle date (`YYYY-MM-DD`) as the record key so there is at most one result per user per puzzle.
- Notify our server with the record's AT URI. The server resolves the DID to its PDS, fetches the record, validates it against the schema, and inserts it into a SQLite index.
- The leaderboard reads only from the SQLite index.

Draft record fields (finalised in the schema issue): `puzzleId`, `puzzleDate`, `timeSeconds` (including penalties), `revealCount`, `checkCount`, `completedAt`.

## Consequences

- Authorship is verified by the repo itself: only the DID's owner can write to it, so the server does not need the user's session to trust the record.
- The index is a cache and can be rebuilt from repos.
- On page load, the client can check for today's record in the user's repo to restore the completed state on any device.
- A user can delete or edit their record outside our app; the index will not see this unless re-read. Acceptable for the MVP.
- Results written by other clients are not discovered (no firehose/Jetstream subscription in the MVP).
- The NSID must not change once real records exist; renaming orphans them. If the team later acquires a domain, add a new record type rather than renaming.
