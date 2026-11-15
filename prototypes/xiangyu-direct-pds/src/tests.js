// Dependency-free browser tests. Open tests.html through serve.py.
import { PUZZLE, buildEntries, puzzleRevision } from './puzzle.js';
import { RESULT_TYPE, isValidResult, makeResult, resultRecordKey } from './result.js';
import { friendLeaderboard } from './ranking.js';
import { composeUrl, formatDuration, shareText } from './share.js';
import { DEMO_PEOPLE, DEMO_VIEWER, demoRows } from './demo-data.js';
import { estimateRequests, fetchResult, newMetrics } from './atproto.js';

const tests = [];
const test = (name, fn) => tests.push({ name, fn });
const assert = (cond, msg) => { if (!cond) throw new Error(msg || 'assertion failed'); };
const eq = (a, b, msg) => assert(JSON.stringify(a) === JSON.stringify(b), `${msg || 'not equal'}: ${JSON.stringify(a)} !== ${JSON.stringify(b)}`);

const REV = await puzzleRevision(PUZZLE);
const RKEY = await resultRecordKey(PUZZLE.id, REV);

test('grid entries match clue numbers and real words', () => {
  const { entries } = buildEntries(PUZZLE);
  eq(entries.map((e) => `${e.number}${e.dir[0].toUpperCase()}:${e.answer}`),
    ['1A:SPA', '4A:STOP', '5A:WHOSE', '6A:HINT', '7A:ONE', '1D:STONE', '2D:POST', '3D:APE', '4D:SHIN', '5D:WHO']);
  assert(entries.every((e) => e.clue.length > 0), 'every entry has a clue');
});

test('every white cell belongs to an across and a down entry', () => {
  const { entries } = buildEntries(PUZZLE);
  PUZZLE.cells.forEach((cell, i) => {
    if (cell === null) return;
    assert(entries.some((e) => e.dir === 'across' && e.cells.includes(i)), `cell ${i} across`);
    assert(entries.some((e) => e.dir === 'down' && e.cells.includes(i)), `cell ${i} down`);
  });
});

test('puzzle revision is sha256 and changes when a clue changes', async () => {
  assert(/^sha256:[a-f0-9]{64}$/.test(REV), REV);
  eq(await puzzleRevision(PUZZLE), REV, 'stable');
  const edited = { ...PUZZLE, across: PUZZLE.across.map((c) => (c.number === 1 ? { ...c, text: 'Hot spring resort' } : c)) };
  assert(await puzzleRevision(edited) !== REV, 'clue edit must create a new revision');
});

test('record key is deterministic per puzzle revision', async () => {
  assert(/^[a-f0-9]{64}$/.test(RKEY), RKEY);
  eq(await resultRecordKey(PUZZLE.id, REV), RKEY);
  assert(await resultRecordKey('other', REV) !== RKEY);
});

test('makeResult builds a valid record and rejects bad input', () => {
  const r = makeResult({ puzzleId: PUZZLE.id, puzzleRevision: REV, durationMs: 41299.6, assisted: false, completedAt: '2026-11-15T16:00:00.000Z' });
  eq(r.durationMs, 41300, 'rounded to integer ms');
  eq(r.$type, RESULT_TYPE);
  assert(isValidResult(r));
  let threw = false;
  try { makeResult({ puzzleId: PUZZLE.id, puzzleRevision: REV, durationMs: -1, assisted: false, completedAt: '2026-11-15T16:00:00.000Z' }); } catch { threw = true; }
  assert(threw, 'negative duration rejected');
  assert(!isValidResult({ ...r, extra: 1 }), 'unknown fields rejected');
});

test('leaderboard: ties share rank, gave-up separate, unfollowed excluded, first completion wins', () => {
  const board = friendLeaderboard({
    viewerDid: DEMO_VIEWER.did,
    followedDids: DEMO_PEOPLE.filter((p) => p.followed).map((p) => p.did),
    puzzleId: PUZZLE.id, puzzleRevision: REV, results: demoRows(PUZZLE.id, REV, RKEY),
  });
  eq(board.unassisted.map((r) => [r.author.split('-')[1], r.rank, r.durationMs]),
    [['alice', 1, 41300], ['bob', 2, 58000], ['carol', 2, 58000]]);
  eq(board.assisted.map((r) => r.author), ['did:plc:demo-dan']);
  assert(!board.unassisted.some((r) => r.author.includes('mallory')), 'mallory excluded');
});

test('leaderboard ignores results for a different revision', () => {
  const rows = demoRows(PUZZLE.id, 'sha256:' + '0'.repeat(64), RKEY);
  const board = friendLeaderboard({ viewerDid: DEMO_VIEWER.did, followedDids: DEMO_PEOPLE.map((p) => p.did), puzzleId: PUZZLE.id, puzzleRevision: REV, results: rows });
  eq(board.unassisted.length + board.assisted.length, 0);
});

test('share text is spoiler-free and the compose link encodes it', () => {
  const { entries } = buildEntries(PUZZLE);
  for (const assisted of [false, true]) {
    const text = shareText({ puzzle: PUZZLE, result: { durationMs: 83_000, assisted }, url: 'https://example.test/' });
    for (const e of entries) assert(!new RegExp(`\\b${e.answer}\\b`, 'i').test(text), `answer ${e.answer} leaked`);
    assert(text.includes('1:23'), 'time present');
    assert(composeUrl(text).startsWith('https://bsky.app/intent/compose?text='), 'compose intent');
    eq(decodeURIComponent(composeUrl(text).split('text=')[1]), text, 'round trip');
  }
});

test('formatDuration', () => {
  eq([0, 999, 1000, 59_999, 60_000, 605_000].map(formatDuration), ['0:00', '0:00', '0:01', '0:59', '1:00', '10:05']);
});

test('request estimate grows ~2 per follow', () => {
  eq(estimateRequests(0), 4);
  eq(estimateRequests(150), 1 + 2 + 302);
  eq(estimateRequests(500), 1 + 5 + 1002);
});

// fetchResult against a stubbed fetch: found / missing / wrong author.
test('fetchResult validates provenance and handles missing records', async () => {
  const did = 'did:plc:abc';
  const value = makeResult({ puzzleId: PUZZLE.id, puzzleRevision: REV, durationMs: 1000, assisted: false, completedAt: '2026-11-15T16:00:00.000Z' });
  const realFetch = globalThis.fetch;
  const reply = (status, body) => async () => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
  try {
    globalThis.fetch = reply(200, { uri: `at://${did}/${RESULT_TYPE}/${RKEY}`, value });
    const found = await fetchResult({ did, pds: 'https://pds.example', rkey: RKEY, puzzleId: PUZZLE.id, puzzleRevision: REV }, newMetrics());
    eq(found.status, 'found');
    eq(found.row.author, did);

    globalThis.fetch = reply(400, { error: 'RecordNotFound' });
    eq((await fetchResult({ did, pds: 'https://pds.example', rkey: RKEY, puzzleId: PUZZLE.id, puzzleRevision: REV }, newMetrics())).status, 'none');

    globalThis.fetch = reply(200, { uri: `at://did:plc:someoneelse/${RESULT_TYPE}/${RKEY}`, value });
    eq((await fetchResult({ did, pds: 'https://pds.example', rkey: RKEY, puzzleId: PUZZLE.id, puzzleRevision: REV }, newMetrics())).status, 'invalid');
  } finally {
    globalThis.fetch = realFetch;
  }
});

const out = document.getElementById('results');
let passed = 0;
for (const { name, fn } of tests) {
  const li = document.createElement('li');
  try {
    await fn();
    passed++;
    li.textContent = `✅ ${name}`;
  } catch (error) {
    li.textContent = `❌ ${name}: ${error.message}`;
    li.className = 'fail';
  }
  out.append(li);
}
const summary = document.getElementById('summary');
summary.textContent = `${passed}/${tests.length} passed`;
summary.className = passed === tests.length ? 'ok' : 'fail';
document.title = `${passed}/${tests.length} passed`;
