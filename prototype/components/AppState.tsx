"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Comment, ME, MY_HISTORY, Result } from "@/lib/data";

interface MyResult extends Result {
  /** Mock AT URI, set once the player chooses to publish. */
  recordUri?: string;
}

interface State {
  liked: string[];
  results: Record<string, MyResult>;
  comments: Comment[];
}

interface AppState extends State {
  toggleLike: (puzzleId: string) => void;
  recordResult: (r: Result) => void;
  publishResult: (puzzleId: string) => void;
  addComment: (puzzleId: string, text: string) => void;
  reset: () => void;
}

const KEY = "bsky-xword-proto-v1";
const initial: State = {
  liked: [],
  results: Object.fromEntries(MY_HISTORY.map((r) => [r.puzzleId, { ...r, recordUri: mockUri(r.puzzleId) }])),
  comments: [],
};

function mockUri(puzzleId: string) {
  return `at://${ME.did}/app.bskyxword.result/${puzzleId.replace(/-/g, "")}`;
}

const Ctx = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>(initial);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved) setState({ ...initial, ...JSON.parse(saved) });
    } catch {
      /* storage unavailable: keep defaults */
    }
  }, []);

  const update = useCallback((fn: (s: State) => State) => {
    setState((s) => {
      const next = fn(s);
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const value: AppState = {
    ...state,
    toggleLike: (id) =>
      update((s) => ({ ...s, liked: s.liked.includes(id) ? s.liked.filter((x) => x !== id) : [...s.liked, id] })),
    // Only the first completion counts; replays never overwrite it.
    recordResult: (r) => update((s) => (s.results[r.puzzleId] ? s : { ...s, results: { ...s.results, [r.puzzleId]: r } })),
    publishResult: (id) =>
      update((s) =>
        s.results[id] ? { ...s, results: { ...s.results, [id]: { ...s.results[id], recordUri: mockUri(id) } } } : s
      ),
    addComment: (puzzleId, text) =>
      update((s) => ({
        ...s,
        comments: [...s.comments, { id: `me-${Date.now()}`, puzzleId, handle: ME.handle, text, postedAt: "now", likes: 0 }],
      })),
    reset: () => update(() => ({ liked: [], results: {}, comments: [] })),
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppState() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAppState must be used inside AppStateProvider");
  return ctx;
}
