# RECOIL X Z.3

Open **Play → Overdrive → Online matches** for the competitive modes, or **Play → Overdrive → Local challenges** for Clutch Lab and Parkour Courses. Sign in through **Friends** for online play. **Play → Missions → Mission Mode** opens the existing 500-level campaign and resumes the signed-in account. [Campaign guide](MISSION_MODE.md)

This release brings the 20 features below and the cleaner Play, lobby and match menus onto the November 18 campaign and multiplayer updates. [Expansion draft](https://github.com/RecoilXDev/Recoil-X/pull/3) · [Menu changes](https://github.com/RecoilXDev/Recoil-X/pull/2)

| Feature | Where to find it and how it works |
| --- | --- |
| Ranked map veto | **Operation Overdrive → Ranked.** The two captains each ban one of Overdrive Arena, Switchyard, and Frostline. The lobby shows whose turn it is and counts down from 18 seconds. The remaining arena is played. |
| Squad queue | **Ranked → Create ranked squad.** Share the invite code, fill a squad of 2, 3, or 5, and have everyone ready up. Ranked matchmaking keeps the squad together. |
| Queue warm-up | Choose **Warm up** while searching. Practice targets respawn and the game returns to the lobby for the veto. |
| Core Escort | **Host → Core Escort.** Stay near the core to push it and contest it to stop the other team. Both teams get an attack half. Distance decides the winner, with time used when both finish the route. |
| Moving Hot Zone | **Host → Moving Hot Zone.** Hold the active site uncontested to score. It moves every 30 seconds. |
| Elimination Rounds | **Host → Elimination Rounds.** Each player gets one life per round. The first team to win three rounds takes the match. |
| Weapon Budget Draft | **Host → Weapon Budget Draft.** Pick weapons before each round. Each team gets four credits per player and shares the total across its loadouts. |
| Prop Hunt | **Host → Prop Hunt.** Hiders choose a crate, barrel, or beacon. The teams trade roles and the team that evades the seekers longer wins. |
| Clutch Lab | **Local challenges → Clutch Lab.** Try 1v2 Clutch, Last Stand on low health, or Objective Retake. |
| Parkour Courses | **Local challenges → Parkour Courses.** Jump, climb, and hold Jump plus Forward alongside marked walls. On touch devices, hold the Jump button and push the joystick forward. The course menu shows each saved personal best and medal. |
| Jeep Relay | **Host → Jeep Relay.** Teams of two race through four gates. The driver changes at each gate. Movement steers and accelerates, and Jump brakes. |
| Co-op Crown Raids | **Host → Co-op Crown Raids.** Two to four teammates fight the Rift Crown. Two players hold Use at separate seals to open its shield. |
| Map share codes | **Map Creator → Mission triggers and sharing.** Share a map as a seven-character code or load a code into the editor. JSON import and export remain available. |
| Mission triggers | In **Map Creator**, place checkpoints, choose a checkpoint number, and add a Door, Wave, or Route lock. Reach the linked checkpoint to open the barrier or start the wave. |
| Match timeline | **Match results → Match timeline.** Review timestamped eliminations, lead changes, objectives, and round outcomes. |
| Tournament auto-camera | Join a Cup lobby as a spectator. The camera follows active play. Switch it off for manual viewing. |
| Early disconnect remake | An early connection loss during the first 45 seconds of a ranked match with no score pauses play. The match resumes on reconnection within 20 seconds or is voided without a rating change. |
| Match-linked reports | **Match results → Report a moment.** Enter the player's account name and set the elapsed time. Moderators can see nearby timeline entries. |
| Accessibility presets | **Settings → Accessibility.** Choose high visibility, reduced flashes, or both. Individual switches adjust team markers and colors, HUD contrast, and flashes. |
| Offline install | **Settings → Offline play.** Open the game online once on a supported device, then use your browser’s install or home screen option. The cached game supports bot matches and local challenges. Opening the game online refreshes the offline copy. |

## Verification

From the repository root, use Node.js 24 and run `npm --prefix server install --omit=dev`, then `node --test --test-concurrency=2`.

| Checks performed for this integration | What they covered |
| --- | --- |
| Server and game client | Ranked squads and vetoes, warm-up, all seven new multiplayer match types, round resets, reports, map sharing and tournament spectators. The suite compared compact and full snapshots for the new modes, including visible disguises and spectator camera events. |
| Existing multiplayer | 2, 4, 6 and 10 simultaneous WebSocket clients on a local server. Separate 2-player and 10-player simulations exercised 130 and 276 ms round trips. |
| Mission Mode | 500 consecutive simulated clears comprising 2,139 objectives. Local account tests transferred a guest checkpoint across clients and retried an interrupted save. |
| Database upgrade | A test upgraded a WAL-backed Z.2 campaign database. The upgraded file and its pre-upgrade backup both passed SQLite integrity checks and retained the fixture's checkpoint, stars, friend, chat message and rank. Restarting produced no second backup. |
| Browser and offline support | In Chrome, the touch menu opened Mission Mode and started Depot Steps. A service-worker test checked cache refresh, network failure, and exclusion of account requests. The suite also exercised simulated desktop and touch input. |

For physical-device testing, play a ranked match and co-op raid on a PC and phone. Try holding Jump through a parkour wall-run and braking in Jeep Relay. On a browser that offers installation, wait for **Settings → Offline play** to show that the game is ready, disconnect, reopen a bot match, then reconnect for multiplayer. Field ping, device FPS, and physical installation were outside these checks. [Browser installation guide](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable)

## Deploy and roll back

The existing Alwaysdata workflow deploys the game and offline files together. The existing deployment settings and server remain in use. The first Z.3 start with an existing Z.2 SQLite database creates an owner-only `*-before-z3-*.sqlite` snapshot in the adjacent `.recoil-backups` directory before adding the new tables. The Z.3 migration test reads that snapshot and checks SQLite integrity. [SQLite snapshots](https://www.sqlite.org/lang_vacuum.html#vacuuminto)

To roll back the code, revert the Z.3 release merge on GitHub and let the existing workflow deploy the revert. The preceding release is [the published 500-level build](https://github.com/RecoilXDev/Recoil-X/commit/eed923b9a9a7f7262874085bccecad746dce0786). Keep the current database so account, chat, and friend changes made since deployment are retained. If the database itself needs recovery, follow the [SQLite recovery steps](Z2_TESTING_AND_ROLLBACK.md#roll-back-without-losing-new-account-data) using the last known good snapshot.
