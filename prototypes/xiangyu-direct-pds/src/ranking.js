// Ranking rules ported unchanged from prototype/friend-leaderboard (friends.mjs),
// so this prototype and the index-based one rank the same rows identically.
// Only the data source differs: here `results` come straight from each author's PDS.

export const isDid = (value) => typeof value === 'string' && /^did:[a-z0-9]+:[A-Za-z0-9._:%-]+$/.test(value);

function validRow(row) {
  return row && isDid(row.author) && typeof row.uri === 'string' && row.uri.startsWith(`at://${row.author}/`) &&
    typeof row.puzzleId === 'string' && row.puzzleId.length > 0 &&
    /^sha256:[a-f0-9]{64}$/.test(row.puzzleRevision) &&
    Number.isSafeInteger(row.durationMs) && row.durationMs >= 0 && typeof row.assisted === 'boolean' &&
    typeof row.completedAt === 'string' && Number.isFinite(Date.parse(row.completedAt)) &&
    new Date(row.completedAt).toISOString() === row.completedAt;
}

/** Filters to self + followed accounts and one exact puzzle revision, keeps each author's
 * EARLIEST completion (never a faster replay), ranks unassisted by time with shared ranks
 * for ties, and lists assisted / gave-up results separately. Not an anti-cheat mechanism. */
export function friendLeaderboard({ viewerDid, followedDids, puzzleId, puzzleRevision, results }) {
  if (!isDid(viewerDid) || !Array.isArray(followedDids) || !followedDids.every(isDid) ||
      typeof puzzleId !== 'string' || !puzzleId || !/^sha256:[a-f0-9]{64}$/.test(puzzleRevision) || !Array.isArray(results)) {
    throw new TypeError('Invalid leaderboard request');
  }
  const allowed = new Set([viewerDid, ...followedDids]);
  const firstByAuthor = new Map();
  for (const row of results) {
    if (!validRow(row) || row.puzzleId !== puzzleId || row.puzzleRevision !== puzzleRevision || !allowed.has(row.author)) continue;
    const previous = firstByAuthor.get(row.author);
    if (!previous || Date.parse(row.completedAt) < Date.parse(previous.completedAt) ||
        (row.completedAt === previous.completedAt && row.uri < previous.uri)) firstByAuthor.set(row.author, { ...row });
  }
  const byTime = (a, b) => a.durationMs - b.durationMs || a.author.localeCompare(b.author);
  const first = [...firstByAuthor.values()];
  const unassisted = first.filter((row) => !row.assisted).sort(byTime);
  let rank = 0;
  return {
    unassisted: unassisted.map((row, index) => {
      if (index === 0 || row.durationMs !== unassisted[index - 1].durationMs) rank = index + 1;
      return { ...row, rank };
    }),
    assisted: first.filter((row) => row.assisted).sort(byTime),
  };
}
