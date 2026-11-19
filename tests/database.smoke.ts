import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { openResultsDatabase, type ResultInput } from '../lib/db/index.js';

const sample = (did: string, overrides: Partial<ResultInput> = {}): ResultInput => ({
  did, puzzleDate: '2026-11-18', puzzleId: 'mini-2026-11-18', timeSeconds: 83,
  revealCount: 1, checkCount: 0, completedAt: '2026-11-18T20:01:23.000Z',
  uri: `at://${did}/io.github.cse-210-group-09.xword.result/2026-11-18`,
  cid: 'bafy-test', ...overrides,
});

test('upsert keeps one indexed result per DID/date and refreshes repo metadata', () => {
  const db = openResultsDatabase(':memory:');
  try {
    const original = db.upsertResult(sample('did:plc:alice'));
    assert.equal(Number.isNaN(Date.parse(original.indexedAt)), false);
    db.upsertResult(sample('did:plc:alice', { timeSeconds: 92, cid: 'bafy-new' }));
    const rows = db.getResultsForDate('2026-11-18', ['did:plc:alice']);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].timeSeconds, 92);
    assert.equal(rows[0].cid, 'bafy-new');
  } finally { db.close(); }
});

test('query intersects date and DID list, deduplicates follows, and orders times', () => {
  const db = openResultsDatabase(':memory:');
  try {
    db.upsertResult(sample('did:plc:alice'));
    db.upsertResult(sample('did:plc:bob', { timeSeconds: 40 }));
    db.upsertResult(sample('did:plc:other'));
    db.upsertResult(sample('did:plc:alice', { puzzleDate: '2026-11-19', timeSeconds: 10 }));
    assert.deepEqual(db.getResultsForDate('2026-11-18', []).map(row => row.did), []);
    assert.deepEqual(db.getResultsForDate('2026-11-18', ['did:plc:alice', 'did:plc:bob', 'did:plc:alice'])
      .map(row => row.did), ['did:plc:bob', 'did:plc:alice']);
    assert.equal(db.getResultsForDate('2026-11-20', ['did:plc:alice']).length, 0);
    assert.equal(db.getResultsForDate("2026-11-18' OR 1=1 --", ['did:plc:alice']).length, 0);
  } finally { db.close(); }
});

test('query supports more than 1000 followed accounts', () => {
  const db = openResultsDatabase(':memory:');
  try {
    db.upsertResult(sample('did:plc:1000'));
    assert.equal(db.getResultsForDate('2026-11-18', Array.from({ length: 1500 }, (_, i) => `did:plc:${i}`)).length, 1);
  } finally { db.close(); }
});

test('migrations rerun safely on disk and preserve results across restarts', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'bsky-db-'));
  const filename = path.join(directory, 'nested', 'results.db');
  try {
    const first = openResultsDatabase(filename);
    first.upsertResult(sample('did:plc:alice'));
    first.close();
    const reopened = openResultsDatabase(filename);
    try { assert.equal(reopened.getResultsForDate('2026-11-18', ['did:plc:alice']).length, 1); }
    finally { reopened.close(); }
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
