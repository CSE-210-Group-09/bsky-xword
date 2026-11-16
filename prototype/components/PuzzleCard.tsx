"use client";

import Link from "next/link";
import { Puzzle, formatTime } from "@/lib/crossword";
import { COMMENTS, friendResults, getUser } from "@/lib/data";
import { useAppState } from "./AppState";
import Avatar from "./Avatar";
import GridThumb from "./GridThumb";

export default function PuzzleCard({ puzzle }: { puzzle: Puzzle }) {
  const { liked, results } = useAppState();
  const mine = results[puzzle.id];
  const friends = friendResults(puzzle.id);
  const isLiked = liked.includes(puzzle.id);
  const author = getUser(puzzle.author);
  return (
    <Link href={`/puzzle/${puzzle.id}`} className="card puzzle-card">
      <div className="pc-top">
        <GridThumb puzzle={puzzle} />
        <div className="pc-meta">
          <span className={`chip diff-${puzzle.difficulty.toLowerCase()}`}>{puzzle.difficulty}</span>
          {puzzle.daily && <span className="chip chip-daily">Daily</span>}
          {mine && <span className="chip chip-done">✓ {formatTime(mine.seconds)}</span>}
        </div>
      </div>
      <h3>{puzzle.title}</h3>
      <p className="muted small">
        by {author?.displayName ?? puzzle.author} ·{" "}
        {new Date(puzzle.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
      </p>
      <div className="pc-foot">
        <span className="stack">
          {friends.slice(0, 4).map((r) => (
            <Avatar key={r.handle} handle={r.handle} size={24} />
          ))}
          {friends.length > 0 && <span className="muted small">{friends.length} friends solved</span>}
        </span>
        <span className="small">
          {isLiked ? "💜" : "🤍"} {puzzle.likes + (isLiked ? 1 : 0)} · 💬{" "}
          {COMMENTS.filter((c) => c.puzzleId === puzzle.id).length}
        </span>
      </div>
    </Link>
  );
}
