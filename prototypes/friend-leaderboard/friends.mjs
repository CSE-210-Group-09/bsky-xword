const isDid = (value) => typeof value === 'string' && /^did:[a-z0-9]+:[A-Za-z0-9._:%-]+$/.test(value);
const isActor = (value) => isDid(value) || (typeof value === 'string' &&
  value.length <= 253 && /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/.test(value));

/** Public AppView only. Return no partial graph on failed or truncated pagination. */
export async function fetchFollows(actor, { fetchImpl = globalThis.fetch, maxPages = 100 } = {}) {
  if (!isActor(actor) || !Number.isSafeInteger(maxPages) || maxPages < 1) throw new TypeError('Invalid actor or page limit');
  const dids = new Set();
  const seenCursors = new Set();
  let cursor;
  for (let page = 1; page <= maxPages; page++) {
    const url = new URL('https://public.api.bsky.app/xrpc/app.bsky.graph.getFollows');
    url.searchParams.set('actor', actor);
    url.searchParams.set('limit', '100');
    if (cursor !== undefined) url.searchParams.set('cursor', cursor);
    const response = await fetchImpl(url, { signal: AbortSignal.timeout(10_000) });
    if (!response.ok) throw new Error(`getFollows failed with HTTP ${response.status}; graph is incomplete`);
    const data = await response.json();
    if (!data || !Array.isArray(data.follows) || !data.follows.every((profile) => profile && isDid(profile.did)) ||
        (data.cursor !== undefined && typeof data.cursor !== 'string')) {
      throw new Error('Malformed getFollows response; graph is incomplete');
    }
    for (const profile of data.follows) dids.add(profile.did);
    if (!data.cursor) return { dids: [...dids].sort(), pages: page };
    if (seenCursors.has(data.cursor)) throw new Error('Repeated getFollows cursor; graph is incomplete');
    seenCursors.add(data.cursor);
    cursor = data.cursor;
  }
  throw new Error(`getFollows exceeded ${maxPages} pages; graph is incomplete`);
}

function validRow(row) {
  return row && isDid(row.author) && typeof row.uri === 'string' && row.uri.startsWith(`at://${row.author}/`) &&
    typeof row.puzzleId === 'string' && row.puzzleId.length > 0 &&
    /^sha256:[a-f0-9]{64}$/.test(row.puzzleRevision) &&
    Number.isSafeInteger(row.durationMs) && row.durationMs >= 0 && typeof row.assisted === 'boolean' &&
    typeof row.completedAt === 'string' && Number.isFinite(Date.parse(row.completedAt)) &&
    new Date(row.completedAt).toISOString() === row.completedAt;
}

/** Input is an already verified index projection, NOT a browser-supplied author.
 * This function filters/ranks only; it cannot authenticate a result or enforce anti-cheat.
 */
export function friendLeaderboard({ viewerDid, followedDids, puzzleId, puzzleRevision, results }) {
  if (!isDid(viewerDid) || !Array.isArray(followedDids) || !followedDids.every(isDid) ||
      typeof puzzleId !== 'string' || !puzzleId || !/^sha256:[a-f0-9]{64}$/.test(puzzleRevision) || !Array.isArray(results)) {
    throw new TypeError('Invalid leaderboard request');
  }
  const allowed = new Set([viewerDid, ...followedDids]);
  const firstByAuthor = new Map();
  // Honor earliest completion, never fastest replay. Ties use URI for deterministic selection.
  for (const row of results) {
    if (!validRow(row) || row.puzzleId !== puzzleId || row.puzzleRevision !== puzzleRevision || !allowed.has(row.author)) continue;
    const previous = firstByAuthor.get(row.author);
    if (!previous || Date.parse(row.completedAt) < Date.parse(previous.completedAt) ||
        (row.completedAt === previous.completedAt && row.uri < previous.uri)) firstByAuthor.set(row.author, {...row});
  }
  const byTime = (a, b) => a.durationMs - b.durationMs || a.author.localeCompare(b.author);
  const first = [...firstByAuthor.values()];
  const unassisted = first.filter((row) => !row.assisted).sort(byTime);
  let rank = 0;
  return {
    unassisted: unassisted.map((row, index) => {
      if (index === 0 || row.durationMs !== unassisted[index - 1].durationMs) rank = index + 1;
      return {...row, rank};
    }),
    assisted: first.filter((row) => row.assisted).sort(byTime),
  };
}
