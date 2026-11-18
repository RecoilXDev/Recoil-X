# RECOIL X Z.2 — Operation Overdrive

The update builds on Z.1 Crown Trials at commit `6b2726bfb5fc7c853bdd6419ae619eaf6f284757`. Open **Operation Overdrive** from the home screen or Play menu. Use your Friends account for online matches. **Local challenges** opens the offline additions.

## Multiplayer connection update, 18 November 2026

- Overdrive sends movement starts, stops and button changes promptly. Held controls use a regular heartbeat. Short taps that reach the server between two simulation steps can still register once.
- Overdrive sends smaller, independently decodable match updates. The server prepares player data once per broadcast and filters the visible players for each recipient. Existing clients continue to receive their original format.
- Remote players move between recent server positions. An opponent disappearing from view is removed immediately, and a respawn starts a fresh movement history.
- On a congested connection, the server skips obsolete Overdrive positions and Friends party movement frames. Chat, match results and account messages keep their normal delivery path.

See the [testing and rollback notes](Z2_TESTING_AND_ROLLBACK.md#multiplayer-connection-update).

## Multiplayer and administration

| Feature | What changed |
| --- | --- |
| Competitive Arena 2.0 | Play 1v1, 2v2, 3v3 or 5v5 in Overdrive Arena. Choose a team with an open seat, set a kill limit from 1 to 50 and track eliminations, deaths and connection status. Every seated player can vote for a casual rematch. |
| Ranked multiplayer | Queue by team size. The rating range widens as the queue waits and teams are balanced by rating. Bronze starts at 500 RP. Silver, Gold, Diamond, Mythic and RECOIL LEGEND unlock at 600, 780, 1,030, 1,300 and 1,650 RP. A new standings table starts each UTC quarter. Players qualify for the leaderboard after three rated matches. The previous quarter's eligible top ten receive a profile award. |
| Team pings | Mark an enemy, a location to defend or attack, or a position where you need backup. Use the Ping menu on touch devices or the G, B, N and M keyboard shortcuts. Your team receives the marker and quick message. |
| Killcam and highlights | Review an elimination from a short top-down replay of the two players involved. See the final elimination and MVP on the match result screen. Automatic killcams can be skipped in Local challenges. |
| Admin Panel 2.0 | Use server-verified account roles to kick, ban, temporarily ban, unban, mute and unmute. User reports and reviewed reports appear with timestamped moderation history. Mutes apply to direct messages, legacy Friends party chat and Overdrive chat. |
| Private match codes | Share a six-character invite code with optional password protection. Hosts can lock new joins and remove players before play. Unused lobbies expire after 15 minutes. |
| Overcharge | Pick up electric cells for temporary movement and firing boosts. This mode is available in private matches. |
| Tournament mode | Run a single-elimination Cup for 4 or 8 teams of one or two players. Follow the bracket as matches advance. Spectators can follow live players. Each match lists an MVP and the champions earn a profile award. A tied timed match enters sudden death. At the end of overtime, total damage breaks the tie, followed by bracket seed. |
| Victory animations | Win matches to unlock Wave and Champion poses. A Cup win also unlocks Champion. The results screen shows the winning team and reuses the operator rig. Weapon inspection uses the existing in-match animations. |
| Multiplayer performance | The server runs movement and combat at 20 ticks per second and sends compact state at up to 10 updates per second. The client smooths remote movement, reconciles its own position and displays round-trip latency. A disconnected player has 20 seconds to reconnect to the same match. |

## Ten additional features

| Feature | What changed |
| --- | --- |
| Rally Ghosts | Race a local ghost of your best recorded Jeep Rally run. See the time difference at each gate. An older best time remains in the existing Rally save when you record your first ghost. |
| Double Crown | Fight Ember Sovereign and Frost Monarch together in Emberfrost Court. Lure an Ember strike near Frost to open a seven-second window. |
| Highlight Recorder | Replay the last 15 seconds of positional history on a top-down canvas. Export a short video when the browser supports canvas capture and MediaRecorder. |
| Relic Relay | Take the opposing relic, protect the carrier and bring it to your own relic while yours is home. First to three captures wins. |
| Chess Draft Duels | Pick Knight, Rook or Bishop for a best-of-three online duel. Each role has a distinct movement ability. |
| Mission Builder | Add ordered checkpoints and bot spawns to the existing Map Creator. Finish after clearing the checkpoints. JSON import still accepts earlier map files. |
| Daily Time Trial | Run a three-gate course with the starting rifle. The map and route are selected from the Oman calendar date. The browser saves a personal best and can copy a shareable result. |
| Operator Avatar Maker | Pose an owned operator using the game's existing model and skin. Choose a background and export a 1024 × 1024 PNG. |
| Touch Controls Editor | Move the joystick and six touch buttons using drag controls or arrow keys. Save or reset the layout on the current browser. |
| Squad Rescue | In teams of two or more, hold Use next to a downed teammate to drag them into cover and revive them. |

## Compatibility

The existing game and legacy Friends flows remain in `index.html`. Overdrive uses a separate message namespace on the existing authenticated WebSocket and new tables in the existing SQLite database. The production workflow, account admin command, Node requirement, npm dependency and runtime settings are the same as Z.1. GitHub Pages defaults the Friends server address to the existing Alwaysdata origin.

Overdrive interface copy is in English. Previous language selections and translations use the existing system. Ranked play uses a fixed arena, server combat rules and standard operator appearances for remote players. Local saves hold the ghost, daily times and touch layout. Active lobbies and tournaments live in server memory. A process restart clears them, while completed ranked match records, rewards and moderation history persist in SQLite.
