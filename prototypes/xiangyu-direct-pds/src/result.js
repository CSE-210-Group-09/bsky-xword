// Result record shape and record key, kept identical to prototype/result-contract
// (lexicon.json + result.mjs) so results written by either prototype are readable by both.
import { sha256Hex } from './puzzle.js';

// Reserved example namespace from the result-contract draft. Replace before any live write.
export const RESULT_TYPE = 'org.example.bskyxword.result';

const FIELDS = ['$type', 'puzzleId', 'puzzleRevision', 'durationMs', 'assisted', 'completedAt'];

export function isValidResult(record) {
  return record !== null && typeof record === 'object' && !Array.isArray(record) &&
    Object.keys(record).every((key) => FIELDS.includes(key)) &&
    record.$type === RESULT_TYPE &&
    typeof record.puzzleId === 'string' && record.puzzleId.trim().length > 0 && record.puzzleId.length <= 512 &&
    typeof record.puzzleRevision === 'string' && /^sha256:[a-f0-9]{64}$/.test(record.puzzleRevision) &&
    Number.isSafeInteger(record.durationMs) && record.durationMs >= 0 &&
    typeof record.assisted === 'boolean' &&
    typeof record.completedAt === 'string' && Number.isFinite(Date.parse(record.completedAt)) &&
    new Date(record.completedAt).toISOString() === record.completedAt;
}

/** Build the record for a first completion. Giving up counts as `assisted: true`,
 * which matches Crosshare's `didCheat` flag used by the result contract. */
export function makeResult({ puzzleId, puzzleRevision, durationMs, assisted, completedAt }) {
  const record = {
    $type: RESULT_TYPE,
    puzzleId,
    puzzleRevision,
    durationMs: Math.round(durationMs),
    assisted,
    completedAt,
  };
  if (!isValidResult(record)) throw new TypeError('Invalid result record');
  return Object.freeze(record);
}

/** One record per author per puzzle revision (same formula as result.mjs's resultRecordKey).
 * A deterministic key is what makes the direct-PDS approach cheap: one getRecord per friend. */
export function resultRecordKey(puzzleId, puzzleRevision) {
  return sha256Hex(JSON.stringify(['bsky-xword-result-v1', puzzleId, puzzleRevision]));
}
