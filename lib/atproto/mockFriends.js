// Mock Bluesky friends who follow each other and solved today's mini
export const INITIAL_FRIENDS = [
  {
    id: "alice",
    did: "did:plc:alice123",
    handle: "alice.bsky.social",
    displayName: "Alice Walker",
    initials: "AW",
    color: "#ec4899", // pink
    timeSeconds: 38,
  },
  {
    id: "bob",
    did: "did:plc:bob456",
    handle: "bob.bsky.social",
    displayName: "Bob Chen",
    initials: "BC",
    color: "#3b82f6", // blue
    timeSeconds: 52,
  },
  {
    id: "charlie",
    did: "did:plc:charlie789",
    handle: "charlie.bsky.social",
    displayName: "Charlie Davis",
    initials: "CD",
    color: "#10b981", // green
    timeSeconds: 75,
  },
  {
    id: "dana",
    did: "did:plc:dana101",
    handle: "dana.bsky.social",
    displayName: "Dana Miller",
    initials: "DM",
    color: "#8b5cf6", // purple
    timeSeconds: 104,
  },
  {
    id: "elena",
    did: "did:plc:elena202",
    handle: "elena.bsky.social",
    displayName: "Elena Rostova",
    initials: "ER",
    color: "#f59e0b", // amber
    timeSeconds: null, // hasn't completed today's puzzle yet
  },
];

export const CURRENT_USER = {
  id: "current-user",
  did: "did:plc:aaron001",
  handle: "aaron.bsky.social",
  displayName: "Aaron (You)",
  initials: "YOU",
  color: "#0085ff", // bsky brand blue
  isCurrentUser: true,
};
