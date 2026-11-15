// "Direct PDS" leaderboard source: the browser asks every followed account's own PDS
// for its result record. No backend, no database, no firehose. All endpoints are public
// and read-only; nothing here needs a login.
//
// Request cost for a viewer following F accounts:
//   1 getProfile + ceil(F/100) getFollows + (F+1) DID documents + (F+1) getRecord
// The metrics object records exactly what happened so the trade-off can be measured.
import { RESULT_TYPE, isValidResult } from './result.js';
import { isDid } from './ranking.js';

const APPVIEW = 'https://public.api.bsky.app/xrpc';
const PLC = 'https://plc.directory';
const TIMEOUT_MS = 10_000;

export function newMetrics() {
  return {
    counts: { getProfile: 0, getFollows: 0, didDoc: 0, getRecord: 0 },
    failures: 0,
    pdsHosts: new Map(),
    startedAt: performance.now(),
    endedAt: null,
  };
}

export const totalRequests = (m) => Object.values(m.counts).reduce((a, b) => a + b, 0);

export const estimateRequests = (follows) => 1 + Math.max(1, Math.ceil(follows / 100)) + 2 * (follows + 1);

async function getJson(url, kind, metrics, signal) {
  metrics.counts[kind]++;
  const timeout = AbortSignal.timeout(TIMEOUT_MS);
  const response = await fetch(url, {
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    headers: { accept: 'application/json' },
  });
  let body = null;
  try { body = await response.json(); } catch { /* non-JSON error page */ }
  return { ok: response.ok, status: response.status, body };
}

export async function getProfile(actor, metrics, signal) {
  const url = new URL(`${APPVIEW}/app.bsky.actor.getProfile`);
  url.searchParams.set('actor', actor);
  const { ok, status, body } = await getJson(url, 'getProfile', metrics, signal);
  if (!ok || !isDid(body?.did)) throw new Error(`Could not find that account (HTTP ${status}${body?.message ? `: ${body.message}` : ''})`);
  return {
    did: body.did,
    handle: body.handle,
    displayName: body.displayName || body.handle,
    followsCount: body.followsCount ?? null,
  };
}

/** Paginated follows, stopping at `max` (the UI reports when the list was cut short). */
export async function getFollows(did, max, metrics, signal) {
  const follows = new Map();
  let cursor;
  const seen = new Set();
  for (;;) {
    const url = new URL(`${APPVIEW}/app.bsky.graph.getFollows`);
    url.searchParams.set('actor', did);
    url.searchParams.set('limit', '100');
    if (cursor) url.searchParams.set('cursor', cursor);
    const { ok, status, body } = await getJson(url, 'getFollows', metrics, signal);
    if (!ok || !Array.isArray(body?.follows)) throw new Error(`getFollows failed (HTTP ${status}); follow list is incomplete`);
    for (const p of body.follows) {
      if (isDid(p?.did) && !follows.has(p.did)) follows.set(p.did, { did: p.did, handle: p.handle, displayName: p.displayName || p.handle });
      if (follows.size >= max) return { follows: [...follows.values()], truncated: true };
    }
    if (!body.cursor) return { follows: [...follows.values()], truncated: false };
    if (seen.has(body.cursor)) throw new Error('Repeated getFollows cursor; follow list is incomplete');
    seen.add(body.cursor);
    cursor = body.cursor;
  }
}

/** DID -> PDS URL via the DID document (did:plc from plc.directory, did:web from the domain). */
export async function resolvePds(did, metrics, signal) {
  let url;
  if (did.startsWith('did:plc:')) url = `${PLC}/${encodeURIComponent(did)}`;
  else if (did.startsWith('did:web:')) url = `https://${decodeURIComponent(did.slice('did:web:'.length)).replaceAll(':', '/')}/.well-known/did.json`;
  else throw new Error(`Unsupported DID method: ${did}`);
  const { ok, status, body } = await getJson(url, 'didDoc', metrics, signal);
  if (!ok) throw new Error(`DID document HTTP ${status}`);
  const service = (body?.service || []).find((s) => s?.id === '#atproto_pds' || s?.id === `${did}#atproto_pds`);
  const endpoint = typeof service?.serviceEndpoint === 'string' ? service.serviceEndpoint : null;
  if (!endpoint || !/^https:\/\//.test(endpoint)) throw new Error('DID document has no PDS endpoint');
  const host = new URL(endpoint).host;
  metrics.pdsHosts.set(host, (metrics.pdsHosts.get(host) || 0) + 1);
  return endpoint;
}

/** One getRecord at the deterministic key. Reading from the author's own PDS means the
 * author attribution comes from the repo itself, not from anything the browser claims. */
export async function fetchResult({ did, pds, rkey, puzzleId, puzzleRevision }, metrics, signal) {
  const url = new URL('/xrpc/com.atproto.repo.getRecord', pds);
  url.searchParams.set('repo', did);
  url.searchParams.set('collection', RESULT_TYPE);
  url.searchParams.set('rkey', rkey);
  const { ok, status, body } = await getJson(url, 'getRecord', metrics, signal);
  if (ok) {
    const value = body?.value;
    if (!isValidResult(value) || value.puzzleId !== puzzleId || value.puzzleRevision !== puzzleRevision ||
        typeof body.uri !== 'string' || !body.uri.startsWith(`at://${did}/`)) {
      return { status: 'invalid' };
    }
    const { $type, ...fields } = value;
    return { status: 'found', row: { author: did, uri: body.uri, ...fields } };
  }
  if (body?.error === 'RecordNotFound' || status === 404) return { status: 'none' };
  if (['RepoNotFound', 'RepoDeactivated', 'RepoTakendown', 'RepoSuspended'].includes(body?.error)) return { status: 'unavailable' };
  throw new Error(`getRecord HTTP ${status}${body?.error ? ` ${body.error}` : ''}`);
}

async function pool(items, limit, worker, signal) {
  let next = 0;
  const run = async () => {
    while (next < items.length) {
      signal?.throwIfAborted();
      await worker(items[next++]);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, run));
}

/** Whole pipeline. `outcomes` maps DID -> { status: found|none|invalid|unavailable|error }. */
export async function loadDirectLeaderboard({ actor, puzzleId, puzzleRevision, rkey, maxFollows, concurrency, signal, onProgress }) {
  const metrics = newMetrics();
  const viewer = await getProfile(actor, metrics, signal);
  onProgress?.({ phase: 'follows', done: 0, total: 0, metrics });
  const { follows, truncated } = await getFollows(viewer.did, maxFollows, metrics, signal);
  const people = [viewer, ...follows.filter((p) => p.did !== viewer.did)];
  const outcomes = new Map();
  let done = 0;
  onProgress?.({ phase: 'records', done, total: people.length, metrics });
  await pool(people, concurrency, async (person) => {
    try {
      const pds = await resolvePds(person.did, metrics, signal);
      outcomes.set(person.did, await fetchResult({ did: person.did, pds, rkey, puzzleId, puzzleRevision }, metrics, signal));
    } catch (error) {
      if (signal?.aborted) throw error;
      metrics.failures++;
      outcomes.set(person.did, { status: 'error', error: error.message });
    }
    done++;
    onProgress?.({ phase: 'records', done, total: people.length, metrics });
  }, signal);
  metrics.endedAt = performance.now();
  return { viewer, follows, people, outcomes, truncated, metrics };
}
