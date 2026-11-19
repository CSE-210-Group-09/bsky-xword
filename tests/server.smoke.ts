import assert from 'node:assert/strict';
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

test('production serves SPA, health and JSON errors without leaking internals', async () => {
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
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    await rm(dir, { recursive: true });
  }
});
