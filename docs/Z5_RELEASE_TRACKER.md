# RECOIL X Z.5 — EVOLUTION + ASCENSION
## Scope, acceptance matrix and deployment safety

**Source branch:** \`z5-evolution-ascension\`  
**Base:** main at \`dbe0165754f79d5e1034d49c1c6f81d3cb613a58\` (2026-11-19)  
**Status:** IN DEVELOPMENT — **NOT PRODUCTION READY**. No merge/deployment approved.

User request: combine the 50 requirements in *Z.3 Project Ascension*, all 30 Z.5 selected ideas, and five Z.5 foundation categories. These are 85 listed requirements, **not 85 confirmed new implementations**. Similar features should share one reusable system.

Legend: **P** = partial working source in this branch, not end-to-end verified; **E** = related source found in original repository, full acceptance not established; **U** = unimplemented or not yet verified against requirements. No label means production-verified.

### A. Requested Z.3 scope (50)
| # | Feature | State |
|---|---|---|
|1|Payload Escort|E — original expansion mode has escort rules|
|2|Search & Destroy|U|
|3|Capture the Flag|U|
|4|Gun Game|U|
|5|One in the Chamber|U|
|6|Bounty Hunt|U|
|7|Hardcore Mode|U|
|8|PvP Extraction|U|
|9|Parkour Race|E — related existing practice/mode references|
|10|Duel Roulette|U|
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
|28|Server Browser|U|
|29|Shareable Match Recaps|U|
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
|41|Server-Authoritative Hit Validation|U — audit current overdrive match logic|
|42|Suspicious Movement Detection|U|
|43|Adaptive Network Updates|U|
|44|Packet-Loss Indicator|U — HTTP latency is NOT packet loss|
|45|Automatic Database Backups|P — backup-before-migration exists; no recurring backups proven|
|46|Secure Account Recovery|U|
|47|Input-Based Matchmaking Options|U|
|48|Accessibility Hub|U|
|49|Low-RAM Asset Streaming|U|
|50|Server Health Dashboard|P — original admin overview exists, not full monitoring|

### B. New Z.5 selected features (30)
| # | Feature | State |
|---|---|---|
|51|Dynamic Destruction|U|
|52|Advanced Parkour|U|
|53|Weapon Evolution|U|
|54|Killcam 2.0|U|
|55|Tactical Gadgets|U|
|56|Procedural Arenas|U|
|57|Map Hazards|U|
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
|75|Replay Theater|U|
|76|Training Academy|U|
|77|Accessibility Suite|U|
|78|Network Diagnostics|P — panel measures HTTP round-trip; jitter/packet loss not implemented|
|79|Admin Audit Log|P — server-side Z.5 activity log plus existing Z.2/admin log|
|80|Anti-Cheat Foundations|U|

### C. Five foundation categories
| # | Category | State |
|---|---|---|
|81|Gameplay overhaul|U|
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

**Important limitations**
- Existing browser-only coin/shop balances are NOT equivalent to the new Z.5 points; no exchanges or real-money commerce are supported.
- Clan emblems, clan wars and friend parties are not implemented. Z.5-only trading and auctions exist but require wider integration and security/load testing.
- Z.5 crafted cosmetics are persistent inventory records, not yet visual 3D weapons. Story chapters are not yet seasonal-calendar driven. There is no proof of full multiplayer load, low-end device FPS, new weapons or modes, mobile touch experience, or production stability.
- No production database was accessed or modified.
- The HTML frontend is large and is served unchanged: the overlay is inserted by the development server response.

## Data and release protection
1. Preserve all existing accounts, credentials, ban records, friends, DMs, mission saves (all 500 levels), season content, maps and inventories.
2. Before new tables are created on an existing database, \`migrateZ5\` invokes the repository's SQLite \`backupBeforeMigration\` helper. Restore procedures still need to be tested against a safe copy.
3. Run \`node --test tests/z5-core.test.mjs\`, server syntax checks, existing regression suites and manual tests in a staging copy. Document failures, skips and device coverage.
4. Verify compatibility of module imports and server startup with Node >=24 and \`faye-websocket\` at the repository's pinned version.
5. Do not commit to \`main\`, change secrets, use the live SQLite database, restart production, or merge until the owner reviews the complete, tested release candidate.

### Future implementation sequence
1. Audit Z.3 coverage and refactor shared engine state without breaking original modes.
2. Finish foundational server validation, source-level anticheat, inventory migration and atomic trade model.
3. Implement all remaining gameplay modes, combat, maps, bots, training and visuals in staging.
4. Add parties, clan emblems/war features, trade, auction, replay and server recaps.
5. Finish mobile/hardware profiles, accessibility, network diagnostics and production hardening.
6. Full integration and regression QA; provide a reviewed release PR and explicit rollback.

Reference technical guidance: https://docs.github.com/en/pull-requests ; https://www.sqlite.org/backup.html ; https://owasp.org/www-project-top-ten/
