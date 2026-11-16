"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { formatTime } from "@/lib/crossword";
import { ME, PUZZLES, Result, getPuzzle, getUser, resultsFor } from "@/lib/data";
import { useAppState } from "@/components/AppState";
import Avatar from "@/components/Avatar";
import PuzzleCard from "@/components/PuzzleCard";

export default function Profile() {
  const { handle } = useParams<{ handle: string }>();
  const h = decodeURIComponent(handle);
  const user = getUser(h);
  const { results } = useAppState();

  if (!user) return <div className="card center"><h1>No such user 🫥</h1></div>;
  const isMe = user.handle === ME.handle;
  const solves: Result[] = isMe ? Object.values(results) : resultsFor(user.handle);
  const sorted = [...solves].sort((a, b) => b.completedAt.localeCompare(a.completedAt));
  const clean = solves.filter((r) => !r.assisted);
  const best = clean.length ? Math.min(...clean.map((r) => r.seconds)) : null;
  const avg = clean.length ? clean.reduce((s, r) => s + r.seconds, 0) / clean.length : null;
  const made = PUZZLES.filter((p) => p.author === user.handle);

  return (
    <div className="profile">
      <section className="card profile-head" style={{ ["--accent" as string]: user.color }}>
        <div className="profile-banner" />
        <div className="profile-row">
          <Avatar handle={user.handle} size={88} />
          <div className="grow">
            <h1>{user.displayName}</h1>
            <p className="muted">@{user.handle}</p>
            <p>{user.bio}</p>
          </div>
          {!isMe && (
            <a className="btn btn-ghost" href={`https://bsky.app/profile/${user.handle}`} target="_blank" rel="noreferrer">
              {user.following ? "✓ Following on Bluesky" : "🦋 View on Bluesky"}
            </a>
          )}
        </div>
        <div className="stats">
          <Stat n={solves.length} label="Solved" />
          <Stat n={best != null ? formatTime(best) : "—"} label="Best time" />
          <Stat n={avg != null ? formatTime(avg) : "—"} label="Avg time" />
          <Stat n={made.length} label="Constructed" />
        </div>
      </section>

      {made.length > 0 && (
        <section>
          <h2>🧩 Puzzles by {isMe ? "you" : user.displayName}</h2>
          <div className="card-grid">{made.map((p) => <PuzzleCard key={p.id} puzzle={p} />)}</div>
        </section>
      )}

      <section className="card">
        <h2>📈 Recent solves</h2>
        {sorted.length === 0 ? (
          <p className="muted">No published results yet.</p>
        ) : (
          <ul className="solve-list">
            {sorted.map((r) => {
              const p = getPuzzle(r.puzzleId)!;
              const max = Math.max(...solves.map((x) => x.seconds));
              return (
                <li key={r.puzzleId}>
                  <Link href={`/puzzle/${p.id}`}>{p.title}</Link>
                  <span className="bar"><i style={{ width: `${(r.seconds / max) * 100}%`, background: user.color }} /></span>
                  <span className="lb-time">{formatTime(r.seconds)}{r.assisted && " 🛟"}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ n, label }: { n: React.ReactNode; label: string }) {
  return (
    <div className="stat">
      <b>{n}</b>
      <span>{label}</span>
    </div>
  );
}
