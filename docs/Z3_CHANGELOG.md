# RECOIL X Z.3

Z.3 includes the cleaner Play and online menus and the compact in-match controls from [the Z.2 UI update](https://github.com/RecoilXDev/Recoil-X/pull/2). Sign in through **Friends** for online play.

| Feature | Where to find it and how it works |
| --- | --- |
| Ranked map veto | **Operation Overdrive → Ranked.** The two captains each ban one of Overdrive Arena, Switchyard, and Frostline. A ban turn lasts 18 seconds. The remaining arena is played. |
| Squad queue | **Ranked → Create ranked squad.** Share the invite code, fill a squad of 2, 3, or 5, and have everyone ready up. Ranked matchmaking keeps the squad together. |
| Queue warm-up | Choose **Warm up** while searching. Practice targets respawn and the game returns to the lobby for the veto. |
| Core Escort | **Host → Core Escort.** Stay near the core to push it and contest it to stop the other team. Both teams get an attack half. Distance decides the winner, with time used when both finish the route. |
| Moving Hot Zone | **Host → Moving Hot Zone.** Hold the active site uncontested to score. It moves every 30 seconds. |
| Elimination Rounds | **Host → Elimination Rounds.** Each player gets one life per round. The first team to win three rounds takes the match. |
| Weapon Budget Draft | **Host → Weapon Budget Draft.** Pick weapons before each round. Each team gets four credits per player and shares the total across its loadouts. |
| Prop Hunt | **Host → Prop Hunt.** Hiders choose a crate, barrel, or beacon. The teams trade roles and the team that evades the seekers longer wins. |
| Clutch Lab | **Local challenges → Clutch Lab.** Try 1v2 Clutch, Last Stand on low health, or Objective Retake. |
| Parkour Courses | **Local challenges → Parkour Courses.** Jump, climb, and hold Jump plus Forward alongside marked walls. Depot Steps and Rift Walk save medal times and personal bests on the device. |
| Jeep Relay | **Host → Jeep Relay.** Teams of two race through four gates. The driver changes at each gate. Movement steers and accelerates, and Jump brakes. |
| Co-op Crown Raids | **Host → Co-op Crown Raids.** Two to four teammates fight the Rift Crown. Two players hold Use at separate seals to open its shield. |
| Map share codes | **Map Creator → Mission triggers and sharing.** Share a map as a seven-character code or load a code into the editor. JSON import and export remain available. |
| Mission triggers | In **Map Creator**, place checkpoints, choose a checkpoint number, and add a Door, Wave, or Route lock. Reach the linked checkpoint to open the barrier or start the wave. |
| Match timeline | **Match results → Match timeline.** Review timestamped eliminations, lead changes, objectives, and round outcomes. |
| Tournament auto-camera | Join a Cup lobby as a spectator. The camera follows active play. Switch it off for manual viewing. |
| Early disconnect remake | An early connection loss during the first 45 seconds of a ranked match with no score pauses play. The match resumes on reconnection within 20 seconds or is voided without a rating change. |
| Match-linked reports | **Match results → Report a moment.** Enter the player's account name and set the elapsed time. Moderators can see nearby timeline entries. |
| Accessibility presets | **Settings → Accessibility.** Choose high visibility, reduced flashes, or both. Individual switches adjust team markers and colors, HUD contrast, and flashes. |
| Offline install | **Settings → Offline play.** Open the game online once on a supported device, then use your browser’s install or home screen option. The cached game supports bot matches and local challenges. |

## Verification

From the repository root, use Node.js 24 and run `npm --prefix server install --omit=dev` followed by `node --test`. The suite exercises new modes, reports, map sharing, ranked remakes, and the game’s existing account, friends, chat, and moderation flows. It also runs 2, 4, 6, and 10 concurrent client connections on a local server and exercises desktop and touch controls in a simulated DOM.

Before marking the release ready, use a physical PC and phone to play a ranked match and a co-op raid. On the phone, try the accessibility presets and a parkour course. On each browser where installation is supported, wait for **Offline play** to say the shell is ready, turn off the network, and reopen the game. Verify a bot match and return online for multiplayer. [Browser installability](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable)

## Deploy and roll back

The existing Alwaysdata workflow deploys the game and offline files together. The existing deployment settings and server remain in use. The first Z.3 start with an existing Z.2 SQLite database creates an owner-only `*-before-z3-*.sqlite` snapshot in the adjacent `.recoil-backups` directory before adding the new tables. The Z.3 migration test reads that snapshot and checks SQLite integrity. [SQLite snapshots](https://www.sqlite.org/lang_vacuum.html#vacuuminto)

To roll back the code, revert the Z.3 merge and let the existing workflow deploy the revert. Keep the current database so account, chat, and friend changes made since deployment are retained. If the database itself needs recovery, follow the [SQLite recovery steps](Z2_TESTING_AND_ROLLBACK.md#roll-back-without-losing-new-account-data) using the last known good snapshot.
