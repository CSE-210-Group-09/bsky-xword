# A Bluesky friend leaderboard built on Crosshare

Status: accepted working scope for planning and prototyping as of November 12, 2026. This revises the earlier PDF against the three-week constraint, the November 12 discussion, and the intent to build on Crosshare. Implementation tasks are tracked in [docs/tasks.md](../docs/tasks.md).

## The precise problem

A casual crossword player who already has friends on Bluesky wants to solve the same short puzzle and compare results with those people. Crosshare supplies the crossword experience, but its constructor-follow system does not supply that player's existing Bluesky relationships. Sharing a link lets friends reach a puzzle; it does not assemble their results into a personalized comparison.

Our proposal is a Crosshare-based app where a player solves a shared daily mini, publishes their result under their Bluesky identity, and sees results from accounts they follow on Bluesky.

The key user story is: "After I finish today's mini, I want to see how people I follow on Bluesky did on that exact puzzle, without finding each person's post or building a separate friend list."

This is a product hypothesis. The team context supports interest in the feature, but contains no interviews establishing unmet demand. We should avoid claiming that crossword communities generally need decentralized storage. Public result records are a useful technical property; familiar people to play with are the immediate user benefit.

## What Crosshare already provides

Source review used upstream commit `6f84e27f007cff55413167483b65a5075f884497`. These findings describe that source, not an exhaustive audit of the live service.

| Capability | Evidence in Crosshare | Consequence for our scope |
| --- | --- | --- |
| Crossword construction and solving | `app/components/ConstructOrUploadPage.tsx`, `app/components/Puzzle.tsx` | Reuse the existing experience. A new builder or solver is not the project contribution. |
| Daily minis | `app/pages/dailyminis/[[...slug]].tsx`, `app/lib/dailyMinis.ts` | Daily puzzles are a way to focus participation, not a missing feature we discovered. |
| Constructor follows | `app/components/FollowButton.tsx` stores Firebase user IDs and offers notifications for new puzzles | Our addition uses Bluesky follows to select fellow solvers. It need not replace constructor subscriptions. |
| Sharing | `app/components/SharingButtons.tsx` supports Facebook, Twitter, email, and copying | Add a Bluesky sharing path; do not claim to introduce puzzle sharing. |
| Solve statistics and social comparison | `app/components/PuzzleStats.tsx`, `app/components/Comments.tsx` include aggregate times and comment authors' solve times | Our contribution is a personalized Bluesky-follow leaderboard, not the first display of solve times. |
| Meta-contest leaderboards | `app/components/PuzzleOverlay.tsx` lists successful contest submissions by submission timestamp | Distinguish this from ranking mini completion durations among followed accounts. |
| Existing identity and persistence | `app/components/AuthContext.tsx` uses Firebase users; daily puzzle lookup uses Firestore | Expect an integration task, not a drop-in OAuth button. |

No matches for `bluesky`, `bsky`, or `atproto` appeared in the reviewed `app` and `functions` source. That supports treating this integration as new work, without asserting that no related community project exists.

Upstream source: [Crosshare repository](https://github.com/crosshare-org/crosshare/tree/6f84e27f007cff55413167483b65a5075f884497). Crosshare's README documents its TypeScript, Next.js, React, Firebase stack, emulator workflow, and AGPL-3.0 license. Preserve upstream attribution and license files in the derivative project.

## What we should build

Build a separately deployed Crosshare derivative with one demonstrated flow:

1. Open today's team-selected 5x5 puzzle and solve it using Crosshare's existing controls.
2. Connect a Bluesky account to publish the completed result. Show the handle and explain that publishing makes the result public.
3. Write a custom AT Protocol result record to that account's repository.
4. Show the player's result alongside published results for the same puzzle from accounts they follow on Bluesky.
5. Offer a spoiler-free result and puzzle link in a Bluesky compose flow. The player decides whether to post.

A daily mini gives everyone the same comparison target and a short demo. Puzzle generation is unnecessary for this flow. Start with a dated manifest of team-authored or explicitly permitted puzzles, prepared before implementation depends on them. The upstream code license does not establish permission to republish community puzzle content. If the team cannot supply a daily series, ship a small featured set with a leaderboard per puzzle and describe that scope accurately.

### MVP acceptance criteria

| Behavior | Done when |
| --- | --- |
| Shared puzzle | Two accounts opening the same dated URL receive the same immutable puzzle revision. Date selection uses a documented timezone. |
| Existing solver | A player can complete a seeded mini with the inherited solver; elapsed time and whether helpers were used reach the result adapter correctly. |
| Identity | A real Bluesky account connects through OAuth, and its DID identifies the result author. Reconnecting cannot attribute a result to another account. |
| Result publishing | Completion offers explicit publication; success returns a readable AT record URI. Failure preserves the completed solve and permits retry. |
| Friend comparison | Viewer sees self plus followed accounts with published results for that exact revision. An unrelated account is excluded. Missing results are not zero-time entries. |
| Ranking | Unassisted first completions rank by elapsed time; equal durations share rank. Assisted completions appear separately. Replays do not improve a published first-completion score. These are app rules, not anti-cheat guarantees. |
| Sharing | Compose text contains the puzzle link and result summary without answer letters; nothing posts automatically. |
| Demo | Three accounts demonstrate inclusion, exclusion, publishing, and sharing on the deployed app; CI checks the new result and filtering behavior. |

Use a coarse assisted/unassisted flag initially. Exact hint counts are optional unless an early inspection establishes a reliable mapping to Crosshare's existing solve state.

### Explicit exclusions

No new construction interface, daily generator, AI hints, new comment or like system, global leaderboard, streak system, live multiplayer, full Crosshare data migration, or synchronization with crosshare.org. Existing inherited features may remain available, but extending them is outside the release commitment. Creator publishing to AT Protocol can follow after the solver-to-friend-comparison flow works.

## Where AT Protocol fits

Bluesky's follow API supplies the existing relationships. AT repositories hold public result records under the player's DID. A small result schema defines the puzzle identifier and immutable revision, duration, assistance status, and completion timestamp. A published schema makes those fields interpretable by other clients; a raw record alone does not make another client support our game.

Keep puzzle content in the fork's existing storage for the MVP. Give each featured puzzle a stable identifier plus revision digest, and freeze it after release. Results must identify the exact revision so different clues or answers never share a ranking. This deliberately narrows portability to published results; it does not claim portable puzzle ownership.

Use a database as a derived result index for leaderboard queries. On publication, the server can read back the authenticated user's AT record, validate it, and index it. A scheduled reconciliation of participating accounts provides a bounded recovery path. This MVP need not discover results published through arbitrary external clients; document that limitation. Add Jetstream only if independent-client discovery is required by the rubric or there is time after integration.

The first technical spike must establish how Bluesky identity coexists with Crosshare's Firebase session. Prefer a small adapter and server-verified identity binding over rewriting every use of Firebase authentication. Do not trust a browser-supplied DID or result-author field. Session and credential handling need explicit review.

Protocol references: [public repositories](https://atproto.com/specs/repository), [Lexicon schemas](https://atproto.com/guides/lexicon), and [Bluesky getFollows definition](https://github.com/bluesky-social/atproto/blob/main/lexicons/app/bsky/graph/getFollows.json). Follow lookup requires pagination. Custom result records do not automatically become Bluesky feed posts; sharing is a separate action.

Results are self-reported and public. The first-attempt rule organizes friendly play; it cannot prevent fabricated records, alternate accounts, or inspecting answers. Do not promise verified competition.

## Work we can assign

Assign six primary owners, with review shared across the team. These are proposed issue boundaries, not estimates of equal effort.

| Work package | Concrete output and acceptance | Dependency |
| --- | --- | --- |
| 1. Crosshare integration and deployment | Pin upstream version, run emulators, deploy a seeded solver, document setup, and identify the completion hook and authentication boundary | Start immediately; coordinate interfaces with 2 and 3 |
| 2. Bluesky identity | OAuth connection, server-verified DID/session binding, reconnect/error states, and a documented integration contract with Firebase | Initial architecture spike with 1 |
| 3. Solve-to-result adapter | Read duration and assistance from existing solver, freeze first-completion state, preserve it on write failure, test mapping | Completion hook from 1; schema agreement with 4 |
| 4. AT records and result index | Schema, publish/read-back/retry, idempotent indexing, revision filtering, recovery script | Verified identity from 2; payload from 3 |
| 5. Follow graph and leaderboard | Paginated follow fetch, DID intersection, ranking and empty/error states; test with self, followed, and unrelated accounts | Agree API with 4; fixtures allow early work |
| 6. Daily entry, sharing, and acceptance | Dated puzzle manifest and permitted fixtures, daily entry page, spoiler-free compose link, three-account demo and end-to-end acceptance | Seeded app from 1; coordinate result display with 5 |

Agree the completion payload, result schema, revision identifier, and leaderboard response together before splitting implementation. Keep those contracts in the repository. Each owner supplies tests and documentation for their change; owner 6 coordinates acceptance rather than becoming the team's only tester.

Week 1 must end with a deployed seeded puzzle and a real completed solve published to AT Protocol. Week 2 must end with a correct three-account friend leaderboard and sharing flow. Freeze features then. Week 3 is for integration defects, usability, recovery behavior, report, and demo rehearsal. Do not defer the identity/Firebase integration risk until week 2.

## Decisions and evidence still needed

- Confirm that the course accepts result records plus social-graph reuse as sufficient AT Protocol integration. If it requires puzzle records too, revise scope before assigning dependent tasks.
- Ask three to five likely players, including existing Crosshare users, how they currently compare results, whether their puzzle friends use Bluesky, and whether they would publish times publicly. A useful check is whether they can name people they would expect to see on this leaderboard.
- Verify that an unmodified fork runs and that we can access a trustworthy completion event before sizing UI work. Building on Crosshare saves solver work only if we can integrate with it.
- Confirm who supplies the initial puzzle set and how much time each teammate actually has. The older PDF's four-week schedule and assumed hours are not commitments.

The accepted working scope tests daily play among existing Bluesky follows. Creator-owned publishing remains outside the MVP. Any change to that focus should revise the proposal and dependent tasks before implementation expands.
