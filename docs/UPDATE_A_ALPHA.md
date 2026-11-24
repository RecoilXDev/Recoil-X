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
