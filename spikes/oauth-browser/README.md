# Spike: Bluesky OAuth with the browser client (#36)

Throwaway demo for [#36](https://github.com/CSE-210-Group-09/bsky-xword/issues/36). The decision it supports is [ADR 0011](../../docs/adr/0011-browser-oauth-client.md).

It is a separate npm package on purpose, so it does not touch the root `package.json`/lockfile while the backend PRs are in review. Plain TypeScript, no React.

## Run it

```bash
cd spikes/oauth-browser
npm install
npm run dev        # http://127.0.0.1:5180  (not localhost)
```

Use a dedicated Bluesky **test account**. The demo only writes to `io.github.cse-210-group-09.xword.result` with record key `2000-01-01`, and to `io.github.cse-210-group-09.xword.scopeprobe` during the scope probe.

## What to try

1. Pick a scope, enter the test account's handle, sign in on bsky.social, approve.
2. Check "Scope granted" against "Scope requested".
3. **Write test record** twice: the first should succeed, the second should be rejected (record already exists).
4. **Read it back**: a plain `fetch` to the player's PDS, no token. This is what `POST /api/results` will do.
5. **Scope probe**: should be rejected under the two granular scopes and succeed under `transition:generic`.
6. **Delete test record**: rejected under create-only; sign in with "Granular" to clean up.
7. Reload the page (session restored), **Force token refresh**, **Sign out**.

## Results

Tested 2026-11-18 with a test account on bsky.social (PDS `*.host.bsky.network`), all three scopes. The account was left with no test records.

| Check | Result |
| --- | --- |
| bsky.social accepts the loopback client ID with granular scopes | Yes, for `repo:<collection>` and `repo:<collection>?action=create` |
| User cancels on the sign-in page | Redirected back; `client.init()` throws `"The user rejected the request"`, URL is clean |
| Login, DID and handle shown | Yes; handle from `com.atproto.repo.describeRepo` |
| Granted scope equals requested | Yes, exactly, for all three scopes |
| Access token lifetime | About 60 minutes (refreshed transparently) |
| First `createRecord` (rkey `2000-01-01`) | OK, `validationStatus: "unknown"` (the PDS does not know our Lexicon, so our server must validate) |
| Second `createRecord`, same rkey | Rejected, but with **HTTP 500 `InternalServerError`**, not a specific "already exists" error. Read-back showed the original record unchanged |
| Public read-back, plain `fetch`, no token | HTTP 200 with `uri`, `cid`, `value`. After deletion: **HTTP 400 `RecordNotFound`** (not 404) |
| Write to another collection, create-only scope | HTTP 403 `ScopeMissingError`: `Missing required scope "repo:…scopeprobe?action=create"` |
| Delete, create-only scope | HTTP 403 `ScopeMissingError` (`?action=delete` missing) |
| Delete, granular scope | OK |
| Write to another collection, granular scope | HTTP 403 `ScopeMissingError` |
| Write to another collection, `transition:generic` | Succeeded (then deleted): the broad scope really allows anything |
| Reload page | Session restored from IndexedDB |
| Force refresh | OK, new access token |
| Sign out | Tokens revoked (`onSessionDeleted` with "successfully revoked"); reload shows signed out |

Consent screen shown by bsky.social:

- Granular and create-only: one line, "Repository: Publish changes".
- `transition:generic`: three lines: "Manage your profile, posts, likes and follows as well as read your private preferences", "Create, update, and delete any public data linked to your account", "Perform authenticated actions towards any service on your behalf".
- Loopback clients appear as "An application on your device"; a hosted `client-metadata.json` can set `client_name` and `logo_uri`.

## Notes for the implementation (#37)

**Packages.** `@atproto/oauth-client-browser` (spike used 0.5.14). `@atproto/api` is optional: the spike bundle is 948 kB (184 kB gzip) with it and 205 kB (57 kB gzip) when calling `session.fetchHandler('/xrpc/com.atproto.repo.createRecord', …)` directly. We only need one write, so skip `@atproto/api` in the app.

**Client ID and metadata.**

- Development: build it with `buildAtprotoLoopbackClientMetadata({ scope, redirect_uris: [\`${location.origin}/\`] })`. The scope and redirect URI are encoded in the client ID (`http://localhost?scope=…&redirect_uri=…`); the authorization server never fetches anything from us.
- Production: serve `client-metadata.json` from the app origin (for example Vite `public/`), with `client_id` equal to its own URL, `redirect_uris` the app URL, the same `scope`, `token_endpoint_auth_method: "none"`, `application_type: "web"`, `dpop_bound_access_tokens: true`. Pick dev vs prod with `import.meta.env.DEV`.

**Gotchas.**

1. **Serve on `127.0.0.1`, not `localhost`.** Loopback clients only accept IP origins. The root `vite.config.ts` needs `server.host: '127.0.0.1'`.
2. **Call `client.init()` exactly once per page load.** `src/main.tsx` uses `<React.StrictMode>`, which runs effects twice in development. Create the client and the `init()` promise at module level (a singleton), not inside `useEffect`.
3. **`init()` throws on callback errors** (for example the user pressed Cancel). Catch it and show the login gate with a message.
4. **The scope is part of the loopback client ID.** Changing the scope means a different client; existing sessions keep their old scope until the user signs in again.
5. **The package README is out of date**: there is no `client.addEventListener('deleted')` in 0.5.x. Use the `onSessionDeleted` / `onSessionUpdated` constructor options. They also fire for changes in other tabs.
6. **Use `createRecord` with `rkey` = puzzle date**, not `putRecord`: create-only scope plus a fixed key makes the PDS reject a second result for the same day. The rejection is a generic HTTP 500, so after a failed create, `getRecord` today's key: if it exists, treat the puzzle as already completed; otherwise it was a real error (retry or show it).
7. **Profiles and follows**: read them from the public AppView without auth. Authenticated `app.bsky.*` calls through the PDS would need extra `rpc:` scopes.
8. **Session lifetime**: at most 2 weeks for a public client; about 1 day with the loopback client in development, so expect to log in again daily while developing.
9. `npm audit` reports a high-severity `zod` advisory (GHSA-mrhx-c7xc-m3w5) in transitive `@atproto/*` dependencies. The suggested fix downgrades `@atproto/api` to 0.13.x, which is wrong; wait for an upstream release.
10. **`getRecord` for a missing record returns HTTP 400 `RecordNotFound`**, not 404. Both the client (restore completed state) and `POST /api/results` should check the `error` field.
11. **`onSessionDeleted` can fire during a successful sign-in** (seen once, cause "The session was deleted by another process", right before the new session was stored). Do not treat every deletion event as a logout; check whether `init()` returned a session.
