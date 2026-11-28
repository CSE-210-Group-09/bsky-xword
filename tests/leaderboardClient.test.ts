import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { fetchLeaderboard } from '../lib/atproto/leaderboardClient';
import { useLeaderboard } from '../hooks/useLeaderboard';
import type { LeaderboardEntry } from '../types/api';

const PLAYER = 'did:plc:mock-tester.bsky.social';
const entries: LeaderboardEntry[] = [
  { did: 'did:plc:alice', handle: 'alice.bsky.social', timeSeconds: 20, rank: 1, isCurrentUser: false },
  { did: PLAYER, handle: 'tester.bsky.social', timeSeconds: 40, rank: 2, isCurrentUser: true },
];
const respond = (status: number, body: unknown) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));

describe('fetchLeaderboard (#43)', () => {
  it('asks for the player\'s DID and the date, and returns the entries', async () => {
    const fetcher = vi.fn(() => respond(200, { date: '2026-11-18', entries }));
    await expect(fetchLeaderboard(PLAYER, '2026-11-18', fetcher)).resolves.toEqual({ status: 'ready', entries });
    const url = new URL(fetcher.mock.calls[0][0], 'http://x');
    expect(url.pathname).toBe('/api/leaderboard');
    expect(url.searchParams.get('did')).toBe(PLAYER);
    expect(url.searchParams.get('date')).toBe('2026-11-18');
  });

  it.each([400, 404, 500, 502, 503])('reports an error on HTTP %i', async (code) => {
    await expect(fetchLeaderboard(PLAYER, '2026-11-18', () => respond(code, {}))).resolves.toEqual({ status: 'error' });
  });

  it('reports an error when the network fails or the body is not a leaderboard', async () => {
    await expect(fetchLeaderboard(PLAYER, '2026-11-18', () => Promise.reject(new TypeError('offline')))).resolves.toEqual({ status: 'error' });
    await expect(fetchLeaderboard(PLAYER, '2026-11-18', () => respond(200, { entries: 'no' }))).resolves.toEqual({ status: 'error' });
    await expect(fetchLeaderboard(PLAYER, '2026-11-18', () => respond(200, { entries: [{ handle: 'x' }] }))).resolves.toEqual({ status: 'error' });
  });
});

describe('useLeaderboard (#43)', () => {
  it('does nothing until it is enabled', () => {
    const fetcher = vi.fn(() => respond(200, { date: '2026-11-18', entries }));
    const { result } = renderHook(() => useLeaderboard({ did: PLAYER, date: '2026-11-18', enabled: false, fetcher }));
    expect(result.current.status).toBe('idle');
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('loads the entries and the player\'s rank once enabled', async () => {
    const fetcher = vi.fn(() => respond(200, { date: '2026-11-18', entries }));
    const { result, rerender } = renderHook(
      ({ enabled }) => useLeaderboard({ did: PLAYER, date: '2026-11-18', enabled, fetcher }),
      { initialProps: { enabled: false } },
    );
    rerender({ enabled: true });
    expect(result.current.status).toBe('loading');
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.entries).toEqual(entries);
    expect(result.current.rank).toBe(2);
  });

  it('has no rank when the player is not in the entries', async () => {
    const fetcher = () => respond(200, { date: '2026-11-18', entries: [entries[0]] });
    const { result } = renderHook(() => useLeaderboard({ did: PLAYER, date: '2026-11-18', enabled: true, fetcher }));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.rank).toBeNull();
  });

  it('refresh() fetches again, after an error or to update', async () => {
    let fail = true;
    const fetcher = vi.fn(() => (fail ? respond(502, {}) : respond(200, { date: '2026-11-18', entries })));
    const { result } = renderHook(() => useLeaderboard({ did: PLAYER, date: '2026-11-18', enabled: true, fetcher }));
    await waitFor(() => expect(result.current.status).toBe('error'));

    fail = false;
    act(() => result.current.refresh());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    act(() => result.current.refresh());
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(3));
    expect(result.current.entries).toEqual(entries);
  });
});
