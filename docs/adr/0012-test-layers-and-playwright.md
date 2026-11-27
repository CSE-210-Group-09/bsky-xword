# 0012. Three test layers, with Playwright for browser tests

- Status: Proposed
- Date: 2026-11-23

## Context

The team agreed to work test first at three levels: unit tests for each issue, integration tests for each story, and end-to-end tests for the whole daily flow. Vitest with jsdom (#21) covers the first. It cannot cover the other two, because they need a real browser:

- Saved progress (ADR 0008) must survive a page reload, which jsdom cannot do.
- The timer pauses on `visibilitychange`, and jsdom only simulates it.
- Sharing (ADR 0010) opens the Bluesky composer in a new tab, and login (ADR 0011) redirects to another origin.

Options considered:

| | Playwright | Cypress | Vitest + jsdom only |
| --- | --- | --- | --- |
| Real reload, storage and visibility | Yes | Yes | No |
| New tabs and popups | Yes: a popup is a second `page` ([docs](https://playwright.dev/docs/pages)) | No; its docs list multi-tab support as a permanent trade-off ([docs](https://docs.cypress.io/app/references/trade-offs)) | No |
| Leaving the app's origin (OAuth) | Yes | Only inside `cy.origin()` blocks ([docs](https://docs.cypress.io/app/references/trade-offs)) | No |
| Starting our dev server for the run | Built in (`webServer`, [docs](https://playwright.dev/docs/test-webserver)) | Needs a separate tool to start and wait | Not needed |
| Browsers | Chromium, Firefox, WebKit | Chromium-family, Firefox, experimental WebKit | None |
| Team experience | Used for every warm-up user story | None | Already in use |

Measured on 2026-11-23, adding Playwright to this repo:

| Cost | Result |
| --- | --- |
| `npm install -D @playwright/test@1.56.1` | 4 packages, about 12 MB, 3.4 s |
| Headless Chromium download (`--only-shell`) | 323 MB unpacked, 5.5 s on the campus network |
| The story #61 integration tests plus the end-to-end test (6 tests, one worker per CPU) | 9.5–12.7 s, including starting `npm run dev` |

## Decision

- **Unit tests** stay in Vitest (`*.test.ts(x)`): pure functions and hooks, written on each task branch before the code.
- **Integration tests** are Playwright specs in `tests/integration/`, one file per story, written first on the story branch.
- **End-to-end tests** are Playwright specs in `tests/e2e/`, covering the whole daily flow from the README's MVP list. They are written ahead of the stories they need.
- A test written before its feature is marked `test.fail(...)` with the issue number. CI stays green, the test still runs, and when the feature lands Playwright reports the test as unexpectedly passing, so the PR deletes the marker.
- Playwright runs Chromium only, through `npm run dev` (`webServer`). CI installs the headless shell with `npx playwright install --with-deps --only-shell chromium`, then runs `npm run test:integration` and `npm run test:e2e`.
- CI runs on `ubuntu-24.04` rather than `ubuntu-latest` (#64). `ubuntu-latest` moved to 26.04, which Playwright 1.56.1 cannot install browsers for. Its dependency tables first list `ubuntu26.04-x64` in 1.61; we checked `playwright-core` 1.56.1, 1.59.1, 1.61.1 and 1.65.1.
- Vitest ignores `tests/integration` and `tests/e2e`.

## Consequences

- Reload, storage, visibility, popups and cross-origin redirects can all be tested the way players meet them.
- CI takes longer. In the first runs (#64, #62) the whole job took 3m17s–3m26s, against about 20 s before. Of that, 2m30s was `--with-deps` installing system packages, and the browser tests themselves took 20.5 s (integration) and 7.7 s (end-to-end). Caching the browser and packages, or using Playwright's container image, could cut the install if CI time starts to matter.
- The runner pin goes stale when GitHub retires the 24.04 image. Upgrading Playwright to 1.61 or later lets CI go back to `ubuntu-latest`. On 1.65.0 locally the browser tests behave the same, and the headless shell is 167 MB instead of 323 MB.
- Chromium only means Firefox and Safari bugs are not caught. Adding `firefox` and `webkit` projects is a one-line change if a bug report calls for it.
- Tests that need Bluesky (login, publishing, the leaderboard) must stub its endpoints with `page.route`; the three-account check with real accounts (#45) stays manual.
- The `test.fail` markers must be removed when features land, or a fixed feature would hide behind a passing "expected failure". Playwright's "unexpectedly passed" report makes that visible.
