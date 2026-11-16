"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { getPuzzle, getUser, solveCount } from "@/lib/data";
import { useAppState } from "@/components/AppState";
import Avatar from "@/components/Avatar";
import Comments from "@/components/Comments";
import Leaderboard from "@/components/Leaderboard";
import ShareModal from "@/components/ShareModal";
import Solver from "@/components/Solver";

export default function PuzzlePage() {
  const { id } = useParams<{ id: string }>();
  const puzzle = getPuzzle(id);
  const { liked, toggleLike, results } = useAppState();
  const [sharing, setSharing] = useState(false);

  if (!puzzle) {
    return (
      <div className="card center">
        <h1>Puzzle not found 🫥</h1>
        <Link href="/browse" className="btn btn-primary">Browse puzzles</Link>
      </div>
    );
  }
  const author = getUser(puzzle.author)!;
  const isLiked = liked.includes(puzzle.id);
  const mine = results[puzzle.id];

  return (
    <div className="puzzle-page">
      <div className="puzzle-head">
        <div>
          <div className="row">
            {puzzle.daily && <span className="chip chip-daily">Daily · {puzzle.date}</span>}
            <span className={`chip diff-${puzzle.difficulty.toLowerCase()}`}>{puzzle.difficulty}</span>
          </div>
          <h1>{puzzle.title}</h1>
          <Link href={`/profile/${author.handle}`} className="byline">
            <Avatar handle={author.handle} size={26} /> by <b>{author.displayName}</b>{" "}
            <span className="muted">@{author.handle}</span>
          </Link>
        </div>
        <div className="row">
          <button className={`btn btn-ghost ${isLiked ? "liked" : ""}`} onClick={() => toggleLike(puzzle.id)}>
            <span className={isLiked ? "pop" : ""}>{isLiked ? "💜" : "🤍"}</span> {puzzle.likes + (isLiked ? 1 : 0)}
          </button>
          <button className="btn btn-ghost" onClick={() => setSharing(true)}>↗ Share</button>
        </div>
      </div>

      <section className="card">
        <Solver key={puzzle.id} puzzle={puzzle} />
      </section>

      <div className="two-col">
        <section className="card">
          <h2>🏆 Friends leaderboard</h2>
          {mine ? (
            <Leaderboard puzzleId={puzzle.id} mine={mine} />
          ) : (
            <div className="locked">
              <span className="lock-emoji">🙈</span>
              <p>Times are hidden until you finish, so there&apos;s no pressure. {solveCount(puzzle.id).toLocaleString()} solves so far.</p>
            </div>
          )}
        </section>
        <Comments puzzleId={puzzle.id} unlocked={!!mine} />
      </div>
      {sharing && <ShareModal puzzle={puzzle} seconds={mine?.seconds} onClose={() => setSharing(false)} />}
    </div>
  );
}
