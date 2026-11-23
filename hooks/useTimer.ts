import { useEffect, useState, useCallback, useRef } from 'react';

export const REVEAL_PENALTY_SECONDS = 10;
export const CHECK_PENALTY_SECONDS = 30;

export interface UseTimerOptions {
  running?: boolean;
  initialElapsed?: number;
  initialPenalties?: number;
}

export interface UseTimerReturn {
  elapsedSeconds: number;
  penaltySeconds: number;
  displayedSeconds: number;
  secondsElapsed: number; // Alias for displayedSeconds for backwards compatibility
  recentPenalty: number | null;
  addPenalty: (seconds: number) => void;
  reset: () => void;
}

/**
 * Timer hook supporting penalties and Page Visibility API pausing.
 * Pauses when tab is hidden, resumes when visible, and stops when running is false.
 */
export function useTimer(optionsOrRunning: boolean | UseTimerOptions = true): UseTimerReturn {
  const options = typeof optionsOrRunning === 'boolean'
    ? { running: optionsOrRunning }
    : optionsOrRunning;

  const {
    running = true,
    initialElapsed = 0,
    initialPenalties = 0,
  } = options;

  const [elapsedSeconds, setElapsedSeconds] = useState(initialElapsed);
  const [penaltySeconds, setPenaltySeconds] = useState(initialPenalties);
  const [recentPenalty, setRecentPenalty] = useState<number | null>(null);

  const penaltyTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (penaltyTimeoutRef.current) {
        clearTimeout(penaltyTimeoutRef.current);
      }
    };
  }, []);

  // Interval and Visibility API handling
  useEffect(() => {
    if (!running) return;

    let interval: ReturnType<typeof setInterval> | undefined;

    const start = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return;
      }
      if (!interval) {
        interval = setInterval(() => {
          setElapsedSeconds((prev) => prev + 1);
        }, 1000);
      }
    };

    const stop = () => {
      if (interval) {
        clearInterval(interval);
        interval = undefined;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        stop();
      } else {
        start();
      }
    };

    start();

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      stop();
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
  }, [running]);

  const addPenalty = useCallback((seconds: number) => {
    setPenaltySeconds((prev) => prev + seconds);
    setRecentPenalty(seconds);

    if (penaltyTimeoutRef.current) {
      clearTimeout(penaltyTimeoutRef.current);
    }

    penaltyTimeoutRef.current = setTimeout(() => {
      setRecentPenalty(null);
    }, 1500);
  }, []);

  const reset = useCallback(() => {
    setElapsedSeconds(0);
    setPenaltySeconds(0);
    setRecentPenalty(null);
    if (penaltyTimeoutRef.current) {
      clearTimeout(penaltyTimeoutRef.current);
    }
  }, []);

  const displayedSeconds = elapsedSeconds + penaltySeconds;

  return {
    elapsedSeconds,
    penaltySeconds,
    displayedSeconds,
    secondsElapsed: displayedSeconds,
    recentPenalty,
    addPenalty,
    reset,
  };
}
