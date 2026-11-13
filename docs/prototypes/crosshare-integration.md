# Crosshare runtime and integration spike

Issue: [#1](https://github.com/CSE-210-Group-09/bsky-xword/issues/1).

## Reproduce

Requirements: Git, Node 22, Java 21 or newer, and internet for first-time downloads. No Firebase credentials, Docker, or Bluesky account are needed. This creates a disposable checkout under `.prototype/crosshare`, pinned to upstream commit `6f84e27f007cff55413167483b65a5075f884497`. The scripts preserve the upstream source and license and copy its emulator configuration. They do not provision or deploy cloud resources.

```sh
node scripts/crosshare.mjs prepare
node scripts/crosshare.mjs install
node scripts/crosshare.mjs inspect
node scripts/crosshare.mjs run
```

Open http://127.0.0.1:3000. `install` uses pinned pnpm 10.30.3 through `npx`, avoiding a global installation. If Node 22 is not the current runtime, prefix each command with `npx --yes --package=node@22`, for example `npx --yes --package=node@22 node scripts/crosshare.mjs install`.

The run command checks the checkout commit and refuses a Firebase configuration differing from the emulator fixture. The inherited `emulate` script starts only local auth, Firestore, and storage with the `demo-crosshare` project. Its services bind to all interfaces by upstream default; use a trusted development network. Stop the foreground command with Ctrl-C when finished. Emulator changes reset to upstream fixture data on restart.

For the browser smoke check, keep that server running and use another terminal:

```sh
cd .prototype/crosshare/app
npx --yes --package=pnpm@10.30.3 pnpm exec playwright install chromium
cd ../../..
node scripts/crosshare-smoke.mjs
```

An existing Chromium binary can instead be supplied as `CROSSHARE_CHROMIUM_PATH`. The smoke script opens only a fixed loopback URL, starts the inherited fixture puzzle, reveals it, and asserts an assisted completion message. Its source-window/origin checks are for this local test, not an authentication mechanism.

## Observed evidence

On November 13, 2026 UTC:

- Frozen-lockfile installation added 1,894 packages; translation compilation succeeded. This is a substantial existing app, so budget onboarding time.
- The host's Java 16 could not start current Firebase emulators. Retrying with a temporary Temurin Java 21.0.13 runtime succeeded. No system Java setting was changed.
- Auth, Firestore, and storage emulators imported the upstream fixture data; Next.js 16.3.4 started successfully.
- The home page returned HTTP 200 and the fixture puzzle opened in headless Chromium.
- Clicking Begin Puzzle and Reveal Puzzle produced `{ "type": "complete", "elapsed": 0.126, "didCheat": true }`. This confirms the event shape in a running browser. It tests assisted completion, not an unassisted solve or the full social flow.

The browser check used an existing Chromium binary via `CROSSHARE_CHROMIUM_PATH`. The Playwright package's expected browser revision was not installed initially. The setup command above is the normal way to install its matching browser. The inherited homepage also logs absent date-specific daily minis and cache initialization against the small fixture dataset; those did not prevent opening the seeded puzzle. No inherited full regression suite, staging deployment, OAuth flow, or PDS write was verified in this spike.

## Integration boundaries

Source links refer to the exact pinned upstream revision:

- [`app/components/Puzzle.tsx`](https://github.com/crosshare-org/crosshare/blob/6f84e27f007cff55413167483b65a5075f884497/app/components/Puzzle.tsx#L622) sends a completion message with elapsed seconds and `didCheat`. The adjacent success-effects block performs Firebase persistence. Add a direct callback near this boundary in our fork instead of replacing the solver or relying on a public iframe's message as trusted input.
- [`app/reducers/puzzleUtils.ts`](https://github.com/crosshare-org/crosshare/blob/6f84e27f007cff55413167483b65a5075f884497/app/reducers/puzzleUtils.ts#L145) banks the timer when completion stops it. Check/reveal and autocheck mark `didCheat`. Exact hint counts would require more instrumentation; keep the coarse assistance flag.
- `app/reducers/puzzleReducer.ts` restores saved completion state and marks author previews successful. `Puzzle.tsx` can therefore emit completion on load. Capture first completion only after ruling out author previews and initially restored completed solves; repeated effects must not replace it.
- [`app/components/AuthContext.tsx`](https://github.com/crosshare-org/crosshare/blob/6f84e27f007cff55413167483b65a5075f884497/app/components/AuthContext.tsx) exposes a Firebase `User`, and the success path can sign in anonymously. Preserve that identity for existing play persistence rather than replacing all Firebase users with DIDs.
- [`app/pages/api/addpack.ts`](https://github.com/crosshare-org/crosshare/blob/6f84e27f007cff55413167483b65a5075f884497/app/pages/api/addpack.ts) demonstrates existing server-side Firebase ID token verification. OAuth integration should independently verify the Firebase token and AT OAuth session before binding them server-side. A posted DID or a completion event cannot establish this binding.

## Recommendation

Proceed with a pinned Crosshare derivative and a small completion callback plus separate AT adapter. The disposable checkout is a spike harness, not the production source layout. Issue #5 should import the reviewed source into the team repository with its license and provenance intact so changes are reviewable there. Do not copy the fixture puzzle into the release dataset without establishing content permission.

Issue #4 remains the next technical risk: prove OAuth callback/session handling and its Firebase binding with a real account. Decide session lifetime and account-switch behavior there before #6 implements the app flow. Result mapping and graph lookup can proceed against the separate executable prototypes in #2 and #3.
