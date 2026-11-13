# Delivery tasks

Working scope is the accepted [refined proposal](../proposal/refined-proposal.md). The [GitHub Project](https://github.com/orgs/CSE-210-Group-09/projects/3) is the current task/status tracker. Issues have acceptance criteria and dependency links. Owners remain unassigned for team allocation.

| Issue | Week | Task |
| --- | --- | --- |
| [#1](https://github.com/CSE-210-Group-09/bsky-xword/issues/1) | 1 | Prototype: pin and run Crosshare; locate solver and auth integration boundaries |
| [#2](https://github.com/CSE-210-Group-09/bsky-xword/issues/2) | 1 | Prototype: completion payload, puzzle revision, and result contract |
| [#3](https://github.com/CSE-210-Group-09/bsky-xword/issues/3) | 1 | Prototype: paginated Bluesky follows and per-puzzle friend ranking |
| [#4](https://github.com/CSE-210-Group-09/bsky-xword/issues/4) | 1 | Prototype: OAuth connection and server-verified Firebase identity binding |
| [#5](https://github.com/CSE-210-Group-09/bsky-xword/issues/5) | 1 | Integrate a pinned Crosshare derivative with seeded solver and CI |
| [#6](https://github.com/CSE-210-Group-09/bsky-xword/issues/6) | 1 | Implement OAuth session and Bluesky account connection in the app |
| [#7](https://github.com/CSE-210-Group-09/bsky-xword/issues/7) | 1 | Implement immutable puzzle revisions and daily mini manifest |
| [#8](https://github.com/CSE-210-Group-09/bsky-xword/issues/8) | 1 | Integrate first-completion capture and explicit result-publication UX |
| [#9](https://github.com/CSE-210-Group-09/bsky-xword/issues/9) | 1 | Publish and read back result records with idempotent retries |
| [#10](https://github.com/CSE-210-Group-09/bsky-xword/issues/10) | 2 | Build derived result index and participant reconciliation |
| [#11](https://github.com/CSE-210-Group-09/bsky-xword/issues/11) | 2 | Integrate personalized friend leaderboard and error states |
| [#12](https://github.com/CSE-210-Group-09/bsky-xword/issues/12) | 2 | Add spoiler-free Bluesky compose sharing |
| [#13](https://github.com/CSE-210-Group-09/bsky-xword/issues/13) | 1 | Validate course fit, player interest, and puzzle supply |
| [#14](https://github.com/CSE-210-Group-09/bsky-xword/issues/14) | 2 | Verify staged three-account flow and recovery behavior |
| [#15](https://github.com/CSE-210-Group-09/bsky-xword/issues/15) | 3 | Prepare release, reproducibility guide, report, and fallback demo |

Start with #1–#4 to resolve integration risks. #13 can run alongside technical work. The first prototypes for #1, #2, and #3 have separate PRs; review each independently. OAuth #4 still needs an owner and a real-account callback test.

Week 1 ends with a deployed seeded solver and a real completed solve published and read back from AT Protocol. Week 2 ends with the three-account leaderboard and sharing flow, followed by feature freeze. Week 3 is for defects, recovery, report, and demo.

Each implementation issue gets a focused branch and PR linked to that issue. Keep the first-completion payload and puzzle revision contract consistent across workstreams. Each owner supplies tests and setup notes for their changes. Do not mark a spike or feature complete based solely on source inspection or fixture tests when its acceptance criteria require a live integration.
