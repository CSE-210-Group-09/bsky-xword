import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { test } from 'node:test';
import type { Puzzle } from '../types/index.js';
import { PuzzleUnavailableError, type PuzzleSource } from '../lib/puzzles/today.js';
import { createApp, type AppOptions } from '../server/app.js';

const fakePuzzle = (date: string) => ({ id: `mini-${date}`, date }) as Puzzle;

/** In-memory source: one valid day, one invalid day, everything else missing. */
const source: PuzzleSource = {
  async getPuzzleForDate(date) {
    if (date === '2026-11-20') return fakePuzzle(date);
    throw new PuzzleUnavailableError(date === '2026-11-19' ? 'invalid' : 'missing', date);
  },
};

async function withServer(options: AppOptions, run: (base: string) => Promise<void>) {
  const server = createApp(options).listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    await run(`http://127.0.0.1:${(server.address() as AddressInfo).port}`);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => (error ? reject(error) : resolve())));
  }
}

// 2026-11-21T07:30Z is 23:30 on Nov 20 in California.
const lateNovember20 = () => new Date('2026-11-21T07:30:00Z');

test('serves the puzzle for today in Pacific time', async () => {
  await withServer({ puzzles: source, now: lateNovember20 }, async base => {
    const response = await fetch(`${base}/api/puzzle/today`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), fakePuzzle('2026-11-20'));
  });
});

test('returns a JSON 404 with no fallback when the puzzle is missing or invalid', async () => {
  const original = console.error;
  console.error = () => {}; // the invalid case logs on purpose
  try {
    await withServer({ puzzles: source, now: () => new Date('2026-11-22T12:00:00Z') }, async base => {
      const missing = await fetch(`${base}/api/puzzle/today`);
      assert.equal(missing.status, 404);
      assert.equal((await missing.json()).error.code, 'PUZZLE_NOT_FOUND');
      const invalid = await fetch(`${base}/api/puzzle/today?date=2026-11-19`);
      assert.equal(invalid.status, 404);
      assert.equal((await invalid.json()).error.code, 'PUZZLE_NOT_FOUND');
    });
  } finally {
    console.error = original;
  }
});

test('?date= works in development and is rejected when malformed', async () => {
  await withServer({ puzzles: source, now: () => new Date('2026-12-25T12:00:00Z') }, async base => {
    const response = await fetch(`${base}/api/puzzle/today?date=2026-11-20`);
    assert.equal(response.status, 200);
    assert.equal((await response.json()).date, '2026-11-20');
    const bad = await fetch(`${base}/api/puzzle/today?date=2026-02-30`);
    assert.equal(bad.status, 400);
    assert.equal((await bad.json()).error.code, 'INVALID_DATE');
  });
});

test('?date= is ignored in production', async () => {
  await withServer({ production: true, staticDir: '/nonexistent', puzzles: source, now: lateNovember20 }, async base => {
    const response = await fetch(`${base}/api/puzzle/today?date=2026-11-01`);
    assert.equal(response.status, 200);
    assert.equal((await response.json()).date, '2026-11-20');
  });
});
