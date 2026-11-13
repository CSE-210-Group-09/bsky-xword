# Completion and result contract spike

Issue: [#2](https://github.com/CSE-210-Group-09/bsky-xword/issues/2).

## Run

No package installation or credentials are required. Use Node 22:

```sh
node --test prototypes/result-contract/result.test.mjs
node prototypes/result-contract/demo.mjs
```

Nine tests passed locally on Node 22 and Node 25. The demo captures a 42.123-second assisted completion, simulates a retry after a failed publication, and retains the original payload even when the next event claims a faster solve. CI repeats the tests and demo on Node 22. A separate local check with the official `@atproto/lexicon` 0.7.19 validator accepted the draft schema and a sample result record; that SDK check is not part of the dependency-free CI suite.

## Mapping from Crosshare

The pinned [Puzzle.tsx](https://github.com/crosshare-org/crosshare/blob/6f84e27f007cff55413167483b65a5075f884497/app/components/Puzzle.tsx#L622) emits `{ type: 'complete', elapsed: state.bankedSeconds, didCheat: state.didCheat }`. `checkComplete` in `app/reducers/puzzleUtils.ts` banks the elapsed seconds and stops the active timer at success. `cheat` marks check/reveal as assisted; autocheck calls that path too. The prototype rounds seconds to integer milliseconds and preserves the coarse assistance flag.

The inherited completion message can repeat and can fire for a restored solved puzzle or author preview. The integration must supply `isAuthor` and `loadedCompleted` from the mounted solver state and capture only a new completion. This adapter fails closed when either guard is unknown. Do not derive those guards or identity from message data. Prefer a direct completion callback in the fork. An iframe listener would additionally need both origin and source-window checks; neither establishes an authenticated result author.

## Contract decisions to review

- `puzzleId` identifies content independently of its date or current URL.
- `puzzleRevision` hashes a versioned canonical array of dimensions, cells, and numerically ordered across/down clues. The prototype supports basic A–Z cells and blocks only. Converting Crosshare content into this shape belongs to #7. It validates shape, not crossword construction quality.
- The result contains duration, assistance, and completion timestamp. It contains no answers or author field. Author DID must come from the verified OAuth session and repository in #6 and #9.
- A SHA-256 record key derived from puzzle ID and revision addresses one first-completion record in each author's repository. Production must use create-only publication or compare an existing record and keep it. A stable key by itself does not prevent overwrites.
- The local validator rejects unknown fields and requires canonical UTC timestamps. `lexicon.json` is a draft record schema, not a deployed Lexicon. `org.example.bskyxword.result` is a reserved example namespace and must change before live use.

The current capture is immutable in memory. Persistence across reloads, explicit publication UX, server identity binding, PDS writes/read-back, and index validation remain in #8, #6, #9, and #10. No live AT result was published by this spike. Client completion data and timestamps remain self-reported.
