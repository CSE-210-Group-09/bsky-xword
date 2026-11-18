# 0006. Trust client-reported results for the MVP

- Status: Accepted
- Date: 2026-11-18

## Context

Preventing cheating would require keeping solutions on the server, handling check/reveal through API calls, and timing solves server-side. That roughly doubles the backend work. The leaderboard is among friends, and results are self-published records in any case.

## Decision

- The puzzle solution is sent to the browser; check, reveal, and completion detection run client-side.
- The client computes elapsed time and penalties and reports them in the result record.
- The server validates only shape and plausibility (schema-valid, non-negative time, known puzzle).

## Consequences

- Anyone can read the answers or submit a fake time. The app makes no claim of verified competition.
- Server-side validation can be added later without changing the record schema.
