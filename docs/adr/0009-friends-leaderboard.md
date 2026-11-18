# 0009. Friends leaderboard composition

- Status: Accepted
- Date: 2026-11-18

## Context

The leaderboard should show how people the player knows on Bluesky did on today's puzzle.

## Decision

- Entries: the current user plus accounts they follow (one-way follows, via `app.bsky.graph.getFollows` with full pagination) who have a result for today's puzzle.
- Accounts that have not solved are not shown.
- Ranked by time ascending (penalties included); equal times share a rank.
- The leaderboard is hidden until the current user has completed the puzzle.
- The server computes it by intersecting the follow list with the SQLite index for the puzzle date.

## Consequences

- `getFollows` is public, so the server needs only the user's DID, not their session.
- Users following thousands of accounts need several paginated requests; the follow list may be cached briefly.
