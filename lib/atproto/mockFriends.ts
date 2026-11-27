import type { Friend } from "../../types";

// Mock accounts the user follows, with the same fields the leaderboard API returns.
// Elena hasn't solved yet, so she gets left out like the server would do.
export const INITIAL_FRIENDS: Friend[] = [
  {
    did: "did:plc:alice123",
    handle: "alice.bsky.social",
    displayName: "Alice Walker",
    timeSeconds: 38,
  },
  {
    did: "did:plc:bob456",
    handle: "bob.bsky.social",
    displayName: "Bob Chen",
    timeSeconds: 52,
  },
  {
    did: "did:plc:charlie789",
    handle: "charlie.bsky.social",
    displayName: "Charlie Davis",
    timeSeconds: 75,
  },
  {
    did: "did:plc:dana101",
    handle: "dana.bsky.social",
    displayName: "Dana Miller",
    timeSeconds: 104,
  },
  {
    did: "did:plc:elena202",
    handle: "elena.bsky.social",
    displayName: "Elena Rostova",
    timeSeconds: null, // hasn't completed today's puzzle yet
  },
];

export const CURRENT_USER: Omit<Friend, "timeSeconds"> = {
  did: "did:plc:aaron001",
  handle: "aaron.bsky.social",
  displayName: "Aaron (You)",
  isCurrentUser: true,
};
