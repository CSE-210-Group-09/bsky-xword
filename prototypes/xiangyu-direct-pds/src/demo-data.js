// Fixture accounts for demo mode: shows inclusion, exclusion, ties, a gave-up result,
// a friend who has not played, and a faster replay that must NOT replace a first completion.
import { RESULT_TYPE } from './result.js';

export const DEMO_VIEWER = { did: 'did:plc:demo-you', handle: 'you.demo', displayName: 'You' };

export const DEMO_PEOPLE = [
  { did: 'did:plc:demo-alice', handle: 'alice.demo', displayName: 'Alice', followed: true },
  { did: 'did:plc:demo-bob', handle: 'bob.demo', displayName: 'Bob', followed: true },
  { did: 'did:plc:demo-carol', handle: 'carol.demo', displayName: 'Carol', followed: true },
  { did: 'did:plc:demo-dan', handle: 'dan.demo', displayName: 'Dan', followed: true },
  { did: 'did:plc:demo-erin', handle: 'erin.demo', displayName: 'Erin', followed: true },
  { did: 'did:plc:demo-mallory', handle: 'mallory.demo', displayName: 'Mallory', followed: false },
];

export function demoRows(puzzleId, puzzleRevision, rkey) {
  const row = (did, durationMs, assisted, completedAt, key = rkey) => ({
    author: did,
    uri: `at://${did}/${RESULT_TYPE}/${key}`,
    puzzleId,
    puzzleRevision,
    durationMs,
    assisted,
    completedAt,
  });
  return [
    row('did:plc:demo-alice', 41_300, false, '2026-11-15T16:02:11.000Z'),
    row('did:plc:demo-alice', 29_000, false, '2026-11-15T18:40:00.000Z', 'replay'), // later, faster: ignored
    row('did:plc:demo-bob', 58_000, false, '2026-11-15T16:30:00.000Z'),
    row('did:plc:demo-carol', 58_000, false, '2026-11-15T17:05:00.000Z'), // ties Bob: shared rank
    row('did:plc:demo-dan', 95_000, true, '2026-11-15T17:20:00.000Z'), // gave up
    row('did:plc:demo-mallory', 12_000, false, '2026-11-15T15:00:00.000Z'), // not followed: excluded
  ];
}
