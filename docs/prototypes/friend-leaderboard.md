# Follow lookup and friend ranking spike

Issue: [#3](https://github.com/CSE-210-Group-09/bsky-xword/issues/3).

## Run

No dependencies or credentials are required. Use Node 22:

```sh
node --test prototypes/friend-leaderboard/friends.test.mjs
node prototypes/friend-leaderboard/demo.mjs
node prototypes/friend-leaderboard/smoke.mjs bsky.app
```

Seven tests passed on Node 22 and Node 25. The live public API check on November 13, 2026 UTC returned 41 follows for `bsky.app` in one page. Cursor behavior was tested using two-page fixtures; this live check does not prove multi-page behavior against the service. CI uses offline fixtures, so external service availability does not block it.

## Findings

The public [getFollows endpoint](https://github.com/bluesky-social/atproto/blob/main/lexicons/app/bsky/graph/getFollows.json) supports actor, limit, and cursor. The client requests 100 profiles per page from the fixed public AppView origin. It deduplicates DIDs and follows opaque cursors. Any HTTP failure, malformed page, repeated cursor, or page-limit exhaustion rejects the whole operation. A partial graph must not silently become an apparently complete leaderboard. Requests time out after ten seconds per page; the default limit is 100 pages. Large graphs require an explicit product/performance decision in #11.

`friendLeaderboard` takes a verified index projection with these fields:

```text
author, uri, puzzleId, puzzleRevision, durationMs, assisted, completedAt
```

It includes self and followed accounts only, filters to exact puzzle ID and revision, and chooses each author's earliest completion rather than their fastest replay. Equal unassisted durations share competition ranks, such as 1, 1, 3. Assisted first completions appear separately without ranks, even if a later replay claims to be unassisted. Empty inputs produce empty lists, not zero scores. Malformed rows are excluded. A missing follow graph is an error rather than an empty list of follows.

Fixture DIDs are synthetic; they are not participant accounts. The ranking function does not resolve identities or authenticate authors. The index in #10 must derive authors from repository provenance, validate the published record, and preserve create-only first-completion semantics. A timestamp supplied by a client cannot enforce that rule against cheating.

This spike is independent of the completion-contract PR. Its input is an index projection, while that PR defines the public record without an author field. #10 supplies the conversion. Before integration, use the shared production schema instead of maintaining parallel validation. #11 supplies caching, profile display, UI/error states, and the real three-account acceptance scenario. The seven tests cover pagination, filtering, ties, replay handling, malformed scores, empty results, and missing follows; they do not exercise a deployed app.
