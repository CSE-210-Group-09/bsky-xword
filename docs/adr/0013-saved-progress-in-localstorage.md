# 0013. Save progress in localStorage, one key per puzzle date

- Status: Proposed
- Date: 2026-11-23

## Context

[0008](0008-gameplay-rules.md) says progress is saved in browser storage, keyed by puzzle date, and restored on reload, but it does not say which storage. Issue #29 adds that a closed tab must not lose work, that stale dates are ignored or cleared, and that the app must still work when storage is unavailable. A finished puzzle must reload as finished, not as a new attempt.

What we save for a 5x5 mini is small: letters, revealed and checked-wrong marks, elapsed and penalty seconds, reveal and check counts, the completed flag and the final time.

Options considered:

| | `localStorage` | `sessionStorage` | IndexedDB |
| --- | --- | --- | --- |
| Survives a reload | Yes | Yes | Yes |
| Survives closing the tab | Yes | No: cleared when the page session ends ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage)) | Yes |
| API | Synchronous strings ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)) | Synchronous strings | Asynchronous, structured values ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)) |
| Space | About 5 MiB per origin ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)) | About 5 MiB per origin | Much larger |
| Unavailable storage | Access throws `SecurityError` when the user blocks storage; `setItem` throws `QuotaExceededError` when full ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Storage/setItem)) | Same | Requests fail with errors |

Measured on 2026-11-23 in headless Chromium (Playwright 1.56.1). The progress object was serialized with `JSON.stringify`, written and read back 1,000 times per storage, or 200 round trips for IndexedDB. There were three runs:

| Measure | Result |
| --- | --- |
| Saved size, 5x5 / 15x15 | 609 / 3,869 bytes |
| `localStorage` write, 5x5 / 15x15 | 10–12 / 19–23 µs |
| `localStorage` read and parse, 5x5 / 15x15 | 3 / 8 µs |
| `sessionStorage` write / read, 15x15 | 31–44 / 8 µs |
| IndexedDB put / get, either size | 0.3 / 0.1–0.2 ms, each an async callback |
| IndexedDB open and first read, as on page load | 0.5–0.6 ms, async |
| Value after a reload | both storages kept it |
| Value in a new tab after closing the first | `localStorage` kept it; `sessionStorage` was empty |

## Decision

- Save progress in **`localStorage`** under `bsky-xword:progress:<puzzle date>`, as JSON with a `version: 1` field.
- Read it **synchronously before the first render**, with lazy `useState` initializers, so the grid and timer start from the saved state. Save again whenever the saved fields change, including on each timer tick.
- **Validate** before restoring: the version and date must match, and the grids must match the puzzle size with the right types. Anything else is ignored as if nothing was saved.
- On load, **remove progress keys for other dates**. Other keys are left alone.
- **Every storage access is in `try`/`catch`.** If storage is blocked or full, the game runs as before, just without saving.
- A saved **completed** puzzle reloads with the timer stopped, the final time frozen, and the grid locked. The leaderboard stays available. A completed grid also ignores typing before a reload, which matches the one-attempt rule in [0008](0008-gameplay-rules.md).

Why not the others:
- `sessionStorage` fails the closed-tab requirement; the measurement above shows it.
- IndexedDB is fast enough, but it is asynchronous. The app would need a loading state, or it would render an empty grid at 0:00 and start the timer before the saved state arrived. We have no use for its extra space or structured values at 0.6 KB.

## Consequences

- One synchronous write per keystroke and per second costs about 10–20 µs, far below a 16 ms frame.
- Progress stays in one browser. Switching devices mid-solve starts over, as [0008](0008-gameplay-rules.md) already accepts. A finished result still follows the user through the repo record ([0005](0005-results-as-atproto-records.md)).
- Clearing site data, or a browser evicting it, restarts the puzzle. That is acceptable under [0006](0006-trust-client-reported-results.md).
- Changing the saved shape means bumping `version`. Old saves are then ignored rather than migrated, which loses at most one day's progress.

## Open questions

- The key has no user in it, because login (#32) is not on main yet. Once it lands, should the key include the player's DID, so two accounts in one browser don't share progress?
