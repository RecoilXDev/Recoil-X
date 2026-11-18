# Mission Mode · Levels 1–500

Open **Play → Missions → Mission Mode**. Each successful story extraction unlocks the next numbered level. The board opens at your first unfinished level. Browse the 50 chapters of ten levels or select **Current level** to jump back. Within a level, **Recruit**, **Standard** and **Veteran** have separate stars, best times and checkpoints.

| Levels | What you play |
| --- | --- |
| 1–4 | The four original operations below. Their existing save identifiers carry forward. |
| 5–499 | Seeded operations vary target positions, arena colours, vault codes and objective order. Later tiers add tougher guards, and each tenth level has a branching route. The same level number reproduces the same mission on another device. |
| 500 | **The Last Beacon**. Choose a route to restore power, escort the drone, defend the relay, unlock the vault and extract to complete the campaign. |

**Daily dispatch** continues to rotate through the original four missions on Oman time. It has separate stamps and checkpoints. The single-player simulation runs on the player's device.

| Operation | What to do |
| --- | --- |
| Dead Air | Find the transmitter, scan it, clear the relay and extract. |
| Black Box | Carry a power cell to the archive. Read the code on the HUD and activate the three marked pads in order. |
| Long Way Home | Reactivate the repair drone. Stay close as it crosses the yard, then defend its broadcast. |
| Last Light | Choose the green service terminal or the red surge terminal. Restore power, open the vault and extract. |

## The 20 updates

| # | Update | How it works |
| --- | --- | --- |
| 1 | Transmitter scanning | Stay inside the marked circle to charge the station. You can leave and finish the scan when you return. |
| 2 | Power-cell delivery | Interact with the cell to pick it up. Follow the compass to the socket and interact again to install it. |
| 3 | Contested relay defense | Clear nearby guards, then hold the marked relay. Its progress pauses whenever a guard contests it. |
| 4 | Repair-drone escort | The drone moves while you are close and waits when you fall behind. |
| 5 | Three-symbol vault locks | Read the HUD sequence and activate the matching triangle, square and circle terminals. A wrong input resets the sequence. |
| 6 | Two finale routes | The service route uses a long scan. The surge route sends you on a cell delivery through an active pulse zone. |
| 7 | Hidden intel | Every operation has one optional cache. Collect it before extracting to earn the intel star. |
| 8 | Pulse hazards | A floor ring and a nearby HUD warning precede each pulse. Move outside the ring before impact. |
| 9 | Rechargeable radar | A pulse marks nearby guards and highlights intel and supply locations. Watch the cooldown before using it again. |
| 10 | Three field kits | Engineer accelerates scanning and relay work. Medic starts with more shield and heals more at lockers. Scout recharges radar faster. |
| 11 | Supply lockers | Each operation has one use of its locker. It restores health, shield and reserve ammunition. |
| 12 | Timed extraction | Stay inside the extraction circle for three continuous seconds. Leaving the circle restarts the countdown. |
| 13 | Three difficulty levels | Recruit, Standard and Veteran adjust guard count and health, pulse damage, the mission clock and the time-star target. |
| 14 | Checkpoints | The current objective, equipment, health, ammo and collected items are saved. Select **Continue checkpoint** after leaving, reloading or failing. **Start over** uses your current kit selection. |
| 15 | Three-star grades | Earn a star for extracting, a second for collecting intel, and a third for meeting the displayed time target. |
| 16 | Personal bests | The board keeps your fastest clear and highest star grade for each story operation at each difficulty. |
| 17 | Signal colours | Ion blue is available immediately. Amber unlocks at four total stars, Orchid at nine. Colours apply to mission markers and the repair drone. Each operation contributes its highest grade across difficulties. |
| 18 | Oman daily dispatch | A different operation rotates in at midnight in Muscat. Radar recharges twice as fast. Earn one dated stamp per day, with the latest 31 shown as a count on the board. |
| 19 | Objective navigation and controls | The HUD gives direction and distance. On keyboard, use **E** to interact and **Y** for radar. Touch players get on-screen **Use** and **Radar** buttons. |
| 20 | After-action splits | The debrief shows the time spent on each completed objective. Replay the operation or jump to the next unlocked briefing. |

## Account saves and guest progress

1. Open **Sign in to save** on the mission board, or sign in from **Friends** with your existing RECOIL X account. The board shows the account name and save status.
2. Play normally. Level clears, stars, best times, active checkpoints, field-kit preferences, signal colour and daily stamps save automatically. **Account synced** confirms the current changes reached the server.
3. Sign in to the same account on another browser or device and open **Mission Mode**. **Current level** opens the first unfinished level. **Continue checkpoint** resumes a saved objective with its loadout, health, ammo and collected items.

Each guest keeps progress in the current browser and site. To carry an older save forward, open the site and browser where you played it, sign in, and choose **Import guest progress**. This merges the better results and fills available checkpoint slots. The guest copy remains available. Alwaysdata and GitHub Pages use the same account server by default, while each site has its own guest storage.

If a connection drops after loading your account, the game keeps playing and queues changes locally. The board shows **Account sync pending** and retries when the connection returns. Before switching devices, wait for **Account synced**. Pending saves belong to the originating account, including after signing out and signing back in. With browser storage disabled, guest progress and pending uploads last for the current session. Keep the tab open until account sync completes.

A checkpoint restarts the current objective. A fresh run replaces only the selected level and difficulty checkpoint. The server merges the highest star grade and fastest time, and compares checkpoint revisions so an older device cannot roll back a newer restart.

## Testing

Run the following from the repository root using Node.js 24 or later and the dependencies in `server/package.json`.

```sh
cd server
npm install --omit=dev --no-audit
cd ..
node --test --test-concurrency=2
```

The dedicated mission tests are in [mission-mode.test.cjs](../tests/mission-mode.test.cjs). They use the game's existing DOM harness, simulate player positions and drive the objective and frame loops. They cover story progression, both finale routes, controls, save and resume, grades, daily rollover, field kits and returning to Operation Blackout. Existing suites cover the local challenges and use local WebSockets for multiplayer matches.

For a manual playthrough, start Dead Air, use radar, collect the intel and complete the scan. Leave and return with **Continue checkpoint**. Eliminate the guards at the relay, step off the extraction pad before three seconds, then re-enter and finish. Check the last split and star grade on the debrief. Repeat with the touch control scheme. For a device-performance check, record the device, graphics preset and observed frame rate during the escort and the surge route.

### Original four-operation release verification

| Check | Observed result |
| --- | --- |
| Repository suite | 23 tests passed with Node.js 24.22.3. Six cover Mission Mode and 17 cover existing systems. |
| Story completion | The automated game harness finished all four operations and both Last Light routes. It checked the star grades, the debrief splits and the walkable objective positions. |
| Checkpoints and daily runs | Reload, defeat, timeout, an independent difficulty slot and session-only progress passed. The daily operation changed at 00:00 Muscat time and a replay awarded no duplicate stamp. |
| Browser controls | In Chrome, Dead Air opened from Play using both desktop and touch schemes. Keyboard **Y** and the on-screen **Radar** button revealed the intel bearing and started the cooldown. |
| Multiplayer regression | Local server tests passed at 2, 4, 6 and 10 simultaneous clients. The 2- and 10-player latency simulations also passed at 130 and 276 ms. |
| Device performance | Physical phone and TV frame rates and the user's internet ping were not measured in this release. |

## 500-level release verification

The campaign tests check all 500 objective layouts against the arena's walkable grid, the full drone route, deterministic generation and the chapter selector. A simulated playthrough completed all 500 levels in order, from the first briefing through **The Last Beacon**, and logged 2,139 completed objectives. The harness drives the normal objective logic, moves the test player to the targets and clears guards programmatically. The last debrief ends the campaign. A separate store test advances an account through all 500 clear records.

Two independent game clients use temporary accounts and the real local HTTP and SQLite services in the transfer test. It checks guest import, cross-device checkpoint and equipment restoration, a lost connection, replay of pending changes, signing into a different account, and reopening from a clean browser profile. The database test verifies the snapshot, restarts the server and reads back the saved grade. See [mission gameplay and transfer tests](../tests/mission-mode.test.cjs) and [mission store and backup tests](../tests/mission-store.test.mjs).

For a manual account check, clear Level 1, begin Level 2, collect the cell and reach the next objective. Return to the board and wait for **Account synced**. Sign into that account on a second device and resume **Black Box** at the vault code. Physical-device frame rates require a separate hardware playtest.

## Deployment, backup and rollback

The existing GitHub Actions workflow publishes the client and server. On the first startup with an existing Z.2 database, the server uses SQLite to make a consistent backup at `.recoil-backups/<database>-before-mission-levels-<time>-<pid>.sqlite` before creating `rx_mission_save`. A direct upgrade from Z.1 uses its pre-Z.2 snapshot for both migrations. If backup creation fails, startup stops before creating the mission table. Subsequent startups reuse the table. [SQLite backup semantics](https://sqlite.org/lang_vacuum.html#vacuuminto)

The save API uses the existing authenticated session for every read and write. Each row belongs to its account and contains mission data only. Ranked results use their separate server settlement path. The health route advertises `missionLevels: 500` in a running release.

To roll back, revert this update's merge on a branch and merge the revert into `main`. The earlier game and server remain available at [the original Mission Mode release](https://github.com/RecoilXDev/Recoil-X/tree/80b6cc55ed9bffe5487f69aa21be0728de0c44df). Keep the current database and browser storage. The older server ignores the additional table, and those saves are available again after a roll-forward. Use a validated snapshot for database recovery only, because restoring it also restores all accounts to their state at the time of the snapshot.
