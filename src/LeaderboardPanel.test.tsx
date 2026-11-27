import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LeaderboardPanel } from '../components/leaderboard/LeaderboardPanel';
import type { RankedFriend } from '../types';

afterEach(cleanup);

// same fields the leaderboard API returns for each entry
const entries: RankedFriend[] = [
  { did: 'did:plc:alice', handle: 'alice.bsky.social', displayName: 'Alice', timeSeconds: 38, rank: 1, isCurrentUser: false },
  { did: 'did:plc:me', handle: 'me.bsky.social', displayName: 'Me', timeSeconds: 38, rank: 1, isCurrentUser: true },
  {
    did: 'did:plc:bob',
    handle: 'bob.bsky.social',
    avatar: 'https://cdn.example/bob.jpg',
    timeSeconds: 52,
    rank: 3,
    isCurrentUser: false,
  },
];

describe('LeaderboardPanel', () => {
  it('hides friend times until the puzzle is solved', () => {
    render(<LeaderboardPanel solved={false} status="ready" entries={entries} />);

    expect(screen.getByText('Solve the puzzle to see how your friends did')).toBeTruthy();
    expect(screen.queryByText('alice.bsky.social', { exact: false })).toBeNull();
    expect(screen.queryByText('0:38')).toBeNull();
    expect(screen.queryByText('0:52')).toBeNull();
  });

  it('shows solvers with shared ranks for ties and highlights the current user', () => {
    const { container } = render(<LeaderboardPanel solved status="ready" entries={entries} />);

    const rows = container.querySelectorAll('.leaderboard-item');
    expect(rows).toHaveLength(3);
    expect(rows[0].querySelector('.leaderboard-rank')?.textContent).toBe('🥇');
    expect(rows[1].querySelector('.leaderboard-rank')?.textContent).toBe('🥇');
    expect(rows[2].querySelector('.leaderboard-rank')?.textContent).toBe('🥉');

    expect(rows[1].classList.contains('is-current-user')).toBe(true);
    expect(rows[1].textContent).toContain('YOU');
    expect(rows[0].classList.contains('is-current-user')).toBe(false);

    expect(screen.getAllByText('0:38')).toHaveLength(2);
    expect(screen.getByText('0:52')).toBeTruthy();
  });

  it('falls back to the handle when there is no display name, and uses the avatar if there is one', () => {
    const { container } = render(<LeaderboardPanel solved status="ready" entries={entries} />);
    const bob = container.querySelectorAll('.leaderboard-item')[2];

    expect(bob.querySelector('.user-name')?.textContent).toBe('bob.bsky.social');
    expect(bob.querySelector('img')?.getAttribute('src')).toBe('https://cdn.example/bob.jpg');
  });

  it('shows an empty state when nobody you follow has solved yet', () => {
    const justMe = entries.filter((e) => e.isCurrentUser);
    render(<LeaderboardPanel solved status="ready" entries={justMe} />);

    expect(screen.getByText("None of the people you follow have solved today's puzzle yet")).toBeTruthy();
    // your own time still shows
    expect(screen.getByText('0:38')).toBeTruthy();
  });

  it('shows a loading state', () => {
    const { container } = render(<LeaderboardPanel solved status="loading" entries={[]} />);

    expect(screen.getByText('Loading leaderboard...')).toBeTruthy();
    expect(container.querySelectorAll('.leaderboard-item')).toHaveLength(0);
  });

  it('shows an error with a retry button', () => {
    const onRetry = vi.fn();
    render(<LeaderboardPanel solved status="error" entries={[]} onRetry={onRetry} />);

    expect(screen.getByText("Couldn't load the leaderboard.")).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
