# RECOIL X Z.5 — EVOLUTION + ASCENSION
## Scope, acceptance matrix and deployment safety

**Source branch:** `z5-full-expansion`  
**Base:** main at `75429fdedd6407a1f42c2508401d2360a27eb3d4` (deployed 2026-11-20)  
**Status:** FULL EXPANSION WIP — **NOT PRODUCTION READY**. The previous partial Z.5 build is live; these additional changes remain isolated and unmerged.

User request: combine the 50 requirements in *Z.3 Project Ascension*, all 30 Z.5 selected ideas, and five Z.5 foundation categories. These are 85 listed requirements, **not 85 confirmed new implementations**. Similar features should share one reusable system.

Legend: **P** = partial working source in this branch, not end-to-end verified; **E** = related source found in original repository, full acceptance not established; **U** = unimplemented or not yet verified against requirements. No label means production-verified.

### A. Requested Z.3 scope (50)
| # | Feature | State |
|---|---|---|
|1|Payload Escort|E — original expansion mode has escort rules|
|2|Search & Destroy|U|
|3|Capture the Flag|P — dedicated 3D multiplayer menu using existing validated Relic flag/capture engine|
|4|Gun Game|P — playable server-authoritative four-weapon progression, unverified on devices|
|5|One in the Chamber|P — three lives, one starting bullet, refill only on validated elimination|
|6|Bounty Hunt|P — live bonus scoring with short anti-repeat interval|
|7|Hardcore Mode|P — low health and shorter spawn shield; fully reduced HUD not implemented|
|8|PvP Extraction|U|
|9|Parkour Race|P — five real server-validated checkpoints, 3D target marker and winner determination|
|10|Duel Roulette|P — 1v1 server-selected equal weapons, timed rounds and first-to-three win|
|11|Dual-Wield Weapons|U|
|12|Weapon Overheating|U|
|13|Destructible Cover|U|
|14|Bullet Ricochet|U|
|15|Advanced Aim Academy|U|
|16|Weapon Mastery Challenges|U|
|17|Melee Parry System|U|
|18|EMP Grenades|U|
|19|Deployable Shields|U|
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
|45|Automatic Database Backups|P — backup-before-migration exists; no recurring backups proven|
|46|Secure Account Recovery|U|
|47|Input-Based Matchmaking Options|U|
|48|Accessibility Hub|U|
|49|Low-RAM Asset Streaming|U|
|50|Server Health Dashboard|P — administrator-only live occupancy, uptime, memory and match counts in Match Hub|

### B. New Z.5 selected features (30)
| # | Feature | State |
|---|---|---|
|51|Dynamic Destruction|U|
|52|Advanced Parkour|P — server checkpoint race added; wall running and climbing still missing|
|53|Weapon Evolution|U|
|54|Killcam 2.0|U|
|55|Tactical Gadgets|U|
|56|Procedural Arenas|P — randomized server-generated cover in Chaos mode; full arena generator not complete|
|57|Map Hazards|P — timed central damage corridor in Chaos mode with notices/indicator|
|58|Underwater Combat|U|
|59|Boss Raids|E — original raid mode exists, broader requirements unverified|
|60|Extraction Mode 2.0|U|
|61|Clan System|P — same shared server system as #21|
|62|Friend Parties|U|
|63|Trading Hub|P — escrow-based direct cosmetic trade offers, acceptance and expiry|
|64|Auction House|P — item escrow, separate Z.5 currency, buying and refunds|
|65|Crafting Laboratory|P — server-validated Kingdom Scrap recipes; original 3D skins not yet applied|
|66|Weapon Blueprints|U|
|67|Seasonal Story Missions|P — three persistent story chapters tracked from verified matches; full seasonal calendar not integrated|
|68|Daily Login Rewards|P — server-side, idempotent Z.5 points, not existing coins|
|69|Prestige System|P — up to ten separate Z.5 prestige levels, earned with match milestones and points; does not affect old level saves|
|70|Player Titles|P — three unlock conditions and equipping, not integrated into global nameplates|
|71|Photo Mode|U|
|72|Weather 2.0|U|
|73|Character Customization|U|
|74|Custom HUD Editor|U|
|75|Replay Theater|P — play/scrub recorded match-event timeline only; not full 3D footage|
|76|Training Academy|U|
|77|Accessibility Suite|U|
|78|Network Diagnostics|P — live five-request HTTP timing and range; actual WebSocket packet loss still unsupported|
|79|Admin Audit Log|P — server-side Z.5 activity log plus existing Z.2/admin log|
|80|Anti-Cheat Foundations|U|

### C. Five foundation categories
| # | Category | State |
|---|---|---|
|81|Gameplay overhaul|P — six actual 3D server game modes; broader overhaul unfinished|
|82|Economy and inventory overhaul|P — separate Z.5 points ledger; NOT joined with original economy|
|83|Real multiplayer overhaul|E — existing Node/WebSocket/SQLite backend; Z.5 overhaul unverified|
|84|Mobile and performance overhaul|U|
|85|Graphics and UI overhaul|P — accessible new Z.5 overlay only; not a game-wide redesign|

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

**Important limitations**
- Existing browser-only coin/shop balances are NOT equivalent to the new Z.5 points; no exchanges or real-money commerce are supported.
- Clan emblems, clan wars and friend parties are not implemented. Z.5-only trading and auctions exist but require wider integration and security/load testing.
- Z.5 crafted cosmetics are persistent inventory records, not yet visual 3D weapons. Story chapters are not yet seasonal-calendar driven. New modes are implemented in the actual 3D engine but await live multi-device, multiplayer and performance QA. No full 10-player load benchmark or live-device FPS proof.
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
