import { act, cleanup, render, screen } from '@testing-library/react';
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
