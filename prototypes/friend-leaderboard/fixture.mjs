export const viewerDid = 'did:plc:aaaaaaaaaaaaaaaaaaaaaaaa';
export const friendDid = 'did:plc:bbbbbbbbbbbbbbbbbbbbbbbb';
export const otherDid = 'did:plc:cccccccccccccccccccccccc';
export const revision = 'sha256:' + 'a'.repeat(64);
export const row = (author, durationMs, patch = {}) => ({
  author, puzzleId: 'urn:bsky-xword:fixture:one', puzzleRevision: revision,
  durationMs, assisted: false, completedAt: '2026-11-12T20:00:00.000Z',
  uri: `at://${author}/org.example.bskyxword.result/fixture`, ...patch,
});
export const request = {
  viewerDid, followedDids: [friendDid], puzzleId: 'urn:bsky-xword:fixture:one', puzzleRevision: revision,
  results: [row(viewerDid, 60000), row(friendDid, 45000), row(otherDid, 1000)],
};
