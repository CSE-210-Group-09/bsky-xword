import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CHECK_PENALTY_SECONDS,
  REVEAL_PENALTY_SECONDS,
  useTimer,
} from '../hooks/useTimer';

describe('useTimer hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Default visibility to visible
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('ticks once per second when running', () => {
    const { result } = renderHook(() => useTimer(true));

    expect(result.current.elapsedSeconds).toBe(0);
    expect(result.current.displayedSeconds).toBe(0);

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(result.current.elapsedSeconds).toBe(3);
    expect(result.current.displayedSeconds).toBe(3);
    expect(result.current.secondsElapsed).toBe(3);
  });

  it('stops ticking when running is false (completion)', () => {
    const { result, rerender } = renderHook(({ running }) => useTimer(running), {
      initialProps: { running: true },
    });

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(result.current.elapsedSeconds).toBe(5);

    // Stop timer on completion
    rerender({ running: false });

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(result.current.elapsedSeconds).toBe(5);
  });

  it('adds penalties and includes them in displayed time', () => {
    const { result } = renderHook(() => useTimer(true));

    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(result.current.elapsedSeconds).toBe(4);
    expect(result.current.penaltySeconds).toBe(0);
    expect(result.current.displayedSeconds).toBe(4);

    // Add reveal penalty
    act(() => {
      result.current.addPenalty(REVEAL_PENALTY_SECONDS);
    });
    expect(result.current.penaltySeconds).toBe(10);
    expect(result.current.displayedSeconds).toBe(14);
    expect(result.current.recentPenalty).toBe(10);

    // Add check penalty
    act(() => {
      result.current.addPenalty(CHECK_PENALTY_SECONDS);
    });
    expect(result.current.penaltySeconds).toBe(40);
    expect(result.current.displayedSeconds).toBe(44);
    expect(result.current.recentPenalty).toBe(30);

    // Fast-forward past recent penalty timeout (1500ms)
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(result.current.recentPenalty).toBeNull();
  });

  it('pauses when tab is hidden and resumes when visible (Page Visibility API)', () => {
    const { result } = renderHook(() => useTimer(true));

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(result.current.elapsedSeconds).toBe(5);

    // Tab is hidden (e.g. user switches tabs)
    act(() => {
      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        writable: true,
        configurable: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Advance 30 seconds while tab is hidden
    act(() => {
      vi.advanceTimersByTime(30000);
    });

    // Switching tabs for 30s must NOT add 30s
    expect(result.current.elapsedSeconds).toBe(5);
    expect(result.current.displayedSeconds).toBe(5);

    // Tab becomes visible again
    act(() => {
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        writable: true,
        configurable: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Advance another 5 seconds
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(result.current.elapsedSeconds).toBe(10);
    expect(result.current.displayedSeconds).toBe(10);
  });

  it('supports initial elapsed and penalties for persistence restore', () => {
    const { result } = renderHook(() =>
      useTimer({
        running: true,
        initialElapsed: 45,
        initialPenalties: 20,
      })
    );

    expect(result.current.elapsedSeconds).toBe(45);
    expect(result.current.penaltySeconds).toBe(20);
    expect(result.current.displayedSeconds).toBe(65);

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(result.current.elapsedSeconds).toBe(47);
    expect(result.current.displayedSeconds).toBe(67);
  });

  it('resets elapsed, penalties, and recent penalty when reset is called', () => {
    const { result } = renderHook(() => useTimer(true));

    act(() => {
      vi.advanceTimersByTime(10000);
      result.current.addPenalty(REVEAL_PENALTY_SECONDS);
    });

    expect(result.current.elapsedSeconds).toBe(10);
    expect(result.current.penaltySeconds).toBe(10);
    expect(result.current.displayedSeconds).toBe(20);

    act(() => {
      result.current.reset();
    });

    expect(result.current.elapsedSeconds).toBe(0);
    expect(result.current.penaltySeconds).toBe(0);
    expect(result.current.displayedSeconds).toBe(0);
    expect(result.current.recentPenalty).toBeNull();
  });
});
