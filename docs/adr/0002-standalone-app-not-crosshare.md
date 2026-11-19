# 0002. Build a standalone app instead of a Crosshare fork

- Status: Accepted
- Date: 2026-11-18

## Context

`proposal/refined-proposal.md` proposed forking Crosshare and integrating Bluesky identity alongside its Firebase auth. The team instead built a standalone React prototype (`src/App.tsx`) with its own solver. The MVP (`proposal/updated-MVP-requirements.md`) is a single page with a 5x5 grid, which the prototype already mostly covers.

## Decision

Build bsky-xword as a standalone application. Do not fork or depend on Crosshare.

## Consequences

- No Firebase/Bluesky identity-binding problem; Bluesky is the only identity.
- We own the solver, so reveal/check/penalty features must be built (the prototype has none).
- `proposal/refined-proposal.md` and GitHub issues #1–#15 are superseded and closed.
