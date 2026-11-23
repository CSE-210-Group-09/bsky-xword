/** The public profile fields the leaderboard shows. */
export interface ProfileSummary {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
}

/** Read-only Bluesky AppView queries. Public endpoints, so no auth is needed. */
export interface AppView {
  /** Every account `actor` follows, following cursors until the last page. */
  getAllFollows(actor: string): Promise<ProfileSummary[]>;
  /** Profiles for up to any number of DIDs, fetched in batches of 25. */
  getProfiles(actors: readonly string[]): Promise<ProfileSummary[]>;
}

/** Thrown when the AppView is unreachable or answers with an error. */
export class AppViewError extends Error {
  constructor(message: string, readonly status?: number, options?: ErrorOptions) {
    super(message, options);
    this.name = 'AppViewError';
  }
}

export const PUBLIC_APPVIEW_URL = 'https://public.api.bsky.app';
const FOLLOWS_PAGE_SIZE = 100; // the maximum getFollows allows
const PROFILES_BATCH_SIZE = 25; // the maximum getProfiles allows
const MAX_FOLLOW_PAGES = 100; // 10,000 follows; stops a runaway cursor loop

interface AppViewOptions {
  baseUrl?: string;
  /** Injectable for tests. */
  fetch?: typeof fetch;
  timeoutMs?: number;
}

export function createAppView({ baseUrl = PUBLIC_APPVIEW_URL, fetch: fetchFn = fetch, timeoutMs = 10_000 }: AppViewOptions = {}): AppView {
  async function query<T>(method: string, params: URLSearchParams): Promise<T> {
    const url = `${baseUrl}/xrpc/${method}?${params}`;
    let response: Response;
    try {
      response = await fetchFn(url, { signal: AbortSignal.timeout(timeoutMs) });
    } catch (error) {
      throw new AppViewError(`${method} request failed`, undefined, { cause: error });
    }
    if (!response.ok) throw new AppViewError(`${method} returned HTTP ${response.status}`, response.status);
    return (await response.json()) as T;
  }

  const summary = ({ did, handle, displayName, avatar }: ProfileSummary): ProfileSummary =>
    ({ did, handle, ...(displayName ? { displayName } : {}), ...(avatar ? { avatar } : {}) });

  return {
    async getAllFollows(actor) {
      const follows: ProfileSummary[] = [];
      let cursor: string | undefined;
      for (let page = 0; page < MAX_FOLLOW_PAGES; page++) {
        const params = new URLSearchParams({ actor, limit: String(FOLLOWS_PAGE_SIZE) });
        if (cursor) params.set('cursor', cursor);
        const body = await query<{ follows: ProfileSummary[]; cursor?: string }>('app.bsky.graph.getFollows', params);
        follows.push(...body.follows.map(summary));
        // An empty page can still carry a cursor; stop there too.
        if (!body.cursor || body.follows.length === 0) return follows;
        cursor = body.cursor;
      }
      return follows;
    },

    async getProfiles(actors) {
      const unique = [...new Set(actors)];
      const batches: string[][] = [];
      for (let i = 0; i < unique.length; i += PROFILES_BATCH_SIZE) batches.push(unique.slice(i, i + PROFILES_BATCH_SIZE));
      const pages = await Promise.all(batches.map(batch => {
        const params = new URLSearchParams();
        for (const did of batch) params.append('actors', did);
        return query<{ profiles: ProfileSummary[] }>('app.bsky.actor.getProfiles', params);
      }));
      return pages.flatMap(page => page.profiles.map(summary));
    },
  };
}

/** Caches each user's follow list for a short time so repeat requests skip the AppView. */
export function withFollowCache(appView: AppView, { ttlMs = 5 * 60_000, maxEntries = 1_000, now = Date.now } = {}): AppView {
  const cache = new Map<string, { expiresAt: number; follows: Promise<ProfileSummary[]> }>();
  return {
    ...appView,
    getAllFollows(actor) {
      const hit = cache.get(actor);
      if (hit && hit.expiresAt > now()) return hit.follows;
      cache.delete(actor);
      if (cache.size >= maxEntries) cache.delete(cache.keys().next().value!); // drop the oldest entry
      // Caching the promise means concurrent requests share one fetch.
      const follows = appView.getAllFollows(actor);
      cache.set(actor, { expiresAt: now() + ttlMs, follows });
      follows.catch(() => { // never cache a failure
        if (cache.get(actor)?.follows === follows) cache.delete(actor);
      });
      return follows;
    },
  };
}
