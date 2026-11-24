# Update A — Beta candidate (B3)
This branch inherits all Alpha workstreams. It is not a certified Beta release and must not deploy to the public Z.5 server.
## Run a separate instance
From repository root, using Node 24:
```sh
npm install --prefix server --no-audit --no-fund
RX_CHANNEL=beta RX_DB=./recoil-x-beta.sqlite RX_BIND=127.0.0.1 PORT=8788 node server/a-beta-supervisor.mjs
```
Use a separate hosting site, working directory, database, backups, session keys and test accounts; never point Beta at production data. The supervisor is opt-in; confirm your host permits child processes. Existing in-memory matches cannot survive a process crash.
The health endpoint /rx-api/health reports channel beta and readyForProduction false only when RX_CHANNEL=beta. Shield capacity environment variables: RX_MAX_PLAYERS (40), RX_MAX_PENDING (12), RX_MAX_RSS_MIB (512), RX_MAX_AUTH_JOBS (2), RX_MAX_QUEUE (100). These are policy defaults, not host benchmarks.
## Workstream gates
| Workstream | Candidate scope | Beta gate |
|---|---|---|
| Multiplayer 3.0 | delivery profiles and reports | two devices; 10 concurrent; RTT/jitter/reconnect |
| Combat | confirmed hits and statistics | weapon/animation/hit tests |
| Performance | replaceable snapshot throttling | FPS and memory on mobile/TV/PC |
| Security & Accounts | revoke sessions; rate limits; moderation | simultaneous login/ban/recovery tests |
| UI | Sand control center | keyboard, controller, mobile and TV checks |
| Graphics | shader pass, reward previews | GPU compatibility; actual equipped model work |
| AI bots | cached detours and timed intel | navigation and group behavior scenarios |
| Progression | persistent XP and badges | duplicate and abuse tests |
| Community | leaderboard and moderated discovery | permission and moderation checks; tournaments pending |
| Season 1 | Nov 30 opening, kill competition, free badge pass | date boundaries; reward award/claim; themed inventory pending |
| Physics Breaker | knockback and ring-outs | multiplayer movement and fairness |
| Curator | 3D editor, co-op grid, event rules, first-person solo view | save/share/moderation; room isolation; main FPS engine integration pending |
| Shield | queue, maintenance, memory/auth guard, batch moderation, opt-in restart supervisor | capacity, recovery/rollback, hosting-edge security |
## B1 changes
- First-person solo Curator playtest with wall occlusion and relative movement. It is not the main FPS combat engine.
- Co-op UI isolation and stale-response protection.
- Shield admission offers suspended while capacity/maintenance/memory pressure prevents admission.
- Explicit Beta release channel and separate default database.
- Standalone restart supervisor with bounded exponential retry. No match restoration.
- Non-deploying Node 24 CI workflow and additional regression tests.
## Promotion checklist
1. Green full CI, inspect test output and resolve all failures. No skipped failures.
2. Run isolated staging, create test accounts, verify saves, moderation, progression and Season 1 date boundaries.
3. Test 2-device, 4-player Curator and 10-player load; verify server capacity, queue expiry and maintenance.
4. Test low graphics on iPhone 8 Plus, phone/tablet controls, TV/controller and desktop; compare FPS/memory to Z.5.
5. Verify DB backup restoration on a copy, kill the Beta process and verify supervisor recovery; confirm no production data is touched.
6. Finish outstanding core work, hosting CAPTCHA/edge protection where supported, and document device-ban/privacy policy. Do not claim DDoS immunity.
7. Only after approval, consider production promotion. Do not merge this branch automatically.

## B2 — real multiplayer test candidate
- Saved Curator maps can now create a password-protected classic Arena FPS room (1/2/3/5 players per side), through the authenticated existing multiplayer WebSocket. No separate matchmaking or duplicate account system. Only an owned or shared project can host. Existing team spawns are reserved outside custom geometry. Blocks, walls, trees and ramps convert to server collision cover; ramps are currently low rectangular cover. Collectibles, hazards and no-code rules remain in the separate grid mini-game runtime. Curator FPS matches are unranked and bypass match rewards, XP and weapon mastery. The server sends its validated field to all players and reconnects.
- Control Center > Connection > Measure connection records five real authenticated HTTP round trips; this is not in-match WebSocket ping or packet loss.
- Test: sign into two separate test accounts, connect to Multiplayer, open Curator Mode, save a map, select Host FPS, enter password and team size. Share room code/password with the other account; join using existing Multiplayer controls, return to lobby, start, verify collision, combat, respawn, and disconnect/rejoin before the 20-second grace period. Repeat with 4/6/10 players. Verify no coins, XP, mastery, ranked points or season kills are awarded. The new two-WebSocket test is committed but full CI and actual client rendering remain unverified.
- Beta B2 is not deployed. Full bot/graphics/equipped model polish, richer visual scripting, community tournaments, real-device QA, hosting-edge protection and measured load/recovery testing remain incomplete. Do not promote production until the release gates pass.

## B3 — Combat, Graphics and Bot Intelligence candidate scope
- Combat: server cancels unfinished reload on weapon switch without granting ammunition, skips targets eliminated earlier in a multi-projectile shot, avoids empty tracer events, resets per-connection input limits on reconnect. Existing weapon stats, confirmed hits, server collision and original fire intervals remain. Candidate requires live combat/animation and device tests.
- Graphics: actual equipped New Dawn Sandwyrm assault-rifle geometry uses the four server-authorized seasonal finishes. High-tier shader adds distance-faded ground microdetail and grazing-angle metal highlights; low-tier lighting is unchanged, and weapon trim geometry has a reduced detail path. Candidate requires real GPU shader compilation, screenshots and frame-time measurements; the reward preview is still a concept model, not a pixel-identical in-game mesh.
- Bot Intelligence: bounded two-hop visibility search around nearby obstacle corners, per-bot cached planning, tighter collision sampling, no unseen target position used for peek direction, and a fresh occlusion/smoke check before firing. Existing standard mode remains. Candidate requires complex-map stress tests and actual bot FPS/playability checks; this is not a full navmesh rewrite.
- Verified in development smoke checks: both inline index scripts parse, extracted route code finds a reachable detour and returns no detour for a clear route; actual server match module and its ten-module dependency graph executed weapon switch/ammo preservation and reconnect input checks successfully. New regression test is committed. Full Node 24 CI and real device tests remain unverified. All thirteen workstreams now have candidate implementations; do not interpret this as completion of every proposed feature or a stable public release.
