"use client";

import Link from "next/link";
import { formatTime } from "@/lib/crossword";
import { FOLLOWS, ME, Result, friendResults, getUser } from "@/lib/data";
import Avatar from "./Avatar";

interface Ranked extends Result {
  rank: number;
}

/** Rank unassisted solves by time; equal times share a rank. */
function rank(results: Result[]): Ranked[] {
  const sorted = [...results].sort((a, b) => a.seconds - b.seconds);
  return sorted.map((r, i) => ({
    ...r,
    rank: sorted.findIndex((x) => x.seconds === r.seconds) + 1,
  }));
}

const MEDALS = ["🥇", "🥈", "🥉"];

export default function Leaderboard({ puzzleId, mine, compact }: { puzzleId: string; mine?: Result; compact?: boolean }) {
  const all = [...friendResults(puzzleId), ...(mine ? [mine] : [])];
  const clean = rank(all.filter((r) => !r.assisted));
  const assisted = all.filter((r) => r.assisted).sort((a, b) => a.seconds - b.seconds);
  const notYet = FOLLOWS.filter((f) => !all.some((r) => r.handle === f.handle));

  const row = (r: Result, label: React.ReactNode) => {
    const u = getUser(r.handle)!;
    const me = r.handle === ME.handle;
    return (
      <li key={r.handle} className={`lb-row ${me ? "lb-me" : ""}`}>
        <span className="lb-rank">{label}</span>
        <Avatar handle={r.handle} size={30} />
        <Link href={`/profile/${r.handle}`} className="lb-name">
          {me ? "You" : u.displayName}
          {!compact && <span className="muted small"> @{u.handle}</span>}
        </Link>
        <span className="lb-time">{formatTime(r.seconds)}</span>
      </li>
    );
  };

  return (
    <div className="leaderboard">
      <ol>{clean.map((r) => row(r, MEDALS[r.rank - 1] ?? `#${r.rank}`))}</ol>
      {assisted.length > 0 && (
        <>
          <p className="lb-sub">Used check or reveal</p>
          <ol>{assisted.map((r) => row(r, "🛟"))}</ol>
        </>
      )}
      {notYet.length > 0 && !compact && (
        <p className="muted small lb-foot">
          <span className="stack">
            {notYet.map((f) => (
              <Avatar key={f.handle} handle={f.handle} size={20} />
            ))}
          </span>{" "}
          {notYet.length} {notYet.length === 1 ? "person you follow hasn't" : "people you follow haven't"} played yet
        </p>
      )}
    </div>
  );
}

export function myRank(puzzleId: string, mine: Result) {
  if (mine.assisted) return null;
  const clean = rank([...friendResults(puzzleId).filter((r) => !r.assisted), mine]);
  return { rank: clean.find((r) => r.handle === ME.handle)!.rank, of: clean.length };
}
