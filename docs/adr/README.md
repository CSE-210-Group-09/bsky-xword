# Architecture Decision Records

This directory records significant design decisions for bsky-xword, using the
format from [Michael Nygard's ADRs](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions).

## Process

- One decision per file, named `NNNN-short-title.md`, numbered sequentially.
- Copy `template.md` to start a new record.
- Statuses: `Proposed` → `Accepted` → (optionally) `Superseded by NNNN` or `Deprecated`.
- Accepted records are not rewritten. To change a decision, add a new ADR that supersedes it and update the old one's status line.
- Open questions belong in the ADR's "Open questions" section until resolved.

## Index

| # | Title | Status |
| --- | --- | --- |
| [0001](0001-record-architecture-decisions.md) | Record architecture decisions | Accepted |
| [0002](0002-standalone-app-not-crosshare.md) | Build a standalone app instead of a Crosshare fork | Accepted |
| [0003](0003-vite-spa-with-node-server-and-sqlite.md) | Vite SPA with a small Node server and SQLite | Accepted |
| [0004](0004-bluesky-oauth.md) | Authenticate with Bluesky OAuth | Accepted |
| [0005](0005-results-as-atproto-records.md) | Store results as AT Protocol records, indexed in SQLite | Accepted |
| [0006](0006-trust-client-reported-results.md) | Trust client-reported results for the MVP | Accepted |
| [0007](0007-daily-puzzle-supply.md) | Daily puzzle supply from date-named files with a fallback | Accepted |
| [0008](0008-gameplay-rules.md) | Gameplay rules: progress, attempts, and penalties | Accepted |
| [0009](0009-friends-leaderboard.md) | Friends leaderboard composition | Accepted |
| [0010](0010-share-format.md) | Share format | Accepted |
| [0011](0011-browser-oauth-client.md) | Run the Bluesky OAuth client in the browser | Proposed |
| [0012](0012-test-layers-and-playwright.md) | Three test layers, with Playwright for browser tests | Proposed |
| [0013](0013-saved-progress-in-localstorage.md) | Save progress in localStorage, one key per puzzle date | Proposed |
