# Result record contract

`io.github.cse-210-group-09.xword.result` is a public first-completion record in the player's repository. Its record key must equal `puzzleDate`, a valid `YYYY-MM-DD` calendar date for the daily puzzle in Pacific time. `timeSeconds` includes penalties. Counts and time are non-negative safe integers.

The [Lexicon](../lexicons/io/github/cse-210-group-09/xword/result.json) uses `key: "any"` because Lexicon cannot express a calendar-date key pattern. Its date string has length 10; the shared runtime validator adds calendar validation. Publishing and indexing code must check that the URI record key equals `puzzleDate`, that the puzzle exists and its ID matches, and that the record was fetched from the DID's repository. The validator alone does not verify authorship, honest timing, or prevent replacement of an existing record.

Client and server can import `ResultRecord`, `RESULT_COLLECTION`, `validateResultRecord`, and `parseResultRecord` from `lib/atproto/result.ts`. Validation accepts unknown fields for future additions and preserves the original datetime string. `validateResultRecord` returns `{ success: true, value }` or `{ success: false, errors }`. `parseResultRecord` returns the record or throws `TypeError`.

```ts
import { RESULT_COLLECTION, parseResultRecord } from '../lib/atproto/result';

const record = parseResultRecord({
  $type: RESULT_COLLECTION,
  puzzleId: 'mini-2026-11-18',
  puzzleDate: '2026-11-18',
  timeSeconds: 83,
  revealCount: 1,
  checkCount: 0,
  completedAt: new Date().toISOString(),
});
// createRecord uses collection: RESULT_COLLECTION, rkey: record.puzzleDate.
```

The schema follows the [AT Protocol Lexicon specification](https://atproto.com/specs/lexicon), including the mandatory record `$type` and timezone-qualified datetime format. The app applies stricter calendar checks to reject rolled-over dates.
