import { PUZZLE, puzzleRevision } from './puzzle.js';
import { RESULT_TYPE, isValidResult, makeResult, resultRecordKey } from './result.js';
import { friendLeaderboard } from './ranking.js';
import { Game } from './game.js';
import { composeUrl, formatDuration, shareText } from './share.js';
import { DEMO_PEOPLE, DEMO_VIEWER, demoRows } from './demo-data.js';
import { estimateRequests, loadDirectLeaderboard, totalRequests } from './atproto.js';

const $ = (id) => document.getElementById(id);
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (ch) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

// localStorage is a per-browser convenience only (keeps your first completion across reloads).
const store = {
  get(key) { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode */ } },
  remove(key) { try { localStorage.removeItem(key); } catch { /* ignore */ } },
};

const revision = await puzzleRevision(PUZZLE);
const rkey = await resultRecordKey(PUZZLE.id, revision);
const FIRST_KEY = `bsky-xword:first:${revision}`;
const PUBLISHED_KEY = `bsky-xword:demo-published:${revision}`;

let first = store.get(FIRST_KEY);
if (first && !isValidResult(first)) first = null;
let demoPublished = Boolean(store.get(PUBLISHED_KEY)) && Boolean(first);
let mode = 'demo';
let live = null;
let liveAbort = null;
let lastPractice = null;

$('revision').textContent = `rev ${revision.slice(7, 19)}`;
$('revision').title = `Puzzle revision ${revision}\nResult record key ${rkey}`;
$('puzzle-title').textContent = PUZZLE.title;

const game = new Game(PUZZLE, {
  board: $('board'), clueBar: $('clue-bar'), timer: $('timer'), status: $('status'),
  overlay: $('overlay'), overlayText: $('overlay-text'), overlayBtn: $('overlay-btn'),
  giveUp: $('give-up'), pause: $('pause'), replay: $('replay'),
  cluesAcross: $('clues-across'), cluesDown: $('clues-down'), kbd: $('kbd'),
}, { onFinish });

if (first) game.showRecorded(first);
renderResult();
renderBoard();

function onFinish({ durationMs, assisted, completedAt, practice }) {
  if (practice || first) {
    // Replays never replace the first completion (idempotent result, per the proposal).
    lastPractice = { durationMs, assisted };
    return renderResult();
  }
  first = makeResult({ puzzleId: PUZZLE.id, puzzleRevision: revision, durationMs, assisted, completedAt });
  store.set(FIRST_KEY, first);
  renderResult();
  renderBoard();
}

// ---- result card ------------------------------------------------------------
function renderResult() {
  $('result-card').hidden = !first;
  if (!first) return;
  const time = formatDuration(first.durationMs);
  $('result-summary').textContent = first.assisted ? `🏳️ Gave up at ${time}` : `✅ Solved in ${time}`;
  $('result-note').textContent = lastPractice
    ? `Practice run: ${formatDuration(lastPractice.durationMs)}${lastPractice.assisted ? ' (gave up)' : ''}. Your recorded first completion does not change.`
    : first.assisted
      ? 'Gave-up results are listed separately, not ranked by time.'
      : 'Only this first completion counts. Replays never improve it.';
  $('result-json').textContent = `collection: ${RESULT_TYPE}\nrkey: ${rkey}\n\n${JSON.stringify(first, null, 2)}`;
  $('share-preview').textContent = shareText({ puzzle: PUZZLE, result: first, url: shareUrl() });

  const publish = $('publish');
  if (mode === 'demo') {
    publish.disabled = demoPublished;
    publish.textContent = demoPublished ? 'Published (demo)' : 'Publish result (demo)';
    $('publish-note').textContent = demoPublished
      ? 'Your result is on the demo leaderboard.'
      : 'Demo mode adds your result to the fixture leaderboard. Nothing leaves this browser.';
  } else {
    publish.disabled = true;
    publish.textContent = 'Publish result';
    $('publish-note').textContent = 'Writing to your PDS needs Bluesky OAuth (issue #6), which this prototype leaves out. '
      + 'The record above is exactly what would be written. Once it exists, the live leaderboard finds it with no server involved.';
  }
}

function shareUrl() {
  return `${location.origin}${location.pathname}`;
}

$('publish').addEventListener('click', () => {
  if (mode !== 'demo' || !first) return;
  demoPublished = true;
  store.set(PUBLISHED_KEY, true);
  renderResult();
  renderBoard();
});

$('share').addEventListener('click', () => {
  if (!first) return;
  window.open(composeUrl(shareText({ puzzle: PUZZLE, result: first, url: shareUrl() })), '_blank', 'noopener');
});

$('reset').addEventListener('click', () => {
  store.remove(FIRST_KEY);
  store.remove(PUBLISHED_KEY);
  location.reload();
});

// ---- tabs -------------------------------------------------------------------
for (const [tabId, tabMode] of [['tab-demo', 'demo'], ['tab-live', 'live']]) {
  $(tabId).addEventListener('click', () => {
    mode = tabMode;
    $('tab-demo').setAttribute('aria-selected', String(mode === 'demo'));
    $('tab-live').setAttribute('aria-selected', String(mode === 'live'));
    $('panel-demo').hidden = mode !== 'demo';
    $('panel-live').hidden = mode !== 'live';
    renderResult();
    renderBoard();
  });
}

// ---- live (direct PDS) ------------------------------------------------------
$('live-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const actor = $('live-actor').value.trim().replace(/^@/, '');
  if (!actor) return;
  const maxFollows = clamp(parseInt($('live-max').value, 10) || 150, 1, 5000);
  const concurrency = clamp(parseInt($('live-conc').value, 10) || 8, 1, 32);
  liveAbort?.abort();
  liveAbort = new AbortController();
  $('live-run').disabled = true;
  $('live-cancel').disabled = false;
  $('live-progress').hidden = false;
  setBar(0.03);
  live = { loading: true };
  renderBoard();
  try {
    live = await loadDirectLeaderboard({
      actor, puzzleId: PUZZLE.id, puzzleRevision: revision, rkey, maxFollows, concurrency,
      signal: liveAbort.signal,
      onProgress: ({ done, total, metrics }) => {
        setBar(total ? Math.max(0.03, done / total) : 0.03);
        renderMetrics(metrics);
      },
    });
    setBar(1);
    renderMetrics(live.metrics);
  } catch (error) {
    live = { error: error?.name === 'AbortError' ? 'Cancelled.' : (error?.message || String(error)) };
  } finally {
    $('live-run').disabled = false;
    $('live-cancel').disabled = true;
    liveAbort = null;
    renderBoard();
  }
});

$('live-cancel').addEventListener('click', () => liveAbort?.abort());

function setBar(fraction) {
  $('live-bar').style.width = `${Math.round(clamp(fraction, 0, 1) * 100)}%`;
}

function renderMetrics(m) {
  const elapsed = ((m.endedAt ?? performance.now()) - m.startedAt) / 1000;
  const rows = [
    ['getProfile (AppView)', m.counts.getProfile],
    ['getFollows pages (AppView)', m.counts.getFollows],
    ['DID documents (plc.directory)', m.counts.didDoc],
    ["getRecord (each friend's own PDS)", m.counts.getRecord],
    ['Total HTTP requests', totalRequests(m)],
    ['Failed lookups', m.failures],
    ['Distinct PDS hosts contacted', m.pdsHosts.size],
    ['Wall time', `${elapsed.toFixed(1)} s`],
  ];
  const table = $('live-metrics');
  table.hidden = false;
  table.innerHTML = rows.map(([k, v]) => `<tr><th scope="row">${escapeHtml(k)}</th><td>${escapeHtml(v)}</td></tr>`).join('');
}

// ---- leaderboard ------------------------------------------------------------
function renderBoard() {
  const el = $('leaderboard');
  if (mode === 'demo') {
    const rows = demoRows(PUZZLE.id, revision, rkey);
    if (first && demoPublished) {
      const { $type, ...fields } = first;
      rows.push({ author: DEMO_VIEWER.did, uri: `at://${DEMO_VIEWER.did}/${RESULT_TYPE}/${rkey}`, ...fields });
    }
    const followed = DEMO_PEOPLE.filter((p) => p.followed);
    const board = friendLeaderboard({
      viewerDid: DEMO_VIEWER.did, followedDids: followed.map((p) => p.did),
      puzzleId: PUZZLE.id, puzzleRevision: revision, results: rows,
    });
    const names = new Map([DEMO_VIEWER, ...DEMO_PEOPLE].map((p) => [p.did, p]));
    const played = new Set([...board.unassisted, ...board.assisted].map((r) => r.author));
    const notPlayed = [DEMO_VIEWER, ...followed].filter((p) => !played.has(p.did));
    el.innerHTML = boardHtml({
      board, names, viewerDid: DEMO_VIEWER.did, notPlayed,
      notes: [
        "Mallory's 0:12 is excluded because you don't follow her.",
        "Alice also has a later, faster replay (0:29); only her first completion counts.",
      ],
    });
    return;
  }

  if (!live) {
    el.innerHTML = '<p class="muted">Enter a Bluesky handle to read results straight from each followed account\'s PDS. '
      + 'Nobody has published a result for this puzzle yet, so expect everyone under "not played yet". '
      + 'The request counts are the interesting part.</p>';
    return;
  }
  if (live.loading) { el.innerHTML = '<p class="muted">Loading…</p>'; return; }
  if (live.error) { el.innerHTML = `<p class="error">${escapeHtml(live.error)}</p>`; return; }

  const outcomes = [...live.outcomes.values()];
  const rows = outcomes.filter((o) => o.status === 'found').map((o) => o.row);
  const board = friendLeaderboard({
    viewerDid: live.viewer.did, followedDids: live.follows.map((p) => p.did),
    puzzleId: PUZZLE.id, puzzleRevision: revision, results: rows,
  });
  const names = new Map(live.people.map((p) => [p.did, p]));
  const played = new Set(rows.map((r) => r.author));
  const notPlayed = live.people.filter((p) => !played.has(p.did) && live.outcomes.get(p.did)?.status === 'none');
  const count = (status) => outcomes.filter((o) => o.status === status).length;
  const notes = [];
  if (live.truncated) {
    notes.push(`Checked only the first ${live.follows.length} follows`
      + `${live.viewer.followsCount ? ` of ${live.viewer.followsCount}` : ''}, so friends may be missing.`);
  }
  if (count('error')) notes.push(`${count('error')} account(s) could not be reached (network or PDS errors). They are left out, not shown as zero.`);
  if (count('invalid')) notes.push(`${count('invalid')} record(s) failed validation and were ignored.`);
  if (count('unavailable')) notes.push(`${count('unavailable')} account(s) are deactivated or missing.`);
  notes.push(`Cost: ${totalRequests(live.metrics)} requests for ${live.follows.length} follows. `
    + `For 500 follows this approach needs about ${estimateRequests(500)} requests per page load; a server-side index answers with 1.`);
  el.innerHTML = boardHtml({ board, names, viewerDid: live.viewer.did, notPlayed, notes, title: `Friends of @${live.viewer.handle}` });
}

function boardHtml({ board, names, viewerDid, notPlayed, notes, title = 'Friends · this puzzle' }) {
  const who = (did) => {
    const p = names.get(did);
    const label = p ? (p.displayName || p.handle) : did;
    return `<span class="who">${escapeHtml(label)}${did === viewerDid ? ' <em>(you)</em>' : ''}`
      + `${p?.handle ? ` <small>@${escapeHtml(p.handle)}</small>` : ''}</span>`;
  };
  const item = (row, rank) => `<li class="${row.author === viewerDid ? 'me' : ''}"><span class="rank">${rank}</span>`
    + `${who(row.author)}<span class="time">${formatDuration(row.durationMs)}</span></li>`;
  const ranked = board.unassisted.map((r) => item(r, r.rank)).join('');
  const assisted = board.assisted.map((r) => item(r, '🏳️')).join('');
  const shown = notPlayed.slice(0, 12).map((p) => escapeHtml(p.displayName || p.handle)).join(', ');
  const more = notPlayed.length > 12 ? `, and ${notPlayed.length - 12} more` : '';
  return `<h3>${escapeHtml(title)}</h3>`
    + (ranked ? `<ol class="lb">${ranked}</ol>` : '<p class="muted">No solved results yet.</p>')
    + (assisted ? `<h4>Gave up / used help</h4><ol class="lb assisted">${assisted}</ol>` : '')
    + (notPlayed.length ? `<p class="muted small"><b>Not played yet (${notPlayed.length}):</b> ${shown}${more}</p>` : '')
    + notes.map((n) => `<p class="note small">${escapeHtml(n)}</p>`).join('');
}
