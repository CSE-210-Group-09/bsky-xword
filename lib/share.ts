import { formatTime } from './format';

interface ShareTextInput {
  date: string;
  timeSeconds: number;
  rank?: number | null;
  url: string;
}

export function buildShareText({ date, timeSeconds, rank, url }: ShareTextInput): string {
  let result = `⏱️ ${formatTime(timeSeconds)}`;
  if (rank != null) result += ` · #${rank} among friends`;

  return `bsky-xword mini ${date}\n${result}\n${url}`;
}

export function bskyComposeUrl(text: string): string {
  return `https://bsky.app/intent/compose?text=${encodeURIComponent(text)}`;
}
