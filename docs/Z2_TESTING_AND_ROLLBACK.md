# Z.2 testing, compatibility and rollback

## Run locally with a separate database

Use Node.js 24 or newer. From the repository root in PowerShell, run the following commands one line at a time.

```powershell
cd server
npm.cmd install --omit=dev
$env:RX_DB = Join-Path $PWD "recoil-z2-test.sqlite"
$env:RX_BIND = "127.0.0.1"
$env:PORT = "8787"
npm.cmd start
```

Open `http://127.0.0.1:8787/` and create test accounts under **Friends** in separate browser profiles. Open **Operation Overdrive** in each profile. To check the admin panel locally, run the existing `node server.mjs admin TEST_ACCOUNT_NAME` command from a second terminal with the same `RX_DB` and server directory. Reopen the test account session to refresh the menu.

Run the automated suite from the repository root after installing server dependencies.

```sh
node --test
```

## Verification matrix

| Area | Evidence |
| --- | --- |
| Existing database and rollback compatibility | A local SQLite fixture with a write-ahead log held an admin account, session, friend relationship and message before startup. The test authenticated the same session and read the same records after migration. The backup passed `PRAGMA integrity_check` and contained the pre-migration data. Running migration again reused the schema marker. A rollback rehearsal ran the original Z.1 server on the migrated database and read messages written under both versions. |
| Existing Z.1 gameplay | The simulated DOM regression scripts exercised launch, navigation, settings, Crown bosses, keys, rewards, Boss Rush checkpoints, Chess awards, modern and saved event progress, Oman event timing through 2031, Jeep Rally and sampled legacy modes. The local real-WebSocket regression exercised Friends requests, direct and party chat, join privacy, host and guest play, spectator state and legacy ban/unban. |
| Match sizes | A real local Node server accepted 2, 4, 6 and 10 concurrent WebSocket players. All clients received matching round IDs and acknowledged movement. At 10, one player disconnected and resumed the same match. This was short loopback traffic with simulated players. |
| Authoritative matches and ranked | Tests covered movement limits, stale input, line of sight, ammo, cooldowns, score settlement, killcam scope, rematches, point changes, deduplication, divisions and quarter rollover. Party-supplied score summaries have no ranked submission route. |
| Private rooms and moderation | Tests covered wrong passwords, role-restricted start and moderation, member and team room controls, direct message access, reports, audit, kick, mute/unmute, temporary-ban expiry and permanent ban/unban. |
| New game modes | Tests exercised Overcharge pickups, Relic capture, Chess ability cooldowns, Squad drag/revive and bleed-out, and both bracket sizes with server-controlled match progression and spectator views. |
| Z.2 client and local challenges | The game script ran in a simulated desktop DOM and simulated touch DOM. Two game clients shared a real local server. Offline checks exercised Rally Ghosts, Double Crown, Mission Builder, Daily Time Trial, avatar setup, the replay screen and touch layout persistence. |
| Production compatibility | The Alwaysdata workflow, deployment paths, dependency manifest and entry point were checked against Z.1. Pending checks include production restart, reverse-proxy behavior with Z.2, physical PC and phone gameplay, live graphics and video/image download quality. Chromium startup in this environment was blocked by a socket permission error. |

All 12 automated checks passed on Node 24.22.1. These sample intervals count JSON state payload bytes summed across the connected clients. They exclude other messages and transport overhead.

| Concurrent clients | Input interval | Aggregate state payload |
| --- | --- | --- |
| 2 | 1.279 s | 7,086 bytes |
| 4 | 1.271 s | 21,540 bytes |
| 6 | 1.270 s | 42,222 bytes |
| 10 | 1.281 s | 105,390 bytes |

Device frame rates, production bandwidth and sustained Alwaysdata capacity remain to be measured.

## Physical browser checks before marking the release ready

1. In Chrome or Edge on PC, sign in, create a password-protected 1v1 and join from another profile. Check aim, shots, reload, scores, chat, four pings, elimination replay and rematch. Repeat disconnect/reconnect with one client.
2. On a phone using an HTTPS test instance, use the joystick, swipe aiming, buttons and layout editor in landscape. Try limiting effects on an older device and test a reconnect after briefly leaving the browser.
3. Run a ranked match, an Overcharge match and a Cup. Check an existing account's friends and chat before and after. Open an existing Crown Trials save and a current seasonal event using the same browser profile.
4. Download an avatar and a replay. Verify that the avatar is a square PNG and that the video opens on the intended device. Video export depends on browser recording support.

## Existing Alwaysdata deployment

A merge to `main` with game or server changes triggers the current workflow when deployment is enabled. The workflow copies `index.html` and the server modules, skips database files and restarts the existing site. The same server configuration, credentials and GitHub secrets apply. The normal restart interrupts connected matches. [GitHub Actions workflow filters](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#onpushbranchestagsbranches-ignoretags-ignore)

Before adding Z.2 tables on first start, the server creates a SQLite snapshot alongside the current database in `.recoil-backups`. Its name follows `<database>-before-z2-<time>-<pid>.sqlite`. The directory and backup are owner-only on the production Linux host. A snapshot failure stops startup before the new schema is applied. [SQLite VACUUM INTO](https://www.sqlite.org/lang_vacuum.html#vacuuminto)

After a deployment, confirm that the workflow finished, `/rx-api/health` reports `Z.2` and protocol `1`, and an existing account can sign in and see its friends. Confirm that the pre-migration backup is available using the existing authorized hosting access.

## Roll back without losing new account data

1. Revert the Z.2 merge commit via GitHub. Let the existing deployment workflow publish the reverted files and restart. The original game, server and workflow are available at the pinned [Z.1 commit](https://github.com/RecoilXDev/Recoil-X/tree/6b2726bfb5fc7c853bdd6419ae619eaf6f284757).
2. Keep the current SQLite database. The Z.1 server reads its original tables and ignores the additive Z.2 tables. Permanent bans still use the legacy account flag. Z.2 timed bans, mutes and ranked functions are inactive while Z.1 runs. They become available again after Z.2 returns.
3. Use the pre-migration snapshot only if the current database needs recovery. Stop the service using existing access, archive the current database and its WAL/SHM sidecars, validate the backup separately with `PRAGMA integrity_check`, then restore it to the configured database path. Verify account, friend and chat counts and the live account flow. A restore to the pre-migration snapshot rolls back database changes made after the snapshot time.
