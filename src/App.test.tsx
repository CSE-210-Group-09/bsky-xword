import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('solver timer', () => {
  it('displays elapsed time with zero-padded seconds across a minute boundary', () => {
    vi.useFakeTimers();
    render(<App />);

    expect(screen.getByText('0:00')).toBeTruthy();
    act(() => vi.advanceTimersByTime(65_000));
    expect(screen.getByText('1:05')).toBeTruthy();
  });
});

describe('friends leaderboard', () => {
  const leaderboardTab = () => screen.getByRole('button', { name: /^👥 Friends Leaderboard/ });

  it('keeps friend times and your rank hidden before you finish', () => {
    render(<App />);
    fireEvent.click(leaderboardTab());

    expect(screen.getByText('Solve the puzzle to see how your friends did')).toBeTruthy();
    expect(screen.queryByText('0:38')).toBeNull();
    expect(leaderboardTab().textContent).not.toContain('#');
  });

  it('shows only the solvers once you finish', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Quick Fill/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Inspect Grid' }));
    fireEvent.click(leaderboardTab());

    expect(leaderboardTab().textContent).toContain('#2');
    expect(screen.getByText('@alice.bsky.social')).toBeTruthy();
    // elena hasn't solved, so she shouldn't be listed at all
    expect(screen.queryByText('@elena.bsky.social')).toBeNull();
    expect(screen.queryByText(/not played/i)).toBeNull();
  });
});
