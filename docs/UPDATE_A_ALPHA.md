# RECOIL X — Update A Alpha

This is a separate development build. Do not change the production Z.5 version number or deploy the alpha before approval. Existing account/inventory data and modes remain compatible.

| Workstream | Integrated in this alpha | Next acceptance gate |
|---|---|---|
| Multiplayer 3.0 | Per-session state delivery counters; optional standard/economy delivery profiles; congestion check before constructing snapshots | Measure RTT, jitter, reconnect and gameplay with two real devices and 10 concurrent users; no fake packet-loss estimate |
| Combat Overhaul | Server-confirmed per-weapon triggers, projectiles, damaging hits, damage and accuracy; own completed-match reports | Verify aim/animation feel, shotgun pellets, blocked shots, accessibility and replay privacy; larger overhaul pending |
| Performance 3.0 | Avoid encoding discarded snapshots; economy profile limits replaceable snapshots to roughly 5 Hz without changing server simulation or reliable events | Device FPS, memory and network profiling; actual GPU asset streaming remains outstanding |
| Security & Accounts | Private list of active sessions, revoke other sessions, login re-check after async password hashing | Concurrent auth, recovery, ban and session tests; review abuse and load limits |
| UI Revolution | Responsive sand control center, keyboard focus management, explicit loading/errors, private report UI, existing Quick Play preserved | Real browser/mobile/TV accessibility and layout QA, translations, complete menu redesign after approval |

## Release gates
- All existing and new automated tests pass.
- Real-device playtest and performance baseline, accessibility inspection, account and inventory migration check, and backup/rollback drill.
- Do not label these five broad workstreams complete merely because their first integrated slices pass tests.
- No promotional claims of lower ping, higher FPS, or full anti-cheat coverage without measurements.

Production remains Z.5 while A is in development. The rest of Update A is not implemented by this pull request.

## Physics Breaker
Original casual knockback mode on Skydeck. Player-facing name: **Physics Breaker**. The internal mode identifier `pawblast` remains stable for compatibility. Ring-outs, charge, respawns and existing controls are unchanged.

## Remaining five workstreams — integrated alpha slices
| Workstream | In this branch | Still required |
|---|---|---|
| Graphics Overhaul | High-end WebGL material pass with warm/cool bounce, rim light and highlight roll-off; low presets unaffected | Real WebGL screenshots, shader compilation on target GPUs, device FPS comparison; full asset redesign not done |
| Bot Intelligence 3.0 | Bounded cached obstacle detours, expiry of seen/heard/shared intel, patrol no longer based on unseen target position | Navigation-mesh coverage and coordination stress tests on complex maps; full AI redesign not done |
| Progression 2.0 | Persistent additive match XP and levels, idempotent awards, no changes to existing inventory | Abuse/load review and broader modes/reward integration |
| Community Expansion | Private-by-default opt-in seasonal leaderboard, reversible visibility | Tournaments, community event moderation, richer social systems |
| Season 1 — New Dawn | Server-clock gate Nov 25, 2026 to Mar 31, 2027 Oman time; XP and four profile milestones | Full themed reward inventory, battle pass, boxes, event assets and date-boundary device tests |

## Operation Server Shield (integrated alpha)
- Defaults: 40 authenticated online players, 12 pending upgrades, 2 concurrent password hash operations, 512 MiB RSS admission threshold. Configurable by server options; numbers are not verified hosting capacity.
- Reject new admissions under capacity/memory pressure with retry guidance, bounded pending authentication, HTTP and socket rate limits, shared login/recovery hash guard, expired-session cleanup.
- Persistent admin-only maintenance toggle and bounded security-event log; monitor RSS, CPU, active/pending connections, authentication jobs. Preserve active matches, pause new match creation/join/queue and party changes.
- Ban/temporary ban now revoke stored sessions as well as disconnecting live clients. Existing moderation and evidence review remain.
- Not yet implemented: fair waiting queue, CAPTCHA/account verification, safe proxy-aware IP blocking, device/browser bans, bulk ban waves, external crash supervisor and restart recovery, hosting-edge DDoS protection. Do not represent these as shipped.
- Admission controls are not a guarantee against attacks or hard memory limit. Real host limits and load testing required before production. Existing Z.5 production deploy remains unchanged.

## Season 1 — Kill Championship
Season end: March 31, 2027, 23:59:59 Oman time (exclusive cutoff April 1 at midnight). Rank by verified kills in eligible completed multiplayer matches settled during the season; the existing 30-second minimum and 20-input participation threshold apply. Raids, parkour, remakes, forfeits, and abandoned matches are excluded. Ties: wins, fewer deaths, then account ID. All qualifying participants compete regardless of public leaderboard visibility, including eligible players with zero kills. Private names remain hidden. Banned accounts are excluded at finalization. First place receives Gold Sandwyrm, second Silver, third Bronze, and all remaining eligible players Blue. One permanent account-bound cosmetic per participant, no purchase, drop, trade or gameplay advantage. Awarding is transactional and idempotent; startup, periodic cleanup and reward reads trigger finalization after the cutoff. The existing Sandwyrm assault rifle finish geometry is preserved; equip through Control Center > Season Kills. Local rendering is not proof of server ownership. No production deployment from this draft branch.

## Curator Mode — Update A alpha
- Control Center > Curator Mode: 17×17 grid, seven types of 3D mesh objects, rotate the preview, replace/erase, and test collect/survive/explore rules using keyboard or directional buttons. Up to 64 objects per project.
- Authenticated SQLite saves (20 projects per account), owner-only edits/deletes, optional unlisted share code, copy to own editor, revocable sharing. Updating a project makes it private again. Shared maps are declarative data, not scripts; no ranked XP, kills, coins or inventory awards.
- Four interactive faceted 3D Sandwyrm reward concept previews in Season Kills. These are not replacement equipped weapon meshes; existing in-match geometry and server reward ownership are preserved.
- Remaining gates: browser/device playtests, CI validation, integrated FPS custom-match runtime and multiplayer lobbies, public moderated discovery, final in-match reward model redesign. Not deployed to Z.5.

## Update A expansion — Curator, New Dawn and Server Shield
- Curator Discovery: an opt-in public browser for approved saved projects. An authenticated admin must review the exact saved revision; edits/unsharing clear approval. Community listings do not reveal account IDs. Private share-code behavior remains.
- Curator co-op: server-authoritative grid movement and shared target/survival objectives, up to 4 players per room and 20 concurrent rooms. Room codes, expiry and inactivity cleanup; unranked, no reward farming. This is a grid mini-game runtime, not yet integration with the main FPS combat engine.
- Rule builder: hazard elimination or respawn; first target pickup can add 0, 5 or 10 seconds (120-second total cap). No arbitrary uploaded executable scripts.
- New Dawn Season Pass: free five-tier account profile badge track, server-verified seasonal XP and idempotent claims during the season. No paid track, weapon inventory items or crates yet.
- Server Shield: bounded FIFO admission queue with expiring offers; refresh and leave controls; existing players prioritized. Queue is process-local and must be rejoined after restart.
- Admin batch ban/unban: preview exact existing non-admin accounts, maximum 10, require typed confirmation and reason, use existing moderation and session revocation; per-account results and audit event. No automated ban waves.
- Sustained WebSocket message floods trigger disconnection; banned accounts leave Curator rooms and admission queue.
- Remaining: main FPS custom-map multiplayer, richer visual scripting and in-match 3D models; full graphics and bot overhaul, broader community/tournaments, device performance QA, themed inventory and seasonal event assets; CAPTCHA/verification provider, proxy-aware IP restrictions, device-ban policy, external process supervisor/recovery and edge DDoS protection. These need separate implementation/hosting configuration and verification. No production release.
- Added node tests for FIFO, moderation/ownership, co-op room isolation, movement and rule enforcement; run complete CI plus real-device tests before any merge/deploy.
