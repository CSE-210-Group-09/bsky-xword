# 0003. Vite SPA with a small Node server and SQLite

- Status: Accepted
- Date: 2026-11-18

## Context

The prototype is a Vite + React + TypeScript SPA. The README describes Next.js App Router with SQLite. SQLite needs a persistent filesystem, which serverless hosts (e.g. Vercel, the usual Next.js target) do not provide. The backend needs are small: serve the daily puzzle, index results, and compute a leaderboard.

## Decision

- Keep the frontend as a Vite + React + TypeScript SPA.
- Add a small Node + TypeScript HTTP server (Hono or Express; chosen in the backend skeleton issue) exposing JSON endpoints under `/api`.
- Use SQLite as the server's database.
- Deploy to a host with a persistent disk (e.g. Render or Fly.io). The same server serves the built SPA.

## Consequences

- One deployable unit, one process, no separate database service.
- The README's Next.js references must be removed.
- Vite's dev server proxies `/api` to the Node server during development.
- SQLite is a single-instance store; horizontal scaling is out of scope. Because results live in user repos ([0005](0005-results-as-atproto-records.md)), the database is rebuildable.

- The team has no domain or server. Development does not need either: Bluesky OAuth supports a localhost (loopback) client. A host's free subdomain (e.g. `*.onrender.com`, `*.fly.dev`) satisfies OAuth's public-HTTPS requirement for deployment.

## Open questions

- Which host, decided in the deployment issue. Free tiers usually have ephemeral disks, which would wipe a local SQLite file on redeploy. Options: (a) free host + a hosted SQLite-compatible database such as Turso; (b) a small paid host with a persistent volume (e.g. Fly.io, Railway); (c) credits from the GitHub Student Developer Pack. Verify current free-tier terms before choosing.
