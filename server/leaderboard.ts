import type { AppView, ProfileSummary } from '../lib/atproto/appview.js';
import type { ResultsDatabase } from '../lib/db/index.js';
import type { LeaderboardEntry, LeaderboardResponse } from '../types/api.js';

interface BuildOptions {
  did: string;
  date: string;
  appView: AppView;
  database: ResultsDatabase;
}

/**
 * The current user plus accounts they follow who have an indexed result for `date`,
 * fastest first. Tied times share a rank (1, 1, 3). See ADR 0009.
 */
export async function buildLeaderboard({ did, date, appView, database }: BuildOptions): Promise<LeaderboardResponse> {
  const follows = await appView.getAllFollows(did);
  const profiles = new Map<string, ProfileSummary>(follows.map(profile => [profile.did, profile]));

  // Sorted by time (then DID) by the database; only solvers come back.
  const results = database.getResultsForDate(date, [did, ...profiles.keys()]);

  // getFollows already gave us followed profiles; only the current user may be missing.
  const missing = results.map(result => result.did).filter(id => !profiles.has(id));
  if (missing.length > 0) {
    for (const profile of await appView.getProfiles(missing)) profiles.set(profile.did, profile);
  }

  const entries: LeaderboardEntry[] = [];
  results.forEach((result, index) => {
    const previous = entries[index - 1];
    const rank = previous && previous.timeSeconds === result.timeSeconds ? previous.rank : index + 1;
    const profile = profiles.get(result.did);
    entries.push({
      did: result.did,
      // A profile can be missing if the account was deleted; fall back to the DID.
      handle: profile?.handle ?? result.did,
      ...(profile?.displayName ? { displayName: profile.displayName } : {}),
      ...(profile?.avatar ? { avatar: profile.avatar } : {}),
      timeSeconds: result.timeSeconds,
      rank,
      isCurrentUser: result.did === did,
    });
  });
  return { date, entries };
}
