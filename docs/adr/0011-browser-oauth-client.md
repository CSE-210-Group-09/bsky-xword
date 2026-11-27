# 0011. Run the Bluesky OAuth client in the browser

- Status: Proposed
- Date: 2026-11-18

## Context

[0004](0004-bluesky-oauth.md) chose AT Protocol OAuth but left open whether the OAuth client runs in the browser (`@atproto/oauth-client-browser`, a public client) or on our Node server (`@atproto/oauth-client-node`, a confidential client). The spike in #36 ([`spikes/oauth-browser/`](../../spikes/oauth-browser/README.md)) built the browser version on localhost and compared it with the documented requirements of the server version.

What the app needs from OAuth in the MVP:

- The player's DID and handle, to show who is logged in.
- One write per puzzle: a result record in the player's repo ([0005](0005-results-as-atproto-records.md)).
- Nothing else. Follows and the leaderboard come from public endpoints and our SQLite index ([0009](0009-friends-leaderboard.md)), and the server verifies results by reading the record from the player's PDS without any session ([0005](0005-results-as-atproto-records.md)).

Findings:

| | Browser client (public) | Server client (confidential) |
| --- | --- | --- |
| Our code | Client setup, `init()` on load, sign-in, one write call | Same, plus `/login` and callback routes, cookie session between SPA and server, CSRF protection, state and session tables in SQLite, token refresh locking |
| Secrets | None | Private signing keys (env vars), a published `jwks.json`, key rotation |
| Local development | Works end to end with the loopback client (`http://127.0.0.1`), no tunnel | The confidential flow needs `client-metadata.json` and `jwks.json` on a public HTTPS URL, so localhost needs a tunnel (for example ngrok) or falls back to loopback, which is a public client anyway |
| Session lifetime | At most 2 weeks overall (atproto OAuth spec); about 1 day for loopback clients in development | Unlimited overall; refresh tokens up to 180 days |
| Where tokens live | Browser IndexedDB, DPoP-bound with non-extractable WebCrypto keys | Our database; the browser only holds a cookie |
| Server trust in results | Reads the record from the player's PDS (already designed in 0005) | Could trust its own session, but would still validate the record |
| Library guidance | README recommends the server client "when a backend server is available", mainly for revocation at scale and longer sessions | Recommended |

## Decision

- Use `@atproto/oauth-client-browser` as a public client for the MVP. The Node server does not handle OAuth sessions.
- Request the narrowest scope that works: `atproto repo:io.github.cse-210-group-09.xword.result?action=create`. The app only ever creates a result; it never updates or deletes one, and it never needs `transition:generic` (full write access to the player's whole repo).
- Write results with `com.atproto.repo.createRecord` and `rkey` = puzzle date. Because the record key is fixed and the scope has no `update` action, a second completion for the same day is rejected by the PDS, which backs up "the first completion is final" in [0008](0008-gameplay-rules.md). The rejection is a generic HTTP 500, so after a failed create the client reads today's record to tell "already completed" from a real error.
- Development uses the loopback client ID (`http://localhost?redirect_uri=http://127.0.0.1:<port>/&scope=...`), so no hosting is needed. Production serves a static `client-metadata.json` from the app's origin, with that URL as the client ID.
- Resolve handles through `https://bsky.social` (`handleResolver`). This sends the typed handle and the player's IP to Bluesky, which every player already uses.

## Consequences

- No secrets, no session storage, and no auth routes on the server. #37 is mostly frontend work, and the server stays stateless with respect to auth.
- Players must log in again at least every 2 weeks (each day in local development). Acceptable for the MVP; if it becomes a problem, a later ADR can move to the server client without changing the record format or the server's verification path.
- An XSS bug in our page could use the player's token. With the create-only scope, the damage is limited to creating result records; it cannot post, follow, or delete anything.
- Authenticated `app.bsky.*` calls through the PDS would need extra `rpc:` scopes. The app reads profiles and follows from the public AppView without auth instead.
- The dev server must serve on `127.0.0.1` (not `localhost`), and production OAuth can only be tested once the app is deployed (#44).
- Players see a short consent screen ("Repository: Publish changes") instead of the `transition:generic` one, which asks to manage their posts, likes, follows, private preferences, and all repo data.
- Implementation notes for #37 (packages, config, gotchas, bundle size) and the test results are in [`spikes/oauth-browser/README.md`](../../spikes/oauth-browser/README.md).

## Evidence

Tested on 2026-11-18 with a test account on bsky.social: the create-only scope was granted exactly as requested; writes to another collection and deletes were rejected with `403 ScopeMissingError`; a second `createRecord` for the same date was rejected and the original record was unchanged; the record could be read back from the PDS without a token; sessions survived a reload, refreshed, and were revoked on sign-out. With `transition:generic`, the same write to another collection succeeded.

Not verified by running code:

- The server-client column of the table comes from the `@atproto/oauth-client-node` README and the atproto OAuth spec; the server client was not built.
- Session limits (2 weeks for public clients, about 1 day for loopback clients) come from the spec and the browser client README; no session was kept long enough to observe them.
- The production setup (hosted `client-metadata.json`) is documented but can only be tested after deployment (#44).
