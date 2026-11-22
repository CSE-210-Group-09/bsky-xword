import assert from 'node:assert/strict';
import express from 'express';
import { test } from 'node:test';
import { once } from 'node:events';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createApp } from '../server/app.js';
import { loadConfig } from '../server/config.js';

test('server validates environment configuration', () => {
  assert.equal(loadConfig({ PORT: '4321', PUBLIC_URL: 'https://example.test' }).port, 4321);
  assert.throws(() => loadConfig({ PORT: '0' }));
  assert.throws(() => loadConfig({ PUBLIC_URL: 'file:///tmp/test' }));
});

test('production serves SPA, health and JSON errors without leaking internals', async (t) => {
  const dir = await mkdtemp(path.join(tmpdir(), 'xword-server-'));
  await writeFile(path.join(dir, 'index.html'), '<h1>Mini crossword</h1>');
  const server = createApp({ production: true, staticDir: dir }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}`;
  try {
    assert.deepEqual(await (await fetch(`${base}/api/health`)).json(), { ok: true });
    for (const route of ['/', '/solve']) {
      const response = await fetch(`${base}${route}`);
      assert.equal(response.status, 200);
      assert.match(await response.text(), /Mini crossword/);
    }
    for (const route of ['/api/missing', '/missing.js']) {
      const response = await fetch(`${base}${route}`);
      assert.equal(response.status, 404);
      assert.equal((await response.json()).error.code, 'NOT_FOUND');
    }
    const invalid = await fetch(`${base}/api/health`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: '{broken',
    });
    assert.equal(invalid.status, 400);
    assert.deepEqual(await invalid.json(), { error: { code: 'INVALID_JSON', message: 'Invalid JSON body' } });
    const malformedPath = await fetch(`${base}/%E0%A4%A`);
    assert.equal(malformedPath.status, 400);
    assert.deepEqual(await malformedPath.json(), { error: { code: 'BAD_REQUEST', message: 'Bad request' } });

    const oversized = await fetch(`${base}/api/health`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: 'a'.repeat(33 * 1024) }),
    });
    assert.equal(oversized.status, 413);
    assert.deepEqual(await oversized.json(), {
      error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body too large' },
    });

    const unsupportedEncoding = await fetch(`${base}/api/health`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'content-encoding': 'unsupported' }, body: '{}',
    });
    assert.equal(unsupportedEncoding.status, 415);
    assert.deepEqual(await unsupportedEncoding.json(), { error: { code: 'BAD_REQUEST', message: 'Bad request' } });

    // Simulate an unexpected file-serving failure without exposing it to the client.
    const failure = new Error('Private file-serving failure');
    t.mock.method(express.response, 'sendFile', () => { throw failure; });
    const logged = t.mock.method(console, 'error', () => {});
    const internal = await fetch(`${base}/solve`);
    assert.equal(internal.status, 500);
    assert.deepEqual(await internal.json(), {
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
    assert.equal(logged.mock.callCount(), 1);
    assert.equal(logged.mock.calls[0].arguments[0], failure);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    await rm(dir, { recursive: true });
  }
});
