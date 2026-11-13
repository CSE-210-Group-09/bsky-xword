import { captureFirstCompletion, puzzleRevision, resultRecordKey } from './result.mjs';
const revision = puzzleRevision({width: 1, height: 1, cells: ['A'], across: [{number: 1, text: 'First letter'}], down: []});
const context = {puzzleId: 'urn:bsky-xword:demo', puzzleRevision: revision, completedAt: new Date().toISOString(), isAuthor: false, loadedCompleted: false};
const first = captureFirstCompletion(null, {type: 'complete', elapsed: 42.123, didCheat: true}, context);
try {
  await Promise.reject(new Error('Simulated publication failure'));
} catch (error) {
  console.error(error.message + '; retrying the retained completion');
}
const retry = captureFirstCompletion(first, {type: 'complete', elapsed: 1, didCheat: false}, context);
console.log(JSON.stringify({record: retry, recordKey: resultRecordKey(retry), retainedFirstCompletion: first === retry}, null, 2));
