import { createHash } from 'node:crypto';

// Reserved example namespace. Replace with a team-controlled NSID before any live write.
export const RESULT_TYPE = 'org.example.bskyxword.result';
const hash = (value) => createHash('sha256').update(value).digest('hex');
const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const nonempty = (value) => typeof value === 'string' && value.trim().length > 0;

/** Hash only playable content, with an explicit serialization version. No title/date/profile. */
export function puzzleRevision(puzzle) {
  if (!object(puzzle) || !Number.isSafeInteger(puzzle.width) || puzzle.width < 1 ||
      !Number.isSafeInteger(puzzle.height) || puzzle.height < 1 ||
      !Array.isArray(puzzle.cells) || puzzle.cells.length !== puzzle.width * puzzle.height ||
      !puzzle.cells.every((cell) => cell === null || (typeof cell === 'string' && /^[A-Z]$/.test(cell)))) {
    throw new TypeError('Expected rectangular A–Z cells, with null for blocks');
  }
  function clues(entries) {
    if (!Array.isArray(entries) || !entries.every((entry) => object(entry) &&
        Number.isSafeInteger(entry.number) && entry.number > 0 && nonempty(entry.text)) ||
        new Set(entries.map((entry) => entry.number)).size !== entries.length) {
      throw new TypeError('Expected unique positive clue numbers and nonempty text');
    }
    return entries.map(({ number, text }) => [number, text]).sort((a, b) => a[0] - b[0]);
  }
  return 'sha256:' + hash(JSON.stringify([
    'bsky-xword-puzzle-v1', puzzle.width, puzzle.height, puzzle.cells,
    clues(puzzle.across), clues(puzzle.down),
  ]));
}

export function validateResult(record) {
  const fields = ['$type', 'puzzleId', 'puzzleRevision', 'durationMs', 'assisted', 'completedAt'];
  if (!object(record) || Object.keys(record).some((key) => !fields.includes(key)) ||
      record.$type !== RESULT_TYPE || !nonempty(record.puzzleId) || record.puzzleId.length > 512 ||
      !/^sha256:[a-f0-9]{64}$/.test(record.puzzleRevision) ||
      !Number.isSafeInteger(record.durationMs) || record.durationMs < 0 ||
      typeof record.assisted !== 'boolean' || typeof record.completedAt !== 'string' ||
      !Number.isFinite(Date.parse(record.completedAt)) ||
      new Date(record.completedAt).toISOString() !== record.completedAt) {
    throw new TypeError('Invalid result record');
  }
  return record;
}

/** Capture only a NEW solver completion, not author preview or a loaded old solve.
 * Context must come from the mounted puzzle/session, not postMessage data.
 * Retain the returned value for retries; this pure prototype does not persist it.
 */
export function captureFirstCompletion(previous, event, context) {
  if (previous != null) {
    validateResult(previous);
    if (previous.puzzleId !== context.puzzleId || previous.puzzleRevision !== context.puzzleRevision) {
      throw new Error('Existing completion belongs to a different puzzle revision');
    }
    return previous;
  }
  if (context.isAuthor !== false || context.loadedCompleted !== false) return null;
  if (!object(event) || event.type !== 'complete' || typeof event.elapsed !== 'number' ||
      !Number.isFinite(event.elapsed) || event.elapsed < 0 || typeof event.didCheat !== 'boolean') {
    throw new TypeError('Invalid Crosshare completion event');
  }
  const record = {
    $type: RESULT_TYPE,
    puzzleId: context.puzzleId,
    puzzleRevision: context.puzzleRevision,
    durationMs: Math.round(event.elapsed * 1000),
    assisted: event.didCheat,
    completedAt: context.completedAt,
  };
  return Object.freeze(validateResult(record));
}

/** Same key for every attempt in one author's repository for this puzzle revision.
 * Live publication must be create-only, or check the existing record without overwriting.
 */
export function resultRecordKey(record) {
  validateResult(record);
  return hash(JSON.stringify(['bsky-xword-result-v1', record.puzzleId, record.puzzleRevision]));
}
