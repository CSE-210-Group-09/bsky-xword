# 0007. Daily puzzle supply from date-named files with a fallback

- Status: Accepted
- Date: 2026-11-18

## Context

The MVP is a 5x5 mini that changes daily. Puzzles are authored by the team rather than generated.

## Decision

- Puzzles are stored in this repository as one JSON file per day, named by date: `puzzles/YYYY-MM-DD.json`.
- "Today" is defined in the `America/Los_Angeles` time zone (Pacific time, including DST).
- The server reads the file for today's date and serves it from `GET /api/puzzle/today`.
- There is no fallback puzzle. If today's file is missing or invalid, the API returns an error and the app shows a "no puzzle today" message.
- Each puzzle has a stable `id`. Results and leaderboards are keyed by puzzle date, and the record also stores `puzzleId`.

## Consequences

- Authors schedule a puzzle by merging a correctly named file. Puzzles must be merged and deployed before their day begins.
- A puzzle file must not change after its day begins, or players will see different grids.
- A file format and a validator (run in CI) are needed so authoring errors are caught before merge.
- No fallback means a missed day shows an error, but players never compare results on different puzzles.
- This mechanism is temporary: it is expected to be replaced by automatic puzzle generation after the MVP. Keep it behind the `/api/puzzle/today` interface so the replacement does not affect the client.
