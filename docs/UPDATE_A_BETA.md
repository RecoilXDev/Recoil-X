# Update A — Beta candidate (B6)
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
| Season 1 | Nov 25 opening, kill competition, free badge pass | date boundaries; reward award/claim; themed inventory pending |
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

## B4 — stability and optimization pass
- Bot navigation: cheap direct continuation before two-hop probes, narrower fallback search and shared one/two planning calls per simulation frame (low/other graphics). Deferred bots retain existing steering until their next planning slot. In one fixed synthetic obstacle fixture, extracted B4 route code performed 676 collision probes including final path validation, versus 1328 reported for B3; this is a fixture result, not an FPS benchmark.
- Server Shield counts malformed/binary/oversized messages before JSON parsing, rejects stale sockets, and disconnects hard-backlogged sockets before skipping replaceable state. Unauthenticated upgrade timeout closes the underlying transport.
- Curator co-op retries transient state polling failures up to five times, uses eight-second request timeout, distinguishes authorization/not-found responses, and uses indexed grid collision and cached target/spawn metadata.
- Smoke checks passed: two inline game scripts parsed; four changed/test modules parsed; low/other graphics planning limits and reachable obstacle detour; indexed Curator blocked movement and objective completion. Full CI, device GPU/FPS, real multiplayer and staging are not verified. No production deployment.

## B5 — low-end first
- All 13 workstreams retain Beta candidate implementations. B5 expands two previously unfinished subfeatures: server-owned seasonal title inventory with equip/unequip and a validated Curator hazard respawn/time-penalty rule in solo and co-op. The title equip state is shown in the private reward track; not yet a global nameplate title. Curator save revisions strictly increase even for same-millisecond saves.
- Hard internal framebuffer caps: Pi Lite 320k, School/TV 650k, Balanced 1.6m, Max 3.6m pixels; mobile thermal caps can reduce them further. TV user agents and desktops with no hardware hints auto-select conservative School profile unless already identified as Pi. User-selected profiles remain available. No effect on multiplayer simulation, hitboxes or network protocol.
- Fractional frame pacing avoids rounding a 24/45 FPS target down to a fixed divisor of the display refresh; menu and paused 3D drawing capped at approximately 8/12 FPS, while service loop continues. Low shader fast path skips expensive material math when advanced effects are inactive. Shader objects released after linking; oversized dynamic GPU/CPU buffers reset on map transitions.
- Smoke checks: both inline scripts and seven changed/test modules parsed; 12 framebuffer dimension cases passed; Curator penalty and respawn executed successfully. SQLite title ownership test committed but not executed here. Pixel caps are workload limits, not measured device FPS. New full themed weapon crates, richer community features, GPU asset streaming and host-side CAPTCHA/DDoS protections remain outside this candidate scope. Full CI, actual low-end hardware QA and multiplayer staging remain release blockers.

## B6 — Curator and multiplayer lobbies

- **Curator Studio** keeps the last 32 tile edits in the current draft. Undoing a spawn move restores both the old spawn and the replaced tile. Use the Undo and Redo buttons, Ctrl/Command+Z, or Ctrl/Command+Shift+Z. Saving preserves the draft’s history. Opening another project starts its own history.
- **Curator co-op** restores the player’s seat, position and shared objectives when they return to Studio during the 45-second inactivity window. Leave co-op releases the seat immediately. A server restart ends the room.
- **First-person Curator playtests** reuse each map’s wall grid and check only the cells crossed by a camera ray. In a 320-column empty arena viewed from the center facing north, one frame used 4,236 wall lookups, down from 44,844 in B5. Device frame rates still need measurement.
- **Season Pass titles** appear beside player names in multiplayer and ranked squad lobbies. Equip or remove a claimed title in Control Center → Season Pass. Both actions update the open lobby for other players. The New Dawn season opens November 25, 2026 at midnight in Oman.

## New Dawn preview 1
User requested deployment after the city expansion and soundtrack changes. This is a preview on the existing main baseline, not certification of the proposed full 101-item release. Keeps Z.5 compatibility, city scripts, saves and radio. All 66 registered FPS mode IDs are explicitly mapped to distinct original procedural scores; 72 explicit profiles including additional mode IDs, plus deterministic fallback. Inline scripts parsed and registry/score generation smoke checks passed. Live browser audio transitions, full regression suite, real-device FPS and multiplayer load remain unverified. The deployment workflow retains the full test gate and checks the preview marker and soundtrack function after deployment. The separate Curator and city UI are not certified as having new music playback. Remaining planned work includes full themed crates, community expansion, GPU asset streaming and hosting-edge protection. Season opening remains November 25, 2026; no early season activation.

## RC2 — New Dawn season launch preparation
Season opens November 25, 2026 at midnight Oman time. Forge & Market includes three free, guaranteed, account-bound seasonal inventory crates at 500/1500/3000 verified season XP. They are not paid or random and cannot be traded or auctioned. Their cosmetics are inventory-only; 3D mesh application, tournament expansion, device QA and hosting edge protections remain unfinished. Full deployment validation is required.

### RC3 — community weekly cup
Friends > Season leaderboard shows an automatically rotating seven-day ranked points cup starting November 25 at midnight Oman time. Ranked arena score/time results award three points for a win and one for a loss, using existing idempotent match settlement. Public display uses the existing reversible opt-in, excludes banned users, and shows the previous week's standings; no currency or inventory prizes. This complements existing private bracket tournaments, not a replacement for public scheduled brackets. Full deployment validation is required.

### RC4 — seasonal cosmetic rendering
New Dawn rifle finish, Mystery-mode knife and local third-person helmet use the existing 3D mesh paths with server-owned equipment checks, account-change invalidation and explicit unequip. The championship rifle takes precedence if equipped. Other players do not inherit the local user's finishes. Remote cosmetic replication, GPU/device verification and hosting-edge defenses remain unverified or unfinished. Existing inventory and combat statistics remain unchanged.
