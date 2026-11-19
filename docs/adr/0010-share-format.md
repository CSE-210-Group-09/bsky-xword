# 0010. Share format

- Status: Accepted
- Date: 2026-11-18

## Context

Daily games like Wordle spread through short, spoiler-free result posts.

## Decision

After completion the player can share a text containing the puzzle date, their time, their friend rank, and a link to the app, with no answer letters. Two actions:

- **Share to Bluesky:** opens `https://bsky.app/intent/compose?text=<url-encoded text>`. Nothing posts without the user confirming.
- **Copy:** copies the same text to the clipboard.

Example:

```
bsky-xword mini 2026-11-18
⏱️ 1:23 · #2 among friends
https://<app-domain>/
```

## Consequences

- The rank is a snapshot at share time and may change as more friends solve.
- Exact wording and emoji can change without a new ADR.
