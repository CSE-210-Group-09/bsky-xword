// All data here is mocked for the UI prototype. In the real app, users and
// follows come from Bluesky, and results come from AT Protocol records.
import { buildPuzzle, Puzzle, PuzzleDef } from "./crossword";

/** Fixed "today" so server and client render the same daily puzzle. */
export const TODAY = "2026-11-15";

export interface User {
  handle: string;
  displayName: string;
  did: string;
  emoji: string;
  color: string;
  bio: string;
  following: boolean; // does the signed-in user follow them on Bluesky?
}

export const ME: User = {
  handle: "you.bsky.social",
  displayName: "You",
  did: "did:plc:you000000000000000000",
  emoji: "🦋",
  color: "#4f46e5",
  bio: "Mini enthusiast. Solving before coffee.",
  following: false,
};

export const USERS: User[] = [
  { handle: "maya.bsky.social", displayName: "Maya", did: "did:plc:maya", emoji: "🦊", color: "#f97316", bio: "Speed solver. Crosswords > sleep.", following: true },
  { handle: "jordan.dev", displayName: "Jordan", did: "did:plc:jordan", emoji: "🐙", color: "#0ea5e9", bio: "Builds things. Solves things.", following: true },
  { handle: "puzzlepete.bsky.social", displayName: "Puzzle Pete", did: "did:plc:pete", emoji: "🧩", color: "#22c55e", bio: "I make minis. Mostly puns.", following: true },
  { handle: "lin.bsky.social", displayName: "Lin", did: "did:plc:lin", emoji: "🐼", color: "#ec4899", bio: "Daily streak or bust.", following: true },
  { handle: "sam-solves.bsky.social", displayName: "Sam", did: "did:plc:sam", emoji: "🦉", color: "#a855f7", bio: "Pen only.", following: true },
  { handle: "riley.bsky.social", displayName: "Riley", did: "did:plc:riley", emoji: "🐢", color: "#14b8a6", bio: "Slow and steady.", following: true },
  { handle: "gridqueen.bsky.social", displayName: "Grid Queen", did: "did:plc:gridqueen", emoji: "👑", color: "#eab308", bio: "Constructor. Theme lover.", following: false },
  { handle: "nora.xyz", displayName: "Nora", did: "did:plc:nora", emoji: "🐝", color: "#f43f5e", bio: "Not followed — her results stay off your leaderboard.", following: false },
];

export const ALL_USERS = [ME, ...USERS];
export const getUser = (handle: string) => ALL_USERS.find((u) => u.handle === handle);
export const FOLLOWS = USERS.filter((u) => u.following);

const DEFS: PuzzleDef[] = [
  {
    id: "2026-11-15", title: "Sunday Serve", author: "puzzlepete.bsky.social", date: "2026-11-15", daily: true,
    difficulty: "Easy", likes: 214, tags: ["daily"],
    grid: ["##wed", "#pony", "serve", "easy#", "art##"],
    clues: {
      wed: "Tie the knot", pony: "Petting-zoo horse", serve: "Start a point in tennis",
      easy: "Like a Monday crossword, supposedly", art: "What a gallery displays",
      sea: "Ocean's smaller cousin", pear: "Bell-shaped fruit", worst: "Opposite of best",
      envy: "The green-eyed monster", dye: "Tie-___ (hippie shirt style)",
    },
  },
  {
    id: "2026-11-14", title: "Star Turn", author: "gridqueen.bsky.social", date: "2026-11-14", daily: true,
    difficulty: "Medium", likes: 188, tags: ["daily", "theater"],
    grid: ["#star", "stage", "token", "event", "went#"],
    clues: {
      star: "Twinkler in the night sky", stage: "Where actors take a bow", token: "Arcade coin",
      event: "Happening", went: "Left", stew: "Hearty winter dish", stove: "Appliance with burners",
      taken: "Already spoken for", agent: "007, for one", rent: "Monthly apartment payment",
    },
  },
  {
    id: "2026-11-13", title: "Repost This", author: "puzzlepete.bsky.social", date: "2026-11-13", daily: true,
    difficulty: "Medium", likes: 241, tags: ["daily", "internet"],
    grid: ["#spin", "share", "canoe", "amend", "rely#"],
    clues: {
      spin: "Twirl", share: "Repost, on Bluesky", canoe: "Paddled boat", amend: "Revise, as a law",
      rely: "Depend (on)", scar: "Mark left by a wound", shame: "\"What a ___!\"", panel: "Group of judges",
      irony: "Rain on your wedding day, per Alanis", need: "Want badly",
    },
  },
  {
    id: "chef-kiss", title: "Chef's Kiss", author: "gridqueen.bsky.social", date: "2026-11-11",
    difficulty: "Easy", likes: 96, tags: ["food"],
    grid: ["#chef", "clone", "route", "asset", "beer#"],
    clues: {
      chef: "Kitchen boss", clone: "Exact copy", route: "Path on a map", asset: "Something valuable",
      beer: "Pub pour", crab: "Sideways scuttler", close: "Shut", house: "Home",
      enter: "Key that submits a form", feet: "Twelve inches, each",
    },
  },
  {
    id: "secret-agent", title: "Undercover", author: "maya.bsky.social", date: "2026-11-09",
    difficulty: "Tricky", likes: 73, tags: ["spy"],
    grid: ["##spy", "#shoe", "skirt", "pink#", "ape##"],
    clues: {
      spy: "Secret agent", shoe: "Sneaker, e.g.", skirt: "Avoid, as an issue", pink: "Flamingo color",
      ape: "Mimic", spa: "Place for a mud bath", skip: "Hop over", shine: "Polish",
      pork: "Bacon source", yet: "So far",
    },
  },
  {
    id: "rub-out", title: "Clean Slate", author: "puzzlepete.bsky.social", date: "2026-11-07",
    difficulty: "Easy", likes: 58, tags: ["beginner"],
    grid: ["##the", "#grow", "erase", "ride#", "ape##"],
    clues: {
      the: "Most common English word", grow: "Get bigger", erase: "Rub out", ride: "Roller coaster, e.g.",
      ape: "Gorilla, e.g.", era: "Historical period", grip: "Firm hold", trade: "Swap",
      hose: "Garden watering tool", ewe: "Female sheep",
    },
  },
  {
    id: "pop-goes", title: "Pop Goes the Grid", author: "jordan.dev", date: "2026-11-04",
    difficulty: "Medium", likes: 121, tags: ["snacks"],
    grid: ["##wee", "#cola", "burst", "able#", "red##"],
    clues: {
      wee: "Tiny, in Scotland", cola: "Fizzy soft drink", burst: "Pop, as a balloon", able: "Capable",
      red: "Stop-sign color", bar: "Chocolate ___", cube: "Ice ___", world: "Globe",
      else: "\"Or ___!\"", eat: "Have dinner",
    },
  },
  {
    id: "bragging-rights", title: "Bragging Rights", author: "gridqueen.bsky.social", date: "2026-11-01",
    difficulty: "Tricky", likes: 150, tags: ["competition"],
    grid: ["##bag", "#sole", "stall", "easy#", "art##"],
    clues: {
      bag: "Tote", sole: "Flatfish or shoe bottom", stall: "Delay tactic", easy: "Simple",
      art: "Painting or sculpture", sea: "Body of salt water", star: "Leading actor",
      boast: "Brag", ally: "Friend in battle", gel: "Hair-styling product",
    },
  },
];

export const PUZZLES: Puzzle[] = DEFS.map(buildPuzzle);
export const getPuzzle = (id: string) => PUZZLES.find((p) => p.id === id);
export const getDaily = () => PUZZLES.find((p) => p.date === TODAY && p.daily) ?? PUZZLES[0];

export interface Result {
  handle: string;
  puzzleId: string;
  seconds: number;
  assisted: boolean;
  completedAt: string;
}

// Deterministic pseudo-random numbers so mock times stay stable across renders.
function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967295;
}

const SPEED: Record<string, number> = {
  "maya.bsky.social": 0.55, "jordan.dev": 0.9, "puzzlepete.bsky.social": 0.7, "lin.bsky.social": 1,
  "sam-solves.bsky.social": 1.2, "riley.bsky.social": 1.8, "gridqueen.bsky.social": 0.6, "nora.xyz": 0.8,
};

export const RESULTS: Result[] = PUZZLES.flatMap((p) =>
  USERS.flatMap((u) => {
    const roll = hash(u.handle + p.id);
    if (roll < 0.25 || u.handle === p.author) return []; // hasn't played (or wrote it)
    const base = p.difficulty === "Easy" ? 45 : p.difficulty === "Medium" ? 70 : 100;
    return [{
      handle: u.handle,
      puzzleId: p.id,
      seconds: Math.round(base * SPEED[u.handle] * (0.7 + hash(p.id + u.handle) * 0.8)),
      assisted: hash(u.did + p.id) < 0.15,
      completedAt: p.date,
    }];
  })
);

/** Only results from accounts the viewer follows; unrelated accounts never appear. */
export const friendResults = (puzzleId: string) =>
  RESULTS.filter((r) => r.puzzleId === puzzleId && FOLLOWS.some((f) => f.handle === r.handle));

export const solveCount = (puzzleId: string) =>
  RESULTS.filter((r) => r.puzzleId === puzzleId).length * 37 + 12;

export interface Comment {
  id: string;
  puzzleId: string;
  handle: string;
  text: string;
  postedAt: string;
  likes: number;
}

export const COMMENTS: Comment[] = [
  { id: "c1", puzzleId: "2026-11-15", handle: "maya.bsky.social", text: "That tie-dye clue made me smile. Fast one today!", postedAt: "2h", likes: 12 },
  { id: "c2", puzzleId: "2026-11-15", handle: "lin.bsky.social", text: "Day 41 of the streak 🔥 Got stuck on the Monday crossword clue for a sec.", postedAt: "3h", likes: 7 },
  { id: "c3", puzzleId: "2026-11-15", handle: "riley.bsky.social", text: "Nice clean grid, Pete.", postedAt: "5h", likes: 3 },
  { id: "c4", puzzleId: "2026-11-13", handle: "jordan.dev", text: "The Alanis clue is elite.", postedAt: "2d", likes: 19 },
  { id: "c5", puzzleId: "2026-11-14", handle: "sam-solves.bsky.social", text: "007 got me immediately.", postedAt: "1d", likes: 4 },
];

/** The signed-in user's past solves (mocked history for the profile page). */
export const MY_HISTORY: Result[] = [
  { handle: ME.handle, puzzleId: "2026-11-14", seconds: 63, assisted: false, completedAt: "2026-11-14" },
  { handle: ME.handle, puzzleId: "2026-11-13", seconds: 88, assisted: true, completedAt: "2026-11-13" },
  { handle: ME.handle, puzzleId: "chef-kiss", seconds: 41, assisted: false, completedAt: "2026-11-11" },
];

export const resultsFor = (handle: string) => (handle === ME.handle ? MY_HISTORY : RESULTS.filter((r) => r.handle === handle));
