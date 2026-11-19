/** Formats seconds as m:ss, or '--:--' when there is no time. */
export function formatTime(totalSeconds: number | null | undefined): string {
  if (totalSeconds === null || totalSeconds === undefined) return '--:--';
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}
