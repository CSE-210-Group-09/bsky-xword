// Spike for #36: Bluesky OAuth with @atproto/oauth-client-browser on localhost.
//
// What this page demonstrates:
//   1. Loopback (development) OAuth login, with a choice of requested scope.
//   2. Showing the DID, handle, and the scope the server actually granted.
//   3. Writing a result record to the player's repo with the OAuth session.
//   4. Reading it back WITHOUT auth from the player's PDS (what our server will
//      do in POST /api/results, see ADR 0005).
//   5. A scope probe: writing a different collection, to check whether the
//      granular scope really limits what the token can do.
//   6. Session restore on reload, forced refresh, and sign-out (revocation).

import { Agent } from '@atproto/api';
import {
  BrowserOAuthClient,
  buildAtprotoLoopbackClientMetadata,
  type OAuthSession,
} from '@atproto/oauth-client-browser';

const RESULT_COLLECTION = 'io.github.cse-210-group-09.xword.result';
// Harmless collection used only by the scope probe. Never read by the app.
const PROBE_COLLECTION = 'io.github.cse-210-group-09.xword.scopeprobe';
// Record key for the test record: a date no real puzzle will ever use.
const TEST_RKEY = '2000-01-01';
// Handle -> DID resolution must go through an HTTP service in the browser
// (no DNS). Using bsky.social sends the typed handle and the user's IP to
// Bluesky; acceptable for us since every player already has a Bluesky account.
const HANDLE_RESOLVER = 'https://bsky.social';

const SCOPE_MODES = {
  createOnly: {
    label: 'Create-only: our result collection, create action only',
    scope: `atproto repo:${RESULT_COLLECTION}?action=create`,
  },
  granular: {
    label: 'Granular: our result collection (create, update, delete)',
    scope: `atproto repo:${RESULT_COLLECTION}`,
  },
  generic: {
    label: 'Broad: transition:generic (full repo write access)',
    scope: 'atproto transition:generic',
  },
} as const;
type ScopeMode = keyof typeof SCOPE_MODES;

const SCOPE_STORAGE_KEY = 'oauth-spike:scope-mode';

// ---------------------------------------------------------------------------
// Small helpers

const $ = <T extends HTMLElement>(id: string) => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id}`);
  return el as T;
};

function log(message: string, data?: unknown) {
  const time = new Date().toLocaleTimeString();
  const extra = data === undefined ? '' : `\n${JSON.stringify(data, null, 2)}`;
  const pre = $('log');
  pre.textContent = `[${time}] ${message}${extra}\n\n${pre.textContent ?? ''}`;
  console.log(`[oauth-spike] ${message}`, data ?? '');
}

function describeError(err: unknown) {
  if (err instanceof Error) {
    const extra = err as Error & { status?: number; error?: string };
    return { name: err.name, message: err.message, status: extra.status, error: extra.error };
  }
  return { message: String(err) };
}

function readScopeMode(): ScopeMode {
  try {
    const stored = localStorage.getItem(SCOPE_STORAGE_KEY);
    if (stored && stored in SCOPE_MODES) return stored as ScopeMode;
  } catch {
    // Storage blocked: fall back to the default.
  }
  return 'createOnly';
}

function writeScopeMode(mode: ScopeMode) {
  try {
    localStorage.setItem(SCOPE_STORAGE_KEY, mode);
  } catch {
    // Ignore: the page still works for this load.
  }
}

/** Resolve a DID to its PDS endpoint, the same way our server will. */
async function resolvePds(did: string): Promise<string> {
  let docUrl: string;
  if (did.startsWith('did:plc:')) {
    docUrl = `https://plc.directory/${did}`;
  } else if (did.startsWith('did:web:')) {
    docUrl = `https://${did.slice('did:web:'.length)}/.well-known/did.json`;
  } else {
    throw new Error(`Unsupported DID method: ${did}`);
  }
  const res = await fetch(docUrl);
  if (!res.ok) throw new Error(`DID document fetch failed: ${res.status}`);
  const doc = (await res.json()) as {
    service?: { id: string; type: string; serviceEndpoint: string }[];
  };
  const pds = doc.service?.find(
    (s) => s.id.endsWith('#atproto_pds') && s.type === 'AtprotoPersonalDataServer',
  );
  if (!pds) throw new Error('DID document has no #atproto_pds service');
  return pds.serviceEndpoint;
}

// ---------------------------------------------------------------------------
// OAuth client setup

// Loopback clients only work from 127.0.0.1 / [::1], never "localhost".
if (window.location.hostname === 'localhost') {
  const url = new URL(window.location.href);
  url.hostname = '127.0.0.1';
  window.location.replace(url.toString());
  throw new Error('Redirecting to 127.0.0.1');
}

const scopeMode = readScopeMode();
const scope = SCOPE_MODES[scopeMode].scope;

// For loopback clients the metadata is encoded in the client_id itself
// ("http://localhost?redirect_uri=...&scope=..."); the authorization server
// never fetches a client-metadata.json. The same client_id must be used when
// the redirect comes back, which is why the chosen scope is persisted.
const clientMetadata = buildAtprotoLoopbackClientMetadata({
  scope,
  redirect_uris: [`${window.location.origin}/`],
});

const client = new BrowserOAuthClient({
  handleResolver: HANDLE_RESOLVER,
  clientMetadata,
  // Note: the package README still documents client.addEventListener('deleted'),
  // but in 0.5.x session events are constructor callbacks instead. They also
  // fire for changes made in other tabs (synced over a BroadcastChannel).
  onSessionDeleted: (sub, cause) => {
    log(`Session deleted for ${sub}`, describeError(cause));
    showSignedOut();
  },
  onSessionUpdated: (sub) => {
    log(`Session tokens updated (refreshed) for ${sub}`);
  },
});

// ---------------------------------------------------------------------------
// UI

let session: OAuthSession | undefined;
let agent: Agent | undefined;

function showSignedOut() {
  session = undefined;
  agent = undefined;
  $('signed-in').hidden = true;
  $('signed-out').hidden = false;
}

async function showSignedIn(s: OAuthSession) {
  session = s;
  agent = new Agent(s);
  $('signed-out').hidden = true;
  $('signed-in').hidden = false;

  const info = await s.getTokenInfo();
  // describeRepo is a public com.atproto call served by the PDS itself, so it
  // works with any scope. (app.bsky.* calls go through the PDS proxy and would
  // need an extra rpc: scope under granular permissions.)
  let handle = '(unknown)';
  try {
    const repo = await agent.com.atproto.repo.describeRepo({ repo: s.did });
    handle = repo.data.handle;
  } catch (err) {
    log('describeRepo failed', describeError(err));
  }

  const rows: [string, string][] = [
    ['Handle', handle],
    ['DID', s.did],
    ['Scope requested', scope],
    ['Scope granted', info.scope],
    ['Authorization server', info.iss],
    ['Resource server (PDS)', info.aud],
    ['Access token expires', info.expiresAt?.toLocaleString() ?? '(unknown)'],
    ['Client ID', clientMetadata.client_id],
  ];
  const dl = $('session-info');
  dl.replaceChildren(
    ...rows.flatMap(([k, v]) => {
      const dt = document.createElement('dt');
      dt.textContent = k;
      const dd = document.createElement('dd');
      dd.textContent = v;
      return [dt, dd];
    }),
  );
  log('Token info', info);
}

function setupScopeSelect() {
  const select = $<HTMLSelectElement>('scope-mode');
  for (const [mode, { label }] of Object.entries(SCOPE_MODES)) {
    const option = document.createElement('option');
    option.value = mode;
    option.textContent = label;
    select.append(option);
  }
  select.value = scopeMode;
  $('scope-preview').textContent = `Requested scope string: "${scope}"`;
  select.addEventListener('change', () => {
    // The client_id embeds the scope, so a different scope needs a new client.
    writeScopeMode(select.value as ScopeMode);
    window.location.reload();
  });
}

/** Run an action with all buttons disabled, logging any error. */
function action(id: string, fn: () => Promise<void>) {
  $(id).addEventListener('click', async () => {
    const buttons = document.querySelectorAll('button');
    buttons.forEach((b) => (b.disabled = true));
    try {
      await fn();
    } catch (err) {
      log(`${id} failed`, describeError(err));
    } finally {
      buttons.forEach((b) => (b.disabled = false));
    }
  });
}

function requireAgent(): Agent {
  if (!agent || !session) throw new Error('Not signed in');
  return agent;
}

// ---------------------------------------------------------------------------
// Actions

$<HTMLFormElement>('sign-in-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const handle = $<HTMLInputElement>('handle').value.trim();
  if (!handle) return;
  log(`Signing in as ${handle} with scope "${scope}"...`);
  try {
    // Redirects to the user's authorization server; only returns on error
    // (for example when the user navigates back).
    await client.signIn(handle, { state: `spike-${Date.now()}` });
  } catch (err) {
    log('Sign-in did not complete', describeError(err));
  }
});

action('btn-write', async () => {
  const a = requireAgent();
  // Field names follow docs/result-record.md from PR #49.
  const record = {
    $type: RESULT_COLLECTION,
    puzzleId: 'oauth-spike-test',
    puzzleDate: TEST_RKEY,
    timeSeconds: 42,
    revealCount: 0,
    checkCount: 0,
    completedAt: new Date().toISOString(),
  };
  // createRecord with an explicit rkey fails if the record already exists, so
  // "one result per puzzle date" (ADR 0008) is enforced by the PDS itself.
  // Click twice to see the second attempt rejected.
  const res = await a.com.atproto.repo.createRecord({
    repo: a.assertDid,
    collection: RESULT_COLLECTION,
    rkey: TEST_RKEY,
    record,
  });
  log('createRecord OK', res.data);
});

action('btn-read', async () => {
  if (!session) throw new Error('Not signed in');
  const did = session.did;
  const pds = await resolvePds(did);
  const url = new URL('/xrpc/com.atproto.repo.getRecord', pds);
  url.searchParams.set('repo', did);
  url.searchParams.set('collection', RESULT_COLLECTION);
  url.searchParams.set('rkey', TEST_RKEY);
  // Plain fetch, no token: proves any server can verify the record publicly.
  const res = await fetch(url);
  const body = await res.json();
  log(`Public getRecord from ${pds} -> HTTP ${res.status}`, body);
});

action('btn-delete', async () => {
  const a = requireAgent();
  // Expected to fail under the create-only scope; switch to the "Granular"
  // scope (sign in again) to clean up the test record.
  await a.com.atproto.repo.deleteRecord({
    repo: a.assertDid,
    collection: RESULT_COLLECTION,
    rkey: TEST_RKEY,
  });
  log('deleteRecord OK (result test record removed)');
});

action('btn-probe', async () => {
  const a = requireAgent();
  log(`Scope probe: writing ${PROBE_COLLECTION} (should FAIL with the granular scope)...`);
  try {
    const res = await a.com.atproto.repo.putRecord({
      repo: a.assertDid,
      collection: PROBE_COLLECTION,
      rkey: 'probe',
      record: { $type: PROBE_COLLECTION, createdAt: new Date().toISOString() },
    });
    log('Probe write SUCCEEDED: this token can write outside our collection', res.data);
    await a.com.atproto.repo.deleteRecord({
      repo: a.assertDid,
      collection: PROBE_COLLECTION,
      rkey: 'probe',
    });
    log('Probe record deleted again');
  } catch (err) {
    log('Probe write was REJECTED (scope is enforced)', describeError(err));
  }
});

action('btn-refresh', async () => {
  if (!session) throw new Error('Not signed in');
  const before = await session.getTokenInfo(false);
  const after = await session.getTokenInfo(true);
  log('Forced refresh OK', {
    expiresBefore: before.expiresAt?.toISOString(),
    expiresAfter: after.expiresAt?.toISOString(),
  });
});

action('btn-sign-out', async () => {
  if (!session) return;
  const did = session.did;
  await session.signOut();
  log(`Signed out ${did} (tokens revoked, session removed from IndexedDB)`);
  showSignedOut();
});

// ---------------------------------------------------------------------------
// Boot

setupScopeSelect();

try {
  const result = await client.init();
  if (result) {
    if ('state' in result && result.state != null) {
      log(`Signed in via OAuth redirect (state: ${result.state})`);
    } else {
      log('Restored the previous session from IndexedDB');
    }
    await showSignedIn(result.session);
  } else {
    log(`Not signed in. Client ID: ${clientMetadata.client_id}`);
    showSignedOut();
  }
} catch (err) {
  log('client.init() failed', describeError(err));
  showSignedOut();
}
