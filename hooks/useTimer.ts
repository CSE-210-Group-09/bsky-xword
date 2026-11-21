import { useEffect, useState } from 'react';

/** Counts up once per second while `running` is true. */
export function useTimer(running: boolean) {
  const [secondsElapsed, setSecondsElapsed] = useState(0);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (running) {
      interval = setInterval(() => {
        setSecondsElapsed((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [running]);

  const reset = () => setSecondsElapsed(0);

  return { secondsElapsed, reset };
}
