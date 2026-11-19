# Project Ascension release verification and rollback

**Project Ascension is a development candidate awaiting owner review.** The acceptance table records 46 verified features and four with outstanding checks. Those four concern backup recovery on Alwaysdata, physical controller input, accessibility on target devices, and low-memory phone performance. [50-feature checklist](../RECOIL_X_Z3_CHANGELOG.md)

## Baseline, architecture and integration

- The checked starting commit was [ea0d2a9](https://github.com/RecoilXDev/Recoil-X/commit/ea0d2a9ed821614a5b047d899a064d386565aab2), the published Z.3 **Operation Overdrive** practice HUD fix. Its complete tree was `337e70abf80307c4de50309d516bf63d4abf39fe`. This is the immediate code rollback target for Ascension. [The Z.2 backup branch](https://github.com/RecoilXDev/Recoil-X/tree/z2-safe-before-ascension) retains `eed923b9a9a7f7262874085bccecad746dce0786`, which predates the subsequent 20-feature expansion.
- [Draft PR #9](https://github.com/RecoilXDev/Recoil-X/pull/9) collects the entire release on `z3-project-ascension`. [Compare it with the published baseline](https://github.com/RecoilXDev/Recoil-X/compare/ea0d2a9ed821614a5b047d899a064d386565aab2...z3-project-ascension). A development push does not match the Alwaysdata workflow's `main` push trigger.
- On 19 November 2026, the live homepage opened **Operation Overdrive**. Its local challenge menu included Clutch Lab and Parkour Courses. The successful Alwaysdata deployment was at the published baseline. [Live game](https://recoil-x.alwaysdata.net/) · [Deployment run](https://github.com/RecoilXDev/Recoil-X/actions/runs/44341694913)
- The existing `index.html` owns menus, WebGL, the fallback renderer, touch/gamepad input, local collections and practice activities. Ascension uses its existing stage, mesh, collision, user session, aim, weapon, score and navigation systems. The server still serves the same page, HTTP account API and WebSocket endpoint. GitHub Pages still points the client at the existing multiplayer origin.
- The Node server runs the room simulation and wraps result persistence in the existing SQLite transaction. Only the first insertion of a match ID settles rewards. The draft, private rules, input preference and room browser operate above the same simulation as the legacy competitive modes. Clans and scheduled wars use account IDs already authenticated by the Friends service.
- Server controls, damage, ammo, timers and objectives determine the outcome of competitive Ascension games. Mastery and economy credits use eligible opponents and distinct match IDs. One account operating multiple genuinely separate accounts is a remaining fair-play issue for human moderation. Input-family selection is a client-declared preference. The server cannot authenticate physical hardware.
- Existing browser-owned cosmetics, practice data and the older offline economy retain their original save format and trust model. Legacy mission saves still use the existing validated revision/conflict API. An offline mission record is not a server replay of every move. Ascension does not import browser currency, local cosmetics or offline mission wins into its competitive rewards.
- Room state, rejoin seats and unsent input live in one running server process. The account/mission ledger survives a restart. An interrupted war reopens within its registration window or expires. A planned restart should happen between matches.
- The implementation order was the verified baseline and backup gate, match/combat simulation, rooms and persistence, grouped client integration, then simulation, wire, browser and migration rehearsals. All components are reviewed and released together.

## How to run the candidate

Use a separate checkout on a development machine with Node 24 or a compatible later version. The suite here used Node 24.22.3 and the existing `faye-websocket` 0.11.4 dependency.

```powershell
git clone --branch z3-project-ascension https://github.com/RecoilXDev/Recoil-X.git recoil-ascension-test
cd recoil-ascension-test
npm.cmd --prefix server install --omit=dev
node --test --test-concurrency=2
```

The migration rehearsal reads the predecessor's actual code from Git and verifies its complete tree before using it. A downloaded ZIP or shallow clone can run the remaining tests. For the predecessor rehearsal, use the Git checkout above. A missing predecessor appears as a skipped test.

To play locally, use a fresh temporary database. These instructions reuse the same development checkout and do not contact the hosting control panel.

```powershell
$testDir = Join-Path $env:TEMP ("recoil-ascension-" + [guid]::NewGuid())
New-Item -ItemType Directory -Path $testDir | Out-Null
$env:RX_DB = Join-Path $testDir "dev.sqlite"
$env:RX_PRIVATE_BACKUPS = Join-Path $testDir "private-backups"
$env:PORT = "8787"
node server/server.mjs
```

Open `http://127.0.0.1:8787/`. Friends registration and sign-in here use the new test database. To try two players, use two browser profiles. Choose **Project Ascension → Multiplayer → Host**, select an Ascension mode, and create the room. Use the second account to enter the code. For Titan and World Boss, select at least two cooperative seats. World Boss hosting follows Friday and Saturday in Oman. The editor and academy also work as a guest.

## Automated verification

**114 tests passed, 0 failed, 0 skipped in 202.97 seconds.** [Full test output](ASCENSION_TEST_RESULTS.txt). All 50 A-numbered feature cases ran on the development checkout, alongside the previous regression coverage. The test runner used two workers. One inline game script and 27 JavaScript server, worker or test files passed syntax checks. The manifest, declared server dependencies, mission store and GitHub Actions workflow matched the baseline byte for byte.

| Area | Test evidence |
|---|---|
| Accounts and access | Real local HTTP registration and login, normal/admin access, original ban/mute paths, password reauthentication, enrolled recovery, code consumption and session revocation. |
| Social data | Existing accepted friendship, closed private messaging, room chat, saved messages and account IDs survive the migration copy and code rollback. |
| Missions | All 500 generated levels were checked for reachable objectives. All 500 sequential campaign unlocks ran to a final debrief in the harness. Two clients exercised account synchronization, offline recovery and checkpoints. A predecessor-schema copy contained all 500 records after migration. |
| Multiplayer | The legacy and Ascension wire suites each used 2, 4, 6 and 10 simultaneous authenticated local sockets. They checked movement, room changes, server shots, chat, results or rejoin, depending on the case. Separate client tests drove two complete legacy game clients and Ascension controls. |
| Competitive integrity | Covered fire cadence, ammo, blocked sight, server-owned scores, shared loadouts, bounds, match deduplication, discarded stale inputs, single-use daily claims and authorized administrative access. |
| Combat, bosses and modes | Exercised legacy shooting, respawning, dual Crown bosses, Crown raid, relics, Chess, tournaments, the 20-feature expansion and Ascension's ten match modes. Some scenario tests set an initial position, near-complete timer, or low boss health and then run the actual simulation. This verifies transitions separately from human match balance. |
| Economy and calendar | Claimed an earned Battle Pass tier, opened a weapon case, and recovered coins and ownership after a simulated browser reload. Checked opening and closing boundaries for the legacy seasonal editions through 2031. Individual future story missions, pets, craft recipes, and every skin permutation still need sampling on target devices. |
| Browser and controls | In Chrome, selected desktop controls, opened the grouped hub, rotated and privately saved a map, and entered its playable arena. Selected touch controls, entered moving-target training, saw Fire and Jump, and used Leave practice to return. Keyboard/touch client paths and gamepad axes, triggers, jump and parry have automated cases. |
| All 15 multiplayer launches | A desktop host and a touch guest used the actual game menu handlers and loopback WebSockets. Both joined by code, entered the same match, rendered the selected arena and objective HUD, and left through the lobby controls. The cases rotated through all four Ascension arenas. The raid cases waited for a living boss or enemy. A simulated Friday enabled the weekend event. |
| Static compatibility | Parsed the complete inline game script, checked all server and test files, loaded server modules through the tests, checked the installed WebSocket dependency, and compared the deployment workflow and dependency manifest with the baseline. |
| Deployment layout | Copied the five public files and tracked server files into the directory layout in the Alwaysdata workflow. Started `node server.mjs` on loopback using the declared WebSocket dependency, its four dependencies and a fresh private SQLite file. The homepage and all five asset responses matched the branch byte for byte. An ordinary test player registered and opened the Ascension mastery and challenge board. The existing health endpoint reported 500 mission levels. |

From the project root, run a single numbered check with, for example, `node --test --test-name-pattern=A45 tests/ascension-services.test.mjs`. Run `node --test tests/ascension-wire.test.mjs` to repeat the socket group tests. Run `node --test tests/ascension-migration.test.mjs` in the full Git checkout to repeat the database and code-rollback rehearsal.

Run `node --test --test-name-pattern="launch all 15" tests/overdrive-client.test.cjs` to repeat the host and join checks through the game menus. The test prints each mode and arena it exercised.

A second check attempted to open two independent Chromium contexts for an interactive Payload Escort match. This environment denied the browser process its startup socket before it loaded the game. That two-browser check is **NOT TESTED**. The 15-mode run above used the game’s UI handlers with two simulated browser environments, real HTTP sign-in and real local WebSockets.

## Performance measurements

The table measures aggregate JSON application snapshot payloads sent to all clients. It covers one local Payload Escort match on the orbit map for each player count, a moving interval, simultaneous fire and chat. It excludes transport headers, non-state messages, site startup and traffic outside the sampled interval.

| Players | Window (ms) | Aggregate state bytes | State frames | Delta frames |
|---:|---:|---:|---:|---:|
| 2 | 1,218 | 10,560 | 24 | 9 |
| 4 | 1,221 | 23,849 | 48 | 19 |
| 6 | 1,216 | 37,619 | 72 | 29 |
| 10 | 1,216 | 75,159 | 120 | 49 |

- In the deterministic ten-row encoder fixture, a full JSON frame used 300 bytes. A delta carrying one changed row and one removed row used 77 bytes. The encoder chooses a full frame when it is smaller and refreshes its keyframe about once per second.
- The existing latency suite exercised 2- and 10-player clients at simulated 130 ms and 276 ms round trips. It also checked a congested transport, reliable chat and resumption with a fresh view. These are injected conditions on the test machine. They do not measure the path between a player's device in Oman and Alwaysdata.
- On a 90-scalar static geometry fixture, packed CPU storage was 180 bytes versus 360 bytes for the float source. The renderer draws up to 12 nearby streamed chunks per frame. Its eviction pass releases stale buffers. The graphics cleanup test observed deletes for two textures, two framebuffers, a depth renderbuffer, a quad buffer and two programs. This fixture does not predict total GPU or browser process memory.
- The Chrome preview supplied interaction evidence. It did not establish a sustained desktop or phone FPS result. Remaining physical checks include iOS/Android Safari/Chrome behavior, controller mapping, heat and crashes on a low-memory phone, and performance over an actual WAN. There is no production capacity or minimum FPS claim.

## Database compatibility, backup and recovery

On first startup against a recognized existing game schema, the server makes a private snapshot before any required migration. An unrecognized populated database stops startup. Ascension adds `asc_` tables for clans, membership, invitations, wars, rewards, mastery, daily progress, rivalries, challenges, recovery digests, world damage, race times, moderation signals and a migration version. Existing user IDs, password salts/hashes, roles, sessions, friends, messages, bans, ranked history and mission keys remain in their original tables. The migration transaction rolls back on a SQL failure.

The default private backup directory is `~/.local/state/recoil-x/backups/<database-fingerprint>/`. A file-backed database gets a scheduled verified copy about every 24 hours with seven scheduled copies retained. Migration snapshots are separate and retained. Optional existing-host overrides are `RX_PRIVATE_BACKUPS`, `RX_BACKUP_HOURS` (1–168) and `RX_BACKUP_KEEP` (1–30). The deployment uses the defaults unless the owner already configured an override. The worker requires private writable storage with room for the retained snapshots and a temporary full copy. The dashboard reports last success or failure, and the server log records worker failures.

Each snapshot gets a new name. SQLite writes a consistent standalone copy using `VACUUM INTO`. The game opens the copy read-only, checks `PRAGMA integrity_check`, checks the account table, then publishes it to private storage. On Unix, private directories use mode 0700 and completed database files use 0600. The automated rehearsal restored a WAL-backed snapshot to another filename and checked that the original database still held its newer value. [SQLite documentation](https://www.sqlite.org/lang_vacuum.html#vacuuminto)

The restart rehearsal found that the previous scheduler could take an early second snapshot. The corrected scheduler starts one timer and schedules the next copy after the worker finishes. A separate rehearsal made the private backup folder unavailable. An already-migrated server continued serving a saved login and reported the backup failure. The worker retried after one simulated hour and wrote a verified copy when storage returned. An upgrade that still required a migration stopped before any schema change when the backup could not be written.

Recovery codes are opt-in. **Friends → Account recovery** requires the current password to issue or replace a code. Save it privately. The server stores its digest and returns the code only on issuance. A successful reset consumes it and revokes active sessions. Accounts without a previously issued code still have their original sign-in path. This release has no email delivery dependency. [OWASP recovery guidance](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html)

## Checks requiring the owner or release devices

| Check | Current status and acceptance condition |
|---|---|
| Production backup and restore | **NOT TESTED on Alwaysdata.** Verify a current private snapshot of the actual game DB, sufficient private disk space, integrity and sample account/mission/message records on a separate restored copy. Earlier Z.2 backup confirmation is historical. Keep the original online database private. |
| Low-memory phone | **NOT TESTED on hardware.** On the iPhone 8 Plus or a similar device, use the lowest preset, play a full session, leave and rejoin several maps, and compare thermal warnings, crashes and memory pressure with the predecessor. Record preset and session length. |
| Mobile, desktop and controller | **PARTIAL.** Exercise a complete match on an iPhone and Android phone in landscape. Try HUD/text scaling, both team symbols, captions, shield placement, leaving and returning, plus a physical controller on the target browser. A paired gamepad and two actual phones were unavailable in the test environment. |
| Internet and hosting | **NOT TESTED on the production route.** Measure RTT and jitter during shared matches on the real target networks after authorized staging or deployment. The private server list and game diagnostics report the measurements available for that session. |
| Content and play balance | **PARTIAL.** Run full human rounds on each map, a four-player raid, close-result gun matches and a clan war. Check camera readability, text clipping, parry timing, difficulty and the appearance of each equipped finish. |

## Approved deployment and rollback

1. Review the [complete change set](https://github.com/RecoilXDev/Recoil-X/pull/9/files) and repeat the suite from its head. Verify the current head of `main`. If it moved since the baseline, integrate those changes into the development branch and repeat the tests.
2. Complete the private production backup and device checks above. Record the current code SHA, private snapshot name, timestamp, integrity result and tested restore location in a private operator log. Never attach a player database or recovery code to the pull request.
3. After the owner explicitly approves this exact candidate, mark the PR ready and merge it into `main` once during a quiet window. The existing workflow uploads code and restarts the service. A merge is a deployment action. No new token, secret, SSH key, database setting or workflow is required for this candidate.
4. After the approved release, check the existing health endpoint, then use a designated test account to verify sign-in, friends, a saved mission, room creation, a two-player match and an admin-only health reading. Confirm the private migration snapshot exists, then confirm a scheduled backup succeeds. GitHub Pages runs the client and uses the same multiplayer server.
5. If the client or server regresses, revert the Ascension merge with a reviewed rollback commit restoring the immediate predecessor code. Preserve the current live database. The rehearsal ran the predecessor server against a **copy of the post-Ascension database**, verified legacy data, restarted Ascension, and recovered its saved clan.
6. A database restore is a separate operator decision for actual data damage. First preserve a consistent private copy of the current database and stop writes in an authorized maintenance window. Restore the verified pre-release snapshot into a **new private path**. Verify integrity, account count, a known account identifier and role, a saved mission, a friendship and a private message. Reconcile data written after the snapshot before an approved switch to the restored copy. A snapshot cannot contain registrations, messages, rewards or recovery changes made later. Never overwrite the only working database or copy an open SQLite database file without its WAL.

To check the restored file locally without writing to it, supply its private path as the final argument to this command. It returns only integrity and aggregate counts.

```sh
node --input-type=module -e "import {DatabaseSync} from 'node:sqlite'; const db=new DatabaseSync(process.argv[1],{readOnly:true}); console.log(db.prepare('PRAGMA integrity_check').all()); for(const name of ['users','friends','messages','rx_mission_save']) console.log(name,db.prepare('SELECT COUNT(*) AS n FROM '+name).get().n); db.close();" "/private/restore-check.sqlite"
```

The test databases held generated test identities. Production credentials, personal messages and live backup images were outside the scope of this development run.
