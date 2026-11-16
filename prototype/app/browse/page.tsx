"use client";

import { useMemo, useState } from "react";
import { PUZZLES, friendResults, getUser } from "@/lib/data";
import { useAppState } from "@/components/AppState";
import PuzzleCard from "@/components/PuzzleCard";

const SORTS = ["Newest", "Most liked", "Friends playing"] as const;
const DIFFS = ["All", "Easy", "Medium", "Tricky"] as const;

export default function Browse() {
  const { results } = useAppState();
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<(typeof SORTS)[number]>("Newest");
  const [diff, setDiff] = useState<(typeof DIFFS)[number]>("All");
  const [unsolved, setUnsolved] = useState(false);
  const [dailyOnly, setDailyOnly] = useState(false);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return PUZZLES.filter(
      (p) =>
        (!needle ||
          p.title.toLowerCase().includes(needle) ||
          p.tags.some((t) => t.includes(needle)) ||
          (getUser(p.author)?.displayName.toLowerCase().includes(needle) ?? false)) &&
        (diff === "All" || p.difficulty === diff) &&
        (!unsolved || !results[p.id]) &&
        (!dailyOnly || p.daily)
    ).sort((a, b) =>
      sort === "Newest" ? b.date.localeCompare(a.date)
      : sort === "Most liked" ? b.likes - a.likes
      : friendResults(b.id).length - friendResults(a.id).length
    );
  }, [q, sort, diff, unsolved, dailyOnly, results]);

  return (
    <div>
      <div className="section-head">
        <div>
          <h1>Browse minis</h1>
          <p className="muted">Past dailies and community puzzles. Every one is a 5×5.</p>
        </div>
      </div>
      <div className="filters card">
        <input className="search" placeholder="🔎 Search titles, constructors, tags…" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="row wrap">
          <div className="seg">
            {SORTS.map((s) => (
              <button key={s} className={sort === s ? "on" : ""} onClick={() => setSort(s)}>{s}</button>
            ))}
          </div>
          <div className="seg">
            {DIFFS.map((d) => (
              <button key={d} className={diff === d ? "on" : ""} onClick={() => setDiff(d)}>{d}</button>
            ))}
          </div>
          <label className="toggle"><input type="checkbox" checked={unsolved} onChange={(e) => setUnsolved(e.target.checked)} /> Unsolved only</label>
          <label className="toggle"><input type="checkbox" checked={dailyOnly} onChange={(e) => setDailyOnly(e.target.checked)} /> Dailies only</label>
        </div>
      </div>
      <div className="card-grid">
        {list.map((p) => <PuzzleCard key={p.id} puzzle={p} />)}
      </div>
      {list.length === 0 && <p className="card center muted">No puzzles match. Try a different filter. 🧐</p>}
    </div>
  );
}
