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
| Season 1 — New Dawn | Server-clock gate Jan 1 to Mar 31, 2027 Oman time; XP and four profile milestones | Full themed reward inventory, battle pass, boxes, event assets and date-boundary device tests |

## Operation Server Shield (integrated alpha)
- Defaults: 40 authenticated online players, 12 pending upgrades, 2 concurrent password hash operations, 512 MiB RSS admission threshold. Configurable by server options; numbers are not verified hosting capacity.
- Reject new admissions under capacity/memory pressure with retry guidance, bounded pending authentication, HTTP and socket rate limits, shared login/recovery hash guard, expired-session cleanup.
- Persistent admin-only maintenance toggle and bounded security-event log; monitor RSS, CPU, active/pending connections, authentication jobs. Preserve active matches, pause new match creation/join/queue and party changes.
- Ban/temporary ban now revoke stored sessions as well as disconnecting live clients. Existing moderation and evidence review remain.
- Not yet implemented: fair waiting queue, CAPTCHA/account verification, safe proxy-aware IP blocking, device/browser bans, bulk ban waves, external crash supervisor and restart recovery, hosting-edge DDoS protection. Do not represent these as shipped.
- Admission controls are not a guarantee against attacks or hard memory limit. Real host limits and load testing required before production. Existing Z.5 production deploy remains unchanged.
