"use client";

import Link from "next/link";
import { formatTime } from "@/lib/crossword";
import { PUZZLES, RESULTS, TODAY, friendResults, getDaily, getPuzzle, getUser, solveCount } from "@/lib/data";
import { useAppState } from "@/components/AppState";
import Avatar from "@/components/Avatar";
import GridThumb from "@/components/GridThumb";
import Leaderboard from "@/components/Leaderboard";
import PuzzleCard from "@/components/PuzzleCard";

export default function Home() {
  const daily = getDaily();
  const { results } = useAppState();
  const mine = results[daily.id];
  const friends = friendResults(daily.id);
  const author = getUser(daily.author)!;
  const dateLabel = new Date(TODAY + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  const activity = RESULTS.filter((r) => getUser(r.handle)?.following)
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt) || a.seconds - b.seconds)
    .slice(0, 6);

  return (
    <div className="home">
      <section className="hero">
        <div className="hero-text">
          <span className="eyebrow">📅 {dateLabel}</span>
          <h1>Today&apos;s Mini</h1>
          <p className="hero-title">&ldquo;{daily.title}&rdquo; by <Link href={`/profile/${author.handle}`}>{author.displayName}</Link></p>
          <div className="hero-stats">
            <span>🧩 5×5</span>
            <span>⚡ {daily.difficulty}</span>
            <span>👥 {solveCount(daily.id).toLocaleString()} solves</span>
          </div>
          <div className="row">
            <Link href={`/puzzle/${daily.id}`} className="btn btn-yellow btn-lg">
              {mine ? `✓ Solved in ${formatTime(mine.seconds)}` : "▶ Play now"}
            </Link>
            <span className="stack">
              {friends.slice(0, 5).map((r) => (
                <Avatar key={r.handle} handle={r.handle} size={30} />
              ))}
              <span className="small hero-friends">{friends.length} friends already solved</span>
            </span>
          </div>
        </div>
        <div className="hero-art" aria-hidden>
          <GridThumb puzzle={daily} size={190} />
        </div>
      </section>

      <div className="two-col">
        <section className="card">
          <h2>🏆 Friends today</h2>
          {mine ? (
            <Leaderboard puzzleId={daily.id} mine={mine} />
          ) : (
            <div className="locked">
              <span className="lock-emoji">⏱</span>
              <p>
                <b>{friends.length} people you follow</b> have solved today&apos;s mini. Solve it to see where you rank.
              </p>
              <Link href={`/puzzle/${daily.id}`} className="btn btn-primary">Beat their times</Link>
            </div>
          )}
        </section>
        <section className="card">
          <h2>🔥 Your streak</h2>
          <Streak />
          <h2 className="mt">📣 Friend activity</h2>
          <ul className="activity">
            {activity.map((r) => {
              const u = getUser(r.handle)!;
              const p = getPuzzle(r.puzzleId)!;
              return (
                <li key={r.handle + r.puzzleId}>
                  <Avatar handle={r.handle} size={28} />
                  <span>
                    <b>{u.displayName}</b> solved <Link href={`/puzzle/${p.id}`}>{p.title}</Link>{" "}
                    in <b>{formatTime(r.seconds)}</b>{r.assisted && " 🛟"}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <section>
        <div className="section-head">
          <h2>✨ More minis</h2>
          <Link href="/browse">Browse all →</Link>
        </div>
        <div className="card-grid">
          {PUZZLES.filter((p) => p.id !== daily.id).slice(0, 4).map((p) => (
            <PuzzleCard key={p.id} puzzle={p} />
          ))}
        </div>
      </section>
    </div>
  );
}

function Streak() {
  const { results } = useAppState();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(TODAY + "T12:00:00");
    d.setDate(d.getDate() - (6 - i));
    const iso = d.toISOString().slice(0, 10);
    return { iso, label: d.toLocaleDateString("en-US", { weekday: "narrow" }), done: !!results[iso] };
  });
  let streak = 0;
  for (let i = days.length - 1; i >= 0 && days[i].done; i--) streak++;
  if (!days[6].done) for (let i = 5; i >= 0 && days[i].done; i--) streak++;
  return (
    <div className="streak">
      <div className="streak-num">{streak}<span>day{streak === 1 ? "" : "s"}</span></div>
      <div className="streak-days">
        {days.map((d) => (
          <div key={d.iso} className={`sd ${d.done ? "sd-done" : ""} ${d.iso === TODAY ? "sd-today" : ""}`}>
            <span>{d.done ? "✓" : ""}</span>
            <small>{d.label}</small>
          </div>
        ))}
      </div>
    </div>
  );
}
