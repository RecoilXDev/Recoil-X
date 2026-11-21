# RECOIL X Z.5 — EVOLUTION + ASCENSION
## Scope, acceptance matrix and deployment safety

### Seventh implementation: Z.5 Tactical Expansion & Quick Play cleanup (2026-11-21)
- Branch: `z5-planned-features-tactical-ui-20261121`. **Status: DEPLOYED to Alwaysdata.** [PR #16](https://github.com/RecoilXDev/Recoil-X/pull/16) merged into main as `bf7ad1ff3dd8fdb36685e6342e81b469dd36874b`; [CI #44923199637](https://github.com/RecoilXDev/Recoil-X/actions/runs/44923199637) passed 102 tests, 0 failed; [Alwaysdata deployment #44923454751](https://github.com/RecoilXDev/Recoil-X/actions/runs/44923454751) passed 16 steps including live identity, gadget/UI assets and server restart.
- **#18 EMP Grenades:** 3.25-second disable on nearby offline bots, proximity-limited and consumes shared gadget stock; ignored in multiplayer/host games to prevent client-only effects.
- **#19 Deployable Shields:** temporary physical cover with 165 HP, 12-second expiry, obstructs existing shooting and movement rays, max two active; placed only in unobstructed solo areas. Not yet network-synchronized.
- **#66 Weapon Blueprints:** Steady (accuracy/slowdown), Rapid (fire rate/spread penalty) and Impact (damage/cadence penalty), unlocked by existing per-gun local mastery; applied directly to offline shot simulation; untouched server-side balance.
- **#15/#76 Training Academy:** original 3D range now offers 90-second Precision (sniper), Tracking (SMG), and Reaction (assault rifle) lessons, moving-target styles, saved best local Bronze/Silver/Gold medals.
- **#85 UI:** Quick Play remains the single primary action in OG Futuristic Arena; four Mode/Locker/Friends/Settings secondary actions; the academy, clans, forge, match hub, and server-authorized Admin move under collapsible More. Tactical gear and blueprints live in settings. Mobile gadget button displays selected item.
- **Preservation:** no database schema changes, no server inventory migration, no alteration to original accounts, older game modes, 500 missions or event schedule. Existing local settings are preserved.
- **Still incomplete:** underwater mode, full multiplayer destructive environments, networked tactical gadgets, clan wars, moving train, zero gravity, new bosses, integrated all-mode mastery, and several other 85-item requirements. Device/performance validation required.



### Z.5 — Visible Combat Update & Clean Navigation (2026-11-21)
- Source branch: `z5-visible-update-clean-ui-20261121`. **Status: LIVE.** Merged as [PR #14](https://github.com/RecoilXDev/Recoil-X/pull/14) at `237e93488f36c846a308ce9485a5bbae397a6f61`. [Alwaysdata deployment #44919850869](https://github.com/RecoilXDev/Recoil-X/actions/runs/44919850869) passed 16 workflow steps, including fresh Z.5 build marker, default offline heat, new menu assets and service worker verification.
- Replaced crowded Z.5 navigation with a prominent Quick Play / Modes / Locker / Friends / Settings flow and a clear "What's New" release panel. Existing advanced menus remain available; Career, Forge and Match Hub move to a compact More Features section.
- Combined bot difficulty, HUD accessibility and combat options into a single settings section; all are reversible. No account saves, missions, 2031 calendar or currency tables are erased.
- Offline weapon overheating is enabled **by default for new/default settings** so solo Quick Play visibly uses the combat update; explicit existing user choices are preserved.
- A release identity `Z.5-CLEAN-2`, refreshed service-worker cache and stricter post-deployment live asset checks prevent a previous generic smoke test from incorrectly validating an older UI.
- Only authenticated admins can see the Admin controls; no public floating admin launcher.
- This is UI/visibility remediation for the deployed combat update, **not delivery of all 85 originally requested features**. Physical mobile/TV QA is still outstanding.



### Z.5 Combat & Quality pass (2026-11-21) — LIVE; remaining backlog incomplete
- Merged via [pull request #13](https://github.com/RecoilXDev/Recoil-X/pull/13), commit `53bfeb5143594b0f88ce643cc549e7940234b85f`; [Alwaysdata deployment #44918624323](https://github.com/RecoilXDev/Recoil-X/actions/runs/44918624323) passed all phases, including upload, restart, live-page check and asset verification.
- **Playable combat**: server-authoritative assault rifle/SMG overheat and cooldown in casual/nonseason multiplayer, with per-player heat HUD. Seasonal/ranked mode balance remains unchanged. Local offline tactical heat is optional in the simple menu.
- **Progression**: local, cosmetic per-weapon mastery labels based on offline hits and bot eliminations. No existing coins, missions, accounts, achievements or server inventory are changed.
- **Bots**: coordinated left/right flanking on Nightmare and peek goal constraints that respect the actual map size (rather than forcing all bots into a 66m area).
- **Performance/accessibility**: cap low-priority tracer/particle lists on mobile, reduce internal render scale conservatively during sustained low FPS, reversible high-visibility reticle.
- **Safety**: guard authoritative input snapshots at 120/second per player; neither client-requested position nor kills are accepted. No full anticheat claim.
- **Verification**: 93 automated tests passed in [Z.5 validation #44918403736](https://github.com/RecoilXDev/Recoil-X/actions/runs/44918403736); deployment succeeded; physical iPhone and multi-player load tests remain outstanding.
- **Status**: this is a targeted quality pass, NOT completion of the original 85 features. All unrelated U/P items stay in the backlog.


**Source branch:** `z5-full-expansion`  
**Base:** main at `75429fdedd6407a1f42c2508401d2360a27eb3d4` (deployed 2026-11-20)  
**Status:** Z.5 INCREMENTAL EXPANSION DEPLOYED to Alwaysdata on November 21, 2026. Deployment and live asset checks succeeded: [GitHub Actions #44903169106](https://github.com/RecoilXDev/Recoil-X/actions/runs/44903169106). **The entire 85-feature request remains INCOMPLETE; many requirements are still partial or unimplemented.**

User request: combine the 50 requirements in *Z.3 Project Ascension*, all 30 Z.5 selected ideas, and five Z.5 foundation categories. These are 85 listed requirements, **not 85 confirmed new implementations**. Similar features should share one reusable system.

Legend: **P** = partial working source in this branch, not end-to-end verified; **E** = related source found in original repository, full acceptance not established; **U** = unimplemented or not yet verified against requirements. No label means production-verified.

### A. Requested Z.3 scope (50)
| # | Feature | State |
|---|---|---|
|1|Payload Escort|E — original expansion mode has escort rules|
|2|Search & Destroy|P — server-timed round-based planting, defusing and first-to-three victory logic|
|3|Capture the Flag|P — dedicated 3D multiplayer menu using existing validated Relic flag/capture engine|
|4|Gun Game|P — playable server-authoritative four-weapon progression, unverified on devices|
|5|One in the Chamber|P — three lives, one starting bullet, refill only on validated elimination|
|6|Bounty Hunt|P — live bonus scoring with short anti-repeat interval|
|7|Hardcore Mode|P — low health and shorter spawn shield; fully reduced HUD not implemented|
|8|PvP Extraction|P — four-stage server-verified supply capture/extraction with combat|
|9|Parkour Race|P — five real server-validated checkpoints, 3D target marker and winner determination|
|10|Duel Roulette|P — 1v1 server-selected equal weapons, timed rounds and first-to-three win|
|11|Dual-Wield Weapons|U|
|12|Weapon Overheating|P — casual multiplayer uses server-controlled heat; offline optional; physical playtesting pending|
|13|Destructible Cover|E — offline X.2 temporary cover damage; full multiplayer destruction not built|
|14|Bullet Ricochet|U|
|15|Advanced Aim Academy|P — three real offline 90-second lessons with weapons and saved medals; no online class progression|
|16|Weapon Mastery Challenges|P — local hits/kill rank labels; complete server-authoritative challenge track missing|
|17|Melee Parry System|U|
|18|EMP Grenades|P — offline-only bot disable; server-side multiplayer integration not implemented|
|19|Deployable Shields|P — offline destructible timed cover; multiplayer validation and sync absent|
|20|Legendary Weapon Evolutions|U|
|21|Clan System|P — new server clans/invites/membership; no clan emblem or clan achievements|
|22|Clan Wars|U|
|23|Player Rivalries|P — server-authoritative match statistics and rival records, not ranked rivalry challenges|
|24|Custom Match Rules|U|
|25|Team Drafting|U|
|26|Broadcast Spectator Mode|U|
|27|Match Rejoin Slots|E — existing overdrive reconnect logic; needs full testing|
|28|Server Browser|P — real public, joinable rooms; copy-code joining through existing UI|
|29|Shareable Match Recaps|P — private participant-only result archive and copyable recaps|
|30|Community Challenge Board|P — verified daily check-in, match, win and elimination challenges|
|31|Moving Train Map|U|
|32|Flooded Laboratory|U|
|33|Zero-Gravity Arena|U|
|34|Volcanic Eruption Event|U|
|35|Titan Mech Raid|U|
|36|Time Fracture Event|U|
|37|Map Builder Lite|E — existing shared maps; full visual builder not verified|
|38|Hidden Puzzle Vaults|U|
|39|Alien Invasion Mode|U|
|40|World Boss Weekends|U|
|41|Server-Authoritative Hit Validation|E — existing server computes hits against cover and validates fire rates; not a complete anti-cheat audit|
|42|Suspicious Movement Detection|U|
|43|Adaptive Network Updates|U|
|44|Packet-Loss Indicator|U — HTTP latency is NOT packet loss|
|45|Automatic Database Backups|P — new private daily WAL snapshot scheduler, seven-backup retention and automated consistency tests; off-host backups and restoration drill pending|
|46|Secure Account Recovery|U|
|47|Input-Based Matchmaking Options|U|
|48|Accessibility Hub|P — persistent HUD display, contrast and reduced-animation controls|
|49|Low-RAM Asset Streaming|U|
|50|Server Health Dashboard|P — administrator-only live occupancy, uptime, memory and match counts in Match Hub|

### B. New Z.5 selected features (30)
| # | Feature | State |
|---|---|---|
|51|Dynamic Destruction|U|
|52|Advanced Parkour|P — server checkpoint race added; wall running and climbing still missing|
|53|Weapon Evolution|U|
|54|Killcam 2.0|U|
|55|Tactical Gadgets|E — existing offline X.2 smoke/flash/decoy/scanner; networked version not built|
|56|Procedural Arenas|P — randomized server-generated cover in Chaos mode; full arena generator not complete|
|57|Map Hazards|P — timed central damage corridor in Chaos mode with notices/indicator|
|58|Underwater Combat|U|
|59|Boss Raids|E — original raid mode exists, broader requirements unverified|
|60|Extraction Mode 2.0|P — four-checkpoint PvP Extraction; advanced inventory extraction not built|
|61|Clan System|P — same shared server system as #21|
|62|Friend Parties|U|
|63|Trading Hub|P — escrow-based direct cosmetic trade offers, acceptance and expiry|
|64|Auction House|P — item escrow, separate Z.5 currency, buying and refunds|
|65|Crafting Laboratory|P — server-validated Kingdom Scrap recipes; original 3D skins not yet applied|
|66|Weapon Blueprints|P — local mastery unlocks three mods with actual combat stat effects; server inventory missing|
|67|Seasonal Story Missions|P — three persistent story chapters tracked from verified matches; full seasonal calendar not integrated|
|68|Daily Login Rewards|P — server-side, idempotent Z.5 points, not existing coins|
|69|Prestige System|P — up to ten separate Z.5 prestige levels, earned with match milestones and points; does not affect old level saves|
|70|Player Titles|P — three unlock conditions and equipping, not integrated into global nameplates|
|71|Photo Mode|E — X.4 screenshot attempt and replay trace, not full camera mode|
|72|Weather 2.0|E — existing cosmetic weather; advanced lighting/interaction not built|
|73|Character Customization|E — local suit/helmet/backpack; network model sync not verified|
|74|Custom HUD Editor|P — visibility, contrast and animation controls; drag-and-drop not built|
|75|Replay Theater|P — play/scrub recorded match-event timeline only; not full 3D footage|
|76|Training Academy|P — Precision, Tracking and Reaction lessons with local medals; broader coursework unfinished|
|77|Accessibility Suite|P — Classic preference controls and reduced motion; full remapping not built|
|78|Network Diagnostics|P — live five-request HTTP timing and range; actual WebSocket packet loss still unsupported|
|79|Admin Audit Log|P — role-gated in-game Z.5 Admin console combines moderation ledger, coin grants, Z.5 activity and server health|
|80|Anti-Cheat Foundations|P — 120 input/s server guard plus existing validation, no comprehensive security audit|

### C. Five foundation categories
| # | Category | State |
|---|---|---|
|81|Gameplay overhaul|P — ten server mode implementations in development and tactical offline bots; wider overhaul unfinished|
|82|Economy and inventory overhaul|P — separate Z.5 points ledger; NOT joined with original economy|
|83|Real multiplayer overhaul|E — existing Node/WebSocket/SQLite backend; Z.5 overhaul unverified|
|84|Mobile and performance overhaul|P — lightweight classic arena and amortized bot tactics; physical FPS benchmarks pending|
|85|Graphics and UI overhaul|P — unified in-game Career, Forge, Match Hub and admin-only tab; Classic Quick Play and accessibility preferences; full graphics overhaul unfinished|

### Production deployment — unified Z.5 menus and admin gating (2026-11-21)
- RELEASED: Pull request [#12](https://github.com/RecoilXDev/Recoil-X/pull/12), commit `b27dff483b725ff918fc460e21b71866104c3692`.
- DEPLOYED: [Alwaysdata GitHub Actions #44916037435](https://github.com/RecoilXDev/Recoil-X/actions/runs/44916037435) passed the complete regression suite, file upload, dependency installation, restart, website check and live menu/admin asset verification.
- ACTIVE: game account sync, in-game Career & Clans / Forge & Market / Match Hub, hidden legacy LAB launch, and role-gated updated Admin console with health and activity audit.
- **NOT FULLY COMPLETE:** The 85-feature tracker remains a delivery backlog. The deployment did not add unimplemented underwater combat, dynamic world destruction, advanced raids, new weapons or all missing game systems. Device and load testing is still outstanding.

### Sixth implementation pass — unified in-game Z.5 and restricted administration (2026-11-21)
- `server/z5-ingame.js`: native Z.5 Career & Clans, Forge & Market and Match Hub buttons inside simplified, advanced and pause menus. There is no permanent Z.5 LAB floating launcher.
- `server/z5-panel.js`: Career & Clans replaces the old Z.5 LAB wording and floating menu; its account sign-in is synchronized with the normal RECOIL X account session.
- `index.html`: single session store synchronization between game account and Z.5; visible version branding uses Z.5; does not change game name or wipe previous saves.
- `server/admin-panel.js`: no public floating admin button, independent admin token or separate administrator sign-in. The Admin tab is hidden until `/rx-api/me` verifies the actual signed-in account's `admin` role; checks repeat on login/focus/open. Server still enforces authorization for all moderation endpoints.
- Admin view renewed with live server health and Z.5 activity history alongside bans, mutes, kicks and audited coin grants. Coin grants still affect a server bonus wallet, not the old browser-only coin store.
- `server/server.mjs`: serves and loads the in-game integration module.
- `tests/z5-ingame-admin.test.mjs`: integrated menu checks, authenticated server permission checks for normal/admin/revoked roles and source sanity checks.
- **85-feature scope is still incomplete.** This patch reorganizes and secures implemented features; it does not invent missing weapons, levels, boss raids, advanced physics or anti-cheat systems.


## Implemented in development branch in this initial pass
- \`server/z5-core.mjs\`: non-destructive migration, persistent clan membership and invitations, leader-only controls, max 40 members, rate-limit integration, daily server-day (Asia/Muscat) rewards, a player-title foundation, and permissioned activity records.
- \`server/server.mjs\`: authenticated \`/rx-api/z5/*\` routes and a standalone overlay loader; existing routes remain.
- \`server/z5-panel.js\`: a functioning separate panel for login, clan operations, reward claims, title selection, HTTP latency, and Z.5 admin audit.
- \`tests/z5-core.test.mjs\`: automated module-level regression tests.

### Second implementation pass (new on the same development branch)
- `server/z5-economy.mjs`: Z.5 inventory and equipment persistence, server-only match rewards, replay-protected award ledger, escrow auction listings and direct trades, fixed crafting recipes, expiry recovery, and match rivalry records.
- `server/z5-challenges.mjs`: Oman-day challenge progress from trusted matches/check-ins, three story chapters, rewards, and a Z.5-only prestige track.
- `server/z5-economy-panel.js`: Armory & Market, crafting, trading, auction, rivalry stats, challenges, story and prestige.
- `server/overdrive.mjs`: delegates finished authoritative matches to Z.5; old settlement logic is retained.
- `tests/z5-economy.test.mjs` and `tests/z5-challenges.test.mjs`: transaction, ownership, replay, expiry, rewards and validation tests.
- `.github/workflows/z5-validation.yml`: independent CI on the development branch, with no deployment action.

### Third implementation pass — full expansion branch (new, unmerged)
- `server/z5-combat-modes.mjs`: eight playable server-authoritative modes: Gun Game, One in the Chamber, Hardcore, Bounty, randomized-cover Chaos, and Parkour Race with validated checkpoints.
- `server/overdrive-match.mjs`, `server/overdrive.mjs`: shared combat/score/movement integration, fair size restrictions, public lobby discovery and room statistics.
- `index.html`: real multiplayer menu options for all six modes, server-synchronized arena render markers for hazards and parkour targets.
- `server/z5-operations.mjs`: privacy-gated past match archive, match-event recap and event timeline playback, diagnostics and admin-only server health.
- `server/z5-matchhub.js`: accessible Match Hub with public lobby codes, personal match recaps, timeline playback and operational status.
- `server/z5-panel.js` and `server/server.mjs`: navigation and authenticated server integration.
- `tests/z5-combat-modes.test.mjs`, `tests/z5-operations.test.mjs`, and `tests/z5-client-menu.test.cjs`: authoritative scoring, mode menus, JS syntax, permission and privacy checks.
- `.github/workflows/z5-validation.yml`: Node 24 validation on this branch. No production deployment.

### Fourth implementation pass — Operation Simplicity + Tactical AI (2026-11-21)
- `index.html`: Added OG Futuristic Arena (`og-future`), a lightweight symmetrical sci-fi arena reconstructed from the user-approved concept. **Exact Zone 90 geometry was not found in available older repository versions.**
- `index.html`: Quick Play starts a five-minute local Classic match immediately without map voting. New simplified menu preserves access to original Modes, Locker, Friends, Settings, and Advanced menu. Preference is saved locally.
- `index.html`: Standard (original), Veteran and Nightmare bot settings. Tactical bots plan cover, flank, investigate last known locations and gunfire, share short-range sightings, retreat, hide, peek and react before shooting. No wall-shooting; plans are amortized. Duel and hosted bot modes also covered.
- `index.html`: Minimap/killfeed toggles, high-contrast HUD and reduced-motion preference. Not a full drag-and-drop HUD editor.
- `server/z5-combat-modes.mjs`: Server-timed Search & Destroy planting/defusing and four-stage PvP Extraction interactions.
- `server/overdrive-match.mjs`: Multiplayer scoring, respawn and objective state integration with previous gameplay engine.
- `tests/z5-simplicity-bots.test.cjs` and `tests/z5-combat-modes.test.mjs`: Basic map, menu, AI cover and match timing tests.
- This increment was deployed to Alwaysdata on November 21 after CI and website checks. Physical mobile/browser QA, server load, and account backup-restore drills remain outstanding.

### Fifth implementation pass — deployment safeguards (2026-11-21)
- `server/z5-backups.mjs`: database WAL-consistent snapshots every 24 hours, private `0700` folder / `0600` files, retention of seven scheduled copies, errors logged without crashing the live game. This does not replace off-site backups.
- `server/server.mjs`: backup scheduler starts after additive migrations and stops on shutdown. Existing player SQLite file remains untouched by rsync.
- `tests/z5-backups.test.mjs`: actual SQLite snapshots, retention, privacy, content validation and in-memory no-op coverage.
- `tests/z5-server-smoke.test.mjs`: starts staging server using in-memory SQLite and verifies Classic map, Z.5 modes, Match Hub, and private route protections.
- `.github/workflows/deploy-alwaysdata.yml`: pre-deploy Node 24 validation plus post-restart verification of the new live Z.5 game page, Match Hub and map.
- **This is a deployed partial release of implemented features, NOT completion of all 85 requirements.** Items listed U and unfinished portions of P remain in the backlog.

**Important limitations**
- Existing browser-only coin/shop balances are NOT equivalent to the new Z.5 points; no exchanges or real-money commerce are supported.
- Clan emblems, clan wars and friend parties are not implemented. Z.5-only trading and auctions exist but require wider integration and security/load testing.
- Z.5 crafted cosmetics are persistent inventory records, not yet visual 3D weapons. Story chapters are not yet seasonal-calendar driven. New modes are implemented in the actual 3D engine but await live multi-device, multiplayer and performance QA. The smarter bots and reconstructed map have not yet been stress-tested on physical devices. No full 10-player load benchmark or live-device FPS proof.
- No production database was accessed or modified.
- The existing >1 MB `index.html` is updated through Git blobs with the eight new multiplayer options and objective markers; the Z.5 overlay scripts are still injected by the development server response.

## Data and release protection
1. Preserve all existing accounts, credentials, ban records, friends, DMs, mission saves (all 500 levels), season content, maps and inventories.
2. Before new tables are created on an existing database, \`migrateZ5\` invokes the repository's SQLite \`backupBeforeMigration\` helper. Restore procedures still need to be tested against a safe copy.
3. Run \`node --test tests/z5-core.test.mjs\`, server syntax checks, existing regression suites and manual tests in a staging copy. Document failures, skips and device coverage.
4. Verify compatibility of module imports and server startup with Node >=24 and \`faye-websocket\` at the repository's pinned version.
5. Do not commit to `main`, change secrets, use the live SQLite database, restart production, or merge the new expansion until its complete build is tested and reviewed.

### Future implementation sequence
1. Audit Z.3 coverage and refactor shared engine state without breaking original modes.
2. Finish foundational server validation, source-level anticheat, inventory migration and atomic trade model.
3. Implement all remaining gameplay modes, combat, maps, bots, training and visuals in staging.
4. Add parties, clan emblems/war features, trade, auction, replay and server recaps.
5. Finish mobile/hardware profiles, accessibility, network diagnostics and production hardening.
6. Full integration and regression QA; provide a reviewed release PR and explicit rollback.

Reference technical guidance: https://docs.github.com/en/pull-requests ; https://www.sqlite.org/backup.html ; https://owasp.org/www-project-top-ten/
