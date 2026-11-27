import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Game } from './App';
import { EASY_PUZZLE } from '../lib/puzzles/puzzleData';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('solver timer', () => {
  it('displays elapsed time with zero-padded seconds across a minute boundary', () => {
    vi.useFakeTimers();
    render(<Game puzzle={EASY_PUZZLE} />);

    expect(screen.getByText('0:00')).toBeTruthy();
    act(() => vi.advanceTimersByTime(65_000));
    expect(screen.getByText('1:05')).toBeTruthy();
  });
});
