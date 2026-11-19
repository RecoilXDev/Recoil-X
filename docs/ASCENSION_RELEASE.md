# RECOIL X Z.4 release verification and rollback

**Z.4 Project Ascension is a development candidate awaiting owner review.** Its admin console includes 29 staff actions across six sections. The acceptance table records 46 verified features and four with outstanding checks. Those four concern backup recovery on Alwaysdata, physical controller input, accessibility on target devices, and low-memory phone performance. [Admin actions and 50-feature checklist](../RECOIL_X_Z4_CHANGELOG.md)

## Baseline, architecture and integration

- The immediate predecessor and code rollback reference is [dbe0165](https://github.com/RecoilXDev/Recoil-X/commit/dbe0165754f79d5e1034d49c1c6f81d3cb613a58), tree `bc1ba01fcda1c1043d4dc746acaa36901b828c94`. It contains the Operation Overdrive admin and bonus-wallet patch. Ascension work originally began at [ea0d2a9](https://github.com/RecoilXDev/Recoil-X/commit/ea0d2a9ed821614a5b047d899a064d386565aab2). The [Z.2 campaign backup branch](https://github.com/RecoilXDev/Recoil-X/tree/z2-safe-before-ascension) retains the earlier 500-level campaign.
- [Draft PR #9](https://github.com/RecoilXDev/Recoil-X/pull/9) collects the entire Z.4 release on its existing branch, `z3-project-ascension`. The Alwaysdata workflow deploys pushes to `main`. [Release comparison](https://github.com/RecoilXDev/Recoil-X/compare/dbe0165754f79d5e1034d49c1c6f81d3cb613a58...z3-project-ascension)
- The Alwaysdata workflow reported success for the immediate predecessor on 19 November 2026. [Deployment run](https://github.com/RecoilXDev/Recoil-X/actions/runs/44528847734)
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

### Opening the console on a fresh local installation

Register a disposable account named `RangeStaff` in **Friends** on the local server above. In the same PowerShell window, press Ctrl+C to stop that local server. Keeping the temporary `RX_DB` value already set, run the existing administrator command, then start the development server again.

```powershell
node server/server.mjs admin RangeStaff
node server/server.mjs
```

Sign in again as `RangeStaff` and choose **Home → Admin console**. Existing hosted admin accounts retain their role through the upgrade.

## Automated verification

**123 tests passed, 0 failed, 0 skipped in 215.85 seconds.** [Full test output](ASCENSION_TEST_RESULTS.txt). All 50 A-numbered feature cases ran on the development checkout, alongside the previous regression coverage. The test runner used two workers. The inline game script, service worker and all JavaScript server and test files passed syntax checking. The manifest, declared server dependencies, mission store and GitHub Actions workflow matched the baseline byte for byte.

| Area | Test evidence |
|---|---|
| Account switching | An early full run failed the guest-to-account mission transfer test during an account switch. A separate run reported a transient loopback connection error in the same scenario. Diagnostics observed reset HTTP sockets. The cross-device fixture now uses independent HTTP connections because its simulated browsers share a Node connection pool and synchronously advance the game. The other wire and console tests keep their normal connection behavior. The client now ignores stale Friends responses, late sign-outs and obsolete join-preference replies. A focused rerun exercised both cross-account campaign saves and the delayed-response console scenario. The final full run passed both. |
| Accounts and access | Real local HTTP registration and login, normal/admin access, original ban/mute paths, password reauthentication, enrolled recovery, code consumption and session revocation. |
| Admin console | Two signed-in game clients used a real local server. A staff member opened the panel from the home menu, recovered from a failed stylesheet download, reviewed a report, claimed it, changed its priority, privately warned a player, recorded an internal note, cancelled then confirmed a grant, reversed it, filtered and exported the audit and signed out. The ordinary player received and acknowledged the warning. Injected gamepad D-pad, A and B inputs navigated the console and dismissed a grant confirmation. A deliberately delayed HTTP 401 from the signed-out session arrived after a new login and the next account stayed signed in. Staff asset requests and controls were absent for the guest and ordinary account. |
| Staff operations | Separate HTTP/WebSocket tests checked every staff route with ordinary and guest accounts, live role revocation, kick/ban/mute and expiry, assignment conflicts, report evidence, duplicate grant requests, reversals, movement alerts, manual backup completion and cooldown. A real verified SQLite copy retained the reversal ledger. |
| Social data | Existing accepted friendship, closed private messaging, room chat, saved messages and account IDs survive the migration copy and code rollback. |
| Missions | All 500 generated levels were checked for reachable objectives. All 500 sequential campaign unlocks ran to a final debrief in the harness. Two clients exercised account synchronization, offline recovery and checkpoints. A predecessor-schema copy contained all 500 records after migration. |
| Multiplayer | The legacy and Ascension wire suites each used 2, 4, 6 and 10 simultaneous authenticated local sockets. They checked movement, room changes, server shots, chat, results or rejoin, depending on the case. Separate client tests drove two complete legacy game clients and Ascension controls. |
| Competitive integrity | Covered fire cadence, ammo, blocked sight, server-owned scores, shared loadouts, bounds, match deduplication, discarded stale inputs, single-use daily claims and authorized administrative access. |
| Combat, bosses and modes | Exercised legacy shooting, respawning, dual Crown bosses, Crown raid, relics, Chess, tournaments, the 20-feature expansion and Ascension's ten match modes. Some scenario tests set an initial position, near-complete timer, or low boss health and then run the actual simulation. This verifies transitions separately from human match balance. |
| Economy and calendar | Claimed an earned Battle Pass tier, opened a weapon case, and recovered coins and ownership after a simulated browser reload. Checked opening and closing boundaries for the legacy seasonal editions through 2031. Individual future story missions, pets, craft recipes, and every skin permutation still need sampling on target devices. |
| Browser and controls | In Chrome, the Z.4 homepage and guest navigation were inspected. A separate read-only visual fixture used the exact console assets and fictional sample records to inspect Overview, navigation and case review. [Console screenshot](RECOIL_X_Z4_Admin_Console.jpg). In the earlier Ascension browser pass, selected desktop controls, opened the grouped hub, rotated and privately saved a map, and entered its playable arena. Selected touch controls, entered moving-target training, saw Fire and Jump, and used Leave practice to return. Keyboard/touch client paths and gamepad axes, triggers, jump and parry have automated cases. |
| All 15 multiplayer launches | A desktop host and a touch guest used the actual game menu handlers and loopback WebSockets. Both joined by code, entered the same match, rendered the selected arena and objective HUD, and left through the lobby controls. The cases rotated through all four Ascension arenas. The raid cases waited for a living boss or enemy. A simulated Friday enabled the weekend event. |
| Static compatibility | Parsed the complete inline game script, checked all server and test files, loaded server modules through the tests, checked the installed WebSocket dependency, and compared the deployment workflow and dependency manifest with the baseline. |
| Deployment layout | Copied the five public files and tracked server files into the directory layout in the Alwaysdata workflow. Started `node server.mjs` on loopback using the declared WebSocket dependency, its four dependencies and a fresh private SQLite file. The homepage, five public files and two admin assets matched the checkout byte for byte. An ordinary test player registered and opened the Ascension mastery and challenge board. An ordinary account received HTTP 403 for the staff overview. The health endpoint reported Z.4 and 500 mission levels. A local check also accepted the GitHub Pages authentication preflight, denied a guest access to the staff overview and resolved both relative assets under the Pages project path. |

To repeat the admin checks with generated accounts and a disposable database, run:

```sh
node --test tests/z4-admin.test.mjs tests/z4-admin-client.test.cjs
```

For a manual staging check, sign in through **Friends** with an existing staff account and open **Admin console** from Home. Submit a report with a separate test player. Claim the case, add a note, change its priority and resolve it. Send a warning and check that only the intended player sees it. Grant a small bonus, reverse its receipt and filter the audit by player and Wallet. Sign out and verify the staff entries disappear from Home and Friends.

From the project root, run a single numbered check with, for example, `node --test --test-name-pattern=A45 tests/ascension-services.test.mjs`. Run `node --test tests/ascension-wire.test.mjs` to repeat the socket group tests. Run `node --test tests/ascension-migration.test.mjs` in the full Git checkout to repeat the database and code-rollback rehearsal.

Run `node --test --test-name-pattern="launch all 15" tests/overdrive-client.test.cjs` to repeat the host and join checks through the game menus. The test prints each mode and arena it exercised.

A second check attempted to open two independent Chromium contexts for an interactive Payload Escort match. This environment denied the browser process its startup socket before it loaded the game. That two-browser check is **NOT TESTED**. The 15-mode run above used the game’s UI handlers with two simulated browser environments, real HTTP sign-in and real local WebSockets.

## Performance measurements

The table measures aggregate JSON application snapshot payloads sent to all clients. It covers one local Payload Escort match on the orbit map for each player count, a moving interval, simultaneous fire and chat. It excludes transport headers, non-state messages, site startup and traffic outside the sampled interval.

| Players | Window (ms) | Aggregate state bytes | State frames | Delta frames |
|---:|---:|---:|---:|---:|
| 2 | 1,212 | 10,668 | 24 | 9 |
| 4 | 1,220 | 23,849 | 48 | 19 |
| 6 | 1,215 | 37,547 | 72 | 29 |
| 10 | 1,218 | 75,159 | 120 | 49 |

- In the deterministic ten-row encoder fixture, a full JSON frame used 300 bytes. A delta carrying one changed row and one removed row used 77 bytes. The encoder chooses a full frame when it is smaller and refreshes its keyframe about once per second.
- The existing latency suite exercised 2- and 10-player clients at simulated 130 ms and 276 ms round trips. It also checked a congested transport, reliable chat and resumption with a fresh view. These are injected conditions on the test machine. They do not measure the path between a player's device in Oman and Alwaysdata.
- On a 90-scalar static geometry fixture, packed CPU storage was 180 bytes versus 360 bytes for the float source. The renderer draws up to 12 nearby streamed chunks per frame. Its eviction pass releases stale buffers. The graphics cleanup test observed deletes for two textures, two framebuffers, a depth renderbuffer, a quad buffer and two programs. This fixture does not predict total GPU or browser process memory.
- The Chrome preview supplied interaction evidence. It did not establish a sustained desktop or phone FPS result. Remaining physical checks include iOS/Android Safari/Chrome behavior, controller mapping, heat and crashes on a low-memory phone, and performance over an actual WAN. There is no production capacity or minimum FPS claim.

## Database compatibility, backup and recovery

On first startup against a recognized existing game schema, the server makes a private snapshot before any required migration. An unrecognized populated database stops startup. Ascension adds `asc_` tables for clans, membership, invitations, wars, rewards, mastery, daily progress, rivalries, challenges, recovery digests, world damage, race times, moderation signals and a migration version. Existing user IDs, password salts/hashes, roles, sessions, friends, messages, bans, ranked history and mission keys remain in their original tables. The staff migration keeps both existing bonus-wallet tables and adds `rx4_admin_events`, `rx4_report_work`, `rx4_notice_read`, `rx4_grant_requests` and `rx4_reversals` in a transaction. The migration rehearsal seeded an original 49-coin receipt on the exact predecessor and verified its balance and reason after upgrade and code-only rollback. Individual schema transactions roll back on SQL errors.

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
5. If the client or server regresses, revert the Ascension merge with a reviewed rollback commit restoring the immediate predecessor code. Preserve the current live database. The rehearsal ran the predecessor server against a **copy of the post-Ascension database**, verified legacy data, restarted Ascension, and recovered its saved clan. The predecessor understands the original wallet and moderation tables. New staff-only case notes, acknowledgments and reversal details become visible again when Z.4 code resumes.
6. A database restore is a separate operator decision for actual data damage. First preserve a consistent private copy of the current database and stop writes in an authorized maintenance window. Restore the verified pre-release snapshot into a **new private path**. Verify integrity, account count, a known account identifier and role, a saved mission, a friendship and a private message. Reconcile data written after the snapshot before an approved switch to the restored copy. A snapshot cannot contain registrations, messages, rewards or recovery changes made later. Never overwrite the only working database or copy an open SQLite database file without its WAL.

To check the restored file locally without writing to it, supply its private path as the final argument to this command. It returns only integrity and aggregate counts.

```sh
node --input-type=module -e "import {DatabaseSync} from 'node:sqlite'; const db=new DatabaseSync(process.argv[1],{readOnly:true}); console.log(db.prepare('PRAGMA integrity_check').all()); for(const name of ['users','friends','messages','rx_mission_save']) console.log(name,db.prepare('SELECT COUNT(*) AS n FROM '+name).get().n); db.close();" "/private/restore-check.sqlite"
```

The test databases held generated test identities. Production credentials, personal messages and live backup images were outside the scope of this development run.
