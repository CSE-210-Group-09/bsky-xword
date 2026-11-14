import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchFollows, friendLeaderboard } from './friends.mjs';
import { viewerDid, friendDid, otherDid, revision, row, request } from './fixture.mjs';
const response = (body) => ({ok: true, json: async () => body});
test('fetches every page, passes opaque cursor, and deduplicates by DID', async () => {
  const calls = [];
  const result = await fetchFollows('bsky.app', {fetchImpl: async (url) => {
    calls.push(url);
    return response(calls.length === 1 ? {follows: [{did: friendDid}], cursor: 'opaque+/?'} : {follows: [{did: friendDid}, {did: otherDid}]});
  }});
  assert.deepEqual(result, {dids: [friendDid, otherDid], pages: 2});
  assert.equal(calls[1].searchParams.get('cursor'), 'opaque+/?');
  assert.equal(calls[0].searchParams.get('limit'), '100');
  assert.equal(calls[0].origin, 'https://public.api.bsky.app');
});
test('errors rather than returning a misleading partial graph', async () => {
  let calls = 0;
  await assert.rejects(fetchFollows('bsky.app', {fetchImpl: async () => ++calls === 1 ? response({follows: [{did: friendDid}], cursor: 'next'}) : {ok: false, status: 429}}), /HTTP 429/);
  await assert.rejects(fetchFollows('bsky.app', {fetchImpl: async () => response({follows: [], cursor: 'same'})}), /Repeated/);
  await assert.rejects(fetchFollows('bsky.app', {maxPages: 1, fetchImpl: async () => response({follows: [], cursor: 'next'})}), /exceeded/);
  await assert.rejects(fetchFollows('bsky.app', {fetchImpl: async () => response({follows: [{}]})}), /Malformed/);
  await assert.rejects(fetchFollows('https://untrusted.example'), /Invalid actor/);
});
test('includes self and follows, excludes unrelated and wrong revisions', () => {
  const result = friendLeaderboard({...request, results: [...request.results, row(friendDid, 1, {puzzleRevision: 'sha256:' + 'b'.repeat(64)}), row(friendDid, 1, {puzzleId: 'other'})]});
  assert.deepEqual(result.unassisted.map((r) => r.author), [friendDid, viewerDid]);
  assert.deepEqual(result.unassisted.map((r) => r.rank), [1,2]);
});
test('shared durations use competition ranks and do not mutate input', () => {
  const input = {...request, followedDids: [friendDid, otherDid], results: [row(viewerDid, 100), row(friendDid, 100), row(otherDid, 200)]};
  const before = structuredClone(input);
  assert.deepEqual(friendLeaderboard(input).unassisted.map((r) => r.rank), [1,1,3]);
  assert.deepEqual(input, before);
});
test('assisted first completion cannot be replaced by faster unassisted replay', () => {
  const results = [row(friendDid, 1000, {assisted: true}), row(friendDid, 100, {completedAt: '2026-11-13T00:00:00.000Z', uri: `at://${friendDid}/org.example.bskyxword.result/replay`})];
  const result = friendLeaderboard({...request, results});
  assert.equal(result.unassisted.length, 0);
  assert.equal(result.assisted[0].durationMs, 1000);
  assert.equal('rank' in result.assisted[0], false);
});
test('missing results and malformed scores never become zero-time entries', () => {
  const result = friendLeaderboard({...request, results: [row(friendDid, -1), row(viewerDid, 1.5), row(friendDid, 1, {uri: `at://${otherDid}/org.example.bskyxword.result/spoof`}), row(friendDid, 1, {completedAt: 'invalid'})]});
  assert.deepEqual(result, {unassisted: [], assisted: []});
  assert.deepEqual(friendLeaderboard({...request, followedDids: [], results: []}), {unassisted: [], assisted: []});
});
test('rejects absent follow graph instead of silently showing a self-only ranking', () => {
  assert.throws(() => friendLeaderboard({...request, followedDids: undefined}));
});
