import { test } from 'node:test';
import assert from 'node:assert/strict';
import { captureFirstCompletion, puzzleRevision, resultRecordKey, validateResult } from './result.mjs';
const puzzle = { width: 2, height: 2, cells: ['A','T','N','O'], across: [{number: 1, text: 'Located by'}, {number: 3, text: 'Opposite of yes'}], down: [{number: 1, text: 'Indefinite article'}, {number: 2, text: 'Toward'}] };
const context = { puzzleId: 'urn:bsky-xword:fixture:one', puzzleRevision: puzzleRevision(puzzle), completedAt: '2026-11-12T20:00:00.000Z', isAuthor: false, loadedCompleted: false };
const event = { type: 'complete', elapsed: 61.2345, didCheat: false };
test('maps the actual Crosshare event shape and fractional seconds', () => {
  const record = captureFirstCompletion(null, event, context);
  assert.equal(record.durationMs, 61235);
  assert.equal(record.assisted, false);
  assert.equal(Object.isFrozen(record), true);
  assert.equal('author' in record, false);
  assert.equal('elapsed' in record, false);
});
test('check/reveal and autocheck are represented by the inherited assisted flag', () => {
  assert.equal(captureFirstCompletion(null, {...event, didCheat: true}, context).assisted, true);
});
test('failed publication retries retain exact payload and first time', async () => {
  const captured = captureFirstCompletion(null, event, context);
  await assert.rejects(async () => { throw new Error('Simulated PDS unavailable'); }, /PDS unavailable/);
  assert.equal(captureFirstCompletion(captured, {...event, elapsed: 1}, {...context, completedAt: '2026-11-13T00:00:00.000Z'}), captured);
});
test('author preview and restored completed solves are not new completion captures', () => {
  assert.equal(captureFirstCompletion(null, event, {...context, isAuthor: true}), null);
  assert.equal(captureFirstCompletion(null, event, {...context, loadedCompleted: true}), null);
  assert.equal(captureFirstCompletion(null, event, {...context, isAuthor: undefined}), null);
});
test('incomplete and malformed events cannot produce scores', () => {
  for (const bad of [{...event, type: 'progress'}, {...event, elapsed: -1}, {...event, elapsed: Infinity}, {...event, elapsed: NaN}, {...event, elapsed: '1'}, {...event, elapsed: Number.MAX_SAFE_INTEGER}, {...event, didCheat: undefined}]) {
    assert.throws(() => captureFirstCompletion(null, bad, context));
  }
});
test('clue ordering and nonplayable metadata do not change the revision', () => {
  assert.equal(puzzleRevision({...puzzle, title: 'Different title', across: [...puzzle.across].reverse()}), context.puzzleRevision);
});
test('grid or clue changes create distinct revisions and record keys', () => {
  const record = captureFirstCompletion(null, event, context);
  for (const changed of [{...puzzle, cells: ['A','T','N','A']}, {...puzzle, across: [{number: 1, text: 'Changed'}, puzzle.across[1]]}]) {
    const revision = puzzleRevision(changed);
    assert.notEqual(revision, context.puzzleRevision);
    assert.notEqual(resultRecordKey({...record, puzzleRevision: revision}), resultRecordKey(record));
  }
  assert.throws(() => captureFirstCompletion(record, event, {...context, puzzleId: 'different'}));
});
test('retry and duration changes address the same per-revision repository key', () => {
  const record = captureFirstCompletion(null, event, context);
  assert.equal(resultRecordKey(record), resultRecordKey({...record, durationMs: 1}));
  assert.match(resultRecordKey(record), /^[a-f0-9]{64}$/);
});
test('rejects invalid identity, timestamps, extra fields and incomplete puzzles', () => {
  const record = captureFirstCompletion(null, event, context);
  for (const patch of [{author: 'did:plc:forged'}, {puzzleId: ''}, {puzzleRevision: 'old'}, {completedAt: 'bad'}, {completedAt: '2026-02-30T00:00:00.000Z'}, {durationMs: 1.5}]) {
    assert.throws(() => validateResult({...record, ...patch}));
  }
  assert.throws(() => puzzleRevision({...puzzle, cells: ['A']}));
  assert.throws(() => puzzleRevision({...puzzle, across: [puzzle.across[0], puzzle.across[0]]}));
});
