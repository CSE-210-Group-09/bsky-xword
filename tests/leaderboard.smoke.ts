import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { test } from 'node:test';
import { createAppView, withFollowCache, type AppView, type ProfileSummary } from '../lib/atproto/appview.js';
import { openResultsDatabase, type ResultsDatabase } from '../lib/db/index.js';
import { createApp } from '../server/app.js';
import type { LeaderboardResponse } from '../types/api.js';

const DATE = '2026-11-21';
const ME = 'did:plc:me';
const profile = (name: string): ProfileSummary => ({ did: `did:plc:${name}`, handle: `${name}.bsky.social` });

/**
 * A fake AppView speaking the real XRPC shapes, so tests exercise createAppView's
 * pagination and batching. `follows` maps a DID to everyone it follows.
 */
function mockAppView(follows: Record<string, ProfileSummary[]>, { pageSize = 100, failWith = 0 } = {}) {
  const calls: string[] = [];
  const profiles = new Map(Object.values(follows).flat().map(p => [p.did, p]));
  profiles.set(ME, { did: ME, handle: 'me.bsky.social', displayName: 'Me', avatar: 'https://cdn.example/me.jpg' });
  const fetchFn = (async (input: string | URL | Request) => {
    const url = new URL(String(input));
    calls.push(`${url.pathname.slice(6)}?${url.searchParams}`);
    if (failWith) return new Response('{}', { status: failWith });
    if (url.pathname === '/xrpc/app.bsky.graph.getFollows') {
      const all = follows[url.searchParams.get('actor')!] ?? [];
      const start = Number(url.searchParams.get('cursor') ?? 0);
      const next = start + pageSize;
      return Response.json({ follows: all.slice(start, next), ...(next < all.length ? { cursor: String(next) } : {}) });
    }
    if (url.pathname === '/xrpc/app.bsky.actor.getProfiles') {
      const actors = url.searchParams.getAll('actors');
      assert(actors.length <= 25, 'getProfiles allows at most 25 actors');
      return Response.json({ profiles: actors.flatMap(did => profiles.get(did) ?? []) });
    }
    return new Response('{}', { status: 404 });
  }) as typeof fetch;
  return { appView: createAppView({ baseUrl: 'https://appview.test', fetch: fetchFn }), calls };
}

function addResult(db: ResultsDatabase, did: string, timeSeconds: number, date = DATE) {
  db.upsertResult({
    did, puzzleDate: date, puzzleId: 'mini-test-01', timeSeconds, revealCount: 0, checkCount: 0,
    completedAt: `${date}T20:00:00.000Z`, uri: `at://${did}/io.github.cse-210-group-09.xword.result/${date}`, cid: 'bafy',
  });
}

async function getLeaderboard(appView: AppView, db: ResultsDatabase, query: string) {
  const server = createApp({ database: db, appView }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const response = await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/api/leaderboard?${query}`);
    return { status: response.status, body: await response.json() };
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => (error ? reject(error) : resolve())));
  }
}

test('ranks the user and followed solvers, excluding unrelated accounts and non-solvers', async () => {
  const db = openResultsDatabase(':memory:');
  const [alice, bob, carol, dave] = ['alice', 'bob', 'carol', 'dave'].map(profile);
  const { appView } = mockAppView({ [ME]: [alice, bob, carol] });
  addResult(db, ME, 95);
  addResult(db, alice.did, 80);
  addResult(db, bob.did, 95);      // ties with me
  addResult(db, dave.did, 10);     // fastest, but not followed
  addResult(db, carol.did, 50, '2026-11-20'); // solved a different day
  const { status, body } = await getLeaderboard(appView, db, `did=${ME}&date=${DATE}`);
  assert.equal(status, 200);
  assert.deepEqual(body as LeaderboardResponse, {
    date: DATE,
    entries: [
      { did: alice.did, handle: 'alice.bsky.social', timeSeconds: 80, rank: 1, isCurrentUser: false },
      { did: bob.did, handle: 'bob.bsky.social', timeSeconds: 95, rank: 2, isCurrentUser: false },
      { did: ME, handle: 'me.bsky.social', displayName: 'Me', avatar: 'https://cdn.example/me.jpg', timeSeconds: 95, rank: 2, isCurrentUser: true },
    ],
  });
  db.close();
});

test('three-way ties share a rank and the next rank skips ahead', async () => {
  const db = openResultsDatabase(':memory:');
  const friends = ['a', 'b', 'c', 'd'].map(profile);
  const { appView } = mockAppView({ [ME]: friends });
  [60, 60, 60, 70].forEach((time, i) => addResult(db, friends[i].did, time));
  const { body } = await getLeaderboard(appView, db, `did=${ME}&date=${DATE}`);
  assert.deepEqual(body.entries.map((e: { rank: number }) => e.rank), [1, 1, 1, 4]);
  db.close();
});

test('follows every getFollows page and handles about 1,000 follows quickly', async () => {
  const db = openResultsDatabase(':memory:');
  const friends = Array.from({ length: 1_050 }, (_, i) => profile(`f${i}`));
  const { appView, calls } = mockAppView({ [ME]: friends });
  addResult(db, friends[0].did, 30);
  addResult(db, friends[1_049].did, 20); // only on the last page
  const started = performance.now();
  const { body } = await getLeaderboard(appView, db, `did=${ME}&date=${DATE}`);
  const elapsed = performance.now() - started;
  assert.deepEqual(body.entries.map((e: { did: string }) => e.did), [friends[1_049].did, friends[0].did]);
  assert.equal(calls.filter(c => c.startsWith('app.bsky.graph.getFollows')).length, 11); // 10 full pages + 1
  assert.equal(calls.some(c => c.startsWith('app.bsky.actor.getProfiles')), false); // all hydrated from getFollows
  assert(elapsed < 1_000, `took ${elapsed.toFixed(0)}ms`); // excluding real network latency
  db.close();
});

test('a user with no follows sees only themselves, and an empty list before solving', async () => {
  const db = openResultsDatabase(':memory:');
  const { appView } = mockAppView({});
  assert.deepEqual((await getLeaderboard(appView, db, `did=${ME}&date=${DATE}`)).body, { date: DATE, entries: [] });
  addResult(db, ME, 42);
  const { body } = await getLeaderboard(appView, db, `did=${ME}&date=${DATE}`);
  assert.deepEqual(body.entries.map((e: { did: string; rank: number }) => [e.did, e.rank]), [[ME, 1]]);
  db.close();
});

test('friends who have not solved yet are left out', async () => {
  const db = openResultsDatabase(':memory:');
  const { appView } = mockAppView({ [ME]: ['x', 'y'].map(profile) });
  addResult(db, ME, 42);
  const { body } = await getLeaderboard(appView, db, `did=${ME}&date=${DATE}`);
  assert.equal(body.entries.length, 1);
  db.close();
});

test('rejects bad parameters and reports AppView failures', async () => {
  const db = openResultsDatabase(':memory:');
  const { appView } = mockAppView({});
  for (const [query, code] of [
    [`date=${DATE}`, 'INVALID_DID'],
    [`did=bob.bsky.social&date=${DATE}`, 'INVALID_DID'],
    [`did=${ME}`, 'INVALID_DATE'],
    [`did=${ME}&date=2026-02-30`, 'INVALID_DATE'],
  ]) {
    const { status, body } = await getLeaderboard(appView, db, query);
    assert.equal(status, 400, query);
    assert.equal(body.error.code, code, query);
  }
  const unknown = await getLeaderboard(mockAppView({}, { failWith: 400 }).appView, db, `did=${ME}&date=${DATE}`);
  assert.deepEqual([unknown.status, unknown.body.error.code], [404, 'ACCOUNT_NOT_FOUND']);
  const original = console.error;
  console.error = () => {};
  try {
    const down = await getLeaderboard(mockAppView({}, { failWith: 503 }).appView, db, `did=${ME}&date=${DATE}`);
    assert.deepEqual([down.status, down.body.error.code], [502, 'UPSTREAM_ERROR']);
  } finally {
    console.error = original;
  }
  db.close();
});

test('getProfiles splits large requests into batches of 25', async () => {
  const strangers = Array.from({ length: 60 }, (_, i) => profile(`s${i}`));
  const { appView, calls } = mockAppView({ 'did:plc:other': strangers });
  const result = await appView.getProfiles(strangers.map(p => p.did));
  assert.equal(result.length, 60);
  assert.equal(calls.length, 3); // 25 + 25 + 10
});

test('follow lists are cached for five minutes, shared between concurrent requests, and failures are not cached', async () => {
  let clock = 0;
  let fetches = 0;
  let fail = false;
  const inner: AppView = {
    async getAllFollows() { fetches++; if (fail) throw new Error('down'); return [profile('a')]; },
    async getProfiles() { return []; },
  };
  const cached = withFollowCache(inner, { now: () => clock });
  await Promise.all([cached.getAllFollows(ME), cached.getAllFollows(ME)]);
  assert.equal(fetches, 1);
  clock = 4 * 60_000;
  await cached.getAllFollows(ME);
  assert.equal(fetches, 1);
  clock = 5 * 60_000 + 1;
  fail = true;
  await assert.rejects(cached.getAllFollows(ME));
  fail = false;
  await cached.getAllFollows(ME);
  assert.equal(fetches, 3); // the failure was retried, not cached
});
