import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { fetchTodayPuzzle } from '../lib/puzzles/fetchToday';
import { useTodayPuzzle } from '../hooks/useTodayPuzzle';
import { EASY_PUZZLE } from '../lib/puzzles/puzzleData';

const respond = (status: number, body: unknown) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));

describe('fetchTodayPuzzle (#35)', () => {
  it('returns the puzzle the server sends', async () => {
    const fetcher = vi.fn(() => respond(200, EASY_PUZZLE));
    await expect(fetchTodayPuzzle(fetcher)).resolves.toEqual({ status: 'ready', puzzle: EASY_PUZZLE });
    expect(fetcher).toHaveBeenCalledWith('/api/puzzle/today');
  });

  it('reports that there is no puzzle today on 404', async () => {
    const fetcher = () => respond(404, { error: { code: 'PUZZLE_NOT_FOUND', message: 'none' } });
    await expect(fetchTodayPuzzle(fetcher)).resolves.toEqual({ status: 'missing' });
  });

  it.each([500, 502, 503])('reports an error on HTTP %i', async (code) => {
    const fetcher = () => respond(code, { error: { code: 'X', message: 'y' } });
    await expect(fetchTodayPuzzle(fetcher)).resolves.toEqual({ status: 'error' });
  });

  it('reports an error when the network request fails', async () => {
    const fetcher = () => Promise.reject(new TypeError('Failed to fetch'));
    await expect(fetchTodayPuzzle(fetcher)).resolves.toEqual({ status: 'error' });
  });

  it('reports an error when the body is not a puzzle', async () => {
    await expect(fetchTodayPuzzle(() => respond(200, { hello: 'world' }))).resolves.toEqual({ status: 'error' });
    await expect(fetchTodayPuzzle(() => Promise.resolve(new Response('<html>', { status: 200 })))).resolves.toEqual({ status: 'error' });
  });
});

describe('useTodayPuzzle (#35)', () => {
  it('starts loading and then holds the puzzle', async () => {
    const { result } = renderHook(() => useTodayPuzzle(() => respond(200, EASY_PUZZLE)));
    expect(result.current.status).toBe('loading');
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.puzzle).toEqual(EASY_PUZZLE);
  });

  it('can retry after an error', async () => {
    let fail = true;
    const fetcher = vi.fn(() => (fail ? respond(500, {}) : respond(200, EASY_PUZZLE)));
    const { result } = renderHook(() => useTodayPuzzle(fetcher));
    await waitFor(() => expect(result.current.status).toBe('error'));

    fail = false;
    act(() => result.current.retry());
    expect(result.current.status).toBe('loading');
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
